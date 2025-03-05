/**
 * ElevenLabs API client implementation
 * This is a simplified version of the ElevenLabsClient
 */
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Debug flag - set to true to enable detailed console logging
const DEBUG = true;

class ElevenLabsClient {
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.ELEVENLABS_API_KEY;
    this.baseUrl = 'https://api.elevenlabs.io/v1';
    this.audioOutputDir = path.join(__dirname, '../../audio-output');
    
    // Validate API key
    if (!this.apiKey) {
      console.error('⚠️ ELEVENLABS_API_KEY is not set in environment variables');
    } else {
      console.log('✅ ELEVENLABS_API_KEY is set (length:', this.apiKey.length, 'characters)');
    }
    
    // Ensure audio output directory exists
    if (!fs.existsSync(this.audioOutputDir)) {
      fs.mkdirSync(this.audioOutputDir, { recursive: true });
      console.log('📁 Created audio output directory:', this.audioOutputDir);
    }
  }

  /**
   * Get available voices
   */
  async getVoices() {
    try {
      console.log('🔍 Fetching voices from ElevenLabs API...');
      
      const response = await axios.get(`${this.baseUrl}/voices`, {
        headers: {
          'xi-api-key': this.apiKey
        }
      });
      
      const voices = response.data.voices.map(voice => ({
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
      
      console.log(`✅ Successfully fetched ${voices.length} voices`);
      return voices;
    } catch (error) {
      console.error('❌ Error fetching voices:');
      console.error('- Message:', error.message);
      
      if (error.response) {
        console.error('- Status:', error.response.status);
        console.error('- Data:', JSON.stringify(error.response.data));
        
        // Check for common API key issues
        if (error.response.status === 401) {
          console.error('⚠️ Authentication failed. Check if your ELEVENLABS_API_KEY is valid.');
        }
      }
      
      throw error;
    }
  }

  /**
   * Get available models
   */
  async getModels() {
    try {
      const response = await axios.get(`${this.baseUrl}/models`, {
        headers: {
          'xi-api-key': this.apiKey
        }
      });
      
      return response.data.map(model => ({
        model_id: model.model_id,
        name: model.name,
        description: model.description || '',
        token_cost_factor: model.token_cost_factor || 1.0
      }));
    } catch (error) {
      console.error('Error fetching models:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Convert text to speech
   */
  async textToSpeech(voiceId, options = {}) {
    try {
      const {
        text,
        model_id = 'eleven_multilingual_v2',
        stability = 0.5,
        similarity_boost = 0.75,
        style = 0.0,
        use_speaker_boost = true,
        output_format = 'mp3_44100_128',
        speed = 1.0,
        pitch = 1.0
      } = options;

      // Validate required parameters
      if (!text) {
        throw new Error('Text is required');
      }
      
      if (!voiceId) {
        throw new Error('Voice ID is required');
      }

      console.log('🚀 ElevenLabs API Request:');
      console.log('- Voice ID:', voiceId);
      console.log('- Model ID:', model_id);
      console.log('- Text length:', text.length, 'characters');
      console.log('- Text preview:', text.substring(0, 50) + (text.length > 50 ? '...' : ''));
      console.log('- Parameters:', { 
        stability, 
        similarity_boost, 
        style, 
        use_speaker_boost, 
        output_format,
        speed,
        pitch
      });

      // Generate a unique filename
      const filename = `audio_${uuidv4()}.mp3`;
      const outputPath = path.join(this.audioOutputDir, filename);
      console.log('📁 Output file:', outputPath);

      // Request parameters
      const url = `${this.baseUrl}/text-to-speech/${voiceId}?output_format=${output_format}`;
      console.log('🔗 API URL:', url);
      
      const headers = {
        'xi-api-key': this.apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg'
      };
      
      // Note: ElevenLabs API doesn't directly support speed/pitch in the API
      // We'll include them in the request for documentation, but they'll be applied client-side
      const data = {
        text,
        model_id,
        voice_settings: {
          stability,
          similarity_boost,
          style,
          use_speaker_boost
        }
      };

      // For documentation purposes - these aren't used by ElevenLabs API directly
      // but we're including them in the log for clarity
      const clientSideSettings = {
        speed,
        pitch
      };
      console.log('⚙️ Client-side playback settings:', clientSideSettings);

      console.log('📤 Sending request to ElevenLabs API...');
      
      // Make request to ElevenLabs API
      const response = await axios({
        method: 'post',
        url,
        headers,
        data,
        responseType: 'stream'
      });

      console.log('📥 Received response from ElevenLabs API:');
      console.log('- Status:', response.status);
      console.log('- Headers:', JSON.stringify(response.headers));

      // Save the audio file
      const writer = fs.createWriteStream(outputPath);
      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => {
          // Verify the file was created and has content
          try {
            const stats = fs.statSync(outputPath);
            console.log('✅ Audio file saved successfully:', filename);
            console.log('- File size:', stats.size, 'bytes');
            
            if (stats.size === 0) {
              console.error('⚠️ Warning: Generated audio file is empty (0 bytes)');
            }
            
            resolve({
              audio_url: `/stream/${filename}`,
              filename: filename,
              fileSize: stats.size,
              duration: null // We don't have duration info from the API
            });
          } catch (err) {
            console.error('❌ Error verifying audio file:', err);
            reject(err);
          }
        });
        writer.on('error', (err) => {
          console.error('❌ Error writing audio file:', err);
          reject(err);
        });
      });
    } catch (error) {
      console.error('❌ Error generating audio:');
      console.error('- Message:', error.message);
      
      if (error.response) {
        console.error('- Status:', error.response.status);
        console.error('- Headers:', JSON.stringify(error.response.headers));
        
        // Try to extract more detailed error information
        if (error.response.data) {
          try {
            // For non-stream responses
            if (typeof error.response.data === 'object') {
              console.error('- Response data:', JSON.stringify(error.response.data));
            } else {
              // For stream responses or string data
              console.error('- Response data type:', typeof error.response.data);
            }
          } catch (e) {
            console.error('- Could not stringify response data');
          }
        }
        
        // Check for common API issues
        if (error.response.status === 401) {
          console.error('⚠️ Authentication failed. Check if your ELEVENLABS_API_KEY is valid.');
        } else if (error.response.status === 400) {
          console.error('⚠️ Bad request. Check if the voice ID and other parameters are valid.');
        } else if (error.response.status === 422) {
          console.error('⚠️ Validation error. Check if the text content is valid.');
        }
      }
      
      console.error('- Stack:', error.stack);
      throw error;
    }
  }
}

module.exports = ElevenLabsClient; 