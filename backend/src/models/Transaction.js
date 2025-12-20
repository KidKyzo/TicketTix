const mongoose = require('mongoose');

// Collection: Transactions
const transactionSchema = new mongoose.Schema({
  transaction_id: {
    type: String,
    required: true,
    unique: true
    // From Midtrans
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  event_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  seat_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seat'
    // Single seat reference (for multiple seats, create multiple transactions or use array)
  },
  seats: [{
    seat_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Seat'
    },
    seat_number: String,
    category: String,
    price: Number
  }],
  amount: {
    type: Number,
    required: true
  },
  discount_code: {
    type: String,
    default: null
  },
  discount_amount: {
    type: Number,
    default: 0
  },
  payment_status: {
    type: String,
    required: true,
    enum: ['pending', 'settlement', 'failure', 'expire', 'cancel'],
    default: 'pending'
    // settlement = success from Midtrans
  },
  payment_method: {
    type: String,
    default: null
    // e.g., credit_card, bank_transfer, gopay, etc.
  },
  midtrans_order_id: {
    type: String
  },
  midtrans_token: {
    type: String
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  paid_at: {
    type: Date,
    default: null
  }
});

module.exports = mongoose.model('Transaction', transactionSchema);
