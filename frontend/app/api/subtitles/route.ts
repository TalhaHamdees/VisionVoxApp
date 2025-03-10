import { NextRequest, NextResponse } from 'next/server';

// Helper function to forward requests to the backend
async function forwardToBackend(req: NextRequest, endpoint: string) {
  try {
    const formData = await req.formData();
    
    // Forward the request to the backend
    const backendUrl = `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/subtitles/${endpoint}`;
    
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

// API route for generating subtitles
export async function POST(req: NextRequest) {
  const searchParams = new URL(req.url).searchParams;
  const action = searchParams.get('action') || 'generate';
  
  switch (action) {
    case 'generate':
      return forwardToBackend(req, 'generate');
    case 'apply':
      // For apply, we need to handle JSON body
      try {
        const body = await req.json();
        
        // Forward the request to the backend
        const backendUrl = `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/subtitles/apply`;
        
        const response = await fetch(backendUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
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
    default:
      return NextResponse.json(
        { success: false, message: 'Invalid action' },
        { status: 400 }
      );
  }
}

// API route for downloading subtitles
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/');
  const filename = pathParts[pathParts.length - 1];
  
  if (filename) {
    try {
      const backendUrl = `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/subtitles/download/${filename}`;
      
      const response = await fetch(backendUrl);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error from backend: ${errorText}`);
        return NextResponse.json(
          { success: false, message: 'Error downloading subtitles', error: errorText },
          { status: response.status }
        );
      }
      
      const blob = await response.blob();
      return new NextResponse(blob, {
        headers: {
          'Content-Type': 'text/plain',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    } catch (error) {
      console.error('Error downloading subtitles:', error);
      return NextResponse.json(
        { success: false, message: 'Error downloading subtitles', error: (error as Error).message },
        { status: 500 }
      );
    }
  }
  
  return NextResponse.json(
    { success: false, message: 'Filename is required' },
    { status: 400 }
  );
} 