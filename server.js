const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'FEASTDASH_SECRET_KEY_12345';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Authentication Middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await db.get("SELECT id, username, email, role FROM users WHERE id = ?", [decoded.id]);
    if (!user) {
      return res.status(403).json({ error: 'User session invalid.' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token expired or invalid.' });
  }
};

// Admin Authorization Middleware
const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
  }
};

// Seed an Admin user on server startup if not exists
async function seedAdminUser() {
  try {
    const adminEmail = 'admin@feastdash.com';
    const existingAdmin = await db.get("SELECT * FROM users WHERE email = ?", [adminEmail]);
    if (!existingAdmin) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);
      await db.run(
        "INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)",
        ['Chef Admin', adminEmail, hashedPassword, 'admin']
      );
      console.log("[Database] Seeded admin account: admin@feastdash.com / admin123");
    }
  } catch (err) {
    console.error("Error seeding admin user:", err);
  }
}

// --- API ROUTES ---

// 1. AUTHENTICATION

// Register Route
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Please fill in all registration fields.' });
  }

  try {
    const existingUser = await db.get("SELECT * FROM users WHERE email = ?", [email]);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const result = await db.run(
      "INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)",
      [username, email, hashedPassword, 'customer']
    );

    const token = jwt.sign({ id: result.lastID, role: 'customer' }, JWT_SECRET, { expiresIn: '24h' });
    res.status(201).json({
      message: 'Registration successful',
      token,
      user: { id: result.lastID, username, email, role: 'customer' }
    });
  } catch (err) {
    console.error("Register Error:", err);
    res.status(500).json({ error: 'Internal server error during registration.' });
  }
});

// Login Route
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Please enter your email and password.' });
  }

  try {
    const user = await db.get("SELECT * FROM users WHERE email = ?", [email]);
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, username: user.username, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
});

// Get Current User Profile
app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});


// 2. DISHES / MENU

// Get Menu Items
app.get('/api/dishes', async (req, res) => {
  try {
    const dishes = await db.all("SELECT * FROM dishes");
    res.json(dishes);
  } catch (err) {
    console.error("Get Dishes Error:", err);
    res.status(500).json({ error: 'Failed to retrieve menu items.' });
  }
});

// Add New Dish (Admin)
app.post('/api/dishes', authenticateToken, requireAdmin, async (req, res) => {
  const { name, description, price, image_url, category } = req.body;
  if (!name || !price || !category) {
    return res.status(400).json({ error: 'Name, price, and category are required.' });
  }

  try {
    const result = await db.run(
      "INSERT INTO dishes (name, description, price, image_url, category, available) VALUES (?, ?, ?, ?, ?, 1)",
      [name, description, parseFloat(price), image_url || '', category]
    );
    res.status(201).json({ message: 'Dish added successfully', dishId: result.lastID });
  } catch (err) {
    console.error("Add Dish Error:", err);
    res.status(500).json({ error: 'Failed to add dish.' });
  }
});

// Update Dish (Admin)
app.put('/api/dishes/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { name, description, price, image_url, category, available } = req.body;
  const { id } = req.params;

  try {
    const existing = await db.get("SELECT * FROM dishes WHERE id = ?", [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Dish not found.' });
    }

    await db.run(
      "UPDATE dishes SET name = ?, description = ?, price = ?, image_url = ?, category = ?, available = ? WHERE id = ?",
      [
        name !== undefined ? name : existing.name,
        description !== undefined ? description : existing.description,
        price !== undefined ? parseFloat(price) : existing.price,
        image_url !== undefined ? image_url : existing.image_url,
        category !== undefined ? category : existing.category,
        available !== undefined ? parseInt(available) : existing.available,
        id
      ]
    );
    res.json({ message: 'Dish updated successfully.' });
  } catch (err) {
    console.error("Update Dish Error:", err);
    res.status(500).json({ error: 'Failed to update dish.' });
  }
});

