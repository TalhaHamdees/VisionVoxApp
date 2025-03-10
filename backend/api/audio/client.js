/**
 * ElevenLabs API client implementation
 * This is a simplified version of the ElevenLabsClient
 */
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const ffmpeg = require('fluent-ffmpeg');
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
   * Process audio file with ffmpeg to remove silence or add emphasis
   */
  async processAudio(inputPath, options = {}) {
    const { 
      remove_silence, 
      silence_threshold = 0.5, 
      silence_detection_level = -30,
      normalize_audio 
    } = options;
    
    if (!remove_silence && !normalize_audio) {
      console.log('ℹ️ No audio processing needed');
      return {
        processedPath: inputPath,
        processedFilename: path.basename(inputPath)
      };
    }
    
    try {
      console.log('🔧 Processing audio with options:', { 
        remove_silence, 
        silence_threshold, 
        silence_detection_level,
        normalize_audio 
      });
      
      // Generate output filename
      const inputFilename = path.basename(inputPath);
      const outputFilename = `processed_${inputFilename}`;
      const outputPath = path.join(this.audioOutputDir, outputFilename);
      
      let command = ffmpeg(inputPath);
      
      // Build the filter chain
      let filterChain = [];
      
      // Apply silence removal if enabled
      if (remove_silence) {
        console.log('🔇 Applying silence removal with:');
        console.log(`- Threshold: ${silence_threshold} seconds`);
        console.log(`- Detection level: ${silence_detection_level} dB`);
        
        // Use the silenceremove filter with customizable parameters
        // stop_periods=-1: remove all silence periods
        // stop_duration: minimum silence duration to remove (in seconds)
        // stop_threshold: silence detection threshold (in dB)
        filterChain.push(`silenceremove=stop_periods=-1:stop_duration=${silence_threshold}:stop_threshold=${silence_detection_level}dB`);
      }
      
      // Apply normalization to 0dB if enabled
      if (normalize_audio) {
        console.log('🔊 Normalizing audio to 0dB');
        // Use loudnorm filter to normalize audio to 0dB peak
        filterChain.push('loudnorm=I=-16:TP=0:LRA=11');
      }
      
      // Apply the filters if any
      if (filterChain.length > 0) {
        command = command.audioFilters(filterChain);
      }
      
      // Set output path
      command = command.output(outputPath);
      
      // Return a promise that resolves when processing is complete
      return new Promise((resolve, reject) => {
        command
          .on('start', (commandLine) => {
            console.log('🔧 Executing ffmpeg command:', commandLine);
          })
          .on('progress', (progress) => {
            if (DEBUG && progress.percent) {
              console.log(`🔄 Processing: ${Math.round(progress.percent)}% done`);
            }
          })
          .on('end', () => {
            console.log('✅ Audio processing complete');
            
            // Verify the processed file exists and has content
            if (!fs.existsSync(outputPath)) {
              console.error('❌ Processed audio file was not created');
              resolve({
                processedPath: inputPath,
                processedFilename: path.basename(inputPath)
              });
              return;
            }
            
            const stats = fs.statSync(outputPath);
            if (stats.size === 0) {
              console.error('❌ Processed audio file is empty');
              resolve({
                processedPath: inputPath,
                processedFilename: path.basename(inputPath)
              });
              return;
            }
            
            console.log('- Original file:', inputPath);
            console.log('- Processed file:', outputPath);
            console.log('- File size:', stats.size, 'bytes');
            
            resolve({
              processedPath: outputPath,
              processedFilename: path.basename(outputPath)
            });
          })
          .on('error', (err) => {
            console.error('❌ Error processing audio:', err.message);
            resolve({
              processedPath: inputPath,
              processedFilename: path.basename(inputPath)
            });
          })
          .run();
      });
    } catch (error) {
      console.error('❌ Error processing audio:', error.message);
      return {
        processedPath: inputPath,
        processedFilename: path.basename(inputPath)
      };
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
        pitch = 1.0,
        remove_silence = false,
        silence_threshold = 0.5,
        silence_detection_level = -30,
        normalize_audio = false
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
        pitch,
        remove_silence,
        silence_threshold,
        silence_detection_level,
        normalize_audio
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
        pitch,
        remove_silence,
        silence_threshold,
        silence_detection_level,
        normalize_audio
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
        writer.on('finish', async () => {
          // Verify the file was created and has content
          try {
            const stats = fs.statSync(outputPath);
            console.log('✅ Audio file saved successfully:', filename);
            console.log('- File size:', stats.size, 'bytes');
            
            if (stats.size === 0) {
              console.error('⚠️ Warning: Generated audio file is empty (0 bytes)');
              resolve({
                audio_url: `/stream/${filename}`,
                filename: filename,
                fileSize: stats.size,
                duration: null
              });
              return;
            }
            
            // Process audio if needed
            const { remove_silence, silence_threshold, silence_detection_level, normalize_audio } = options;
            if (remove_silence || normalize_audio) {
              console.log('🔄 Post-processing audio...');
              const result = await this.processAudio(outputPath, { 
                remove_silence, 
                silence_threshold,
                silence_detection_level,
                normalize_audio
              });
              
              // If the file was processed, use the processed file
              if (result.processedPath !== outputPath) {
                const processedStats = fs.statSync(result.processedPath);
                
                console.log('✅ Using processed audio file:', result.processedFilename);
                console.log('- File size:', processedStats.size, 'bytes');
                
                // Return only the processed audio URL
                resolve({
                  audio_url: `/stream/${result.processedFilename}`,
                  filename: result.processedFilename,
                  fileSize: processedStats.size,
                  duration: null
                });
                return;
              }
            }
            
            // If no processing or processing failed, use the original file
            resolve({
              audio_url: `/stream/${filename}`,
              filename: filename,
              fileSize: stats.size,
              duration: null
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