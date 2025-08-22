const express = require('express');
const router = express.Router();
const webauthnController = require('../controllers/webauthnController');

// WebAuthn Routes
router.post('/register-options', webauthnController.getRegistrationOptions);
router.post('/verify-registration', webauthnController.verifyRegistration);
router.post('/authenticate-options', webauthnController.getAuthenticationOptions);
router.post('/verify-authentication', webauthnController.verifyAuthentication);

module.exports = router;