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
  res.json({ success: true, message: 'Admin route is working' });
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
  res.json({ users });
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

module.exports = router; 