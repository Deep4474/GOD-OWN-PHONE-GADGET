const express = require('express');
const router = express.Router();

// Newsletter subscription
router.post('/subscribe', async (req, res) => {
    try {
        const { email } = req.body;
        
        // Validate email
        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid email address'
            });
        }
        
        // Here you would typically save to database
        // For now, we'll just return success
        console.log('Newsletter subscription:', { email });
        
        res.status(201).json({
            success: true,
            message: 'Successfully subscribed to newsletter!'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Newsletter unsubscribe
router.post('/unsubscribe', async (req, res) => {
    try {
        const { email } = req.body;
        
        // Validate email
        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }
        
        // Here you would typically remove from database
        // For now, we'll just return success
        console.log('Newsletter unsubscription:', { email });
        
        res.json({
            success: true,
            message: 'Successfully unsubscribed from newsletter'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

module.exports = router; 