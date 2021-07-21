const fs = require('fs');
const { Client, Location, MessageMedia } = require('whatsapp-web.js');
const socketIo = require('socket.io');
const express = require('express');
const { body, validationResult } = require('express-validator');
const qrcode = require('qrcode');
const http = require('http');
const { response } = require('express');
const { phoneNumberFormatter } = require('./helpers/formatter');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Express JS
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Membuat session WA agar tidak Scan QR terus
const SESSION_FILE_PATH = './whatsapp-session.json';
let sessionCfg;
if (fs.existsSync(SESSION_FILE_PATH)) {
  sessionCfg = require(SESSION_FILE_PATH);
}

// Memanggil index.html
app.get('/', (req, res) => {
  res.sendFile('index.html', { root: __dirname });
});

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

// Chat bot
client.on('message', (msg) => {
  if (msg.body == '!ping') {
    //Ketika client mengirim pesan !ping
    msg.reply('pong'); // Maka akan dibls pong
  }
});

client.initialize();

//Koneksi socket io
io.on('connection', (socket) => {
  socket.emit('message', 'Connecting...');
  client.on('qr', (qr) => {
    // Generate and scan this code with your phone
    console.log('QR RECEIVED', qr);
    // qrcode.generate(qr);
    qrcode.toDataURL(qr, (err, url) => {
      socket.emit('qr', url);
      socket.emit('message', 'QR Code received, scan please!');
    });
  });

  client.on('ready', () => {
    socket.emit('ready', 'Whatsapp is ready!');
    socket.emit('message', 'Whatsapp is ready!');
  });

  client.on('authenticated', (session) => {
    socket.emit('authenticated', 'Whatsapp is authenticated!');
    socket.emit('message', 'Whatsapp is authenticated!');
    console.log('AUTHENTICATED', session);
    sessionCfg = session;
    fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function (err) {
      if (err) {
        console.error(err);
      }
    });
  });
});

const checkRegisteredNumber = async (number) => {
  const isRegistered = await client.isRegisteredUser(number);
  return isRegistered;
};

// Send message
app.post('/send-message', [body('number').notEmpty(), body('message').notEmpty()], async (req, res) => {
  const errors = validationResult(req).formatWith(({ msg }) => {
    return msg;
  });

  if (!errors.isEmpty()) {
    return res.status(422).json({
      status: false,
      message: errors.mapped(),
    });
  }
  const number = phoneNumberFormatter(req.body.number); //memformat number
  const message = req.body.message;

  const isRegisteredNumber = await checkRegisteredNumber(number);
  // Melakukan pengecekan apakah nomer ter register di WA
  if (!isRegisteredNumber) {
    return res.status(422).json({
      status: false,
      message: 'The number is not registered!',
    });
  }

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

server.listen(3000, () => {
  console.log('App running on *: ' + 3000);
});
