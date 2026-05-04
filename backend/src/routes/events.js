const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const Seat = require('../models/Seat');

// Get all events (public)
router.get('/', async (req, res) => {
  try {
    const events = await Event.find()
      .populate('organizer_id', 'organizer_name organization')
      .sort({ created_at: -1 });

    res.json({ success: true, events });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get single event
router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('organizer_id', 'organizer_name organization');

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const seats = await Seat.find({ event_id: event._id }).sort({ seat_number: 1 });

    const eventObj = event.toObject();
    if (eventObj.categories && eventObj.categories.length > 0) {
      eventObj.categories = eventObj.categories.map(cat => {
        const availableCount = seats.filter(s => s.category === cat.name && s.status === 'available').length;
        return {
          ...cat,
          seats: availableCount,
          totalCapacity: cat.seats
        };
      });
    }

    res.json({ success: true, event: eventObj, seats });
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Create event (organizer)
router.post('/', async (req, res) => {
  try {
    const { event_name, organizer_id, description, date, time, location, image, price_lower_foyer, price_balcony, categories, discounts } = req.body;

    if (!event_name || !date || !organizer_id) {
      return res.status(400).json({ success: false, message: 'Event name, date, and organizer ID are required' });
    }

    if (categories && categories.length > 0) {
      const totalSeats = categories.reduce((sum, cat) => sum + cat.seats, 0);
      if (totalSeats !== 300) {
        return res.status(400).json({
          success: false,
          message: `Total seats must equal 300. Current total: ${totalSeats}`
        });
      }
    }

    const eventData = {
      event_name,
      organizer_id,
      description,
      date,
      time,
      location,
      image,
      discounts: discounts || []
    };

    if (categories && categories.length > 0) {
      eventData.categories = categories;
    } else {
      eventData.price_lower_foyer = price_lower_foyer || 0;
      eventData.price_balcony = price_balcony || 0;
    }

    const event = new Event(eventData);
    await event.save();

    const seats = [];
    let seatCounter = 1;

    if (categories && categories.length > 0) {
      for (const category of categories) {
        for (let i = 0; i < category.seats; i++) {
          seats.push({
            event_id: event._id,
            seat_number: `A${seatCounter}`,
            category: category.name,
            status: 'available',
            user_id: null,
            price: category.price
          });
          seatCounter++;
        }
      }
    } else {
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
    }

    await Seat.insertMany(seats);

    res.status(201).json({
      success: true,
      message: 'Event created with 300 seats',
      event
    });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

// Get events by organizer
router.get('/organizer/:id', async (req, res) => {
  try {
    const events = await Event.find({ organizer_id: req.params.id })
      .sort({ created_at: -1 });

    res.json({ success: true, events });
  } catch (error) {
    console.error('Get organizer events error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update event
router.put('/:id', async (req, res) => {
  try {
    const { event_name, description, date, time, location, image, categories, discounts } = req.body;

    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    if (event_name) event.event_name = event_name;
    if (description !== undefined) event.description = description;
    if (date) event.date = date;
    if (time) event.time = time;
    if (location) event.location = location;
    if (image) event.image = image;
    if (categories) event.categories = categories;
    if (discounts) event.discounts = discounts;

    await event.save();

    if (categories && categories.length > 0) {
      for (const cat of categories) {
        if (cat.section === 'balcony') {
          const balconySeatNumbers = Array.from({ length: 100 }, (_, i) => `A${i + 201}`);
          await Seat.updateMany(
            { event_id: event._id, seat_number: { $in: balconySeatNumbers } },
            { $set: { category: cat.name } }
          );
        } else {
          const lowerSeatNumbers = Array.from({ length: 200 }, (_, i) => `A${i + 1}`);
          await Seat.updateMany(
            { event_id: event._id, seat_number: { $in: lowerSeatNumbers } },
            { $set: { category: cat.name } }
          );
        }
      }
    }

    res.json({ success: true, message: 'Event updated', event });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

// Delete event
router.delete('/:id', async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    await Seat.deleteMany({ event_id: req.params.id });

    res.json({ success: true, message: 'Event deleted' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get organizer statistics
router.get('/organizer/:organizerId/stats', async (req, res) => {
  try {
    const organizerId = req.params.organizerId;

    const events = await Event.find({ organizer_id: organizerId });

    if (events.length === 0) {
      return res.json({
        success: true,
        stats: {
          overall: {
            totalEvents: 0,
            totalTicketsSold: 0,
            totalRevenue: 0,
            averageOccupancy: 0
          },
          events: []
        }
      });
    }

    const eventStats = [];
    let overallTicketsSold = 0;
    let overallRevenue = 0;
    let totalOccupancy = 0;

    for (const event of events) {
      const soldSeats = await Seat.find({
        event_id: event._id,
        status: 'sold'
      });

      let balconySold = 0;
      let lowerFoyerSold = 0;
      let balconyRevenue = 0;
      let lowerRevenue = 0;

      if (event.categories && event.categories.length > 0) {
        for (const seat of soldSeats) {
          const categoryDef = event.categories.find(c => c.name === seat.category);
          if (categoryDef) {
            if (categoryDef.section === 'balcony') {
              balconySold++;
              balconyRevenue += seat.price;
            } else {
              lowerFoyerSold++;
              lowerRevenue += seat.price;
            }
          }
        }
      } else {
        balconySold = soldSeats.filter(s => s.category === 'Balcony').length;
        lowerFoyerSold = soldSeats.filter(s => s.category === 'Lower Foyer').length;
        balconyRevenue = balconySold * (event.price_balcony || 0);
        lowerRevenue = lowerFoyerSold * (event.price_lower_foyer || 0);
      }

      const totalSold = soldSeats.length;

      const transactions = await require('../models/Transaction').find({
        event_id: event._id,
        payment_status: 'settlement'
      });

      const revenue = transactions.reduce((sum, t) => sum + t.amount, 0);

      const totalCapacity = 300;
      const occupancyPercent = totalCapacity > 0 ? (totalSold / totalCapacity) * 100 : 0;

      overallTicketsSold += totalSold;
      overallRevenue += revenue;
      totalOccupancy += occupancyPercent;

      eventStats.push({
        event_id: event._id,
        event_name: event.event_name,
        totalSeats: totalCapacity,
        soldSeats: totalSold,
        occupancyPercent: Math.round(occupancyPercent * 10) / 10,
        ticketsSold: totalSold,
        revenue: revenue,
        breakdown: {
          balcony: {
            sold: balconySold,
            total: 100,
            revenue: balconyRevenue
          },
          lowerFoyer: {
            sold: lowerFoyerSold,
            total: 200,
            revenue: lowerRevenue
          }
        }
      });
    }

    const averageOccupancy = events.length > 0 ? totalOccupancy / events.length : 0;

    res.json({
      success: true,
      stats: {
        overall: {
          totalEvents: events.length,
          totalTicketsSold: overallTicketsSold,
          totalRevenue: overallRevenue,
          averageOccupancy: Math.round(averageOccupancy * 10) / 10
        },
        events: eventStats
      }
    });
  } catch (error) {
    console.error('Get organizer stats error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get analytics for a specific event
router.get('/:id/analytics', async (req, res) => {
  try {
    const eventId = req.params.id;
    console.log(`Analytics request for event ID: ${eventId}`);

    // Get event details
    console.log('Fetching event...');
    const event = await Event.findById(eventId).populate('organizer_id', 'organizer_name organization');

    if (!event) {
      console.log('Event not found');
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    console.log('Event found:', event._id);

    console.log('Fetching seats...');
    const allSeats = await Seat.find({ event_id: eventId });
    const soldSeats = allSeats.filter(s => s.status === 'sold');
    console.log(`Found ${allSeats.length} seats, ${soldSeats.length} sold`);

    const Transaction = require('../models/Transaction');
    console.log('Fetching transactions...');
    const transactions = await Transaction.find({
      event_id: eventId,
      payment_status: 'settlement'
    }).populate('user_id', 'name email').sort({ created_at: 1 });
    console.log(`Found ${transactions.length} transactions`);

    const totalTicketsSold = soldSeats.length;
    const totalRevenue = transactions.reduce((sum, t) => sum + t.amount, 0);
    const totalCapacity = 300;
    const occupancyPercent = totalCapacity > 0 ? Math.round((totalTicketsSold / totalCapacity) * 100) : 0;

    let categoryBreakdown = [];

    if (event.categories && event.categories.length > 0) {
      categoryBreakdown = event.categories.map(cat => {
        const categorySoldSeats = soldSeats.filter(s => s.category === cat.name);
        const categoryRevenue = categorySoldSeats.reduce((sum, s) => sum + (s.price || 0), 0);

        return {
          name: cat.name,
          section: cat.section,
          sold: categorySoldSeats.length,
          total: cat.seats,
          revenue: categoryRevenue,
          price: cat.price,
          available: cat.seats - categorySoldSeats.length
        };
      });
    } else {
      const balconySeats = soldSeats.filter(s => s.category === 'Balcony');
      const lowerFoyerSeats = soldSeats.filter(s => s.category === 'Lower Foyer');
      const balconyRevenue = balconySeats.reduce((sum, s) => sum + (s.price || 0), 0);
      const lowerRevenue = lowerFoyerSeats.reduce((sum, s) => sum + (s.price || 0), 0);

      categoryBreakdown = [
        {
          name: 'Lower Foyer',
          section: 'lower',
          sold: lowerFoyerSeats.length,
          total: 200,
          revenue: lowerRevenue,
          price: event.price_lower_foyer,
          available: 200 - lowerFoyerSeats.length
        },
        {
          name: 'Balcony',
          section: 'balcony',
          sold: balconySeats.length,
          total: 100,
          revenue: balconyRevenue,
          price: event.price_balcony,
          available: 100 - balconySeats.length
        }
      ];
    }

    // Format transactions for frontend
    const formattedTransactions = transactions.map(t => ({
      transaction_id: t.transaction_id,
      user_id: t.user_id?._id,
      user_name: t.user_id?.name,
      user_email: t.user_id?.email,
      amount: t.amount,
      discount_code: t.discount_code,
      discount_amount: t.discount_amount,
      seats: t.seats || [],
      payment_status: t.payment_status,
      payment_method: t.payment_method,
      created_at: t.created_at,
      paid_at: t.paid_at
    }));

    const responseData = {
      success: true,
      analytics: {
        event: {
          id: event._id,
          name: event.event_name,
          date: event.date,
          time: event.time,
          location: event.location,
          totalCapacity: totalCapacity,
          organizer: event.organizer_id
        },
        summary: {
          totalTicketsSold: totalTicketsSold,
          totalRevenue: totalRevenue,
          occupancyPercent: occupancyPercent,
          availableSeats: totalCapacity - totalTicketsSold
        },
        categoryBreakdown: categoryBreakdown,
        transactions: formattedTransactions
      }
    };

    console.log('Sending analytics response');
    res.json(responseData);
  } catch (error) {
    console.error('Get event analytics error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

module.exports = router;
