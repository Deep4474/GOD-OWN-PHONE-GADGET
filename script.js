// ONGOD Gadget Shop JavaScript - Backend Integration

// API Configuration
const API_BASE_URL = window.location.origin;
const API_ENDPOINTS = {
  LOGIN: '/api/auth/login',
  REGISTER: '/api/auth/register',
  VERIFY: '/api/auth/verify',
  LOGOUT: '/api/auth/logout',
  PRODUCTS: '/api/products',
  ORDERS: '/api/orders',
  USER_ORDERS: '/api/orders/user',
  CREATE_ORDER: '/api/orders/create',
  NOTIFICATIONS: '/api/notifications',
  MARK_READ: '/api/notifications/:id/read',
  UNREAD_COUNT: '/api/notifications/unread-count',
  PROFILE: '/user/profile',
  UPDATE_PROFILE: '/user/profile/update',
  LOCATION: '/location',
  ADDRESS_VERIFY: '/location/verify',
  ADMIN_LOGIN: '/api/admin/login'
};


// Global state
let currentUser = null;
let selectedProduct = null;
let products = [];
let orders = [];
let notifications = [];
let unreadNotifications = 0;
let authToken = localStorage.getItem('authToken');

// API Helper Functions
class API {
  static async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        ...(authToken && { 'Authorization': `Bearer ${authToken}` })
      }
    };
    
    const config = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers
      }
    };
    
    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        let message = `HTTP error! status: ${response.status}`;
        if (errorData.errors && Array.isArray(errorData.errors) && errorData.errors.length > 0) {
          message = errorData.errors.map(e => e.msg).join(', ');
        } else if (errorData.error) {
          message = errorData.error;
        } else if (errorData.message) {
          message = errorData.message;
        }
        
        const error = new Error(message);
        error.data = errorData;
        throw error;
      }
      
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }
  
  static get(endpoint) {
    return this.request(endpoint);
  }
  
  static post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
  
  static put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }
  
  static delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE'
    });
  }
}

// Authentication Functions
async function loginUser() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  if (!email || !password) {
    showMessage('Please enter email and password', 'error');
    return;
  }

  try {
    showLoading('Logging in...');
    
    const response = await API.post(API_ENDPOINTS.LOGIN, { email, password });
    
    if (response.user && response.token) {
      authToken = response.token;
      currentUser = response.user;
      
      if (!currentUser.isVerified) {
        showMessage('Please verify your email before accessing the shop.', 'warning');
        document.getElementById('verify-email').value = currentUser.email;
        showVerify();
        return;
      }
      
      localStorage.setItem('authToken', authToken);
      localStorage.setItem('userData', JSON.stringify(currentUser));
      
      showMessage('Login successful! Welcome back.', 'success');
      showProducts();
      updateUserInfo();
      
      await Promise.all([
        loadProducts(),
        loadUserOrders(),
        loadNotifications(),
        startNotificationPolling()
      ]);
    } else {
      showMessage(response.message || 'Login failed', 'error');
    }
  } catch (error) {
    showMessage(error.message || 'Login failed. Please try again.', 'error');
  } finally {
    hideLoading();
  }
}

async function registerUser() {
  const formData = {
    name: document.getElementById('name').value.trim(),
    email: document.getElementById('email').value.trim(),
    password: document.getElementById('password').value,
    phone: document.getElementById('phone').value.trim(),
    address: document.getElementById('address').value.trim()
  };

  if (!Object.values(formData).every(value => value)) {
    showMessage('Please fill in all fields', 'error');
    return;
  }

  if (formData.password.length < 6) {
    showMessage('Password must be at least 6 characters long', 'error');
    return;
  }

  try {
    showLoading('Creating account...');
    const response = await API.post(API_ENDPOINTS.REGISTER, formData);
    // Success if user and token are present
    if (response.user && response.token) {
      showMessage('Registration successful! Please check your email for verification.', 'success');
      document.getElementById('verify-email').value = formData.email;
      showVerify();
    } else {
      // Handle unexpected response
      showMessage(response.message || 'Registration failed', 'error');
    }
  } catch (error) {
    showMessage(error.message || 'Registration failed. Please try again.', 'error');
  } finally {
    hideLoading();
  }
}

