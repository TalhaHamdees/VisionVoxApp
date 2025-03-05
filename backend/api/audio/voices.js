const ElevenLabsClient = require('./client');

/**
 * Handler for GET /api/audio/voices
 * Fetches available voices from ElevenLabs API
 */
module.exports = async (req, res) => {
  try {
    const client = new ElevenLabsClient();
    const voices = await client.getVoices();

    // Add George as the first option if not already present
    const hasGeorge = voices.some(voice => voice.voice_id === 'JBFqnCBsd6RMkjVDRZzb');
    if (!hasGeorge) {
      voices.unshift({
        voice_id: 'JBFqnCBsd6RMkjVDRZzb',
        name: 'George',
        category: 'premade',
        description: 'A professional male voice with a neutral accent',
        preview_url: '',
        gender: 'male',
        accent: 'neutral',
        age: 'adult',
        use_case: 'narration'
      });
    }

    res.status(200).json(voices);
  } catch (error) {
    console.error('Error fetching voices:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch voices from ElevenLabs',
      details: error.response?.data || error.message
    });
  }
}; 