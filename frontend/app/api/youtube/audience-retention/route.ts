import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { google } from 'googleapis';

// Date helpers - use a 2-year window to ensure we capture all data
const getDateRange = () => {
  const today = new Date();
  const endDate = today.toISOString().split('T')[0];
  
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  const startDate = twoYearsAgo.toISOString().split('T')[0];
  
  return { startDate, endDate };
};

/**
 * YouTube Audience Retention API Route
 * 
 * Fetches detailed audience retention data for a specific video using the YouTube Analytics API.
 * This implementation uses the Google API client library directly for more reliable results.
 * 
 * @route POST /api/youtube/audience-retention
 */
export async function POST(request: NextRequest) {
  console.log('🔍 YouTube audience retention endpoint called');
  
  try {
    const { videoId } = await request.json();
    console.log(`📹 Analyzing video ID: ${videoId}`);
    
    if (!videoId) {
      console.log('❌ No video ID provided');
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      );
    }
    
    // Get access token and refresh token from cookies
    const accessToken = cookies().get('youtube_access_token')?.value;
    const refreshToken = cookies().get('youtube_refresh_token')?.value;
    
    console.log(`🔑 Access token available: ${!!accessToken}`);
    console.log(`🔄 Refresh token available: ${!!refreshToken}`);
    
    if (!refreshToken) {
      console.log('❌ No refresh token found');
      return NextResponse.json(
        { error: 'YouTube authentication required. Please connect your YouTube account.' },
        { status: 401 }
      );
    }
    
    // Create OAuth2 client with credentials
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/youtube/auth/callback`
    );
    
    // Set credentials with refresh token
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    
    // If we have an access token, set it as well
    if (accessToken) {
      oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken
      });
    }
    
    console.log('🔍 Building YouTube Analytics client');
    
    // Build YouTube Analytics client
    const youtubeAnalytics = google.youtubeAnalytics({
      version: 'v2',
      auth: oauth2Client,
    });
    
    // Get date range
    const { startDate, endDate } = getDateRange();
    console.log(`📅 Date range: ${startDate} to ${endDate}`);
    
    // First, get the channel ID
    console.log('👤 Fetching channel data...');
    const youtube = google.youtube({
      version: 'v3',
      auth: oauth2Client,
    });
    
    const channelResponse = await youtube.channels.list({
      part: ['id'],
      mine: true
    });
    
    if (!channelResponse.data.items || channelResponse.data.items.length === 0) {
      console.log('❌ Channel not found');
      return NextResponse.json(
        { error: 'No YouTube channel found for this user. Please ensure you have a YouTube channel.' },
        { status: 404 }
      );
    }
    
    const channelId = channelResponse.data.items[0].id;
    console.log(`👤 Using channel ID: ${channelId}`);
    
    // Make API request to get audience retention data
    console.log('📈 Fetching audience retention data...');
    const analyticsResponse = await youtubeAnalytics.reports.query({
      ids: `channel==${channelId}`,
      startDate,
      endDate,
      metrics: [
        'audienceWatchRatio',
        'relativeRetentionPerformance',
        'startedWatching',
        'stoppedWatching',
        'totalSegmentImpressions',
      ].join(','),
      dimensions: 'elapsedVideoTimeRatio',
      filters: `video==${videoId}`,
      sort: 'elapsedVideoTimeRatio',
    });
    
    console.log('📊 Analytics response received');
    
    if (!analyticsResponse.data.rows || analyticsResponse.data.rows.length === 0) {
      console.log('❌ No analytics data available for this video');
      return NextResponse.json(
        { 
          error: 'No analytics data available for this video. This could be because the video is too new, has too few views, or you do not own this video.' 
        },
        { status: 404 }
      );
    }
    
    console.log(`📊 Found ${analyticsResponse.data.rows.length} data points for retention`);
    console.log('📊 Sample data points:', JSON.stringify(analyticsResponse.data.rows.slice(0, 5)));
    
    // Process the data for easier consumption by the frontend
    const processedData = processRetentionData(analyticsResponse.data);
    
    return NextResponse.json(processedData);
  } catch (error) {
    console.error('❌ Error fetching audience retention data:', error);
    return NextResponse.json(
      { error: `Failed to fetch audience retention data: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

/**
 * Process the raw YouTube Analytics data into a more usable format
 * @param data - Raw data from YouTube Analytics API
 * @returns Processed data for the frontend
 */
function processRetentionData(data: any) {
  const headers = data.columnHeaders;
  const rows = data.rows || [];
  
  // Find indices for each metric
  const idxElapsed = headers.findIndex((h: any) => h.name === 'elapsedVideoTimeRatio');
  const idxWatchRatio = headers.findIndex((h: any) => h.name === 'audienceWatchRatio');
  const idxRelativePerformance = headers.findIndex((h: any) => h.name === 'relativeRetentionPerformance');
  const idxStartedWatching = headers.findIndex((h: any) => h.name === 'startedWatching');
  const idxStoppedWatching = headers.findIndex((h: any) => h.name === 'stoppedWatching');
  const idxImpressions = headers.findIndex((h: any) => h.name === 'totalSegmentImpressions');
  
  // Process the data
  const retentionData = rows.map((row: any) => {
    const timeRatio = parseFloat(row[idxElapsed]);
    const watchRatio = parseFloat(row[idxWatchRatio]);
    
    return {
      timeRatio,
      watchRatio: Math.round(watchRatio * 100), // Convert to percentage
      relativePerformance: idxRelativePerformance >= 0 ? parseFloat(row[idxRelativePerformance]) : null,
      startedWatching: idxStartedWatching >= 0 ? parseInt(row[idxStartedWatching], 10) : null,
      stoppedWatching: idxStoppedWatching >= 0 ? parseInt(row[idxStoppedWatching], 10) : null,
      impressions: idxImpressions >= 0 ? parseInt(row[idxImpressions], 10) : null,
    };
  });
  
  // Calculate average view duration
  const averageViewDuration = Math.round(
    retentionData.reduce((sum: number, point: any) => sum + point.watchRatio, 0) / retentionData.length
  );
  
  // Find drop-off points (significant decreases in retention)
  const dropOffPoints = findDropOffPoints(retentionData);
  
  // Find engagement spikes (increases in retention)
  const engagementSpikes = findEngagementSpikes(retentionData);
  
  return {
    retentionData,
    averageViewDuration,
    dropOffPoints,
    engagementSpikes,
    isRealData: true,
  };
}

/**
 * Find significant drop-off points in retention data
 * @param retentionData - Processed retention data
 * @returns Array of drop-off points with time ratio and percentage
 */
function findDropOffPoints(retentionData: any[]) {
  // Two approaches to find drop-offs:
  // 1. Local minima (points lower than neighbors)
  // 2. Sharp drops between consecutive points
  
  const localMinima = [];
  const sharpDrops = [];
  
  // Window size for local minima detection
  const windowSize = 1;
  
  // Thresholds for detection
  const minimaThreshold = 0.05; // 5% lower than neighbors
  const sharpDropThreshold = 0.08; // 8% drop between consecutive points
  
  // 1. Find local minima
  for (let i = windowSize; i < retentionData.length - windowSize; i++) {
    const current = retentionData[i].watchRatio;
    const prev = retentionData[i - windowSize].watchRatio;
    const next = retentionData[i + windowSize].watchRatio;
    
    // Check if current point is significantly lower than both neighbors
    const lowerThanPrev = (prev - current) / prev >= minimaThreshold;
    const lowerThanNext = (next - current) / next >= minimaThreshold;
    
    if (lowerThanPrev && lowerThanNext) {
      localMinima.push({
        timeRatio: retentionData[i].timeRatio,
        percentage: Math.round(Math.max(prev - current, next - current)),
        type: 'local_minimum'
      });
    }
  }
  
  // 2. Find sharp drops between consecutive points
  for (let i = 1; i < retentionData.length; i++) {
    const current = retentionData[i].watchRatio;
    const prev = retentionData[i - 1].watchRatio;
    const dropPercentage = prev - current;
    const dropRatio = dropPercentage / prev;
    
    if (dropRatio >= sharpDropThreshold) {
      sharpDrops.push({
        timeRatio: retentionData[i].timeRatio,
        percentage: Math.round(dropPercentage),
        type: 'sharp_drop'
      });
    }
  }
  
  // Combine both types of drop-offs and sort by significance
  const allDrops = [...localMinima, ...sharpDrops];
  
  // Return the top 3 most significant drop-offs
  return allDrops
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 3);
}

