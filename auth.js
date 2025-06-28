const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - require authentication
exports.protect = async (req, res, next) => {
    let token;

    // Check if token exists in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    // Check if token exists in cookies
    if (!token && req.cookies && req.cookies.token) {
        token = req.cookies.token;
    }

    // Check if token exists
    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Not authorized to access this route'
        });
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Get user from token
        req.user = await User.findById(decoded.id).select('-password');

        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if user is active
        if (!req.user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Account is deactivated'
            });
        }

        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Not authorized to access this route'
        });
    }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized to access this route'
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `User role ${req.user.role} is not authorized to access this route`
            });
        }

        next();
    };
};

// Optional authentication - doesn't require token but adds user if available
exports.optionalAuth = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token && req.cookies && req.cookies.token) {
        token = req.cookies.token;
    }

    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id).select('-password');
        } catch (error) {
            // Token is invalid, but we don't throw error for optional auth
            req.user = null;
        }
    }

    next();
};

// Check if user is admin
exports.isAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Admin access required'
        });
    }
    next();
};

// Check if user owns the resource or is admin
exports.isOwnerOrAdmin = (resourceUserId) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        // Allow if user is admin or owns the resource
        if (req.user.role === 'admin' || req.user._id.toString() === resourceUserId.toString()) {
            return next();
        }

        return res.status(403).json({
            success: false,
            message: 'Not authorized to access this resource'
        });
    };
};

// Rate limiting for authentication attempts
exports.authRateLimit = (req, res, next) => {
    const key = `auth_${req.ip}`;
    const limit = 5; // 5 attempts
    const windowMs = 15 * 60 * 1000; // 15 minutes

    // This is a simple in-memory rate limiting
    // In production, use Redis or a proper rate limiting library
    if (!req.app.locals.authAttempts) {
        req.app.locals.authAttempts = new Map();
    }

    const attempts = req.app.locals.authAttempts.get(key) || { count: 0, resetTime: Date.now() + windowMs };

    if (Date.now() > attempts.resetTime) {
        attempts.count = 0;
        attempts.resetTime = Date.now() + windowMs;
    }

    attempts.count++;

    if (attempts.count > limit) {
        return res.status(429).json({
            success: false,
            message: 'Too many authentication attempts. Please try again later.'
        });
    }

    req.app.locals.authAttempts.set(key, attempts);
    next();
};

// Validate JWT token without requiring user to exist
exports.validateToken = (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token && req.cookies && req.cookies.token) {
        token = req.cookies.token;
    }

    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.tokenData = decoded;
        } catch (error) {
            req.tokenData = null;
        }
    }

    next();
}; 