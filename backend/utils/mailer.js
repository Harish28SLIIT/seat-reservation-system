const nodemailer = require('nodemailer');
require('dotenv').config();

// Create transporter only if credentials are available
let transporter = null;
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

const sendMail = async (to, subject, html, attachment = null) => {
  if (!transporter) {
    console.log("⚠️ Email not configured - skipping email to", to);
    return;
  }

  const mailOptions = {
    from: `"Seat Reservation System" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
    attachments: attachment ? [attachment] : []
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent to ${to}`);
  } catch (err) {
    console.error("❌ Email send error:", err.message);
  }
};

module.exports = sendMail;
