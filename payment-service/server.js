const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

const uri = `mongodb://${process.env.DB_USER}:${process.env.DB_PASS}@ac-qnctizq-shard-00-00.n5yqbji.mongodb.net:27017,ac-qnctizq-shard-00-01.n5yqbji.mongodb.net:27017,ac-qnctizq-shard-00-02.n5yqbji.mongodb.net:27017/cab_booking?ssl=true&replicaSet=atlas-fk7d2v-shard-0&authSource=admin&retryWrites=true&w=majority`;

mongoose.connect(uri, { family: 4 })
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err.message));

const PaymentSchema = new mongoose.Schema({
    bookingId: mongoose.Schema.Types.ObjectId,
    userId: mongoose.Schema.Types.ObjectId,
    baseFare: Number,
    totalPrice: Number,
    cabType: String,
    passengers: Number,
    bookingDateTime: Date,
    discountApplied: { type: Boolean, default: false },
    paidAt: { type: Date, default: Date.now }
});

const Payment = mongoose.model('Payment', PaymentSchema);

// Total price = baseFare × cabMultiplier × daytimeMultiplier × passengersMultiplier × discountMultiplier
function calcMultipliers(cabType, dateTime, passengers, hasDiscount) {
    const cabMultipliers = { Economic: 1, Premium: 1.2, Executive: 1.4 };
    const cabMult = cabMultipliers[cabType] || 1;

    const bookingTime = new Date(dateTime);
    if (Number.isNaN(bookingTime.getTime())) throw new Error('Booking date and time is required');

    const hour = bookingTime.getHours();
    // Midnight to 8am = 1.2x, 8am to midnight = 1x
    const daytimeMult = (hour >= 8) ? 1 : 1.2;

    let passMult = 1;
    if (passengers >= 5 && passengers <= 8) passMult = 2;
    else if (passengers > 8) throw new Error('Maximum 8 passengers allowed');

    const discountMult = hasDiscount ? 0.9 : 1;

    return { cabMult, daytimeMult, passMult, discountMult };
}

function buildBreakdown(baseFare, cabMult, daytimeMult, passMult, discountMult) {
    const cabSubtotal = baseFare * cabMult;
    const daytimeSubtotal = cabSubtotal * daytimeMult;
    const passengersSubtotal = daytimeSubtotal * passMult;
    const totalPrice = parseFloat((passengersSubtotal * discountMult).toFixed(2));

    return {
        baseFare: parseFloat(Number(baseFare).toFixed(2)),
        cab: {
            multiplier: cabMult,
            subtotal: parseFloat(cabSubtotal.toFixed(2)),
            extraCost: parseFloat((cabSubtotal - baseFare).toFixed(2))
        },
        time: {
            multiplier: daytimeMult,
            subtotal: parseFloat(daytimeSubtotal.toFixed(2)),
            extraCost: parseFloat((daytimeSubtotal - cabSubtotal).toFixed(2))
        },
        passengers: {
            multiplier: passMult,
            subtotal: parseFloat(passengersSubtotal.toFixed(2)),
            extraCost: parseFloat((passengersSubtotal - daytimeSubtotal).toFixed(2))
        },
        discount: {
            multiplier: discountMult,
            subtotal: totalPrice,
            extraCost: parseFloat((totalPrice - passengersSubtotal).toFixed(2))
        },
        totalPrice
    };
}

// --- API ENDPOINTS ---

// Health check endpoint
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Process payment
app.post('/payments', async (req, res) => {
    try {
        const { bookingId, userId, baseFare, cabType, passengers, bookingDateTime, hasDiscount } = req.body;

        const { cabMult, daytimeMult, passMult, discountMult } = calcMultipliers(
            cabType, bookingDateTime, passengers, hasDiscount
        );

        const breakdown = buildBreakdown(baseFare, cabMult, daytimeMult, passMult, discountMult);
        const totalPrice = breakdown.totalPrice;

        const payment = new Payment({
            bookingId, userId, baseFare, totalPrice,
            cabType, passengers, bookingDateTime,
            discountApplied: hasDiscount
        });
        await payment.save();

        res.status(201).json({ message: 'Payment processed', totalPrice, breakdown, payment });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get payment details
app.get('/payments/:id', async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id);
        if (!payment) return res.status(404).json({ error: 'Payment not found' });
        res.json(payment);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all payments for a user
app.get('/payments/user/:userId', async (req, res) => {
    try {
        const payments = await Payment.find({ userId: new mongoose.Types.ObjectId(req.params.userId) });
        res.json(payments);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(process.env.PORT || 3003, () => console.log('Payment service running on port ' + (process.env.PORT || 3003)));
