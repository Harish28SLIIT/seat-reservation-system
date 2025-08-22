// SMS Notification functions
// Note: This is a mock implementation. In production, integrate with services like:
// - Twilio
// - AWS SNS
// - Vonage (Nexmo)
// - TextMagic

const smsNotifications = {
  // User registration SMS
  userRegistration: async ({ name, email, role, phone }) => {
    const message = `Welcome to Seat Reservation System! Hi ${name}, your ${role} account has been created successfully. Login at our portal with email: ${email}`;
    
    console.log(`📱 SMS would be sent to ${phone}: ${message}`);
    
    // In production, replace with actual SMS service:
    // await twilioClient.messages.create({
    //   body: message,
    //   from: process.env.TWILIO_PHONE_NUMBER,
    //   to: phone
    // });
    
    return { success: true, message: 'SMS sent successfully' };
  },

  // Seat reservation SMS
  seatReserved: async (reservation, user) => {
    const { seat_number, date, start_time, end_time } = reservation;
    const { name, phone } = user;
    
    const message = `🪑 Seat Reserved! Hi ${name}, your seat ${seat_number} is confirmed for ${date} from ${start_time} to ${end_time}. Please arrive on time.`;
    
    console.log(`📱 SMS would be sent to ${phone}: ${message}`);
    
    return { success: true, message: 'SMS sent successfully' };
  },

  // Reservation cancellation SMS
  reservationCancelled: async (reservation, user) => {
    const { seat_number, date, start_time, end_time } = reservation;
    const { name, phone } = user;
    
    const message = `❌ Reservation Cancelled. Hi ${name}, your reservation for seat ${seat_number} on ${date} (${start_time}-${end_time}) has been cancelled.`;
    
    console.log(`📱 SMS would be sent to ${phone}: ${message}`);
    
    return { success: true, message: 'SMS sent successfully' };
  },

  // Reservation updated SMS
  reservationUpdated: async (newReservation, user) => {
    const { seat_number, date, start_time, end_time } = newReservation;
    const { name, phone } = user;
    
    const message = `✏️ Reservation Updated! Hi ${name}, your reservation has been changed to seat ${seat_number} on ${date} from ${start_time} to ${end_time}.`;
    
    console.log(`📱 SMS would be sent to ${phone}: ${message}`);
    
    return { success: true, message: 'SMS sent successfully' };
  },

  // One hour reminder SMS
  oneHourReminder: async (reservation, user) => {
    const { seat_number, start_time } = reservation;
    const { name, phone } = user;
    
    const message = `⏰ Reminder: Hi ${name}, your seat reservation (${seat_number}) starts in 1 hour at ${start_time}. Don't forget!`;
    
    console.log(`📱 SMS would be sent to ${phone}: ${message}`);
    
    return { success: true, message: 'SMS sent successfully' };
  },

  // Reservation starting SMS
  reservationStarting: async (reservation, user) => {
    const { seat_number } = reservation;
    const { name, phone } = user;
    
    const message = `🚀 Your reservation is starting now! Hi ${name}, please proceed to seat ${seat_number}. Enjoy your reserved time.`;
    
    console.log(`📱 SMS would be sent to ${phone}: ${message}`);
    
    return { success: true, message: 'SMS sent successfully' };
  },

  // Reservation ending SMS
  reservationEnding: async (reservation, user) => {
    const { seat_number, end_time } = reservation;
    const { name, phone } = user;
    
    const message = `⏰ Reservation ending soon! Hi ${name}, your seat ${seat_number} reservation ends at ${end_time} (15 minutes remaining).`;
    
    console.log(`📱 SMS would be sent to ${phone}: ${message}`);
    
    return { success: true, message: 'SMS sent successfully' };
  },

  // Reservation ended SMS
  reservationEnded: async (reservation, user) => {
    const { seat_number } = reservation;
    const { name, phone } = user;
    
    const message = `✅ Reservation completed! Hi ${name}, your time for seat ${seat_number} has ended. Thank you for using our service!`;
    
    console.log(`📱 SMS would be sent to ${phone}: ${message}`);
    
    return { success: true, message: 'SMS sent successfully' };
  }
};

module.exports = { smsNotifications };
