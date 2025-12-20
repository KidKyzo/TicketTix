const express = require('express');
const router = express.Router();
const Organizer = require('../models/Organizer');
const Event = require('../models/Event');
const Transaction = require('../models/Transaction');
const { sendApprovalEmail } = require('../services/emailService');

// Get pending organizer applications
router.get('/pending-organizers', async (req, res) => {
  try {
    const pending = await Organizer.find({ status: 'pending' })
      .select('-password')
      .sort({ created_at: -1 });

    res.json({ success: true, organizers: pending });
  } catch (error) {
    console.error('Get pending organizers error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Approve organizer
router.post('/approve/:id', async (req, res) => {
  try {
    const organizer = await Organizer.findById(req.params.id);

    if (!organizer) {
      return res.status(404).json({ success: false, message: 'Organizer not found' });
    }

    if (organizer.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Organizer is not pending' });
    }

    // Update status and set default password
    organizer.status = 'approved';
    organizer.password = 'org123'; // Default plain text password
    organizer.is_first_login = true;
    organizer.approved_at = new Date();
    await organizer.save();

    // Send approval email
    await sendApprovalEmail(organizer);

    res.json({ 
      success: true, 
      message: 'Organizer approved successfully. Email notification sent.' 
    });
  } catch (error) {
    console.error('Approve organizer error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Reject organizer
router.post('/reject/:id', async (req, res) => {
  try {
    const organizer = await Organizer.findById(req.params.id);

    if (!organizer) {
      return res.status(404).json({ success: false, message: 'Organizer not found' });
    }

    organizer.status = 'rejected';
    await organizer.save();

    res.json({ success: true, message: 'Organizer rejected' });
  } catch (error) {
    console.error('Reject organizer error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get all events (admin view)
router.get('/events', async (req, res) => {
  try {
    const events = await Event.find()
      .populate('organizer_id', 'organizer_name email organization')
      .sort({ created_at: -1 });

    res.json({ success: true, events });
  } catch (error) {
    console.error('Get admin events error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get dashboard stats
router.get('/stats', async (req, res) => {
  try {
    const totalEvents = await Event.countDocuments();
    const totalOrganizers = await Organizer.countDocuments({ status: 'approved' });
    const pendingOrganizers = await Organizer.countDocuments({ status: 'pending' });
    
    const transactions = await Transaction.find({ payment_status: 'settlement' });
    const totalTickets = transactions.reduce((sum, t) => sum + (t.seats ? t.seats.length : 1), 0);
    const totalRevenue = transactions.reduce((sum, t) => sum + t.amount, 0);

    res.json({
      success: true,
      stats: {
        totalEvents,
        totalOrganizers,
        pendingOrganizers,
        totalTickets,
        totalRevenue
      }
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete event (admin)
router.delete('/events/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    await Event.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Event deleted' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
