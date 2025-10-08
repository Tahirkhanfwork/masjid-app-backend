const express = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/namazSchedule.controller');

const router = express.Router();
const namazScheduleController = require('../controllers/namazSchedule.controller');
router.post(
  '/',
  [
    body('masjid_id').isInt({ min: 1 }).withMessage('masjid_id must be a positive integer'),

    body('status').isIn(['active', 'inactive']).withMessage('status must be active or inactive'),

    body('namaaz_list').isArray({ min: 1 }).withMessage('namaaz_list must be a non-empty array'),

    body('namaz_name').isString().trim().notEmpty().withMessage('namaz_name is required'),

    body('namaaz_list.*.time')
      .matches(/^([0-1]\d|2[0-3]):([0-5]\d)$/)
      .withMessage('Time must be in HH:MM (24h format)'),

    body('namaaz_list.*.sub_namaaz')
      .isArray({ min: 1 })
      .withMessage('sub_namaaz must be a non-empty array'),

    body('namaaz_list.*.sub_namaaz.*.sub_namaaz_name')
      .notEmpty()
      .withMessage('sub_namaaz_name is required'),

    body('namaaz_list.*.sub_namaaz.*.time')
      .matches(/^([0-1]\d|2[0-3]):([0-5]\d)$/)
      .withMessage('sub_namaaz time must be in HH:MM (24h format)')
  ],
  ctrl.addNamazSchedule
);

router.get('/:masjid_id', namazScheduleController.getNamazSchedulesByMasjid);
module.exports = router;
