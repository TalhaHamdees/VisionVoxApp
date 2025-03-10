const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const ffmpeg = require('fluent-ffmpeg');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads/videos');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'video-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB limit
  fileFilter: function (req, file, cb) {
    const filetypes = /mp4|mov|avi|mkv|webm/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only video files (mp4, mov, avi, mkv, webm) are allowed!'));
  }
});

// Extract audio from video
async function extractAudio(videoPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .output(outputPath)
      .noVideo()
      .audioCodec('libmp3lame')
      .on('end', () => {
        console.log('Audio extraction completed');
        resolve(outputPath);
      })
      .on('error', (err) => {
        console.error('Error extracting audio:', err);
        reject(err);
      })
      .run();
  });
}

// Generate subtitles using Whisper API
async function generateSubtitles(audioPath, options) {
  return new Promise((resolve, reject) => {
    // In a real implementation, you would call an actual speech-to-text API
    // For now, we'll simulate a response with a timeout
    setTimeout(() => {
      // Sample SRT format
      const srtContent = `1
00:00:01,000 --> 00:00:04,000
Hello and welcome to this video about AI video editing.

2
00:00:04,500 --> 00:00:08,000
Today we're going to explore how artificial intelligence
is transforming the way we create content.

3
00:00:08,500 --> 00:00:12,000
Let's start by looking at some of the key features
that make AI video editors so powerful.`;

      resolve(srtContent);
    }, 3000);
  });
}

// Format subtitles based on user preferences
function formatSubtitles(srtContent, options) {
  // In a real implementation, you would parse the SRT and apply formatting
  // For now, we'll just return the original content
  return srtContent;
}

// API endpoint to generate subtitles
router.post('/generate', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No video file provided' });
    }
    
    const videoPath = req.file.path;
    const audioPath = path.join(__dirname, '../../uploads/audio', path.basename(videoPath, path.extname(videoPath)) + '.mp3');
    const outputDir = path.join(__dirname, '../../uploads/subtitles');
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Parse options
    const options = {
      maxCharsPerLine: parseInt(req.body.maxCharsPerLine || '42'),
      maxLinesPerSub: parseInt(req.body.maxLinesPerSub || '2'),
      style: req.body.style || 'default',
      autoPosition: req.body.autoPosition === 'true',
      translate: req.body.translate === 'true'
    };
    
    console.log('Processing video:', videoPath);
    console.log('Options:', options);
    
    try {
      // Extract audio from video
      await extractAudio(videoPath, audioPath);
      
      // Generate subtitles
      const subtitles = await generateSubtitles(audioPath, options);
      
      // Format subtitles based on user preferences
      const formattedSubtitles = formatSubtitles(subtitles, options);
      
      // Save subtitles to file
      const subtitlePath = path.join(outputDir, path.basename(videoPath, path.extname(videoPath)) + '.srt');
      fs.writeFileSync(subtitlePath, formattedSubtitles);
      
      // Return the result
      res.json({
        success: true,
        videoFile: req.file.filename,
        subtitles: formattedSubtitles,
        subtitleFile: path.basename(subtitlePath)
      });
    } catch (error) {
      console.error('Error processing video:', error);
      res.status(500).json({ success: false, message: 'Error processing video', error: error.message });
    }
  } catch (error) {
    console.error('Error generating subtitles:', error);
    res.status(500).json({ success: false, message: 'Error generating subtitles', error: error.message });
  }
});

// API endpoint to download subtitles
router.get('/download/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../../uploads/subtitles', filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Subtitle file not found' });
    }
    
    res.download(filePath);
  } catch (error) {
    console.error('Error downloading subtitles:', error);
    res.status(500).json({ success: false, message: 'Error downloading subtitles', error: error.message });
  }
});

module.exports = router; 