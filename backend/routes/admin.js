const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// Seat management
router.post('/seat', adminController.addSeat);
router.put('/seat/:seatId', adminController.updateSeat);
router.delete('/seat/:seatId', adminController.deleteSeat);

// Reservations
router.get('/reservations', adminController.getAllReservations);
router.get('/reservations/:internId', adminController.getInternReservations);

// Seat viewing
router.get('/seats', adminController.getAllSeats);
router.get('/view-seats', adminController.getSeatsByFloor);

// Reports
router.get('/reports', adminController.generateReport);
router.get('/used-seats', adminController.getUsedSeats);
router.get('/current-seats', adminController.getCurrentUsage);
router.get('/cancelled-reservations', adminController.getCancelledReservations);

router.get('/export/csv', adminController.exportReservationsCSV);
router.get('/export/pdf', adminController.exportReservationsPDF);

module.exports = router;