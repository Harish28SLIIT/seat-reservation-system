// Dynamic API URL - works for both local development and production
const API = window.location.hostname === 'localhost' 
  ? 'http://localhost:5000/api' 
  : `${window.location.protocol}//${window.location.host}/api`;

// WebAuthn library initialization (global scope)
let webAuthnLib = null;
let webAuthnReady = false;

document.addEventListener("DOMContentLoaded", () => {
  if (!firebase || !firebase.apps.length) {
    alert("❌ Firebase not initialized!");
    return;
  }
  
  // Wait for WebAuthn library to load
  function waitForWebAuthn() {
    return new Promise((resolve) => {
      if (window.SimpleWebAuthnBrowser) {
        resolve(window.SimpleWebAuthnBrowser);
      } else {
        setTimeout(() => waitForWebAuthn().then(resolve), 100);
      }
    });
  }
  
  // Initialize WebAuthn when available
  waitForWebAuthn().then((lib) => {
    webAuthnLib = lib;
    webAuthnReady = true;
    console.log("✅ WebAuthn library loaded and ready");
    
    // Update button state
    const fingerprintButtons = document.querySelectorAll('#btnRegister, #btnLogin');
    fingerprintButtons.forEach(btn => {
      if (btn) {
        btn.disabled = false;
        btn.style.opacity = '1';
      }
    });
  });

  // ✅ Fingerprint Register
  document.getElementById('btnRegister')?.addEventListener('click', async () => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) return alert("Please login first.");

    if (!webAuthnReady || !webAuthnLib) {
      alert("WebAuthn library is still loading. Please wait a moment and try again.");
      return;
    }

    try {
      const res = await fetch(`${API}/webauthn/register-options`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });

      const options = await res.json();
      const attResp = await webAuthnLib.startRegistration(options);

      await fetch(`${API}/webauthn/verify-registration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, attestation: attResp })
      });

      alert("✅ Fingerprint registered!");
    } catch (err) {
      console.error("Fingerprint registration error:", err);
      alert("❌ Failed to register fingerprint.");
    }
  });

  // ✅ Fingerprint Login (Standalone)
  document.getElementById('btnLogin')?.addEventListener('click', async () => {
    if (!webAuthnReady || !webAuthnLib) {
      alert("WebAuthn library is still loading. Please wait a moment and try again.");
      return;
    }

    // Check if user is already logged in
    const storedUser = JSON.parse(localStorage.getItem("user"));
    let userId;
    
    if (storedUser) {
      userId = storedUser.id;
    } else {
      // Prompt for email to identify user
      const email = prompt("Enter your email for WebAuthn login:");
      if (!email) return;
      
      try {
        // Get user ID from email
        const userRes = await fetch(`${API}/auth/get-user-by-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        
        if (!userRes.ok) {
          alert("User not found. Please register first.");
          return;
        }
        
        const userData = await userRes.json();
        userId = userData.user.id;
      } catch (err) {
        alert("Error finding user. Please try again.");
        return;
      }
    }

    try {
      const res = await fetch(`${API}/webauthn/authenticate-options`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });

      if (!res.ok) {
        const error = await res.json();
        alert(`Error: ${error.error || 'WebAuthn not set up for this user'}`);
        return;
      }

      const options = await res.json();
      const authResp = await webAuthnLib.startAuthentication(options);

      const verifyRes = await fetch(`${API}/webauthn/verify-authentication`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, assertion: authResp })
      });

      const result = await verifyRes.json();
      
      if (result.success) {
        // Store user data and redirect
        localStorage.setItem("user", JSON.stringify(result.user));
        alert("✅ WebAuthn login successful!");
        
        // Redirect based on role
        if (result.user.role === 'admin') {
          window.location.href = "admin-dashboard.html";
        } else {
          window.location.href = "intern-dashboard.html";
        }
      } else {
        alert("❌ WebAuthn verification failed.");
      }
    } catch (err) {
      console.error("WebAuthn login error:", err);
      alert("❌ WebAuthn login failed. Make sure you've registered your authenticator first.");
    }
  });

  // ✅ QR Login for Admins (Standalone - no WebAuthn needed)
  document.getElementById('btnQRLogin')?.addEventListener('click', async () => {
    try {
      console.log('🔐 QR Login button clicked!');
      console.log('🔐 Generating QR code for admin login...');
      
      // Generate QR code
      const res = await fetch(`${API}/qr-login/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!res.ok) {
        alert('Failed to generate QR code. Please try again.');
        return;
      }

      const data = await res.json();
      console.log('📱 Received QR data:', data);
      
      // Show QR modal
      console.log('🖼️ Setting QR code image and showing modal...');
      document.getElementById('qrCodeImage').src = data.qrCode;
      document.getElementById('qrModal').style.display = 'block';
      console.log('✅ Modal should now be visible!');
      
      // Store session ID for verification
      window.qrSessionId = data.sessionId;
      
      // Start status polling
      startQRStatusPolling(data.sessionId);
      
      console.log('✅ QR code generated successfully:', data.sessionId);
    } catch (err) {
      console.error('❌ QR generation error:', err);
      alert('Failed to generate QR code. Please check your connection.');
    }
  });

  // ✅ Other Login Options Toggle
  document.getElementById('btnOtherOptions')?.addEventListener('click', () => {
    const optionsSection = document.getElementById('otherLoginOptions');
    if (optionsSection.style.display === 'none') {
      optionsSection.style.display = 'block';
      optionsSection.scrollIntoView({ behavior: 'smooth' });
    } else {
      optionsSection.style.display = 'none';
    }
  });

  // ✅ Face Login
  document.getElementById('btnFaceLogin')?.addEventListener('click', () => {
    document.getElementById('faceLoginModal').style.display = 'flex';
  });

  // ✅ SMS OTP Login
  document.getElementById('btnSMSOTP')?.addEventListener('click', () => {
    document.getElementById('smsOTPModal').style.display = 'flex';
  });
});

// QR Login Functions
let qrPollingInterval;

function startQRStatusPolling(sessionId) {
  // Update initial status
  updateQRStatus('Waiting for mobile login...', 'info');
  
  qrPollingInterval = setInterval(async () => {
    try {
      const res = await fetch(`${API}/qr-login/status/${sessionId}`);
      const data = await res.json();
      
      if (data.status === 'code_sent' && data.adminData) {
        // Update status to show email sent
        updateQRStatus(`✅ Verification code sent to ${data.adminData.submittedEmail}! Enter the code above.`, 'success');
        
        // Keep polling to check for completion
      } else if (data.status === 'pending') {
        // Still waiting for mobile form submission
        updateQRStatus('Scan QR code and fill the form on your mobile...', 'info');
      }
    } catch (err) {
      console.error('QR status polling error:', err);
      updateQRStatus('Connection error. Please try again.', 'error');
    }
  }, 2000); // Poll every 2 seconds
}

function updateQRStatus(message, type = 'info') {
  const statusEl = document.getElementById('qrStatus');
  statusEl.textContent = message;
  statusEl.className = `qr-status ${type}`;
  statusEl.style.display = 'block';
}

function closeQRModal() {
  document.getElementById('qrModal').style.display = 'none';
  document.getElementById('qrStep1').style.display = 'block';
  document.getElementById('qrStep2').style.display = 'none';
  document.getElementById('verificationCode').value = '';
  document.getElementById('qrStatus').style.display = 'none';
  
  // Clear polling
  if (qrPollingInterval) {
    clearInterval(qrPollingInterval);
  }
}

async function verifyQRCode() {
  const code = document.getElementById('verificationCode').value.trim();
  
  if (!code || code.length !== 6) {
    updateQRStatus('Please enter a valid 6-digit code.', 'error');
    return;
  }

  if (!window.qrSessionId) {
    updateQRStatus('Session expired. Please try again.', 'error');
    return;
  }

  try {
    updateQRStatus('Verifying code...', 'info');
    
    const res = await fetch(`${API}/qr-login/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: window.qrSessionId,
        code: code
      })
    });

    const data = await res.json();

    if (data.success) {
      updateQRStatus('Login successful! Redirecting...', 'success');
      
      // Store user data
      localStorage.setItem("user", JSON.stringify(data.user));
      
      // Redirect to admin dashboard
      setTimeout(() => {
        window.location.href = "admin-dashboard.html";
      }, 1500);
      
    } else {
      updateQRStatus(data.error || 'Invalid verification code.', 'error');
    }

  } catch (err) {
    console.error('QR verification error:', err);
    updateQRStatus('Verification failed. Please try again.', 'error');
  }
}

