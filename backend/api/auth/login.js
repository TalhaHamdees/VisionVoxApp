const clientPromise = require('../../lib/mongodb');
const { compare } = require('bcrypt');

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Connect to database
    const client = await clientPromise;
    const db = client.db("visionvox2");

    // Find user
    const user = await db.collection("users").findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Verify password
    const passwordMatch = await compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Handle both name and username fields for backward compatibility
    const userName = user.name || user.username || 'User';
    
    // Return user data (excluding password)
    return res.status(200).json({
      id: user._id.toString(),
      name: userName,
      email: user.email,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

module.exports = handler; 