// Delete Dish (Admin)
app.delete('/api/dishes/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const existing = await db.get("SELECT * FROM dishes WHERE id = ?", [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Dish not found.' });
    }
    await db.run("DELETE FROM dishes WHERE id = ?", [id]);
    res.json({ message: 'Dish deleted successfully.' });
  } catch (err) {
    console.error("Delete Dish Error:", err);
    res.status(500).json({ error: 'Failed to delete dish.' });
  }
});


// 3. ORDERS

// Place Order
app.post('/api/orders', authenticateToken, async (req, res) => {
  const { items, total_amount, delivery_address } = req.body;
  if (!items || !total_amount || !delivery_address) {
    return res.status(400).json({ error: 'Missing required order details.' });
  }

  try {
    const itemsStr = typeof items === 'string' ? items : JSON.stringify(items);
    const createdAt = new Date().toISOString();

    const result = await db.run(
      "INSERT INTO orders (user_id, items, total_amount, status, delivery_address, created_at) VALUES (?, ?, ?, 'pending', ?, ?)",
      [req.user.id, itemsStr, parseFloat(total_amount), delivery_address, createdAt]
    );

    res.status(201).json({
      message: 'Order placed successfully!',
      orderId: result.lastID,
      status: 'pending'
    });
  } catch (err) {
    console.error("Place Order Error:", err);
    res.status(500).json({ error: 'Failed to process order.' });
  }
});

// Get Orders List (All if Admin, personal if Customer)
app.get('/api/orders', authenticateToken, async (req, res) => {
  try {
    let orders;
    if (req.user.role === 'admin') {
      orders = await db.all("SELECT o.*, u.username as customer_name, u.email as customer_email FROM orders o JOIN users u ON o.user_id = u.id");
    } else {
      orders = await db.all("SELECT * FROM orders WHERE user_id = ?", [req.user.id]);
    }

    // Parse items JSON for frontend ease
    const parsedOrders = orders.map(o => {
      try {
        o.items = JSON.parse(o.items);
      } catch (e) {
        o.items = [];
      }
      return o;
    });

    res.json(parsedOrders);
  } catch (err) {
    console.error("Get Orders Error:", err);
    res.status(500).json({ error: 'Failed to fetch orders.' });
  }
});

// Get Single Order Detail
app.get('/api/orders/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const order = await db.get("SELECT * FROM orders WHERE id = ?", [id]);
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    // Verify ownership
    if (req.user.role !== 'admin' && order.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied to this order.' });
    }

    try {
      order.items = JSON.parse(order.items);
    } catch (e) {
      order.items = [];
    }

    res.json(order);
  } catch (err) {
    console.error("Get Order Error:", err);
    res.status(500).json({ error: 'Failed to retrieve order details.' });
  }
});

// Update Order Status (Admin)
app.put('/api/orders/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  const { status } = req.body;
  const { id } = req.params;

  const validStatuses = ['pending', 'preparing', 'delivering', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid order status value.' });
  }

  try {
    const result = await db.run("UPDATE orders SET status = ? WHERE id = ?", [status, id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Order not found.' });
    }
    res.json({ message: 'Order status updated successfully.', orderId: id, status });
  } catch (err) {
    console.error("Update Status Error:", err);
    res.status(500).json({ error: 'Failed to update order status.' });
  }
});

// Catch-all route to serve the SPA or individual HTML pages if requested
app.get('*', (req, res, next) => {
  // If request is an API request, skip
  if (req.path.startsWith('/api/')) {
    return next();
  }
  // Otherwise, default file is index.html
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server after Database Initialization
db.init().then(() => {
  seedAdminUser().then(() => {
    app.listen(PORT, () => {
      console.log(`\n==================================================`);
      console.log(` FeastDash Server is live!`);
      console.log(` Running on: http://localhost:${PORT}`);
      console.log(`==================================================\n`);
    });
  });
}).catch(err => {
  console.error("Fatal: Database failed to initialize.", err);
  process.exit(1);
});
