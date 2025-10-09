const db = require('../db');

async function createUser({ mobile, status = 'active' }) {
  const [result] = await db.execute(`INSERT INTO users (mobile, status) VALUES (?, ?)`, [
    mobile,
    status
  ]);
  return { user_id: result.insertId };
}

async function findById(user_id) {
  const [rows] = await db.execute(`SELECT * FROM users WHERE user_id = ? LIMIT 1`, [user_id]);
  return rows[0];
}

async function createUserMeta({ user_id, masjid_id, status = 'active' }) {
  const [result] = await db.execute(
    `INSERT INTO user_meta (user_id, masjid_id, status, updated_at) VALUES (?, ?, ?, NOW())`,
    [user_id, masjid_id, status]
  );

  return { id: result.insertId };
}

async function findUserMetaById(id) {
  const [rows] = await db.execute(`SELECT * FROM user_meta WHERE id = ? LIMIT 1`, [id]);
  return rows[0];
}
async function findByMobile(mobile) {
  const [rows] = await db.query('SELECT * FROM users WHERE mobile = ?', [mobile]);
  return rows[0] || null;
}

async function findByUserId(userId) {
  const [rows] = await db.query(
    'SELECT * FROM user_meta WHERE user_id = ? AND status = "active" ORDER BY updated_at DESC LIMIT 1',
    [userId]
  );
  return rows.length > 0 ? rows[0] : null;
}

async function findMasjidsByUserId(userId) {
  const sql = `
      SELECT um.id as usermeta_id,m.id, m.masjid_name, m.email, m.address, m.imam_name, 
             m.qr_file_url, m.pincode, m.status, 
             um.status as user_status, um.created_at as joined_at
      FROM user_meta um
      INNER JOIN masjids m ON um.masjid_id = m.id
      WHERE um.user_id = ?
    `;
  const [rows] = await db.query(sql, [userId]);
  return rows;
}
async function setActiveMasjid(userMetaId, status) {
  const [[userMetaRow]] = await db.query(
    `SELECT user_id FROM user_meta WHERE id = ?`,
    [userMetaId]
  );

  if (!userMetaRow) {
    throw new Error('UserMeta not found');
  }

  const userId = userMetaRow.user_id;

  await db.query(
    `UPDATE user_meta
     SET status = ?, updated_at = NOW()
     WHERE id = ?`,
    [status, userMetaId]
  );

  if (status === 'active') {
    await db.query(
      `UPDATE user_meta
       SET status = 'inactive', updated_at = NOW()
       WHERE user_id = ? AND id != ?`,
      [userId, userMetaId]
    );
  }

  return { success: true };
}

async function getUserMetaStatusById(userMetaId) {
  const sql = `SELECT id, status FROM user_meta WHERE id = ?`;
  const [rows] = await db.query(sql, [userMetaId]);
  return rows.length ? rows[0] : null;
}

async function deleteUserMetaById(userMetaId) {
  const sql = `DELETE FROM user_meta WHERE id = ?`;
  const [result] = await db.query(sql, [userMetaId]);
  return result;
}
async function findUserMetaByUserAndMasjid(userId, masjidId) {
  const [rows] = await db.query(
    'SELECT * FROM user_meta WHERE user_id = ? AND masjid_id = ? LIMIT 1',
    [userId, masjidId]
  );
  return rows.length > 0 ? rows[0] : null;
}

async function updateFcmToken(user_id, fcm_token) {
  const query = 'UPDATE users SET fcm_token = ? WHERE user_id = ?';
  const [result] = await db.execute(query, [fcm_token, user_id]);
  return result;
}
module.exports = {
  createUser,
  findById,
  createUserMeta,
  findUserMetaById,
  findByMobile,
  findByUserId,
  findMasjidsByUserId,
  setActiveMasjid,
  getUserMetaStatusById,
  deleteUserMetaById,
  findUserMetaByUserAndMasjid,
  updateFcmToken
};