async function verifyEmail() {
  const email = document.getElementById('verify-email').value.trim();
  const code = document.getElementById('verification-code').value.trim();

  if (!email || !code) {
    showMessage('Please enter email and verification code', 'error');
    return;
  }

  try {
    showLoading('Verifying email...');
    
    const response = await API.post(API_ENDPOINTS.VERIFY, { email, code });
    
    if (response.success) {
      authToken = response.token;
      currentUser = response.user;
      
      localStorage.setItem('authToken', authToken);
      localStorage.setItem('userData', JSON.stringify(currentUser));
      
      showMessage('Email verified successfully! Welcome to ONGOD Gadget Shop.', 'success');
      showProducts();
      updateUserInfo();
      
      await Promise.all([
        loadProducts(),
        loadUserOrders(),
        loadNotifications(),
        startNotificationPolling()
      ]);
    } else {
      showMessage(response.message || 'Verification failed', 'error');
    }
  } catch (error) {
    showMessage(error.message || 'Verification failed. Please try again.', 'error');
  } finally {
    hideLoading();
  }
}

async function logoutUser() {
  try {
    await API.post(API_ENDPOINTS.LOGOUT);
  } catch (error) {
    console.error('Logout error:', error);
  }
  
  currentUser = null;
  authToken = null;
  products = [];
  orders = [];
  notifications = [];
  unreadNotifications = 0;
  
  localStorage.removeItem('authToken');
  localStorage.removeItem('userData');
  
  stopNotificationPolling();
  
  document.getElementById('login-email').value = '';
  document.getElementById('login-password').value = '';
  
  showLogin();
  updateUserInfo();
  showMessage('Logged out successfully', 'success');
}

// Product Functions
async function loadProducts() {
  try {
    const response = await API.get(API_ENDPOINTS.PRODUCTS);
    products = response.products || [];
    displayProducts();
  } catch (error) {
    console.error('Failed to load products:', error);
    showMessage('Failed to load products', 'error');
  }
}

function displayProducts() {
  const productList = document.getElementById('product-list');
  if (!productList) return;

  if (products.length === 0) {
    productList.innerHTML = '<p style="text-align: center; grid-column: 1/-1;">No products available</p>';
    return;
  }

  productList.innerHTML = products.map(product => {
    const imgUrl = (product.images && product.images.length) ? product.images[0] : 'https://via.placeholder.com/220x160/ccc/666?text=No+Image';
    return `
      <div class="product-card" data-id="${product._id}">
        <img src="${imgUrl}" alt="${product.name}">
        <h4>${product.name}</h4>
        <p class="description">${product.description}</p>
        <p class="category">${product.category}</p>
        <p class="price">₦${product.price.toLocaleString()}</p>
        <button class="buy-now-btn" data-product-id="${product._id}">Buy Now</button>
      </div>
    `;
  }).join('');
}

function filterProducts() {
  const searchInput = document.getElementById('search-input').value.toLowerCase();
  const categoryFilter = document.getElementById('category-filter').value;

  const filteredProducts = products.filter(product => {
    const nameMatch = product.name.toLowerCase().includes(searchInput);
    const categoryMatch = categoryFilter === '' || product.category === categoryFilter;
    return nameMatch && categoryMatch;
  });

  const productList = document.getElementById('product-list');
  if (!productList) return;

  if (filteredProducts.length === 0) {
    productList.innerHTML = '<p style="text-align: center; grid-column: 1/-1;">No products found</p>';
    return;
  }

  productList.innerHTML = filteredProducts.map(product => {
    const imgUrl = (product.images && product.images.length) ? product.images[0] : 'https://via.placeholder.com/220x160/ccc/666?text=No+Image';
    return `
      <div class="product-card" data-id="${product._id}">
        <img src="${imgUrl}" alt="${product.name}">
        <h4>${product.name}</h4>
        <p class="description">${product.description}</p>
        <p class="category">${product.category}</p>
        <p class="price">₦${product.price.toLocaleString()}</p>
        <button class="buy-now-btn" data-product-id="${product._id}">Buy Now</button>
      </div>
    `;
  }).join('');
}

function selectProduct(productId) {
  selectedProduct = products.find(p => p._id === productId);
  
  if (!selectedProduct) {
    showMessage('Product not found', 'error');
    return;
  }
  
  document.getElementById('selected-product-name').textContent = selectedProduct.name;
  document.getElementById('selected-product-price').textContent = `₦${selectedProduct.price.toLocaleString()}`;
  
  updateTotal();
  showBuy();
}

