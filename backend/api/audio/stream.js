const fs = require('fs');
const path = require('path');

/**
 * Handler for GET /api/audio/stream/:filename
 * Streams an audio file to the client
 */
module.exports = async (req, res) => {
  console.log('📣 Received audio streaming request');
  console.log('- Request URL:', req.url);
  console.log('- Requested filename:', req.params.filename);
  
  try {
    const { filename } = req.params;
    
    // Validate filename to prevent directory traversal
    if (!filename || filename.includes('..') || filename.includes('/')) {
      console.error('❌ Invalid filename requested:', filename);
      return res.status(400).json({ error: 'Invalid filename' });
    }
    
    const audioPath = path.join(__dirname, '../../audio-output', filename);
    console.log('- Audio file path:', audioPath);
    console.log('- Checking if file exists at:', audioPath);
    
    // Check if file exists
    if (!fs.existsSync(audioPath)) {
      console.error('❌ Audio file not found:', audioPath);
      // List files in the directory to help debug
      try {
        const audioDir = path.join(__dirname, '../../audio-output');
        console.log('- Files in audio directory:', fs.readdirSync(audioDir));
      } catch (dirError) {
        console.error('- Error listing audio directory:', dirError.message);
      }
      return res.status(404).json({ error: 'Audio file not found' });
    }
    
    // Get file stats
    const stat = fs.statSync(audioPath);
    const fileSize = stat.size;
    console.log('- File size:', fileSize, 'bytes');
    
    // Check if file is empty
    if (fileSize === 0) {
      console.error('❌ Audio file is empty (0 bytes):', audioPath);
      return res.status(500).json({ error: 'Audio file is empty' });
    }
    
    // Set headers
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', fileSize);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    console.log('- Headers set for streaming');
    
    // Stream the file
    const stream = fs.createReadStream(audioPath);
    
    // Handle stream errors
    stream.on('error', (err) => {
      console.error('❌ Error streaming file:', err.message);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to stream audio file', details: err.message });
      } else {
        res.end();
      }
    });
    
    // Log when streaming is complete
    stream.on('end', () => {
      console.log('✅ Audio streaming completed for:', filename);
    });
    
    console.log('- Starting stream...');
    stream.pipe(res);
  } catch (error) {
    console.error('❌ Error streaming audio:', error.message);
    console.error('- Stack:', error.stack);
    res.status(500).json({ error: 'Failed to stream audio file', details: error.message });
  }
}; 