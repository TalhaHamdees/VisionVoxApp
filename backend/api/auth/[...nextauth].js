// This is a dummy handler for Express to handle NextAuth.js requests
// The actual NextAuth.js implementation is in the frontend

function handler(req, res) {
  return res.status(200).json({ message: 'NextAuth.js API route' });
}

module.exports = handler; 