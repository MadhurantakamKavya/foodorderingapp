const fs = require('fs');
const path = require('path');

let dbInstance = null;
let useJsonFallback = false;
let sqliteDb = null;

// JSON Fallback Data Structure
const JSON_DB_FILE = path.join(__dirname, 'db.json');
let jsonData = {
  users: [],
  dishes: [],
  orders: []
};

// Initial Seed Data
const seedDishes = [
  {
    id: 1,
    name: "Truffle Mushroom Pizza",
    description: "Creamy truffle garlic base, wild portobello mushrooms, fresh buffalo mozzarella, drizzled with black truffle oil and fresh baby arugula.",
    price: 18.99,
    image_url: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80",
    category: "Pizza",
    available: 1
  },
  {
    id: 2,
    name: "The Feast Signature Burger",
    description: "Aged black angus beef patty, melted smoked cheddar, caramelized onions, crispy double-smoked bacon, gourmet truffle aioli, served on a toasted artisanal brioche bun.",
    price: 15.49,
    image_url: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80",
    category: "Burgers",
    available: 1
  },
  {
    id: 3,
    name: "Crispy Avocado Tacos",
    description: "Soft blue corn tortillas filled with crispy tempura avocado, spicy chipotle cabbage slaw, pickled red onions, and house cilantro-lime crema.",
    price: 13.99,
    image_url: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=600&q=80",
    category: "Mains",
    available: 1
  },
  {
    id: 4,
    name: "Rosemary Parmesan Fries",
    description: "Hand-cut Idaho russet potatoes double-fried to golden perfection, tossed with fresh rosemary, sea salt, and aged parmesan cheese. Served with black garlic dip.",
    price: 6.99,
    image_url: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80",
    category: "Sides",
    available: 1
  },
  {
    id: 5,
    name: "Molten Lava Fondant",
    description: "Rich dark chocolate cake with a warm flowing Belgian chocolate center. Dusted with cocoa and served with organic strawberries.",
    price: 9.49,
    image_url: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=600&q=80",
    category: "Desserts",
    available: 1
  },
  {
    id: 6,
    name: "Fresh Strawberry Lemonade",
    description: "Freshly squeezed lemons infused with ripe organic strawberries and sparkling spring water, garnished with fresh mint leaves and lemon wheels.",
    price: 4.99,
    image_url: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80",
    category: "Drinks",
    available: 1
  }
];

// Helper to save JSON data
function saveJsonDb() {
  try {
    fs.writeFileSync(JSON_DB_FILE, JSON.stringify(jsonData, null, 2), 'utf8');
  } catch (err) {
    console.error("Failed to write to JSON database file:", err);
  }
}

// Helper to load JSON data
function loadJsonDb() {
  if (fs.existsSync(JSON_DB_FILE)) {
    try {
      const data = fs.readFileSync(JSON_DB_FILE, 'utf8');
      jsonData = JSON.parse(data);
    } catch (err) {
      console.error("Failed to read JSON database, resetting data:", err);
      saveJsonDb();
    }
  } else {
    // Save defaults
    jsonData.dishes = [...seedDishes];
    saveJsonDb();
  }
}

