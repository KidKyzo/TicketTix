const mongoose = require('mongoose');

const WaitlistSchema = new mongoose.Schema({
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
    email: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'notified', 'converted', 'expired'],
        default: 'pending'
    },
    created_at: {
        type: Date,
        default: Date.now
    }
});

// Prevent duplicate entries for same user and event
WaitlistSchema.index({ user_id: 1, event_id: 1 }, { unique: true });

module.exports = mongoose.model('Waitlist', WaitlistSchema);
