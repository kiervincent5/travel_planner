# Travel Planner

A simple full-stack travel planner app with **user authentication** using **FREE APIs**:

- **Nominatim (OpenStreetMap)** - Places search and geocoding (no API key needed!)
- **OpenWeather** - Current weather (free tier: 1000 calls/day)
- **Mock flight data** - Demonstration flight search
- **JWT Authentication** - User registration and login

Backend is Node/Express and proxies external APIs to keep your keys secure and avoid CORS issues. Frontend is plain HTML/CSS/JS.

## Prerequisites

- Node.js 18+
- API key:
  - `OPENWEATHER_API_KEY` (https://openweathermap.org/ - free signup, no credit card)

## Setup

1. Install dependencies:

```bash
npm install
```

2. The `.env` file is already created. Just add your OpenWeather API key:

```
OPENWEATHER_API_KEY=your_actual_key_here
```

Get your free key from https://openweathermap.org/api

3. Run the server:

```bash
npm run dev
# or
npm start
```

Open http://localhost:3000 in your browser.

## Features

### 🔐 Authentication
- User registration with password hashing (bcrypt)
- Login with JWT token authentication
- Persistent sessions using localStorage
- Logout functionality

### 🗺️ Travel Planning
- **Trip Planner** - Step-by-step guided trip creation with itinerary generation
- Search destinations with autocomplete
- Get real-time weather data
- Search airports (Philippine and international)
- View mock flight results
- **Generate Trip Summary** - Create printable/downloadable trip itineraries

### ✨ New: Trip Planner Feature
Create complete trip plans with our guided 4-step process:
1. **Trip Details** - Set title, dates, travelers, and budget
2. **Destination** - Search and select destination with automatic weather lookup
3. **Flights** - Browse and select flights for your trip
4. **Review & Create** - Generate a professional trip itinerary/receipt

The trip planner generates a comprehensive summary including:
- Trip information and dates
- Destination details with coordinates
- Weather forecast
- Flight details and pricing
- Printable PDF-ready format

## Endpoints

### Authentication
- `POST /api/auth/register` — Register new user (username, email, password)
- `POST /api/auth/login` — Login user (email, password)
- `GET /api/auth/me` — Get current user info (requires token)

### Travel APIs
- `GET /api/maps/autocomplete?input=cebu` — Nominatim places autocomplete
- `GET /api/maps/geocode?address=Cebu City` — Geocoding (address → coordinates)
- `GET /api/weather/current?q=Cebu&units=metric` — Weather by city name
- `GET /api/weather/current?lat=10.3157&lon=123.8854&units=metric` — Weather by coordinates
- `GET /api/skyscanner/autocomplete?query=CEB` — Airport autocomplete
- `GET /api/skyscanner/search?origin=MNL&destination=CEB&date=2025-10-15&adults=1&currency=PHP` — Flight search

## Notes

- **Authentication**: Users are stored in-memory (resets on server restart). For production, integrate a database like MongoDB or PostgreSQL.
- **Nominatim** has a usage policy: max 1 request/second. The app respects this with proper User-Agent headers.
- **Flight data is mock/demo** - shows sample flights with random prices for demonstration.
- To use real flight APIs later, you can integrate Aviationstack (free tier) or other services.
- **JWT tokens** expire after 24 hours. Users will need to login again after expiration.
