import express from 'express';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import http from 'http';
import https from 'https';
import fs from 'fs';

// Standard Express server setup
const port = process.env.PORT;
const app = express();
app.use(express.json());

// Serves static HTML files for routes not specified below
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
app.use(express.static(path.join(__dirname, '../public')));

// Allows Express server to parse JWT HttpOnly cookie when data is requested
app.use(cookieParser());

// Mock users database
const users = {
  admin: { role: 'admin' }
};

// When a user tries to log in, either validate their password if existing, or create a new user account using the "default" role.
app.post('/api/login', (req, res) => {
  // Define the number of times the password gets re-encrypted ("salted"). More is better.
  const saltRounds = 10;

  const { username, password } = req.body;

  // Validate that a username and a password were provided
  if (!username || !password) {
    res.status(401).json({ error: 'Username or password missing' });
  }

  // New user
  if (!(username in users) || !users[username].password) {
    // Hash the password, store it in the "database", and then issue a JWT to the client as an HttpOnly cookie.
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
    // Existing users, either authenticate them and issue a new JWT to the client, or send an error message back to the client.
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

    // Create the JWT
    const token = jwt.sign(payload, process.env.JWT_SECRET_KEY, { expiresIn: '1h' });

    // Add the JWT as an HttpOnly cookie that will only travel over HTTPS
    res.cookie('token', token, {
      httpOnly: true,
      secure: true,
      maxAge: 60 * 60 * 1000 // Expires after 1 hour
    });

    // Send the response, including the JWT cookie
    res.status(200).send({ success: true });
  }
});

// When a user attempts to access data, make sure they are authenticated AND are authorized to see the admin data.
// If they are authenticated but not authorized, send back the data that everyone is authorized to see.
// Authentication is something that should be implemented similarly for every app,
// whereas Authorization is where the business logic is used to determine which roles exist and what those roles are allowed to do/see.
app.get('/api/secret', (req, res) => {
  // Retrieve the token from the HttpOnly cookie
  const token = req.cookies.token;
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  // Uses the encryption key to decrypt the JWT. If the decoding results in usable data, 
  // then the server * trusts * that it must have been issued BY the server.
  jwt.verify(token, process.env.JWT_SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { username } = decoded;

    // Once the user has successfully authenticated, check which role they possess (Authorization),
    // and return the data corresponding to their role.
    res.json({
      secretData:
        users[username].role === 'admin'
          ? 'Here is your super secret admin data!'
          : 'Here is your regular user data!',
    });
  });
});

// When a user requests to logout, clear the JWT cookie from their browser.
app.get('/api/logout', (req, res) => {
  res.cookie('token', '', { expires: new Date(0), httpOnly: true });
  res.status(200).send({ success: true });
});

app.get('/api/auth/status', (req, res) => {
  // Retrieve the token from the HttpOnly cookie
  const token = req.cookies.token;

  if (!token) {
    return res.json({ isAuthenticated: false });
  }

  // Uses the encryption key to decrypt the JWT. If the decoding results in usable data,
  // then the server * trusts * that it must have been issued BY the server.
  jwt.verify(token, process.env.JWT_SECRET_KEY, (err, decoded) => {
    return res.json({ isAuthenticated: !err });
  });
});

// Since app hosting providers handle HTTPS for us, the app can just create a simple HTTP server and pass the HTTPS responsibility to them.
// For development, however, we need to manually create an HTTPS server using a self-signed certificate.
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
