import express from 'express';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const port = process.env.PORT;

const app = express();
app.use(express.json());
app.use(cors());

app.use(express.static(__dirname));

const users = {};

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/api/login', (req, res) => {
  const saltRounds = 10;

  const { username, password } = req.body;
  
  if (!username || !password) {
    res.status(401).json({ error: 'Username or password missing' });
  }

  // New user
  if (!(username in users)) {
    // Hash the password
    bcrypt.hash(password, saltRounds, (err, hash) => {
      users[username] = hash;

      issueToken();
    });
  } else {
    bcrypt.compare(password, users[username], (err, result) => {
      if (err || !result) {
        res.status(401).json({ error: 'Invalid credentials' });
      }

      issueToken();
    });
  }

  function issueToken() {
    const payload = { username };
    const token = jwt.sign(payload, 'secret key', { expiresIn: '1h' });
  
    res.json({ token });
  }
});

app.get('/api/secret', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  const token = authHeader.split(' ')[1];

  jwt.verify(token, 'secret key', (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    res.json({ secretData: 'Here is your secret data!' });
  });
});

if (process.env.NODE_ENV === 'production') {
  http.createServer(app).listen(port, () => {
    console.log(`Server is listening on port ${port}`);
  });
} else {
  const httpsOptions = {
    key: fs.readFileSync('./key.pem'),
    cert: fs.readFileSync('./cert.pem'),
    passphrase: 'JwtAuthBE'
  };
  https.createServer(httpsOptions, app).listen(port, () => {
    console.log(`Server is listening on port ${port}`);
  });
}
