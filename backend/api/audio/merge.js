const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const ffmpeg = require('fluent-ffmpeg');

// Directory for storing audio files
const AUDIO_OUTPUT_DIR = process.env.AUDIO_OUTPUT_DIR || path.join(__dirname, '../../audio-output');
const BASE_URL = process.env.BASE_URL || '';

/**
 * Handler for merging multiple audio files into a single file
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function handler(req, res) {
  console.log('Merge request received:', req.body);
  
  const { audioUrls, voiceId } = req.body;
  
  if (!audioUrls || !Array.isArray(audioUrls) || audioUrls.length === 0) {
    return res.status(400).json({ error: 'Invalid or empty audioUrls array' });
  }
  
  // Create a temporary directory for downloaded files
  const tempDir = path.join(AUDIO_OUTPUT_DIR, 'temp', uuidv4());
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  try {
    console.log(`Starting download of ${audioUrls.length} audio files`);
    
    // Download all audio files
    const downloadedFiles = [];
    for (let i = 0; i < audioUrls.length; i++) {
      const url = audioUrls[i];
      console.log(`Processing file ${i + 1}/${audioUrls.length}: ${url}`);
      
      try {
        // Check if this is a local file path (starts with /api/audio/stream/)
        if (url.startsWith('/api/audio/stream/')) {
          const filename = url.split('/').pop();
          const sourcePath = path.join(AUDIO_OUTPUT_DIR, filename);
          const destPath = path.join(tempDir, `chunk_${i}.mp3`);
          
          console.log(`Copying local file from ${sourcePath} to ${destPath}`);
          
          if (fs.existsSync(sourcePath)) {
            fs.copyFileSync(sourcePath, destPath);
            const stats = fs.statSync(destPath);
            if (stats.size > 0) {
              downloadedFiles.push(destPath);
              console.log(`Copied file ${i + 1}: ${destPath} (${stats.size} bytes)`);
            } else {
              console.error(`Copied file ${i + 1} is empty: ${destPath}`);
            }
          } else {
            console.error(`Source file does not exist: ${sourcePath}`);
          }
        } else {
          // Handle remote URLs
          const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;
          console.log(`Downloading remote file: ${fullUrl}`);
          
          const response = await axios.get(fullUrl, { responseType: 'arraybuffer' });
          
          const filePath = path.join(tempDir, `chunk_${i}.mp3`);
          fs.writeFileSync(filePath, response.data);
          
          // Verify file was downloaded successfully
          const stats = fs.statSync(filePath);
          if (stats.size > 0) {
            downloadedFiles.push(filePath);
            console.log(`Downloaded file ${i + 1}: ${filePath} (${stats.size} bytes)`);
          } else {
            console.error(`Downloaded file ${i + 1} is empty: ${filePath}`);
          }
        }
      } catch (error) {
        console.error(`Error processing file ${i + 1}:`, error.message);
      }
    }
    
    if (downloadedFiles.length === 0) {
      throw new Error('No audio files were successfully downloaded');
    }
    
    // Create a merged filename with the voice ID if available
    const mergedFilename = `merged_${voiceId || 'audio'}_${uuidv4()}.mp3`;
    const outputPath = path.join(AUDIO_OUTPUT_DIR, mergedFilename);
    
    console.log(`Merging ${downloadedFiles.length} files into ${outputPath}`);
    
    // Create a file list for ffmpeg
    const fileListPath = path.join(tempDir, 'filelist.txt');
    const fileListContent = downloadedFiles.map(file => `file '${file}'`).join('\n');
    fs.writeFileSync(fileListPath, fileListContent);
    
    // Return a promise for the ffmpeg merge operation
    return new Promise((resolve, reject) => {
      console.log('Starting ffmpeg merge operation');
      console.log('File list content:', fileListContent);
      console.log('Output path:', outputPath);
      
      ffmpeg()
        .input(fileListPath)
        .inputOptions(['-f', 'concat', '-safe', '0'])
        .outputOptions('-c copy')
        .output(outputPath)
        .on('start', (commandLine) => {
          console.log('FFmpeg command:', commandLine);
        })
        .on('progress', (progress) => {
          console.log('FFmpeg progress:', progress);
        })
        .on('end', () => {
          console.log('Merge completed successfully');
          
          // Verify the merged file exists and has content
          const stats = fs.statSync(outputPath);
          console.log(`Merged file size: ${stats.size} bytes`);
          
          // Clean up temp directory
          try {
            downloadedFiles.forEach(file => fs.unlinkSync(file));
            fs.unlinkSync(fileListPath);
            fs.rmdirSync(tempDir);
          } catch (cleanupError) {
            console.error('Error during cleanup:', cleanupError);
          }
          
          // Generate URL for the merged file
          const audioUrl = `/api/audio/stream/${mergedFilename}`;
          
          resolve(res.status(200).json({
            url: audioUrl,
            size: stats.size
          }));
        })
        .on('error', (err) => {
          console.error('Error during ffmpeg merge:', err);
          
          // Fallback to manual concatenation if ffmpeg fails
          try {
            console.log('Attempting fallback merge method...');
            const mergedBuffer = Buffer.concat(
              downloadedFiles.map(file => fs.readFileSync(file))
            );
            
            fs.writeFileSync(outputPath, mergedBuffer);
            
            const stats = fs.statSync(outputPath);
            console.log(`Fallback merge completed. File size: ${stats.size} bytes`);
            
            // Clean up temp directory
            try {
              downloadedFiles.forEach(file => fs.unlinkSync(file));
              fs.unlinkSync(fileListPath);
              fs.rmdirSync(tempDir);
            } catch (cleanupError) {
              console.error('Error during cleanup:', cleanupError);
            }
            
            // Generate URL for the merged file
            const audioUrl = `/api/audio/stream/${mergedFilename}`;
            
            resolve(res.status(200).json({
              url: audioUrl,
              size: stats.size,
              method: 'fallback'
            }));
          } catch (fallbackError) {
            console.error('Fallback merge failed:', fallbackError);
            reject(fallbackError);
          }
        })
        .run();
    }).catch(error => {
      console.error('Merge operation failed:', error);
      return res.status(500).json({ error: 'Failed to merge audio files', details: error.message });
    });
    
  } catch (error) {
    console.error('Error in merge handler:', error);
    
    // Clean up temp directory if it exists
    if (fs.existsSync(tempDir)) {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (cleanupError) {
        console.error('Error cleaning up temp directory:', cleanupError);
      }
    }
    
    return res.status(500).json({ error: 'Failed to merge audio files', details: error.message });
  }
}

module.exports = handler; 