import { NextRequest, NextResponse } from "next/server";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1";

/**
 * POST handler for the ElevenLabs Scribe API
 * Proxies requests to ElevenLabs for speech-to-text conversion
 */
export async function POST(request: NextRequest) {
  try {
    // Get the request body (FormData with audio file)
    const formData = await request.formData();
    
    // Check for API key in the request or use the environment variable
    let apiKey = ELEVENLABS_API_KEY;
    const requestApiKey = formData.get('api_key');
    if (requestApiKey && typeof requestApiKey === 'string') {
      apiKey = requestApiKey;
      // Remove the API key from the form data before forwarding to ElevenLabs
      formData.delete('api_key');
    }
    
    // Verify API key is available
    if (!apiKey) {
      return NextResponse.json(
        { error: "ElevenLabs API key is not configured" },
        { status: 500 }
      );
    }
    
    // Create a new FormData to send to ElevenLabs
    const elevenlabsFormData = new FormData();
    
    // Get the audio file from the request - use the parameter name that the frontend is sending
    const audioFile = formData.get('audio_file');
    if (!audioFile || !(audioFile instanceof Blob)) {
      return NextResponse.json(
        { error: "Audio file is required" },
        { status: 400 }
      );
    }
    
    // Log audio file info for debugging
    console.log('Audio file:', {
      type: audioFile.type,
      size: audioFile.size,
      name: audioFile instanceof File ? audioFile.name : 'Unknown'
    });
    
    // Add the audio file to ElevenLabs using their expected parameter name
    elevenlabsFormData.append('file', audioFile);
    
    // Add model ID (scribe_v1 is their transcription model)
    elevenlabsFormData.append('model_id', 'scribe_v1');

    console.log('Sending request to ElevenLabs Speech-to-Text API...');
    
    // Make the request to ElevenLabs Speech-to-Text API with the exact endpoint
    const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
      },
      body: elevenlabsFormData,
    });

    // Check for errors
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        // If JSON parsing fails, get the text response
        const textResponse = await response.text();
        console.error("ElevenLabs API error (text response):", textResponse);
        errorData = { message: textResponse || "Unknown error" };
      }
      
      console.error("ElevenLabs API error:", {
        status: response.status,
        statusText: response.statusText,
        data: errorData
      });
      
      return NextResponse.json(
        { 
          error: "Error from ElevenLabs API", 
          details: errorData,
          status: response.status,
          statusText: response.statusText
        },
        { status: response.status }
      );
    }

    // Return the transcription data
    const transcriptionData = await response.json();
    console.log('Transcription successful');
    return NextResponse.json(transcriptionData);
  } catch (error) {
    console.error("Error in ElevenLabs Scribe API route:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 