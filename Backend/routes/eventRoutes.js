const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { createEvent, getEvents } = require('../controllers/eventController');

// Only admin can create event
router.post('/', auth, createEvent);
// Anyone (even not logged in) can view events
router.get('/', getEvents);

module.exports = router;
