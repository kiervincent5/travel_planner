require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// Validate required environment variables
if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET is required but not set in environment variables');
  process.exit(1);
}

if (!process.env.OPENWEATHER_API_KEY) {
  console.warn('⚠️  OPENWEATHER_API_KEY not set - weather API will not work');
}

// Try to use database, fallback to in-memory if not available
let prisma;
let useDatabase = false;

try {
  prisma = require('./database');
  useDatabase = true;
  console.log('✅ Database connection enabled');
} catch (error) {
  console.log('⚠️  Database not available, using in-memory storage');
  console.log('   To enable database: npm run setup:db');
}

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://nominatim.openstreetmap.org", "https://api.openweathermap.org"]
    }
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL || 'https://yourdomain.com'] 
    : true,
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// In-memory user storage (fallback)
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
app.get('/api/health', async (req, res) => {
  try {
    let databaseStatus = 'disabled';
    
    if (useDatabase && prisma) {
      try {
        await prisma.$queryRaw`SELECT 1`;
        databaseStatus = 'connected';
      } catch (error) {
        databaseStatus = 'error';
      }
    }

    res.json({ 
      status: 'ok', 
      time: new Date().toISOString(),
      database: databaseStatus,
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      time: new Date().toISOString(),
      error: error.message
    });
  }
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

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    let user;

    if (useDatabase && prisma) {
      // Database version
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email: email },
            { username: username }
          ]
        }
      });

      if (existingUser) {
        return res.status(400).json({ error: 'User already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      user = await prisma.user.create({
        data: {
          username,
          email,
          password: hashedPassword
        }
      });
    } else {
      // In-memory version
      const existingUser = users.find(u => u.email === email || u.username === username);
      if (existingUser) {
        return res.status(400).json({ error: 'User already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      user = {
        id: users.length + 1,
        username,
        email,
        password: hashedPassword,
        createdAt: new Date().toISOString()
      };
      users.push(user);
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' } // Longer expiration for production
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

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    let user;

    if (useDatabase && prisma) {
      user = await prisma.user.findUnique({
        where: { email: email }
      });
    } else {
      user = users.find(u => u.email === email);
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
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

// Get current user
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    let user;

    if (useDatabase && prisma) {
      user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { id: true, username: true, email: true, createdAt: true }
      });
    } else {
      user = users.find(u => u.id === req.user.id);
      if (user) {
        user = { id: user.id, username: user.username, email: user.email, createdAt: user.createdAt };
      }
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

// =============== Trip Management Routes (Database only) ===============
if (useDatabase && prisma) {
  // Get user's trips
  app.get('/api/trips', authenticateToken, async (req, res) => {
    try {
      const trips = await prisma.trip.findMany({
        where: { userId: req.user.id },
        include: {
          days: {
            include: {
              activities: true
            }
          },
          expenses: true
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json(trips);
    } catch (err) {
      console.error('Get trips error:', err);
      res.status(500).json({ error: 'Failed to fetch trips' });
    }
  });

  // Create new trip
  app.post('/api/trips', authenticateToken, async (req, res) => {
    try {
      const { title, description, startDate, endDate, destination } = req.body;

      if (!title || !startDate || !endDate || !destination) {
        return res.status(400).json({ error: 'Title, dates, and destination are required' });
      }

      const trip = await prisma.trip.create({
        data: {
          title,
          description,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          destination,
          userId: req.user.id
        }
      });

      res.status(201).json(trip);
    } catch (err) {
      console.error('Create trip error:', err);
      res.status(500).json({ error: 'Failed to create trip' });
    }
  });
}

// =============== External API Routes ===============
// Nominatim (OpenStreetMap) - Places Search
app.get('/api/maps/autocomplete', async (req, res) => {
  try {
    const { input } = req.query;
    if (!input || input.length < 2) {
      return res.status(400).json({ error: 'Input must be at least 2 characters' });
    }
    
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
      },
      timeout: 5000
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
      },
      timeout: 5000
    });
    
    if (data.length === 0) {
      return res.json({ results: [], status: 'ZERO_RESULTS' });
    }
    
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
app.get('/api/weather/current', async (req, res) => {
  try {
    const { lat, lon, q, units } = req.query;
    const appid = process.env.OPENWEATHER_API_KEY;
    const unitParam = units || 'metric';

    if (!appid) {
      return res.status(503).json({ error: 'Weather service temporarily unavailable' });
    }

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

    const { data } = await axios.get(url, { timeout: 10000 });
    res.json(data);
  } catch (err) {
    console.error('OpenWeather error', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch weather' });
  }
});

// Airport Search
app.get('/api/skyscanner/autocomplete', async (req, res) => {
  try {
    const { query } = req.query;
    if (!query || query.length < 2) {
      return res.status(400).json({ error: 'Query must be at least 2 characters' });
    }
    
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

// Flight search (Mock data)
app.get('/api/skyscanner/search', async (req, res) => {
  try {
    const { origin, destination, date, adults = 1, currency = 'PHP' } = req.query;
    if (!origin || !destination || !date) {
      return res.status(400).json({ error: 'Missing origin, destination, or date' });
    }
    
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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Travel Planner server running on http://localhost:${PORT}`);
  console.log(`📊 Database: ${useDatabase ? 'Enabled' : 'Disabled (in-memory)'}`);
  console.log(`🔒 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 CORS: ${process.env.NODE_ENV === 'production' ? 'Restricted' : 'Open'}`);
});
