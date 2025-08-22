const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const sendMail = require('../utils/mailer');
const os = require('os');
require('dotenv').config();

// Store QR login sessions temporarily (in production, use Redis)
const qrSessions = new Map();
const verificationCodes = new Map();

// Function to get local IP address dynamically
function getLocalIPAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost'; // fallback
}

// 1. Generate QR Code for Admin Login
exports.generateQRCode = async (req, res) => {
  try {
    // Generate unique session ID
    const sessionId = uuidv4();
    
    // Get dynamic IP address for mobile access (works with WiFi, mobile hotspot, etc.)
    const localIP = getLocalIPAddress();
    const port = process.env.PORT || 5000;
    const mobileUrl = `http://${localIP}:${port}/qr-login.html?session=${sessionId}`;
    
    console.log(`📱 Generated QR code for mobile access: ${mobileUrl}`);
    
    const qrData = {
      type: 'admin_qr_login',
      sessionId: sessionId,
      url: mobileUrl,
      timestamp: new Date().toISOString()
    };

    // Store session (expires in 5 minutes)
    qrSessions.set(sessionId, {
      status: 'pending',
      createdAt: Date.now(),
      expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes
    });

    // Generate QR code with just the mobile URL
    const qrCodeDataURL = await QRCode.toDataURL(mobileUrl);

    res.json({
      success: true,
      sessionId: sessionId,
      qrCode: qrCodeDataURL,
      expiresIn: 300 // 5 minutes in seconds
    });

    // Clean up expired sessions
    setTimeout(() => {
      qrSessions.delete(sessionId);
    }, 5 * 60 * 1000);

  } catch (err) {
    console.error('QR generation error:', err);
    res.status(500).json({ success: false, error: 'Failed to generate QR code' });
  }
};

