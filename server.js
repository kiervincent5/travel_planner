// Load dotenv only in development (Railway provides env vars directly)
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// In-memory user storage (replace with database in production)
const users = [];

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// =============== Authentication Routes ===============
// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user already exists
    const existingUser = users.find(u => u.email === email || u.username === username);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = {
      id: users.length + 1,
      username,
      email,
      password: hashedPassword,
      createdAt: new Date().toISOString()
    };

    users.push(user);

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: { id: user.id, username: user.username, email: user.email }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, username: user.username, email: user.email }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user (protected route example)
app.get('/api/auth/me', authenticateToken, (req, res) => {
  const user = users.find(u => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ id: user.id, username: user.username, email: user.email });
});

// Nominatim (OpenStreetMap)
// Places Search
app.get('/api/maps/autocomplete', async (req, res) => {
  try {
    const { input } = req.query;
    if (!input) return res.status(400).json({ error: 'Missing input' });
    
    const url = `https://nominatim.openstreetmap.org/search`;
    const { data } = await axios.get(url, {
      params: {
        q: input,
        format: 'json',
        limit: 5,
        addressdetails: 1
      },
      headers: {
        'User-Agent': 'TravelPlannerApp/1.0'
      }
    });
    
    
    const predictions = data.map(place => ({
      description: place.display_name,
      place_id: place.place_id,
      structured_formatting: {
        main_text: place.name || place.display_name.split(',')[0],
        secondary_text: place.display_name
      }
    }));
    
    res.json({ predictions, status: 'OK' });
  } catch (err) {
    console.error('Nominatim Autocomplete error', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch place autocomplete' });
  }
});

// Geocoding
app.get('/api/maps/geocode', async (req, res) => {
  try {
    const { address } = req.query;
    if (!address) return res.status(400).json({ error: 'Missing address' });
    
    const url = `https://nominatim.openstreetmap.org/search`;
    const { data } = await axios.get(url, {
      params: {
        q: address,
        format: 'json',
        limit: 1
      },
      headers: {
        'User-Agent': 'TravelPlannerApp/1.0'
      }
    });
    
    if (data.length === 0) {
      return res.json({ results: [], status: 'ZERO_RESULTS' });
    }
    
    // Transform to Google-like format
    const results = data.map(place => ({
      formatted_address: place.display_name,
      geometry: {
        location: {
          lat: parseFloat(place.lat),
          lng: parseFloat(place.lon)
        }
      },
      place_id: place.place_id
    }));
    
    res.json({ results, status: 'OK' });
  } catch (err) {
    console.error('Nominatim Geocode error', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to geocode address' });
  }
});

// OpenWeather API 
// Current weather by lat/lon or city name
app.get('/api/weather/current', async (req, res) => {
  try {
    const { lat, lon, q, units } = req.query;
    const appid = process.env.OPENWEATHER_API_KEY;
    const unitParam = units || 'metric';

    let url;
    if (lat && lon) {
      const params = new URLSearchParams({ lat, lon, appid, units: unitParam });
      url = `https://api.openweathermap.org/data/2.5/weather?${params.toString()}`;
    } else if (q) {
      const params = new URLSearchParams({ q, appid, units: unitParam });
      url = `https://api.openweathermap.org/data/2.5/weather?${params.toString()}`;
    } else {
      return res.status(400).json({ error: 'Provide lat/lon or q (city name)' });
    }

    const { data } = await axios.get(url);
    res.json(data);
  } catch (err) {
    console.error('OpenWeather error', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch weather' });
  }
});

// Airport Search
// Location autocomplete for airports
app.get('/api/skyscanner/autocomplete', async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.status(400).json({ error: 'Missing query' });
    
    // Extended airport database with Philippine airports
    const fallbackAirports = [
      // Philippines
      { code: 'MNL', name: 'Ninoy Aquino International Airport', city: 'Manila', country: 'Philippines' },
      { code: 'CEB', name: 'Mactan-Cebu International Airport', city: 'Cebu', country: 'Philippines' },
      { code: 'DVO', name: 'Francisco Bangoy International Airport', city: 'Davao', country: 'Philippines' },
      { code: 'ILO', name: 'Iloilo International Airport', city: 'Iloilo', country: 'Philippines' },
      { code: 'CRK', name: 'Clark International Airport', city: 'Angeles', country: 'Philippines' },
      { code: 'CGY', name: 'Laguindingan Airport', city: 'Cagayan de Oro', country: 'Philippines' },
      { code: 'BCD', name: 'Bacolod-Silay Airport', city: 'Bacolod', country: 'Philippines' },
      { code: 'TAG', name: 'Tagbilaran Airport', city: 'Tagbilaran', country: 'Philippines' },
      { code: 'KLO', name: 'Kalibo International Airport', city: 'Kalibo', country: 'Philippines' },
      { code: 'PPS', name: 'Puerto Princesa International Airport', city: 'Puerto Princesa', country: 'Philippines' },
      { code: 'GES', name: 'General Santos International Airport', city: 'General Santos', country: 'Philippines' },
      { code: 'ZAM', name: 'Zamboanga International Airport', city: 'Zamboanga', country: 'Philippines' },
      // International
      { code: 'SFO', name: 'San Francisco International Airport', city: 'San Francisco', country: 'USA' },
      { code: 'LAX', name: 'Los Angeles International Airport', city: 'Los Angeles', country: 'USA' },
      { code: 'JFK', name: 'John F. Kennedy International Airport', city: 'New York', country: 'USA' },
      { code: 'CDG', name: 'Charles de Gaulle Airport', city: 'Paris', country: 'France' },
      { code: 'LHR', name: 'Heathrow Airport', city: 'London', country: 'UK' },
      { code: 'NRT', name: 'Narita International Airport', city: 'Tokyo', country: 'Japan' },
      { code: 'HND', name: 'Haneda Airport', city: 'Tokyo', country: 'Japan' },
      { code: 'SYD', name: 'Sydney Airport', city: 'Sydney', country: 'Australia' },
      { code: 'DXB', name: 'Dubai International Airport', city: 'Dubai', country: 'UAE' },
      { code: 'SIN', name: 'Singapore Changi Airport', city: 'Singapore', country: 'Singapore' },
      { code: 'ICN', name: 'Incheon International Airport', city: 'Seoul', country: 'South Korea' },
      { code: 'BKK', name: 'Suvarnabhumi Airport', city: 'Bangkok', country: 'Thailand' }
    ];
    
    // Try Aviationstack API first
    if (process.env.AVIATIONSTACK_API_KEY && process.env.AVIATIONSTACK_API_KEY !== 'ceecf26cd92d6a2802b971a595fff7db') {
      try {
        const url = 'http://api.aviationstack.com/v1/airports';
        const { data } = await axios.get(url, {
          params: {
            access_key: process.env.AVIATIONSTACK_API_KEY,
            search: query,
            limit: 10
          },
          timeout: 5000
        });
        
        if (data.data && data.data.length > 0) {
          const airports = data.data.map(airport => ({
            code: airport.iata_code || airport.icao_code || 'N/A',
            name: airport.airport_name,
            city: airport.city_name || airport.municipality || 'Unknown',
            country: airport.country_name
          }));
          return res.json({ data: airports });
        }
      } catch (apiErr) {
        console.warn('Aviationstack API failed, using fallback:', apiErr.message);
      }
    }
    
    // Fallback: Use local database
    const filtered = fallbackAirports.filter(a => 
      a.code.toLowerCase().includes(query.toLowerCase()) ||
      a.name.toLowerCase().includes(query.toLowerCase()) ||
      a.city.toLowerCase().includes(query.toLowerCase())
    );
    
    res.json({ data: filtered });
  } catch (err) {
    console.error('Airport autocomplete error', err.message);
    res.status(500).json({ error: 'Failed to fetch airport autocomplete' });
  }
});

// Simple flight search (Mock data)
app.get('/api/skyscanner/search', async (req, res) => {
  try {
    const { origin, destination, date, adults = 1, currency = 'PHP' } = req.query;
    if (!origin || !destination || !date) {
      return res.status(400).json({ error: 'Missing origin, destination, or date' });
    }
    
    // Mock flight results
    const flights = [
      {
        airline: 'Philippine Airlines',
        flightNumber: 'PR101',
        departure: `${date}T08:00:00`,
        arrival: `${date}T10:30:00`,
        duration: '2h 30m',
        price: Math.floor(Math.random() * 300) + 100,
        currency: currency
      },
      {
        airline: 'Cebu Pacific',
        flightNumber: '5J123',
        departure: `${date}T12:00:00`,
        arrival: `${date}T14:45:00`,
        duration: '2h 45m',
        price: Math.floor(Math.random() * 250) + 80,
        currency: currency
      },
      {
        airline: 'AirAsia',
        flightNumber: 'Z2456',
        departure: `${date}T16:30:00`,
        arrival: `${date}T19:00:00`,
        duration: '2h 30m',
        price: Math.floor(Math.random() * 200) + 60,
        currency: currency
      }
    ];
    
    res.json({
      origin,
      destination,
      date,
      adults,
      flights
    });
  } catch (err) {
    console.error('Flight search error', err.message);
    res.status(500).json({ error: 'Failed to search flights' });
  }
});

app.listen(PORT, () => {
  console.log(`Travel Planner server running on http://localhost:${PORT}`);
});
