const express = require('express');
const router = express.Router();
const { snap, core } = require('../config/midtrans');
const Transaction = require('../models/Transaction');
const Seat = require('../models/Seat');
const Event = require('../models/Event');
const User = require('../models/User');
const { sendPurchaseEmail } = require('../services/emailService');
const { checkWaitlistAndNotify } = require('./waitlist');

// Create payment transaction
router.post('/create', async (req, res) => {
  try {
    const { user_id, event_id, seats, amount, discount_code, discount_amount, email } = req.body;

    if (!user_id || !event_id || !seats || !seats.length || !amount) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const seatNumbers = seats.map(s => s.seat_number);
    const soldSeats = await Seat.find({
      event_id,
      seat_number: { $in: seatNumbers },
      status: { $in: ['sold', 'reserved'] }
    });

    if (soldSeats.length > 0) {
      const soldSeatNumbers = soldSeats.map(s => s.seat_number).join(', ');
      return res.status(400).json({
        success: false,
        message: `Seats already sold: ${soldSeatNumbers}. Please select different seats.`
      });
    }

    const transactionId = 'TIX' + Date.now().toString().slice(-10);

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
    await transaction.save();

    await Seat.updateMany(
      { event_id, seat_number: { $in: seatNumbers } },
      {
        status: 'reserved',
        user_id,
        transaction_id: transaction._id
      }
    );

    console.log('✅ Transaction created within DB (Pending & Reserved):', transactionId);

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
    if (error.ApiResponse) {
      console.error('Midtrans API Response:', JSON.stringify(error.ApiResponse));
    }
    res.status(500).json({ success: false, message: 'Failed to create payment: ' + error.message });
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

    let statusResponse;
    try {
      statusResponse = await core.transaction.status(orderId);
    } catch (err) {
      console.error('Failed to verify with Midtrans:', err.message);
      statusResponse = notification;
    }

    const transaction = await Transaction.findOne({ transaction_id: orderId });
    if (!transaction) {
      console.error('Transaction not found:', orderId);
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (transactionStatus === 'capture' || transactionStatus === 'settlement') {
      if (fraudStatus === 'accept' || !fraudStatus) {
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
      transaction.payment_status = 'failure';
      await transaction.save();

      const seatNumbers = transaction.seats.map(s => s.seat_number);
      await Seat.updateMany(
        { event_id: transaction.event_id, seat_number: { $in: seatNumbers } },
        {
          status: 'available',
          user_id: null,
          transaction_id: null,
          sold_at: null
        }
      );

      checkWaitlistAndNotify(transaction.event_id)
        .catch(err => console.error('Background waitlist check error:', err));
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
    const transaction = await Transaction.findOne({ transaction_id: req.params.transactionId })
      .populate('event_id');

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    res.json({
      success: true,
      transaction: {
        transaction_id: transaction.transaction_id,
        payment_status: transaction.payment_status,
        amount: transaction.amount,
        amount: transaction.amount,
        seats: transaction.seats,
        event: transaction.event_id,
        user_id: transaction.user_id
      }
    });
  } catch (error) {
    console.error('Get transaction status error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Check transaction status manually with Midtrans
router.post('/check-status', async (req, res) => {
  try {
    const { order_id } = req.body;

    if (!order_id) {
      return res.status(400).json({ success: false, message: 'Order ID is required' });
    }

    console.log('Checking status for:', order_id);

    let midtransStatus;
    try {
      midtransStatus = await core.transaction.status(order_id);
    } catch (err) {
      console.error('Midtrans status check failed:', err.message);
      return res.status(500).json({ success: false, message: 'Failed to check status with Midtrans' });
    }

    const transaction = await Transaction.findOne({ transaction_id: order_id });
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    const transactionStatus = midtransStatus.transaction_status;
    const fraudStatus = midtransStatus.fraud_status;

    let updated = false;

    if (transaction.payment_status !== 'settlement') {
      if (
        (transactionStatus === 'capture' && fraudStatus === 'accept') ||
        transactionStatus === 'settlement'
      ) {
        transaction.payment_status = 'settlement';
        transaction.payment_method = midtransStatus.payment_type;
        transaction.paid_at = new Date();
        await transaction.save();

        await handlePaymentSuccess(transaction);
        updated = true;
        console.log('✅ Transaction updated to settlement via check-status');
      } else if (
        transactionStatus === 'cancel' ||
        transactionStatus === 'expire' ||
        transactionStatus === 'deny'
      ) {
        transaction.payment_status = 'failure';
        await transaction.save();
        updated = true;
      }
    }

    res.json({
      success: true,
      data: midtransStatus,
      updated
    });

  } catch (error) {
    console.error('Check status error:', error);
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

// Cancel transaction and release seats
router.post('/cancel', async (req, res) => {
  try {
    const { transaction_id } = req.body;

    const transaction = await Transaction.findOne({ transaction_id });
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    if (transaction.payment_status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Transaction already cancelled' });
    }

    transaction.payment_status = 'cancelled';
    await transaction.save();

    const seatNumbers = transaction.seats.map(s => s.seat_number);
    await Seat.updateMany(
      { event_id: transaction.event_id, seat_number: { $in: seatNumbers } },
      {
        status: 'available',
        user_id: null,
        transaction_id: null,
        sold_at: null
      }
    );

    console.log(`Transaction ${transaction_id} cancelled. Seats released.`);

    checkWaitlistAndNotify(transaction.event_id)
      .catch(err => console.error('Background waitlist check error:', err));

    res.json({ success: true, message: 'Transaction cancelled and seats released.' });

  } catch (error) {
    console.error('Cancel transaction error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get user's tickets
router.get('/my-tickets/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const transactions = await Transaction.find({
      user_id: userId,
      payment_status: 'settlement'
    })
      .populate('event_id')
      .sort({ paid_at: -1 });

    const tickets = transactions.map(t => ({
      _id: t._id,
      transaction_id: t.transaction_id,
      event: t.event_id,
      seats: t.seats,
      amount: t.amount,
      discount_code: t.discount_code,
      discount_amount: t.discount_amount,
      payment_method: t.payment_method,
      purchase_date: t.paid_at || t.created_at
    }));

    res.json({
      success: true,
      tickets
    });
  } catch (error) {
    console.error('Get my tickets error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