// 2. Handle Mobile Form Submission
exports.submitQRLogin = async (req, res) => {
  const { sessionId, adminId, email } = req.body;

  if (!sessionId || !adminId || !email) {
    return res.status(400).json({ 
      success: false, 
      error: 'All fields are required (sessionId, adminId, email)' 
    });
  }

  try {
    // Check if session exists and is valid
    const session = qrSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ 
        success: false, 
        error: 'Invalid or expired QR session' 
      });
    }

    if (Date.now() > session.expiresAt) {
      qrSessions.delete(sessionId);
      return res.status(410).json({ 
        success: false, 
        error: 'QR session expired' 
      });
    }

    // Verify admin exists in database with given ID
    const [admins] = await db.query(
      'SELECT * FROM users WHERE id = ? AND role = "admin"', 
      [adminId]
    );

    if (admins.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Admin ID not found or user is not an admin' 
      });
    }

    const admin = admins[0];

    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store verification code (expires in 10 minutes)
    verificationCodes.set(sessionId, {
      code: verificationCode,
      adminId: adminId,
      submittedEmail: email,
      actualAdmin: admin,
      createdAt: Date.now(),
      expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
    });

    // Update session status
    session.status = 'code_sent';
    session.adminData = {
      id: adminId,
      submittedEmail: email,
      actualName: admin.name,
      actualEmail: admin.email
    };

    // Send verification email
    const emailSubject = '🔐 QR Login Verification Code - Seat Reservation System';
    const emailHTML = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🔐 QR Login Verification</h1>
        </div>
        <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <h2 style="color: #333; margin-top: 0;">Admin QR Login Attempt</h2>
          <p style="color: #666; font-size: 16px; line-height: 1.6;">
            Hello, someone is attempting to log in as an admin using QR code authentication.
          </p>
          
          <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
            <h3 style="color: #333; margin: 0 0 10px 0;">Login Details:</h3>
            <p style="margin: 5px 0; color: #666;"><strong>Admin ID:</strong> ${adminId}</p>
            <p style="margin: 5px 0; color: #666;"><strong>Admin Name:</strong> ${admin.name}</p>
            <p style="margin: 5px 0; color: #666;"><strong>Email Used:</strong> ${email}</p>
            <p style="margin: 5px 0; color: #666;"><strong>Time:</strong> ${new Date().toLocaleString()}</p>
          </div>

          <div style="background: #f0fdf4; padding: 25px; border-radius: 8px; margin: 20px 0; text-align: center; border-left: 4px solid #10b981;">
            <h3 style="color: #333; margin: 0 0 15px 0;">Your Verification Code:</h3>
            <div style="font-size: 32px; font-weight: bold; color: #059669; letter-spacing: 8px; margin: 10px 0;">
              ${verificationCode}
            </div>
            <p style="color: #666; margin: 10px 0; font-size: 14px;">
              Enter this code on your computer to complete the login.
            </p>
          </div>

          <div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
            <p style="color: #dc2626; margin: 0; font-size: 14px;">
              <strong>Security Notice:</strong> If you didn't initiate this login, please ignore this email and contact your system administrator.
            </p>
          </div>

          <p style="color: #666; font-size: 14px; margin-top: 20px;">
            This code expires in 10 minutes.
          </p>
        </div>
      </div>
    `;

    await sendMail(email, emailSubject, emailHTML);
    console.log(`📱 QR login verification code sent to ${email}`);

    // Clean up verification code after expiry
    setTimeout(() => {
      verificationCodes.delete(sessionId);
    }, 10 * 60 * 1000);

    res.json({
      success: true,
      message: 'Verification code sent to your email. Please check your inbox and enter the code on your computer.',
      codeLength: 6,
      expiresIn: 600 // 10 minutes
    });

  } catch (err) {
    console.error('QR login submission error:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to process QR login request' 
    });
  }
};

// 3. Verify Code and Complete Login
exports.verifyQRCode = async (req, res) => {
  const { sessionId, code } = req.body;

  if (!sessionId || !code) {
    return res.status(400).json({ 
      success: false, 
      error: 'Session ID and verification code are required' 
    });
  }

  try {
    // Check verification code
    const verification = verificationCodes.get(sessionId);
    if (!verification) {
      return res.status(404).json({ 
        success: false, 
        error: 'Invalid session or verification code expired' 
      });
    }

    if (Date.now() > verification.expiresAt) {
      verificationCodes.delete(sessionId);
      return res.status(410).json({ 
        success: false, 
        error: 'Verification code expired' 
      });
    }

    if (verification.code !== code.toString()) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid verification code' 
      });
    }

    // Code is valid - complete login
    const admin = verification.actualAdmin;
    
    // Clean up
    verificationCodes.delete(sessionId);
    qrSessions.delete(sessionId);

    // Send login success email notification
    const successEmailHTML = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">✅ QR Login Successful</h1>
        </div>
        <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <p style="color: #666; font-size: 16px;">
            Hello ${admin.name}, you have successfully logged in using QR code authentication.
          </p>
          <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Login Time:</strong> ${new Date().toLocaleString()}</p>
            <p style="margin: 5px 0;"><strong>Method:</strong> QR Code Authentication</p>
            <p style="margin: 5px 0;"><strong>Email Used:</strong> ${verification.submittedEmail}</p>
          </div>
        </div>
      </div>
    `;

    await sendMail(verification.submittedEmail, '✅ QR Login Successful - Seat Reservation System', successEmailHTML);

    res.json({
      success: true,
      message: 'QR login successful!',
      user: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      }
    });

  } catch (err) {
    console.error('QR verification error:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to verify code' 
    });
  }
};

// 4. Check QR Session Status (for polling)
exports.checkQRStatus = async (req, res) => {
  const { sessionId } = req.params;

  try {
    const session = qrSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ 
        success: false, 
        status: 'not_found' 
      });
    }

    if (Date.now() > session.expiresAt) {
      qrSessions.delete(sessionId);
      return res.status(410).json({ 
        success: false, 
        status: 'expired' 
      });
    }

    res.json({
      success: true,
      status: session.status,
      adminData: session.adminData || null
    });

  } catch (err) {
    console.error('QR status check error:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to check status' 
    });
  }
};