const sendMail = require('./mailer');

// Email notification functions with styled templates

const notifySeatReserved = async (reservation, user) => {
  const { seat_number, date, start_time, end_time, location } = reservation;
  const { name, email } = user;

  const subject = '✅ Seat Reserved Successfully';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 28px;">✅ Seat Reserved!</h1>
      </div>
      
      <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
        <p style="font-size: 18px; margin-bottom: 25px;">Hi <strong>${name}</strong>,</p>
        
        <p style="font-size: 16px; margin-bottom: 30px;">Your seat reservation has been confirmed! Here are the details:</p>
        
        <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 25px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 12px 0; font-weight: bold; color: #555;">🪑 Seat:</td>
              <td style="padding: 12px 0; color: #333;">${seat_number}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 12px 0; font-weight: bold; color: #555;">📍 Location:</td>
              <td style="padding: 12px 0; color: #333;">${location}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 12px 0; font-weight: bold; color: #555;">📅 Date:</td>
              <td style="padding: 12px 0; color: #333;">${date}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 12px 0; font-weight: bold; color: #555;">⏰ Time:</td>
              <td style="padding: 12px 0; color: #333;">${start_time} - ${end_time}</td>
            </tr>
          </table>
        </div>
        
        <div style="background: #d4edda; color: #155724; padding: 15px; border-radius: 5px; border-left: 4px solid #28a745;">
          <strong>📋 Important Reminders:</strong>
          <ul style="margin: 10px 0 0 20px;">
            <li>Please arrive on time</li>
            <li>Cancel if you can't make it</li>
            <li>Follow office guidelines</li>
          </ul>
        </div>
      </div>
    </div>
  `;

  await sendMail(email, subject, html);
};

const notifyReservationCancelled = async (reservation, user) => {
  const { seat_number, date, start_time, end_time } = reservation;
  const { name, email } = user;

  const subject = '❌ Reservation Cancelled';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 28px;">❌ Reservation Cancelled</h1>
      </div>
      
      <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
        <p style="font-size: 18px; margin-bottom: 25px;">Hi <strong>${name}</strong>,</p>
        
        <p style="font-size: 16px; margin-bottom: 30px;">Your seat reservation has been cancelled. Here are the details:</p>
        
        <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 25px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 12px 0; font-weight: bold; color: #555;">🪑 Seat:</td>
              <td style="padding: 12px 0; color: #333;">${seat_number}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 12px 0; font-weight: bold; color: #555;">📅 Date:</td>
              <td style="padding: 12px 0; color: #333;">${date}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 12px 0; font-weight: bold; color: #555;">⏰ Time:</td>
              <td style="padding: 12px 0; color: #333;">${start_time} - ${end_time}</td>
            </tr>
          </table>
        </div>
        
        <div style="background: #f8d7da; color: #721c24; padding: 15px; border-radius: 5px; border-left: 4px solid #dc3545;">
          <strong>ℹ️ Note:</strong> You can make a new reservation anytime through the system.
        </div>
      </div>
    </div>
  `;

  await sendMail(email, subject, html);
};

const notifyReservationEdited = async (oldReservation, newReservation, user) => {
  const { name, email } = user;

  const subject = '✏️ Reservation Updated';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #ffa726 0%, #ff9800 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 28px;">✏️ Reservation Updated</h1>
      </div>
      
      <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
        <p style="font-size: 18px; margin-bottom: 25px;">Hi <strong>${name}</strong>,</p>
        
        <p style="font-size: 16px; margin-bottom: 30px;">Your seat reservation has been updated. Here are the new details:</p>
        
        <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 25px;">
          <h3 style="color: #28a745; margin-top: 0;">📋 New Reservation Details:</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 12px 0; font-weight: bold; color: #555;">🪑 Seat:</td>
              <td style="padding: 12px 0; color: #333;">${newReservation.seat_number}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 12px 0; font-weight: bold; color: #555;">📅 Date:</td>
              <td style="padding: 12px 0; color: #333;">${newReservation.date}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 12px 0; font-weight: bold; color: #555;">⏰ Time:</td>
              <td style="padding: 12px 0; color: #333;">${newReservation.start_time} - ${newReservation.end_time}</td>
            </tr>
          </table>
        </div>
        
        <div style="background: #fff3cd; color: #856404; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107;">
          <strong>📋 Important:</strong> Please note the updated time and location for your reservation.
        </div>
      </div>
    </div>
  `;

  await sendMail(email, subject, html);
};

const notifySeatAdded = async (seatData, adminEmail) => {
  const { seat_number, location } = seatData;

  const subject = '✅ New Seat Added';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 28px;">✅ New Seat Added</h1>
      </div>
      
      <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
        <p style="font-size: 16px; margin-bottom: 30px;">A new seat has been successfully added to the system:</p>
        
        <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 25px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 12px 0; font-weight: bold; color: #555;">🪑 Seat Number:</td>
              <td style="padding: 12px 0; color: #333;">${seat_number}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 12px 0; font-weight: bold; color: #555;">📍 Location:</td>
              <td style="padding: 12px 0; color: #333;">${location}</td>
            </tr>
          </table>
        </div>
      </div>
    </div>
  `;

  await sendMail(adminEmail, subject, html);
};

