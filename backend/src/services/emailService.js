const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

let transporter = null;
if (process.env.SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
}

const sendEmail = async ({ to, subject, html }) => {
  if (!transporter) {
    logger.info(`[email disabled] to=${to} subject="${subject}"`);
    return false;
  }
  try {
    await transporter.sendMail({ from: process.env.EMAIL_FROM, to, subject, html });
    return true;
  } catch (e) {
    logger.error(`Email failed: ${e.message}`);
    return false;
  }
};

const sendWelcomeEmail = (user) =>
  sendEmail({
    to: user.email,
    subject: 'Welcome to EduCMS',
    html: `<p>Hi ${user.first_name || user.username}, your EduCMS account is ready.</p>`,
  });

module.exports = { sendEmail, sendWelcomeEmail };
