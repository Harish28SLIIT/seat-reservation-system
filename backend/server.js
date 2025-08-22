const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const os = require('os');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const internRoutes = require('./routes/intern');
const adminRoutes = require('./routes/admin');
const webauthnRoutes = require('./routes/webauthn');
const qrLoginRoutes = require('./routes/qrLogin');
require('./reminderJob');


const app = express();
app.use(cors());
app.use(bodyParser.json());

// Serve static files (frontend)
app.use(express.static(path.join(__dirname, '../frontend')));


// Health check endpoint
app.get('/api/auth/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Test endpoint
app.get('/test', (req, res) => {
  res.json({ 
    message: 'Seat Reservation System is working!', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/intern', internRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/webauthn', webauthnRoutes);
app.use('/api/qr-login', qrLoginRoutes);

// Root route - serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Catch-all route for SPA (Single Page Application) routing
app.get('*', (req, res) => {
  // If the request is for an API route, return 404
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  // Otherwise, serve the main page (for client-side routing)
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});


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

const PORT = process.env.PORT || 5000;
const localIP = getLocalIPAddress();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on:`);
  console.log(`   - Local: http://localhost:${PORT}`);
  console.log(`   - Network: http://${localIP}:${PORT}`);
  console.log(`   - QR Mobile URL: http://${localIP}:${PORT}/qr-login.html`);
  console.log(`\n📱 For QR Login:`);
  console.log(`   - Connect both devices to the same network (WiFi/Mobile Hotspot)`);
  console.log(`   - Open: http://localhost:${PORT}/index.html on computer`);
  console.log(`   - Scan QR code with mobile phone`);
});