const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');

// ✅ REGISTER
router.post('/register', async (req, res) => {
  const { name, email, password, role, phone } = req.body;
  console.log('🔁 Registration request received:', req.body);

  try {
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const [existing] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      console.log('⚠️ Email already registered:', email);
      return res.status(409).json({ message: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.execute(
      'INSERT INTO users (name, email, password, role, phone) VALUES (?, ?, ?, ?, ?)',
      [name, email, hashedPassword, role, phone]
    );

    console.log('✅ New user registered:', email);
    res.status(201).json({ message: 'Registration successful' });
  } catch (err) {
    console.error('❌ Registration error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ✅ LOGIN
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  console.log('🔁 Login request received:', req.body);

  try {
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const [users] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      console.log('⚠️ User not found:', email);
      return res.status(400).json({ message: 'User not found' });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('⛔ Incorrect password for:', email);
      return res.status(401).json({ message: 'Invalid password' });
    }

    console.log('✅ Login successful for:', email);
    res.status(200).json({
      message: 'Login successful',
      role: user.role,
      name: user.name,
      email: user.email,
      id: user.id,
      phone: user.phone || null
    });
  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ✅ GET USER BY EMAIL (for WebAuthn)
router.post('/get-user-by-email', async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    const [users] = await db.execute('SELECT id, name, email, role FROM users WHERE email = ?', [email]);
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ 
      success: true, 
      user: {
        id: users[0].id,
        name: users[0].name,
        email: users[0].email,
        role: users[0].role
      }
    });
  } catch (err) {
    console.error('❌ Get user by email error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ✅ GOOGLE LOGIN (register or login with Google)
router.post('/google-login', async (req, res) => {
  const { email, name, googleId } = req.body;
  console.log('🔁 Google login request received:', { email, name });

  try {
    if (!email || !name || !googleId) {
      return res.status(400).json({ message: 'Google user data is incomplete' });
    }

    // Check if user already exists
    const [existingUsers] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
    
    if (existingUsers.length > 0) {
      // User exists, log them in
      const user = existingUsers[0];
      console.log('✅ Google login successful for existing user:', email);
      
      res.status(200).json({
        message: 'Google login successful',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone || null
        }
      });
    } else {
      // User doesn't exist, create new intern account
      await db.execute(
        'INSERT INTO users (name, email, password, role, phone) VALUES (?, ?, ?, ?, ?)',
        [name, email, 'google_auth', 'intern', null]
      );

      // Get the newly created user
      const [newUsers] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
      const newUser = newUsers[0];

      console.log('✅ New Google user registered and logged in:', email);
      
      res.status(201).json({
        message: 'Google login successful - account created',
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          phone: newUser.phone || null
        }
      });
    }
  } catch (err) {
    console.error('❌ Google login error:', err);
    res.status(500).json({ message: 'Server error during Google login' });
  }
});

module.exports = router;