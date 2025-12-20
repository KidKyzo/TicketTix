const mongoose = require('mongoose');

// Collection: Seats
// Total Documents per Event: Exactly 300
// seat_number: A1-A300
// category: Lower Foyer for 1-200, Balcony for 201-300
// status: available/sold only (NO pending state)
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
    required: true,
    enum: ['Lower Foyer', 'Balcony']
    // Lower Foyer: seats 1-200 (A1-A200)
    // Balcony: seats 201-300 (A201-A300)
  },
  status: {
    type: String,
    required: true,
    enum: ['available', 'sold'],
    default: 'available'
    // No pending state - changes from available to sold only after payment success
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
    // null by default, populated when seat is sold
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

// Compound index for unique seat per event
seatSchema.index({ event_id: 1, seat_number: 1 }, { unique: true });

// Static method to generate 300 seats for an event
seatSchema.statics.generateSeatsForEvent = async function(eventId, priceLowerFoyer, priceBalcony) {
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

// Add price field for reference (set during generation)
seatSchema.add({
  price: {
    type: Number,
    default: 0
  }
});

module.exports = mongoose.model('Seat', seatSchema);
