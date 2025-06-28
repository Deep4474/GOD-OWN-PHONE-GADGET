const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Product name is required'],
        trim: true,
        maxlength: [100, 'Product name cannot exceed 100 characters']
    },
    description: {
        type: String,
        required: [true, 'Product description is required'],
        maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    shortDescription: {
        type: String,
        maxlength: [200, 'Short description cannot exceed 200 characters']
    },
    price: {
        type: Number,
        required: [true, 'Product price is required'],
        min: [0, 'Price cannot be negative']
    },
    originalPrice: {
        type: Number,
        min: [0, 'Original price cannot be negative']
    },
    category: {
        type: String,
        required: [true, 'Product category is required'],
        enum: ['phones', 'tablets', 'accessories', 'laptops', 'smartwatches', 'other']
    },
    brand: {
        type: String,
        required: [true, 'Product brand is required'],
        trim: true
    },
    model: {
        type: String,
        trim: true
    },
    sku: {
        type: String,
        unique: true,
        required: [true, 'SKU is required']
    },
    images: [{
        public_id: String,
        url: {
            type: String,
            required: true
        },
        alt: String
    }],
    mainImage: {
        public_id: String,
        url: {
            type: String,
            required: true
        },
        alt: String
    },
    specifications: {
        type: Map,
        of: String
    },
    features: [{
        type: String,
        trim: true
    }],
    colors: [{
        name: String,
        code: String
    }],
    storage: [{
        capacity: String,
        price: Number
    }],
    stock: {
        type: Number,
        required: [true, 'Stock quantity is required'],
        min: [0, 'Stock cannot be negative'],
        default: 0
    },
    lowStockThreshold: {
        type: Number,
        default: 5,
        min: [0, 'Low stock threshold cannot be negative']
    },
    weight: {
        type: Number,
        min: [0, 'Weight cannot be negative']
    },
    dimensions: {
        length: Number,
        width: Number,
        height: Number
    },
    warranty: {
        type: String,
        default: '1 Year Manufacturer Warranty'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isFeatured: {
        type: Boolean,
        default: false
    },
    isOnSale: {
        type: Boolean,
        default: false
    },
    salePercentage: {
        type: Number,
        min: [0, 'Sale percentage cannot be negative'],
        max: [100, 'Sale percentage cannot exceed 100']
    },
    tags: [{
        type: String,
        trim: true
    }],
    ratings: {
        average: {
            type: Number,
            default: 0,
            min: [0, 'Rating cannot be negative'],
            max: [5, 'Rating cannot exceed 5']
        },
        count: {
            type: Number,
            default: 0,
            min: [0, 'Rating count cannot be negative']
        }
    },
    reviews: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        rating: {
            type: Number,
            required: true,
            min: [1, 'Rating must be at least 1'],
            max: [5, 'Rating cannot exceed 5']
        },
        comment: {
            type: String,
            required: true,
            maxlength: [500, 'Review comment cannot exceed 500 characters']
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    relatedProducts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    }],
    seo: {
        title: String,
        description: String,
        keywords: [String]
    }
}, {
    timestamps: true
});

// Indexes for better query performance
productSchema.index({ name: 'text', description: 'text', brand: 'text' });
productSchema.index({ category: 1 });
productSchema.index({ brand: 1 });
productSchema.index({ isActive: 1 });
productSchema.index({ isFeatured: 1 });
productSchema.index({ isOnSale: 1 });
productSchema.index({ price: 1 });
productSchema.index({ 'ratings.average': -1 });

// Virtual for discount percentage
productSchema.virtual('discountPercentage').get(function() {
    if (this.originalPrice && this.originalPrice > this.price) {
        return Math.round(((this.originalPrice - this.price) / this.originalPrice) * 100);
    }
    return 0;
});

// Virtual for stock status
productSchema.virtual('stockStatus').get(function() {
    if (this.stock === 0) return 'out-of-stock';
    if (this.stock <= this.lowStockThreshold) return 'low-stock';
    return 'in-stock';
});

// Method to update average rating
productSchema.methods.updateAverageRating = function() {
    if (this.reviews.length === 0) {
        this.ratings.average = 0;
        this.ratings.count = 0;
    } else {
        const totalRating = this.reviews.reduce((sum, review) => sum + review.rating, 0);
        this.ratings.average = totalRating / this.reviews.length;
        this.ratings.count = this.reviews.length;
    }
    return this.save();
};

// Method to add review
productSchema.methods.addReview = function(userId, rating, comment) {
    // Check if user already reviewed
    const existingReviewIndex = this.reviews.findIndex(
        review => review.user.toString() === userId.toString()
    );
    
    if (existingReviewIndex > -1) {
        // Update existing review
        this.reviews[existingReviewIndex].rating = rating;
        this.reviews[existingReviewIndex].comment = comment;
        this.reviews[existingReviewIndex].createdAt = Date.now();
    } else {
        // Add new review
        this.reviews.push({ user: userId, rating, comment });
    }
    
    return this.updateAverageRating();
};

// Static method to get featured products
productSchema.statics.getFeaturedProducts = function(limit = 8) {
    return this.find({ isActive: true, isFeatured: true })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('reviews.user', 'firstName lastName');
};

// Static method to get products by category
productSchema.statics.getProductsByCategory = function(category, limit = 12, page = 1) {
    const skip = (page - 1) * limit;
    return this.find({ isActive: true, category })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('reviews.user', 'firstName lastName');
};

// Static method to search products
productSchema.statics.searchProducts = function(query, limit = 12, page = 1) {
    const skip = (page - 1) * limit;
    return this.find(
        { 
            isActive: true, 
            $text: { $search: query } 
        },
        { score: { $meta: "textScore" } }
    )
    .sort({ score: { $meta: "textScore" } })
    .skip(skip)
    .limit(limit)
    .populate('reviews.user', 'firstName lastName');
};

// Ensure virtual fields are serialized
productSchema.set('toJSON', {
    virtuals: true,
    transform: function(doc, ret) {
        return ret;
    }
});

module.exports = mongoose.model('Product', productSchema); 