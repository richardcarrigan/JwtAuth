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
import cookieParser from 'cookie-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const port = process.env.PORT;

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, '../public')));
app.use(cookieParser());

const users = {
  admin: { role: 'admin' }
};

app.post('/api/login', (req, res) => {
  const saltRounds = 10;

  const { username, password } = req.body;
  
  if (!username || !password) {
    res.status(401).json({ error: 'Username or password missing' });
  }

  // New user
  if (!(username in users) || !users[username].password) {
    // Hash the password
    bcrypt.hash(password, saltRounds, (err, hash) => {
      const newUser = {
        password: hash,
        role: users[username]?.role || 'default'
      }
      users[username] = newUser;

      console.log(`User ${username} added/updated`);

      issueToken();
    });
  } else {
    bcrypt.compare(password, users[username].password, (err, result) => {
      if (err || !result) {
        res.status(401).json({ error: 'Invalid credentials' });
      } else {
        console.log(`User ${username} authenticated successfully`);
        issueToken();
      }
    });
  }

  function issueToken() {
    const payload = { username };
    const token = jwt.sign(payload, 'secret key', { expiresIn: '1h' });

    res.cookie('token', token, {
      httpOnly: true,
      secure: true,
      maxAge: 60 * 60 * 1000 // Expires after 1 hour
    });
  
    res.status(200).send({ success: true });
  }
});

app.get('/api/secret', (req, res) => {
  const token = req.cookies.token;
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  jwt.verify(token, 'secret key', (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { username } = decoded;

    res.json({
      secretData: users[username].role === 'admin' ? 'Here is your super secret admin data!' : 'Here is your regular user data!'
    });
  });
});

app.get('/api/logout', (req, res) => {
  res.cookie('token', '', { expires: new Date(0), httpOnly: true });
  res.status(200).send({ success: true });
});

if (process.env.NODE_ENV === 'production') {
  http.createServer(app).listen(port, () => {
    console.log(`Server is listening on port ${port}`);
  });
} else {
  const httpsOptions = {
    key: fs.readFileSync('./key.pem'),
    cert: fs.readFileSync('./cert.pem'),
    passphrase: process.env.SSL_CERT_PASSPHRASE
  };
  https.createServer(httpsOptions, app).listen(port, () => {
    console.log(`Server is listening on port ${port}`);
  });
}
