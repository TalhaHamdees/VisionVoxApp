import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * YouTube Authentication Test Endpoint
 * 
 * This endpoint tests the YouTube access token by making a simple API call
 * to verify that the token is valid and working.
 * 
 * @route GET /api/youtube/auth-test
 */
export async function GET() {
  console.log('🔍 Testing YouTube auth token');
  
  const accessToken = cookies().get('youtube_access_token')?.value;
  
  if (!accessToken) {
    console.log('❌ No access token found');
    return NextResponse.json(
      { error: 'Not authenticated with YouTube' },
      { status: 401 }
    );
  }
  
  try {
    // Make a simple API call to test the token
    // We'll use the channels endpoint with mine=true to get the user's channel
    console.log('🔍 Testing token with channels API...');
    const response = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    
    console.log(`📊 Channels API response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Token test failed:', errorText);
      return NextResponse.json(
        { error: `Token test failed: ${response.status} - ${errorText.substring(0, 200)}` },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    console.log('📊 Channel data received:', JSON.stringify(data).substring(0, 200) + '...');
    
    if (!data.items || data.items.length === 0) {
      console.error('❌ No channel found for this user');
      return NextResponse.json(
        { error: 'No YouTube channel found for this user' },
        { status: 404 }
      );
    }
    
    const channelId = data.items[0].id;
    const channelTitle = data.items[0].snippet?.title || 'Unknown Channel';
    
    console.log(`📊 Channel ID: ${channelId}`);
    console.log(`📊 Channel Title: ${channelTitle}`);
    
    return NextResponse.json({
      success: true,
      message: 'YouTube authentication is working',
      channelId,
      channelTitle,
    });
  } catch (error) {
    console.error('❌ Error testing token:', error);
    return NextResponse.json(
      { error: `Error testing token: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
} 