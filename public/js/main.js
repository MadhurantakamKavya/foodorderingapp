// --- Global State & Configuration ---
const API_URL = ''; // Relative paths since frontend is hosted on the same server

// Local Storage Keys
const TOKEN_KEY = 'feastdash_token';
const USER_KEY = 'feastdash_user';
const CART_KEY = 'feastdash_cart';

// --- Toast Notification System ---
function showToast(message, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  // Icon select based on type
  let icon = '🔔';
  if (type === 'success') icon = '✅';
  if (type === 'error') icon = '❌';

  toast.innerHTML = `
    <span>${icon}</span>
    <div>${message}</div>
  `;

  container.appendChild(toast);

  // Auto-remove toast
  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28) reverse';
    toast.style.opacity = '0';
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 4000);
}

// --- Auth Helpers ---
function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setAuthToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY));
  } catch (e) {
    return null;
  }
}

function setCurrentUser(user) {
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_KEY);
  }
}

function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  showToast('Logged out successfully', 'success');
  setTimeout(() => {
    window.location.href = 'index.html';
  }, 1000);
}

// --- Cart Data Helpers ---
function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge();
  // Trigger custom event so pages can listen to cart changes
  window.dispatchEvent(new Event('cartUpdated'));
}

function addToCart(dish) {
  let cart = getCart();
  const existing = cart.find(item => item.id === dish.id);
  
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({
      id: dish.id,
      name: dish.name,
      price: dish.price,
      image_url: dish.image_url,
      quantity: 1
    });
  }
  
  saveCart(cart);
  showToast(`Added ${dish.name} to cart!`, 'success');
}

function updateCartBadge() {
  const badge = document.getElementById('cart-count');
  if (badge) {
    const cart = getCart();
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  }
}

// --- Dynamic Header Setup ---
function setupNavbar() {
  const navList = document.getElementById('nav-links');
  if (!navList) return;

  const user = getCurrentUser();
  const path = window.location.pathname;

  let links = `
    <li><a href="index.html" class="${path.includes('index.html') || path.endsWith('/') ? 'active' : ''}">Home</a></li>
    <li><a href="menu.html" class="${path.includes('menu.html') ? 'active' : ''}">Menu</a></li>
  `;

  if (user) {
    links += `
      <li><a href="orders.html" class="${path.includes('orders.html') ? 'active' : ''}">My Orders</a></li>
    `;
    if (user.role === 'admin') {
      links += `
        <li><a href="admin.html" class="${path.includes('admin.html') ? 'active' : ''}">Chef Dashboard</a></li>
      `;
    }
    links += `
      <li><span style="color: var(--color-secondary); font-weight:600; font-size:0.9rem;">Hello, ${user.username}</span></li>
      <li><button onclick="logout()" class="btn btn-secondary btn-small" style="padding:6px 12px;">Logout</button></li>
    `;
  } else {
    links += `
      <li><a href="auth.html" class="${path.includes('auth.html') ? 'active' : ''}">Login</a></li>
    `;
  }

  navList.innerHTML = links;
}

// --- Cart Drawer Render & Toggle ---
function toggleCartDrawer() {
  const drawer = document.getElementById('cart-drawer');
  const overlay = document.getElementById('cart-overlay');
  
  if (drawer && overlay) {
    drawer.classList.toggle('open');
    overlay.classList.toggle('show');
    if (drawer.classList.contains('open')) {
      renderCartDrawerItems();
    }
  }
}

function renderCartDrawerItems() {
  const itemsContainer = document.getElementById('cart-drawer-items');
  const subtotalVal = document.getElementById('cart-drawer-subtotal');
  
  if (!itemsContainer) return;

  const cart = getCart();
  if (cart.length === 0) {
    itemsContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🛒</div>
        <p>Your cart is empty.</p>
        <p style="font-size:0.8rem; margin-top:8px;">Head to the <a href="menu.html" style="color:var(--color-primary);">Menu</a> to add items!</p>
      </div>
    `;
    if (subtotalVal) subtotalVal.textContent = '$0.00';
    return;
  }

  let html = '';
  let subtotal = 0;

  cart.forEach(item => {
    const itemTotal = item.price * item.quantity;
    subtotal += itemTotal;
    html += `
      <div class="cart-item">
        <img src="${item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100'}" class="cart-item-img" alt="${item.name}">
        <div class="cart-item-details">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-price">$${item.price.toFixed(2)}</div>
        </div>
        <div class="cart-item-controls">
          <button onclick="updateDrawerQty(${item.id}, -1)">-</button>
          <span class="cart-item-qty">${item.quantity}</span>
          <button onclick="updateDrawerQty(${item.id}, 1)">+</button>
        </div>
      </div>
    `;
  });

  itemsContainer.innerHTML = html;
  if (subtotalVal) subtotalVal.textContent = `$${subtotal.toFixed(2)}`;
}

function updateDrawerQty(itemId, change) {
  let cart = getCart();
  const item = cart.find(item => item.id === itemId);
  if (item) {
    item.quantity += change;
    if (item.quantity <= 0) {
      cart = cart.filter(item => item.id !== itemId);
    }
    saveCart(cart);
    renderCartDrawerItems();
  }
}

// --- Initialize Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
  setupNavbar();
  updateCartBadge();

  // Header Cart Button click event
  const cartBtn = document.getElementById('header-cart-btn');
  if (cartBtn) {
    cartBtn.addEventListener('click', toggleCartDrawer);
  }

  // Cart overlay click event
  const overlay = document.getElementById('cart-overlay');
  if (overlay) {
    overlay.addEventListener('click', toggleCartDrawer);
  }

  // Cart Drawer close button click
  const closeBtn = document.getElementById('cart-drawer-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', toggleCartDrawer);
  }
  
  // Custom sync drawer
  window.addEventListener('cartUpdated', () => {
    if (document.getElementById('cart-drawer')?.classList.contains('open')) {
      renderCartDrawerItems();
    }
  });
});