// Order Functions
async function loadUserOrders() {
  if (!currentUser) return;
  
  try {
    const response = await API.get(API_ENDPOINTS.USER_ORDERS);
    orders = response.orders || [];
  } catch (error) {
    console.error('Failed to load orders:', error);
  }
}

async function placeOrder() {
  const quantityInput = document.getElementById('quantity');
  const buyOptionSelect = document.getElementById('buy-option');
  const paymentMethodSelect = document.getElementById('payment-method');

  if (!selectedProduct || !currentUser || !quantityInput || !buyOptionSelect || !paymentMethodSelect) {
    showMessage('An error occurred. Please try again.', 'error');
    console.error('Missing required elements or data for placing an order.');
    return;
  }

  const orderData = {
    userId: currentUser._id,
    productId: selectedProduct._id,
    quantity: parseInt(quantityInput.value, 10),
    deliveryOption: buyOptionSelect.value,
    paymentMethod: paymentMethodSelect.value,
    deliveryAddress: currentUser.address,
    totalAmount: calculateTotal(parseInt(quantityInput.value, 10), buyOptionSelect.value)
  };

  if (!orderData.deliveryOption || !orderData.paymentMethod) {
    showMessage('Please select both delivery option and payment method', 'error');
    return;
  }
  
  try {
    showLoading('Placing order...');
    
    const response = await API.post(API_ENDPOINTS.CREATE_ORDER, orderData);
    
    if (response.success) {
      showMessage('Order placed successfully! Admin will review and update you.', 'success');
      
      const order = response.order;
      let message = `Order Details:\n\n`;
      message += `Order ID: ${order._id}\n`;
      message += `Product: ${selectedProduct.name}\n`;
      message += `Quantity: ${quantityInput.value}\n`;
      message += `Total: ₦${order.totalAmount.toLocaleString()}\n`;
      message += `Status: ${order.status}\n`;
      message += `Date: ${new Date(order.createdAt).toLocaleString()}\n\n`;
      
      if (paymentMethodSelect.value === 'transfer') {
        message += `Please transfer ₦${order.totalAmount.toLocaleString()} to:\n`;
        message += `Account: ONGOD GADGETS\n`;
        message += `Account No: 1234567890\n`;
        message += `Bank: Zenith Bank\n\n`;
      }
      
      message += `You will receive notifications when admin updates your order.`;
      
      alert(message);
      
      resetBuyForm();
      await loadUserOrders();
      showProducts();
    } else {
      showMessage(response.message || 'Failed to place order', 'error');
    }
  } catch (error) {
    showMessage(error.message || 'Failed to place order. Please try again.', 'error');
  } finally {
    hideLoading();
  }
}

function calculateTotal(quantity, buyOption) {
  if (!selectedProduct || !selectedProduct.price) return 0;
  
  const basePrice = selectedProduct.price * quantity;
  let deliveryFee = 0;
  
  if (buyOption === 'Delivery') {
    // Delivery is 5% of base price
    deliveryFee = basePrice * 0.05; 
  } else if (buyOption === 'Pick Up') { // Changed from 'Pick'
    // Pick up is 2% of base price
    deliveryFee = basePrice * 0.02;
  }
  
  return basePrice + deliveryFee;
}

function updateTotal() {
  if (!selectedProduct) return;
  const quantity = parseInt(document.getElementById('quantity').value) || 1;
  const totalPrice = quantity * selectedProduct.price;
  document.getElementById('total-price').textContent = `₦${totalPrice.toLocaleString()}`;
}

function displayOrders() {
  const ordersList = document.getElementById('orders-list');
  if (!ordersList) return;
  
  if (orders.length === 0) {
    ordersList.innerHTML = '<p style="text-align: center;">No orders found</p>';
    return;
  }
  
  ordersList.innerHTML = orders.map(order => `
    <div class="order-item">
      <h4>${order.productName}</h4>
      <p><strong>Order ID:</strong> ${order._id}</p>
      <p><strong>Quantity:</strong> ${order.quantity}</p>
      <p><strong>Total:</strong> ₦${order.totalAmount.toLocaleString()}</p>
      <p><strong>Status:</strong> <span class="status-${order.status}">${order.status}</span></p>
      <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleString()}</p>
      ${order.adminMessage ? `<p><strong>Admin Message:</strong> ${order.adminMessage}</p>` : ''}
    </div>
  `).join('');
}

