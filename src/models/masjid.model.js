const db = require('../db');

async function createMasjid({
  masjid_name,
  address,
  pincode,
  imam_name,
  email,
  password,
  qr_file_url,
  status
}) {
  const [result] = await db.execute(
    `INSERT INTO masjids (masjid_name, address, pincode, imam_name, email, password, qr_file_url, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [masjid_name, address, pincode, imam_name, email, password, qr_file_url, status]
  );
  return { id: result.insertId };
}

async function updateQrFileUrl(id, qr_file_url) {
  await db.execute(`UPDATE masjids SET qr_file_url = ? WHERE id = ?`, [qr_file_url, id]);
}
async function findByEmail(email) {
  const [rows] = await db.execute(`SELECT * FROM masjids WHERE email = ? LIMIT 1`, [email]);
  return rows[0];
}

async function findByName(masjid_name) {
  const [rows] = await db.execute(`SELECT * FROM masjids WHERE masjid_name = ? LIMIT 1`, [
    masjid_name
  ]);
  return rows[0];
}

async function findById(id) {
  const [rows] = await db.execute(`SELECT * FROM masjids WHERE id = ? LIMIT 1`, [id]);
  return rows[0];
}

async function listMasjids(limit = 50, offset = 0) {
  const [rows] = await db.execute(
    `SELECT * FROM masjids ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [Number(limit), Number(offset)]
  );
  return rows;
}
async function updateMasjid(id, data) {
  const fields = [];
  const values = [];

  for (const key in data) {
    if (data[key] !== undefined) {
      fields.push(`${key} = ?`);
      values.push(data[key]);
    }
  }

  if (fields.length === 0) return; // nothing to update

  values.push(id);

  const [result] = await db.execute(`UPDATE masjids SET ${fields.join(', ')} WHERE id = ?`, values);

  return result;
}

module.exports = {
  createMasjid,
  updateQrFileUrl,
  findByName,
  findById,
  listMasjids,
  findByEmail,
  updateMasjid
};
