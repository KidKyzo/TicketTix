const nodemailer = require('nodemailer');

// Create Gmail SMTP transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD
  }
});

// Verify connection only if credentials are set
if (process.env.SMTP_EMAIL && process.env.SMTP_EMAIL !== 'your.email@gmail.com') {
  transporter.verify((error, success) => {
    if (error) {
      console.log('SMTP connection error (Non-fatal):', error.message);
    } else {
      console.log('SMTP server is ready to send emails');
    }
  });
} else {
  console.log('SMTP Config: Using placeholder credentials. Email sending will fail.');
}

module.exports = transporter;
