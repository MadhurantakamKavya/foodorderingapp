document.addEventListener('DOMContentLoaded', () => {
  const user = getCurrentUser();
  if (!user || user.role !== 'admin') {
    showToast('Unauthorized access. Redirecting to home...', 'error');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1500);
    return;
  }

  loadAdminOrders();
  loadAdminDishes();
});

// 1. ORDERS MANAGEMENT

// Fetch and render all customer orders
async function loadAdminOrders() {
  const tbody = document.getElementById('admin-orders-tbody');
  if (!tbody) return;

  try {
    const response = await fetch(`${API_URL}/api/orders`, {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`
      }
    });

    const orders = await response.json();

    if (!response.ok) throw new Error(orders.error || 'Failed to fetch admin orders.');

    if (orders.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; color: var(--color-text-muted); padding: 30px;">No customer orders placed yet.</td>
        </tr>
      `;
      return;
    }

    let html = '';
    orders.forEach(order => {
      // Items list summary formatting
      let itemsHtml = '';
      if (Array.isArray(order.items)) {
        itemsHtml = order.items.map(item => `• ${item.name} <strong>(x${item.quantity})</strong>`).join('<br>');
      }

      // Check if address is friendly split or full string
      const addrParts = order.delivery_address.split('|');
      const friendlyAddr = addrParts[2] ? addrParts[2].trim().replace('Addr: ', '') : order.delivery_address;
      const phoneNo = addrParts[1] ? addrParts[1].trim().replace('Tel: ', '') : '';

      html += `
        <tr>
          <td><strong>#FD-${order.id}</strong></td>
          <td>
            <strong>${order.customer_name || 'Customer'}</strong><br>
            <span style="font-size:0.75rem; color:var(--color-text-muted);">${order.customer_email || ''}</span><br>
            <span style="font-size:0.75rem; color:var(--color-secondary);">${phoneNo}</span>
          </td>
          <td><div style="max-height:80px; overflow-y:auto; line-height:1.3; font-size:0.85rem;">${itemsHtml}</div></td>
          <td><strong>$${order.total_amount.toFixed(2)}</strong></td>
          <td>
            <select id="status-select-${order.id}" class="form-control btn-small" style="padding:6px; font-size:0.8rem; width:120px;">
              <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
              <option value="preparing" ${order.status === 'preparing' ? 'selected' : ''}>Preparing</option>
              <option value="delivering" ${order.status === 'delivering' ? 'selected' : ''}>Delivering</option>
              <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>Completed</option>
              <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
            </select>
          </td>
          <td class="admin-action-btns">
            <button class="btn btn-primary btn-small" onclick="updateOrderStatus(${order.id})">Update</button>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;

  } catch (err) {
    showToast(err.message, 'error');
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; color: #ef4444;">⚠️ Error loading active orders.</td>
      </tr>
    `;
  }
}

// Update order status call
async function updateOrderStatus(orderId) {
  const select = document.getElementById(`status-select-${orderId}`);
  if (!select) return;

  const newStatus = select.value;

  try {
    const response = await fetch(`${API_URL}/api/orders/${orderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({ status: newStatus })
    });

    const data = await response.json();

    if (!response.ok) throw new Error(data.error || 'Failed to update order status.');

    showToast(`Order #FD-${orderId} status updated to: ${newStatus.toUpperCase()}`, 'success');
    loadAdminOrders();

  } catch (err) {
    showToast(err.message, 'error');
  }
}


// 2. DISHES MANAGEMENT

// Fetch and render existing dishes
async function loadAdminDishes() {
  const tbody = document.getElementById('admin-dishes-tbody');
  if (!tbody) return;

  try {
    const response = await fetch(`${API_URL}/api/dishes`);
    const dishes = await response.json();

    if (!response.ok) throw new Error('Failed to load menu list.');

    let html = '';
    dishes.forEach(dish => {
      html += `
        <tr>
          <td>
            <strong>${dish.name}</strong><br>
            <span style="font-size:0.75rem; color:var(--color-text-muted);">${dish.category}</span>
          </td>
          <td>$${dish.price.toFixed(2)}</td>
          <td>
            <button class="btn btn-danger btn-small" style="padding:4px 8px;" onclick="deleteDish(${dish.id}, '${dish.name.replace(/'/g, "\\'")}')">Delete</button>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;

  } catch (err) {
    tbody.innerHTML = `
      <tr>
        <td colspan="3" style="text-align: center; color: #ef4444;">⚠️ Failed to load dishes.</td>
      </tr>
    `;
  }
}

// Create new dish call
async function handleAddDish(e) {
  e.preventDefault();

  const name = document.getElementById('dish-name').value.trim();
  const description = document.getElementById('dish-description').value.trim();
  const price = document.getElementById('dish-price').value;
  const category = document.getElementById('dish-category').value;
  const image_url = document.getElementById('dish-image').value.trim();

  try {
    const response = await fetch(`${API_URL}/api/dishes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({ name, description, price, category, image_url })
    });

    const data = await response.json();

    if (!response.ok) throw new Error(data.error || 'Failed to create menu item.');

    showToast(`Successfully added gourmet item: ${name}`, 'success');
    
    // Reset forms
    document.getElementById('add-dish-form').reset();
    
    // Refresh tables
    loadAdminDishes();

  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Delete dish call
async function deleteDish(id, name) {
  if (!confirm(`Are you sure you want to permanently remove "${name}" from the menu?`)) {
    return;
  }

  try {
    const response = await fetch(`${API_URL}/api/dishes/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`
      }
    });

    const data = await response.json();

    if (!response.ok) throw new Error(data.error || 'Failed to remove dish.');

    showToast(`Removed "${name}" from menu`, 'info');
    loadAdminDishes();

  } catch (err) {
    showToast(err.message, 'error');
  }
}
