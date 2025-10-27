// Trip planner state
const tripPlan = {
  title: '',
  startDate: '',
  endDate: '',
  travelers: 1,
  budget: '',
  notes: '',
  destination: null,
  weather: null,
  flight: null
};

let currentStep = 1;
let editingPlanIndex = null;

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
      window.location.href = '/';
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
document.addEventListener('DOMContentLoaded', () => {
  updateAuthUI();
  
  // Set minimum date to today
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('start-date').min = today;
  document.getElementById('end-date').min = today;
  
  // Update end date min when start date changes
  document.getElementById('start-date').addEventListener('change', (e) => {
    document.getElementById('end-date').min = e.target.value;
  });
  
  // Check if we're editing an existing plan
  loadEditingPlan();
});

// Step navigation
function nextStep(step) {
  // Validate current step before proceeding
  if (!validateStep(currentStep)) {
    return;
  }
  
  // Save current step data
  saveStepData(currentStep);
  
  // Update UI
  document.getElementById(`step-${currentStep}`).classList.remove('active');
  document.getElementById(`step-${step}`).classList.add('active');
  
  // Update step indicator
  document.querySelector(`.step[data-step="${currentStep}"]`).classList.remove('active');
  document.querySelector(`.step[data-step="${currentStep}"]`).classList.add('completed');
  document.querySelector(`.step[data-step="${step}"]`).classList.add('active');
  
  currentStep = step;
  
  // Load step data
  if (step === 4) {
    loadReviewContent();
  }
  
  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function prevStep(step) {
  document.getElementById(`step-${currentStep}`).classList.remove('active');
  document.getElementById(`step-${step}`).classList.add('active');
  
  document.querySelector(`.step[data-step="${currentStep}"]`).classList.remove('active');
  document.querySelector(`.step[data-step="${step}"]`).classList.remove('completed');
  document.querySelector(`.step[data-step="${step}"]`).classList.add('active');
  
  currentStep = step;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Validation
function validateStep(step) {
  if (step === 1) {
    const title = document.getElementById('trip-title').value.trim();
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    
    if (!title) {
      alert('Please enter a trip title');
      return false;
    }
    
    if (!startDate || !endDate) {
      alert('Please select start and end dates');
      return false;
    }
    
    if (new Date(endDate) < new Date(startDate)) {
      alert('End date must be after start date');
      return false;
    }
    
    return true;
  }
  
  if (step === 2) {
    if (!tripPlan.destination) {
      alert('Please select a destination');
      return false;
    }
    return true;
  }
  
  return true;
}

// Save step data
function saveStepData(step) {
  if (step === 1) {
    tripPlan.title = document.getElementById('trip-title').value.trim();
    tripPlan.startDate = document.getElementById('start-date').value;
    tripPlan.endDate = document.getElementById('end-date').value;
    tripPlan.travelers = document.getElementById('travelers').value;
    tripPlan.budget = document.getElementById('budget').value.trim();
    tripPlan.notes = document.getElementById('trip-notes').value.trim();
  }
}

// Destination search
async function searchDestination() {
  const input = document.getElementById('destination-search').value.trim();
  const resultsDiv = document.getElementById('destination-results');
  
  if (!input) {
    alert('Please enter a destination');
    return;
  }
  
  resultsDiv.innerHTML = '<p style="color: #94a3b8;">Searching...</p>';
  
  try {
    const response = await fetch(`/api/maps/autocomplete?input=${encodeURIComponent(input)}`);
    const data = await response.json();
    
    if (data.predictions && data.predictions.length > 0) {
      let html = '<h3 style="color: #e2e8f0; margin-top: 20px;">👇 Click on a destination to select it:</h3>';
      data.predictions.forEach((place, index) => {
        html += `
          <div class="selected-item" style="cursor: pointer; transition: all 0.2s;" 
               onmouseover="this.style.borderColor='#2563eb'; this.style.transform='translateY(-2px)'" 
               onmouseout="this.style.borderColor='#374151'; this.style.transform='translateY(0)'"
               onclick="selectDestination(${index}, '${escapeHtml(place.description)}', '${place.place_id}')">
            <h4>📍 ${place.structured_formatting.main_text}</h4>
            <p>${place.description}</p>
            <p style="color: #60a5fa; font-size: 12px; margin-top: 8px;">Click to select this destination</p>
          </div>
        `;
      });
      resultsDiv.innerHTML = html;
      
      // Store predictions temporarily
      window.tempPredictions = data.predictions;
    } else {
      resultsDiv.innerHTML = '<p style="color: #94a3b8;">No destinations found</p>';
    }
  } catch (error) {
    resultsDiv.innerHTML = `<p style="color: #ef4444;">Error: ${error.message}</p>`;
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML.replace(/'/g, "\\'");
}

async function selectDestination(index, description, placeId) {
  const place = window.tempPredictions[index];
  
  // Geocode to get coordinates
  try {
    const response = await fetch(`/api/maps/geocode?address=${encodeURIComponent(description)}`);
    const data = await response.json();
    
    if (data.results && data.results[0]) {
      const location = data.results[0].geometry.location;
      
      tripPlan.destination = {
        name: place.structured_formatting.main_text,
        fullAddress: description,
        lat: location.lat,
        lng: location.lng
      };
      
      // Get weather
      await getWeather(location.lat, location.lng);
      
      // Show selected destination
      document.getElementById('destination-results').innerHTML = '';
      document.getElementById('selected-destination').innerHTML = `
        <div class="selected-item" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-color: #059669; color: white;">
          <h4 style="color: white; font-size: 18px; margin: 0 0 12px 0;">✓ Selected Destination</h4>
          <p style="color: white; font-size: 16px; margin: 8px 0;"><strong>${tripPlan.destination.name}</strong></p>
          <p style="color: rgba(255, 255, 255, 0.9); font-size: 14px; margin: 8px 0;">${tripPlan.destination.fullAddress}</p>
          ${tripPlan.weather ? `
            <p style="margin-top: 12px; color: white; font-size: 14px; padding-top: 12px; border-top: 1px solid rgba(255, 255, 255, 0.2);">
              <strong>Weather:</strong> ${Math.round(tripPlan.weather.temp)}°C, ${tripPlan.weather.description}
            </p>
          ` : ''}
        </div>
      `;
      
      // Enable next button
      document.getElementById('next-to-flights').disabled = false;
    }
  } catch (error) {
    alert('Error getting location details: ' + error.message);
  }
}

async function getWeather(lat, lng) {
  try {
    const response = await fetch(`/api/weather/current?lat=${lat}&lon=${lng}&units=metric`);
    const data = await response.json();
    
    if (data.main && data.weather) {
      tripPlan.weather = {
        temp: data.main.temp,
        feelsLike: data.main.feels_like,
        humidity: data.main.humidity,
        description: data.weather[0].description,
        windSpeed: data.wind.speed,
        pressure: data.main.pressure
      };
    }
  } catch (error) {
    console.error('Weather error:', error);
  }
}

// Flight search
async function searchFlights() {
  const origin = document.getElementById('origin-airport').value.trim();
  const dest = document.getElementById('dest-airport').value.trim();
  const resultsDiv = document.getElementById('flight-results');
  
  if (!origin || !dest) {
    alert('Please enter both origin and destination airports');
    return;
  }
  
  if (!tripPlan.startDate) {
    alert('Please set trip dates in Step 1');
    return;
  }
  
  resultsDiv.innerHTML = '<p style="color: #94a3b8;">Searching flights...</p>';
  
  try {
    const response = await fetch(
      `/api/skyscanner/search?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(dest)}&date=${tripPlan.startDate}&adults=${tripPlan.travelers}`
    );
    const data = await response.json();
    
    if (data.flights && data.flights.length > 0) {
      let html = '<h3 style="color: #e2e8f0; margin: 20px 0 16px 0;">✈️ Available Flights - Click to Select:</h3>';
      data.flights.forEach((flight, index) => {
        html += `
          <div class="selected-item" style="cursor: pointer; transition: all 0.2s; margin-bottom: 12px;" 
               onmouseover="this.style.borderColor='#2563eb'; this.style.transform='translateY(-2px)'" 
               onmouseout="this.style.borderColor='#374151'; this.style.transform='translateY(0)'"
               onclick="selectFlight(${index})">
            <h4 style="color: #60a5fa; margin: 0 0 12px 0; font-size: 18px;">${flight.airline} - ${flight.flightNumber}</h4>
            <p style="color: #e2e8f0; margin: 6px 0;"><strong>Departure:</strong> ${new Date(flight.departure).toLocaleString()}</p>
            <p style="color: #e2e8f0; margin: 6px 0;"><strong>Arrival:</strong> ${new Date(flight.arrival).toLocaleString()}</p>
            <p style="color: #94a3b8; margin: 6px 0;"><strong>Duration:</strong> ${flight.duration}</p>
            <p style="color: #60a5fa; font-size: 20px; font-weight: 700; margin: 12px 0 0 0; padding-top: 12px; border-top: 1px solid #374151;">
              ${flight.currency} ${flight.price.toLocaleString()}
            </p>
            <p style="color: #94a3b8; font-size: 12px; margin: 8px 0 0 0;">Click to select this flight</p>
          </div>
        `;
      });
      resultsDiv.innerHTML = html;
      
      // Store flights temporarily with the actual search inputs
      window.tempFlights = data.flights;
      window.tempFlightRoute = { 
        origin: origin.toUpperCase(), 
        destination: dest.toUpperCase() 
      };
    } else {
      resultsDiv.innerHTML = '<p style="color: #94a3b8;">No flights found</p>';
    }
  } catch (error) {
    resultsDiv.innerHTML = `<p style="color: #ef4444;">Error: ${error.message}</p>`;
  }
}

function selectFlight(index) {
  const flight = window.tempFlights[index];
  const route = window.tempFlightRoute;
  
  tripPlan.flight = {
    ...flight,
    origin: route.origin,
    destination: route.destination
  };
  
  document.getElementById('flight-results').innerHTML = '';
  document.getElementById('selected-flight').innerHTML = `
    <div class="selected-item" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-color: #059669; color: white;">
      <h4 style="color: white; font-size: 18px; margin: 0 0 12px 0;">✓ Selected Flight</h4>
      <p style="color: white; font-size: 16px; margin: 8px 0;"><strong>${flight.airline}</strong> - ${flight.flightNumber}</p>
      <p style="color: rgba(255, 255, 255, 0.9); font-size: 14px; margin: 8px 0;">${route.origin} → ${route.destination}</p>
      <p style="color: white; font-size: 14px; margin: 8px 0;"><strong>Departure:</strong> ${new Date(flight.departure).toLocaleString()}</p>
      <p style="color: white; font-size: 16px; margin: 8px 0; padding-top: 8px; border-top: 1px solid rgba(255, 255, 255, 0.2);"><strong>Price:</strong> ${flight.currency} ${flight.price}</p>
    </div>
  `;
}

// Review content
function loadReviewContent() {
  const reviewDiv = document.getElementById('review-content');
  
  const duration = calculateDuration(tripPlan.startDate, tripPlan.endDate);
  
  let html = `
    <div class="selected-item">
      <h3 style="color: #60a5fa; margin-top: 0;">Trip Information</h3>
      <p><strong>Title:</strong> ${tripPlan.title}</p>
      <p><strong>Dates:</strong> ${formatDate(tripPlan.startDate)} to ${formatDate(tripPlan.endDate)} (${duration})</p>
      <p><strong>Travelers:</strong> ${tripPlan.travelers} person(s)</p>
      ${tripPlan.budget ? `<p><strong>Budget:</strong> ${tripPlan.budget}</p>` : ''}
      ${tripPlan.notes ? `<p><strong>Notes:</strong> ${tripPlan.notes}</p>` : ''}
    </div>
  `;
  
  if (tripPlan.destination) {
    html += `
      <div class="selected-item">
        <h3 style="color: #60a5fa; margin-top: 0;">Destination</h3>
        <p><strong>${tripPlan.destination.name}</strong></p>
        <p>${tripPlan.destination.fullAddress}</p>
        ${tripPlan.weather ? `
          <p style="margin-top: 12px;">
            <strong>Expected Weather:</strong> ${Math.round(tripPlan.weather.temp)}°C, ${tripPlan.weather.description}
            <br><strong>Humidity:</strong> ${tripPlan.weather.humidity}%
            <br><strong>Wind:</strong> ${tripPlan.weather.windSpeed} m/s
          </p>
        ` : ''}
      </div>
    `;
  }
  
  if (tripPlan.flight) {
    html += `
      <div class="selected-item">
        <h3 style="color: #60a5fa; margin-top: 0;">Flight Details</h3>
        <p><strong>${tripPlan.flight.airline}</strong> - ${tripPlan.flight.flightNumber}</p>
        <p><strong>Route:</strong> ${tripPlan.flight.origin} → ${tripPlan.flight.destination}</p>
        <p><strong>Departure:</strong> ${new Date(tripPlan.flight.departure).toLocaleString()}</p>
        <p><strong>Arrival:</strong> ${new Date(tripPlan.flight.arrival).toLocaleString()}</p>
        <p><strong>Duration:</strong> ${tripPlan.flight.duration}</p>
        <p style="color: #60a5fa; font-size: 20px; font-weight: 600;">
          <strong>Price:</strong> ${tripPlan.flight.currency} ${tripPlan.flight.price}
        </p>
      </div>
    `;
  }
  
  reviewDiv.innerHTML = html;
}

// Create trip plan
function createTripPlan() {
  // Save the plan to localStorage
  saveTripPlan();
  
  // Hide planning sections
  document.querySelectorAll('.planning-section').forEach(section => {
    section.style.display = 'none';
  });
  document.querySelector('.step-indicator').style.display = 'none';
  
  // Generate and show summary
  generateTripSummary();
  document.getElementById('trip-summary-section').style.display = 'block';
  
  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Generate trip summary/receipt
function generateTripSummary() {
  const summaryDiv = document.getElementById('trip-summary');
  const duration = calculateDuration(tripPlan.startDate, tripPlan.endDate);
  const user = getUser();
  
  let html = `
    <div class="summary-header">
      <h1>🎫 Trip Itinerary</h1>
      <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
      ${user ? `<p><strong>Traveler:</strong> ${user.username}</p>` : ''}
    </div>
    
    <div class="summary-section">
      <h2>📋 Trip Information</h2>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Trip Title</div>
          <div class="info-value">${tripPlan.title}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Duration</div>
          <div class="info-value">${duration}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Start Date</div>
          <div class="info-value">${formatDate(tripPlan.startDate)}</div>
        </div>
        <div class="info-item">
          <div class="info-label">End Date</div>
          <div class="info-value">${formatDate(tripPlan.endDate)}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Travelers</div>
          <div class="info-value">${tripPlan.travelers} person(s)</div>
        </div>
        ${tripPlan.budget ? `
          <div class="info-item">
            <div class="info-label">Budget</div>
            <div class="info-value">${tripPlan.budget}</div>
          </div>
        ` : ''}
      </div>
      ${tripPlan.notes ? `
        <div style="margin-top: 16px; padding: 16px; background: #f9fafb; border-radius: 8px;">
          <div class="info-label">Notes</div>
          <p style="margin: 8px 0 0 0; color: #1f2937;">${tripPlan.notes}</p>
        </div>
      ` : ''}
    </div>
  `;
  
  if (tripPlan.destination) {
    html += `
      <div class="summary-section">
        <h2>📍 Destination</h2>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Location</div>
            <div class="info-value">${tripPlan.destination.name}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Full Address</div>
            <div class="info-value">${tripPlan.destination.fullAddress}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Coordinates</div>
            <div class="info-value">${tripPlan.destination.lat.toFixed(4)}, ${tripPlan.destination.lng.toFixed(4)}</div>
          </div>
        </div>
      </div>
    `;
    
    if (tripPlan.weather) {
      html += `
        <div class="summary-section">
          <h2>🌤️ Weather Forecast</h2>
          <div class="weather-info">
            <div>
              <div class="weather-temp">${Math.round(tripPlan.weather.temp)}°C</div>
              <div style="font-size: 18px; text-transform: capitalize;">${tripPlan.weather.description}</div>
            </div>
            <div class="weather-details">
              <div>Feels like: ${Math.round(tripPlan.weather.feelsLike)}°C</div>
              <div>Humidity: ${tripPlan.weather.humidity}%</div>
              <div>Wind: ${tripPlan.weather.windSpeed} m/s</div>
              <div>Pressure: ${tripPlan.weather.pressure} hPa</div>
            </div>
          </div>
        </div>
      `;
    }
  }
  
  if (tripPlan.flight) {
    const totalCost = tripPlan.flight.price * tripPlan.travelers;
    html += `
      <div class="summary-section">
        <h2>✈️ Flight Details</h2>
        <div class="flight-card">
          <div class="flight-header">
            <div class="flight-airline">${tripPlan.flight.airline}</div>
            <div class="flight-price">${tripPlan.flight.currency} ${tripPlan.flight.price}</div>
          </div>
          <div style="margin-bottom: 12px;">
            <strong>Flight Number:</strong> ${tripPlan.flight.flightNumber}
          </div>
          <div class="flight-route">
            <span><strong>${tripPlan.flight.origin}</strong></span>
            <span>→</span>
            <span><strong>${tripPlan.flight.destination}</strong></span>
          </div>
          <div style="margin-top: 12px; color: #6b7280;">
            <div><strong>Departure:</strong> ${new Date(tripPlan.flight.departure).toLocaleString()}</div>
            <div><strong>Arrival:</strong> ${new Date(tripPlan.flight.arrival).toLocaleString()}</div>
            <div><strong>Duration:</strong> ${tripPlan.flight.duration}</div>
          </div>
          ${tripPlan.travelers > 1 ? `
            <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
              <strong>Total Cost (${tripPlan.travelers} travelers):</strong> 
              <span style="color: #2563eb; font-size: 18px; font-weight: 700;">
                ${tripPlan.flight.currency} ${totalCost.toLocaleString()}
              </span>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }
  
  html += `
    <div class="summary-footer">
      <p style="color: #6b7280; margin: 0;">
        This itinerary was created using Travel Planner
      </p>
      <p style="color: #9ca3af; font-size: 12px; margin: 8px 0 0 0;">
        Please verify all details with service providers before traveling
      </p>
    </div>
  `;
  
  summaryDiv.innerHTML = html;
}

// Helper functions
function calculateDuration(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
  return `${days} day${days > 1 ? 's' : ''}`;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

function downloadPDF() {
  alert('PDF download feature coming soon! For now, please use the Print button and save as PDF.');
  window.print();
}

function startNewPlan() {
  if (confirm('Are you sure you want to create a new plan? Current plan will be lost.')) {
    // Clear editing plan
    localStorage.removeItem('editingPlan');
    location.reload();
  }
}

// Save trip plan to localStorage
function saveTripPlan() {
  const plans = getSavedPlans();
  
  // Add creation timestamp
  const planToSave = {
    ...tripPlan,
    createdAt: new Date().toISOString()
  };
  
  if (editingPlanIndex !== null) {
    // Update existing plan
    plans[editingPlanIndex] = planToSave;
    localStorage.removeItem('editingPlan');
  } else {
    // Add new plan
    plans.push(planToSave);
  }
  
  localStorage.setItem('tripPlans', JSON.stringify(plans));
}

// Get saved plans from localStorage
function getSavedPlans() {
  const plansStr = localStorage.getItem('tripPlans');
  return plansStr ? JSON.parse(plansStr) : [];
}

// Load plan for editing
function loadEditingPlan() {
  const editingStr = localStorage.getItem('editingPlan');
  if (!editingStr) return;
  
  const { index, plan } = JSON.parse(editingStr);
  editingPlanIndex = index;
  
  // Load plan data into form
  document.getElementById('trip-title').value = plan.title || '';
  document.getElementById('start-date').value = plan.startDate || '';
  document.getElementById('end-date').value = plan.endDate || '';
  document.getElementById('travelers').value = plan.travelers || 1;
  document.getElementById('budget').value = plan.budget || '';
  document.getElementById('trip-notes').value = plan.notes || '';
  
  // Load into tripPlan object
  Object.assign(tripPlan, plan);
  
  // Show notification
  const notification = document.createElement('div');
  notification.style.cssText = 'position: fixed; top: 80px; right: 20px; background: #2563eb; color: white; padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 1000;';
  notification.innerHTML = '✏️ Editing existing plan: <strong>' + plan.title + '</strong>';
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 5000);
}
