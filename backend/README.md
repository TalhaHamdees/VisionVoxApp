# VisionVox Backend

This is the backend service for the VisionVox application. It provides authentication, user management, and audio generation capabilities.

## Features

- User authentication and registration
- Text-to-speech audio generation using ElevenLabs API
- Multiple voice options with customizable parameters
- Audio file streaming and download

## Setup

1. Make sure you have Node.js (v14.0.0 or later) installed
2. Install dependencies:
   ```
   npm install
   ```
3. Set up environment variables:
   - Create a `.env` file in the backend directory
   - Add your MongoDB URI: `MONGODB_URI=mongodb://localhost:27017/visionvox2`
   - Add your NextAuth secret: `NEXTAUTH_SECRET=your-super-secret-key-for-nextauth`
   - Add your NextAuth URL: `NEXTAUTH_URL=http://localhost:3000/api/auth`
   - Add your ElevenLabs API key: `ELEVENLABS_API_KEY=your_elevenlabs_api_key_here`
   - Add your base URL: `BASE_URL=http://localhost:3001` (used for constructing audio URLs)

4. Set up frontend environment variables:
   - Create a `.env.local` file in the frontend directory
   - Add your backend API URL: `NEXT_PUBLIC_AUDIO_API_URL=/api/audio` (for production)
   - Add your script API URL: `NEXT_PUBLIC_SCRIPT_API_URL=http://localhost:8000` (or your script service URL)

## Running the Server

You can start the server using:

```bash
npm run dev
```

The server will run on http://localhost:3001 by default.

## API Endpoints

### Authentication

```
POST /api/register
POST /api/auth/login
```

### Audio Generation

#### Get Available Voices

```
GET /api/audio/voices
```

Response:
```json
[
  {
    "voice_id": "JBFqnCBsd6RMkjVDRZzb",
    "name": "George",
    "category": "premade",
    "description": "A professional male voice with a neutral accent",
    "preview_url": "https://example.com/preview.mp3",
    "gender": "male",
    "accent": "neutral",
    "age": "adult",
    "use_case": "narration"
  },
  ...
]
```

#### Get Available Models

```
GET /api/audio/models
```

Response:
```json
[
  {
    "model_id": "eleven_multilingual_v2",
    "name": "Eleven Multilingual v2",
    "description": "Latest multilingual model with improved quality and broader language support",
    "token_cost_factor": 1.0
  },
  ...
]
```

#### Generate Audio from Text

```
POST /api/audio/generate
```

Request body (Form data or JSON):
```json
{
  "text": "Text to convert to speech",
  "voice_id": "JBFqnCBsd6RMkjVDRZzb",
  "model_id": "eleven_multilingual_v2",
  "stability": 0.5,
  "similarity_boost": 0.75,
  "style": 0.0,
  "use_speaker_boost": true,
  "output_format": "mp3_44100_128"
}
```

Response:
```json
{
  "audio_url": "/stream/audio_12345.mp3",
  "duration": null
}
```

#### Generate Audio from Script

```
POST /api/audio/script-to-audio/:sessionId
```

Form data:
- `voice_id`: Voice ID (default: "JBFqnCBsd6RMkjVDRZzb")
- `model_id`: Model ID (default: "eleven_multilingual_v2")
- `stability`: Stability value (default: 0.5)
- `similarity_boost`: Similarity boost value (default: 0.75)
- `style`: Style value (default: 0.0)
- `use_speaker_boost`: Speaker boost flag (default: true)
- `script_content`: The script text to convert to speech (optional if sessionId is provided)
- `output_format`: Output format (default: "mp3_44100_128")

Response:
```json
{
  "audio_url": "/stream/audio_12345.mp3",
  "duration": null
}
```

#### Stream Audio File

```
GET /api/audio/stream/:filename
```

Response: Audio file (MP3)

## Implementation Details

The audio generation module is implemented using a unified approach that handles both direct text input and script-based generation:

1. **Unified API**: The same handler is used for both `/generate` and `/script-to-audio/:sessionId` endpoints
2. **Flexible Input**: Accepts text directly or can fetch script content using a sessionId
3. **Custom ElevenLabs Client**: Uses a custom implementation with the official ElevenLabs API endpoints
4. **High-Quality Output**: Defaults to the best available voice (George) and model (Eleven Multilingual v2)

### Audio Output Format

The default audio output format is `mp3_44100_128`, which provides high-quality audio at a reasonable file size. Other available formats include:
- `mp3_44100_64`
- `mp3_44100_96`
- `mp3_44100_128`
- `mp3_44100_192`
- `pcm_16000`
- `pcm_22050`
- `pcm_24000`
- `pcm_44100`

## Integration with Frontend

The audio generation feature in the VisionVox frontend connects to this backend service to provide a seamless text-to-speech experience. The frontend is configured to communicate with this backend at `http://localhost:3001`.

## Troubleshooting

- If you encounter CORS issues, make sure the frontend origin is properly configured in the backend's CORS middleware.
- Check that the ElevenLabs API key is correctly set in the `.env` file.
- Ensure the MongoDB server is running and accessible.
- If audio generation fails, verify your ElevenLabs API key and subscription status.

## Maintenance Scripts (Archived)

The following maintenance scripts were previously part of this codebase but have been removed after their one-time tasks were completed:

### cleanup.js (Removed)

This script was used for a one-time cleanup of invalid user records in the MongoDB database. It performed the following tasks:
- Connected to the MongoDB database (visionvox2)
- Identified users with invalid email formats using regex patterns
- Deleted these invalid user records
- Specifically targeted and deleted a user with the email "umer@gmai"

The script is no longer needed as the application now includes proper validation to prevent invalid email formats.

### migrate-db.js (Removed)

This script was used for a one-time migration of data from an old database to a new one. It performed the following tasks:
- Connected to MongoDB
- Copied all collections and documents from 'visionvox' database to 'visionvox2' database
- Dropped existing collections in the destination database before copying
- Reported on the migration progress

The migration has been completed, and the application now uses the new database structure. 