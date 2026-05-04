const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Organizer = require('../models/Organizer');

// Register attendee
router.post('/register-attendee', async (req, res) => {
  try {
    const { email, password, full_name } = req.body;

    if (!email || !password || !full_name) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const user = new User({
      full_name: full_name.trim(),
      email: email.toLowerCase(),
      password: password,
      role: 'attendee'
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: 'Registration successful. You can now login.'
    });
  } catch (error) {
    console.error('Register attendee error:', error.message);
    console.error('Full error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

// Register organizer (pending approval)
router.post('/register-organizer', async (req, res) => {
  try {
    const { email, organizer_name, phone, organization, description } = req.body;

    if (!email || !organizer_name) {
      return res.status(400).json({ success: false, message: 'Name and email are required' });
    }

    const existingOrganizer = await Organizer.findOne({ email: email.toLowerCase() });
    if (existingOrganizer) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered as attendee' });
    }

    const organizer = new Organizer({
      organizer_name: organizer_name.trim(),
      email: email.toLowerCase(),
      password: 'PENDING_APPROVAL',
      phone,
      organization,
      description,
      status: 'pending',
      is_first_login: true
    });

    await organizer.save();

    res.status(201).json({
      success: true,
      message: 'Application submitted. Please wait for admin approval.'
    });
  } catch (error) {
    console.error('Register organizer error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Login (all roles)
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ success: false, message: 'Email, password, and role are required' });
    }

    if (role === 'admin') {
      if (email === 'admin@ticketix.com' && password === 'admin123') {
        return res.json({
          success: true,
          user: { email, role: 'admin', full_name: 'Admin' }
        });
      }

      const adminUser = await User.findOne({ email: email.toLowerCase(), role: 'admin' });
      if (adminUser && adminUser.password === password) {
        return res.json({
          success: true,
          user: {
            id: adminUser._id,
            email: adminUser.email,
            role: 'admin',
            full_name: adminUser.full_name
          }
        });
      }

      return res.status(401).json({ success: false, message: 'Invalid admin credentials' });
    }

    if (role === 'organizer') {
      if (email === 'organizer@ticketix.com' && password === 'org123') {
        return res.json({
          success: true,
          user: {
            id: 'demo-organizer-id',
            _id: 'demo-organizer-id',
            email,
            role: 'organizer',
            organizer_name: 'Demo Organizer',
            is_first_login: false
          }
        });
      }

      const organizer = await Organizer.findOne({ email: email.toLowerCase() });

      if (!organizer) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }

      if (organizer.status === 'pending') {
        return res.status(403).json({
          success: false,
          message: 'Your application is pending approval. Please wait for admin review.'
        });
      }

      if (organizer.status === 'rejected') {
        return res.status(403).json({
          success: false,
          message: 'Your application was rejected.'
        });
      }

      if (organizer.password !== password) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }

      return res.json({
        success: true,
        user: {
          id: organizer._id,
          _id: organizer._id,
          email: organizer.email,
          role: 'organizer',
          organizer_name: organizer.organizer_name,
          is_first_login: organizer.is_first_login
        }
      });
    }

    if (role === 'attendee') {
      if (email === 'user@ticketix.com' && password === 'user123') {
        return res.json({
          success: true,
          user: {
            id: 'demo-user-id',
            _id: 'demo-user-id',
            email,
            role: 'attendee',
            full_name: 'Demo User'
          }
        });
      }

      const user = await User.findOne({ email: email.toLowerCase(), role: 'attendee' });

      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }

      if (user.password !== password) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }

      return res.json({
        success: true,
        user: {
          id: user._id,
          email: user.email,
          role: 'attendee',
          full_name: user.full_name
        }
      });
    }

    res.status(400).json({ success: false, message: 'Invalid role' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Change password (organizer first login)
router.post('/change-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ success: false, message: 'Email and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const organizer = await Organizer.findOne({ email: email.toLowerCase() });

    if (!organizer) {
      return res.status(404).json({ success: false, message: 'Organizer not found' });
    }

    organizer.password = newPassword;
    organizer.is_first_login = false;
    await organizer.save();

    res.json({
      success: true,
      message: 'Password changed successfully. Please login with your new password.'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
