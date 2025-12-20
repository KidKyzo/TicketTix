const mongoose = require('mongoose');

// Collection: Organizers
const organizerSchema = new mongoose.Schema({
  organizer_name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
    // Plain Text as per requirement
  },
  phone: {
    type: String
  },
  organization: {
    type: String
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  is_first_login: {
    type: Boolean,
    default: true
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  approved_at: {
    type: Date,
    default: null
  }
});

module.exports = mongoose.model('Organizer', organizerSchema);
