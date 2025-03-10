import { NextRequest, NextResponse } from 'next/server';

// Define types for the stats data
interface DropOffPoint {
  time: number;
  percentage: number;
}

interface EngagementSpike {
  time: number;
  score: number;
  event: string;
}

interface YouTubeVideoStats {
  videoId: string;
  title?: string;
  publishedAt?: string;
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
}

interface ScriptFeedback {
  strengths: { title: string; description: string }[];
  weaknesses: { title: string; description: string }[];
  recommendations: { title: string; description: string }[];
  scriptSuggestions: string;
}

/**
 * YouTube Script Generation Endpoint
 * 
 * This endpoint generates an optimized script based on video performance data
 * and feedback analysis.
 * 
 * @route POST /api/youtube/generate-script
 */
export async function POST(request: NextRequest) {
  try {
    const { videoId, stats, feedback } = await request.json();
    
    if (!videoId || !stats || !feedback) {
      return NextResponse.json(
        { error: 'Video ID, stats, and feedback are required' },
        { status: 400 }
      );
    }
    
    const videoStats = stats as YouTubeVideoStats;
    const scriptFeedback = feedback as ScriptFeedback;
    
    // In a real implementation, this would use an AI model to generate a script
    // based on the video performance data and feedback. For this demo, we'll
    // generate a template script.
    
    // Extract key information from stats and feedback
    const topAgeGroup = Object.entries(videoStats.audienceData.ageGroups).reduce(
      (max: [string, number], [age, percentage]: [string, number]) => 
        percentage > max[1] ? [age, percentage] : max,
      ['', 0]
    );
    
    const dropOffPoints = videoStats.dropOffPoints || [];
    const engagementSpikes = videoStats.engagementSpikes || [];
    
    // Determine if this is likely a Short based on engagement patterns
    const isShort = dropOffPoints.some(point => point.time < 60);
    
    // Generate a script template based on the feedback and video type
    let script;
    
    if (isShort) {
      // Short-form script template (for YouTube Shorts)
      script = `# Optimized YouTube Short: ${videoStats.title ? `Improved Version of "${videoStats.title}"` : 'New Short'}

## Hook (0-3 seconds)
- Immediate attention-grabber: "Wait until you see what happens at the end!"
- Start with a question or surprising statement
- Show the most visually interesting part first
- Use pattern interrupt techniques

## Main Content (3-45 seconds)
- Get to the point immediately
- One clear message/concept only
- Visual demonstration or transformation
- Keep text on screen brief and impactful
- Use ${topAgeGroup[0]}-friendly language and references

## Call to Action (45-60 seconds)
- Clear, direct CTA: "Follow for more" or "Try this yourself"
- Ask a specific question to drive comments
- Tease related content
- End with a strong closing line or visual

## Production Notes
- Vertical format (9:16 aspect ratio)
- Fast pacing - new visual every 1-2 seconds
- Add text overlays for key points
- Use trending sounds/music
- Add visual elements at ${engagementSpikes.map((spike: EngagementSpike) => formatTime(spike.time)).join(', ')} to maintain engagement
- Keep total length under 60 seconds (ideally 15-30 seconds)
- Avoid drop-offs at ${dropOffPoints.map((point: DropOffPoint) => formatTime(point.time)).join(', ')} with pattern interrupts
- Use jump cuts to maintain pace
- Include captions for accessibility

Remember that Shorts require immediate engagement and clear value delivery. Your first 3 seconds determine if viewers will continue watching.
`;
    } else {
      // Long-form video script template
      script = `# Optimized Video Script: ${videoStats.title ? `Improved Version of "${videoStats.title}"` : 'New Video'}

## Introduction (0:00-0:30)
- Strong hook: "Have you ever wondered how to [main topic] without [common pain point]? In this video, I'll show you my top 5 strategies that most people overlook."
- Preview the key points to maintain viewer interest
- Briefly introduce yourself and establish credibility
- Set clear expectations: "By the end of this video, you'll know exactly how to..."

## Main Content (0:30-3:30)

### Point 1 (0:30-1:00)
- Start with your most valuable insight to capture attention
- Use concrete examples and visuals to illustrate your point
- Include a pattern interrupt at 0:45 with a surprising fact or demonstration

### Point 2 (1:00-1:30)
- Build on the first point with complementary information
- Address common misconceptions about the topic
- Use storytelling to make the information more relatable to your ${topAgeGroup[0]} audience

### Point 3 (1:30-2:00)
- Introduce a slightly controversial or unexpected perspective
- Back it up with data or personal experience
- Add a visual demonstration to maintain engagement

### Point 4 (2:00-2:30)
- Present a practical application of your advice
- Include a specific tip that viewers can implement immediately
- Add a pattern interrupt at ${dropOffPoints.length > 0 ? formatTime(dropOffPoints[0].time) : '2:15'} with a question or challenge

### Point 5 (2:30-3:00)
- Share your most actionable advice
- Explain how this connects to the previous points
- Emphasize the unique value proposition of your approach

### Bonus Tip (3:00-3:30)
- Offer an unexpected additional insight
- Frame it as exclusive information: "Most people don't know this, but..."
- Reinforce why this matters to the viewer

## Call to Action (3:30-4:00)
- Summarize the key takeaways
- Ask a specific question to encourage comments: "What's your biggest challenge with [topic]? Let me know in the comments below."
- Suggest related content on your channel
- Thank viewers and invite them to subscribe

## Production Notes
- Use ${topAgeGroup[0]}-friendly language and references
- Add visual elements at ${engagementSpikes.map((spike: EngagementSpike) => formatTime(spike.time)).join(', ')} to maintain engagement
- Include timestamps in the description for easy navigation
- Add pattern interrupts at ${dropOffPoints.map((point: DropOffPoint) => formatTime(point.time)).join(', ')} to prevent viewer drop-off
- Keep explanations concise and focused on practical applications
- Use conversational tone throughout to build connection with viewers

Remember to adapt this template to your specific topic and style while incorporating the data-driven insights from your previous video performance.
`;
    }
    
    return NextResponse.json({ script });
  } catch (error) {
    console.error('Error generating script:', error);
    return NextResponse.json(
      { error: 'Failed to generate script' },
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