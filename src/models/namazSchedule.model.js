const db = require('../db');

async function createNamazSchedule({ masjid_id, namaz_name, time, status }) {
  // 1️⃣ Check if schedule already exists
  const [[existing]] = await db.query(
    'SELECT schedule_id FROM namaz_schedules WHERE masjid_id = ? AND namaz_name = ?',
    [masjid_id, namaz_name.toLowerCase()]
  );

  if (existing) {
    // 2️⃣ If exists, update it
    await db.query('UPDATE namaz_schedules SET time = ?, status = ? WHERE schedule_id = ?', [
      time,
      status || 'active',
      existing.schedule_id
    ]);
    return { schedule_id: existing.schedule_id };
  } else {
    // 3️⃣ If not exists, insert new
    const [result] = await db.query(
      'INSERT INTO namaz_schedules (masjid_id, namaz_name, time, status) VALUES (?, ?, ?, ?)',
      [masjid_id, namaz_name.toLowerCase(), time, status || 'active']
    );
    return { schedule_id: result.insertId };
  }
}

async function findById(schedule_id) {
  const [rows] = await db.query('SELECT * FROM namaz_schedules WHERE schedule_id = ? LIMIT 1', [
    schedule_id
  ]);
  return rows[0];
}
async function findOne({ masjid_id, namaz_name }) {
  const [rows] = await db.query(
    'SELECT * FROM namaz_schedules WHERE masjid_id = ? AND namaz_name = ? LIMIT 1',
    [masjid_id, namaz_name]
  );
  return rows[0];
}
async function updateSchedule(schedule_id, { time, status }) {
  await db.query(
    'UPDATE namaz_schedules SET time = ?, status = ?, updated_at = NOW() WHERE schedule_id = ?',
    [time, status, schedule_id]
  );
  return findById(schedule_id);
}

module.exports = {
  createNamazSchedule,
  findById,
  findOne,
  updateSchedule
};
