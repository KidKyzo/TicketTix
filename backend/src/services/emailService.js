const transporter = require('../config/email');

// Send organizer approval email
const sendApprovalEmail = async (organizer) => {
  const mailOptions = {
    from: process.env.SMTP_EMAIL,
    to: organizer.email,
    subject: 'Ticketix - Your Organizer Account is Approved',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #48CAE4; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Ticketix</h1>
        </div>
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #333;">Welcome, ${organizer.name}!</h2>
          <p style="color: #666; line-height: 1.6;">
            Your organizer application has been approved. You can now login and start creating events.
          </p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #333;"><strong>Default Password:</strong> org123</p>
          </div>
          <p style="color: #dc3545; font-weight: bold;">
            For security, you will be required to change your password on first login.
          </p>
          <a href="${process.env.FRONTEND_URL}/login" 
             style="display: inline-block; background: #48CAE4; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 6px; margin-top: 20px;">
            Login Now
          </a>
        </div>
        <div style="padding: 15px; text-align: center; color: #999; font-size: 12px;">
          Ticketix - Event Ticketing Platform
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Approval email sent to:', organizer.email);
    return true;
  } catch (error) {
    console.error('Failed to send approval email:', error.message);
    return false;
  }
};

// Send purchase confirmation email with e-ticket
const sendPurchaseEmail = async (user, transaction, event, seats) => {
  const seatNumbers = seats.map(s => s.seatId).join(', ');

  const mailOptions = {
    from: process.env.SMTP_EMAIL,
    to: user.email,
    subject: `Ticketix E-Ticket - ${event.title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #48CAE4; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Ticketix</h1>
        </div>
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #333;">E-Ticket Confirmation</h2>
          <p style="color: #666;">Thank you for your purchase!</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #48CAE4;">
            <h3 style="color: #48CAE4; margin-top: 0;">Booking Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #666;">Booking Reference:</td>
                <td style="padding: 8px 0; color: #333; font-weight: bold;">${transaction.orderId}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Event:</td>
                <td style="padding: 8px 0; color: #333; font-weight: bold;">${event.title}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Date:</td>
                <td style="padding: 8px 0; color: #333;">${event.date} at ${event.time}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Location:</td>
                <td style="padding: 8px 0; color: #333;">${event.location}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Seats:</td>
                <td style="padding: 8px 0; color: #48CAE4; font-weight: bold; font-size: 16px;">${seatNumbers}</td>
              </tr>
              <tr style="border-top: 1px solid #eee;">
                <td style="padding: 12px 0; color: #666;">Total Paid:</td>
                <td style="padding: 12px 0; color: #333; font-weight: bold; font-size: 18px;">
                  Rp ${transaction.total.toLocaleString('id-ID')}
                </td>
              </tr>
            </table>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            Please show this e-ticket at the venue entrance. You can also view your tickets in the Ticketix app.
          </p>
          
          <a href="${process.env.FRONTEND_URL}/my-tickets" 
             style="display: inline-block; background: #48CAE4; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 6px; margin-top: 20px;">
            View My Tickets
          </a>
        </div>
        <div style="padding: 15px; text-align: center; color: #999; font-size: 12px;">
          Ticketix - Event Ticketing Platform
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Purchase email sent to:', user.email);
    return true;
  } catch (error) {
    console.error('Failed to send purchase email:', error.message);
    return false;
  }
};

// Send waitlist notification
const sendWaitlistNotification = async (user, event) => {
  const mailOptions = {
    from: process.env.SMTP_EMAIL,
    to: user.email,
    subject: `Good News! A Seat is Available for ${event.event_name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #48CAE4; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Ticketix</h1>
        </div>
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #333;">A Seat Has Opened Up!</h2>
          <p style="color: #666; line-height: 1.6;">
            Hi there! You are next on the waitlist for <strong>${event.event_name}</strong>.
          </p>
          <p style="color: #666; line-height: 1.6;">
            A seat has become available due to a cancellation. It is now available for purchase on a first-come, first-served basis.
            Act fast to secure your spot!
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #48CAE4;">
             <p style="margin: 0; color: #333;"><strong>Event:</strong> ${event.event_name}</p>
             <p style="margin: 10px 0 0; color: #333;"><strong>Date:</strong> ${event.date} at ${event.time}</p>
          </div>

          <a href="${process.env.FRONTEND_URL}/buy-ticket/${event._id}" 
             style="display: inline-block; background: #48CAE4; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 6px; margin-top: 20px; font-weight: bold;">
            Buy Ticket Now
          </a>
          
          <p style="margin-top: 20px; font-size: 12px; color: #999;">
            Note: If you do not purchase within a limited time, this opportunity may be passed to the next person on the waitlist.
          </p>
        </div>
        <div style="padding: 15px; text-align: center; color: #999; font-size: 12px;">
          Ticketix - Event Ticketing Platform
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Waitlist notification sent to:', user.email);
    return true;
  } catch (error) {
    console.error('Failed to send waitlist email:', error.message);
    return false;
  }
};

module.exports = {
  sendApprovalEmail,
  sendPurchaseEmail,
  sendWaitlistNotification
};
