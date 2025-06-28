// API Configuration
const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:5000/api' 
    : `${window.location.origin}/api`;

// Global state
let currentUser = null;
let cart = JSON.parse(localStorage.getItem('cart')) || [];

// API Helper Functions
const api = {
    async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        // Add auth token if available
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'API request failed');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    // Auth endpoints
    auth: {
        async register(userData) {
            return await api.request('/auth/register', {
                method: 'POST',
                body: JSON.stringify(userData)
            });
        },

        async login(credentials) {
            return await api.request('/auth/login', {
                method: 'POST',
                body: JSON.stringify(credentials)
            });
        },

        async logout() {
            return await api.request('/auth/logout', {
                method: 'POST'
            });
        },

        async getCurrentUser() {
            return await api.request('/auth/me');
        },

        async updateProfile(profileData) {
            return await api.request('/auth/update-profile', {
                method: 'PUT',
                body: JSON.stringify(profileData)
            });
        }
    },

    // Product endpoints
    products: {
        async getAll(params = {}) {
            const queryString = new URLSearchParams(params).toString();
            return await api.request(`/products?${queryString}`);
        },

        async getById(id) {
            return await api.request(`/products/${id}`);
        },

        async getFeatured(limit = 8) {
            return await api.request(`/products/featured?limit=${limit}`);
        },

        async getByCategory(category, params = {}) {
            const queryString = new URLSearchParams(params).toString();
            return await api.request(`/products/category/${category}?${queryString}`);
        },

        async search(query, params = {}) {
            const searchParams = { q: query, ...params };
            const queryString = new URLSearchParams(searchParams).toString();
            return await api.request(`/products/search?${queryString}`);
        }
    }
};

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize all functionality
    initNavigation();
    initProductFiltering();
    initContactForm();
    initNewsletterForm();
    initBackToTop();
    initAnimations();
    initMobileMenu();
    initSearch();
    initCart();
    initTestimonialsSlider();
    initAuthentication();
    loadProducts();
    updateCartDisplay();
    showMyOrdersModal();
});

// Authentication functionality
function initAuthentication() {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (token) {
        loadCurrentUser();
    }

    // Add login/register modals
    addAuthModals();
}

function addAuthModals() {
    // Create login modal
    const loginModal = document.createElement('div');
    loginModal.className = 'auth-modal' + (localStorage.getItem('token') ? ' hidden' : '');
    loginModal.innerHTML = `
        <div class="auth-modal-content">
            <div class="auth-modal-header">
                <h3>Login</h3>
                <button class="close-auth-modal">&times;</button>
            </div>
            <form id="loginForm" class="auth-form">
                <div class="form-group">
                    <label for="loginEmail">Email</label>
                    <input type="email" id="loginEmail" name="email" required>
                </div>
                <div class="form-group">
                    <label for="loginPassword">Password</label>
                    <input type="password" id="loginPassword" name="password" required>
                </div>
                <button type="submit" class="btn btn-primary">Login</button>
                <p class="auth-switch">Don't have an account? <a href="#" class="switch-to-register">Register</a></p>
            </form>
        </div>
    `;

    // Create register modal
    const registerModal = document.createElement('div');
    registerModal.className = 'auth-modal hidden';
    registerModal.innerHTML = `
        <div class="auth-modal-content">
            <div class="auth-modal-header">
                <h3>Register</h3>
                <button class="close-auth-modal">&times;</button>
            </div>
            <form id="registerForm" class="auth-form">
                <div class="form-group">
                    <label for="registerFirstName">First Name</label>
                    <input type="text" id="registerFirstName" name="firstName" required>
                </div>
                <div class="form-group">
                    <label for="registerLastName">Last Name</label>
                    <input type="text" id="registerLastName" name="lastName" required>
                </div>
                <div class="form-group">
                    <label for="registerEmail">Email</label>
                    <input type="email" id="registerEmail" name="email" required>
                </div>
                <div class="form-group">
                    <label for="registerPassword">Password</label>
                    <input type="password" id="registerPassword" name="password" required>
                </div>
                <button type="submit" class="btn btn-primary">Register</button>
                <p class="auth-switch">Already have an account? <a href="#" class="switch-to-login">Login</a></p>
            </form>
        </div>
    `;

    document.body.appendChild(loginModal);
    document.body.appendChild(registerModal);

    // Add auth styles
    const authStyles = document.createElement('style');
    authStyles.textContent = `
        .auth-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2000;
            animation: fadeIn 0.3s ease;
        }
        .auth-modal.hidden {
            display: none;
        }
        .auth-modal-content {
            background: white;
            padding: 2rem;
            border-radius: 10px;
            width: 90%;
            max-width: 400px;
            animation: slideIn 0.3s ease;
        }
        .auth-modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
        }
        .close-auth-modal {
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: #666;
        }
        .auth-form .form-group {
            margin-bottom: 1rem;
        }
        .auth-form label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 500;
        }
        .auth-form input {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid #ddd;
            border-radius: 5px;
        }
        .auth-form button {
            width: 100%;
            margin-top: 1rem;
        }
        .auth-switch {
            text-align: center;
            margin-top: 1rem;
        }
        .auth-switch a {
            color: #2563eb;
            text-decoration: none;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideIn { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    `;
    document.head.appendChild(authStyles);

    // Event listeners
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('close-auth-modal')) {
            hideAllAuthModals();
        }
        if (e.target.classList.contains('switch-to-register')) {
            e.preventDefault();
            showRegisterModal();
        }
        if (e.target.classList.contains('switch-to-login')) {
            e.preventDefault();
            showLoginModal();
        }
    });

    // Form submissions
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
}

