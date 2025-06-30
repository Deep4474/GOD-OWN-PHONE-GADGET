const express = require('express');
const router = express.Router();
const { notifications, saveNotifications } = require('./notificationData');
const { authenticateToken, requireAdmin } = require('./authMiddleware');
const { v4: uuidv4 } = require('uuid');

// Get notifications for a user (or the logged-in user)
router.get('/', authenticateToken, (req, res) => {
  const userIdToFetch = req.query.userId || req.user.userId;
  
  // Optional: Add an admin check here if only admins should be able
  // to fetch notifications for other users.
  // if (req.query.userId && req.user.role !== 'admin') {
  //   return res.status(403).json({ error: 'Forbidden' });
  // }

  const userNotifications = notifications.filter(n => n.userId === userIdToFetch);
  res.json({ notifications: userNotifications });
});

// Get unread notification count for a user
// router.get('/unread-count', (req, res) => {
//   const userId = req.query.userId;
//   if (!userId) return res.status(400).json({ error: 'userId required' });
//   const count = notifications.filter(n => n.userId === userId && !n.read).length;
//   res.json({ count });
// });

// Get unread notifications count for the logged-in user
router.get('/unread-count', authenticateToken, (req, res) => {
  console.log('User for unread-count:', req.user);
  console.log('All notifications:', notifications);
  const userNotifications = notifications.filter(n => n.userId === req.user.userId && !n.read);
  res.json({ count: userNotifications.length });
});

// Mark a notification as read
router.put('/:id/read', (req, res) => {
  const notif = notifications.find(n => n._id === req.params.id);
  if (!notif) return res.status(404).json({ error: 'Notification not found' });
  notif.read = true;
  saveNotifications(notifications);
  res.json({ success: true, notification: notif });
});

// Admin: send notification to user
router.post('/send', (req, res) => {
  const { userId, message, type } = req.body;
  if (!userId || !message) return res.status(400).json({ error: 'userId and message required' });
  const notif = {
    _id: Date.now().toString(),
    userId,
    message,
    type: type || 'order_update',
    read: false,
    createdAt: new Date().toISOString()
  };
  notifications.push(notif);
  saveNotifications(notifications);
  res.status(201).json({ success: true, notification: notif });
});

module.exports = router; 