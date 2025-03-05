# VisionVox Script Backend

This is the backend service for the VisionVox scriptwriting feature. It provides AI-powered script generation and refinement capabilities, as well as text-to-speech audio generation.

## Features

- Generate video scripts based on title and keywords
- Refine existing scripts with specific instructions
- Maintain consistent word count (190-220 words)
- Session-based script management
- Health check endpoint for frontend connectivity verification
- Clean JSON response format for reliable script content extraction
- Text-to-speech audio generation using ElevenLabs API
- Multiple voice options with customizable parameters

## Setup

1. Make sure you have Python 3.8+ installed
2. Install dependencies:
   ```
   pip install -r requirements.txt
   ```
3. Set up environment variables:
   - Create a `.env` file in the scriptbackend directory
   - Add your Groq API key: `GROQ_API_KEY=your_api_key_here`
   - Add your ElevenLabs API key: `ELEVENLABS_API_KEY=your_elevenlabs_api_key_here`

## Running the Server

You can start the server using the provided shell script:

```bash
chmod +x start_server.sh
./start_server.sh
```

Or manually:

```bash
python main.py
```

The server will run on http://localhost:8000 by default.

## API Endpoints

### Health Check

```
GET /health
```

Response:
```json
{
  "status": "ok",
  "message": "Script generation service is running"
}
```

### Generate Script

```
POST /chat
```

Request body:
```json
{
  "user_query": "Write a script about [TITLE] focusing on these keywords: [KEYWORDS]"
}
```

Response:
```json
{
  "response": "Generated script content...",
  "session_id": "unique_session_id",
  "word_count": 205
}
```

The backend ensures clean script content by:
1. Requesting JSON-formatted responses from the AI model
2. Extracting only the script content from the "script_content" field
3. Implementing fallback parsing for any non-JSON responses
4. Removing any markdown formatting or code blocks

### Refine Script

```
POST /refine
```

Request body:
```json
{
  "user_refinement": "Make it more conversational",
  "session_id": "unique_session_id"
}
```

Response:
```json
{
  "response": "Refined script content...",
  "session_id": "unique_session_id",
  "word_count": 210
}
```

### Get Available Voices

```
GET /voices
```

Response:
```json
[
  {
    "voice_id": "21m00Tcm4TlvDq8ikWAM",
    "name": "Rachel",
    "category": "premade",
    "description": "A warm and professional female voice...",
    "preview_url": "https://example.com/preview.mp3",
    "gender": "female",
    "accent": "american",
    "age": "young"
  },
  ...
]
```

### Get Available Models

```
GET /models
```

Response:
```json
[
  {
    "model_id": "eleven_monolingual_v1",
    "name": "Eleven Monolingual v1",
    "description": "Optimized for English language...",
    "token_cost_factor": 1.0
  },
  ...
]
```

### Generate Audio from Text

```
POST /generate-audio
```

Request body:
```json
{
  "text": "Text to convert to speech",
  "voice_id": "21m00Tcm4TlvDq8ikWAM",
  "model_id": "eleven_monolingual_v1",
  "stability": 0.5,
  "similarity_boost": 0.75,
  "style": 0.0,
  "use_speaker_boost": true
}
```

Response:
```json
{
  "audio_url": "/audio/audio_12345.mp3",
  "duration": null
}
```

### Generate Audio from Script

```
POST /script-to-audio/{session_id}
```

Form data:
- `voice_id`: Voice ID (default: "21m00Tcm4TlvDq8ikWAM")
- `model_id`: Model ID (default: "eleven_monolingual_v1")
- `stability`: Stability value (default: 0.5)
- `similarity_boost`: Similarity boost value (default: 0.75)
- `style`: Style value (default: 0.0)
- `use_speaker_boost`: Speaker boost flag (default: true)

Response:
```json
{
  "audio_url": "/audio/script_audio_12345.mp3",
  "duration": null
}
```

### Stream Audio File

```
GET /audio/{filename}
```

Response: Audio file (MP3)

## Integration with Frontend

The scriptwriting feature in the VisionVox frontend connects to this backend service to provide a seamless script generation experience. The frontend is configured to communicate with this backend at `http://localhost:8000`.

### Frontend Features

The frontend scriptwriting page includes:

1. **Script Generation**: Create scripts based on title and keywords
2. **Script Refinement**: Refine scripts with specific instructions
3. **Script Management**: Save, load, and delete scripts
4. **Script Analysis**: Analyze scripts for tone, readability, and improvement suggestions
5. **Export Options**: Copy to clipboard or download as text file
6. **Template Library**: Pre-made templates for different content types
7. **Audio Generation**: Convert scripts to professional voiceovers with multiple voice options

## Troubleshooting

- If you encounter CORS issues, make sure the frontend origin is properly configured in the backend's CORS middleware.
- Check that the Groq API key is correctly set in the `.env` file.
- Check that the ElevenLabs API key is correctly set in the `.env` file.
- Ensure the virtual environment is properly activated before running the server.
- If the frontend shows "Script Generation Service Unavailable", check that the backend server is running and accessible.
- If audio generation fails, verify your ElevenLabs API key and subscription status. 