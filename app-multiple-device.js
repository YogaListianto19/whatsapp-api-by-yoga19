const fs = require('fs');
const { Client, Location, MessageMedia } = require('whatsapp-web.js');
const socketIo = require('socket.io');
const express = require('express');
const qrcode = require('qrcode');
const http = require('http');
const { response } = require('express');
const { phoneNumberFormatter } = require('./helpers/formatter');
const port = process.env.PORT || 3042;

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Express JS
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Memanggil index.html
app.get('/', (req, res) => {
  res.sendFile('index-for-multiple.html', { root: __dirname });
});

const sessions = [];
const SESSIONS_FILE = './whatsapp-sessions.json';

const setSessionsFile = (sessions) => {
  fs.writeFile(SESSIONS_FILE, JSON.stringify(sessions), (err) => {
    if (err) {
      console.log(err);
    }
  });
};

const getSessionsFile = () => {
  return JSON.parse(fs.readFileSync(SESSIONS_FILE));
};

const createSession = (id, description) => {
  console.log('Creating Session: ' + id);
  // Membuat session WA agar tidak Scan QR terus
  const SESSION_FILE_PATH = `./whatsapp-session-${id}.json`;
  let sessionCfg;
  if (fs.existsSync(SESSION_FILE_PATH)) {
    sessionCfg = require(SESSION_FILE_PATH);
  }

  const client = new Client({
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process', // <- this one doesn't works in Windows
        '--disable-gpu',
      ],
    },
    session: sessionCfg,
  });

  client.initialize();

  client.on('qr', (qr) => {
    // Generate and scan this code with your phone
    console.log('QR RECEIVED', qr);
    qrcode.toDataURL(qr, (err, url) => {
      io.emit('qr', { id: id, src: url });
      io.emit('message', { id: id, text: 'QR Code received, scan please!' });
    });
  });

  client.on('ready', () => {
    io.emit('ready', { id: id });
    io.emit('message', { id: id, text: 'WhatsApp is Ready!' });

    const savedSessions = getSessionsFile();
    const sessionIndex = savedSessions.findIndex((sess) => sess.id == id);
    savedSessions[sessionIndex].ready = true;
    setSessionsFile(savedSessions);
  });

  client.on('authenticated', (session) => {
    io.emit('authenticated', { id: id });
    io.emit('message', { id: id, text: 'Whatsapp is authenticated!' });
    sessionCfg = session;
    fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function (err) {
      if (err) {
        console.error(err);
      }
    });
  });

  client.on('auth_failure', (session) => {
    io.emit('message', { id: id, text: 'Auth is failure, restarting...' });
  });

  client.on('disconnected', (reason) => {
    io.emit('message', { id: id, text: 'WhatsApp is disconnected!' });
    fs.unlinkSync(SESSION_FILE_PATH, (err) => {
      if (err) return console.log(err);
      console.log('Session file deleted!');
    });
    client.destroy();
    client.initialize();

    // Menghapus pada file session
    const savedSessions = getSessionsFile();
    const sessionIndex = savedSessions.findIndex((sess) => sess.id == id);
    savedSessions.splice(sessionIndex, 1);
    setSessionsFile(savedSessions);

    io.emit('remove-session', id);
  });

  //   tambahkan client ke session
  sessions.push({
    id,
    description,
    client,
  });

  // Menambahkan session ke file
  const savedSessions = getSessionsFile();
  const sessionIndex = savedSessions.findIndex((sess) => sess.id == id);

  if (sessionIndex == -1) {
    savedSessions.push({
      id,
      description,
      ready: false,
    });
    setSessionsFile(savedSessions);
  }
};

const init = (socket) => {
  const savedSessions = getSessionsFile();

  if (savedSessions.length > 0) {
    if (socket) {
      socket.emit('init', savedSessions);
    } else {
      savedSessions.forEach((sess) => {
        createSession(sess.id, sess.description);
      });
    }
  }
};

init();
//Koneksi socket io
io.on('connection', (socket) => {
  init(socket);
  socket.on('create-session', (data) => {
    console.log('Create Session ' + data.id);
    createSession(data.id, data.description);
  });
});
// io.on('connection', (socket) => {
//   socket.emit('message', 'Connecting...');
//   client.on('qr', (qr) => {
//     // Generate and scan this code with your phone
//     console.log('QR RECEIVED', qr);
//     // qrcode.generate(qr);
//     qrcode.toDataURL(qr, (err, url) => {
//       socket.emit('qr', url);
//       socket.emit('message', 'QR Code received, scan please!');
//     });
//   });

//   client.on('ready', () => {
//     socket.emit('ready', 'Whatsapp is ready!');
//     socket.emit('message', 'Whatsapp is ready!');
//   });

//   client.on('authenticated', (session) => {
//     socket.emit('authenticated', 'Whatsapp is authenticated!');
//     socket.emit('message', 'Whatsapp is authenticated!');
//     console.log('AUTHENTICATED', session);
//     sessionCfg = session;
//     fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function (err) {
//       if (err) {
//         console.error(err);
//       }
//     });
//   });
// });

// Send message
app.post('/send-message', (req, res) => {
  const sender = req.body.sender;
  const number = phoneNumberFormatter(req.body.number); //memformat number
  const message = req.body.message;

  const client = sessions.find((sess) => sess.id == sender).client;

  client
    .sendMessage(number, message)
    .then((response) => {
      res.status(200).json({
        status: true,
        response: response,
      });
    })
    .catch((err) => {
      res.status(500).json({
        status: false,
        response: err,
      });
    });
});

// Mengirim media
app.post('/send-media', (req, res) => {
  const number = phoneNumberFormatter(req.body.number); //memformat number
  const caption = req.body.caption;
  const media = MessageMedia.fromFilePath('./icon.png');

  client
    .sendMessage(number, media, { caption: caption })
    .then((response) => {
      res.status(200).json({
        status: true,
        response: response,
      });
    })
    .catch((err) => {
      res.status(500).json({
        status: false,
        response: err,
      });
    });
});

server.listen(port, () => {
  console.log('App running on *: ' + port);
});
