const mongoose = require('mongoose');

// Collection: Seats
const seatSchema = new mongoose.Schema({
  event_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  seat_number: {
    type: String,
    required: true
    // Format: A1, A2, ... A300
  },
  category: {
    type: String,
    required: true
    // Category name (e.g., "VIP", "Regular")
  },
  status: {
    type: String,
    required: true,
    enum: ['available', 'sold'],
    default: 'available'
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  transaction_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    default: null
  },
  sold_at: {
    type: Date,
    default: null
  }
});

seatSchema.index({ event_id: 1, seat_number: 1 }, { unique: true });

seatSchema.statics.generateSeatsForEvent = async function (eventId, priceLowerFoyer, priceBalcony) {
  const seats = [];

  // Generate 300 seats: A1 to A300
  for (let i = 1; i <= 300; i++) {
    const seatNumber = `A${i}`;
    const category = i <= 200 ? 'Lower Foyer' : 'Balcony';
    const price = i <= 200 ? priceLowerFoyer : priceBalcony;

    seats.push({
      event_id: eventId,
      seat_number: seatNumber,
      category: category,
      status: 'available',
      user_id: null,
      price: price
    });
  }

  return await this.insertMany(seats);
};

seatSchema.add({
  price: {
    type: Number,
    default: 0
  }
});

module.exports = mongoose.model('Seat', seatSchema);
