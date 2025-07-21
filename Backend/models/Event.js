const mongoose = require('mongoose');
const EventSchema = new mongoose.Schema({
  title: String,
  description: String,
  type: String, // naming, wedding, engagement, etc.
  date: Date
});
module.exports = mongoose.model('Event', EventSchema);
