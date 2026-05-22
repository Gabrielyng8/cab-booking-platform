const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());

app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://127.0.0.1:5500',
        process.env.FRONTEND_URL || '*'
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type']
}));

const CUSTOMER = process.env.CUSTOMER_SERVICE_URL || 'http://localhost:3001';
const BOOKING = process.env.BOOKING_SERVICE_URL || 'http://localhost:3002';
const PAYMENT = process.env.PAYMENT_SERVICE_URL || 'http://localhost:3003';
const FARE = process.env.FARE_SERVICE_URL || 'http://localhost:3004';
const LOCATION = process.env.LOCATION_SERVICE_URL || 'http://localhost:3005';

const forward = (serviceUrl) => async (req, res) => {
    try {
        const url = `${serviceUrl}${req.path}`;
        const method = req.method.toLowerCase();

        const config = {
            params: req.query,
            headers: { 'Content-Type': 'application/json' },
            data: req.body,
            timeout: 30000
        };

        const response = await axios({ method, url, ...config });
        res.status(response.status).json(response.data);
    } catch (err) {
        const status = err.response?.status || 500;
        res.status(status).json(err.response?.data || { error: err.message });
    }
};

app.use('/api/customers', forward(CUSTOMER));
app.use('/api/bookings', forward(BOOKING));
app.use('/api/payments', forward(PAYMENT));
app.use('/api/fare', forward(FARE));
app.use('/api/locations', forward(LOCATION));

// Health check endpoint
app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Gateway running on port ${PORT}`));