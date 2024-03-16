const jwt = require('jsonwebtoken');

exports.authenticateToken = async (req, res, next) => {
  // Extract the token from the Authorization header
  const tokenHeader = req.headers['authorization'];
  
  if (!tokenHeader) {
    return res.status(401).json({ error: 'Authorization header missing' });
  }

  // Token format: Bearer <token>
  const token = tokenHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Bearer token missing' });
  }

  // Verify the token
  jwt.verify(token, 'jwtsecret', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }

    // Store the user information in the request object for further processing
    console.log("user: ", user);
    req.user = user;
    next();
  });
}
