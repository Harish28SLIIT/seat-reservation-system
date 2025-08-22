const db = require('../db');
const sendMail = require('../utils/mailer'); // ✅ Email utility
const { createEvent } = require('ics');
const PDFDocument = require('pdfkit');
const { writeToBuffer } = require('@fast-csv/format');
const { notifySeatReserved, notifyReservationCancelled, notifyReservationEdited } = require('../utils/emailNotifications');
const { smsNotifications } = require('../utils/smsNotifications');


// 1. Get Available Seats by Floor, Date, Time
exports.getSeatsByFloorDateTime = async (req, res) => {
  const { floor, date, start, end } = req.query;

  if (!floor || !date || !start || !end) {
    return res.status(400).json({ message: 'Missing params' });
  }

  try {
    const [allSeats] = await db.execute(
      `SELECT * FROM seats WHERE location = ? AND status = 'available'`,
      [floor]
    );

    const [conflicts] = await db.execute(
      `SELECT seat_id FROM reservations 
       WHERE date = ? AND status = 'active' 
       AND (
         (start_time <= ? AND end_time > ?) OR 
         (start_time < ? AND end_time >= ?) OR 
         (start_time >= ? AND end_time <= ?)
       )`,
      [date, start, start, end, end, start, end]
    );

    const bookedSeatIds = conflicts.map(c => c.seat_id);
    const available = allSeats.filter(seat => !bookedSeatIds.includes(seat.id));
    res.json(available);
  } catch (err) {
    res.status(500).json({ message: 'Error loading available seats', error: err.message });
  }
};

// 2. Reserve seat with validations and send email
exports.reserveSeat = async (req, res) => {
  const { internId, seatId, date, startTime, endTime } = req.body;

  const now = new Date();
  const startDateTime = new Date(`${date}T${startTime}`);
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

  if (startDateTime <= now) {
    return res.status(400).json({ message: 'Cannot book in the past' });
  }

  if (startDateTime < oneHourLater) {
    return res.status(400).json({ message: 'Must book at least 1 hour in advance' });
  }

  try {
    const [existing] = await db.execute(
      `SELECT * FROM reservations WHERE intern_id = ? AND date = ? AND status = 'active'`,
      [internId, date]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: 'Only one reservation allowed per day' });
    }

    const [conflict] = await db.execute(
      `SELECT * FROM reservations 
       WHERE seat_id = ? AND date = ? AND status = 'active'
       AND (
         (start_time <= ? AND end_time > ?) OR 
         (start_time < ? AND end_time >= ?) OR 
         (start_time >= ? AND end_time <= ?)
       )`,
      [seatId, date, startTime, startTime, endTime, endTime, startTime, endTime]
    );

    if (conflict.length > 0) {
      return res.status(400).json({ message: 'Seat already reserved in that time slot' });
    }

    await db.execute(
      `INSERT INTO reservations (intern_id, seat_id, date, start_time, end_time)
       VALUES (?, ?, ?, ?, ?)`,
      [internId, seatId, date, startTime, endTime]
    );

    const [[user]] = await db.execute(`SELECT name, email, phone FROM users WHERE id = ?`, [internId]);
    const [[seat]] = await db.execute(`SELECT seat_number, location FROM seats WHERE id = ?`, [seatId]);

    // Send styled email notification
    await notifySeatReserved(
      { 
        seat_number: seat.seat_number, 
        date, 
        start_time: startTime, 
        end_time: endTime,
        location: seat.location 
      },
      { name: user.name, email: user.email }
    );
    console.log(`📧 Reservation notification sent to ${user.email}`);

    // Send SMS notification
    if (user.phone) {
      await smsNotifications.seatReserved(
        { 
          seat_number: seat.seat_number, 
          date, 
          start_time: startTime, 
          end_time: endTime,
          location: seat.location 
        },
        { name: user.name, phone: user.phone }
      );
      console.log(`📱 Reservation SMS sent to ${user.phone}`);
    }

    // ✅ Calendar event setup
    const [year, month, day] = date.split('-').map(n => parseInt(n));
    const [startH, startM] = startTime.split(':').map(n => parseInt(n));
    const [endH, endM] = endTime.split(':').map(n => parseInt(n));

    const event = {
      start: [year, month, day, startH, startM],
      end: [year, month, day, endH, endM],
      title: `Seat Reservation - ${seat.seat_number}`,
      description: `Your reserved seat at office.`,
      location: `Office - Floor ${seat.seat_number.charAt(0)}`,
      status: 'CONFIRMED',
      organizer: { name: 'Seat System', email: process.env.EMAIL_USER }
    };

    createEvent(event, async (error, value) => {
      if (error) {
        console.error("❌ ICS creation failed:", error);
        return;
      }

      await sendMail(user.email, '✅ Seat Reserved', `
        <h3>Hello ${user.name},</h3>
        <p>Your seat <b>${seat.seat_number}</b> is reserved on <b>${date}</b> from <b>${startTime}</b> to <b>${endTime}</b>.</p>
        <p><i>Calendar invite is attached below.</i></p>
      `, {
        filename: 'reservation.ics',
        content: value
      });
    });

    res.json({ message: 'Seat reserved successfully!' });
  } catch (err) {
    res.status(500).json({ message: 'Reservation failed', error: err.message });
  }
};

