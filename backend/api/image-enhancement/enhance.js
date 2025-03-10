const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const sharp = require('sharp');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads/images');
    console.log('Upload directory:', uploadDir);
    if (!fs.existsSync(uploadDir)) {
      console.log('Creating upload directory...');
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    console.log('Upload directory exists:', fs.existsSync(uploadDir));
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = 'image-' + uniqueSuffix + path.extname(file.originalname);
    console.log('Generated filename:', filename);
    cb(null, filename);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files (jpeg, jpg, png, webp) are allowed!'));
  }
});

// Helper function to check if an image is low resolution or blurry
async function isLowQualityImage(imagePath) {
  try {
    // Get image metadata
    const metadata = await sharp(imagePath).metadata();
    
    // Check resolution - consider low if width or height is less than 800px
    const isLowResolution = metadata.width < 800 || metadata.height < 800;
    
    // Calculate blurriness using Laplacian variance
    // This would typically be done with OpenCV, but for simplicity we'll use a threshold based on size
    const isLikelyBlurry = metadata.width * metadata.height < 640000; // Less than 800x800
    
    return {
      isLowQuality: isLowResolution || isLikelyBlurry,
      width: metadata.width,
      height: metadata.height,
      reason: isLowResolution ? 'low_resolution' : (isLikelyBlurry ? 'likely_blurry' : 'good_quality')
    };
  } catch (error) {
    console.error('Error analyzing image quality:', error);
    return { isLowQuality: false, reason: 'error_analyzing' };
  }
}

// Enhance image using AI models
async function enhanceImage(inputPath, outputPath, options) {
  return new Promise((resolve, reject) => {
    try {
      console.log('Enhancing image:', inputPath);
      console.log('Output path:', outputPath);
      console.log('Enhancement options:', options);
      
      // Use the ESRGAN Python script to enhance the image
      const pythonScript = path.join(__dirname, '../../ai_models/enhance_with_esrgan.py');
      const pythonVenvPath = path.join(__dirname, '../../ai_env/bin/python');
      
      console.log('Python script path:', pythonScript);
      console.log('Python venv path:', pythonVenvPath);
      console.log('Checking if files exist:');
      console.log('- Python script exists:', fs.existsSync(pythonScript));
      console.log('- Python venv exists:', fs.existsSync(pythonVenvPath));
      
      // Build command arguments
      const args = [
        '--input', inputPath,
        '--output', outputPath
      ];
      
      // Add upscale flag if enabled, otherwise disable it
      if (options.upscale) args.push('--upscale');
      else args.push('--no-upscale');
      
      console.log(`Running Python script with args: ${args.join(' ')}`);
      
      // Spawn Python process using the virtual environment Python
      const pythonProcess = spawn(pythonVenvPath, [pythonScript, ...args], {
        cwd: path.join(__dirname, '../../ai_models')
      });
      
      let stdoutData = '';
      let stderrData = '';
      
      pythonProcess.stdout.on('data', (data) => {
        stdoutData += data.toString();
        console.log(`Python stdout: ${data}`);
      });
      
      pythonProcess.stderr.on('data', (data) => {
        stderrData += data.toString();
        console.error(`Python stderr: ${data}`);
      });
      
      pythonProcess.on('close', (code) => {
        if (code === 0) {
          // Get image metadata to return enhancement details
          sharp(outputPath).metadata()
            .then(metadata => {
              resolve({
                success: true,
                originalImage: `/uploads/images/${path.basename(inputPath)}`,
                enhancedImage: `/uploads/enhanced/${path.basename(outputPath)}`,
                originalSize: {
                  width: metadata.width,
                  height: metadata.height
                },
                enhancedSize: {
                  width: metadata.width,
                  height: metadata.height
                }
              });
            })
            .catch(err => {
              console.error('Error getting enhanced image metadata:', err);
              resolve({
                success: true,
                originalImage: `/uploads/images/${path.basename(inputPath)}`,
                enhancedImage: `/uploads/enhanced/${path.basename(outputPath)}`,
                message: 'Enhancement completed but could not get metadata'
              });
            });
        } else {
          console.error(`Python process exited with code ${code}`);
          reject(new Error(`Enhancement failed: ${stderrData}`));
        }
      });
      
    } catch (error) {
      console.error('Error in enhancement process:', error);
      reject(error);
    }
  });
}

