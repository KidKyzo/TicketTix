require('dotenv').config();
const mongoose = require('mongoose');

// Import models
const User = require('../models/User');
const Organizer = require('../models/Organizer');
const Event = require('../models/Event');
const Seat = require('../models/Seat');
const Transaction = require('../models/Transaction');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const clearAllCollections = async () => {
  try {
    console.log('\n🗑️  Clearing all collections...\n');

    // Clear each collection
    const userResult = await User.deleteMany({});
    console.log(`✅ Cleared Users: ${userResult.deletedCount} documents deleted`);

    const organizerResult = await Organizer.deleteMany({});
    console.log(`✅ Cleared Organizers: ${organizerResult.deletedCount} documents deleted`);

    const eventResult = await Event.deleteMany({});
    console.log(`✅ Cleared Events: ${eventResult.deletedCount} documents deleted`);

    const seatResult = await Seat.deleteMany({});
    console.log(`✅ Cleared Seats: ${seatResult.deletedCount} documents deleted`);

    const transactionResult = await Transaction.deleteMany({});
    console.log(`✅ Cleared Transactions: ${transactionResult.deletedCount} documents deleted`);

    console.log('\n✨ All collections cleared successfully!');
  } catch (error) {
    console.error('❌ Error clearing collections:', error);
    throw error;
  }
};

const seedInitialData = async () => {
  try {
    console.log('\n🌱 Seeding initial data...\n');

    // Create Admin User
    const admin = await User.create({
      full_name: 'Admin User',
      email: 'admin@ticketix.com',
      password: 'admin123',
      role: 'admin'
    });
    console.log('✅ Created Admin User:', admin.email);

    // Create Sample Attendee
    const attendee = await User.create({
      full_name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
      role: 'attendee'
    });
    console.log('✅ Created Sample Attendee:', attendee.email);

    // Create Sample Organizer
    const organizer = await Organizer.create({
      organizer_name: 'Premium Events Inc.',
      email: 'organizer@events.com',
      password: 'organizer123',
      status: 'approved'
    });
    console.log('✅ Created Sample Organizer:', organizer.organizer_name);

    // Create Sample Event
    const event = await Event.create({
      event_name: 'Grand Music Concert 2025',
      organizer_id: organizer._id,
      description: 'Join us for an unforgettable night of music and entertainment!',
      date: '2025-06-15',
      time: '19:00',
      location: 'Grand Event Hall - Jakarta',
      image: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4',
      price_lower_foyer: 500000,
      price_balcony: 300000,
      discounts: [
        { code: 'EARLY2025', discount: 20 },
        { code: 'STUDENT', discount: 15 }
      ]
    });
    console.log('✅ Created Sample Event:', event.event_name);

    // Create Seats for the event (A1-A300)
    const seats = [];
    
    for (let i = 1; i <= 300; i++) {
      const seatNumber = `A${i}`;
      const category = i <= 200 ? 'Lower Foyer' : 'Balcony';
      const price = i <= 200 ? event.price_lower_foyer : event.price_balcony;
      
      seats.push({
        event_id: event._id,
        seat_number: seatNumber,
        category: category,
        status: 'available',
        price: price,
        user_id: null,
        transaction_id: null,
        sold_at: null
      });
    }

    await Seat.insertMany(seats);
    console.log(`✅ Created ${seats.length} seats for event (A1-A200: Lower Foyer, A201-A300: Balcony)`);

    console.log('\n✨ Initial data seeded successfully!');
    console.log('\n📋 Summary:');
    console.log('   - Admin: admin@ticketix.com / admin123');
    console.log('   - Attendee: john@example.com / password123');
    console.log('   - Organizer: organizer@events.com / organizer123');
    console.log(`   - Event: ${event.event_name}`);
    console.log(`   - Seats: ${seats.length} seats created`);

  } catch (error) {
    console.error('❌ Error seeding data:', error);
    throw error;
  }
};

const resetDatabase = async () => {
  try {
    await connectDB();
    await clearAllCollections();
    await seedInitialData();
  } catch (error) {
    console.error('❌ Reset failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
    process.exit(0);
  }
};

// Run the reset
resetDatabase();
