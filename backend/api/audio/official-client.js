/**
 * Official ElevenLabs API client implementation
 */
const { ElevenLabsClient } = require('elevenlabs');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Ensure audio output directory exists
const audioOutputDir = path.join(__dirname, '../../audio-output');
if (!fs.existsSync(audioOutputDir)) {
  fs.mkdirSync(audioOutputDir, { recursive: true });
}

/**
 * Get available voices using the official ElevenLabs client
 */
async function getVoices() {
  try {
    const client = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });
    const voices = await client.voices.getAll();
    
    return voices.map(voice => ({
      voice_id: voice.voice_id,
      name: voice.name,
      category: voice.category || 'premade',
      description: voice.description || '',
      preview_url: voice.preview_url || '',
      gender: voice.labels?.gender || 'unknown',
      accent: voice.labels?.accent || 'neutral',
      age: voice.labels?.age || 'adult',
      use_case: voice.labels?.use_case || ''
    }));
  } catch (error) {
    console.error('Error fetching voices:', error);
    throw error;
  }
}

/**
 * Get available models using the official ElevenLabs client
 */
async function getModels() {
  try {
    const client = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });
    const models = await client.models.getAll();
    
    return models.map(model => ({
      model_id: model.model_id,
      name: model.name,
      description: model.description || '',
      token_cost_factor: model.token_cost_factor || 1.0
    }));
  } catch (error) {
    console.error('Error fetching models:', error);
    throw error;
  }
}

/**
 * Convert text to speech using the official ElevenLabs client
 */
async function textToSpeech(voiceId, options) {
  try {
    const {
      text,
      model_id = 'eleven_multilingual_v2',
      stability = 0.5,
      similarity_boost = 0.75,
      style = 0.0,
      use_speaker_boost = true,
      output_format = 'mp3_44100_128'
    } = options;

    if (!text) {
      throw new Error('Text is required');
    }

    const client = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });
    
    // Generate audio using the official client
    const audioStream = await client.textToSpeech.convert(voiceId, {
      text,
      model_id,
      voice_settings: {
        stability,
        similarity_boost,
        style,
        use_speaker_boost
      },
      output_format
    });
    
    // Generate a unique filename
    const filename = `audio_${uuidv4()}.mp3`;
    const outputPath = path.join(audioOutputDir, filename);
    
    // Save the audio file
    const writer = fs.createWriteStream(outputPath);
    audioStream.pipe(writer);
    
    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        resolve({
          audio_url: `/stream/${filename}`,
          duration: null // We don't have duration info from the API
        });
      });
      writer.on('error', (err) => {
        console.error('Error writing audio file:', err);
        reject(err);
      });
    });
  } catch (error) {
    console.error('Error generating audio:', error);
    throw error;
  }
}

module.exports = {
  getVoices,
  getModels,
  textToSpeech
}; 