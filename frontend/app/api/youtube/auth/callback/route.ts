import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * YouTube OAuth2 Callback Endpoint
 * 
 * This endpoint handles the callback from Google's OAuth2 flow,
 * exchanges the authorization code for access and refresh tokens,
 * and stores them securely.
 * 
 * @route GET /api/youtube/auth/callback
 */
export async function GET(request: NextRequest) {
  // Get the authorization code and state from the URL
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  
  // Get the stored state from cookies for CSRF validation
  const storedState = cookies().get('youtube_auth_state')?.value;
  
  // Validate state to prevent CSRF attacks
  if (!state || !storedState || state !== storedState) {
    return new Response('Invalid state parameter', { status: 400 });
  }
  
  // Clear the state cookie as it's no longer needed
  cookies().delete('youtube_auth_state');
  
  // If no code was received, return an error
  if (!code) {
    return new Response('No authorization code received', { status: 400 });
  }
  
  try {
    // Exchange the authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/youtube/auth/callback`,
        grant_type: 'authorization_code',
      }),
    });
    
    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Token exchange error:', errorData);
      return new Response('Failed to exchange authorization code for tokens', { status: 500 });
    }
    
    const tokenData = await tokenResponse.json();
    
    // Store the tokens securely in HTTP-only cookies
    cookies().set('youtube_access_token', tokenData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: tokenData.expires_in,
      path: '/',
    });
    
    if (tokenData.refresh_token) {
      cookies().set('youtube_refresh_token', tokenData.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        // Refresh tokens don't expire unless revoked, but we'll set a long expiry
        maxAge: 60 * 60 * 24 * 30 * 6, // 6 months
        path: '/',
      });
    }
    
    // Return an HTML page that sends a message to the opener window and closes itself
    return new NextResponse(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Authentication Successful</title>
          <script>
            window.onload = function() {
              window.opener.postMessage(
                { type: 'youtube-auth-success' },
                '${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}'
              );
              setTimeout(function() {
                window.close();
              }, 1000);
            }
          </script>
        </head>
        <body>
          <h1>Authentication Successful!</h1>
          <p>You can close this window and return to the application.</p>
        </body>
      </html>`,
      {
        headers: {
          'Content-Type': 'text/html',
        },
      }
    );
  } catch (error) {
    console.error('Error in YouTube auth callback:', error);
    return new Response('Internal server error', { status: 500 });
  }
} 