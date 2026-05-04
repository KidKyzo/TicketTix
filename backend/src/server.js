require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

// Import routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const eventsRoutes = require('./routes/events');
const paymentRoutes = require('./routes/payment');
const waitlistRoutes = require('./routes/waitlist');

// Import change stream watcher
const { startTransactionWatcher } = require('./services/changeStreamWatcher');

const app = express();

connectDB().then(() => {
  startTransactionWatcher();
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:4200',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/waitlist', waitlistRoutes.router);

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ success: false, message: 'Server error: ' + err.message });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Ticketix Backend running on port ${PORT}`);
  console.log(`API endpoints available at http://localhost:${PORT}/api`);
});
