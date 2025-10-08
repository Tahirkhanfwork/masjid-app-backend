const { body } = require('express-validator');

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;

exports.addNamazScheduleRules = [
  body('masjid_id')
    .exists()
    .withMessage('masjid_id is required')
    .isInt({ min: 1 })
    .withMessage('masjid_id must be a positive integer')
    .toInt(),

  body('namaz_name')
    .exists()
    .withMessage('namaz_name is required')
    .isString()
    .withMessage('namaz_name must be a string')
    .trim()
    .notEmpty()
    .withMessage('namaz_name cannot be empty'),

  body('time')
    .exists()
    .withMessage('time is required')
    .bail()
    .matches(timeRegex)
    .withMessage('Time must be HH:MM or HH:MM:SS (24h format)')
    .customSanitizer((v) => (v.length === 5 ? `${v}:00` : v)),

  body('status')
    .optional()
    .isIn(['active', 'inactive'])
    .withMessage('status must be active or inactive')
    .default('active')
];
