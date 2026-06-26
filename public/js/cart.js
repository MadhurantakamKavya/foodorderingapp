let promoApplied = false;
let discountPercent = 0.10; // 10% discount for FEAST10

// Check if user is logged in
document.addEventListener('DOMContentLoaded', () => {
  const user = getCurrentUser();
  if (!user) {
    showToast('Please sign in to view your cart and checkout.', 'error');
    setTimeout(() => {
      window.location.href = 'auth.html';
    }, 1500);
    return;
  }

  // Pre-fill user name
  const nameInput = document.getElementById('checkout-name');
  if (nameInput && user) {
    nameInput.value = user.username;
  }

  renderCartPage();
});

// Render full cart list
function renderCartPage() {
  const container = document.getElementById('cart-items-container');
  if (!container) return;

  const cart = getCart();

  if (cart.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-state-icon" style="font-size: 4rem; display: block; margin-bottom: 20px;">🛒</span>
        <h2>Your Gourmet Basket is Empty</h2>
        <p style="color:var(--color-text-muted); margin-bottom:24px; margin-top:8px;">You haven't selected any culinary masterpieces yet.</p>
        <a href="menu.html" class="btn btn-primary">Browse Culinary Menu</a>
      </div>
    `;
    updateReceipt(0);
    // Disable place order button
    const placeBtn = document.getElementById('place-order-btn');
    if (placeBtn) {
      placeBtn.disabled = true;
      placeBtn.style.opacity = '0.5';
      placeBtn.style.cursor = 'not-allowed';
    }
    return;
  }

  let html = '';
  let subtotal = 0;

  cart.forEach(item => {
    const itemTotal = item.price * item.quantity;
    subtotal += itemTotal;
    html += `
      <div class="cart-page-item">
        <img src="${item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100'}" class="cart-page-item-img" alt="${item.name}">
        <div>
          <div class="cart-page-item-name">${item.name}</div>
          <div style="font-size:0.8rem; color:var(--color-text-muted); margin-top:4px;">Gourmet Choice</div>
        </div>
        <div style="display:flex; align-items:center; gap:24px;">
          <div class="cart-item-controls" style="margin: 0;">
            <button onclick="updateCartPageQty(${item.id}, -1)">-</button>
            <span class="cart-item-qty">${item.quantity}</span>
            <button onclick="updateCartPageQty(${item.id}, 1)">+</button>
          </div>
          <div class="cart-page-item-price">$${itemTotal.toFixed(2)}</div>
        </div>
        <div>
          <button class="cart-page-remove-btn" onclick="removeFromCartPage(${item.id})">🗑️</button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
  updateReceipt(subtotal);
}

// Adjust quantity
function updateCartPageQty(itemId, change) {
  let cart = getCart();
  const item = cart.find(item => item.id === itemId);
  if (item) {
    item.quantity += change;
    if (item.quantity <= 0) {
      cart = cart.filter(item => item.id !== itemId);
    }
    saveCart(cart);
    renderCartPage();
  }
}

// Delete item
function removeFromCartPage(itemId) {
  let cart = getCart();
  const item = cart.find(item => item.id === itemId);
  cart = cart.filter(item => item.id !== itemId);
  saveCart(cart);
  renderCartPage();
  if (item) {
    showToast(`Removed ${item.name} from basket`, 'info');
  }
}

// Apply Promo Code
function applyPromoCode() {
  const code = document.getElementById('checkout-coupon').value.trim().toUpperCase();
  const statusText = document.getElementById('coupon-status');
  
  if (code === 'FEAST10') {
    promoApplied = true;
    statusText.textContent = 'Promo code applied! 10% Discount loaded.';
    statusText.style.color = '#22c55e';
    renderCartPage(); // Recalculate
  } else if (!code) {
    statusText.textContent = '';
  } else {
    statusText.textContent = 'Invalid promo code.';
    statusText.style.color = '#ef4444';
  }
}

// Calculate Receipt Totals
function updateReceipt(subtotal) {
  const deliveryFee = subtotal > 0 ? 3.99 : 0.00;
  let discount = 0;

  if (promoApplied && subtotal > 0) {
    discount = subtotal * discountPercent;
    document.getElementById('promo-row').style.display = 'flex';
    document.getElementById('summary-discount').textContent = `-$${discount.toFixed(2)}`;
  } else {
    document.getElementById('promo-row').style.display = 'none';
  }

  const taxableAmount = Math.max(0, subtotal - discount);
  const tax = taxableAmount * 0.08;
  const grandTotal = taxableAmount + deliveryFee + tax;

  document.getElementById('summary-subtotal').textContent = `$${subtotal.toFixed(2)}`;
  document.getElementById('summary-delivery').textContent = `$${deliveryFee.toFixed(2)}`;
  document.getElementById('summary-tax').textContent = `$${tax.toFixed(2)}`;
  document.getElementById('summary-grand').textContent = `$${grandTotal.toFixed(2)}`;

  // Enable/Disable Place Order Button
  const placeBtn = document.getElementById('place-order-btn');
  if (placeBtn) {
    if (subtotal > 0) {
      placeBtn.disabled = false;
      placeBtn.style.opacity = '1';
      placeBtn.style.cursor = 'pointer';
      placeBtn.textContent = `Place Order • $${grandTotal.toFixed(2)}`;
    } else {
      placeBtn.disabled = true;
      placeBtn.textContent = 'Place Order';
    }
  }
}

// Checkout Submit Handler
async function handleCheckout(e) {
  e.preventDefault();

  const cart = getCart();
  if (cart.length === 0) {
    showToast('Your basket is empty.', 'error');
    return;
  }

  const name = document.getElementById('checkout-name').value.trim();
  const phone = document.getElementById('checkout-phone').value.trim();
  const address = document.getElementById('checkout-address').value.trim();
  const payment = document.getElementById('checkout-payment').value;

  const fullDeliveryDetails = `${name} | Tel: ${phone} | Addr: ${address} | Pay: ${payment.toUpperCase()}`;

  // Read grand total value
  const grandText = document.getElementById('summary-grand').textContent;
  const grandTotal = parseFloat(grandText.replace('$', ''));

  const placeBtn = document.getElementById('place-order-btn');
  placeBtn.disabled = true;
  placeBtn.textContent = 'Processing order...';

  try {
    const response = await fetch(`${API_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({
        items: cart,
        total_amount: grandTotal,
        delivery_address: fullDeliveryDetails
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to place order.');
    }

    // Success! Clear cart
    saveCart([]);
    showToast('Your order was placed successfully!', 'success');

    setTimeout(() => {
      window.location.href = `orders.html?id=${data.orderId}`;
    }, 1500);

  } catch (err) {
    showToast(err.message, 'error');
    placeBtn.disabled = false;
    placeBtn.textContent = `Place Order • ${grandText}`;
  }
}
