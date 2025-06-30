const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const nodemailer = require('nodemailer');
const { users, saveUsers } = require('./userData');
const { authenticateToken } = require('./authMiddleware');

const router = express.Router();

// Configure nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'ayomideoluniyi49@gmail.com',
    pass: 'nlpy xohr iuli tszl',
  },
});

// Helper to sanitize user object
function sanitizeUser(user) {
  const { password, verificationCode, ...sanitized } = user;
  // Ensure the sanitized user object has the id aliased as _id for consistency
  return { _id: user.id, ...sanitized };
}

// Validation middleware
const validateRegistration = [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone').isMobilePhone().withMessage('Valid phone number is required'),
];

const validateLogin = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

// Register new user
router.post('/register', validateRegistration, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, phone, address } = req.body;
    const existingUser = users.find(user => user.email === email);

    if (existingUser) {
      if (existingUser.isVerified) {
        return res.status(400).json({ error: 'User already exists with this email' });
      }

      // Resend verification for unverified user
      const newVerificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      existingUser.verificationCode = newVerificationCode;
      existingUser.password = await bcrypt.hash(password, 12);
      saveUsers(users);

      await transporter.sendMail({
        from: `ONGOD Gadget Shop <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Your New Verification Code',
        text: `Your new verification code is: ${newVerificationCode}`,
      });

      return res.status(200).json({
        message: 'This email is already registered but not verified. A new verification code has been sent.',
      });
    }

    // Create new user
    const hashedPassword = await bcrypt.hash(password, 12);
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const newUser = {
      id: Date.now().toString(),
      name,
      email,
      password: hashedPassword,
      phone,
      address: address || '',
      role: 'customer',
      createdAt: new Date().toISOString(),
      isVerified: false,
      verificationCode,
    };

    users.push(newUser);
    saveUsers(users);

    await transporter.sendMail({
      from: `ONGOD Gadget Shop <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Your Verification Code',
      text: `Your verification code is: ${verificationCode}`,
    });

    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email, role: newUser.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    const userToReturn = sanitizeUser(newUser);
    console.log('--- DEBUG: User object sent on successful registration ---');
    console.log(JSON.stringify(userToReturn, null, 2));

    res.status(201).json({
      message: 'User registered successfully. Verification code sent to your email.',
      user: userToReturn,
      token,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login user
router.post('/login', validateLogin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    const user = users.find(u => u.email === email);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    const userToSend = sanitizeUser(user);
    console.log("--- DEBUG: User object being sent on login ---");
    console.log(JSON.stringify(userToSend, null, 2));

    res.json({
      message: 'Login successful',
      user: userToSend,
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Verify email
router.post('/verify', async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ error: 'Email and verification code are required' });
  }

  const user = users.find(u => u.email === email);
  if (!user || user.isVerified || user.verificationCode !== code) {
    return res.status(400).json({ error: 'Invalid verification code or user already verified' });
  }

  user.isVerified = true;
  user.verificationCode = null;
  saveUsers(users);

  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '24h' }
  );

  const userToReturn = sanitizeUser(user);
  console.log('--- DEBUG: User object sent on successful verification ---');
  console.log(JSON.stringify(userToReturn, null, 2));

  res.json({
    success: true,
    message: 'Email verified successfully',
    token,
    user: userToReturn
  });
});

// Get current user profile
router.get('/profile', authenticateToken, (req, res) => {
  const user = users.find(u => u.id === req.user.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ user: sanitizeUser(user) });
});

// Update user profile
router.put(
  '/profile',
  authenticateToken,
  [
    body('name').optional().trim().isLength({ min: 2 }),
    body('phone').optional().isMobilePhone(),
    body('address').optional().trim(),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userIndex = users.findIndex(u => u.id === req.user.userId);
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { name, phone, address } = req.body;
    if (name) users[userIndex].name = name;
    if (phone) users[userIndex].phone = phone;
    if (address) users[userIndex].address = address;
    
    saveUsers(users);

    res.json({
      message: 'Profile updated successfully',
      user: sanitizeUser(users[userIndex]),
    });
  }
);

// Logout
router.post('/logout', authenticateToken, (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

module.exports = router; 