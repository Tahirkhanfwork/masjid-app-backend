const jwt = require('jsonwebtoken');
const db = require('../db');

exports.authenticate = async (req, res, next) => {
  try {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'No token provided' });

    const [rows] = await db.query('SELECT * FROM token_blacklist WHERE token = ?', [token]);
    if (rows.length > 0) {
      return res
        .status(401)
        .json({ success: false, message: 'Token blacklisted. Please login again.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};
