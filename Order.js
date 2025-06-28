const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    orderNumber: {
        type: String,
        unique: true,
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        name: {
            type: String,
            required: true
        },
        price: {
            type: Number,
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: [1, 'Quantity must be at least 1']
        },
        image: {
            type: String,
            required: true
        },
        sku: {
            type: String,
            required: true
        }
    }],
    shippingAddress: {
        firstName: {
            type: String,
            required: true
        },
        lastName: {
            type: String,
            required: true
        },
        email: {
            type: String,
            required: true
        },
        phone: {
            type: String,
            required: true
        },
        street: {
            type: String,
            required: true
        },
        city: {
            type: String,
            required: true
        },
        state: {
            type: String,
            required: true
        },
        zipCode: {
            type: String,
            required: true
        },
        country: {
            type: String,
            default: 'USA'
        }
    },
    billingAddress: {
        firstName: String,
        lastName: String,
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: {
            type: String,
            default: 'USA'
        }
    },
    paymentInfo: {
        id: String,
        status: {
            type: String,
            enum: ['pending', 'completed', 'failed', 'refunded'],
            default: 'pending'
        },
        method: {
            type: String,
            enum: ['stripe', 'paypal', 'cash_on_delivery'],
            required: true
        },
        transactionId: String,
        paidAt: Date
    },
    itemsPrice: {
        type: Number,
        required: true,
        default: 0.0
    },
    taxPrice: {
        type: Number,
        required: true,
        default: 0.0
    },
    shippingPrice: {
        type: Number,
        required: true,
        default: 0.0
    },
    totalPrice: {
        type: Number,
        required: true,
        default: 0.0
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
        default: 'pending'
    },
    shippingInfo: {
        trackingNumber: String,
        carrier: String,
        shippedAt: Date,
        estimatedDelivery: Date,
        deliveredAt: Date
    },
    notes: {
        type: String,
        maxlength: [500, 'Notes cannot exceed 500 characters']
    },
    isGift: {
        type: Boolean,
        default: false
    },
    giftMessage: {
        type: String,
        maxlength: [200, 'Gift message cannot exceed 200 characters']
    },
    coupon: {
        code: String,
        discount: {
            type: Number,
            default: 0
        }
    },
    refundInfo: {
        amount: Number,
        reason: String,
        processedAt: Date,
        processedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    }
}, {
    timestamps: true
});

// Indexes for better query performance
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ user: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ 'paymentInfo.status': 1 });

// Generate order number
orderSchema.pre('save', async function(next) {
    if (this.isNew) {
        const date = new Date();
        const year = date.getFullYear().toString().slice(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        
        // Get count of orders for today
        const today = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const orderCount = await this.constructor.countDocuments({
            createdAt: { $gte: today }
        });
        
        const sequence = (orderCount + 1).toString().padStart(4, '0');
        this.orderNumber = `GOPG${year}${month}${day}${sequence}`;
    }
    next();
});

// Calculate totals before saving
orderSchema.pre('save', function(next) {
    if (this.isModified('items') || this.isModified('coupon')) {
        this.calculateTotals();
    }
    next();
});

// Method to calculate order totals
orderSchema.methods.calculateTotals = function() {
    this.itemsPrice = this.items.reduce((total, item) => {
        return total + (item.price * item.quantity);
    }, 0);
    
    // Apply coupon discount
    const discountAmount = this.coupon?.discount || 0;
    const subtotalAfterDiscount = this.itemsPrice - discountAmount;
    
    // Calculate tax (assuming 8.5% tax rate)
    this.taxPrice = subtotalAfterDiscount * 0.085;
    
    // Calculate shipping (free shipping over $50, otherwise $5.99)
    this.shippingPrice = subtotalAfterDiscount >= 50 ? 0 : 5.99;
    
    // Calculate total
    this.totalPrice = subtotalAfterDiscount + this.taxPrice + this.shippingPrice;
    
    return this;
};

// Method to update order status
orderSchema.methods.updateStatus = function(newStatus, additionalInfo = {}) {
    this.status = newStatus;
    
    if (newStatus === 'shipped' && additionalInfo.trackingNumber) {
        this.shippingInfo.trackingNumber = additionalInfo.trackingNumber;
        this.shippingInfo.carrier = additionalInfo.carrier;
        this.shippingInfo.shippedAt = new Date();
        this.shippingInfo.estimatedDelivery = additionalInfo.estimatedDelivery;
    }
    
    if (newStatus === 'delivered') {
        this.shippingInfo.deliveredAt = new Date();
    }
    
    return this.save();
};

// Method to process refund
orderSchema.methods.processRefund = function(amount, reason, processedBy) {
    this.status = 'refunded';
    this.refundInfo = {
        amount,
        reason,
        processedAt: new Date(),
        processedBy
    };
    
    return this.save();
};

// Static method to get orders by user
orderSchema.statics.getUserOrders = function(userId, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    return this.find({ user: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('items.product', 'name images')
        .populate('user', 'firstName lastName email');
};

// Static method to get order statistics
orderSchema.statics.getOrderStats = function() {
    return this.aggregate([
        {
            $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                totalRevenue: { $sum: '$totalPrice' },
                averageOrderValue: { $avg: '$totalPrice' }
            }
        }
    ]);
};

// Static method to get orders by status
orderSchema.statics.getOrdersByStatus = function(status, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    return this.find({ status })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'firstName lastName email')
        .populate('items.product', 'name images');
};

// Virtual for order summary
orderSchema.virtual('summary').get(function() {
    return {
        orderNumber: this.orderNumber,
        totalItems: this.items.reduce((sum, item) => sum + item.quantity, 0),
        totalPrice: this.totalPrice,
        status: this.status,
        createdAt: this.createdAt
    };
});

// Ensure virtual fields are serialized
orderSchema.set('toJSON', {
    virtuals: true,
    transform: function(doc, ret) {
        return ret;
    }
});

module.exports = mongoose.model('Order', orderSchema); 