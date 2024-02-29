The purpose of this project is to provide the simplest possible example of handling JWT authentication, using as many "best practices" as possible. I'm not a security expert, which is why I've created this project as a sandbox, so I don't recommend using this 'as-is' for your production apps. Instead, make sure you understand the features that this app showcases and make sure that you're implementing them as necessary into your apps.

To run this app locally:

1. `cd [project-root]`
2. `npm install`
3. `openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365` (creates a new SSL certificate)
4. `touch .env`
5. Add `PORT = 4000` and `NODE_ENV = 'development'` to .env file
6. Add a `SSL_CERT_PASSPHRASE` variable to your .env file with the value set the same as the passphrase used in step 3.
7. `npm run dev`
