const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const dotenv = require('dotenv');
dotenv.config();

const path = require('path');
const fs = require('fs');

const errorHandler = require('./middlewares/errorHandler');
const masjidRoutes = require('./routes/masjid.routes');
const namazScheduleRoutes = require('./routes/namazSchedule.routes');
const userRoutes = require('./routes/user.routes');
const authRoutes = require('./routes/authRoutes');

const { setupBroadcasting } = require('./services/broadcastService');

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.use('/api/masjids', masjidRoutes);
app.use('/api/namaz-schedules', namazScheduleRoutes);
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);

const publicDir = path.join(__dirname, '..', 'public');
const qrDir = path.join(publicDir, 'qr');
if (!fs.existsSync(qrDir)) fs.mkdirSync(qrDir, { recursive: true });

app.use('/public', express.static(publicDir));

const hlsRoot = path.join(__dirname, '../hls');
if (!fs.existsSync(hlsRoot)) fs.mkdirSync(hlsRoot);
app.use('/hls', express.static(hlsRoot));

app.use(errorHandler);

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

setupBroadcasting(server);
