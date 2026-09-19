const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const os = require('os');
const fs = require('fs');
const cors = require('cors');
const multer = require('multer');
const qrcode = require('qrcode');

const PORT = process.env.PORT || 3000;
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
  maxHttpBufferSize: 50 * 1024 * 1024 // 50 MB buffer for offline file transfers
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure required directories exist
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// Local JSON Database initialization
const defaultDb = {
  rooms: [
    { id: 'general', name: 'General Chat', description: 'Main public channel for everyone', isDefault: true },
    { id: 'media-share', name: 'Files & Media', description: 'Share photos, voice notes, and documents', isDefault: true },
    { id: 'offline-hub', name: 'Offline Hub', description: 'Local network & Bluetooth chatter', isDefault: true }
  ],
  messages: []
};

let saveTimeout = null;
let db = null;

function loadDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading db.json, creating new store:', err.message);
  }
  const initial = JSON.parse(JSON.stringify(defaultDb));
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing initial db.json:', err.message);
  }
  return initial;
}

db = loadDb();

function saveDb(data = db) {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      console.error('Error saving db.json:', err.message);
    }
  }, 300);
}

// Multer Storage Configuration for Offline File & Voice Sharing
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${base}-${uniqueSuffix}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit over local Wi-Fi
});

// Network Interface Detection (Wi-Fi, Ethernet, Bluetooth PAN)
function getNetworkInterfaces() {
  const nets = os.networkInterfaces();
  const results = {
    wifiOrLan: [],
    bluetooth: [],
    localhost: `http://localhost:${PORT}`
  };

  for (const name of Object.keys(nets)) {
    const isBluetooth = /bluetooth|bthpan|bt/i.test(name);
    for (const net of nets[name]) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (net.family === 'IPv4' && !net.internal) {
        const item = {
          name,
          address: net.address,
          url: `http://${net.address}:${PORT}`,
          type: isBluetooth ? 'Bluetooth' : (/wi-?fi|wlan/i.test(name) ? 'Wi-Fi' : 'LAN / Ethernet')
        };
        if (isBluetooth) {
          results.bluetooth.push(item);
        } else {
          results.wifiOrLan.push(item);
        }
      }
    }
  }
  return results;
}

