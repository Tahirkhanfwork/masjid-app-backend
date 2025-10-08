const { validationResult } = require('express-validator');
const NamazSchedule = require('../models/namazSchedule.model');
const NamaazMeta = require('../models/namaazMeta');
const Masjid = require('../models/masjid.model');
const db = require('../db');
exports.addNamazSchedule = async (req, res) => {
  try {
    const { masjid_id, status, namaaz_list } = req.body;

    let createdSchedules = [];

    for (let namaaz of namaaz_list) {
      const schedule = await NamazSchedule.createNamazSchedule({
        masjid_id,
        namaz_name: namaaz.namaz_name.toLowerCase(),
        time: namaaz.time,
        status
      });

      if (namaaz.sub_namaaz && namaaz.sub_namaaz.length > 0) {
        for (let sub of namaaz.sub_namaaz) {
          await NamaazMeta.createMeta({
            masjid_id,
            namaaz_id: schedule.schedule_id,
            sub_namaaz_name: sub.sub_namaaz_name,
            time: sub.time
          });
        }
      }

      createdSchedules.push(schedule);
    }

    res.status(201).json({
      success: true,
      message: 'Namaz schedules created/updated successfully',
      data: createdSchedules
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};


exports.getNamazSchedulesByMasjid = async (req, res) => {
  try {
    const { masjid_id } = req.params;

    if (!masjid_id) {
      return res.status(400).json({ message: 'masjid_id is required' });
    }

    const [rows] = await db.query(
      `
      SELECT 
        ns.schedule_id,
        ns.masjid_id,
        ns.namaz_name,
        ns.time AS schedule_time,
        ns.status,
        nm.id AS meta_id,
        nm.sub_namaaz_name,
        nm.time AS sub_time,
        nm.created_at,
        nm.updated_at
      FROM namaz_schedules ns
      LEFT JOIN namaaz_meta nm 
        ON ns.schedule_id = nm.namaaz_id
      WHERE ns.masjid_id = ?
      ORDER BY ns.time ASC
      `,
      [masjid_id]
    );

    const schedules = rows.reduce((acc, row) => {
      let schedule = acc.find((s) => s.schedule_id === row.schedule_id);
      if (!schedule) {
        schedule = {
          schedule_id: row.schedule_id,
          masjid_id: row.masjid_id,
          namaz_name: row.namaz_name,
          time: row.schedule_time,
          status: row.status,
          sub_namaaz: []
        };
        acc.push(schedule);
      }

      if (row.meta_id) {
        schedule.sub_namaaz.push({
          id: row.meta_id,
          sub_namaaz_name: row.sub_namaaz_name,
          time: row.sub_time,
          created_at: row.created_at,
          updated_at: row.updated_at
        });
      }

      return acc;
    }, []);

    return res.status(200).json({
      masjid_id,
      schedules
    });
  } catch (error) {
    console.error('Error fetching namaz schedules:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
