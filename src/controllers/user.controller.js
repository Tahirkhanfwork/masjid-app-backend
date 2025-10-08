const { validationResult } = require('express-validator');
const User = require('../models/user.model');

exports.registerUser = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { mobile, status } = req.body;
    let user = await User.findByMobile(mobile);

    if (user) {
      const userMeta = await User.findByUserId(user.user_id);

      return res.status(200).json({
        success: true,
        data: {
          ...user,
          meta: userMeta || null
        }
      });
    }
    const { user_id } = await User.createUser({ mobile, status });
    user = await User.findById(user_id);
    return res.status(201).json({
      success: true,
      data: {
        ...user,
        meta: null
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.addUserMeta = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    const { user_id, masjid_id, status = 'active' } = req.body;
    const user = await User.findById(user_id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const existingMeta = await User.findUserMetaByUserAndMasjid(user_id, masjid_id);
    if (existingMeta) {
      return res
        .status(200)
        .json({ success: true, data: existingMeta, message: 'UserMeta already exists' });
    }
    const { id } = await User.createUserMeta({ user_id, masjid_id, status });
    const created = await User.findUserMetaById(id);
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
};

exports.getMasjidsByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const masjids = await User.findMasjidsByUserId(userId);

    if (!masjids || masjids.length === 0) {
      return res.status(404).json({ message: 'No masjids found for this user' });
    }

    return res.status(200).json({ masjids });
  } catch (err) {
    console.error('Error fetching masjids:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
exports.setActiveMasjid = async (req, res) => {
  try {
    const { user_meta_id, status } = req.body;

    if (!user_meta_id || !status) {
      return res.status(400).json({ message: 'user_meta_id and status are required' });
    }

    if (!['active', 'inactive'].includes(status.toLowerCase())) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const result = await User.setActiveMasjid(user_meta_id, status.toLowerCase());

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'No matching record found' });
    }

    res.json({ message: 'Masjid status updated successfully' });
  } catch (error) {
    console.error('Error updating masjid status:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getMasjidStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const userMeta = await User.getUserMetaStatusById(id);

    if (!userMeta) {
      return res.status(404).json({ message: 'UserMeta not found' });
    }

    return res.json({ id: userMeta.id, status: userMeta.status });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
exports.deleteUserMeta = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: 'userMeta_id is required' });

    const result = await User.deleteUserMetaById(id);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'UserMeta not found' });
    }

    return res.json({ message: 'UserMeta deleted successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
