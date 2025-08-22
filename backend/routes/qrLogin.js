const express = require('express');
const router = express.Router();
const qrLoginController = require('../controllers/qrLoginController');

// QR Login Routes

// 1. Generate QR Code for Admin Login
router.post('/generate', qrLoginController.generateQRCode);

// 2. Submit QR Login Form (from mobile)
router.post('/submit', qrLoginController.submitQRLogin);

// 3. Verify Code and Complete Login
router.post('/verify', qrLoginController.verifyQRCode);

// 4. Check QR Session Status (for polling)
router.get('/status/:sessionId', qrLoginController.checkQRStatus);

module.exports = router;