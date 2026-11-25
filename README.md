# VisionVox - AI-Powered Video Editor

VisionVox is a comprehensive web-based video editing platform built with React and Next.js. This project allows users to create and edit videos with features like timeline editing, text overlays, sound integration, and AI-powered scriptwriting.

## Team

Vision Vox was built by **Muhammad Talha Hamdees** and **Umer Abdullah** as their final-year project for the
BS Software Engineering at COMSATS University Islamabad (2021-2025), supervised by Ms. Najmun Nisa. It placed
**3rd in the Web category at the COMSATS Industrial Connect Career Expo Spring 2025** (27 May 2025, Career Development Centre, COMSATS University Islamabad).

| Part | Built by |
|---|---|
| AI scriptwriting (`scriptbackend/`) | Talha |
| Voiceover generation and audio enhancement (`backend/api/audio/`, `frontend/app/audio/`) | Talha |
| Subtitle generation and customization (`frontend/components/editor/components/overlays/captions/`, `backend/api/subtitles/`) | Talha |
| High-definition image enhancement with Real-ESRGAN (`backend/ai_models/`, `backend/api/image-enhancement/`) | Talha |
| YouTube video performance analyzer | Talha and Umer |
| Web-based video editor | Talha and Umer |
| User management | Talha and Umer |
| Requirements, design, UI/UX, testing, deployment, report and expo demo | Talha and Umer |

The project was developed outside GitHub and uploaded here after completion, so the commit history does not
show who wrote which part.

## Features

### Video Editing
- Timeline-based editing interface
- Text and caption overlays
- Media library integration with Pexels
- Custom file uploads for images, videos, and audio
- Export to various formats

### AI Scriptwriting
The application includes an AI-powered scriptwriting feature that helps users create professional scripts for their videos:

- Generate scripts based on title and keywords
- Refine scripts with specific instructions
- Maintain consistent word count (190-220 words)
- Export scripts as text files
- Template library for different content types (YouTube, TikTok, Instagram, etc.)
- Script analysis for tone, readability, and improvement suggestions
- Clean JSON response format for reliable script content

### Text-to-Speech
The application includes a text-to-speech feature powered by ElevenLabs:

- Convert scripts to professional voiceovers
- Choose from multiple voice options
- Customize voice parameters (stability, similarity boost, etc.)
- Preview and download audio files
- Seamless integration with the scriptwriting module

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

- Node.js (v14.0.0 or later)
- npm (v6.0.0 or later)
- Python 3.8+ (for scriptwriting and audio generation backend)

### Installation

1. Clone the repository:

   ```
   git clone https://github.com/your-username/visionvox.git
   ```

2. Navigate to the project directory:

   ```
   cd visionvox
   ```

3. Install the frontend dependencies:

   ```
   cd frontend
   npm install
   ```

4. Create a `.env.local` file in the frontend directory and add your Pexels API key:

   ```
   NEXT_PUBLIC_PEXELS_API_KEY=your_pexels_api_key_here
   ```

   You can obtain a free API key by:
   1. Going to https://www.pexels.com/api/
   2. Signing up for a Pexels account
   3. Copying your API key from the dashboard

5. Install the main backend dependencies:

   ```
   cd ../backend
   npm install
   ```

6. Create a `.env` file in the backend directory and add your API keys:

   ```
   BASE_URL=http://localhost:3001
   JWT_SECRET=your_jwt_secret_here
   ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
   ```

7. Set up the scriptwriting backend:

   ```
   cd ../scriptbackend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

8. Create a `.env` file in the scriptbackend directory and add your API keys:

   ```
   GROQ_API_KEY=your_groq_api_key_here
   ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
   ```

   You can obtain a Groq API key by signing up at https://console.groq.com/
   You can obtain an ElevenLabs API key by signing up at https://elevenlabs.io/

## Running the Application

1. Start the frontend development server:

   ```
   cd frontend
   npm run dev
   ```

2. Start the main backend server:

   ```
   cd ../backend
   node server.js
   ```

3. Start the scriptwriting backend server:

   ```
   cd ../scriptbackend
   chmod +x start_server.sh
   ./start_server.sh
   ```

   Or manually:

   ```
   python main.py
   ```

4. Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## Project Structure

The project is organized into three main components:

### Frontend
- `/frontend`: Contains the Next.js application
  - `/app`: Next.js app router pages
  - `/components`: React components
  - `/lib`: Utility functions and hooks
  - `/public`: Static assets

### Main Backend
- `/backend`: Contains the Express.js server for authentication and audio generation
  - `server.js`: Main Express.js server
  - `/api`: API endpoints
  - `/api/audio`: Audio generation endpoints
  - `/models`: Database models

### Script Backend
- `/scriptbackend`: Contains the Python backend for AI script generation
  - `main.py`: FastAPI application
  - `requirements.txt`: Python dependencies
  - `start_server.sh`: Script to start the backend server

## Usage

### Video Editor
Navigate to the editor page to create and edit videos. The editor provides a timeline interface where you can:
- Add and arrange clips
- Add text overlays and captions
- Upload custom media files
- Export your final video

### Scriptwriting
Navigate to the scriptwriting page to generate scripts for your videos:
1. Enter a title and keywords for your script
2. Click "Generate Script"
3. Refine the script with additional instructions if needed
4. Copy, save, or export the final script

### Text-to-Speech
After generating a script, you can convert it to audio:
1. Select a voice from the available options
2. Customize voice parameters if needed
3. Click "Generate Audio"
4. Preview the audio and download it for use in your video

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Next.js](https://nextjs.org/)
- [React](https://reactjs.org/)
- [Remotion](https://www.remotion.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [FastAPI](https://fastapi.tiangolo.com/)
- [Express.js](https://expressjs.com/)
- [Groq](https://groq.com/)
- [ElevenLabs](https://elevenlabs.io/) 