const mongoose = require('mongoose');

// Collection: Events
const eventSchema = new mongoose.Schema({
  event_name: {
    type: String,
    required: true,
    trim: true
  },
  organizer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organizer',
    required: true
  },
  description: {
    type: String
  },
  date: {
    type: String,
    required: true
  },
  time: {
    type: String
  },
  location: {
    type: String,
    default: 'Grand Event Hall - Jakarta'
  },
  image: {
    type: String
  },
  price_lower_foyer: {
    type: Number,
    required: true,
    default: 0
  },
  price_balcony: {
    type: Number,
    required: true,
    default: 0
  },
  discounts: [
    {
      code: String,
      discount: Number
    }
  ],
  created_at: {
    type: Date,
    default: Date.now
  }
});

// Validation: Ensure organizer is approved before creating event
eventSchema.pre('save', async function(next) {
  if (this.isNew) {
    const Organizer = mongoose.model('Organizer');
    const organizer = await Organizer.findById(this.organizer_id);
    
    if (!organizer) {
      return next(new Error('Organizer not found'));
    }
    
    if (organizer.status !== 'approved') {
      return next(new Error('Only approved organizers can create events'));
    }
  }
  next();
});

module.exports = mongoose.model('Event', eventSchema);
