import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * YouTube Authentication Status Endpoint
 * 
 * This endpoint checks if the user is authenticated with YouTube
 * by verifying the presence of valid tokens.
 * 
 * @route GET /api/youtube/auth-status
 */
export async function GET() {
  console.log('🔍 Checking YouTube auth status');
  
  const accessToken = cookies().get('youtube_access_token')?.value;
  const refreshToken = cookies().get('youtube_refresh_token')?.value;
  
  console.log(`🔑 Access token available: ${!!accessToken}`);
  console.log(`🔄 Refresh token available: ${!!refreshToken}`);
  
  // If we have a refresh token, we can consider the user authorized
  // even if the access token has expired (we can refresh it)
  const isAuthorized = !!refreshToken;
  
  console.log(`🔐 User is ${isAuthorized ? 'authorized' : 'not authorized'} with YouTube`);
  
  return NextResponse.json({ isAuthorized });
} 