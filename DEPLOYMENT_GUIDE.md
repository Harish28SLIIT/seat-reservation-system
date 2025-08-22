# 🚀 Deployment Guide - Seat Reservation System

## 📋 Complete Step-by-Step Guide

### **Step 1: GitHub Repository Setup**

1. **Install Git** (if not already installed):
   - Download from: https://git-scm.com/download/windows
   - Install with default settings

2. **Create GitHub Account**: 
   - Go to https://github.com
   - Sign up if you don't have an account

3. **Initialize Git Repository**:
   ```bash
   cd "C:\Users\Admin pc\Desktop\seat-reservation-system\seat-reservation-system"
   git init
   git add .
   git commit -m "Initial commit - Seat Reservation System"
   ```

4. **Create New Repository on GitHub**:
   - Go to https://github.com/new
   - Repository name: `seat-reservation-system`
   - Description: `A comprehensive seat reservation system with QR login and authentication`
   - Set to Public
   - Don't initialize with README (we already have files)
   - Click "Create repository"

5. **Push to GitHub**:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/seat-reservation-system.git
   git branch -M main
   git push -u origin main
   ```

### **Step 2: Railway.app Deployment**

1. **Sign up for Railway**:
   - Go to https://railway.app
   - Click "Start a New Project"
   - Sign up with GitHub account

2. **Deploy from GitHub**:
   - Click "Deploy from GitHub repo"
   - Select your `seat-reservation-system` repository
   - Click "Deploy Now"

3. **Add MySQL Database**:
   - In your Railway dashboard, click "New"
   - Select "Database" → "MySQL"
   - Database will be provisioned automatically

4. **Configure Environment Variables**:
   - Click on your web service
   - Go to "Variables" tab
   - Add these variables:

   ```
   NODE_ENV=production
   DB_HOST=${{MYSQL.MYSQL_HOST}}
   DB_USER=${{MYSQL.MYSQL_USER}}
   DB_PASSWORD=${{MYSQL.MYSQL_PASSWORD}}
   DB_NAME=${{MYSQL.MYSQL_DATABASE}}
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_app_password
   JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random
   WEBAUTHN_RP_NAME=Seat Reservation System
   WEBAUTHN_RP_ID=your-app-name.railway.app
   ```

5. **Initialize Database**:
   - Click on MySQL service
   - Go to "Connect" tab
   - Copy the "Connect URL"
   - Use MySQL Workbench or phpMyAdmin to connect
   - Run the SQL from `backend/updated_database_schema.sql`

6. **Get Your Live URL**:
   - Click on your web service
   - Go to "Settings" tab
   - Under "Domains", click "Generate Domain"
   - Your app will be live at: `https://your-app-name.railway.app`

### **Step 3: Domain Configuration (Optional)**

1. **Custom Domain**:
   - In Railway, go to your service settings
   - Click "Add Custom Domain"
   - Enter your domain (if you have one)

2. **Update WebAuthn RP ID**:
   - Change `WEBAUTHN_RP_ID` environment variable to your domain
   - Example: `myapp.com` or keep `your-app-name.railway.app`

### **Step 4: Testing Your Live Application**

1. **Access Your App**:
   - Visit: `https://your-app-name.railway.app`
   - All functionality should work exactly as localhost

2. **Test Features**:
   - ✅ User registration and login
   - ✅ QR code login (works across devices)
   - ✅ Admin dashboard
   - ✅ Seat reservations
   - ✅ Email notifications
   - ✅ Fingerprint authentication (on compatible devices)

### **Step 5: Email Configuration**

1. **Gmail App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
   - Use this password in `EMAIL_PASS` variable

2. **Alternative Email Services**:
   - **SendGrid**: Free tier (100 emails/day)
   - **Mailgun**: Free tier (10,000 emails/month)
   - **AWS SES**: Pay-as-you-go pricing

### **Step 6: Alternative Free Hosting Options**

#### **Option B: Render.com**

1. **Sign up**: https://render.com
2. **Connect GitHub repo**
3. **Add PostgreSQL database** (free tier)
4. **Modify database connection** (if needed)
5. **Deploy with same environment variables**

#### **Option C: Vercel + PlanetScale**

1. **Frontend on Vercel**:
   - Deploy `frontend/` folder to Vercel
   - Free tier with custom domains

2. **Backend on Railway**:
   - Deploy `backend/` separately
   - Update API URLs in frontend

3. **Database on PlanetScale**:
   - MySQL-compatible
   - Free tier: 1 database, 1 billion reads

### **Step 7: Monitoring & Maintenance**

1. **Railway Dashboard**:
   - Monitor CPU, memory, and network usage
   - View application logs
   - Set up alerts for errors

2. **Database Backup**:
   - Railway provides automatic backups
   - Can also export manually via MySQL tools

3. **Updates & Changes**:
   - Push changes to GitHub
   - Railway auto-deploys from main branch
   - Zero-downtime deployments

---

## 🔧 **Important Notes**

### **Free Tier Limitations**:
- **Railway**: $5/month credit (usually enough for small apps)
- **Database**: 500MB storage limit
- **Concurrent connections**: Limited

### **Security Considerations**:
- ✅ HTTPS automatically enabled
- ✅ Environment variables secured
- ✅ Database encrypted at rest
- ✅ WebAuthn requires HTTPS (works automatically)

### **Performance Optimization**:
- App sleeps after 30 minutes of inactivity
- Cold start time: 5-10 seconds
- Can upgrade to paid plan for always-on

---

## 🎉 **Your App Will Be Live At**:
`https://your-app-name.railway.app`

All users can access it from any device, anywhere in the world, with full functionality preserved including:
- QR login across devices
- Email notifications
- Database persistence
- Secure authentication
- Admin dashboard
- Real-time features

**No code changes needed** - your MySQL queries and structure remain exactly the same!
