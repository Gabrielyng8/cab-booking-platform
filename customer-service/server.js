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

// Schemas
const UserSchema = new mongoose.Schema({
    firstName: String,
    surname: String,
    email: { type: String, unique: true },
    password: String,
    completedBookings: { type: Number, default: 0 },
    discountApplied: { type: Boolean, default: false }
});

const NotificationSchema = new mongoose.Schema({
    userId: mongoose.Schema.Types.ObjectId,
    message: String,
    type: String,
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Notification = mongoose.model('Notification', NotificationSchema);

// --- API ENDPOINTS ---

// Health check endpoint
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Register
app.post('/register', async (req, res) => {
    try {
        const { firstName, surname, email, password } = req.body;
        const existing = await User.findOne({ email });
        if (existing) return res.status(400).json({ error: 'Email already registered' });
        const user = new User({ firstName, surname, email, password });
        await user.save();
        res.status(201).json({ message: 'User registered successfully', userId: user._id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Login
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email, password });
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });
        res.json({ message: 'Login successful', userId: user._id, firstName: user.firstName });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get user details
app.get('/users/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Inbox: get notifications
app.get('/users/:id/notifications', async (req, res) => {
    try {
        const notifications = await Notification.find({ userId: req.params.id }).sort({ createdAt: -1 });
        res.json(notifications);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Internal: create notification (called by events)
app.post('/users/:id/notifications', async (req, res) => {
    try {
        const notif = new Notification({ userId: req.params.id, ...req.body });
        await notif.save();
        res.status(201).json(notif);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Internal: increment bookings & check discount
// Returns { completedBookings, discountApplied } - this is the inter-service contract.
app.patch('/users/:id/booking-completed', async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { $inc: { completedBookings: 1 } },
            { new: true }
        );
        res.json({ completedBookings: user.completedBookings, discountApplied: user.discountApplied });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Internal: mark discount as applied
app.patch('/users/:id/apply-discount', async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.id, { discountApplied: true }, { new: true });
        res.json({ discountApplied: user.discountApplied });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(process.env.PORT || 3001, () => console.log('Customer service running on port ' + (process.env.PORT || 3001)));
