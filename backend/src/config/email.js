const nodemailer = require('nodemailer');

// Create Gmail SMTP transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD
  }
});

// Verify connection
transporter.verify((error, success) => {
  if (error) {
    console.log('SMTP connection error:', error.message);
  } else {
    console.log('SMTP server is ready to send emails');
  }
});

module.exports = transporter;
