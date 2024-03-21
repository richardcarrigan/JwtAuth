import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

import { users } from './seedData.js';

export function checkAuthStatus(req, res, next) {
  // Retrieve the token from the HttpOnly cookie
  const token = req.cookies.token;

  if (token) {
    // Uses the encryption key to decrypt the JWT. If the decoding results in usable data,
    // then the server * trusts * that it must have been issued BY the server.
    jwt.verify(token, process.env.JWT_SECRET_KEY, (err, decoded) => {
      if (!err && users[decoded.username]) {
        req.isAuthenticated = true;
        req.username = decoded.username;
      }
    });
  }

  next();
}

export function issueToken(username) {
  const payload = { username };

  // Create the JWT
  const token = jwt.sign(payload, process.env.JWT_SECRET_KEY, {
    expiresIn: '1h',
  });

  return token;
}

export async function addOrUpdateUserAsync(username, password) {
  // Define the number of times the password gets re-encrypted ("salted"). More is better.
  const saltRounds = 10;

  // Hash the password, store it in the "database", and then issue a JWT to the client as an HttpOnly cookie.
  const hash = await bcrypt.hash(password, saltRounds);
  const newUser = {
    password: hash,
    role: users[username]?.role || 'default',
  };
  users[username] = newUser;

  console.log(`User ${username} added/updated`);
}

export async function checkPasswordAsync(username, password) {
  // Existing users, either authenticate them and issue a new JWT to the client, or send an error message back to the client.
  const result = await bcrypt.compare(password, users[username].password);
  if (!result) {
    return false;
  } else {
    return true;
  }
}