async function handleLogin(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const credentials = {
        email: formData.get('email'),
        password: formData.get('password')
    };

    try {
        const response = await api.auth.login(credentials);
        localStorage.setItem('token', response.token);
        currentUser = response.user;
        hideAllAuthModals();
        updateAuthDisplay();
        showNotification('Login successful!', 'success');
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const userData = {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        email: formData.get('email'),
        password: formData.get('password')
    };

    try {
        const response = await api.auth.register(userData);
        showNotification('Registration successful! Please check your email to verify your account.', 'success');
        showLoginModal();
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

async function loadCurrentUser() {
    try {
        const response = await api.auth.getCurrentUser();
        currentUser = response.user;
        updateAuthDisplay();
    } catch (error) {
        localStorage.removeItem('token');
        currentUser = null;
    }
}

function updateAuthDisplay() {
    const authModals = document.querySelectorAll('.auth-modal');
    if (currentUser) {
        authModals.forEach(modal => modal.classList.add('hidden'));
        // Update navigation to show user info
        const navActions = document.querySelector('.nav-actions');
        if (navActions) {
            const userInfo = document.createElement('div');
            userInfo.className = 'user-info';
            userInfo.innerHTML = `
                <span>Welcome, ${currentUser.firstName}</span>
                <button class="logout-btn">Logout</button>
            `;
            navActions.appendChild(userInfo);
        }
    }
}

function showLoginModal() {
    document.querySelectorAll('.auth-modal').forEach(modal => modal.classList.add('hidden'));
    document.querySelector('.auth-modal').classList.remove('hidden');
}

function showRegisterModal() {
    document.querySelectorAll('.auth-modal').forEach(modal => modal.classList.add('hidden'));
    document.querySelectorAll('.auth-modal')[1].classList.remove('hidden');
}

function hideAllAuthModals() {
    document.querySelectorAll('.auth-modal').forEach(modal => modal.classList.add('hidden'));
}

// Product loading functionality
async function loadProducts() {
    try {
        const response = await api.products.getFeatured();
        displayProducts(response.data);
    } catch (error) {
        console.error('Error loading products:', error);
        showNotification('Error loading products', 'error');
    }
}

function displayProducts(products) {
    const productsGrid = document.querySelector('.products-grid');
    if (!productsGrid) return;

    productsGrid.innerHTML = products.map(product => `
        <article class="product-card" data-category="${product.category}">
            <div class="product-image">
                <img src="${product.mainImage?.url || 'public/product1.jpg'}" alt="${product.name}" loading="lazy">
                <div class="product-overlay">
                    <button class="quick-view-btn" data-product-id="${product._id}">Quick View</button>
                </div>
            </div>
            <div class="product-info">
                <h3>${product.name}</h3>
                <p class="product-description">${product.shortDescription || product.description}</p>
                <div class="product-price">
                    <span class="current-price">$${product.price}</span>
                    ${product.originalPrice ? `<span class="original-price">$${product.originalPrice}</span>` : ''}
                </div>
                <button class="add-to-cart-btn" data-product-id="${product._id}" data-product-name="${product.name}" data-product-price="${product.price}">
                    Add to Cart
                </button>
            </div>
        </article>
    `).join('');

    // Add event listeners to new buttons
    addProductEventListeners();
}

function addProductEventListeners() {
    // Add to cart buttons
    document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const productId = this.dataset.productId;
            const productName = this.dataset.productName;
            const productPrice = parseFloat(this.dataset.productPrice);
            
            addToCart(productId, productName, productPrice);
        });
    });

    // Quick view buttons
    document.querySelectorAll('.quick-view-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const productId = this.dataset.productId;
            showProductQuickView(productId);
        });
    });
}

