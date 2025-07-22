const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth'); // <-- Make sure you have this middleware!
const { register, login, getProfile, getMembers } = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);

// Add these routes for admin/dashboard/profile
router.get('/profile', auth, getProfile);   // Protected route
router.get('/members', auth, getMembers);   // Protected route (should check isAdmin in controller)

module.exports = router;
