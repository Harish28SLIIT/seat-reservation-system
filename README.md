# Seat Reservation System

A comprehensive web-based seat reservation system for offices with real-time booking, email notifications, and admin management features.

## Features

### For Interns
- **Seat Booking**: Book seats by floor, date, and time
- **Manual Booking**: Interactive seat map for visual booking
- **Reservation Management**: View, edit, and cancel reservations
- **Email Notifications**: Automatic confirmation emails with calendar invites
- **SMS Reminders**: 1-hour advance reminders (Twilio integration)
- **Export Options**: Download reservation history as PDF or CSV
- **Biometric Login**: WebAuthn fingerprint authentication
- **Google Sign-In**: OAuth integration for quick access

### For Admins
- **Seat Management**: Add, edit, and delete seats
- **Real-time Monitoring**: View current usage and past reservations
- **Comprehensive Reports**: Export all reservation data
- **Floor-wise View**: Visual seat map for each floor
- **User Management**: Monitor intern activities

## Tech Stack

### Backend
- **Node.js** with Express.js
- **MySQL** database
- **JWT** authentication
- **WebAuthn** for biometric authentication
- **Nodemailer** for email notifications
- **Twilio** for SMS alerts
- **Node-cron** for scheduled reminders

### Frontend
- **HTML5/CSS3/JavaScript**
- **Firebase** for Google authentication
- **Responsive Design** with modern UI/UX

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- MySQL Server
- Gmail account (for email notifications)
- Twilio account (for SMS notifications)

### 1. Database Setup
```sql
-- Import the database schema
mysql -u root -p < backend/database_setup.sql
```

### 2. Backend Configuration
```bash
cd backend
npm install
```

Create a `.env` file in the backend directory:
```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=seat_reservation

# JWT Configuration
JWT_SECRET=your_secure_jwt_secret_key

# Email Configuration (Gmail)
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_gmail_app_password

# Twilio Configuration
TWILIO_SID=your_twilio_sid
TWILIO_AUTH=your_twilio_auth_token
TWILIO_PHONE=+1234567890

# Server Configuration
PORT=5000
```

### 3. Frontend Configuration
Update the Firebase configuration in `frontend/js/firebase.js` with your project credentials.

### 4. Start the Application
```bash
# Start backend server
cd backend
npm start

# Serve frontend (use Live Server or any web server)
# Open frontend/index.html in your browser
```

## Default Login Credentials
- **Admin**: admin@example.com / admin123
- **Users**: Register new accounts through the registration page

## Project Structure
```
seat-reservation-system/
├── backend/
│   ├── controllers/           # Business logic
│   ├── routes/               # API endpoints
│   ├── utils/                # Utility functions
│   ├── db.js                 # Database connection
│   ├── server.js             # Main server file
│   ├── reminderJob.js        # Cron job for reminders
│   └── database_setup.sql    # Database schema
├── frontend/
│   ├── css/                  # Stylesheets
│   ├── js/                   # JavaScript files
│   ├── videos/               # Background videos
│   └── *.html               # HTML pages
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Intern Operations
- `GET /api/intern/seats/available` - Get available seats
- `POST /api/intern/reserve` - Book a seat
- `GET /api/intern/my-reservations/:userId` - Get user reservations
- `PUT /api/intern/edit` - Edit reservation
- `DELETE /api/intern/cancel/:reservationId` - Cancel reservation

### Admin Operations
- `POST /api/admin/seat` - Add new seat
- `GET /api/admin/reservations` - Get all reservations
- `GET /api/admin/view-seats` - Get seats by floor
- `GET /api/admin/export/csv` - Export reservations as CSV
- `GET /api/admin/export/pdf` - Export reservations as PDF

### WebAuthn
- `POST /api/webauthn/register-options` - Get registration options
- `POST /api/webauthn/verify-registration` - Verify fingerprint registration
- `POST /api/webauthn/authenticate-options` - Get authentication options
- `POST /api/webauthn/verify-authentication` - Verify fingerprint login

## Features in Detail

### Email Notifications
- Automatic confirmation emails with calendar invites (.ics files)
- Cancellation notifications
- Update notifications for reservation changes

### SMS Reminders
- Automated 1-hour advance reminders
- Runs every 10 minutes via cron job
- Requires Twilio configuration

### Security Features
- JWT-based authentication
- Password hashing with bcrypt
- WebAuthn biometric authentication
- Input validation and sanitization

### Data Export
- PDF reports with formatted layouts
- CSV exports for data analysis
- Individual and bulk export options

## Development

### Adding New Features
1. Create controller functions in `backend/controllers/`
2. Add routes in `backend/routes/`
3. Update frontend JavaScript and HTML as needed
4. Test thoroughly before deployment

### Database Migrations
Add new schema changes to `database_setup.sql` and document them in version control.

## Troubleshooting

### Common Issues
1. **Database Connection Error**: Check MySQL credentials in `.env`
2. **Email Not Sending**: Verify Gmail app password setup
3. **SMS Not Working**: Check Twilio credentials and phone number format
4. **WebAuthn Issues**: Ensure HTTPS in production (localhost works for development)

### CORS Issues
If facing CORS issues, ensure the frontend is served from the same domain or configure CORS properly in the backend.

## Production Deployment

### Security Considerations
- Use HTTPS for all communications
- Set strong JWT secrets
- Configure proper CORS policies
- Use environment variables for all sensitive data
- Regular security updates for dependencies

### Performance Optimization
- Implement database indexing
- Add caching for frequently accessed data
- Optimize images and static assets
- Monitor server performance

## Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License
This project is licensed under the MIT License.

## Support
For support and questions, please create an issue in the repository or contact the development team.