const notifySeatUpdated = async (seatData, adminEmail) => {
  const { seat_number, location } = seatData;

  const subject = '✏️ Seat Updated';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #ffc107 0%, #fd7e14 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 28px;">✏️ Seat Updated</h1>
      </div>
      
      <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
        <p style="font-size: 16px; margin-bottom: 30px;">A seat has been updated in the system:</p>
        
        <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 25px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 12px 0; font-weight: bold; color: #555;">🪑 Seat Number:</td>
              <td style="padding: 12px 0; color: #333;">${seat_number}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 12px 0; font-weight: bold; color: #555;">📍 Location:</td>
              <td style="padding: 12px 0; color: #333;">${location}</td>
            </tr>
          </table>
        </div>
      </div>
    </div>
  `;

  await sendMail(adminEmail, subject, html);
};

const notifySeatDeleted = async (seatData, adminEmail) => {
  const { seat_number, location } = seatData;

  const subject = '❌ Seat Deleted';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #dc3545 0%, #6f42c1 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 28px;">❌ Seat Deleted</h1>
      </div>
      
      <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
        <p style="font-size: 16px; margin-bottom: 30px;">A seat has been removed from the system:</p>
        
        <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 25px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 12px 0; font-weight: bold; color: #555;">🪑 Seat Number:</td>
              <td style="padding: 12px 0; color: #333;">${seat_number}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 12px 0; font-weight: bold; color: #555;">📍 Location:</td>
              <td style="padding: 12px 0; color: #333;">${location}</td>
            </tr>
          </table>
        </div>
      </div>
    </div>
  `;

  await sendMail(adminEmail, subject, html);
};

const notifyUserRegistration = async (userData) => {
  const { name, email, role } = userData;

  const subject = '🎉 Welcome to Seat Reservation System';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 28px;">🎉 Welcome!</h1>
      </div>
      
      <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
        <p style="font-size: 18px; margin-bottom: 25px;">Hi <strong>${name}</strong>,</p>
        
        <p style="font-size: 16px; margin-bottom: 30px;">Welcome to the Seat Reservation System! Your account has been successfully created.</p>
        
        <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 25px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 12px 0; font-weight: bold; color: #555;">👤 Name:</td>
              <td style="padding: 12px 0; color: #333;">${name}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 12px 0; font-weight: bold; color: #555;">📧 Email:</td>
              <td style="padding: 12px 0; color: #333;">${email}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 12px 0; font-weight: bold; color: #555;">🔒 Role:</td>
              <td style="padding: 12px 0; color: #333;">${role}</td>
            </tr>
          </table>
        </div>
        
        <div style="background: #d1ecf1; color: #0c5460; padding: 15px; border-radius: 5px; border-left: 4px solid #17a2b8;">
          <strong>📋 Next Steps:</strong>
          <ul style="margin: 10px 0 0 20px;">
            <li>Log in to your account</li>
            <li>Explore available seats</li>
            <li>Make your first reservation</li>
          </ul>
        </div>
      </div>
    </div>
  `;

  await sendMail(email, subject, html);
};

module.exports = {
  notifySeatReserved,
  notifyReservationCancelled,
  notifyReservationEdited,
  notifySeatAdded,
  notifySeatUpdated,
  notifySeatDeleted,
  notifyUserRegistration
};
