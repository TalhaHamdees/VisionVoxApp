const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');

// Apply subtitles to video
async function applySubtitlesToVideo(videoPath, subtitlePath, outputPath, style) {
  return new Promise((resolve, reject) => {
    // Determine subtitle styling based on selected style
    let fontStyle = '';
    let fontColor = 'white';
    let fontFile = 'Arial';
    let fontSize = 24;
    let borderWidth = 1;
    let borderColor = 'black';
    let shadowColor = '';
    let shadowOffset = '';
    
    switch (style) {
      case 'minimal':
        borderWidth = 0;
        break;
      case 'bold':
        fontSize = 28;
        fontStyle = 'Bold';
        break;
      case 'shadow':
        shadowColor = 'black@0.5';
        shadowOffset = '2x2';
        borderWidth = 0;
        break;
      case 'outline':
        borderWidth = 2;
        break;
      default: // default style
        break;
    }
    
    // Build the subtitle filter
    let subtitleFilter = `subtitles=${subtitlePath}:force_style='`;
    subtitleFilter += `FontName=${fontFile},FontSize=${fontSize},PrimaryColour=${fontColor}`;
    
    if (fontStyle) {
      subtitleFilter += `,FontStyle=${fontStyle}`;
    }
    
    if (borderWidth > 0) {
      subtitleFilter += `,OutlineColour=${borderColor},Outline=${borderWidth}`;
    }
    
    if (shadowColor && shadowOffset) {
      subtitleFilter += `,ShadowColour=${shadowColor},Shadow=${shadowOffset}`;
    }
    
    subtitleFilter += `'`;
    
    // Apply subtitles to video
    ffmpeg(videoPath)
      .outputOptions([
        '-c:v libx264',
        '-c:a aac',
        '-vf', subtitleFilter
      ])
      .output(outputPath)
      .on('end', () => {
        console.log('Subtitles applied to video');
        resolve(outputPath);
      })
      .on('error', (err) => {
        console.error('Error applying subtitles:', err);
        reject(err);
      })
      .run();
  });
}

// API endpoint to apply subtitles to video
router.post('/apply', async (req, res) => {
  try {
    const { videoFile, subtitleFile, style } = req.body;
    
    if (!videoFile || !subtitleFile) {
      return res.status(400).json({ success: false, message: 'Video file and subtitle file are required' });
    }
    
    const videoPath = path.join(__dirname, '../../uploads/videos', videoFile);
    const subtitlePath = path.join(__dirname, '../../uploads/subtitles', subtitleFile);
    const outputDir = path.join(__dirname, '../../uploads/output');
    
    if (!fs.existsSync(videoPath)) {
      return res.status(404).json({ success: false, message: 'Video file not found' });
    }
    
    if (!fs.existsSync(subtitlePath)) {
      return res.status(404).json({ success: false, message: 'Subtitle file not found' });
    }
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputFilename = 'subtitled-' + videoFile;
    const outputPath = path.join(outputDir, outputFilename);
    
    console.log('Applying subtitles to video:', videoPath);
    console.log('Subtitle file:', subtitlePath);
    console.log('Output path:', outputPath);
    console.log('Style:', style || 'default');
    
    try {
      // Apply subtitles to video
      await applySubtitlesToVideo(videoPath, subtitlePath, outputPath, style || 'default');
      
      // Return the result
      res.json({
        success: true,
        outputFile: outputFilename,
        outputUrl: `/uploads/output/${outputFilename}`
      });
    } catch (error) {
      console.error('Error applying subtitles:', error);
      res.status(500).json({ success: false, message: 'Error applying subtitles', error: error.message });
    }
  } catch (error) {
    console.error('Error applying subtitles:', error);
    res.status(500).json({ success: false, message: 'Error applying subtitles', error: error.message });
  }
});

// API endpoint to stream output video
router.get('/stream/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../../uploads/output', filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Output video not found' });
    }
    
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;
    
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(filePath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4',
      };
      
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
      };
      
      res.writeHead(200, head);
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (error) {
    console.error('Error streaming video:', error);
    res.status(500).json({ success: false, message: 'Error streaming video', error: error.message });
  }
});

module.exports = router; 