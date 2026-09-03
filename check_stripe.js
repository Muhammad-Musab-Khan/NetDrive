require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function checkRefund() {
  try {
    const refunds = await stripe.refunds.list({ payment_intent: 'pi_3UBfBj2ZJoJpPULx1im0PJjt' });
    console.log('Refunds for latest booking:', refunds.data);
  } catch (e) {
    console.error(e);
  }
}
checkRefund();

