// Tab switching
const tabs = document.querySelectorAll('.auth-tab');
const forms = document.querySelectorAll('.auth-form');

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const targetTab = tab.dataset.tab;
    
    // Update active tab
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    
    // Show corresponding form
    forms.forEach(form => {
      form.classList.remove('active');
      if (form.id === `${targetTab}-form`) {
        form.classList.add('active');
      }
    });
    
    // Clear messages
    clearMessage();
  });
});

// Message display functions
function showMessage(message, type = 'error') {
  const container = document.getElementById('message-container');
  container.innerHTML = `<div class="${type}-message">${message}</div>`;
}

function clearMessage() {
  document.getElementById('message-container').innerHTML = '';
}

// Login form handler
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  clearMessage();
  
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  
  const submitBtn = e.target.querySelector('.submit-btn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Logging in...';
  
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }
    
    // Store token and user info
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    
    showMessage('Login successful! Redirecting...', 'success');
    
    // Redirect to main page after 1 second
    setTimeout(() => {
      window.location.href = '/';
    }, 1000);
    
  } catch (error) {
    showMessage(error.message);
    submitBtn.disabled = false;
    submitBtn.textContent = 'Login';
  }
});

// Register form handler
document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  clearMessage();
  
  const username = document.getElementById('register-username').value.trim();
  const email = document.getElementById('register-email').value.trim();
  const password = document.getElementById('register-password').value;
  const confirmPassword = document.getElementById('register-confirm-password').value;
  
  // Validate passwords match
  if (password !== confirmPassword) {
    showMessage('Passwords do not match');
    return;
  }
  
  if (password.length < 6) {
    showMessage('Password must be at least 6 characters');
    return;
  }
  
  const submitBtn = e.target.querySelector('.submit-btn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Registering...';
  
  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Registration failed');
    }
    
    // Store token and user info
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    
    showMessage('Registration successful! Redirecting...', 'success');
    
    // Redirect to main page after 1 second
    setTimeout(() => {
      window.location.href = '/';
    }, 1000);
    
  } catch (error) {
    showMessage(error.message);
    submitBtn.disabled = false;
    submitBtn.textContent = 'Register';
  }
});
