const fs = require('fs');
const path = require('path');
const url = require('url');
const { spawn } = require('child_process');
const ffmpegPath = require('ffmpeg-static');
const WebSocket = require('ws');
const admin = require('../firebase');
const db = require('../db');

const hlsRoot = path.join(__dirname, '../../hls');
if (!fs.existsSync(hlsRoot)) fs.mkdirSync(hlsRoot);

function cleanFolder(folderPath) {
  if (fs.existsSync(folderPath)) {
    fs.readdirSync(folderPath).forEach((file) => {
      fs.unlinkSync(path.join(folderPath, file));
    });
    fs.rmdirSync(folderPath, { recursive: true });
  }
}

async function notifyListeners(masjidId, payload) {
  if (!masjidId || masjidId === 'null') {
    console.log(`Invalid masjidId in notifyListeners:`, masjidId);
    return;
  }

  try {
    const [rows] = await db.query(`
      SELECT u.fcm_token
      FROM user_meta um
      JOIN users u ON um.user_id = u.user_id
      WHERE um.masjid_id = ? AND u.fcm_token IS NOT NULL
    `, [masjidId]);

    const tokens = rows.map((r) => r.fcm_token).filter(Boolean);

    if (!tokens.length) {
      console.log(`No listeners found for masjid ${masjidId}`);
      return;
    }

    const streamUrl = `${process.env.API_BASE_URL}/hls/${masjidId}/stream.m3u8`;
    const messages = tokens.map((token) => ({
      token,
      notification: {
        title: '📢 Live Azaan',
        body: 'The azaan is starting now',
      },
      data: {
        masjidId: String(masjidId),
        streamUrl,
        screen: 'Timing',
        status: String(payload.status || 'unknown'),
      },
      android: {
        priority: 'high',
        notification: { channelId: 'AzaanChannel', sound: 'default' },
      },
    }));

    await Promise.all(messages.map((msg) => admin.messaging().send(msg)));

    console.log(`Sent notifications to ${tokens.length} listeners of masjid ${masjidId}`);
  } catch (err) {
    console.error('FCM error:', err);
  }
}

function setupBroadcasting(server) {
  const wss = new WebSocket.Server({ server });

  wss.on('connection', async (ws, req) => {
    const query = url.parse(req.url, true).query;
    const masjidId = query.broadcastId;

    if (!masjidId) {
      console.log('No masjidId provided, closing connection');
      ws.close();
      return;
    }

    console.log(`Broadcaster connected for masjid ${masjidId}`);
    await notifyListeners(masjidId, { status: 'broadcasting' });

    const broadcasterFolder = path.join(hlsRoot, masjidId);
    if (!fs.existsSync(broadcasterFolder)) {
      fs.mkdirSync(broadcasterFolder, { recursive: true });
    }

    const ffmpeg = spawn(ffmpegPath, [
      '-f',
      's16le',
      '-ar',
      '16000',
      '-ac',
      '1',
      '-i',
      'pipe:0',
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      '-f',
      'hls',
      '-hls_time',
      '1',
      '-hls_list_size',
      '1',
      '-hls_flags',
      'delete_segments+omit_endlist',
      path.join(broadcasterFolder, 'stream.m3u8'),
    ]);

    ffmpeg.stderr.on('data', (data) => {
    //   console.error(`FFmpeg stderr: ${data}`);
    });

    ffmpeg.on('close', (code) => {
      console.log(`FFmpeg exited with code ${code}`);
    });

    ws.on('message', (message) => {
      if (Buffer.isBuffer(message)) {
        ffmpeg.stdin.write(message);
      }
    });

    ws.on('close', () => {
      console.log(`Broadcaster disconnected: ${masjidId}`);
      ffmpeg.stdin.end();
      ffmpeg.kill('SIGINT');
      cleanFolder(broadcasterFolder);
    });
  });
}

module.exports = {
  setupBroadcasting,
  notifyListeners,
};
