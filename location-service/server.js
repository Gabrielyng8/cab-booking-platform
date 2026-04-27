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

const LocationSchema = new mongoose.Schema({
    userId: mongoose.Schema.Types.ObjectId,
    name: String,
    address: String,
    lat: Number,
    lng: Number
});

const Location = mongoose.model('Location', LocationSchema);

// Add favourite location
app.post('/locations', async (req, res) => {
    try {
        const location = new Location(req.body);
        await location.save();
        res.status(201).json(location);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all favourite locations for a user
app.get('/locations/user/:userId', async (req, res) => {
    try {
        const locations = await Location.find({ userId: new mongoose.Types.ObjectId(req.params.userId) });
        res.json(locations);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update a location
app.put('/locations/:id', async (req, res) => {
    try {
        const location = await Location.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(location);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete a location
app.delete('/locations/:id', async (req, res) => {
    try {
        await Location.findByIdAndDelete(req.params.id);
        res.json({ message: 'Location deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get weather for a saved location
app.get('/locations/:id/weather', async (req, res) => {
    try {
        const location = await Location.findById(req.params.id);
        if (!location) return res.status(404).json({ error: 'Location not found' });

        const response = await axios.get('https://weatherapi-com.p.rapidapi.com/current.json', {
            params: { q: `${location.lat},${location.lng}` },
            headers: {
                'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
                'X-RapidAPI-Host': 'weatherapi-com.p.rapidapi.com'
            }
        });

        res.json({
            location: location.name,
            weather: response.data.current
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(process.env.PORT || 3005, () => console.log('Location service running on port ' + (process.env.PORT || 3005)));
