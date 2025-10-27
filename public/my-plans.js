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
  loadPlans();
});

// Load all saved plans
function loadPlans() {
  const plans = getSavedPlans();
  const container = document.getElementById('plans-container');
  
  if (plans.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <h2>No Trip Plans Yet</h2>
        <p>Start planning your next adventure!</p>
        <a href="/trip-planner.html" class="btn-primary">Create Your First Plan</a>
      </div>
    `;
    return;
  }
  
  // Show stats
  document.getElementById('stats-bar').style.display = 'flex';
  updateStats(plans);
  
  // Display plans
  const plansGrid = document.createElement('div');
  plansGrid.className = 'plans-grid';
  
  plans.forEach((plan, index) => {
    const planCard = createPlanCard(plan, index);
    plansGrid.appendChild(planCard);
  });
  
  container.innerHTML = '';
  container.appendChild(plansGrid);
}

// Create plan card HTML
function createPlanCard(plan, index) {
  const card = document.createElement('div');
  card.className = 'plan-card';
  
  const duration = calculateDuration(plan.startDate, plan.endDate);
  const isUpcoming = new Date(plan.startDate) > new Date();
  
  card.innerHTML = `
    <div class="plan-header">
      <div>
        <h3 class="plan-title">${plan.title}</h3>
        <div class="plan-date">Created: ${formatDate(plan.createdAt)}</div>
      </div>
      <div class="plan-actions">
        <button class="icon-btn delete" onclick="deletePlan(${index})" title="Delete">🗑️</button>
      </div>
    </div>
    
    <div class="plan-info">
      <div class="plan-info-item">
        📅 <strong>${formatDate(plan.startDate)}</strong> to <strong>${formatDate(plan.endDate)}</strong>
      </div>
      <div class="plan-info-item">
        ⏱️ Duration: <strong>${duration}</strong>
      </div>
      ${plan.destination ? `
        <div class="plan-info-item">
          📍 Destination: <strong>${plan.destination.name}</strong>
        </div>
      ` : ''}
      ${plan.travelers ? `
        <div class="plan-info-item">
          👥 Travelers: <strong>${plan.travelers} person(s)</strong>
        </div>
      ` : ''}
      ${plan.flight ? `
        <div class="plan-info-item">
          ✈️ Flight: <strong>${plan.flight.airline} ${plan.flight.flightNumber}</strong>
        </div>
      ` : ''}
      ${isUpcoming ? `
        <div class="plan-info-item" style="color: #10b981;">
          ✓ <strong>Upcoming Trip</strong>
        </div>
      ` : ''}
    </div>
    
    <div class="plan-footer">
      <button class="btn-small btn-view" onclick="viewPlan(${index})">View Itinerary</button>
      <button class="btn-small btn-edit" onclick="editPlan(${index})">Edit Plan</button>
    </div>
  `;
  
  return card;
}

// Update statistics
function updateStats(plans) {
  const totalPlans = plans.length;
  const upcomingTrips = plans.filter(p => new Date(p.startDate) > new Date()).length;
  const destinations = new Set(plans.map(p => p.destination?.name).filter(Boolean)).size;
  
  document.getElementById('total-plans').textContent = totalPlans;
  document.getElementById('upcoming-trips').textContent = upcomingTrips;
  document.getElementById('total-destinations').textContent = destinations;
}

// Get saved plans from localStorage
function getSavedPlans() {
  const plansStr = localStorage.getItem('tripPlans');
  return plansStr ? JSON.parse(plansStr) : [];
}

// Save plans to localStorage
function savePlans(plans) {
  localStorage.setItem('tripPlans', JSON.stringify(plans));
}

// View plan (redirect to view page with plan data)
function viewPlan(index) {
  const plans = getSavedPlans();
  const plan = plans[index];
  
  // Store the plan to view
  localStorage.setItem('currentViewPlan', JSON.stringify(plan));
  
  // Redirect to view page
  window.location.href = '/view-plan.html';
}

// Edit plan (load into trip planner)
function editPlan(index) {
  const plans = getSavedPlans();
  const plan = plans[index];
  
  // Store the plan to edit
  localStorage.setItem('editingPlan', JSON.stringify({ index, plan }));
  
  // Redirect to trip planner
  window.location.href = '/trip-planner.html';
}

// Delete plan
function deletePlan(index) {
  if (!confirm('Are you sure you want to delete this trip plan?')) {
    return;
  }
  
  const plans = getSavedPlans();
  plans.splice(index, 1);
  savePlans(plans);
  
  // Reload plans
  loadPlans();
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
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
}
