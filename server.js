require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');


// 1. Import Route Controllers cleanly
const authRoutes = require('./routes/auth');
const vehicleRoutes = require('./routes/vehicles');
const chatRoutes = require('./routes/chat');
const contractRoutes = require('./routes/contracts'); 
const reviewRoutes = require('./routes/reviews');
const disputeRoutes = require('./routes/disputes');
const paymentRoutes = require('./routes/payments');

const app = express();

// Global Middleware Stack Configuration
app.use(express.json());
app.use(cors({ origin: 'http://localhost:3000' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database Connection — URI sourced exclusively from .env (must match seed.js)
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/netdrive';
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected cleanly to NetDrive system!'))
  .catch(err => console.log('❌ MongoDB Connection Error:', err));

// 2. Core Operational Route Mappings
app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);

// DUAL-ROUTE COMPATIBILITY LAYER:
// This ensures that whether your code hits /api/messages OR /api/chat, it resolves perfectly!
app.use('/api/messages', chatRoutes); 
app.use('/api/chat', chatRoutes); 

// MAPS CONTRACT ROUTER TO RESOLVE TRAFFIC NODES
app.use('/api/contracts', contractRoutes); 
app.use('/api/reviews', reviewRoutes);
app.use('/api/disputes', disputeRoutes);
app.use('/api/payments', paymentRoutes);

// Catch-all 404 handler for missing route targets
app.use((req, res) => {
  res.status(404).json({ error: `Route path [${req.method}] ${req.url} does not exist on this server instance.` });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 NetDrive Control Tower online on port ${PORT}`));