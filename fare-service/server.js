const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// GET /fare?dep_lat=...&dep_lng=...&arr_lat=...&arr_lng=...
app.get('/fare', async (req, res) => {
    try {
        const { dep_lat, dep_lng, arr_lat, arr_lng } = req.query;

        const response = await axios.get('https://taxi-fare-calculator.p.rapidapi.com/search-geo', {
            params: { dep_lat, dep_lng, arr_lat, arr_lng },
            headers: {
                'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
                'X-RapidAPI-Host': 'taxi-fare-calculator.p.rapidapi.com'
            }
        });

        res.json({ baseFare: response.data.fare || response.data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(process.env.PORT || 3004, () => console.log('Fare service running on port ' + (process.env.PORT || 3004)));