// 3. Get Intern's Reservations
exports.getMyReservations = async (req, res) => {
  const userId = req.params.userId;
  try {
    const [rows] = await db.execute(
      `SELECT r.*, s.seat_number, s.location
       FROM reservations r
       JOIN seats s ON r.seat_id = s.id
       WHERE r.intern_id = ?
       ORDER BY r.date DESC, r.start_time DESC`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching reservations' });
  }
};

// 4. Cancel Reservation + send email
exports.cancelReservation = async (req, res) => {
  const reservationId = req.params.reservationId;
  try {
    const [[reservation]] = await db.execute(`
      SELECT r.*, u.name, u.email, u.phone, s.seat_number
      FROM reservations r
      JOIN users u ON r.intern_id = u.id
      JOIN seats s ON r.seat_id = s.id
      WHERE r.id = ?`, [reservationId]);

    await db.execute(`UPDATE reservations SET status = 'cancelled' WHERE id = ?`, [reservationId]);

    // Send styled cancellation notification
    await notifyReservationCancelled(
      {
        seat_number: reservation.seat_number,
        date: reservation.date,
        start_time: reservation.start_time,
        end_time: reservation.end_time
      },
      { name: reservation.name, email: reservation.email }
    );
    console.log(`📧 Cancellation notification sent to ${reservation.email}`);

    // Send SMS cancellation notification
    if (reservation.phone) {
      await smsNotifications.reservationCancelled(
        {
          seat_number: reservation.seat_number,
          date: reservation.date,
          start_time: reservation.start_time,
          end_time: reservation.end_time
        },
        { name: reservation.name, phone: reservation.phone }
      );
      console.log(`📱 Cancellation SMS sent to ${reservation.phone}`);
    }

    // Also send simple email (keeping existing functionality)
    await sendMail(reservation.email, '❌ Reservation Cancelled', `
      <h3>Hi ${reservation.name},</h3>
      <p>Your reservation for seat <b>${reservation.seat_number}</b> on <b>${reservation.date}</b> from <b>${reservation.start_time}</b> to <b>${reservation.end_time}</b> has been <b>cancelled</b>.</p>
    `);

    res.json({ message: 'Reservation cancelled.' });
  } catch (err) {
    res.status(500).json({ message: 'Cancellation failed' });
  }
};

// 5. Edit Reservation + email
exports.editReservation = async (req, res) => {
  const { seatId, date, startTime, endTime, id } = req.body;
  if (!seatId || !date || !startTime || !endTime || !id) {
    return res.status(400).json({ message: 'Missing fields for edit' });
  }

  try {
    await db.execute(
      `UPDATE reservations SET seat_id = ?, date = ?, start_time = ?, end_time = ? WHERE id = ?`,
      [seatId, date, startTime, endTime, id]
    );

    const [[reservation]] = await db.execute(`
      SELECT r.*, u.name, u.email, u.phone, s.seat_number
      FROM reservations r
      JOIN users u ON r.intern_id = u.id
      JOIN seats s ON r.seat_id = s.id
      WHERE r.id = ?`, [id]);

    // Send styled update notification
    await notifyReservationEdited(
      null, // old data not needed for this template
      {
        seat_number: reservation.seat_number,
        date: date,
        start_time: startTime,
        end_time: endTime
      },
      { name: reservation.name, email: reservation.email }
    );
    console.log(`📧 Update notification sent to ${reservation.email}`);

    // Send SMS update notification
    if (reservation.phone) {
      await smsNotifications.reservationUpdated(
        {
          seat_number: reservation.seat_number,
          date: date,
          start_time: startTime,
          end_time: endTime
        },
        { name: reservation.name, phone: reservation.phone }
      );
      console.log(`📱 Update SMS sent to ${reservation.phone}`);
    }

    // Also send simple email (keeping existing functionality)
    await sendMail(reservation.email, '✏️ Reservation Updated', `
      <h3>Hello ${reservation.name},</h3>
      <p>Your reservation has been updated to seat <b>${reservation.seat_number}</b> on <b>${date}</b> from <b>${startTime}</b> to <b>${endTime}</b>.</p>
    `);

    res.json({ message: 'Reservation updated.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update reservation' });
  }
};

// 6. Manual Seat Map
exports.getManualSeats = async (req, res) => {
  const { floor, userId, date } = req.query;

  try {
    const [seats] = await db.execute(
      `SELECT s.id, s.seat_number, s.location,
              r.intern_id, r.status as res_status
       FROM seats s
       LEFT JOIN reservations r ON s.id = r.seat_id AND r.date = ? AND r.status = 'active'
       WHERE s.location = ?`,
      [date, floor]
    );

    const result = seats.map(seat => ({
      id: seat.id,
      seat_number: seat.seat_number,
      location: seat.location,
      bookedByMe: seat.intern_id == userId,
      booked: seat.intern_id && seat.intern_id != userId
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load seat view' });
  }
};

// 7. Get Past Reservations
exports.getPastReservations = async (req, res) => {
  const userId = req.params.userId;
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  try {
    const [rows] = await db.execute(
      `SELECT r.*, s.seat_number, s.location
       FROM reservations r
       JOIN seats s ON r.seat_id = s.id
       WHERE r.intern_id = ? AND CONCAT(r.date, ' ', r.end_time) < ?
       ORDER BY r.date DESC`,
      [userId, now]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch past reservations' });
  }
};

// 8. Get seats by floor (basic)
exports.getSeatsByFloor = async (req, res) => {
  const { floor } = req.query;
  if (!floor) {
    return res.status(400).json({ message: 'Missing floor parameter' });
  }

  try {
    const [seats] = await db.execute(
      `SELECT id, seat_number, location FROM seats WHERE location = ? AND status = 'available'`,
      [floor]
    );
    res.json(seats);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch seats', error: err.message });
  }
};
exports.exportMyReservationsCSV = async (req, res) => {
  const userId = req.params.userId;
  try {
    const [data] = await db.query(`
      SELECT 
        u.name as 'User Name',
        s.seat_number as 'Seat Number', 
        s.location as 'Floor/Location', 
        r.date as 'Reservation Date', 
        r.start_time as 'Start Time', 
        r.end_time as 'End Time', 
        r.status as 'Status',
        r.created_at as 'Booking Date'
      FROM reservations r
      JOIN seats s ON r.seat_id = s.id
      JOIN users u ON r.intern_id = u.id
      WHERE r.intern_id = ?
      ORDER BY r.date DESC
    `, [userId]);

    // Add a header row with metadata
    const csvData = [
      ['My Seat Reservations Report'],
      ['Generated on:', new Date().toLocaleDateString()],
      ['Total Reservations:', data.length],
      [''], // Empty row
      ['User Name', 'Seat Number', 'Floor/Location', 'Reservation Date', 'Start Time', 'End Time', 'Status', 'Booking Date'],
      ...data.map(row => [
        row['User Name'],
        row['Seat Number'],
        row['Floor/Location'],
        new Date(row['Reservation Date']).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        row['Start Time'],
        row['End Time'],
        row['Status'].toUpperCase(),
        new Date(row['Booking Date']).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      ])
    ];

    const buffer = await writeToBuffer(csvData, { headers: false });
    res.setHeader('Content-disposition', 'attachment; filename=my_reservations.csv');
    res.set('Content-Type', 'text/csv');
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ message: 'Failed to export CSV', error: err.message });
  }
};
exports.exportMyReservationsPDF = async (req, res) => {
  const userId = req.params.userId;

  try {
    const [data] = await db.query(`
      SELECT s.seat_number, s.location, r.date, r.start_time, r.end_time, r.status, u.name
      FROM reservations r
      JOIN seats s ON r.seat_id = s.id
      JOIN users u ON r.intern_id = u.id
      WHERE r.intern_id = ?
      ORDER BY r.date DESC
    `, [userId]);

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    res.setHeader('Content-disposition', 'inline; filename=my_reservations.pdf');
    res.setHeader('Content-type', 'application/pdf');
    doc.pipe(res);

    // Header
    doc.fontSize(20).fillColor('#003366').text('MY SEAT RESERVATIONS', { align: 'center' });
    doc.moveDown(0.5);
    
    if (data.length > 0) {
      doc.fontSize(12).fillColor('#666666').text(`Report for: ${data[0].name}`, { align: 'center' });
    }
    
    doc.fontSize(10).fillColor('#999999').text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' });
    doc.moveDown(1);

    if (data.length === 0) {
      doc.fontSize(14).fillColor('#666666').text('No reservations found.', { align: 'center' });
      doc.end();
      return;
    }

    // Table headers
    const tableTop = doc.y;
    const tableLeft = 20;
    const colWidths = [35, 80, 100, 100, 80, 80, 85];
    const headers = ['#', 'Seat', 'Floor', 'Date', 'Start', 'End', 'Status'];
    
    // Header background
    doc.rect(tableLeft, tableTop - 5, colWidths.reduce((a, b) => a + b, 0), 25).fillAndStroke('#003366', '#003366');
    
    // Header text
    let currentX = tableLeft;
    doc.fontSize(10).fillColor('white');
    headers.forEach((header, i) => {
      doc.text(header, currentX + 5, tableTop + 5, { width: colWidths[i] - 10, align: 'center' });
      currentX += colWidths[i];
    });

    // Table rows
    let currentY = tableTop + 25;
    doc.fontSize(9).fillColor('#333333');
    
    data.forEach((reservation, index) => {
      // Alternate row colors
      const rowColor = index % 2 === 0 ? '#f8f9fa' : '#ffffff';
      doc.rect(tableLeft, currentY - 2, colWidths.reduce((a, b) => a + b, 0), 20).fill(rowColor);
      
      // Row data
      const rowData = [
        (index + 1).toString(),
        reservation.seat_number,
        reservation.location,
        new Date(reservation.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        reservation.start_time.slice(0, 5),
        reservation.end_time.slice(0, 5),
        reservation.status.toUpperCase()
      ];
      
      currentX = tableLeft;
      rowData.forEach((cell, i) => {
        const textColor = i === 6 ? (reservation.status === 'active' ? '#22c55e' : '#dc3545') : '#333333';
        doc.fillColor(textColor);
        doc.text(cell, currentX + 5, currentY + 3, { width: colWidths[i] - 10, align: 'center' });
        currentX += colWidths[i];
      });
      
      currentY += 20;
      
      // Add new page if needed
      if (currentY > 700) {
        doc.addPage();
        currentY = 80;
      }
    });

    // Footer
    doc.moveDown(2);


    doc.end();
  } catch (err) {
    res.status(500).json({ message: 'PDF export failed', error: err.message });
  }
};