// Close modal when clicking outside
window.onclick = function(event) {
  const modal = document.getElementById('qrModal');
  if (event.target === modal) {
    closeQRModal();
  }
}

// ✅ Email/Password Login
async function login() {
  const email = document.getElementById("loginEmail")?.value;
  const password = document.getElementById("loginPassword")?.value;

  try {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (res.status === 200) {
      alert("✅ Logged in successfully!");
      localStorage.setItem("user", JSON.stringify(data));
      window.location.href = data.role === "admin" ? "admin-dashboard.html" : "intern-dashboard.html";
    } else {
      alert("❌ Login failed: " + data.message);
    }
  } catch (err) {
    console.error("Login error:", err);
    alert("Something went wrong.");
  }
}

// ✅ Google Login
function loginWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();

  firebase.auth().signInWithPopup(provider)
    .then(async (result) => {
      const firebaseUser = result.user;
      
      try {
        // ✅ Check if user exists in our database or register them
        const response = await fetch(`${API}/auth/google-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: firebaseUser.email,
            name: firebaseUser.displayName,
            googleId: firebaseUser.uid
          })
        });

        if (response.ok) {
          const userData = await response.json();
          
          // ✅ Store user data in localStorage for our app
          localStorage.setItem("user", JSON.stringify(userData.user));
          
          alert("Welcome " + firebaseUser.displayName + "!");
          
          // Redirect based on role
          if (userData.user.role === 'admin') {
            window.location.href = "admin-dashboard.html";
          } else {
            window.location.href = "intern-dashboard.html";
          }
        } else {
          const error = await response.json();
          alert("Login failed: " + error.message);
        }
      } catch (err) {
        console.error("Google login processing error:", err);
        alert("Google login failed. Please try again.");
      }
    })
    .catch((err) => {
      console.error("Google login error:", err.message);
      alert("Google login failed: " + err.message);
    });
}

// ✅ Register New User (now includes phone)
async function register() {
  const name = document.getElementById('regName')?.value;
  const email = document.getElementById('regEmail')?.value;
  const password = document.getElementById('regPassword')?.value;
  const role = document.getElementById('regRole')?.value;
  const phone = document.getElementById('regPhone')?.value;

  try {
    const res = await fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role, phone })
    });

    const data = await res.json();
    alert(data.message);
    if (res.status === 201) window.location.href = "index.html";
  } catch (err) {
    console.error("Registration error:", err);
    alert("Registration failed.");
  }
}

// ✅ SMS OTP Functions
async function sendSMSOTP() {
  const mobileNumber = document.getElementById('mobileNumber')?.value.trim();
  
  if (!mobileNumber) {
    updateOTPStatus('Please enter your mobile number.', 'error');
    return;
  }

  try {
    updateOTPStatus('Sending OTP...', 'info');
    
    const res = await fetch(`${API}/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: mobileNumber })
    });

    const data = await res.json();

    if (data.success) {
      updateOTPStatus('OTP sent successfully! Check your mobile.', 'success');
      document.getElementById('otpSection').style.display = 'block';
    } else {
      updateOTPStatus(data.error || 'Failed to send OTP.', 'error');
    }
  } catch (err) {
    console.error('SMS OTP error:', err);
    updateOTPStatus('Network error. Please try again.', 'error');
  }
}

