// Enhanced Reminder Job with SMS Notifications
const db = require('./db');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const { smsNotifications } = require('./utils/smsNotifications');
require('dotenv').config();

// Email transporter (with error handling)
let transporter = null;
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
  console.log('✅ Email transporter initialized');
} else {
  console.log('⚠️ Email credentials not configured - email features disabled');
}

// ========================================
// 1. ONE HOUR BEFORE RESERVATION REMINDER
// ========================================
// Runs every 5 minutes to check for reservations starting in 1 hour
cron.schedule('*/5 * * * *', async () => {
  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
  const fiveMinutesLater = new Date(now.getTime() + 65 * 60 * 1000); // 5 min buffer

  try {
    const [reservations] = await db.query(`
      SELECT r.*, u.name, u.email, u.phone, s.seat_number, s.location
      FROM reservations r
      JOIN users u ON r.intern_id = u.id
      JOIN seats s ON r.seat_id = s.id
      WHERE r.status = 'active'
      AND STR_TO_DATE(CONCAT(r.date, ' ', r.start_time), '%Y-%m-%d %H:%i:%s') 
          BETWEEN ? AND ?
    `, [oneHourLater.toISOString().slice(0, 19).replace('T', ' '), 
        fiveMinutesLater.toISOString().slice(0, 19).replace('T', ' ')]);

    for (const reservation of reservations) {
      const { name, email, phone, seat_number, location, date, start_time, end_time } = reservation;

      // Send Email Reminder
      if (transporter) {
        try {
          const html = `
            <h3>⏰ Reservation Reminder</h3>
            <p>Hello ${name}, this is a reminder that your seat <b>${seat_number}</b> reservation starts in 1 hour.</p>
            <p><strong>Details:</strong></p>
            <ul>
              <li>Seat: ${seat_number}</li>
              <li>Date: ${date}</li>
              <li>Time: ${start_time} - ${end_time}</li>
              <li>Location: ${location || 'Office'}</li>
            </ul>
            <p>Please be ready!</p>
          `;
          await transporter.sendMail({
            from: `"Seat Reminder" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "⏰ Reservation Starting in 1 Hour",
            html
          });
          console.log(`📧 1-hour reminder email sent to ${email}`);
        } catch (emailErr) {
          console.log(`⚠️ Email failed for ${email}:`, emailErr.message);
        }
      }

      // Send SMS Reminder
      if (phone) {
        await smsNotifications.oneHourReminder(
          { seat_number, date, start_time, end_time, location },
          { name, phone }
        );
      }

      console.log(`⏰ 1-hour reminder sent to ${name} for seat ${seat_number}`);
    }

  } catch (err) {
    console.error("1-hour reminder error:", err.message);
  }
});

// ========================================
// 2. RESERVATION STARTING NOW
// ========================================
// Runs every minute to check for reservations starting now
cron.schedule('* * * * *', async () => {
  const now = new Date();
  const twoMinutesLater = new Date(now.getTime() + 2 * 60 * 1000); // 2 min buffer

  try {
    const [reservations] = await db.query(`
      SELECT r.*, u.name, u.email, u.phone, s.seat_number, s.location
      FROM reservations r
      JOIN users u ON r.intern_id = u.id
      JOIN seats s ON r.seat_id = s.id
      WHERE r.status = 'active'
      AND STR_TO_DATE(CONCAT(r.date, ' ', r.start_time), '%Y-%m-%d %H:%i:%s') 
          BETWEEN ? AND ?
    `, [now.toISOString().slice(0, 19).replace('T', ' '), 
        twoMinutesLater.toISOString().slice(0, 19).replace('T', ' ')]);

    for (const reservation of reservations) {
      const { name, phone, seat_number, date, start_time, end_time, location } = reservation;

      // Send SMS for reservation starting
      if (phone) {
        await smsNotifications.reservationStarting(
          { seat_number, date, start_time, end_time, location },
          { name, phone }
        );
      }

      console.log(`🚀 Reservation starting notification sent to ${name} for seat ${seat_number}`);
    }

  } catch (err) {
    console.error("Reservation starting notification error:", err.message);
  }
});

// ========================================
// 3. RESERVATION ENDING SOON (15 min warning)
// ========================================
// Runs every 5 minutes to check for reservations ending in 15 minutes
cron.schedule('*/5 * * * *', async () => {
  const now = new Date();
  const fifteenMinutesLater = new Date(now.getTime() + 15 * 60 * 1000);
  const twentyMinutesLater = new Date(now.getTime() + 20 * 60 * 1000); // 5 min buffer

  try {
    const [reservations] = await db.query(`
      SELECT r.*, u.name, u.email, u.phone, s.seat_number, s.location
      FROM reservations r
      JOIN users u ON r.intern_id = u.id
      JOIN seats s ON r.seat_id = s.id
      WHERE r.status = 'active'
      AND STR_TO_DATE(CONCAT(r.date, ' ', r.end_time), '%Y-%m-%d %H:%i:%s') 
          BETWEEN ? AND ?
    `, [fifteenMinutesLater.toISOString().slice(0, 19).replace('T', ' '), 
        twentyMinutesLater.toISOString().slice(0, 19).replace('T', ' ')]);

    for (const reservation of reservations) {
      const { name, phone, seat_number, date, start_time, end_time, location } = reservation;

      // Send SMS for reservation ending soon
      if (phone) {
        await smsNotifications.reservationEnding(
          { seat_number, date, start_time, end_time, location },
          { name, phone }
        );
      }

      console.log(`⏰ Reservation ending warning sent to ${name} for seat ${seat_number}`);
    }

  } catch (err) {
    console.error("Reservation ending warning error:", err.message);
  }
});

// ========================================
// 4. RESERVATION ENDED
// ========================================
// Runs every minute to check for reservations that just ended
cron.schedule('* * * * *', async () => {
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

  try {
    const [reservations] = await db.query(`
      SELECT r.*, u.name, u.email, u.phone, s.seat_number, s.location
      FROM reservations r
      JOIN users u ON r.intern_id = u.id
      JOIN seats s ON r.seat_id = s.id
      WHERE r.status = 'active'
      AND STR_TO_DATE(CONCAT(r.date, ' ', r.end_time), '%Y-%m-%d %H:%i:%s') 
          BETWEEN ? AND ?
    `, [fiveMinutesAgo.toISOString().slice(0, 19).replace('T', ' '), 
        now.toISOString().slice(0, 19).replace('T', ' ')]);

    for (const reservation of reservations) {
      const { name, phone, seat_number, date, start_time, end_time, location } = reservation;

      // Send SMS for reservation ended
      if (phone) {
        await smsNotifications.reservationEnded(
          { seat_number, date, start_time, end_time, location },
          { name, phone }
        );
      }

      console.log(`✅ Reservation ended notification sent to ${name} for seat ${seat_number}`);
    }

  } catch (err) {
    console.error("Reservation ended notification error:", err.message);
  }
});

console.log('🕐 Enhanced reminder system started with SMS notifications:');
console.log('  📧 1 hour before reminders (every 5 min)');
console.log('  🚀 Reservation starting alerts (every 1 min)');
console.log('  ⏰ Ending soon warnings (every 5 min)');
console.log('  ✅ Reservation ended confirmations (every 1 min)');