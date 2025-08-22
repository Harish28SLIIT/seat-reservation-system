const db = require('../db');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const { format } = require('date-fns');
const { writeToBuffer } = require('@fast-csv/format');
const { notifySeatAdded, notifySeatUpdated, notifySeatDeleted } = require('../utils/emailNotifications');

// 1. Add seat
exports.addSeat = async (req, res) => {
  const { seat_number, location, adminEmail } = req.body;
  try {
    // Check if seat already exists
    const [existing] = await db.query(
      'SELECT id FROM seats WHERE seat_number = ?',
      [seat_number]
    );
    
    if (existing.length > 0) {
      return res.status(400).json({ 
        message: `Seat ${seat_number} already exists. Please choose a different seat number.` 
      });
    }
    
    await db.query(
      'INSERT INTO seats (seat_number, location, status) VALUES (?, ?, "available")',
      [seat_number, location]
    );

    // Get admin details for email notification
    if (adminEmail) {
      const [adminUser] = await db.query('SELECT * FROM users WHERE email = ? AND role = "admin"', [adminEmail]);
      if (adminUser.length > 0) {
        await notifySeatAdded(
          { seat_number, location },
          { name: adminUser[0].name, email: adminUser[0].email }
        );
        console.log(`📧 Seat added notification sent to ${adminEmail}`);
      }
    }

    res.status(201).json({ message: 'Seat added successfully!' });
  } catch (err) {
    console.error('Error adding seat:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// 2. Edit seat
exports.updateSeat = async (req, res) => {
  const seatId = req.params.seatId;
  const { seat_number, location, status, adminEmail } = req.body;
  try {
    await db.query(
      'UPDATE seats SET seat_number = ?, location = ?, status = ? WHERE id = ?',
      [seat_number, location, status, seatId]
    );

    // Get admin details for email notification
    if (adminEmail) {
      const [adminUser] = await db.query('SELECT * FROM users WHERE email = ? AND role = "admin"', [adminEmail]);
      if (adminUser.length > 0) {
        await notifySeatUpdated(
          { seat_number, location, status },
          { name: adminUser[0].name, email: adminUser[0].email }
        );
        console.log(`📧 Seat updated notification sent to ${adminEmail}`);
      }
    }

    res.json({ message: 'Seat updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// 3. Delete seat
exports.deleteSeat = async (req, res) => {
  const seatId = req.params.seatId;
  const { adminEmail } = req.body;
  try {
    // Get seat details before deletion for email notification
    const [seatData] = await db.query('SELECT * FROM seats WHERE id = ?', [seatId]);
    
    await db.query('DELETE FROM seats WHERE id = ?', [seatId]);

    // Get admin details for email notification
    if (adminEmail && seatData.length > 0) {
      const [adminUser] = await db.query('SELECT * FROM users WHERE email = ? AND role = "admin"', [adminEmail]);
      if (adminUser.length > 0) {
        await notifySeatDeleted(
          { seat_number: seatData[0].seat_number, location: seatData[0].location },
          { name: adminUser[0].name, email: adminUser[0].email }
        );
        console.log(`📧 Seat deleted notification sent to ${adminEmail}`);
      }
    }

    res.json({ message: 'Seat deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// 4. All reservations
exports.getAllReservations = async (req, res) => {
  try {
    const [results] = await db.query(`
      SELECT r.*, u.name as intern_name, s.seat_number
      FROM reservations r
      JOIN users u ON r.intern_id = u.id
      JOIN seats s ON r.seat_id = s.id
      ORDER BY r.date DESC`);
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// 5. Reservations by intern
exports.getInternReservations = async (req, res) => {
  const internId = req.params.internId;
  try {
    const [results] = await db.query(`
      SELECT r.*, s.seat_number FROM reservations r
      JOIN seats s ON r.seat_id = s.id
      WHERE r.intern_id = ?`, [internId]);
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// 6. Seat usage summary (counts)
exports.generateReport = async (req, res) => {
  try {
    const [results] = await db.query(`
      SELECT s.seat_number, COUNT(r.id) AS total_reservations
      FROM reservations r
      JOIN seats s ON r.seat_id = s.id
      WHERE r.status = 'active'
      GROUP BY r.seat_id`);
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// 7. Used seats (past time)
exports.getUsedSeats = async (req, res) => {
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  try {
    const [rows] = await db.query(`
      SELECT r.*, u.name AS intern_name, s.seat_number
      FROM reservations r
      JOIN users u ON r.intern_id = u.id
      JOIN seats s ON r.seat_id = s.id
      WHERE r.status = 'active' AND r.end_time < ?
      ORDER BY r.end_time DESC`, [now]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Error loading used seats', error: err.message });
  }
};

// 8. Current seat usage
exports.getCurrentUsage = async (req, res) => {
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  try {
    const [rows] = await db.query(`
      SELECT r.*, u.name AS intern_name, s.seat_number
      FROM reservations r
      JOIN users u ON r.intern_id = u.id
      JOIN seats s ON r.seat_id = s.id
      WHERE r.status = 'active' AND r.start_time <= ? AND r.end_time >= ?
      ORDER BY r.start_time ASC`, [now, now]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Error loading current usage', error: err.message });
  }
};

// 9. Cancelled
exports.getCancelledReservations = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT r.*, u.name AS intern_name, s.seat_number
      FROM reservations r
      JOIN users u ON r.intern_id = u.id
      JOIN seats s ON r.seat_id = s.id
      WHERE r.status = 'cancelled'
      ORDER BY r.date DESC`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Error loading cancelled reservations', error: err.message });
  }
};

// 10. Get all seats for admin view
exports.getAllSeats = async (req, res) => {
  try {
    const [seats] = await db.query('SELECT * FROM seats ORDER BY location, seat_number');
    res.json(seats);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// 11. Get seats by floor for admin view with booking details
exports.getSeatsByFloor = async (req, res) => {
  const { floor, date } = req.query;
  if (!floor) {
    return res.status(400).json({ message: 'Floor parameter is required' });
  }

  try {
    // Use provided date or default to today
    const selectedDate = date || new Date().toISOString().slice(0, 10);

    const [seats] = await db.query(`
      SELECT s.*,
             CASE WHEN r.id IS NOT NULL THEN true ELSE false END as booked,
             r.intern_id,
             r.date as booking_date,
             r.start_time,
             r.end_time,
             r.status as booking_status,
             r.created_at as booking_created_at,
             u.name as intern_name
      FROM seats s
      LEFT JOIN reservations r ON s.id = r.seat_id 
                                 AND r.date = ?
                                 AND r.status = 'active'
      LEFT JOIN users u ON r.intern_id = u.id
      WHERE s.location = ?
      ORDER BY s.seat_number
    `, [selectedDate, floor]);

    // Format the response to include booking details when available
    const formattedSeats = seats.map(seat => ({
      id: seat.id,
      seat_number: seat.seat_number,
      location: seat.location,
      status: seat.status,
      booked: seat.booked,
      booking_details: seat.booked ? {
        intern_name: seat.intern_name,
        date: seat.booking_date,
        start_time: seat.start_time,
        end_time: seat.end_time,
        status: seat.booking_status,
        created_at: seat.booking_created_at
      } : null
    }));

    res.json(formattedSeats);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching seats', error: err.message });
  }
};

// ✅ EXPORT AS CSV
exports.exportReservationsCSV = async (req, res) => {
  try {
    const [data] = await db.query(`
      SELECT 
        r.id as 'Reservation ID',
        u.name as 'Intern Name', 
        s.seat_number as 'Seat Number',
        s.location as 'Floor/Location',
        r.date as 'Reservation Date', 
        r.start_time as 'Start Time', 
        r.end_time as 'End Time', 
        r.status as 'Status',
        r.created_at as 'Booking Date'
      FROM reservations r
      JOIN users u ON r.intern_id = u.id
      JOIN seats s ON r.seat_id = s.id
      ORDER BY r.date DESC
    `);

    // Add metadata header
    const csvData = [
      ['Seat Reservation System - All Reservations Report'],
      ['Generated on:', new Date().toLocaleDateString()],
      ['Generated at:', new Date().toLocaleTimeString()],
      ['Total Records:', data.length],
      [''], // Empty row
      ['Reservation ID', 'Intern Name', 'Seat Number', 'Floor/Location', 'Reservation Date', 'Start Time', 'End Time', 'Status', 'Booking Date'],
      ...data.map(row => [
        row['Reservation ID'],
        row['Intern Name'],
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
    res.setHeader('Content-disposition', 'attachment; filename=all_reservations.csv');
    res.set('Content-Type', 'text/csv');
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ message: 'CSV export failed', error: err.message });
  }
};

// ✅ EXPORT AS PDF
exports.exportReservationsPDF = async (req, res) => {
  try {
    const [data] = await db.query(`
      SELECT r.id, u.name as intern_name, s.seat_number, s.location, r.date, r.start_time, r.end_time, r.status, r.created_at
      FROM reservations r
      JOIN users u ON r.intern_id = u.id
      JOIN seats s ON r.seat_id = s.id
      ORDER BY r.date DESC
    `);

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    res.setHeader('Content-disposition', 'inline; filename=all_reservations.pdf');
    res.setHeader('Content-type', 'application/pdf');
    doc.pipe(res);

    // Header
    doc.fontSize(22).fillColor('#1a365d').text('SEAT RESERVATION REPORT', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#999999').text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' });
    doc.fontSize(10).fillColor('#999999').text(`Total Records: ${data.length}`, { align: 'center' });
    doc.moveDown(1);

    if (data.length === 0) {
      doc.fontSize(14).fillColor('#666666').text('No reservations found.', { align: 'center' });
      doc.end();
      return;
    }

    // Table setup
    const tableTop = doc.y;
    const tableLeft = 15;
    const colWidths = [30, 120, 55, 85, 85, 60, 60, 75];
    const headers = ['#', 'Intern Name', 'Seat', 'Floor', 'Date', 'Start', 'End', 'Status'];
    
    // Header background
    doc.rect(tableLeft, tableTop - 5, colWidths.reduce((a, b) => a + b, 0), 25).fillAndStroke('#1a365d', '#1a365d');
    
    // Header text
    let currentX = tableLeft;
    doc.fontSize(9).fillColor('white');
    headers.forEach((header, i) => {
      doc.text(header, currentX + 3, tableTop + 5, { width: colWidths[i] - 6, align: 'center' });
      currentX += colWidths[i];
    });

    // Table rows
    let currentY = tableTop + 25;
    doc.fontSize(8).fillColor('#333333');
    
    data.forEach((reservation, index) => {
      // Alternate row colors
      const rowColor = index % 2 === 0 ? '#f8f9fa' : '#ffffff';
      doc.rect(tableLeft, currentY - 2, colWidths.reduce((a, b) => a + b, 0), 18).fill(rowColor);
      
      // Row data
      const rowData = [
        (index + 1).toString(),
        reservation.intern_name,
        reservation.seat_number,
        reservation.location,
        new Date(reservation.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        reservation.start_time.slice(0, 5),
        reservation.end_time.slice(0, 5),
        reservation.status.toUpperCase()
      ];
      
      currentX = tableLeft;
      rowData.forEach((cell, i) => {
        const textColor = i === 7 ? (reservation.status === 'active' ? '#22c55e' : '#dc3545') : '#333333';
        doc.fillColor(textColor);
        doc.text(cell, currentX + 3, currentY + 2, { width: colWidths[i] - 6, align: 'center' });
        currentX += colWidths[i];
      });
      
      currentY += 18;
      
      // Add new page if needed
      if (currentY > 720) {
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