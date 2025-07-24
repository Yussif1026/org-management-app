const axios = require('axios');
const User = require('../models/User');
const crypto = require('crypto');

// 1. Create Payment Session via Paystack and return redirect URL
exports.makePayment = async (req, res) => {
  const { type, eventType } = req.body;
  const userId = req.user.id;
  // Paystack expects amount in kobo (GHC 20 = 2000)
  const amount = type === 'monthly' ? 2000 : 5000;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    // Create Paystack payment session
    const paystackRes = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email: user.email,
        amount: amount,
        metadata: {
          userId: userId,
          eventType: eventType || null,
          type: type,
        }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Send both possible key names for max compatibility
    res.json({
      url: paystackRes.data.data.authorization_url,
      authorization_url: paystackRes.data.data.authorization_url
    });

  } catch (err) {
    console.error(err?.response?.data || err.message);
    res.status(500).json({ msg: 'Server error creating payment session' });
  }
};

// 2. Handle Paystack Webhook for real payment verification
exports.handlePaystackWebhook = async (req, res) => {
  console.log("Webhook received!", JSON.stringify(req.body, null, 2));

  // Validate Paystack signature
  const hash = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
    .update(JSON.stringify(req.body))
    .digest('hex');
  if (hash !== req.headers['x-paystack-signature']) {
    console.warn('Webhook signature mismatch! Unauthorized request.');
    return res.status(401).send('Unauthorized');
  }

  const event = req.body;
  // Only process successful payment events
  if (event.event === 'charge.success') {
    // Extract email robustly from both possible locations
    let email = event.data.email;
    if (!email && event.data.customer && event.data.customer.email) {
      email = event.data.customer.email;
    }
    const { metadata, amount, paid_at } = event.data;

    try {
      if (!email) {
        console.error('No email found in webhook payload!');
        return res.sendStatus(200); // Still return 200 to avoid Paystack retries
      }
      console.log(`Processing successful payment for ${email}, amount: ${amount}`);
      const user = await User.findOne({ email });

      if (user) {
        // Only add payment if this reference hasn't already been added (idempotency)
        const exists = user.payments.some(p => p.reference === event.data.reference);
        if (!exists) {
          user.payments.push({
            type: metadata?.type || null,
            amount: amount / 100, // convert kobo to GHC
            eventType: metadata?.eventType || null,
            date: paid_at,
            reference: event.data.reference
          });
          await user.save();
          console.log(`Payment added to user ${user.email}, ref: ${event.data.reference}`);
        } else {
          console.log(`Payment with reference ${event.data.reference} already exists for user ${user.email}.`);
        }
      } else {
        console.warn(`User not found for email: ${email}`);
      }
      return res.sendStatus(200);
    } catch (err) {
      console.error('Error in webhook processing:', err);
      return res.sendStatus(500);
    }
  }
  res.sendStatus(200);
};

// 3. Get User Payment History (local records)
exports.getHistory = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json(user.payments);
  } catch (err) {
    res.status(500).send('Server error');
  }
};

// 4. Get User Payment Summary (local records)
exports.getSummary = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const total = user.payments.reduce((sum, p) => sum + p.amount, 0);
    const monthly = user.payments.filter(p => p.type === 'monthly').reduce((sum, p) => sum + p.amount, 0);
    const occasion = user.payments.filter(p => p.type === 'occasion').reduce((sum, p) => sum + p.amount, 0);
    res.json({ total, monthly, occasion });
  } catch (err) {
    res.status(500).send('Server error');
  }
};
