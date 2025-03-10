import { NextRequest, NextResponse } from 'next/server';

// Define types for the stats data
interface DropOffPoint {
  time: number;
  percentage: number;
  type?: string;
}

interface EngagementSpike {
  time: number;
  score: number;
  event: string;
  type?: string;
}

interface YouTubeVideoStats {
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  averageViewDuration: number;
  retentionData: number[];
  audienceData: {
    ageGroups: { [key: string]: number };
    genderGroups: { [key: string]: number };
    geoGroups: { [key: string]: number };
  };
  engagementSpikes: EngagementSpike[];
  dropOffPoints: DropOffPoint[];
  isRealData: boolean;
  duration: number;
  title: string;
  publishedAt: string;
  videoId: string;
  isShort: boolean;
}

/**
 * YouTube Script Feedback Endpoint
 * 
 * This endpoint analyzes video performance data and generates
 * actionable feedback for improving future scripts.
 * 
 * @route POST /api/youtube/script-feedback
 */
export async function POST(request: NextRequest) {
  try {
    const { videoId, stats } = await request.json();
    
    if (!videoId || !stats) {
      return NextResponse.json(
        { error: 'Video ID and stats are required' },
        { status: 400 }
      );
    }
    
    const videoStats = stats as YouTubeVideoStats;
    
    // Determine if this is likely a Short based on drop-off points
    const isShort = videoStats.dropOffPoints.some(point => point.time < 60);
    
    // Analyze retention data to find strengths
    const strengths = [];
    
    // Check if retention starts strong
    if (videoStats.retentionData[0] > 90) {
      strengths.push({
        title: 'Strong Opening Hook',
        description: isShort 
          ? 'Your Short has excellent retention in the first 3 seconds, indicating a strong hook that captures viewer attention immediately.'
          : 'Your video has excellent retention in the first 30 seconds, indicating a strong opening that captures viewer attention.'
      });
    }
    
    // Check engagement metrics
    if (videoStats.likeCount > videoStats.viewCount * 0.05) {
      strengths.push({
        title: 'Good Engagement Rate',
        description: 'Your like-to-view ratio is above average, showing that viewers are engaging positively with your content.'
      });
    }
    
    if (videoStats.commentCount > videoStats.viewCount * 0.01) {
      strengths.push({
        title: 'Active Community',
        description: isShort
          ? 'Your Short has generated significant discussion, which is exceptional for short-form content where comment rates are typically lower.'
          : 'Your video has generated significant discussion, indicating that your content resonates with viewers and encourages interaction.'
      });
    }
    
    // If we don't have enough strengths, add a generic one
    if (strengths.length < 2) {
      strengths.push({
        title: 'Consistent Pacing',
        description: isShort
          ? 'Your Short maintains relatively consistent viewer retention throughout its brief duration, suggesting good pacing and content structure.'
          : 'Your video maintains relatively consistent viewer retention throughout, suggesting good pacing and content structure.'
      });
    }
    
    // Analyze drop-off points for weaknesses
    const weaknesses = [];
    
    if (videoStats.dropOffPoints && videoStats.dropOffPoints.length > 0) {
      // Find the biggest drop-off
      const biggestDropOff = videoStats.dropOffPoints.reduce(
        (max: DropOffPoint, point: DropOffPoint) => (point.percentage > max.percentage ? point : max),
        { time: 0, percentage: 0 }
      );
      
      if (biggestDropOff.percentage > 15) {
        weaknesses.push({
          title: 'Significant Drop-off Point',
          description: isShort
            ? `There's a ${biggestDropOff.percentage}% drop in retention around the ${formatTime(biggestDropOff.time)} mark, which is critical in short-form content where every second counts.`
            : `There's a ${biggestDropOff.percentage}% drop in retention around the ${formatTime(biggestDropOff.time)} mark, suggesting viewers may be losing interest at this point.`
        });
      }
    }
    
    // Check comment engagement
    if (videoStats.commentCount < videoStats.viewCount * 0.005) {
      weaknesses.push({
        title: 'Low Comment Engagement',
        description: isShort
          ? 'Your comment count is lower than optimal for Shorts. Adding a direct question or call-to-action can boost engagement.'
          : 'Your comment count is lower than average, indicating that viewers aren\'t being prompted to engage in discussion.'
      });
    }
    
    // If we don't have enough weaknesses, add a generic one
    if (weaknesses.length < 2) {
      weaknesses.push({
        title: 'Gradual Audience Decline',
        description: isShort
          ? 'Your Short shows a steady decline in viewership rather than maintaining consistent engagement throughout its brief duration.'
          : 'Your video shows a steady decline in viewership rather than maintaining consistent engagement throughout.'
      });
    }
    
    // Generate recommendations based on strengths and weaknesses
    const recommendations = [];
    
    // Recommendation for drop-offs
    if (videoStats.dropOffPoints && videoStats.dropOffPoints.length > 0) {
      recommendations.push({
        title: 'Address Key Drop-off Points',
        description: isShort
          ? `For Shorts, consider restructuring content around the ${formatTime(videoStats.dropOffPoints[0].time)} mark with a visual pattern interrupt or surprising element.`
          : `Consider restructuring content around the ${formatTime(videoStats.dropOffPoints[0].time)} mark to maintain viewer interest. Add pattern interrupts or new information at these points.`
      });
    }
    
    // Recommendation for engagement
    if (videoStats.commentCount < videoStats.viewCount * 0.01) {
      recommendations.push({
        title: 'Increase Viewer Interaction',
        description: isShort
          ? 'Include a direct question or controversial statement in your Short to drive comments. For Shorts, this should appear as on-screen text.'
          : 'Include specific questions or prompts throughout your script to encourage viewers to comment and engage with your content.'
      });
    }
    
    // Recommendation based on audience demographics
    const topAgeGroup = Object.entries(videoStats.audienceData.ageGroups).reduce(
      (max: [string, number], [age, percentage]: [string, number]) => 
        percentage > max[1] ? [age, percentage] : max,
      ['', 0]
    );
    
    recommendations.push({
      title: `Optimize for ${topAgeGroup[0]} Age Group`,
      description: isShort
        ? `Your content resonates well with the ${topAgeGroup[0]} age group (${topAgeGroup[1]}% of viewers). For Shorts, use trending sounds, references, and visual styles that appeal to this demographic.`
        : `Your content resonates well with the ${topAgeGroup[0]} age group (${topAgeGroup[1]}% of viewers). Consider tailoring your script style and references to this demographic.`
    });
    
    // Add a recommendation about pacing
    recommendations.push({
      title: 'Improve Content Pacing',
      description: isShort
        ? 'For Shorts, aim for a new visual element every 1-2 seconds. Start with your strongest point and maintain a rapid pace throughout the entire Short.'
        : 'Structure your script with a clear beginning, middle, and end. Aim to introduce new points or visuals every 30-45 seconds to maintain viewer interest.'
    });
    
    // Generate script suggestions
    const scriptSuggestions = isShort
      ? `
Based on your Short's performance, consider these improvements:

1. Create a stronger hook in the first 3 seconds - show the end result first
2. Use on-screen text for key points (max 2-3 words per frame)
3. Add a direct question as text overlay to encourage comments
4. Keep total length under 30 seconds for optimal retention
5. Use trending sounds/music that resonates with your ${topAgeGroup[0]} audience
6. Add pattern interrupts at the ${videoStats.dropOffPoints.map(p => formatTime(p.time)).join(', ')} marks
7. End with a clear call-to-action ("Follow for more" or "Try this yourself")
8. Use jump cuts to maintain rapid pacing
9. Film in vertical format (9:16) for optimal Shorts viewing
`
      : `
Based on your video's performance, consider these script improvements:

1. Start with a stronger hook that clearly states what viewers will learn
2. Add timestamps to your script for key sections
3. Include a clear call-to-action for comments around the 70% mark of your video
4. Break up longer explanations with visual demonstrations
5. End with a question that encourages viewer response
6. Use more conversational language that resonates with your ${topAgeGroup[0]} audience
7. Add pattern interrupts at the ${videoStats.dropOffPoints.map(p => formatTime(p.time)).join(', ')} marks
8. Incorporate storytelling elements to maintain engagement
`;
    
    return NextResponse.json({
      strengths,
      weaknesses,
      recommendations,
      scriptSuggestions
    });
  } catch (error) {
    console.error('Error generating script feedback:', error);
    return NextResponse.json(
      { error: 'Failed to generate script feedback' },
      { status: 500 }
    );
  }
}

// Helper function to format time in MM:SS format
function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
} 