const express = require('express');
const router = express.Router();
const Waitlist = require('../models/Waitlist');
const Event = require('../models/Event');
const User = require('../models/User');

const { sendWaitlistNotification } = require('../services/emailService');

// Helper: Check waitlist and notify first person
const checkWaitlistAndNotify = async (eventId) => {
    try {
        console.log(`Checking waitlist for event ${eventId}...`);

        const nextPerson = await Waitlist.findOne({
            event_id: eventId,
            status: 'pending'
        }).sort({ created_at: 1 });

        if (!nextPerson) {
            console.log('No pending users in waitlist.');
            return;
        }

        const event = await Event.findById(eventId);
        if (!event) return;

        const user = { email: nextPerson.email };
        const sent = await sendWaitlistNotification(user, event);

        if (sent) {
            nextPerson.status = 'notified';
            await nextPerson.save();
            console.log(`Notified user ${nextPerson.email} for event ${event.event_name}`);
        }

    } catch (error) {
        console.error('Error in checkWaitlistAndNotify:', error);
    }
};

// Join Waitlist
router.post('/join', async (req, res) => {
    try {
        const { user_id, event_id, email } = req.body;

        if (!user_id || !event_id || !email) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        const event = await Event.findById(event_id);
        if (!event) {
            return res.status(404).json({ success: false, message: 'Event not found' });
        }

        const existing = await Waitlist.findOne({ user_id, event_id });
        if (existing) {
            return res.status(400).json({ success: false, message: 'You are already on the waitlist for this event.' });
        }

        const waitlistEntry = new Waitlist({
            user_id,
            event_id,
            email,
            status: 'pending'
        });

        await waitlistEntry.save();

        res.json({ success: true, message: 'Successfully joined waitlist! We will notify you when a seat becomes available.' });

    } catch (error) {
        console.error('Join waitlist error:', error);
        res.status(500).json({ success: false, message: 'Server error: ' + error.message });
    }
});

// Check if user is in waitlist
router.get('/check/:eventId/:userId', async (req, res) => {
    try {
        const { eventId, userId } = req.params;
        const existing = await Waitlist.findOne({ user_id: userId, event_id: eventId });
        res.json({ inWaitlist: !!existing });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get user's waitlist entries for "My Tickets"
router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const waitlist = await Waitlist.find({ user_id: userId })
            .populate('event_id')
            .sort({ created_at: -1 });

        res.json({ success: true, waitlist });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


module.exports = { router, checkWaitlistAndNotify };