async function showProductQuickView(productId) {
    try {
        const response = await api.products.getById(productId);
        const product = response.data;
        
        // Create quick view modal
        const modal = document.createElement('div');
        modal.className = 'quick-view-modal';
        modal.innerHTML = `
            <div class="quick-view-content">
                <div class="quick-view-header">
                    <h3>${product.name}</h3>
                    <button class="close-quick-view">&times;</button>
                </div>
                <div class="quick-view-body">
                    <div class="quick-view-image">
                        <img src="${product.mainImage?.url || 'public/product1.jpg'}" alt="${product.name}">
                    </div>
                    <div class="quick-view-details">
                        <p class="quick-view-description">${product.description}</p>
                        <div class="quick-view-price">
                            <span class="current-price">$${product.price}</span>
                            ${product.originalPrice ? `<span class="original-price">$${product.originalPrice}</span>` : ''}
                        </div>
                        <div class="quick-view-stock">
                            <span class="stock-status ${product.stockStatus}">${product.stockStatus.replace('-', ' ')}</span>
                        </div>
                        <button class="add-to-cart-btn" data-product-id="${product._id}" data-product-name="${product.name}" data-product-price="${product.price}">
                            Add to Cart
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add styles
        const styles = document.createElement('style');
        styles.textContent = `
            .quick-view-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 2000;
            }
            .quick-view-content {
                background: white;
                border-radius: 10px;
                width: 90%;
                max-width: 800px;
                max-height: 90%;
                overflow-y: auto;
            }
            .quick-view-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 1rem;
                border-bottom: 1px solid #eee;
            }
            .close-quick-view {
                background: none;
                border: none;
                font-size: 1.5rem;
                cursor: pointer;
            }
            .quick-view-body {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 2rem;
                padding: 1rem;
            }
            .quick-view-image img {
                width: 100%;
                height: auto;
                border-radius: 5px;
            }
            .stock-status {
                padding: 0.25rem 0.5rem;
                border-radius: 3px;
                font-size: 0.875rem;
                font-weight: 500;
            }
            .stock-status.in.stock {
                background: #dcfce7;
                color: #166534;
            }
            .stock-status.low.stock {
                background: #fef3c7;
                color: #92400e;
            }
            .stock-status.out.of.stock {
                background: #fee2e2;
                color: #991b1b;
            }
            @media (max-width: 768px) {
                .quick-view-body {
                    grid-template-columns: 1fr;
                }
            }
        `;
        document.head.appendChild(styles);
        
        // Event listeners
        modal.querySelector('.close-quick-view').addEventListener('click', () => {
            document.body.removeChild(modal);
            document.head.removeChild(styles);
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
                document.head.removeChild(styles);
            }
        });
        
        // Add to cart from quick view
        modal.querySelector('.add-to-cart-btn').addEventListener('click', function() {
            const productId = this.dataset.productId;
            const productName = this.dataset.productName;
            const productPrice = parseFloat(this.dataset.productPrice);
            
            addToCart(productId, productName, productPrice);
            document.body.removeChild(modal);
            document.head.removeChild(styles);
        });
        
    } catch (error) {
        console.error('Error loading product details:', error);
        showNotification('Error loading product details', 'error');
    }
}

// Cart functionality
function addToCart(productId, productName, productPrice) {
    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: productId,
            name: productName,
            price: productPrice,
            quantity: 1
        });
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartDisplay();
    showNotification('Product added to cart!', 'success');
}

function updateCartDisplay() {
    const cartCount = document.querySelector('.cart-count');
    if (cartCount) {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCount.textContent = totalItems;
    }
}

// Navigation functionality
function initNavigation() {
    const header = document.querySelector('.header');
    const navLinks = document.querySelectorAll('.nav-link');
    
    // Smooth scrolling for navigation links
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                const headerHeight = header.offsetHeight;
                const targetPosition = targetSection.offsetTop - headerHeight;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Header scroll effect
    window.addEventListener('scroll', function() {
        if (window.scrollY > 100) {
            header.style.background = 'rgba(255, 255, 255, 0.98)';
            header.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.1)';
        } else {
            header.style.background = 'rgba(255, 255, 255, 0.95)';
            header.style.boxShadow = 'none';
        }
    });
}

// Mobile menu functionality
function initMobileMenu() {
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navMenu = document.querySelector('.nav-menu');
    
    if (mobileMenuBtn && navMenu) {
        mobileMenuBtn.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            this.classList.toggle('active');
            
            // Animate hamburger menu
            const spans = this.querySelectorAll('span');
            spans.forEach((span, index) => {
                if (this.classList.contains('active')) {
                    if (index === 0) span.style.transform = 'rotate(45deg) translate(5px, 5px)';
                    if (index === 1) span.style.opacity = '0';
                    if (index === 2) span.style.transform = 'rotate(-45deg) translate(7px, -6px)';
                } else {
                    span.style.transform = 'none';
                    span.style.opacity = '1';
                }
            });
        });
        
        // Close menu when clicking on a link
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                navMenu.classList.remove('active');
                mobileMenuBtn.classList.remove('active');
                const spans = mobileMenuBtn.querySelectorAll('span');
                spans.forEach(span => {
                    span.style.transform = 'none';
                    span.style.opacity = '1';
                });
            });
        });
    }
}

// Product filtering functionality
function initProductFiltering() {
    const categoryBtns = document.querySelectorAll('.category-btn');
    
    categoryBtns.forEach(btn => {
        btn.addEventListener('click', async function() {
            const category = this.getAttribute('data-category');
            
            // Update active button
            categoryBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            try {
                let response;
                if (category === 'all') {
                    response = await api.products.getAll();
                } else {
                    response = await api.products.getByCategory(category);
                }
                
                displayProducts(response.data);
            } catch (error) {
                console.error('Error filtering products:', error);
                showNotification('Error loading products', 'error');
            }
        });
    });
}

// Contact form functionality
function initContactForm() {
    const contactForm = document.getElementById('contactForm');
    
    if (contactForm) {
        contactForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Get form data
            const formData = new FormData(this);
            const data = Object.fromEntries(formData);
            
            // Basic validation
            if (!validateForm(data)) {
                return;
            }
            
            // Show loading state
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Sending...';
            submitBtn.disabled = true;
            
            // Simulate form submission (replace with actual API call)
            setTimeout(() => {
                showNotification('Message sent successfully! We\'ll get back to you soon.', 'success');
                this.reset();
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }, 2000);
        });
    }
}

// Newsletter form functionality
function initNewsletterForm() {
    const newsletterForm = document.querySelector('.newsletter-form');
    
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const email = this.querySelector('input[type="email"]').value;
            
            if (!isValidEmail(email)) {
                showNotification('Please enter a valid email address.', 'error');
                return;
            }
            
            // Show loading state
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Subscribing...';
            submitBtn.disabled = true;
            
            // Simulate subscription
            setTimeout(() => {
                showNotification('Successfully subscribed to our newsletter!', 'success');
                this.reset();
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }, 1500);
        });
    }
}

// Back to top functionality
function initBackToTop() {
    const backToTopBtn = document.querySelector('.back-to-top');
    
    if (backToTopBtn) {
        window.addEventListener('scroll', function() {
            if (window.scrollY > 300) {
                backToTopBtn.classList.add('show');
            } else {
                backToTopBtn.classList.remove('show');
            }
        });
        
        backToTopBtn.addEventListener('click', function() {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
}

// Animations functionality
function initAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in-up');
            }
        });
    }, observerOptions);
    
    // Observe elements for animation
    const animateElements = document.querySelectorAll('.feature-card, .product-card, .service-card, .testimonial-card');
    animateElements.forEach(el => {
        observer.observe(el);
    });
}

// Search functionality
function initSearch() {
    const searchBtn = document.querySelector('.search-btn');
    
    if (searchBtn) {
        searchBtn.addEventListener('click', async function() {
            const searchQuery = prompt('Enter search term:');
            if (searchQuery) {
                try {
                    const response = await api.products.search(searchQuery);
                    displayProducts(response.data);
                    showNotification(`Found ${response.data.length} products for "${searchQuery}"`, 'info');
                } catch (error) {
                    console.error('Search error:', error);
                    showNotification('Error performing search', 'error');
                }
            }
        });
    }
}

// Cart functionality
function initCart() {
    const cartBtn = document.querySelector('.cart-btn');
    
    if (cartBtn) {
        cartBtn.addEventListener('click', function() {
            if (cart.length > 0) {
                showCartModal();
            } else {
                showNotification('Your cart is empty', 'info');
            }
        });
    }
}

function showCartModal() {
    const modal = document.createElement('div');
    modal.className = 'cart-modal';
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    modal.innerHTML = `
        <div class="cart-modal-content">
            <div class="cart-modal-header">
                <h3>Shopping Cart</h3>
                <button class="close-cart-modal">&times;</button>
            </div>
            <div class="cart-items">
                ${cart.map(item => `
                    <div class="cart-item">
                        <div class="cart-item-info">
                            <h4>${item.name}</h4>
                            <p>$${item.price} x ${item.quantity}</p>
                        </div>
                        <div class="cart-item-actions">
                            <button class="update-quantity" data-id="${item.id}" data-action="decrease">-</button>
                            <span>${item.quantity}</span>
                            <button class="update-quantity" data-id="${item.id}" data-action="increase">+</button>
                            <button class="remove-item" data-id="${item.id}">&times;</button>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="cart-total">
                <h4>Total: $${total.toFixed(2)}</h4>
            </div>
            <div class="cart-actions">
                <button class="btn btn-secondary clear-cart">Clear Cart</button>
            </div>
            <div class="checkout-section">
                <h3>Checkout</h3>
                <label>
                    <input type="radio" name="checkoutMethod" value="pickup" checked> Pick Up
                </label>
                <label>
                    <input type="radio" name="checkoutMethod" value="delivery"> Delivery
                </label>
                <div id="deliveryAddressGroup" style="display:none;">
                    <input type="text" id="deliveryAddress" placeholder="Enter delivery address">
                </div>
                <button id="checkoutBtn" class="btn btn-primary">Checkout</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add styles
    const styles = document.createElement('style');
    styles.textContent = `
        .cart-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2000;
        }
        .cart-modal-content {
            background: white;
            border-radius: 10px;
            width: 90%;
            max-width: 600px;
            max-height: 90%;
            overflow-y: auto;
        }
        .cart-modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1rem;
            border-bottom: 1px solid #eee;
        }
        .close-cart-modal {
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
        }
        .cart-items {
            padding: 1rem;
        }
        .cart-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.5rem 0;
            border-bottom: 1px solid #eee;
        }
        .cart-item-actions {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        .update-quantity, .remove-item {
            background: none;
            border: 1px solid #ddd;
            padding: 0.25rem 0.5rem;
            cursor: pointer;
            border-radius: 3px;
        }
        .cart-total {
            padding: 1rem;
            border-top: 1px solid #eee;
        }
        .cart-actions {
            padding: 1rem;
            display: flex;
            gap: 1rem;
        }
    `;
    document.head.appendChild(styles);
    
    // Event listeners
    modal.querySelector('.close-cart-modal').addEventListener('click', () => {
        document.body.removeChild(modal);
        document.head.removeChild(styles);
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
            document.head.removeChild(styles);
        }
    });
    
    // Cart item actions
    modal.querySelectorAll('.update-quantity').forEach(btn => {
        btn.addEventListener('click', function() {
            const itemId = this.dataset.id;
            const action = this.dataset.action;
            updateCartItemQuantity(itemId, action);
            document.body.removeChild(modal);
            document.head.removeChild(styles);
            showCartModal(); // Refresh modal
        });
    });
    
    modal.querySelectorAll('.remove-item').forEach(btn => {
        btn.addEventListener('click', function() {
            const itemId = this.dataset.id;
            removeFromCart(itemId);
            document.body.removeChild(modal);
            document.head.removeChild(styles);
            showCartModal(); // Refresh modal
        });
    });
    
    modal.querySelector('.clear-cart').addEventListener('click', () => {
        clearCart();
        document.body.removeChild(modal);
        document.head.removeChild(styles);
    });
    
    // Checkout logic inside cart modal
    modal.querySelectorAll('input[name="checkoutMethod"]').forEach(radio => {
        radio.addEventListener('change', function() {
            modal.querySelector('#deliveryAddressGroup').style.display =
                this.value === 'delivery' ? 'block' : 'none';
        });
    });
    modal.querySelector('#checkoutBtn').addEventListener('click', async function() {
        const method = modal.querySelector('input[name="checkoutMethod"]:checked').value;
        const address = method === 'delivery' ? modal.querySelector('#deliveryAddress').value : undefined;
        const cartData = JSON.parse(localStorage.getItem('cart')) || [];
        if (cartData.length === 0) {
            showNotification('Your cart is empty.', 'error');
            return;
        }
        if (method === 'delivery' && !address) {
            showNotification('Please enter a delivery address.', 'error');
            return;
        }
        const token = localStorage.getItem('token');
        if (!token) {
            showNotification('You must be logged in to checkout.', 'error');
            return;
        }
        try {
            const response = await fetch('http://localhost:5000/api/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({ method, address, cart: cartData })
            });
            const data = await response.json();
            if (data.success) {
                showNotification(data.message, 'success');
                localStorage.removeItem('cart');
                updateCartDisplay();
                document.body.removeChild(modal);
                document.head.removeChild(styles);
            } else {
                showNotification(data.message, 'error');
            }
        } catch (err) {
            showNotification('Checkout failed. Please try again.', 'error');
        }
    });
}

function updateCartItemQuantity(itemId, action) {
    const item = cart.find(item => item.id === itemId);
    if (item) {
        if (action === 'increase') {
            item.quantity += 1;
        } else if (action === 'decrease') {
            item.quantity -= 1;
            if (item.quantity <= 0) {
                removeFromCart(itemId);
                return;
            }
        }
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartDisplay();
    }
}

function removeFromCart(itemId) {
    cart = cart.filter(item => item.id !== itemId);
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartDisplay();
}

function clearCart() {
    cart = [];
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartDisplay();
    showNotification('Cart cleared', 'success');
}

// Testimonials slider functionality
function initTestimonialsSlider() {
    const testimonials = document.querySelectorAll('.testimonial-card');
    let currentIndex = 0;
    
    if (testimonials.length > 0) {
        // Auto-rotate testimonials
        setInterval(() => {
            testimonials.forEach((testimonial, index) => {
                testimonial.style.opacity = index === currentIndex ? '1' : '0.5';
                testimonial.style.transform = index === currentIndex ? 'scale(1)' : 'scale(0.95)';
            });
            
            currentIndex = (currentIndex + 1) % testimonials.length;
        }, 5000);
    }
}

// Utility functions
function validateForm(data) {
    const requiredFields = ['name', 'email', 'subject', 'message'];
    
    for (let field of requiredFields) {
        if (!data[field] || data[field].trim() === '') {
            showNotification(`Please fill in the ${field} field.`, 'error');
            return false;
        }
    }
    
    if (!isValidEmail(data.email)) {
        showNotification('Please enter a valid email address.', 'error');
        return false;
    }
    
    return true;
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => {
        document.body.removeChild(notification);
    });
    
    // Create notification
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-message">${message}</span>
            <button class="notification-close">&times;</button>
        </div>
    `;
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .notification {
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 3000;
            animation: slideInRight 0.3s ease;
            max-width: 400px;
        }
        .notification-success { border-left: 4px solid #10b981; }
        .notification-error { border-left: 4px solid #ef4444; }
        .notification-info { border-left: 4px solid #3b82f6; }
        .notification-warning { border-left: 4px solid #f59e0b; }
        .notification-content {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 1rem;
        }
        .notification-close {
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: #666;
            margin-left: 1rem;
        }
        @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (document.body.contains(notification)) {
            document.body.removeChild(notification);
            document.head.removeChild(style);
        }
    }, 5000);
    
    // Close button functionality
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        document.body.removeChild(notification);
        document.head.removeChild(style);
    });
}

