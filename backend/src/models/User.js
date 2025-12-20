const mongoose = require('mongoose');

// Collection: Users (Attendees & Admins)
const userSchema = new mongoose.Schema({
  full_name: {
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
  role: {
    type: String,
    required: true,
    enum: ['attendee', 'admin'],
    default: 'attendee'
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', userSchema);