// Notification Functions
let notificationInterval;

async function loadNotifications() {
  if (!currentUser) return;
  
  try {
    const response = await API.get(API_ENDPOINTS.NOTIFICATIONS);
    notifications = response.notifications || [];
    
    const unreadResponse = await API.get(API_ENDPOINTS.UNREAD_COUNT);
    unreadNotifications = unreadResponse.count || 0;
    
    updateNotificationBadge();
  } catch (error) {
    console.error('Failed to load notifications:', error);
  }
}

function updateNotificationBadge() {
  const notificationBtn = document.getElementById('notification-btn');
  if (!notificationBtn) return;
  
  let badge = notificationBtn.querySelector('.notification-badge');
  
  if (unreadNotifications > 0) {
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'notification-badge';
      badge.style.cssText = `
        position: absolute;
        top: -5px;
        right: -5px;
        background: #e74c3c;
        color: white;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: bold;
      `;
      notificationBtn.appendChild(badge);
    }
    badge.textContent = unreadNotifications;
  } else if (badge) {
    badge.remove();
  }
}

function startNotificationPolling() {
  stopNotificationPolling(); // Clear any existing interval
  notificationInterval = setInterval(async () => {
    if (authToken) {
      try {
        await loadNotifications();
      } catch (error) {
        console.error('Polling error:', error);
        // Optional: stop polling if there's a persistent error
        if (error.data && (error.data.status === 401 || error.data.status === 403)) {
          stopNotificationPolling();
        }
      }
    }
  }, 15000); // Poll every 15 seconds
}

function stopNotificationPolling() {
  if (notificationInterval) {
    clearInterval(notificationInterval);
  }
}

// Location Functions
async function getCurrentLocation() {
  if (navigator.geolocation) {
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });
      
      const location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
      
      const response = await API.post(API_ENDPOINTS.LOCATION, location);
      
      if (response.address) {
        document.getElementById('delivery-state').value = response.address.state || '';
        document.getElementById('delivery-area').value = response.address.area || '';
        document.getElementById('delivery-street').value = response.address.street || '';
        document.getElementById('delivery-address').value = response.address.fullAddress || '';
        
        showMessage('Current location obtained successfully', 'success');
      }
    } catch (error) {
      showMessage('Unable to get current location', 'error');
    }
  } else {
    showMessage('Geolocation is not supported by this browser', 'error');
  }
}

// UI Functions
function showLoading(message = 'Loading...') {
  const loadingDiv = document.getElementById('loading-overlay') || createLoadingOverlay();
  loadingDiv.querySelector('.loading-message').textContent = message;
  loadingDiv.style.display = 'flex';
}

function hideLoading() {
  const loadingDiv = document.getElementById('loading-overlay');
  if (loadingDiv) {
    loadingDiv.style.display = 'none';
  }
}

