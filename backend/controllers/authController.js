const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { notifyUserRegistration } = require('../utils/emailNotifications');
const { smsNotifications } = require('../utils/smsNotifications');
require('dotenv').config();

exports.register = async (req, res) => {
  const { name, email, password, role, phone } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  if (role !== 'intern' && role !== 'admin') {
    return res.status(400).json({ message: 'Role must be intern or admin' });
  }

  try {
    // Check for existing user
    const [user] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (user.length > 0) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    await db.query('INSERT INTO users (name, email, password, role, phone) VALUES (?, ?, ?, ?, ?)', [
      name,
      email,
      hashedPassword,
      role,
      phone || null
    ]);

    // Send registration email notification
    await notifyUserRegistration({ name, email, role });
    console.log(`📧 Registration notification sent to ${email}`);

    // Send registration SMS notification
    if (phone) {
      await smsNotifications.userRegistration({ name, email, role, phone });
      console.log(`📱 Registration SMS sent to ${phone}`);
    }

    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get user by email (for WebAuthn)
exports.getUserByEmail = async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    const [users] = await db.query('SELECT id, name, email, role FROM users WHERE email = ?', [email]);
    
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
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const [user] = await db.query('SELECT * FROM users WHERE email = ?', [email]);

    if (user.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const validPass = await bcrypt.compare(password, user[0].password);
    if (!validPass) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Create JWT token
    const token = jwt.sign(
      { id: user[0].id, role: user[0].role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user[0].id,
        name: user[0].name,
        role: user[0].role,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get user by email (for WebAuthn)
exports.getUserByEmail = async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    const [users] = await db.query('SELECT id, name, email, role FROM users WHERE email = ?', [email]);
    
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
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};