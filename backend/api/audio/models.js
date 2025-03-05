const ElevenLabsClient = require('./client');

/**
 * Handler for GET /api/audio/models
 * Fetches available text-to-speech models from ElevenLabs API
 */
module.exports = async (req, res) => {
  try {
    const client = new ElevenLabsClient();
    const models = await client.getModels();

    // Ensure eleven_multilingual_v2 is included and at the top
    const hasMultilingual = models.some(model => model.model_id === 'eleven_multilingual_v2');
    if (!hasMultilingual) {
      models.unshift({
        model_id: 'eleven_multilingual_v2',
        name: 'Eleven Multilingual v2',
        description: 'Latest multilingual model with improved quality and broader language support',
        token_cost_factor: 1.0
      });
    } else {
      // Move it to the top if it exists
      const index = models.findIndex(model => model.model_id === 'eleven_multilingual_v2');
      if (index > 0) {
        const multilingualModel = models.splice(index, 1)[0];
        models.unshift(multilingualModel);
      }
    }

    res.status(200).json(models);
  } catch (error) {
    console.error('Error fetching models:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch models from ElevenLabs',
      details: error.response?.data || error.message
    });
  }
}; 