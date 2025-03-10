const axios = require('axios');
const multer = require('multer');
const upload = multer();
const ElevenLabsClient = require('./client');
const fs = require('fs');
const path = require('path');

/**
 * Handler for POST /api/audio/generate
 * Generates audio from text using ElevenLabs API
 * Can be used directly or with script content
 */
const handler = async (req, res) => {
  console.log('📣 Received audio generation request');
  console.log('- Request method:', req.method);
  console.log('- Content-Type:', req.headers['content-type']);
  console.log('- Request body type:', typeof req.body);
  
  try {
    // Validate request body
    if (!req.body) {
      console.error('❌ No request body provided');
      return res.status(400).json({ error: 'Request body is required' });
    }
    
    const { 
      text, 
      script_content,
      voice_id = 'JBFqnCBsd6RMkjVDRZzb', // Default voice (George)
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
    } = req.body;

    console.log('📝 Request parameters:');
    console.log('- Text provided:', !!text);
    if (text) console.log('- Text preview:', text.substring(0, 50) + (text.length > 50 ? '...' : ''));
    console.log('- Script content provided:', !!script_content);
    console.log('- Voice ID:', voice_id);
    console.log('- Model ID:', model_id);
    console.log('- Output format:', output_format);
    console.log('- Speed:', speed);
    console.log('- Pitch:', pitch);
    console.log('- Remove silence:', remove_silence);
    console.log('- Silence threshold:', silence_threshold, 'seconds');
    console.log('- Silence detection level:', silence_detection_level, 'dB');
    console.log('- Normalize audio:', normalize_audio);

    // Get content from either text or script_content parameter
    let contentToConvert = text || script_content;
    
    // If sessionId is provided in the URL, try to fetch script content
    const { sessionId } = req.params;
    if (!contentToConvert && sessionId) {
      console.log('🔍 No direct content provided, fetching script with sessionId:', sessionId);
      try {
        const scriptResponse = await axios.get(`http://localhost:8000/script/${sessionId}`);
        contentToConvert = scriptResponse.data.script_content;
        console.log('✅ Successfully fetched script content, length:', contentToConvert.length);
      } catch (scriptError) {
        console.error('❌ Error fetching script:', scriptError.message);
        if (scriptError.response) {
          console.error('- Status:', scriptError.response.status);
          console.error('- Data:', JSON.stringify(scriptError.response.data));
        }
        return res.status(404).json({ error: 'Script not found', details: scriptError.message });
      }
    }

    if (!contentToConvert) {
      console.error('❌ No content to convert');
      return res.status(400).json({ error: 'Text content is required' });
    }

    console.log('🎯 Content ready for conversion, length:', contentToConvert.length);
    console.log('- Content preview:', contentToConvert.substring(0, 50) + (contentToConvert.length > 50 ? '...' : ''));
    console.log('🔄 Initializing ElevenLabs client...');
    
    const client = new ElevenLabsClient();
    console.log('🚀 Sending request to ElevenLabs API...');
    
    const result = await client.textToSpeech(voice_id, {
      text: contentToConvert,
      model_id,
      stability: parseFloat(stability),
      similarity_boost: parseFloat(similarity_boost),
      style: parseFloat(style),
      use_speaker_boost: Boolean(use_speaker_boost),
      output_format,
      speed: parseFloat(speed),
      pitch: parseFloat(pitch),
      remove_silence: remove_silence === 'true' || remove_silence === true,
      silence_threshold: parseFloat(silence_threshold),
      silence_detection_level: parseFloat(silence_detection_level),
      normalize_audio: normalize_audio === 'true' || normalize_audio === true
    });

    console.log('✅ Audio generation successful');
    console.log('- Result:', result);
    
    // Verify the audio file exists
    const audioFilePath = path.join(__dirname, '../../audio-output', result.filename);
    if (!fs.existsSync(audioFilePath)) {
      console.error('❌ Generated audio file does not exist:', audioFilePath);
      return res.status(500).json({ error: 'Audio file generation failed' });
    }
    
    const fileStats = fs.statSync(audioFilePath);
    console.log('- Audio file size:', fileStats.size, 'bytes');
    
    if (fileStats.size === 0) {
      console.error('❌ Generated audio file is empty (0 bytes)');
      return res.status(500).json({ error: 'Generated audio file is empty' });
    }
    
    // Return the audio URL with the full path
    const baseUrl = process.env.BASE_URL || '';
    const responseData = {
      audio_url: `${baseUrl}/api/audio/stream/${result.filename || result.audio_url.split('/').pop()}`,
      duration: null,
      file_size: fileStats.size
    };
    
    // If there's an original audio file (different from the processed one), include it in the response
    if (result.original_filename && result.original_filename !== result.filename) {
      responseData.original_audio_url = `${baseUrl}/api/audio/stream/${result.original_filename}`;
    }
    
    console.log('📤 Sending response to client:', responseData);
    return res.status(200).json(responseData);
  } catch (error) {
    console.error('❌ Error generating audio:');
    console.error('- Message:', error.message);
    
    if (error.response) {
      console.error('- Status:', error.response.status);
      console.error('- Data:', error.response.data ? JSON.stringify(error.response.data) : 'No response data');
    }
    
    // Check for specific error types
    if (error.message.includes('API key')) {
      return res.status(401).json({
        error: 'API key error',
        details: 'Invalid or missing ElevenLabs API key'
      });
    }
    
    if (error.message.includes('Voice ID')) {
      return res.status(400).json({
        error: 'Invalid voice ID',
        details: error.message
      });
    }
    
    res.status(error.response?.status || 500).json({
      error: 'Failed to generate audio',
      details: error.response?.data || error.message
    });
  }
};

// Export the handler with multer middleware for form data parsing
module.exports = [upload.none(), handler]; 