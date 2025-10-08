const express = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/user.controller');

const router = express.Router();

router.post(
  '/',
  [
    body('mobile')
      .notEmpty()
      .withMessage('Mobile number is required')
      .isLength({ max: 15 })
      .withMessage('Mobile number must be at most 15 characters')
      .matches(/^\+?\d+$/)
      .withMessage('Mobile number must contain only digits and optional +'),
    body('status').optional().isIn(['active', 'inactive']).withMessage('Invalid status')
  ],
  ctrl.registerUser
);

router.post(
  '/meta',
  [
    body('user_id').isInt().withMessage('User ID must be an integer'),
    body('masjid_id').isInt().withMessage('Masjid ID must be an integer'),
    body('status').optional().isIn(['active', 'Inactive']).withMessage('Invalid status')
  ],
  ctrl.addUserMeta
);

router.get('/:userId/masjids', ctrl.getMasjidsByUser);
router.post('/set-active-masjid', ctrl.setActiveMasjid);
router.get('/user-meta/:id/status', ctrl.getMasjidStatus);
router.delete('/user-meta/:id', ctrl.deleteUserMeta);
module.exports = router;