// API Routes
app.get('/api/network-info', async (req, res) => {
  try {
    const interfaces = getNetworkInterfaces();
    const primary = interfaces.wifiOrLan[0] || interfaces.bluetooth[0] || { url: interfaces.localhost, address: 'localhost', type: 'Local' };
    
    // Generate QR Code data URL for primary LAN address
    const primaryQr = await qrcode.toDataURL(primary.url, { width: 300, margin: 2 });
    
    // Generate QR Codes for Bluetooth if present
    const bluetoothQrList = [];
    for (const bt of interfaces.bluetooth) {
      const qr = await qrcode.toDataURL(bt.url, { width: 300, margin: 2 });
      bluetoothQrList.push({ ...bt, qr });
    }

    res.json({
      port: PORT,
      primary,
      primaryQr,
      wifiOrLan: interfaces.wifiOrLan,
      bluetooth: bluetoothQrList,
      localhost: interfaces.localhost
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/rooms', (req, res) => {
  res.json(db.rooms);
});

app.get('/api/messages/:room', (req, res) => {
  const room = req.params.room;
  const messages = db.messages.filter(m => m.room === room || m.room === 'general').slice(-100);
  res.json(messages);
});

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({
    success: true,
    url: fileUrl,
    filename: req.file.filename,
    originalname: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size
  });
});

// Socket.IO State
const connectedUsers = new Map(); // socket.id => user object

function getOnlineUsers() {
  const users = [];
  connectedUsers.forEach((user, socketId) => {
    users.push({ ...user, socketId });
  });
  return users;
}

io.on('connection', (socket) => {
  console.log(`[Socket Connected] ID: ${socket.id}`);

  socket.on('user:join', (userData) => {
    const user = {
      id: userData.id || socket.id,
      username: userData.username || 'Anonymous',
      avatar: userData.avatar || '#3b82f6',
      deviceType: userData.deviceType || 'desktop',
      room: userData.room || 'general',
      joinedAt: Date.now()
    };
    connectedUsers.set(socket.id, user);
    socket.join(user.room);

    // Send room message history
    const roomMessages = db.messages.filter(m => m.room === user.room).slice(-80);
    socket.emit('message:history', roomMessages);

    // Broadcast updated user list
    io.emit('users:update', getOnlineUsers());

    // Broadcast system notification
    const joinNotice = {
      id: 'sys-' + Date.now(),
      room: user.room,
      sender: 'System',
      senderId: 'system',
      text: `${user.username} connected (${user.deviceType})`,
      timestamp: Date.now(),
      isSystem: true
    };
    io.to(user.room).emit('message:new', joinNotice);
  });

  socket.on('room:join', ({ room }) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;
    
    socket.leave(user.room);
    user.room = room;
    socket.join(room);

    // Send room history
    const roomMessages = db.messages.filter(m => m.room === room).slice(-80);
    socket.emit('message:history', roomMessages);
    io.emit('users:update', getOnlineUsers());
  });

  socket.on('room:create', ({ name, description }) => {
    const id = name.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    const existing = db.rooms.find(r => r.id === id);
    if (!existing) {
      const newRoom = { id, name, description: description || '', isDefault: false, createdAt: Date.now() };
      db.rooms.push(newRoom);
      saveDb();
      io.emit('room:created', newRoom);
    }
  });

  socket.on('user:typing', ({ room, isTyping }) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;
    socket.to(room).emit('user:typing', {
      username: user.username,
      isTyping
    });
  });

  socket.on('message:send', (msgData) => {
    const user = connectedUsers.get(socket.id);
    const message = {
      id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      room: msgData.room || (user ? user.room : 'general'),
      sender: user ? user.username : (msgData.sender || 'Anonymous'),
      senderId: user ? user.id : socket.id,
      avatar: user ? user.avatar : '#3b82f6',
      text: msgData.text || '',
      file: msgData.file || null,       // { url, originalname, mimetype, size }
      voice: msgData.voice || null,     // { url, duration }
      timestamp: Date.now()
    };

    // Store in db
    db.messages.push(message);
    if (db.messages.length > 5000) db.messages.splice(0, 500); // keep recent 4500
    saveDb();

    // Broadcast to the room
    io.to(message.room).emit('message:new', message);
  });

  socket.on('private:message', (data) => {
    const sender = connectedUsers.get(socket.id);
    const message = {
      id: 'pm-' + Date.now(),
      sender: sender ? sender.username : 'Anonymous',
      senderId: sender ? sender.id : socket.id,
      recipientId: data.recipientId,
      text: data.text,
      timestamp: Date.now(),
      isPrivate: true
    };

    // Send to recipient and echo to sender
    socket.to(data.recipientSocketId).emit('private:message', message);
    socket.emit('private:message', message);
  });

  socket.on('disconnect', () => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      connectedUsers.delete(socket.id);
      io.emit('users:update', getOnlineUsers());
      io.to(user.room).emit('message:new', {
        id: 'sys-' + Date.now(),
        room: user.room,
        sender: 'System',
        senderId: 'system',
        text: `${user.username} disconnected`,
        timestamp: Date.now(),
        isSystem: true
      });
    }
  });
});

// Start Server & Print Offline Access Details
server.listen(PORT, '0.0.0.0', async () => {
  console.clear();
  console.log('===========================================================');
  console.log('       OFFLINE REAL-TIME CHAT SERVER IS ACTIVE             ');
  console.log('===========================================================');
  console.log(`Local Access:        http://localhost:${PORT}`);

  const interfaces = getNetworkInterfaces();
  
  if (interfaces.wifiOrLan.length > 0) {
    console.log('\n[WI-FI / LOCAL NETWORK ACCESS]');
    interfaces.wifiOrLan.forEach(item => {
      console.log(`  - ${item.type} (${item.name}): ${item.url}`);
    });
  }

  if (interfaces.bluetooth.length > 0) {
    console.log('\n[BLUETOOTH TETHERING / PAN ACCESS]');
    interfaces.bluetooth.forEach(item => {
      console.log(`  - Bluetooth (${item.name}): ${item.url}`);
    });
  } else {
    console.log('\n[BLUETOOTH MODE]');
    console.log('  - Web Bluetooth API (BLE Direct) is available directly in the browser UI!');
    console.log('  - Tip: Pair your phone/PC via Bluetooth Tethering to get a direct Bluetooth IP.');
  }

  // Print Terminal QR Code for primary network address
  const primary = interfaces.wifiOrLan[0] || interfaces.bluetooth[0];
  if (primary) {
    console.log(`\nScan with Phone Camera on same Wi-Fi / Hotspot: (${primary.url})`);
    try {
      const terminalQr = await qrcode.toString(primary.url, { type: 'terminal', small: true });
      console.log(terminalQr);
    } catch (e) {
      // Ignore QR render errors on unsupported consoles
    }
  }

  console.log('===========================================================');
  console.log('Chat data is stored locally in ./data/db.json (100% Offline)');
  console.log('===========================================================\n');
});
