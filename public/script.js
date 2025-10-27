// Authentication state management
function getToken() {
  return localStorage.getItem('token');
}

function getUser() {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  updateAuthUI();
}

function updateAuthUI() {
  const user = getUser();
  const userInfo = document.getElementById('user-info');
  const authBtn = document.getElementById('auth-btn');
  
  if (user) {
    userInfo.textContent = `Welcome, ${user.username}`;
    authBtn.textContent = 'Logout';
    authBtn.classList.add('logout');
    authBtn.onclick = () => {
      logout();
      window.location.reload();
    };
  } else {
    userInfo.textContent = '';
    authBtn.textContent = 'Login';
    authBtn.classList.remove('logout');
    authBtn.onclick = () => {
      window.location.href = '/auth.html';
    };
  }
}

// Initialize auth UI on page load
document.addEventListener('DOMContentLoaded', updateAuthUI);

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Request failed: ${res.status} ${text}`);
  }
  return res.json();
}

// Google Places Autocomplete
document.getElementById('btn-autocomplete').addEventListener('click', async () => {
  const input = document.getElementById('place-input').value.trim();
  const out = document.getElementById('autocomplete-results');
  out.textContent = 'Loading...';
  try {
    const data = await fetchJSON(`/api/maps/autocomplete?input=${encodeURIComponent(input)}`);
    
    if (data.predictions && data.predictions.length > 0) {
      let html = '<div class="place-list">';
      data.predictions.forEach((place, index) => {
        html += `
          <div class="place-item">
            <div class="place-number">${index + 1}</div>
            <div class="place-info">
              <div class="place-main">${place.structured_formatting.main_text}</div>
              <div class="place-secondary">${place.description}</div>
            </div>
          </div>
        `;
      });
      html += '</div>';
      out.innerHTML = html;
    } else {
      out.textContent = 'No results found';
    }
  } catch (e) {
    out.textContent = e.message;
  }
});

// Geocode and auto-fetch weather
document.getElementById('btn-geocode').addEventListener('click', async () => {
  const address = document.getElementById('address-input').value.trim();
  const out = document.getElementById('weather-results');
  out.textContent = 'Geocoding...';
  try {
    const data = await fetchJSON(`/api/maps/geocode?address=${encodeURIComponent(address)}`);
    
    const first = data.results && data.results[0];
    if (first && first.geometry && first.geometry.location) {
      const lat = first.geometry.location.lat;
      const lon = first.geometry.location.lng;
      document.getElementById('lat-input').value = lat;
      document.getElementById('lon-input').value = lon;
      
      // Auto-fetch weather
      out.textContent = 'Fetching weather...';
      const units = document.getElementById('units-select').value;
      const weatherUrl = `/api/weather/current?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&units=${units}`;
      const weatherData = await fetchJSON(weatherUrl);
      displayWeather(weatherData, units);
    } else {
      out.textContent = 'Geocode result:\n' + JSON.stringify(data, null, 2);
    }
  } catch (e) {
    out.textContent = e.message;
  }
});

// Manual weather refresh (optional)
document.getElementById('btn-weather').addEventListener('click', async () => {
  const lat = document.getElementById('lat-input').value.trim();
  const lon = document.getElementById('lon-input').value.trim();
  const units = document.getElementById('units-select').value;
  const out = document.getElementById('weather-results');
  out.textContent = 'Loading weather...';
  try {
    let url;
    if (lat && lon) {
      url = `/api/weather/current?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&units=${units}`;
    } else {
      const q = document.getElementById('address-input').value.trim();
      url = `/api/weather/current?q=${encodeURIComponent(q)}&units=${units}`;
    }
    const data = await fetchJSON(url);
    displayWeather(data, units);
  } catch (e) {
    out.textContent = e.message;
  }
});

// Helper function to display weather nicely
function displayWeather(data, units) {
  const out = document.getElementById('weather-results');
  const unitSymbol = units === 'metric' ? '°C' : '°F';
  
  if (data.main && data.weather) {
    const html = `
      <div class="weather-card">
        <div class="weather-header">
          <h3>${data.name}, ${data.sys.country}</h3>
          <div class="weather-temp">${Math.round(data.main.temp)}${unitSymbol}</div>
        </div>
        <div class="weather-description">${data.weather[0].description}</div>
        <div class="weather-details">
          <div class="detail-item">
            <span class="detail-label">Feels like:</span>
            <span class="detail-value">${Math.round(data.main.feels_like)}${unitSymbol}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Humidity:</span>
            <span class="detail-value">${data.main.humidity}%</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Wind:</span>
            <span class="detail-value">${data.wind.speed} m/s</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Pressure:</span>
            <span class="detail-value">${data.main.pressure} hPa</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Visibility:</span>
            <span class="detail-value">${(data.visibility / 1000).toFixed(1)} km</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Clouds:</span>
            <span class="detail-value">${data.clouds.all}%</span>
          </div>
        </div>
      </div>
    `;
    out.innerHTML = html;
  } else {
    out.textContent = 'Unable to fetch weather data';
  }
}

// Skyscanner Autocomplete (Origin)
document.getElementById('btn-origin-ac').addEventListener('click', async () => {
  const query = document.getElementById('origin-input').value.trim();
  const out = document.getElementById('origin-ac-results');
  out.textContent = 'Loading...';
  try {
    const data = await fetchJSON(`/api/skyscanner/autocomplete?query=${encodeURIComponent(query)}`);
    displayAirports(data, out);
  } catch (e) {
    out.textContent = e.message;
  }
});

// Skyscanner Autocomplete (Destination)
document.getElementById('btn-dest-ac').addEventListener('click', async () => {
  const query = document.getElementById('destination-input').value.trim();
  const out = document.getElementById('dest-ac-results');
  out.textContent = 'Loading...';
  try {
    const data = await fetchJSON(`/api/skyscanner/autocomplete?query=${encodeURIComponent(query)}`);
    displayAirports(data, out);
  } catch (e) {
    out.textContent = e.message;
  }
});

// Helper function to display airports
function displayAirports(data, outputElement) {
  if (data.data && data.data.length > 0) {
    let html = '<div class="airport-list">';
    data.data.forEach(airport => {
      html += `
        <div class="airport-item">
          <span class="airport-code">${airport.code}</span>
          <span class="airport-name">${airport.name}</span>
          <span class="airport-city">${airport.city}, ${airport.country}</span>
        </div>
      `;
    });
    html += '</div>';
    outputElement.innerHTML = html;
  } else {
    outputElement.textContent = 'No airports found';
  }
}

// Skyscanner Search
document.getElementById('btn-search-flights').addEventListener('click', async () => {
  const origin = document.getElementById('origin-input').value.trim();
  const destination = document.getElementById('destination-input').value.trim();
  const date = document.getElementById('date-input').value;
  const adults = document.getElementById('adults-input').value || '1';
  const currency = document.getElementById('currency-input').value.trim();
  const out = document.getElementById('flights-results');
  out.textContent = 'Searching...';
  try {
    const params = new URLSearchParams({ origin, destination, date, adults });
    if (currency) params.append('currency', currency);
    const data = await fetchJSON(`/api/skyscanner/search?${params.toString()}`);
    displayFlights(data);
  } catch (e) {
    out.textContent = e.message;
  }
});

// Helper function to display flights
function displayFlights(data) {
  const out = document.getElementById('flights-results');
  
  if (data.flights && data.flights.length > 0) {
    let html = `<div class="flights-header">Flights from ${data.origin} to ${data.destination} on ${data.date}</div>`;
    if (data.note) {
      html += `<div class="flights-note">${data.note}</div>`;
    }
    html += '<div class="flight-list">';
    
    data.flights.forEach(flight => {
      html += `
        <div class="flight-item">
          <div class="flight-airline">${flight.airline}</div>
          <div class="flight-details">
            <div class="flight-time">
              <span>Departure: ${new Date(flight.departure).toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit'})}</span>
              <span>Arrival: ${new Date(flight.arrival).toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit'})}</span>
            </div>
            <div class="flight-duration">Duration: ${flight.duration}</div>
            <div class="flight-number">Flight: ${flight.flightNumber}</div>
          </div>
          <div class="flight-price">${flight.currency} ${flight.price}</div>
        </div>
      `;
    });
    html += '</div>';
    out.innerHTML = html;
  } else {
    out.textContent = 'No flights found';
  }
}
