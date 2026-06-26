let dishesList = [];
let activeCategory = 'All';
let searchQuery = '';

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
  // Read category or search query parameters from URL
  const urlParams = new URLSearchParams(window.location.search);
  const catParam = urlParams.get('category');
  const searchParam = urlParams.get('search');

  if (catParam) {
    activeCategory = catParam;
    updateActiveCategoryTab(catParam);
  }
  
  if (searchParam) {
    searchQuery = searchParam;
    const searchInput = document.getElementById('menu-search-input');
    if (searchInput) searchInput.value = searchParam;
  }

  // Fetch Dishes
  await fetchDishes();

  // Setup tab click listeners
  const tabs = document.querySelectorAll('.category-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeCategory = tab.getAttribute('data-category');
      renderDishes();
    });
  });
});

// Fetch Dishes from API
async function fetchDishes() {
  const container = document.getElementById('food-grid-container');
  try {
    const response = await fetch(`${API_URL}/api/dishes`);
    if (!response.ok) throw new Error('Failed to load menu dishes.');
    dishesList = await response.json();
    renderDishes();
  } catch (err) {
    showToast(err.message, 'error');
    if (container) {
      container.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #ef4444;">
          <p>⚠️ Error loading menu items. Please check if your server is running.</p>
        </div>
      `;
    }
  }
}

// Update Active CSS Class on Tabs dynamically from URL params
function updateActiveCategoryTab(category) {
  const tabs = document.querySelectorAll('.category-tab');
  tabs.forEach(tab => {
    if (tab.getAttribute('data-category') === category) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });
}

// Search input handler
function handleSearch() {
  const searchInput = document.getElementById('menu-search-input');
  searchQuery = searchInput ? searchInput.value.trim() : '';
  renderDishes();
}

// Render filtered items
function renderDishes() {
  const container = document.getElementById('food-grid-container');
  if (!container) return;

  // Filter logic
  let filtered = dishesList;

  // 1. Category Filter
  if (activeCategory !== 'All') {
    filtered = filtered.filter(dish => dish.category === activeCategory);
  }

  // 2. Text Search Filter
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(dish => 
      dish.name.toLowerCase().includes(query) || 
      dish.description.toLowerCase().includes(query)
    );
  }

  // Empty State
  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 60px;" class="glass-panel">
        <span style="font-size:3rem;">🔍</span>
        <h3 style="margin-top:16px;">No Dishes Found</h3>
        <p style="color: var(--color-text-muted); font-size:0.9rem; margin-top:8px;">We couldn't find anything matching your filters. Try selecting another category.</p>
      </div>
    `;
    return;
  }

  // Cards markup build
  let html = '';
  filtered.forEach(dish => {
    const isAvailable = dish.available === 1;
    html += `
      <div class="glass-panel food-card">
        <div class="food-img-container">
          <img src="${dish.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600'}" alt="${dish.name}">
          <span class="food-category">${dish.category}</span>
        </div>
        <div class="food-card-info">
          <h3>${dish.name}</h3>
          <p class="food-desc">${dish.description || 'No description available.'}</p>
          <div class="food-card-footer">
            <span class="price">$${dish.price.toFixed(2)}</span>
            ${isAvailable 
              ? `<button class="btn btn-primary btn-small" onclick="handleAddClick(${dish.id})">Add to Cart</button>`
              : `<button class="btn btn-secondary btn-small" disabled style="opacity:0.5; cursor:not-allowed;">Sold Out</button>`
            }
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

// Intermediary handler to find correct dish and call common main.js addToCart
function handleAddClick(dishId) {
  const dish = dishesList.find(d => d.id === dishId);
  if (dish) {
    addToCart(dish);
  }
}
