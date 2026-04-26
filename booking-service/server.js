const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

const uri = `mongodb://${process.env.DB_USER}:${process.env.DB_PASS}@ac-qnctizq-shard-00-00.n5yqbji.mongodb.net:27017,ac-qnctizq-shard-00-01.n5yqbji.mongodb.net:27017,ac-qnctizq-shard-00-02.n5yqbji.mongodb.net:27017/cab_booking?ssl=true&replicaSet=atlas-fk7d2v-shard-0&authSource=admin&retryWrites=true&w=majority`;

mongoose.connect(uri, { family: 4 })
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err.message));

const BookingSchema = new mongoose.Schema({
    userId: mongoose.Schema.Types.ObjectId,
    startLocation: String,
    endLocation: String,
    dateTime: Date,
    passengers: Number,
    cabType: { type: String, enum: ['Economic', 'Premium', 'Executive'] },
    status: { type: String, default: 'upcoming' },
    createdAt: { type: Date, default: Date.now }
});

const Booking = mongoose.model('Booking', BookingSchema);

const CUSTOMER_SERVICE = process.env.CUSTOMER_SERVICE_URL || 'http://localhost:3001';

// Create booking
app.post('/bookings', async (req, res) => {
    try {
        if (req.body.passengers > 8) {
            return res.status(400).json({ error: 'Maximum 8 passengers allowed' });
        }

        const bookingData = {
            ...req.body,
            userId: new mongoose.Types.ObjectId(req.body.userId)
        };

        const booking = new Booking(bookingData);
        await booking.save();

        res.status(201).json(booking);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get current/upcoming bookings for a user
app.get('/bookings/user/:userId/current', async (req, res) => {
    try {
        const bookings = await Booking.find({
            userId: new mongoose.Types.ObjectId(req.params.userId),
            status: 'upcoming'
        });
        res.json(bookings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get past bookings for a user
app.get('/bookings/user/:userId/past', async (req, res) => {
    try {
        const bookings = await Booking.find({
            userId: new mongoose.Types.ObjectId(req.params.userId),
            status: 'completed'
        });
        res.json(bookings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get single booking
app.get('/bookings/:id', async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) return res.status(404).json({ error: 'Booking not found' });
        res.json(booking);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Internal: Mark booking as completed
app.patch('/bookings/:id/complete', async (req, res) => {
    try {
        const booking = await Booking.findByIdAndUpdate(req.params.id, { status: 'completed' }, { new: true });
        res.json(booking);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(process.env.PORT || 3002, () => console.log('Booking service running on port ' + (process.env.PORT || 3002)));
