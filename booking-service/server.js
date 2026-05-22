const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const cors = require('cors');
const EventEmitter = require('events');
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

const bookingEvents = new EventEmitter();

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

        // Publish the event - listeners handle everything from here
        bookingEvents.emit('booking:created', booking);

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

// Mark booking as completed (internal use)
app.patch('/bookings/:id/complete', async (req, res) => {
    try {
        const booking = await Booking.findByIdAndUpdate(req.params.id, { status: 'completed' }, { new: true });
        res.json(booking);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(process.env.PORT || 3002, () => console.log('Booking service running on port ' + (process.env.PORT || 3002)));

// --- EVENTS ---

// Task 5: Discount available — separate listener, fires once per user
bookingEvents.on('discount:available', async (userId) => {
    try {
        await axios.post(`${CUSTOMER_SERVICE}/users/${userId}/notifications`, {
            message: 'Congratulations! You have earned a 10% discount on your next booking!',
            type: 'discount'
        });
        await axios.patch(`${CUSTOMER_SERVICE}/users/${userId}/apply-discount`);
    } catch (err) {
        console.error('discount event error:', err.message);
    }
});

// Task 6: Ride ready - fires after a configurable delay after booking
const RIDE_READY_DELAY = parseInt(process.env.RIDE_READY_DELAY) || 3 * 60 * 1000; // Default: 3 minutes

bookingEvents.on('booking:created', (booking) => {
    setTimeout(async () => {
        try {
            await axios.post(`${CUSTOMER_SERVICE}/users/${booking.userId}/notifications`, {
                message: `Your cab is ready! From: ${booking.startLocation} → To: ${booking.endLocation}. Cab type: ${booking.cabType}.`,
                type: 'ride_ready'
            });

            await Booking.findByIdAndUpdate(booking._id, { status: 'completed' });

            const customerResponse = await axios.patch(
                `${CUSTOMER_SERVICE}/users/${booking.userId}/booking-completed`
            );

            const { completedBookings, discountApplied } = customerResponse.data;

            // Task 5: Discount - emit a second event when user completes 3 bookings, but only if they haven't already received the discount
            if (completedBookings === 3 && !discountApplied) {
                bookingEvents.emit('discount:available', booking.userId);
            }

        } catch (err) {
            console.error('ride_ready event error:', err.message);
        }
    }, RIDE_READY_DELAY);
});