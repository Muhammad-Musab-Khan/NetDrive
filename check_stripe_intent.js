require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function checkIntent() {
  try {
    const intent = await stripe.paymentIntents.retrieve('pi_3UBfBj2ZJoJpPULx1im0PJjt');
    console.log('Receipt Email:', intent.receipt_email);
    console.log('Metadata:', intent.metadata);
  } catch (e) {
    console.error(e);
  }
}
checkIntent();