function createLoadingOverlay() {
  const overlay = document.createElement('div');
  overlay.id = 'loading-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: none;
    justify-content: center;
    align-items: center;
    z-index: 10000;
  `;
  
  overlay.innerHTML = `
    <div style="background: white; padding: 20px; border-radius: 8px; text-align: center;">
      <div class="spinner"></div>
      <p class="loading-message">Loading...</p>
    </div>
  `;
  
  document.body.appendChild(overlay);
  return overlay;
}

// Navigation functions
function showLogin() {
  hideAllSections();
  document.getElementById('login-section').classList.remove('hidden');
  document.getElementById('user-info').classList.add('hidden');
}

function showRegister() {
  hideAllSections();
  document.getElementById('register-section').classList.remove('hidden');
  document.getElementById('user-info').classList.add('hidden');
}

function showVerify() {
  hideAllSections();
  document.getElementById('verify-section').classList.remove('hidden');
  document.getElementById('user-info').classList.add('hidden');
}

function showProducts() {
  hideAllSections();
  document.getElementById('products-section').classList.remove('hidden');
  displayProducts();
}

async function showOrders() {
  if (!currentUser) return;
  hideAllSections();
  document.getElementById('orders-section').classList.remove('hidden');
  displayOrders();
}

function showBuy() {
  hideAllSections();
  document.getElementById('buy-section').classList.remove('hidden');
}

function showMap() {
  const buyOption = document.getElementById('buy-option').value;
  const mapContainer = document.getElementById('map-container');
  if (buyOption === 'Delivery' || buyOption === 'Pick') {
    mapContainer.classList.remove('hidden');
    initializeMap();
  } else {
    mapContainer.classList.add('hidden');
  }
}

function hideAllSections() {
  document.querySelectorAll('main > section').forEach(section => {
    section.classList.add('hidden');
  });
}

function updateUserInfo() {
  const userInfo = document.getElementById('user-info');
  const welcome = document.getElementById('welcome');
  if (currentUser && userInfo && welcome) {
    userInfo.classList.remove('hidden');
    welcome.textContent = `Welcome, ${currentUser.name || currentUser.email}`;
  } else if (userInfo && welcome) {
    userInfo.classList.add('hidden');
    welcome.textContent = '';
  }
  updateHeaderActions();
}

function showUserMapModal(address) {
  // Simple alert for now, can be replaced by a modal library
  alert(`Map for address: ${address}`);
}

function resetBuyForm() {
  const buyForm = document.getElementById('buy-form');
  if (buyForm) {
    buyForm.reset();
  }
  // Also manually reset elements that .reset() might not affect
  document.getElementById('total-price').textContent = '₦0';
  document.getElementById('map-container').classList.add('hidden');
  selectedProduct = null;
}

// Utility functions
function showMessage(message, type = 'info') {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message message-${type}`;
  messageDiv.textContent = message;
  messageDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 4px;
    color: white;
    font-weight: bold;
    z-index: 10000;
    animation: slideIn 0.3s ease;
  `;
  
  switch (type) {
    case 'success':
      messageDiv.style.backgroundColor = '#28a745';
      break;
    case 'error':
      messageDiv.style.backgroundColor = '#dc3545';
      break;
    case 'warning':
      messageDiv.style.backgroundColor = '#ffc107';
      messageDiv.style.color = '#000';
      break;
    default:
      messageDiv.style.backgroundColor = '#17a2b8';
  }
  
  document.body.appendChild(messageDiv);
  
  setTimeout(() => {
    messageDiv.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.parentNode.removeChild(messageDiv);
      }
    }, 300);
  }, 3000);
}

function togglePasswordVisibility() {
  const passwordInput = document.getElementById('login-password');
  const toggleBtn = document.getElementById('toggle-login-password');
  
  if (passwordInput.type === 'password') {
    passwordInput.type = 'text';
    toggleBtn.textContent = '🙈';
  } else {
    passwordInput.type = 'password';
    toggleBtn.textContent = '👁️';
  }
}

// Map and location functions
function initializeMap() {
  const mapContainer = document.getElementById('map');
  const addressDisplay = document.getElementById('current-address');

  if (currentUser && currentUser.address) {
    const address = currentUser.address;
    addressDisplay.textContent = address;

    const mapSrc = `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`;
    mapContainer.innerHTML = `<iframe style="width:100%; height:100%; border:0;" src="${mapSrc}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
  } else {
    addressDisplay.textContent = 'No address provided with your account.';
    mapContainer.innerHTML = '<div style="text-align:center; padding: 5rem 1rem; color: #6b7280;">Please provide an address in your profile to see the map.</div>';
  }
}

function useRegisteredAddress() {
  if (!currentUser) {
    showMessage('Please login first', 'error');
    return;
  }
  
  document.getElementById('delivery-state').value = currentUser.state;
  document.getElementById('delivery-area').value = currentUser.area;
  document.getElementById('delivery-street').value = currentUser.street;
  document.getElementById('delivery-address').value = currentUser.address;
  
  showMessage('Using registered address', 'success');
}

function searchLocation() {
  const searchTerm = document.getElementById('map-search').value.trim();
  
  if (!searchTerm) {
    showMessage('Please enter a search term', 'error');
    return;
  }
  
  showMessage(`Searching for: ${searchTerm}`, 'success');
}

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
  initializeApp();
  setupEventListeners();
});