// API endpoint to enhance an image
router.post('/enhance', upload.single('image'), async (req, res) => {
  try {
    console.log('Enhance endpoint called');
    
    // Ensure uploads directories exist
    const imagesDir = path.join(__dirname, '../../uploads/images');
    const enhancedDir = path.join(__dirname, '../../uploads/enhanced');
    
    console.log('Ensuring uploads directories exist:');
    console.log('- Images directory:', imagesDir);
    console.log('- Enhanced directory:', enhancedDir);
    
    if (!fs.existsSync(imagesDir)) {
      console.log('Creating images directory');
      fs.mkdirSync(imagesDir, { recursive: true });
    }
    
    if (!fs.existsSync(enhancedDir)) {
      console.log('Creating enhanced directory');
      fs.mkdirSync(enhancedDir, { recursive: true });
    }
    
    if (!req.file) {
      console.log('No file provided in the request');
      return res.status(400).json({ success: false, message: 'No image file provided' });
    }
    
    console.log('File uploaded:', req.file);
    const inputPath = req.file.path;
    console.log('Input path:', inputPath);
    console.log('Input file exists:', fs.existsSync(inputPath));
    
    const outputDir = path.join(__dirname, '../../uploads/enhanced');
    
    const outputFilename = 'enhanced-' + path.basename(req.file.filename);
    const outputPath = path.join(outputDir, outputFilename);
    
    // Parse enhancement options
    const options = {
      enhancementLevel: parseInt(req.body.enhancementLevel || '50'),
      upscale: req.body.upscale === 'true',
      denoise: req.body.denoise === 'true',
      sharpen: req.body.sharpen === 'true',
      colorCorrection: req.body.colorCorrection === 'true',
      faceEnhancement: req.body.faceEnhancement === 'true'
    };
    
    // Check if the image is low quality
    const qualityCheck = await isLowQualityImage(inputPath);
    
    // Enhance the image
    const enhancementResult = await enhanceImage(inputPath, outputPath, options);
    
    // Return the result
    res.json({
      success: true,
      originalImage: `/uploads/images/${req.file.filename}`,
      enhancedImage: `/uploads/enhanced/${outputFilename}`,
      qualityCheck,
      enhancementResult
    });
    
  } catch (error) {
    console.error('Error enhancing image:', error);
    res.status(500).json({ success: false, message: 'Error enhancing image', error: error.message });
  }
});

// API endpoint to analyze image quality
router.post('/analyze', upload.single('image'), async (req, res) => {
  try {
    console.log('Analyze endpoint called');
    if (!req.file) {
      console.log('No file provided in the request');
      return res.status(400).json({ success: false, message: 'No image file provided' });
    }
    
    console.log('File uploaded:', req.file);
    const inputPath = req.file.path;
    console.log('Input path:', inputPath);
    
    // Check if the image is low quality
    const qualityCheck = await isLowQualityImage(inputPath);
    
    // Return the result
    res.json({
      success: true,
      originalImage: `/uploads/images/${req.file.filename}`,
      qualityCheck
    });
    
  } catch (error) {
    console.error('Error analyzing image:', error);
    res.status(500).json({ success: false, message: 'Error analyzing image', error: error.message });
  }
});

// API endpoint to get a list of images in the processing queue
router.get('/queue', (req, res) => {
  try {
    const queueDir = path.join(__dirname, '../../uploads/queue');
    
    if (!fs.existsSync(queueDir)) {
      fs.mkdirSync(queueDir, { recursive: true });
      return res.json({ success: true, queue: [] });
    }
    
    const files = fs.readdirSync(queueDir)
      .filter(file => /\.(jpg|jpeg|png|webp)$/i.test(file))
      .map(file => {
        const filePath = path.join(queueDir, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          path: `/uploads/queue/${file}`,
          size: stats.size,
          added: stats.mtime
        };
      });
    
    res.json({ success: true, queue: files });
    
  } catch (error) {
    console.error('Error getting queue:', error);
    res.status(500).json({ success: false, message: 'Error getting queue', error: error.message });
  }
});

module.exports = router; 