// Performance optimization
window.addEventListener('load', function() {
    // Lazy load images
    const images = document.querySelectorAll('img[loading="lazy"]');
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.src; // Trigger load
                observer.unobserve(img);
            }
        });
    });
    
    images.forEach(img => imageObserver.observe(img));
    
    // Handle missing images gracefully
    document.addEventListener('error', function(e) {
        if (e.target.tagName === 'IMG') {
            e.target.style.display = 'none';
            console.warn('Image failed to load:', e.target.src);
        }
    }, true);
});

// Error handling
window.addEventListener('error', function(e) {
    console.error('JavaScript error:', e.error);
});

// API error handling for connection issues
window.addEventListener('unhandledrejection', function(event) {
    if (event.reason && event.reason.message && event.reason.message.includes('Failed to fetch')) {
        console.warn('API connection failed - server may not be running');
        showNotification('Unable to connect to server. Please check if the backend is running.', 'warning');
    }
});

// === User: View My Orders ===
function showMyOrdersModal() {
    const modal = document.createElement('div');
    modal.className = 'my-orders-modal';
    modal.innerHTML = `
        <div class="my-orders-content">
            <div class="my-orders-header">
                <h3>My Orders</h3>
                <button class="close-my-orders">&times;</button>
            </div>
            <div class="my-orders-list">Loading orders...</div>
        </div>
    `;
    document.body.appendChild(modal);
    const styles = document.createElement('style');
    styles.textContent = `
        .my-orders-modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 3000; }
        .my-orders-content { background: #fff; border-radius: 10px; width: 95%; max-width: 700px; max-height: 90%; overflow-y: auto; padding: 1.5rem; }
        .my-orders-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; margin-bottom: 1rem; }
        .close-my-orders { background: none; border: none; font-size: 1.5rem; cursor: pointer; }
        .my-orders-list { margin-top: 1rem; }
        .my-order { border: 1px solid #e5e7eb; border-radius: 6px; padding: 1rem; margin-bottom: 1rem; background: #f9fafb; }
        .my-order .order-status { font-weight: 600; }
    `;
    document.head.appendChild(styles);
    // Close modal
    modal.querySelector('.close-my-orders').addEventListener('click', () => {
        document.body.removeChild(modal);
        document.head.removeChild(styles);
    });
    // Fetch and render orders
    fetch('http://localhost:5000/api/my-orders')
        .then(res => res.json())
        .then(data => {
            if (!data.success) {
                modal.querySelector('.my-orders-list').innerHTML = '<p>Failed to load orders.</p>';
                return;
            }
            if (data.orders.length === 0) {
                modal.querySelector('.my-orders-list').innerHTML = '<p>No orders found.</p>';
                return;
            }
            modal.querySelector('.my-orders-list').innerHTML = data.orders.map(order => `
                <div class="my-order">
                    <div><b>Order ID:</b> ${order.id}</div>
                    <div><b>Method:</b> ${order.method}</div>
                    <div><b>Address:</b> ${order.address || '-'}</div>
                    <div><b>Status:</b> <span class="order-status">${order.status}</span></div>
                    <div><b>Created:</b> ${new Date(order.createdAt).toLocaleString()}</div>
                    <div><b>Cart:</b> ${order.cart.map(item => `${item.name} x${item.quantity}`).join(', ')}</div>
                    ${order.adminMessage ? `<div><b>Admin Message:</b> <span style='color:#2563eb'>${order.adminMessage}</span></div>` : ''}
                </div>
            `).join('');
        });
}
// Add a button for demo
if (!document.getElementById('myOrdersBtn')) {
    document.addEventListener('DOMContentLoaded', function() {
        const myOrdersBtn = document.createElement('button');
        myOrdersBtn.textContent = 'View My Orders';
        myOrdersBtn.id = 'myOrdersBtn';
        myOrdersBtn.className = 'btn btn-primary';
        myOrdersBtn.style.position = 'fixed';
        myOrdersBtn.style.bottom = '30px';
        myOrdersBtn.style.left = '30px';
        myOrdersBtn.style.zIndex = 4000;
        myOrdersBtn.onclick = showMyOrdersModal;
        document.body.appendChild(myOrdersBtn);
    });
} 