const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const paymentController = require('../controllers/paymentController');

// All payment routes require authentication except webhook
router.post('/', auth, paymentController.makePayment);
router.get('/history', auth, paymentController.getHistory);
router.get('/summary', auth, paymentController.getSummary);

// Paystack webhook does NOT require auth!
router.post('/paystack/webhook', paymentController.handlePaystackWebhook);

module.exports = router;
