const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');
process.env.TZ = 'UTC';
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

module.exports = admin;