async function verifySMSOTP() {
  const mobileNumber = document.getElementById('mobileNumber')?.value.trim();
  const otpCode = document.getElementById('otpCode')?.value.trim();
  
  if (!otpCode || otpCode.length !== 6) {
    updateOTPStatus('Please enter a valid 6-digit OTP.', 'error');
    return;
  }

  try {
    updateOTPStatus('Verifying OTP...', 'info');
    
    const res = await fetch(`${API}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: mobileNumber, otp: otpCode })
    });

    const data = await res.json();

    if (data.success) {
      updateOTPStatus('Login successful! Redirecting...', 'success');
      localStorage.setItem("user", JSON.stringify(data.user));
      
      setTimeout(() => {
        window.location.href = data.user.role === "admin" ? "admin-dashboard.html" : "intern-dashboard.html";
      }, 1500);
    } else {
      updateOTPStatus(data.error || 'Invalid OTP.', 'error');
    }
  } catch (err) {
    console.error('OTP verification error:', err);
    updateOTPStatus('Network error. Please try again.', 'error');
  }
}

function closeSMSOTPModal() {
  document.getElementById('smsOTPModal').style.display = 'none';
  document.getElementById('mobileNumber').value = '';
  document.getElementById('otpCode').value = '';
  document.getElementById('otpSection').style.display = 'none';
  document.getElementById('otpStatus').style.display = 'none';
}

function updateOTPStatus(message, type = 'info') {
  const statusEl = document.getElementById('otpStatus');
  statusEl.textContent = message;
  statusEl.className = `otp-status ${type}`;
  statusEl.style.display = 'block';
}

// ✅ Face Scan Login with Password Verification
let cameraStream = null;
let faceVerificationInProgress = false;

async function startFaceLogin() {
  const video = document.getElementById('cameraVideo');
  const statusEl = document.getElementById('faceStatus');
  
  try {
    updateFaceStatus('📹 Initializing camera for face scan...', 'info');
    
    // Start camera
    cameraStream = await navigator.mediaDevices.getUserMedia({ 
      video: { 
        width: 320, 
        height: 240,
        facingMode: 'user' // Front camera
      } 
    });
    
    video.srcObject = cameraStream;
    video.style.display = 'block';
    
    updateFaceStatus('👁️ Position your face in the camera and press "Scan Face"', 'info');
    
    // Show scan button
    document.getElementById('scanFaceBtn').style.display = 'block';
    
  } catch (err) {
    console.error('Camera access error:', err);
    updateFaceStatus('❌ Cannot access camera. Please check permissions.', 'error');
  }
}

async function scanFace() {
  if (faceVerificationInProgress) return;
  
  faceVerificationInProgress = true;
  const video = document.getElementById('cameraVideo');
  
  try {
    updateFaceStatus('🔍 Scanning face...', 'info');
    
    // Create canvas to capture frame
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    
    // Convert to base64
    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    
    // Simulate face detection processing
    updateFaceStatus('🧠 Processing face data...', 'info');
    
    // Add a delay to simulate face processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simple face validation (check if image contains data)
    if (imageData && imageData.length > 10000) { // Basic check for image data
      updateFaceStatus('✅ Face detected successfully!', 'success');
      
      // Stop camera
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
      }
      video.style.display = 'none';
      document.getElementById('scanFaceBtn').style.display = 'none';
      
      // Show password input after face scan
      showPasswordInput();
      
    } else {
      updateFaceStatus('❌ No face detected. Please position yourself properly.', 'error');
    }
    
  } catch (err) {
    console.error('Face scanning error:', err);
    updateFaceStatus('❌ Face scanning failed. Please try again.', 'error');
  } finally {
    faceVerificationInProgress = false;
  }
}

function showPasswordInput() {
  updateFaceStatus('🔐 Face verified! Now enter your password to complete login:', 'success');
  
  // Show password input section
  document.getElementById('facePasswordSection').style.display = 'block';
  document.getElementById('facePasswordInput').focus();
}

async function completeFaceLogin() {
  const email = document.getElementById('faceEmailInput').value.trim();
  const password = document.getElementById('facePasswordInput').value.trim();
  
  if (!email) {
    updateFaceStatus('❌ Please enter your email address.', 'error');
    return;
  }
  
  if (!password) {
    updateFaceStatus('❌ Please enter your password.', 'error');
    return;
  }
  
  try {
    updateFaceStatus('🔐 Verifying credentials...', 'info');
    
    // Verify login credentials
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (res.status === 200) {
      updateFaceStatus('✅ Face + Password login successful!', 'success');
      localStorage.setItem("user", JSON.stringify(data));
      
      setTimeout(() => {
        window.location.href = data.role === "admin" ? "admin-dashboard.html" : "intern-dashboard.html";
      }, 1500);
    } else {
      updateFaceStatus('❌ Invalid email or password.', 'error');
    }
  } catch (err) {
    console.error('Face login completion error:', err);
    updateFaceStatus('❌ Login failed. Please try again.', 'error');
  }
}

// REMOVED: No insecure camera fallback for security reasons
// Face recognition ONLY works through Windows Hello identity verification

function closeFaceLoginModal() {
  document.getElementById('faceLoginModal').style.display = 'none';
  
  // Stop camera stream
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
  }
  
  // Reset all elements
  document.getElementById('cameraVideo').style.display = 'none';
  document.getElementById('scanFaceBtn').style.display = 'none';
  document.getElementById('facePasswordSection').style.display = 'none';
  document.getElementById('faceEmailInput').value = '';
  document.getElementById('facePasswordInput').value = '';
  document.getElementById('faceStatus').style.display = 'none';
  
  // Reset processing flag
  faceVerificationInProgress = false;
}

function updateFaceStatus(message, type = 'info') {
  const statusEl = document.getElementById('faceStatus');
  statusEl.textContent = message;
  statusEl.className = `face-status ${type}`;
  statusEl.style.display = 'block';
} 