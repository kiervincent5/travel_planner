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

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  updateAuthUI();
  loadPlanView();
});

// Load and display the plan
function loadPlanView() {
  const planStr = localStorage.getItem('currentViewPlan');
  
  if (!planStr) {
    document.getElementById('trip-summary').innerHTML = `
      <div style="text-align: center; padding: 60px 20px;">
        <h2 style="color: #1f2937;">No Plan to Display</h2>
        <p style="color: #6b7280;">The trip plan could not be found.</p>
        <a href="/my-plans.html" class="btn btn-primary" style="margin-top: 20px;">Go to My Plans</a>
      </div>
    `;
    return;
  }
  
  const plan = JSON.parse(planStr);
  generateTripSummary(plan);
}

// Generate trip summary/itinerary
function generateTripSummary(plan) {
  const summaryDiv = document.getElementById('trip-summary');
  const duration = calculateDuration(plan.startDate, plan.endDate);
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
          <div class="info-value">${plan.title}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Duration</div>
          <div class="info-value">${duration}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Start Date</div>
          <div class="info-value">${formatDate(plan.startDate)}</div>
        </div>
        <div class="info-item">
          <div class="info-label">End Date</div>
          <div class="info-value">${formatDate(plan.endDate)}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Travelers</div>
          <div class="info-value">${plan.travelers} person(s)</div>
        </div>
        ${plan.budget ? `
          <div class="info-item">
            <div class="info-label">Budget</div>
            <div class="info-value">${plan.budget}</div>
          </div>
        ` : ''}
      </div>
      ${plan.notes ? `
        <div style="margin-top: 16px; padding: 16px; background: #f9fafb; border-radius: 8px;">
          <div class="info-label">Notes</div>
          <p style="margin: 8px 0 0 0; color: #1f2937;">${plan.notes}</p>
        </div>
      ` : ''}
    </div>
  `;
  
  if (plan.destination) {
    html += `
      <div class="summary-section">
        <h2>📍 Destination</h2>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Location</div>
            <div class="info-value">${plan.destination.name}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Full Address</div>
            <div class="info-value">${plan.destination.fullAddress}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Coordinates</div>
            <div class="info-value">${plan.destination.lat.toFixed(4)}, ${plan.destination.lng.toFixed(4)}</div>
          </div>
        </div>
      </div>
    `;
    
    if (plan.weather) {
      html += `
        <div class="summary-section">
          <h2>🌤️ Weather Forecast</h2>
          <div class="weather-info">
            <div>
              <div class="weather-temp">${Math.round(plan.weather.temp)}°C</div>
              <div style="font-size: 18px; text-transform: capitalize;">${plan.weather.description}</div>
            </div>
            <div class="weather-details">
              <div>Feels like: ${Math.round(plan.weather.feelsLike)}°C</div>
              <div>Humidity: ${plan.weather.humidity}%</div>
              <div>Wind: ${plan.weather.windSpeed} m/s</div>
              <div>Pressure: ${plan.weather.pressure} hPa</div>
            </div>
          </div>
        </div>
      `;
    }
  }
  
  if (plan.flight) {
    const totalCost = plan.flight.price * plan.travelers;
    html += `
      <div class="summary-section">
        <h2>✈️ Flight Details</h2>
        <div class="flight-card">
          <div class="flight-header">
            <div class="flight-airline">${plan.flight.airline}</div>
            <div class="flight-price">${plan.flight.currency} ${plan.flight.price}</div>
          </div>
          <div style="margin-bottom: 12px;">
            <strong>Flight Number:</strong> ${plan.flight.flightNumber}
          </div>
          <div class="flight-route">
            <span><strong>${plan.flight.origin}</strong></span>
            <span>→</span>
            <span><strong>${plan.flight.destination}</strong></span>
          </div>
          <div style="margin-top: 12px; color: #6b7280;">
            <div><strong>Departure:</strong> ${new Date(plan.flight.departure).toLocaleString()}</div>
            <div><strong>Arrival:</strong> ${new Date(plan.flight.arrival).toLocaleString()}</div>
            <div><strong>Duration:</strong> ${plan.flight.duration}</div>
          </div>
          ${plan.travelers > 1 ? `
            <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
              <strong>Total Cost (${plan.travelers} travelers):</strong> 
              <span style="color: #2563eb; font-size: 18px; font-weight: 700;">
                ${plan.flight.currency} ${totalCost.toLocaleString()}
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
