const clientPromise = require('../lib/mongodb');
const { hash } = require('bcrypt');

// Email validation function
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  return emailRegex.test(email);
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { name, email, password } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Validate email format
    if (!validateEmail(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Connect to database
    const client = await clientPromise;
    const db = client.db("visionvox2");

    // Check if user already exists
    const existingUser = await db.collection("users").findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await hash(password, 10);

    // Create user
    const result = await db.collection("users").insertOne({
      name,
      email,
      password: hashedPassword,
      createdAt: new Date(),
    });

    // Return success without exposing sensitive data
    return res.status(201).json({ 
      message: 'User created successfully',
      userId: result.insertedId.toString()
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

module.exports = handler; 