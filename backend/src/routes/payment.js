const express = require('express');
const router = express.Router();
const { snap, core } = require('../config/midtrans');
const Transaction = require('../models/Transaction');
const Seat = require('../models/Seat');
const Event = require('../models/Event');
const User = require('../models/User');
const { sendPurchaseEmail } = require('../services/emailService');

// Create payment transaction
router.post('/create', async (req, res) => {
  try {
    const { user_id, event_id, seats, amount, discount_code, discount_amount, email } = req.body;

    if (!user_id || !event_id || !seats || !seats.length || !amount) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Check if seats are still available (no pending state - directly check availability)
    const seatNumbers = seats.map(s => s.seat_number);
    const soldSeats = await Seat.find({
      event_id,
      seat_number: { $in: seatNumbers },
      status: 'sold'
    });

    if (soldSeats.length > 0) {
      const soldSeatNumbers = soldSeats.map(s => s.seat_number).join(', ');
      return res.status(400).json({
        success: false,
        message: `Seats already sold: ${soldSeatNumbers}. Please select different seats.`
      });
    }

    // Generate transaction ID
    const transactionId = 'TIX' + Date.now().toString().slice(-10);

    // Create transaction record
    const transaction = new Transaction({
      transaction_id: transactionId,
      user_id,
      event_id,
      seats: seats.map(s => ({
        seat_number: s.seat_number,
        category: s.category,
        price: s.price
      })),
      amount,
      discount_code: discount_code || null,
      discount_amount: discount_amount || 0,
      payment_status: 'pending'
    });

    await transaction.save();

    // Create Midtrans Snap transaction
    const parameter = {
      transaction_details: {
        order_id: transactionId,
        gross_amount: amount
      },
      customer_details: {
        email: email || 'customer@example.com'
      },
      callbacks: {
        finish: `${process.env.FRONTEND_URL}/my-tickets`
      }
    };

    const snapResponse = await snap.createTransaction(parameter);

    // Update transaction with Midtrans token
    transaction.midtrans_token = snapResponse.token;
    transaction.midtrans_order_id = transactionId;
    await transaction.save();

    res.json({
      success: true,
      token: snapResponse.token,
      redirectUrl: snapResponse.redirect_url,
      transaction_id: transactionId
    });
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({ success: false, message: 'Failed to create payment' });
  }
});

// Midtrans notification webhook
router.post('/notification', async (req, res) => {
  try {
    const notification = req.body;
    
    console.log('Midtrans notification received:', notification.order_id, notification.transaction_status);

    const orderId = notification.order_id;
    const transactionStatus = notification.transaction_status;
    const fraudStatus = notification.fraud_status;

    // Verify notification with Midtrans
    let statusResponse;
    try {
      statusResponse = await core.transaction.status(orderId);
    } catch (err) {
      console.error('Failed to verify with Midtrans:', err.message);
      statusResponse = notification;
    }

    // Find transaction
    const transaction = await Transaction.findOne({ transaction_id: orderId });
    if (!transaction) {
      console.error('Transaction not found:', orderId);
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Handle transaction status
    if (transactionStatus === 'capture' || transactionStatus === 'settlement') {
      if (fraudStatus === 'accept' || !fraudStatus) {
        // Payment SUCCESS - Update seats to SOLD
        transaction.payment_status = 'settlement';
        transaction.payment_method = notification.payment_type || null;
        transaction.paid_at = new Date();
        await transaction.save();
        
        await handlePaymentSuccess(transaction);
      }
    } else if (transactionStatus === 'pending') {
      transaction.payment_status = 'pending';
      await transaction.save();
    } else if (
      transactionStatus === 'deny' ||
      transactionStatus === 'expire' ||
      transactionStatus === 'cancel'
    ) {
      transaction.payment_status = 'failure';
      await transaction.save();
    }

    res.status(200).json({ message: 'OK' });
  } catch (error) {
    console.error('Notification handling error:', error);
    res.status(500).json({ message: 'Error processing notification' });
  }
});

// Handle successful payment
async function handlePaymentSuccess(transaction) {
  try {
    // Update seats to SOLD and assign to user
    for (const seat of transaction.seats) {
      await Seat.findOneAndUpdate(
        { event_id: transaction.event_id, seat_number: seat.seat_number },
        {
          status: 'sold',
          user_id: transaction.user_id,
          transaction_id: transaction._id,
          sold_at: new Date()
        }
      );
    }

    // Send confirmation email
    const user = await User.findById(transaction.user_id);
    const event = await Event.findById(transaction.event_id);
    const seats = await Seat.find({
      event_id: transaction.event_id,
      seat_number: { $in: transaction.seats.map(s => s.seat_number) }
    });

    if (user && event) {
      await sendPurchaseEmail(user, transaction, event, seats);
    }

    console.log('Payment success processed for transaction:', transaction.transaction_id);
  } catch (error) {
    console.error('Error handling payment success:', error);
  }
}

// Get transaction status
router.get('/status/:transactionId', async (req, res) => {
  try {
    const transaction = await Transaction.findOne({ transaction_id: req.params.transactionId });
    
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    res.json({
      success: true,
      transaction: {
        transaction_id: transaction.transaction_id,
        payment_status: transaction.payment_status,
        amount: transaction.amount,
        seats: transaction.seats
      }
    });
  } catch (error) {
    console.error('Get transaction status error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Simulate payment success (for testing without Midtrans)
router.post('/simulate-success', async (req, res) => {
  try {
    const { transaction_id } = req.body;

    const transaction = await Transaction.findOne({ transaction_id });
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    if (transaction.payment_status === 'settlement') {
      return res.status(400).json({ success: false, message: 'Transaction already completed' });
    }

    transaction.payment_status = 'settlement';
    transaction.paid_at = new Date();
    await transaction.save();

    await handlePaymentSuccess(transaction);

    res.json({ success: true, message: 'Payment simulated successfully' });
  } catch (error) {
    console.error('Simulate payment error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