function initializeApp() {
  checkRegistrationFormElements();
  const savedUser = localStorage.getItem('userData');
  const savedToken = localStorage.getItem('authToken');
  
  if (savedUser && savedToken) {
    currentUser = JSON.parse(savedUser);
    authToken = savedToken;
    showProducts();
    updateUserInfo();
    
    Promise.all([
      loadProducts(),
      loadUserOrders(),
      loadNotifications(),
      startNotificationPolling()
    ]).catch(console.error);
  }
}

function setupEventListeners() {
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', (event) => {
      event.preventDefault();
      loginUser();
    });
  }

  const registerBtn = document.getElementById('register-btn');
  if (registerBtn) {
    registerBtn.addEventListener('click', registerUser);
  }

  const buyOption = document.getElementById('buy-option');
  if (buyOption) {
    buyOption.addEventListener('change', showMap);
  }

  const quantityInput = document.getElementById('quantity');
  if (quantityInput) {
    quantityInput.addEventListener('change', updateTotal);
  }

  const productList = document.getElementById('product-list');
  if (productList) {
    productList.addEventListener('click', (event) => {
      if (event.target && event.target.classList.contains('buy-now-btn')) {
        const productId = event.target.dataset.productId;
        selectProduct(productId);
      }
    });
  }

  const toggleLoginPassword = document.getElementById('toggle-login-password');
  if(toggleLoginPassword) {
    toggleLoginPassword.addEventListener('click', togglePasswordVisibility);
  }

  document.getElementById('show-register-link')?.addEventListener('click', showRegister);
  document.getElementById('show-login-link')?.addEventListener('click', showLogin);
  document.getElementById('show-login-link-2')?.addEventListener('click', showLogin);
  
  document.getElementById('verify-btn')?.addEventListener('click', verifyEmail);
  
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (currentUser) {
        logoutUser();
      } else {
        showMessage('You are not logged in.', 'error');
      }
    });
  }

  const ordersBtn = document.getElementById('orders-btn');
  if (ordersBtn) {
    ordersBtn.addEventListener('click', () => {
      if (currentUser) {
        showOrders();
      } else {
        showMessage('Please log in to view your orders.', 'error');
      }
    });
  }
  
  document.getElementById('back-to-products-btn')?.addEventListener('click', showProducts);
  
  document.getElementById('search-input')?.addEventListener('input', filterProducts);
  document.getElementById('category-filter')?.addEventListener('change', filterProducts);
  
  document.getElementById('use-current-location-btn')?.addEventListener('click', getCurrentLocation);
  document.getElementById('use-registered-address-btn')?.addEventListener('click', useRegisteredAddress);
  document.getElementById('search-location-btn')?.addEventListener('click', searchLocation);
  
  document.getElementById('place-order-btn')?.addEventListener('click', placeOrder);
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
  
  .status-pending { color: #ffc107; font-weight: bold; }
  .status-confirmed { color: #28a745; font-weight: bold; }
  .status-rejected { color: #dc3545; font-weight: bold; }
  .status-delivered { color: #17a2b8; font-weight: bold; }
  .status-processing { color: #fd7e14; font-weight: bold; }
  
  .spinner {
    display: inline-block;
    width: 20px;
    height: 20px;
    border: 2px solid #f3f3f3;
    border-top: 2px solid #3498db;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 10px;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);

function checkRegistrationFormElements() {
  const requiredIds = ['name', 'email', 'password', 'phone', 'address', 'register-btn'];
  let allPresent = true;
  requiredIds.forEach(id => {
    if (!document.getElementById(id)) {
      console.warn(`Warning: Registration form element with id '${id}' is missing from the HTML.`);
      allPresent = false;
    }
  });
  if (allPresent) {
    console.log('All registration form elements are present.');
  }
}

function updateHeaderActions() {
  const logoutBtn = document.getElementById('logout-btn');
  const ordersBtn = document.getElementById('orders-btn');
  if (!logoutBtn || !ordersBtn) return;
  if (currentUser) {
    logoutBtn.disabled = false;
    ordersBtn.disabled = false;
    logoutBtn.classList.remove('disabled');
    ordersBtn.classList.remove('disabled');
  } else {
    logoutBtn.disabled = true;
    ordersBtn.disabled = true;
    logoutBtn.classList.add('disabled');
    ordersBtn.classList.add('disabled');
  }
}
