const express = require('express');
const { body, validationResult } = require('express-validator');
const { products, saveProducts } = require('./productData');
const { authenticateToken, requireAdmin } = require('./authMiddleware');

const router = express.Router();

// Get all products
router.get('/', (req, res) => {
  try {
    const { category, brand, minPrice, maxPrice, search, sort } = req.query;
    
    let filteredProducts = [...products];

    // Filter by category
    if (category) {
      filteredProducts = filteredProducts.filter(p => 
        p.category.toLowerCase() === category.toLowerCase()
      );
    }

    // Filter by brand
    if (brand) {
      filteredProducts = filteredProducts.filter(p => 
        p.brand.toLowerCase() === brand.toLowerCase()
      );
    }

    // Filter by price range
    if (minPrice) {
      filteredProducts = filteredProducts.filter(p => p.price >= parseFloat(minPrice));
    }
    if (maxPrice) {
      filteredProducts = filteredProducts.filter(p => p.price <= parseFloat(maxPrice));
    }

    // Search by name or description
    if (search) {
      const searchTerm = search.toLowerCase();
      filteredProducts = filteredProducts.filter(p => 
        p.name.toLowerCase().includes(searchTerm) ||
        p.description.toLowerCase().includes(searchTerm)
      );
    }

    // Sort products
    if (sort) {
      switch (sort) {
        case 'price_asc':
          filteredProducts.sort((a, b) => a.price - b.price);
          break;
        case 'price_desc':
          filteredProducts.sort((a, b) => b.price - a.price);
          break;
        case 'rating':
          filteredProducts.sort((a, b) => b.rating - a.rating);
          break;
        case 'newest':
          filteredProducts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          break;
      }
    }

    res.json({
      products: filteredProducts,
      total: filteredProducts.length,
      categories: [...new Set(products.map(p => p.category))],
      brands: [...new Set(products.map(p => p.brand))]
    });

  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get single product
router.get('/:id', (req, res) => {
  try {
    const product = products.find(p => p._id === req.params.id);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ product });

  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Get products by category
router.get('/category/:category', (req, res) => {
  try {
    const categoryProducts = products.filter(p => 
      p.category.toLowerCase() === req.params.category.toLowerCase()
    );

    res.json({
      products: categoryProducts,
      total: categoryProducts.length,
      category: req.params.category
    });

  } catch (error) {
    console.error('Get category products error:', error);
    res.status(500).json({ error: 'Failed to fetch category products' });
  }
});

// Get featured products (top rated)
router.get('/featured/top-rated', (req, res) => {
  try {
    const featuredProducts = products
      .filter(p => p.rating >= 4.5)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 6);

    res.json({
      products: featuredProducts,
      total: featuredProducts.length
    });

  } catch (error) {
    console.error('Get featured products error:', error);
    res.status(500).json({ error: 'Failed to fetch featured products' });
  }
});

// Get new arrivals
router.get('/new-arrivals', (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const newArrivals = products
      .filter(p => new Date(p.createdAt) >= thirtyDaysAgo)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 8);

    res.json({
      products: newArrivals,
      total: newArrivals.length
    });

  } catch (error) {
    console.error('Get new arrivals error:', error);
    res.status(500).json({ error: 'Failed to fetch new arrivals' });
  }
});

// Get product categories
router.get('/categories/list', (req, res) => {
  try {
    const categories = [...new Set(products.map(p => p.category))];
    
    res.json({
      categories: categories.map(category => ({
        name: category,
        count: products.filter(p => p.category === category).length
      }))
    });

  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get product brands
router.get('/brands/list', (req, res) => {
  try {
    const brands = [...new Set(products.map(p => p.brand))];
    
    res.json({
      brands: brands.map(brand => ({
        name: brand,
        count: products.filter(p => p.brand === brand).length
      }))
    });

  } catch (error) {
    console.error('Get brands error:', error);
    res.status(500).json({ error: 'Failed to fetch brands' });
  }
});

// Add new product (admin only)
router.post('/', authenticateToken, requireAdmin, (req, res) => {
  const { name, price, description, category, brand, stock, images } = req.body;
  if (!name || !price || !description || !category || !brand || !stock || !images || !Array.isArray(images)) {
    return res.status(400).json({ error: 'All product fields are required' });
  }
  const newProduct = {
    _id: Date.now().toString(),
    name,
    price: Number(price),
    description,
    category,
    brand,
    stock: Number(stock),
    images,
    createdAt: new Date().toISOString()
  };
  products.push(newProduct);
  saveProducts(products);
  res.status(201).json({ message: 'Product added successfully', product: newProduct });
});

// Update a product (admin only)
router.put('/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const productIndex = products.findIndex(p => p._id === id);

  if (productIndex === -1) {
    return res.status(404).json({ error: 'Product not found' });
  }

  // Update only the fields that are provided in the request
  const updatedProduct = { ...products[productIndex], ...req.body };
  products[productIndex] = updatedProduct;

  saveProducts(products);
  res.json({ message: 'Product updated successfully', product: updatedProduct });
});

// Delete a product (admin only)
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const productIndex = products.findIndex(p => p._id === id);

  if (productIndex === -1) {
    return res.status(404).json({ error: 'Product not found' });
  }

  products.splice(productIndex, 1); // Mutate the array directly

  saveProducts(products);
  res.json({ message: 'Product deleted successfully' });
});

module.exports = router; 