// Switch Auth Tabs
function switchAuthTab(type) {
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const formLogin = document.getElementById('login-form');
  const formRegister = document.getElementById('register-form');

  if (type === 'login') {
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    formLogin.classList.add('active');
    formRegister.classList.remove('active');
  } else {
    tabLogin.classList.remove('active');
    tabRegister.classList.add('active');
    formLogin.classList.remove('active');
    formRegister.classList.add('active');
  }
}

// Redirect if already logged in
document.addEventListener('DOMContentLoaded', () => {
  if (getCurrentUser()) {
    window.location.href = 'menu.html';
  }
});

// Login Form Submit Handler
const loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed.');
      }

      // Store credentials and session token
      setAuthToken(data.token);
      setCurrentUser(data.user);

      showToast('Welcome back, ' + data.user.username + '!', 'success');

      // Direct based on user role
      setTimeout(() => {
        if (data.user.role === 'admin') {
          window.location.href = 'admin.html';
        } else {
          window.location.href = 'menu.html';
        }
      }, 1000);

    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

// Register Form Submit Handler
const registerForm = document.getElementById('register-form');
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;

    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed.');
      }

      setAuthToken(data.token);
      setCurrentUser(data.user);

      showToast('Registration successful! Welcome to FeastDash.', 'success');

      setTimeout(() => {
        window.location.href = 'menu.html';
      }, 1000);

    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}
