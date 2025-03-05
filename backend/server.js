const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');
require('dotenv').config();

// Ensure BASE_URL is set for audio URL generation
const BASE_URL = process.env.BASE_URL || '';
console.log(`Server will generate URLs with base: ${BASE_URL || 'No BASE_URL set, using relative paths'}`);

// Import API routes
const registerHandler = require('./api/register');
const loginHandler = require('./api/auth/login');
const nextAuthHandler = require('./api/auth/[...nextauth]');

// Import Audio API routes
const voicesHandler = require('./api/audio/voices');
const modelsHandler = require('./api/audio/models');
const generateAudioHandler = require('./api/audio/generate');
const streamAudioHandler = require('./api/audio/stream');
const mergeAudioHandler = require('./api/audio/merge');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.post('/api/register', registerHandler);
app.post('/api/auth/login', loginHandler);

// Handle NextAuth.js requests
app.use('/api/auth', (req, res) => {
  return nextAuthHandler(req, res);
});

// Audio API Routes
app.get('/api/audio/voices', voicesHandler);
app.get('/api/audio/models', modelsHandler);
app.post('/api/audio/generate', generateAudioHandler);
app.post('/api/audio/script-to-audio/:sessionId', generateAudioHandler);
app.get('/api/audio/stream/:filename', streamAudioHandler);
app.post('/api/audio/merge', mergeAudioHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 