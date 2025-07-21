const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  type: { type: String, enum: ['monthly', 'occasion'], required: true },
  amount: Number,
  eventType: String,
  date: Date,
});

const UserSchema = new mongoose.Schema({
  fullname: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: String,
  password: { type: String, required: true },
  isAdmin: { type: Boolean, default: false },
  joinDate: { type: Date, default: Date.now },
  payments: [PaymentSchema]
});

module.exports = mongoose.model('User', UserSchema);
