const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const Seat = require('../models/Seat');

// Get all events (public)
router.get('/', async (req, res) => {
  try {
    const events = await Event.find()
      .populate('organizer_id', 'organizer_name organization')
      .sort({ date: 1 });

    res.json({ success: true, events });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get single event with seats
router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('organizer_id', 'organizer_name organization');

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Get seats for this event
    const seats = await Seat.find({ event_id: event._id }).sort({ seat_number: 1 });

    res.json({ success: true, event, seats });
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Create event (organizer)
router.post('/', async (req, res) => {
  try {
    const { event_name, organizer_id, description, date, time, location, image, price_lower_foyer, price_balcony, discounts } = req.body;

    if (!event_name || !date || !organizer_id) {
      return res.status(400).json({ success: false, message: 'Event name, date, and organizer ID are required' });
    }

    // Create event
    const event = new Event({
      event_name,
      organizer_id,
      description,
      date,
      time,
      location,
      image,
      price_lower_foyer: price_lower_foyer || 0,
      price_balcony: price_balcony || 0,
      discounts: discounts || []
    });

    await event.save();

    // Generate 300 seats for the event (A1 to A300)
    const seats = [];
    for (let i = 1; i <= 300; i++) {
      const seatNumber = `A${i}`;
      const category = i <= 200 ? 'Lower Foyer' : 'Balcony';
      const price = i <= 200 ? (price_lower_foyer || 0) : (price_balcony || 0);
      
      seats.push({
        event_id: event._id,
        seat_number: seatNumber,
        category: category,
        status: 'available',
        user_id: null,
        price: price
      });
    }

    await Seat.insertMany(seats);

    res.status(201).json({ 
      success: true, 
      message: 'Event created with 300 seats (A1-A300)',
      event 
    });
  } catch (error) {
    console.error('Create event error:', error);
    
    // Handle organizer validation error
    if (error.message && error.message.includes('approved organizers')) {
      return res.status(403).json({ success: false, message: error.message });
    }
    
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update event
router.put('/:id', async (req, res) => {
  try {
    const { event_name, description, date, time, location, image, price_lower_foyer, price_balcony, discounts } = req.body;

    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Update fields
    if (event_name) event.event_name = event_name;
    if (description !== undefined) event.description = description;
    if (date) event.date = date;
    if (time) event.time = time;
    if (location) event.location = location;
    if (image !== undefined) event.image = image;
    if (price_lower_foyer !== undefined) event.price_lower_foyer = price_lower_foyer;
    if (price_balcony !== undefined) event.price_balcony = price_balcony;
    if (discounts) event.discounts = discounts;

    await event.save();

    // Update seat prices if changed
    if (price_lower_foyer !== undefined) {
      await Seat.updateMany(
        { event_id: event._id, category: 'Lower Foyer' },
        { price: price_lower_foyer }
      );
    }

    if (price_balcony !== undefined) {
      await Seat.updateMany(
        { event_id: event._id, category: 'Balcony' },
        { price: price_balcony }
      );
    }

    res.json({ success: true, message: 'Event updated', event });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete event
router.delete('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Delete associated seats
    await Seat.deleteMany({ event_id: event._id });

    // Delete event
    await Event.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Event and seats deleted' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get organizer events
router.get('/organizer/:organizerId', async (req, res) => {
  try {
    const events = await Event.find({ organizer_id: req.params.organizerId })
      .sort({ created_at: -1 });

    res.json({ success: true, events });
  } catch (error) {
    console.error('Get organizer events error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
