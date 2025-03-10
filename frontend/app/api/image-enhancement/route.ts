import { NextRequest, NextResponse } from 'next/server';

// Helper function to forward requests to the backend
async function forwardToBackend(req: NextRequest, endpoint: string) {
  try {
    const formData = await req.formData();
    
    // Forward the request to the backend
    const backendUrl = `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/image-enhancement/${endpoint}`;
    
    const response = await fetch(backendUrl, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error from backend: ${errorText}`);
      return NextResponse.json(
        { success: false, message: 'Error processing request', error: errorText },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Error forwarding request to backend:', error);
    return NextResponse.json(
      { success: false, message: 'Error processing request', error: (error as Error).message },
      { status: 500 }
    );
  }
}

// API route for enhancing images
export async function POST(req: NextRequest) {
  const searchParams = new URL(req.url).searchParams;
  const action = searchParams.get('action') || 'enhance';
  
  switch (action) {
    case 'enhance':
      return forwardToBackend(req, 'enhance');
    case 'analyze':
      return forwardToBackend(req, 'analyze');
    default:
      return NextResponse.json(
        { success: false, message: 'Invalid action' },
        { status: 400 }
      );
  }
}

// API route for getting the queue
export async function GET(req: NextRequest) {
  try {
    const backendUrl = `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/image-enhancement/queue`;
    
    const response = await fetch(backendUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error from backend: ${errorText}`);
      return NextResponse.json(
        { success: false, message: 'Error getting queue', error: errorText },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Error getting queue from backend:', error);
    return NextResponse.json(
      { success: false, message: 'Error getting queue', error: (error as Error).message },
      { status: 500 }
    );
  }
} 