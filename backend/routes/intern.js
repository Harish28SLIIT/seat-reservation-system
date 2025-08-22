const express = require('express');
const router = express.Router();
const internController = require('../controllers/internController');

// Intern Routes
router.get('/seats/by-floor', internController.getSeatsByFloor);
router.get('/seats/available', internController.getSeatsByFloorDateTime);
router.post('/reserve', internController.reserveSeat);
router.get('/my-reservations/:userId', internController.getMyReservations);
router.get('/past-reservations/:userId', internController.getPastReservations);
router.delete('/cancel/:reservationId', internController.cancelReservation);
router.put('/edit', internController.editReservation);
router.get('/manual-seats', internController.getManualSeats);
router.get('/my-reservations/export/:userId', internController.exportMyReservationsCSV);
router.get('/my-reservations/export/pdf/:userId', internController.exportMyReservationsPDF);


module.exports = router;