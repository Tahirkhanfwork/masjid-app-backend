const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const dotenv = require('dotenv');
dotenv.config();

const fs = require('fs');
const path = require('path');
const url = require('url');
const { spawn } = require('child_process');
const ffmpegPath = require('ffmpeg-static');
const WebSocket = require('ws');

const masjidRoutes = require('./routes/masjid.routes');
const errorHandler = require('./middlewares/errorHandler');
const admin = require('./firebase');

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.use('/api/masjids', masjidRoutes);

const hlsRoot = path.join(__dirname, '../hls');
if (!fs.existsSync(hlsRoot)) fs.mkdirSync(hlsRoot);

const listenerTokens = new Set();
const masjidTokenMap = {};

app.post('/register-token', (req, res) => {
  const { token, role, masjidId } = req.body;

  if (!token || !role || !masjidId || masjidId === 'null') {
    console.log(`Invalid registration: token=${token}, role=${role}, masjidId=${masjidId}`);
    return res.status(400).send('Token, role, or masjidId missing/invalid');
  }

  if (!masjidTokenMap[masjidId]) {
    masjidTokenMap[masjidId] = { listeners: new Set(), broadcasters: new Set() };
  }

  if (role === 'listener') {
    masjidTokenMap[masjidId].listeners.add(token);
    listenerTokens.add(token);
    masjidTokenMap[masjidId].broadcasters.delete(token);
    console.log(`Registered listener [${masjidId}]:`, token);
  } else if (role === 'broadcaster') {
    masjidTokenMap[masjidId].broadcasters.add(token);
    listenerTokens.delete(token);
    masjidTokenMap[masjidId].listeners.delete(token);
    console.log(`🎙 Registered broadcaster [${masjidId}]:`, token);
  }

  res.sendStatus(200);
});

async function notifyListeners(tokens, masjidId, payload) {
  if (!masjidId || masjidId === 'null') {
    console.log(`Invalid masjidId in notifyListeners:`, masjidId);
    return;
  }

  if (!tokens.length) {
    console.log(`No listeners registered for masjid ${masjidId}`);
    return;
  }

  try {
    const streamUrl = `${process.env.API_BASE_URL}/hls/${masjidId}/stream.m3u8`;

    const multicastMessages = tokens.map((token) => ({
      token,
      notification: {
        title: '📢 Live Azaan',
        body: 'The azaan is starting now'
      },
      data: {
        masjidId: String(masjidId),
        streamUrl: streamUrl,
        screen: 'Timing',
        status: String(payload.status || 'unknown')
      },
      android: {
        priority: 'high',
        notification: { channelId: 'AzaanChannel', sound: 'default' }
      }
    }));

    await Promise.all(multicastMessages.map((msg) => admin.messaging().send(msg)));

    console.log(`Sent to ${tokens.length} listeners of masjid ${masjidId}`);
  } catch (err) {
    console.error('FCM error:', err);
  }
}

function cleanFolder(folderPath) {
  if (fs.existsSync(folderPath)) {
    fs.readdirSync(folderPath).forEach((file) => {
      fs.unlinkSync(path.join(folderPath, file));
    });
    fs.rmdirSync(folderPath, { recursive: true });
  }
}

app.use('/hls', express.static(hlsRoot));

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`HLS available at http://localhost:${PORT}/hls/{broadcastId}/stream.m3u8`);
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws, req) => {
  const query = url.parse(req.url, true).query;
  const masjidId = query.broadcastId;

  if (!masjidId) {
    console.log('No masjidId provided, closing connection');
    ws.close();
    return;
  }

  console.log(`Broadcaster connected for masjid ${masjidId}`);

  const masjidListeners = masjidTokenMap[masjidId]?.listeners || new Set();
  notifyListeners([...masjidListeners], masjidId, { status: 'broadcasting' });

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
    path.join(broadcasterFolder, 'stream.m3u8')
  ]);

  ffmpeg.stderr.on('data', (data) => {
    console.error(`FFmpeg stderr: ${data}`);
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

const namazScheduleRoutes = require('./routes/namazSchedule.routes');
app.use('/api/namaz-schedules', namazScheduleRoutes);

const userRoutes = require('./routes/user.routes');
app.use('/api/users', userRoutes);

const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);
app.use(errorHandler);

const publicDir = path.join(__dirname, '..', 'public');
const qrDir = path.join(publicDir, 'qr');

if (!fs.existsSync(qrDir)) fs.mkdirSync(qrDir, { recursive: true });

app.use((req, res, next) => {
  if (req.url.startsWith('/public/')) {
    console.log('Public file request:', req.url, 'at', new Date().toISOString());
  }
  next();
});

app.use('/public', express.static(publicDir, {
  dotfiles: 'allow',
  index: false,
  setHeaders: (res, path) => {
    console.log('Serving static file:', path);
  }
}));