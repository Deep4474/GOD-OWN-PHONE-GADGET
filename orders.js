const express = require('express');
const router = express.Router();
const { orders, saveOrders } = require('./orderData');
const { authenticateToken } = require('./authMiddleware');
const { v4: uuidv4 } = require('uuid');

// Get all orders (admin)
router.get('/', (req, res) => {
  res.json({ orders });
});

// Get orders for the logged-in user
router.get('/user', authenticateToken, (req, res) => {
  try {
    
    const userOrders = orders.filter(order => order.userId === req.user.userId);
    res.json({ orders: userOrders });
  } catch (error) {
    console.error('Failed to get user orders:', error);
    res.status(500).json({ error: 'Failed to get user orders' });
  }
});

// Get orders for a user
router.get('/user/:userId', (req, res) => {
  const userOrders = orders.filter(o => o.userId === req.params.userId);
  res.json({ orders: userOrders });
});

// Create a new order
router.post('/create', (req, res) => {
  const { userId, productId, quantity, deliveryOption, paymentMethod, deliveryAddress, totalAmount } = req.body;
  
  const requiredFields = { userId, productId, quantity, deliveryOption, paymentMethod, deliveryAddress, totalAmount };
  const missingFields = Object.entries(requiredFields)
    .filter(([key, value]) => value === undefined || value === null)
    .map(([key]) => key);

  if (missingFields.length > 0) {
    return res.status(400).json({ error: `Missing required fields: ${missingFields.join(', ')}` });
  }

  const newOrder = {
    _id: Date.now().toString(),
    userId,
    productId,
    quantity,
    deliveryOption,
    paymentMethod,
    deliveryAddress,
    totalAmount,
    status: 'pending',
    createdAt: new Date().toISOString(),
    adminMessage: ''
  };
  orders.push(newOrder);
  saveOrders(orders);
  res.status(201).json({ success: true, order: newOrder });
});

// Update order status (admin)
router.put('/:id/update', (req, res) => {
  const { status, message } = req.body;
  const order = orders.find(o => o._id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (status) order.status = status;
  if (message) order.adminMessage = message;
  saveOrders(orders);
  res.json({ success: true, order });
});

module.exports = router; 