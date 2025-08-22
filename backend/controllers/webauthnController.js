const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse
} = require('@simplewebauthn/server');
const db = require('../db');

const challengeDB = {};  // Challenge storage (temporary for session)

exports.getRegistrationOptions = async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ message: 'Missing userId' });

  try {
    // Get user details from database
    const [users] = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const dbUser = users[0];
    const user = {
      id: Buffer.from(userId.toString()),
      name: dbUser.email,
      displayName: dbUser.name,
    };

               const options = generateRegistrationOptions({
             rpName: 'Seat Reservation System - SECURE',
             rpID: 'localhost',
             user,
             timeout: 60000,
             attestationType: 'direct', // ENHANCED: Request attestation for better security
             authenticatorSelection: {
               authenticatorAttachment: 'platform', // REQUIRED: Only Windows Hello hardware
               userVerification: 'required', // REQUIRED: Must verify user identity
               residentKey: 'required', // REQUIRED: Store credentials securely on device
               requireResidentKey: true, // ENHANCED: Force hardware storage
             },
             supportedAlgorithmIDs: [-7, -257], // Support for common algorithms
             excludeCredentials: [], // Don't exclude any existing credentials
           });

    challengeDB[userId] = options.challenge;
    res.json(options);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.verifyRegistration = async (req, res) => {
  const { userId, attestation } = req.body;
  const expectedChallenge = challengeDB[userId];

  try {
    const { verified, registrationInfo } = await verifyRegistrationResponse({
      response: attestation,
      expectedChallenge,
      expectedOrigin: ['http://localhost:5500', 'http://127.0.0.1:5500', 'http://localhost:3000'],
      expectedRPID: 'localhost',
    });

    if (verified) {
      const { credentialPublicKey, credentialID, counter } = registrationInfo;
      
      // Save to database
      await db.query(
        'INSERT INTO webauthn_credentials (user_id, credential_id, public_key, counter) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE public_key = ?, counter = ?',
        [userId, Buffer.from(credentialID), JSON.stringify(Array.from(credentialPublicKey)), counter, JSON.stringify(Array.from(credentialPublicKey)), counter]
      );
      
      return res.json({ success: true, message: 'WebAuthn credential registered successfully!' });
    }

    res.status(400).json({ success: false, message: 'Registration verification failed' });
  } catch (err) {
    console.error('WebAuthn registration error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getAuthenticationOptions = async (req, res) => {
  const { userId } = req.body;
  
  try {
    // Get user's WebAuthn credentials from database
    const [credentials] = await db.query('SELECT * FROM webauthn_credentials WHERE user_id = ?', [userId]);
    if (credentials.length === 0) {
      return res.status(404).json({ error: 'No WebAuthn credentials found for user' });
    }

    const allowCredentials = credentials.map(cred => ({
      id: cred.credential_id,
      type: 'public-key',
    }));

               const options = generateAuthenticationOptions({
             allowCredentials,
             userVerification: 'required', // Require biometric verification
             timeout: 60000,
             rpID: 'localhost',
           });

    challengeDB[userId] = options.challenge;
    res.json(options);
  } catch (err) {
    console.error('WebAuthn auth options error:', err);
    res.status(500).json({ error: 'Server error', message: err.message });
  }
};

exports.verifyAuthentication = async (req, res) => {
  const { userId, assertion } = req.body;
  const expectedChallenge = challengeDB[userId];

  try {
    // Get user's WebAuthn credential from database
    const [credentials] = await db.query('SELECT * FROM webauthn_credentials WHERE user_id = ?', [userId]);
    if (credentials.length === 0) {
      return res.status(404).json({ success: false, error: 'No credentials found' });
    }

    const credential = credentials[0];
    const authenticator = {
      credentialID: credential.credential_id,
      credentialPublicKey: new Uint8Array(JSON.parse(credential.public_key)),
      counter: credential.counter,
    };

    const { verified, authenticationInfo } = await verifyAuthenticationResponse({
      response: assertion,
      expectedChallenge,
      expectedOrigin: ['http://localhost:5500', 'http://127.0.0.1:5500', 'http://localhost:3000'],
      expectedRPID: 'localhost',
      authenticator,
    });

    if (verified) {
      // Update counter in database
      await db.query('UPDATE webauthn_credentials SET counter = ? WHERE user_id = ?', [authenticationInfo.newCounter, userId]);
      
      // Get user details for login
      const [users] = await db.query('SELECT id, name, email, role FROM users WHERE id = ?', [userId]);
      const user = users[0];
      
      return res.json({ 
        success: true, 
        message: 'WebAuthn authentication successful!',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    }

    res.status(400).json({ success: false, message: 'Authentication verification failed' });
  } catch (err) {
    console.error('WebAuthn authentication error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};