/**
 * Find engagement spikes in retention data
 * @param retentionData - Processed retention data
 * @returns Array of engagement spikes with time ratio and score
 */
function findEngagementSpikes(retentionData: any[]) {
  // Two approaches to find spikes:
  // 1. Local maxima (points higher than neighbors)
  // 2. Sharp increases between consecutive points
  
  const localMaxima = [];
  const sharpIncreases = [];
  
  // Window size for local maxima detection
  const windowSize = 1;
  
  // Thresholds for detection
  const maximaThreshold = 0.03; // 3% higher than neighbors
  const sharpIncreaseThreshold = 0.05; // 5% increase between consecutive points
  
  // 1. Find local maxima
  for (let i = windowSize; i < retentionData.length - windowSize; i++) {
    const current = retentionData[i].watchRatio;
    const prev = retentionData[i - windowSize].watchRatio;
    const next = retentionData[i + windowSize].watchRatio;
    
    // Check if current point is significantly higher than both neighbors
    const higherThanPrev = (current - prev) / prev >= maximaThreshold;
    const higherThanNext = (current - next) / next >= maximaThreshold;
    
    if (higherThanPrev && higherThanNext) {
      localMaxima.push({
        timeRatio: retentionData[i].timeRatio,
        score: 1 + (Math.min(current - prev, current - next) / 10),
        event: 'Engagement spike (local maximum)',
        type: 'local_maximum'
      });
    }
  }
  
  // 2. Find sharp increases between consecutive points
  for (let i = 1; i < retentionData.length; i++) {
    const current = retentionData[i].watchRatio;
    const prev = retentionData[i - 1].watchRatio;
    const increasePercentage = current - prev;
    const increaseRatio = increasePercentage / prev;
    
    if (increaseRatio >= sharpIncreaseThreshold) {
      sharpIncreases.push({
        timeRatio: retentionData[i].timeRatio,
        score: 1 + (increasePercentage / 10),
        event: 'Engagement spike (sharp increase)',
        type: 'sharp_increase'
      });
    }
  }
  
  // Combine both types of spikes
  const allSpikes = [...localMaxima, ...sharpIncreases];
  
  // Return all spikes, sorted by time
  return allSpikes.sort((a, b) => a.timeRatio - b.timeRatio);
} 