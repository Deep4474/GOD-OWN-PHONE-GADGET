const express = require('express');
const router = express.Router();

// Mock location handler
router.post('/', (req, res) => {
  const { latitude, longitude } = req.body;
  console.log('Received location:', { latitude, longitude });

  // In a real app, you might save this to a user's profile
  // or use it to calculate delivery costs, etc.
  
  res.json({ 
    success: true, 
    message: 'Location received',
    // You could return address details from a reverse geocoding API here
    address: {
      street: '123 Mockingbird Lane',
      area: 'Faketown',
      state: 'CA'
    }
  });
});

module.exports = router; 