const db = require('../db');

async function findOne({ masjid_id, namaaz_id, sub_namaaz_name }) {
  const [rows] = await db.query(
    'SELECT * FROM namaaz_meta WHERE masjid_id = ? AND namaaz_id = ? AND sub_namaaz_name = ? LIMIT 1',
    [masjid_id, namaaz_id, sub_namaaz_name]
  );
  return rows[0];
}

async function createMeta({ masjid_id, namaaz_id, sub_namaaz_name, time }) {
  // 1️⃣ Check if meta already exists
  const [[existing]] = await db.query(
    'SELECT id FROM namaaz_meta WHERE masjid_id = ? AND namaaz_id = ? AND sub_namaaz_name = ?',
    [masjid_id, namaaz_id, sub_namaaz_name]
  );

  if (existing) {
    // 2️⃣ If exists, update it
    await db.query('UPDATE namaaz_meta SET time = ?, updated_at = NOW() WHERE id = ?', [
      time,
      existing.id
    ]);
    return { id: existing.id };
  } else {
    // 3️⃣ If not exists, insert new
    const [result] = await db.query(
      'INSERT INTO namaaz_meta (masjid_id, namaaz_id, sub_namaaz_name, time, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
      [masjid_id, namaaz_id, sub_namaaz_name, time]
    );
    return { id: result.insertId };
  }
}

async function updateMeta(id, { time }) {
  await db.query('UPDATE namaaz_meta SET time = ?, updated_at = NOW() WHERE id = ?', [time, id]);
  return findById(id);
}

async function findById(id) {
  const [rows] = await db.query('SELECT * FROM namaaz_meta WHERE id = ? LIMIT 1', [id]);
  return rows[0];
}

module.exports = {
  findOne,
  createMeta,
  updateMeta,
  findById
};
