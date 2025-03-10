import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * YouTube OAuth2 Authentication Endpoint
 * 
 * This endpoint initiates the OAuth2 flow with YouTube/Google to allow
 * access to a user's YouTube analytics data.
 * 
 * @route GET /api/youtube/auth
 */
export async function GET() {
  // Google OAuth2 configuration
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/youtube/auth/callback`;
  
  // Required scopes for YouTube Analytics
  const scopes = [
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/yt-analytics.readonly',
    'https://www.googleapis.com/auth/yt-analytics-monetary.readonly'
  ];
  
  // Generate a random state parameter to prevent CSRF attacks
  const state = Math.random().toString(36).substring(2);
  
  // Store the state in a cookie for verification during callback
  cookies().set('youtube_auth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 10, // 10 minutes
    path: '/',
  });
  
  // Construct the authorization URL
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.append('client_id', clientId || '');
  authUrl.searchParams.append('redirect_uri', redirectUri);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('scope', scopes.join(' '));
  authUrl.searchParams.append('access_type', 'offline');
  authUrl.searchParams.append('state', state);
  authUrl.searchParams.append('prompt', 'consent');
  
  // Redirect to Google's OAuth page
  return NextResponse.redirect(authUrl.toString());
} 