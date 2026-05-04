const Transaction = require('../models/Transaction');
const Seat = require('../models/Seat');
const { checkWaitlistAndNotify } = require('../routes/waitlist');

/**
 * MongoDB Change Stream Watcher
 * Watches for transaction deletions and automatically:
 * 1. Releases associated seats
 * 2. Notifies waitlist users
 */
const startTransactionWatcher = async () => {
  try {
    // Get the MongoDB collection directly for change streams
    const collection = Transaction.collection;

    console.log('🔄 Starting Transaction Change Stream Watcher...');

    // Create change stream with options to get the document before deletion
    // Note: fullDocumentBeforeChange requires MongoDB 6.0+ and a replica set
    const changeStream = collection.watch([{ $match: { operationType: 'delete' } }], {
      fullDocumentBeforeChange: 'whenAvailable',
    });

    changeStream.on('change', async (change) => {
      console.log('📢 Transaction deletion detected!');
      console.log('Change event:', JSON.stringify(change, null, 2));

      try {
        // Get the deleted document data
        const deletedDoc = change.fullDocumentBeforeChange;

        if (deletedDoc && deletedDoc.event_id) {
          const eventId = deletedDoc.event_id;
          const seats = deletedDoc.seats || [];

          console.log(`📋 Deleted transaction for event: ${eventId}`);
          console.log(`🪑 Seats to release: ${seats.map((s) => s.seat_number).join(', ')}`);

          // Release seats (mark as available)
          if (seats.length > 0) {
            const seatNumbers = seats.map((s) => s.seat_number);
            await Seat.updateMany(
              { event_id: eventId, seat_number: { $in: seatNumbers } },
              {
                status: 'available',
                user_id: null,
                transaction_id: null,
                sold_at: null,
              }
            );
            console.log(`✅ Released ${seatNumbers.length} seats`);
          }

          // Notify waitlist users
          console.log('📧 Triggering waitlist notification...');
          await checkWaitlistAndNotify(eventId);
          console.log('✅ Waitlist notification triggered successfully');
        } else {
          // If fullDocumentBeforeChange is not available (older MongoDB or config issue)
          console.log('⚠️ Could not get deleted document data.');
          console.log('💡 Tip: fullDocumentBeforeChange requires MongoDB 6.0+ with replica set.');
          console.log('Document ID that was deleted:', change.documentKey._id);
        }
      } catch (error) {
        console.error('❌ Error handling transaction deletion:', error);
      }
    });

    changeStream.on('error', (error) => {
      console.error('❌ Change Stream error:', error.message);

      // Check if it's a replica set error
      if (error.message.includes('replica set')) {
        console.log('');
        console.log('⚠️  Change Streams require MongoDB Replica Set!');
        console.log('📌 If using MongoDB Atlas, this should work automatically.');
        console.log('📌 For local MongoDB, you need to convert to a replica set.');
        console.log('');
      }
    });

    changeStream.on('close', () => {
      console.log('🔴 Transaction Change Stream closed');
    });

    console.log('✅ Transaction Change Stream Watcher started successfully');
    console.log('📌 Listening for transaction deletions...');
  } catch (error) {
    console.error('❌ Failed to start Change Stream Watcher:', error.message);

    if (error.message.includes('replica set') || error.message.includes('$changeStream')) {
      console.log('');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('⚠️  CHANGE STREAMS REQUIRE MONGODB REPLICA SET');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('');
      console.log('Options:');
      console.log('1. Use MongoDB Atlas (free tier) - Replica set enabled by default');
      console.log('2. Convert local MongoDB to replica set');
      console.log('');
      console.log('The server will continue running without change stream watching.');
      console.log('═══════════════════════════════════════════════════════════');
    }
  }
};

module.exports = { startTransactionWatcher };
