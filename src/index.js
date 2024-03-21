import express from 'express';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import cookieParser from 'cookie-parser';
import http from 'http';
import https from 'https';
import fs from 'fs';

// Local imports
import { checkAuthStatus, issueToken, addOrUpdateUserAsync, checkPasswordAsync } from './authUtils.js';
import { users } from './seedData.js';

// Standard Express server setup
const port = process.env.PORT;
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Allows Express server to parse JWT HttpOnly cookie when data is requested
app.use(cookieParser());

// Serves static HTML files for routes not specified below
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});
app.get('/login', checkAuthStatus, (req, res) => {
  if (req.isAuthenticated) {
    res.redirect('/data');
  } else {
    res.sendFile(path.join(__dirname, '../public/login.html'));
  }
});
app.get('/data', checkAuthStatus, (req, res) => {
  if (req.isAuthenticated) {
    res.sendFile(path.join(__dirname, '../public/data.html'));
  } else {
    res.redirect('/login');
  }
});

app.get('/logout', (req, res) => {
  // Clear JWT cookie
  res.cookie('token', '', { expires: new Date(0), httpOnly: true });
  // Send user back to homepage
  res.redirect('/');
});

// Helpful for other static files, such as images, CSS, and JS
app.use(express.static(path.join(__dirname, '../public')));

// When a user tries to log in, either validate their password if existing, or create a new user account using the "default" role.
app.post('/api/login', async (req, res) => {
  
  const { username, password } = req.body;
  
  // Validate that a username and a password were provided
  if (!username || !password) {
    res.status(401).json({ error: 'Username or password missing' });
  }
  
  // New user
  if (!(username in users) || !users[username].password) {
    addOrUpdateUserAsync(username, password);
    const token = issueToken(username, res);

    // Add the JWT as an HttpOnly cookie that will only travel over HTTPS
    res.cookie('token', token, {
      httpOnly: true,
      secure: true,
      maxAge: 60 * 60 * 1000, // Expires after 1 hour
    });

    // Send the response, including the JWT cookie
    res.redirect('/data');
  } else {
    const isPasswordValid = await checkPasswordAsync(username, password);

    if (isPasswordValid) {
      console.log(`User ${username} authenticated successfully`);
      const token = issueToken(username, res);

      // Add the JWT as an HttpOnly cookie that will only travel over HTTPS
      res.cookie('token', token, {
        httpOnly: true,
        secure: true,
        maxAge: 60 * 60 * 1000, // Expires after 1 hour
      });

      // Send the response, including the JWT cookie
      res.redirect('/data');
    } else {
      res.redirect('/login');
    }
  }
});

// When a user attempts to access data, make sure they are authenticated AND are authorized to see the admin data.
// If they are authenticated but not authorized, send back the data that everyone is authorized to see.
// Authentication is something that should be implemented similarly for every app,
// whereas Authorization is where the business logic is used to determine which roles exist and what those roles are allowed to do/see.
app.get('/api/secret', checkAuthStatus, (req, res) => {
  if (req.isAuthenticated) {
    // Once the user has successfully authenticated, check which role they possess (Authorization),
    // and return the data corresponding to their role.
    res.json({
      secretData:
        users[req.username].role === 'admin'
          ? 'Here is your super secret admin data!'
          : 'Here is your regular user data!',
    });
  } else {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

app.get('/api/auth/status', checkAuthStatus, (req, res) => {
  return res.json({ isAuthenticated: req.isAuthenticated });
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
