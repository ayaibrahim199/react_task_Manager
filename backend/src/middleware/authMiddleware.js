// This file exports a middleware function 'protect' to authenticate users based on a JWT.

// Import the jsonwebtoken library to verify the token.
const jwt = require('jsonwebtoken');
// Import the User model to find the user associated with the token.
const User = require('../models/User');

// The 'protect' middleware function.
const protect = async (req, res, next) => {
    let token;

    // Check if the authorization header exists and starts with 'Bearer'.
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Extract the token from the header (it's the second part after 'Bearer ').
            token = req.headers.authorization.split(' ')[1];

            // Verify the token using the secret key from your environment variables.
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Find the user by the ID stored in the decoded token payload.
            // .select('-password') ensures the password hash is not returned.
            req.user = await User.findById(decoded.id).select('-password');

            // Call the next middleware function in the stack.
            return next();
        } catch (error) {
            // If the token is invalid or expired, return a 401 Unauthorized response.
            return res.status(401).json({ message: 'Not authorized' });
        }
    }

    // If no token is found in the header, return a 401 Unauthorized response.
    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }
};

// Export the middleware function so it can be used in other files (e.g., your routes).
module.exports = protect;

