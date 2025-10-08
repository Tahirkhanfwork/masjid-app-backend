const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { validationResult } = require('express-validator');
const Masjid = require('../models/masjid.model'); 
const db = require('../db');
const sendMail = require('../utils/mailer');
const crypto = require('crypto');

exports.login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;

    const masjid = await Masjid.findByEmail(email);
    if (!masjid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, masjid.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: masjid.id, masjid_name: masjid.name, imam_name: masjid.contact_person_name },
      process.env.JWT_SECRET
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      masjid: {
        id: masjid.id,
        name: masjid.masjid_name,
        imam_name: masjid.imam_name,
        email: masjid.email,
        status: masjid.status
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.logout = async (req, res) => {
  try {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
      return res.status(400).json({ success: false, message: 'Token missing' });
    }

    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) {
      return res.status(400).json({ success: false, message: 'Invalid token' });
    }

    const expiresAt = new Date(decoded.exp * 1000);

    await db.query('INSERT INTO token_blacklist (token, expires_at) VALUES (?, ?)', [
      token,
      expiresAt
    ]);

    return res.json({ success: true, message: 'Logout successful' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const [rows] = await db.query('SELECT id, masjid_name FROM masjids WHERE email = ?', [email]);
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Your email is not in our system' });
    }
    const [masjid] = await db.query('SELECT * FROM masjids WHERE email = ?', [email]);
    if (!masjid[0]) return res.status(404).json({ success: false, message: 'Email not found' });

    const otp = Math.floor(1000 + Math.random() * 9000);
    const expTime = new Date(Date.now() + 10 * 60 * 1000);

    await db.query(
      "INSERT INTO masjids_reset (masjid_id, otp, exp_time, status, created_at) VALUES (?, ?, ?, 'active', NOW())",
      [masjid[0].id, otp, expTime]
    );
    await sendMail(email, 'Forgot Password OTP', `Your OTP is: ${otp}`);
    res.json({ success: true, message: 'OTP sent to email' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const [masjidRows] = await db.query('SELECT id FROM masjids WHERE email = ?', [email]);
    if (!masjidRows.length) {
      return res.status(404).json({ success: false, message: 'Email not found in system' });
    }
    const masjidId = masjidRows[0].id;

    const [otpRows] = await db.query(
      `SELECT * FROM masjids_reset 
       WHERE masjid_id = ? AND status = 'active' 
       ORDER BY created_at DESC LIMIT 1`,
      [masjidId]
    );

    if (!otpRows.length) {
      return res
        .status(400)
        .json({ success: false, message: 'No active OTP found. Please request again.' });
    }

    const latestOtp = otpRows[0];

    const now = new Date();
    if (latestOtp.otp != otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP1' });
    }

    if (new Date(latestOtp.exp_time) < now) {
      return res
        .status(400)
        .json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }

    return res.status(200).json({ success: true, message: 'OTP verified successfully', masjidId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, code, password } = req.body;

    const masjid = await Masjid.findByEmail(email);
    if (!masjid) return res.status(404).json({ success: false, message: 'Email not found' });

    const [rows] = await db.query(
      `SELECT otp, exp_time FROM masjids_reset WHERE masjid_id=? ORDER BY created_at DESC LIMIT 1`,
      [masjid.id]
    );
    if (!rows[0])
      return res.status(400).json({ success: false, message: 'No OTP found. Request again.' });

    const latestOtp = rows[0];
    if (new Date() > new Date(latestOtp.exp_time)) {
      return res.status(400).json({ success: false, message: 'OTP expired. Request new one.' });
    }
    if (parseInt(code) !== latestOtp.otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP2' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(`UPDATE masjids SET password=? WHERE id=?`, [hashedPassword, masjid.id]);

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