// Database implementation wrapper
const db = {
  init: () => {
    return new Promise((resolve, reject) => {
      // Try to load sqlite3
      let sqlite3;
      try {
        sqlite3 = require('sqlite3').verbose();
      } catch (err) {
        console.warn("\x1b[33m%s\x1b[0m", "[Warning] sqlite3 package is not available or failed to compile. Using local JSON file fallback database.");
        useJsonFallback = true;
      }

      if (useJsonFallback) {
        loadJsonDb();
        console.log("\x1b[32m%s\x1b[0m", "[Database] JSON fallback database initialized successfully. Path: " + JSON_DB_FILE);
        resolve();
        return;
      }

      // SQLite database flow
      const dbPath = path.join(__dirname, 'database.sqlite');
      sqliteDb = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error("Failed to connect to SQLite database, falling back to JSON:", err);
          useJsonFallback = true;
          loadJsonDb();
          resolve();
          return;
        }

        // Initialize SQLite Tables sequentially to avoid race conditions
        sqliteDb.run(`CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          role TEXT DEFAULT 'customer'
        )`, [], (err) => {
          if (err) {
            console.error("SQLite failed to create users table, falling back to JSON:", err);
            useJsonFallback = true;
            loadJsonDb();
            resolve();
            return;
          }

          sqliteDb.run(`CREATE TABLE IF NOT EXISTS dishes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            price REAL NOT NULL,
            image_url TEXT,
            category TEXT,
            available INTEGER DEFAULT 1
          )`, [], (err) => {
            if (err) {
              console.error("SQLite failed to create dishes table, falling back to JSON:", err);
              useJsonFallback = true;
              loadJsonDb();
              resolve();
              return;
            }

            sqliteDb.run(`CREATE TABLE IF NOT EXISTS orders (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id INTEGER,
              items TEXT NOT NULL,
              total_amount REAL NOT NULL,
              status TEXT DEFAULT 'pending',
              delivery_address TEXT NOT NULL,
              created_at TEXT NOT NULL
            )`, [], (err) => {
              if (err) {
                console.error("SQLite failed to create orders table, falling back to JSON:", err);
                useJsonFallback = true;
                loadJsonDb();
                resolve();
                return;
              }

              // Seed default items if empty
              sqliteDb.get("SELECT COUNT(*) as count FROM dishes", [], (err, row) => {
                if (row && row.count === 0) {
                  const stmt = sqliteDb.prepare("INSERT INTO dishes (id, name, description, price, image_url, category, available) VALUES (?, ?, ?, ?, ?, ?, ?)");
                  let pendingSeeds = seedDishes.length;
                  seedDishes.forEach(dish => {
                    stmt.run(dish.id, dish.name, dish.description, dish.price, dish.image_url, dish.category, dish.available, (err) => {
                      pendingSeeds--;
                      if (pendingSeeds === 0) {
                        stmt.finalize(() => {
                          console.log("[Database] Seeded initial dishes in SQLite.");
                          console.log("\x1b[32m%s\x1b[0m", "[Database] SQLite database initialized successfully. Path: " + dbPath);
                          resolve();
                        });
                      }
                    });
                  });
                } else {
                  console.log("\x1b[32m%s\x1b[0m", "[Database] SQLite database initialized successfully. Path: " + dbPath);
                  resolve();
                }
              });
            });
          });
        });
      });
    });
  },

  // GET Single Row
  get: (query, params = []) => {
    return new Promise((resolve, reject) => {
      if (useJsonFallback) {
        // Simple query parsing emulator for JSON
        if (query.includes("FROM users WHERE email = ?")) {
          const email = params[0]?.toLowerCase();
          const user = jsonData.users.find(u => u.email.toLowerCase() === email);
          resolve(user || null);
        } else if (query.includes("FROM users WHERE id = ?")) {
          const id = parseInt(params[0]);
          const user = jsonData.users.find(u => u.id === id);
          resolve(user || null);
        } else if (query.includes("FROM dishes WHERE id = ?")) {
          const id = parseInt(params[0]);
          const dish = jsonData.dishes.find(d => d.id === id);
          resolve(dish || null);
        } else if (query.includes("FROM orders WHERE id = ?")) {
          const id = parseInt(params[0]);
          const order = jsonData.orders.find(o => o.id === id);
          resolve(order || null);
        } else {
          resolve(null);
        }
        return;
      }

      sqliteDb.get(query, params, (err, row) => {
        if (err) reject(err);
        else resolve(row || null);
      });
    });
  },

  // GET All Rows
  all: (query, params = []) => {
    return new Promise((resolve, reject) => {
      if (useJsonFallback) {
        if (query.includes("FROM dishes")) {
          resolve(jsonData.dishes);
        } else if (query.includes("FROM orders WHERE user_id = ?")) {
          const userId = parseInt(params[0]);
          const orders = jsonData.orders.filter(o => o.user_id === userId);
          // Sort descending by id (latest first)
          orders.sort((a, b) => b.id - a.id);
          resolve(orders);
        } else if (query.includes("FROM orders") && !query.includes("user_id")) {
          const orders = [...jsonData.orders];
          orders.sort((a, b) => b.id - a.id);
          resolve(orders);
        } else {
          resolve([]);
        }
        return;
      }

      sqliteDb.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  },

  // RUN Insert / Update / Delete
  run: (query, params = []) => {
    return new Promise((resolve, reject) => {
      if (useJsonFallback) {
        // Users Insert
        if (query.includes("INSERT INTO users")) {
          const id = jsonData.users.length ? Math.max(...jsonData.users.map(u => u.id)) + 1 : 1;
          const newUser = {
            id,
            username: params[0],
            email: params[1],
            password: params[2],
            role: params[3] || 'customer'
          };
          jsonData.users.push(newUser);
          saveJsonDb();
          resolve({ lastID: id, changes: 1 });
        }
        // Dishes Insert
        else if (query.includes("INSERT INTO dishes")) {
          const id = jsonData.dishes.length ? Math.max(...jsonData.dishes.map(d => d.id)) + 1 : 1;
          const newDish = {
            id,
            name: params[0],
            description: params[1],
            price: parseFloat(params[2]),
            image_url: params[3],
            category: params[4],
            available: params[5] !== undefined ? params[5] : 1
          };
          jsonData.dishes.push(newDish);
          saveJsonDb();
          resolve({ lastID: id, changes: 1 });
        }
        // Dishes Update
        else if (query.includes("UPDATE dishes SET name")) {
          const id = parseInt(params[6]);
          const idx = jsonData.dishes.findIndex(d => d.id === id);
          if (idx !== -1) {
            jsonData.dishes[idx] = {
              id,
              name: params[0],
              description: params[1],
              price: parseFloat(params[2]),
              image_url: params[3],
              category: params[4],
              available: parseInt(params[5])
            };
            saveJsonDb();
            resolve({ changes: 1 });
          } else {
            resolve({ changes: 0 });
          }
        }
        // Dishes Delete
        else if (query.includes("DELETE FROM dishes")) {
          const id = parseInt(params[0]);
          const initialLen = jsonData.dishes.length;
          jsonData.dishes = jsonData.dishes.filter(d => d.id !== id);
          saveJsonDb();
          resolve({ changes: initialLen - jsonData.dishes.length });
        }
        // Orders Insert
        else if (query.includes("INSERT INTO orders")) {
          const id = jsonData.orders.length ? Math.max(...jsonData.orders.map(o => o.id)) + 1 : 1;
          const newOrder = {
            id,
            user_id: parseInt(params[0]),
            items: params[1],
            total_amount: parseFloat(params[2]),
            status: params[3] || 'pending',
            delivery_address: params[4],
            created_at: params[5]
          };
          jsonData.orders.push(newOrder);
          saveJsonDb();
          resolve({ lastID: id, changes: 1 });
        }
        // Orders Update Status
        else if (query.includes("UPDATE orders SET status = ?")) {
          const status = params[0];
          const id = parseInt(params[1]);
          const order = jsonData.orders.find(o => o.id === id);
          if (order) {
            order.status = status;
            saveJsonDb();
            resolve({ changes: 1 });
          } else {
            resolve({ changes: 0 });
          }
        } else {
          resolve({ changes: 0 });
        }
        return;
      }

      // SQLite run
      sqliteDb.run(query, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ lastID: this.lastID, changes: this.changes });
        }
      });
    });
  }
};

module.exports = db;
