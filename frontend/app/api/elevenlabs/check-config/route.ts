import { NextResponse } from "next/server";

/**
 * GET handler for checking if the ElevenLabs API key is configured
 * Returns a simple JSON response indicating whether the API key is set
 */
export async function GET() {
  const isConfigured = Boolean(process.env.ELEVENLABS_API_KEY);
  
  return NextResponse.json({
    isConfigured,
  });
} 