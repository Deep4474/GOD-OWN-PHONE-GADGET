const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const { body, validationResult } = require('express-validator');
const { authenticateToken, isAdmin } = require('./authMiddleware');
const { v4: uuidv4 } = require('uuid');
const { orders, saveOrders } = require('./orderData');
const { products } = require('./productData');
const { users } = require('./userData');
const { notifications, saveNotifications } = require('./notificationData');

const ADMIN_USERS_FILE = path.join(__dirname, './admin-users.json');

// A simple test route
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Root admin.js is being used!' });
});

// Dashboard stats endpoint
router.get('/dashboard', (req, res) => {
  const totalOrders = orders.length;
  const totalProducts = products.length;
  const totalUsers = users.length;
  const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const recentOrders = orders.slice(-5).reverse();
  res.json({
    stats: {
      totalOrders,
      totalProducts,
      totalUsers,
      totalRevenue,
      recentOrders
    }
  });
});

// Get all users (admin)
router.get('/users', (req, res) => {
  const admins = JSON.parse(fs.readFileSync(ADMIN_USERS_FILE, 'utf-8'));
  res.json({ users: admins });
});

// Analytics endpoint (admin)
router.get('/analytics', (req, res) => {
  const totalOrders = orders.length;
  const totalProducts = products.length;
  const totalUsers = users.length;
  const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  // You can add more analytics data here as needed
  res.json({
    totalOrders,
    totalProducts,
    totalUsers,
    totalRevenue
  });
});

// Admin login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  const admins = JSON.parse(fs.readFileSync(ADMIN_USERS_FILE, 'utf-8'));
  const admin = admins.find(u => u.email === email);
  if (!admin) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }
  const match = await bcrypt.compare(password, admin.password);
  if (!match) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }
  const token = jwt.sign({ id: admin.id, email: admin.email, role: admin.role }, process.env.JWT_SECRET || 'secret', { expiresIn: '2d' });
  res.json({ token, user: { id: admin.id, email: admin.email, name: admin.name, role: admin.role } });
});

// Admin register
router.post('/register', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }
  const admins = JSON.parse(fs.readFileSync(ADMIN_USERS_FILE, 'utf-8'));
  if (admins.find(u => u.email === email)) {
    return res.status(409).json({ error: 'Email already registered.' });
  }
  const hashed = await bcrypt.hash(password, 10);
  const newAdmin = {
    id: Date.now().toString(),
    email,
    password: hashed,
    name,
    role: 'admin'
  };
  admins.push(newAdmin);
  fs.writeFileSync(ADMIN_USERS_FILE, JSON.stringify(admins, null, 2));
  res.status(201).json({ message: 'Admin registered successfully.' });
});

module.exports = router; 