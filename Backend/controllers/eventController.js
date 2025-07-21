const Event = require('../models/Event');
const User = require('../models/User');

exports.createEvent = async (req, res) => {
  // Only allow if user is admin
  if (!req.user.isAdmin) return res.status(403).json({ msg: 'Admins only' });

  const { title, description, type, date } = req.body;
  try {
    const event = new Event({ title, description, type, date });
    await event.save();
    res.json(event);
  } catch (err) {
    res.status(500).send('Server error');
  }
};

exports.getEvents = async (req, res) => {
  try {
    const events = await Event.find().sort({ date: 1 });
    res.json(events);
  } catch (err) {
    res.status(500).send('Server error');
  }
};
