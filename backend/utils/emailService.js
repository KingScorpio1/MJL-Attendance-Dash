const nodemailer = require('nodemailer');

// Configure your SMTP transporter
const transporter = nodemailer.createTransport({
  service: process.env.SMTP_SERVICE || 'gmail', // e.g., 'gmail', 'SendGrid', 'Mailgun'
  host: process.env.SMTP_HOST, // e.g., 'smtp.gmail.com'
  port: process.env.SMTP_PORT || 587, // e.g., 587 for TLS, 465 for SSL
  secure: process.env.SMTP_SECURE === 'true', // Use 'true' for 465, 'false' for 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendEmail({ to, subject, text, html, attachments = [] }) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('SMTP_USER or SMTP_PASS not set. Skipping email sending.');
    // In production, you might want to throw an error or log more prominently.
    return { success: false, message: 'Email credentials not configured.' };
  }

  try {
    const mailOptions = {
      from: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
      to,
      subject,
      text,
      html,
      attachments,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: %s', info.messageId);
    return { success: true, message: 'Email sent successfully.' };
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send email: ' + error.message);
  }
}

module.exports = { sendEmail };