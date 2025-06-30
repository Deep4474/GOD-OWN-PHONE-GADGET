document.addEventListener('DOMContentLoaded', function() {
    // ONGOD Gadget Shop Admin - All-in-one Script
    
    const API_BASE = 'https://phone-2cv4.onrender.com/api/admin';
    const PRODUCTS_API = 'https://phone-2cv4.onrender.com/api/products';
    const NOTIFICATIONS_API = 'https://phone-2cv4.onrender.com/api/notifications';
    const ORDERS_API = 'https://phone-2cv4.onrender.com/api/orders';
    const USERS_API = 'https://phone-2cv4.onrender.com/api/admin/users';
    
    // --- DOM ELEMENTS FIRST ---
    const loginSection = document.getElementById('admin-login-section');
    const registerSection = document.getElementById('admin-register-section');
    const authContainer = document.getElementById('admin-auth-container');
    const dashboard = document.getElementById('admin-dashboard');
    const showRegister = document.getElementById('show-register');
    const showLogin = document.getElementById('show-login');
    const loginForm = document.getElementById('admin-login-form');
    const registerForm = document.getElementById('admin-register-form');
    const navItems = document.querySelectorAll('.admin-nav li[data-section]');
    const topbarTitle = document.getElementById('admin-topbar-title');
    const contentArea = document.getElementById('admin-content');
    const logoutBtn = document.getElementById('admin-logout');
    
    let currentProductList = [];
    let currentUserList = [];
    let ordersRefreshInterval = null;
    
    // Toggle forms
    if (showRegister) showRegister.onclick = (e) => {
      e.preventDefault();
      loginSection.classList.add('hidden');
      registerSection.classList.remove('hidden');
    };
    if (showLogin) showLogin.onclick = (e) => {
      e.preventDefault();
      registerSection.classList.add('hidden');
      loginSection.classList.remove('hidden');
    };
    
    // Login
    if (loginForm) loginForm.onsubmit = async function(e) {
      e.preventDefault();
      const email = document.getElementById('admin-login-email').value.trim();
      const password = document.getElementById('admin-login-password').value;
      const messageDiv = document.getElementById('admin-login-message');
      messageDiv.textContent = '';
      if (!email || !password) {
        messageDiv.textContent = 'Please enter email and password.';
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (res.ok && data.token) {
          localStorage.setItem('adminToken', data.token);
          localStorage.setItem('adminName', data.user.name);
          showDashboard();
        } else {
          messageDiv.textContent = data.error || 'Login failed.';
        }
      } catch (err) {
        messageDiv.textContent = 'Network error. Please try again.';
      }
    };
    
    // Register
    if (registerForm) registerForm.onsubmit = async function(e) {
      e.preventDefault();
      const name = document.getElementById('admin-register-name').value.trim();
      const email = document.getElementById('admin-register-email').value.trim();
      const password = document.getElementById('admin-register-password').value;
      const messageDiv = document.getElementById('admin-register-message');
      messageDiv.textContent = '';
      if (!name || !email || !password) {
        messageDiv.textContent = 'Please fill in all fields.';
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          messageDiv.style.color = '#2563eb';
          messageDiv.textContent = 'Registration successful! You can now login.';
        } else {
          messageDiv.style.color = '#dc2626';
          messageDiv.textContent = data.error || 'Registration failed.';
        }
      } catch (err) {
        messageDiv.style.color = '#dc2626';
        messageDiv.textContent = 'Network error. Please try again.';
      }
    };
    
    // Show dashboard if already logged in
    if (localStorage.getItem('adminToken')) {
      showDashboard();
    }
    
    function showDashboard() {
      if (authContainer) authContainer.classList.add('hidden');
      if (dashboard) dashboard.classList.remove('hidden');
      // Set admin name
      const adminName = localStorage.getItem('adminName') || '';
      const userSpan = document.getElementById('admin-logged-in-user');
      if (userSpan) userSpan.textContent = adminName ? `Hello, ${adminName}` : '';
      // Load default section
      loadAdminSection('dashboard');
    }
    
    // Logout
    if (logoutBtn) logoutBtn.onclick = () => {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminName');
      if (dashboard) dashboard.classList.add('hidden');
      if (authContainer) authContainer.classList.remove('hidden');
      // Reset forms
      loginForm?.reset();
      registerForm?.reset();
      document.getElementById('admin-login-message').textContent = '';
      document.getElementById('admin-register-message').textContent = '';
    };
    
    // Navigation
    if (navItems && contentArea) {
      navItems.forEach(item => {
        item.addEventListener('click', () => {
          document.querySelector('.admin-nav li.active')?.classList.remove('active');
          item.classList.add('active');
          const section = item.getAttribute('data-section');
          topbarTitle.textContent = item.textContent;
          loadAdminSection(section);
        });
      });
    }
    
    function loadAdminSection(section) {
      if (ordersRefreshInterval) {
        clearInterval(ordersRefreshInterval);
        ordersRefreshInterval = null;
      }
      switch (section) {
        case 'dashboard':
          loadDashboardSection();
          break;
        case 'products':
          loadProductsSection();
          break;
        case 'orders':
          loadOrdersSection();
          break;
        case 'users':
          loadUsersSection();
          break;
        case 'notifications':
          loadNotificationsSection();
          break;
        case 'analytics':
          loadAnalyticsSection();
          break;
        default:
          contentArea.innerHTML = `<h2>Section not found</h2>`;
      }
    }
    
    // --- DASHBOARD SECTION ---
    async function loadDashboardSection() {
      contentArea.innerHTML = '<h2>Dashboard</h2><div>Loading...</div>';
      try {
        const res = await fetch(`${API_BASE}/dashboard`, {
          headers: { 'Authorization': 'Bearer ' + localStorage.getItem('adminToken') }
        });
        const { stats } = await res.json();
        let html = `<h2>Dashboard</h2><div class="dashboard-stats">
          <div class="stat"><span>Total Orders</span><b>${stats.totalOrders}</b></div>
          <div class="stat"><span>Total Products</span><b>${stats.totalProducts}</b></div>
          <div class="stat"><span>Total Users</span><b>${stats.totalUsers}</b></div>
          <div class="stat"><span>Total Revenue</span><b>₦${stats.totalRevenue}</b></div>
        </div>`;
        html += `<h3 style="margin-top:2rem;">Recent Orders</h3>`;
        if (stats.recentOrders && stats.recentOrders.length) {
          html += `<div class="admin-table-wrapper"><table class="admin-table"><thead><tr><th>ID</th><th>User</th><th>Total</th><th>Status</th><th>Date</th></tr></thead><tbody>`;
          for (const order of stats.recentOrders) {
            html += `<tr><td>${order._id}</td><td>${order.userId}</td><td>₦${order.totalAmount}</td><td>${order.status}</td><td>${new Date(order.createdAt).toLocaleString()}</td></tr>`;
          }
          html += '</tbody></table></div>';
        } else {
          html += '<p>No recent orders.</p>';
        }
        contentArea.innerHTML = html;
      } catch (err) {
        contentArea.innerHTML = `<h2>Dashboard</h2><p style="color:#dc2626;">${err.message}</p>`;
      }
    }
    
    // --- PRODUCTS SECTION ---
    async function loadProductsSection() {
        contentArea.innerHTML = `
        <h2>Products</h2>
        <div class="product-controls">
            <input type="search" id="product-search" placeholder="Search by name, category..." class="admin-search-input">
            <button class="btn-primary" id="show-add-product">Add Product</button>
        </div>
        <div id="product-table-container">Loading...</div>`;
    
        document.getElementById('show-add-product').onclick = showAddProductForm;
        
        const searchInput = document.getElementById('product-search');
        searchInput.addEventListener('input', () => {
            const searchTerm = searchInput.value.toLowerCase();
            const filteredProducts = currentProductList.filter(p => 
                (p.name && p.name.toLowerCase().includes(searchTerm)) ||
                (p.category && p.category.toLowerCase().includes(searchTerm))
            );
            renderProductsTable(filteredProducts);
        });
        
        contentArea.onclick = function(e) {
            const target = e.target;
            if (target.matches('.btn-edit')) {
                const productId = target.closest('tr').dataset.productId;
                const product = currentProductList.find(p => p._id === productId);
                if (product) showEditProductForm(product);
            } else if (target.matches('.btn-delete')) {
                const productId = target.closest('tr').dataset.productId;
                if (productId) deleteProduct(productId);
            }
        };
    
        try {
            const res = await fetch(PRODUCTS_API);
            const data = await res.json();
            currentProductList = data.products || [];
            renderProductsTable(currentProductList);
        } catch (err) {
            const container = document.getElementById('product-table-container');
            if (container) container.innerHTML = `<p style="color:#dc2626;">Failed to load products: ${err.message}</p>`;
        }
    }
    
    function renderProductsTable(products) {
        const container = document.getElementById('product-table-container');
        if (!container) return;
    
        let html = '';
        if (!products || !products.length) {
            html = '<p>No products match your search.</p>';
        } else {
            html += `<div class="admin-table-wrapper"><table class="admin-table"><thead><tr><th>Image</th><th>Name</th><th>Price</th><th>Category</th><th>Stock</th><th>Actions</th></tr></thead><tbody>`;
            for (const p of products) {
                const imgUrl = (p.images && p.images.length) ? p.images[0] : '';
                const fallbackImg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 24 24' fill='none' stroke='%23e5e7eb' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='3' width='18' height='18' rx='2' ry='2'%3E%3C/rect%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'%3E%3C/circle%3E%3Cpolyline points='21 15 16 10 5 21'%3E%3C/polyline%3E%3C/svg%3E";
                const finalImgSrc = imgUrl || fallbackImg;
                html += `<tr data-product-id="${p._id}">
                    <td><img src="${finalImgSrc}" alt="Product Image" style="width:48px;height:48px;object-fit:cover;border-radius:6px;" onerror="this.onerror=null;this.src='${fallbackImg}'" /></td>
                    <td>${p.name}</td>
                    <td>₦${p.price}</td>
                    <td>${p.category}</td>
                    <td>${p.stock}</td>
                    <td class="product-actions">
                        <button class="btn-edit">Edit</button>
                        <button class="btn-delete">Delete</button>
                    </td>
                </tr>`;
            }
            html += '</tbody></table></div>';
        }
        container.innerHTML = html;
    }
    
    async function deleteProduct(id) {
        if (!confirm('Are you sure you want to delete this product?')) {
            return;
        }
        try {
            const res = await fetch(`${PRODUCTS_API}/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': 'Bearer ' + localStorage.getItem('adminToken') }
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to delete product.');
            }
            currentProductList = currentProductList.filter(p => p._id !== id);
            renderProductsTable(currentProductList);
        } catch (err) {
            alert(`Error: ${err.message}`);
        }
    }
    
    function showEditProductForm(product) {
      contentArea.innerHTML = `<h2>Edit Product</h2>
        <form id="edit-product-form" class="admin-form">
          <input type="hidden" id="prod-id" value="${product._id}">
          <div class="form-group"><label>Name</label><input type="text" id="prod-name" value="${product.name}" required></div>
          <div class="form-group"><label>Price</label><input type="number" id="prod-price" value="${product.price}" required></div>
          <div class="form-group"><label>Description</label><textarea id="prod-desc" required>${product.description}</textarea></div>
          <div class="form-group"><label>Category</label><input type="text" id="prod-cat" value="${product.category}" required></div>
          <div class="form-group"><label>Brand</label><input type="text" id="prod-brand" value="${product.brand}" required></div>
          <div class="form-group"><label>Stock</label><input type="number" id="prod-stock" value="${product.stock}" required></div>
          <div class="form-group"><label>Image URL (comma separated)</label><input type="text" id="prod-imgs" value="${(product.images || []).join(', ')}"></div>
          <button type="submit" class="btn-primary">Save Changes</button>
          <button type="button" class="btn-secondary" id="cancel-edit-product">Cancel</button>
          <div id="edit-product-message" class="form-message"></div>
        </form>`;
        
      document.getElementById('cancel-edit-product').onclick = loadProductsSection;
      document.getElementById('edit-product-form').onsubmit = async function(e) {
        e.preventDefault();
        const id = document.getElementById('prod-id').value;
        const updatedData = {
            name: document.getElementById('prod-name').value.trim(),
            price: document.getElementById('prod-price').value,
            description: document.getElementById('prod-desc').value.trim(),
            category: document.getElementById('prod-cat').value.trim(),
            brand: document.getElementById('prod-brand').value.trim(),
            stock: document.getElementById('prod-stock').value,
            images: document.getElementById('prod-imgs').value.split(',').map(s => s.trim()).filter(Boolean)
        };
        
        const messageDiv = document.getElementById('edit-product-message');
        messageDiv.textContent = '';
    
        try {
          const res = await fetch(`${PRODUCTS_API}/${id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + localStorage.getItem('adminToken')
            },
            body: JSON.stringify(updatedData)
          });
          const data = await res.json();
          if (res.ok) {
            messageDiv.style.color = 'var(--success-color)';
            messageDiv.textContent = 'Product updated!';
            setTimeout(loadProductsSection, 1200);
          } else {
            messageDiv.style.color = 'var(--danger-color)';
            messageDiv.textContent = data.error || 'Failed to update product.';
          }
        } catch (err) {
          messageDiv.style.color = 'var(--danger-color)';
          messageDiv.textContent = 'Network error.';
        }
      };
    }
    
    function showAddProductForm() {
      contentArea.innerHTML = `<h2>Add Product</h2>
        <form id="add-product-form" class="admin-form">
          <div class="form-group"><label>Name</label><input type="text" id="prod-name" required></div>
          <div class="form-group"><label>Price</label><input type="number" id="prod-price" required></div>
          <div class="form-group"><label>Description</label><textarea id="prod-desc" required></textarea></div>
          <div class="form-group"><label>Category</label><input type="text" id="prod-cat" required></div>
          <div class="form-group"><label>Brand</label><input type="text" id="prod-brand" required></div>
          <div class="form-group"><label>Stock</label><input type="number" id="prod-stock" required></div>
          <div class="form-group"><label>Image URL (comma separated)</label><input type="text" id="prod-imgs"></div>
          <button type="submit" class="btn-primary">Add Product</button>
          <button type="button" class="btn-secondary" id="cancel-add-product">Cancel</button>
          <div id="add-product-message" class="form-message"></div>
        </form>`;
      document.getElementById('cancel-add-product').onclick = loadProductsSection;
      document.getElementById('add-product-form').onsubmit = async function(e) {
        e.preventDefault();
        const name = document.getElementById('prod-name').value.trim();
        const price = document.getElementById('prod-price').value;
        const description = document.getElementById('prod-desc').value.trim();
        const category = document.getElementById('prod-cat').value.trim();
        const brand = document.getElementById('prod-brand').value.trim();
        const stock = document.getElementById('prod-stock').value;
        const images = document.getElementById('prod-imgs').value.split(',').map(s => s.trim()).filter(Boolean);
        const messageDiv = document.getElementById('add-product-message');
        messageDiv.textContent = '';
        try {
          const res = await fetch(PRODUCTS_API, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + localStorage.getItem('adminToken')
            },
            body: JSON.stringify({ name, price, description, category, brand, stock, images })
          });
          const data = await res.json();
          if (res.ok && data.product) {
            messageDiv.style.color = '#2563eb';
            messageDiv.textContent = 'Product added!';
            setTimeout(loadProductsSection, 1200);
          } else {
            messageDiv.style.color = '#dc2626';
            messageDiv.textContent = data.error || 'Failed to add product.';
          }
        } catch (err) {
          messageDiv.style.color = '#dc2626';
          messageDiv.textContent = 'Network error.';
        }
      };
    }
    
    // --- USERS SECTION ---
    async function loadUsersSection() {
      contentArea.innerHTML = '<h2>Users</h2><div>Loading...</div>';
      contentArea.onclick = null; // Clear product section listeners
      try {
        const res = await fetch(USERS_API, {
          headers: { 'Authorization': 'Bearer ' + localStorage.getItem('adminToken') }
        });
        const data = await res.json();
        currentUserList = data.users || [];
        
        let html = `<h2>Users</h2>`;
        if (!currentUserList.length) {
          html += '<p>No users found.</p>';
        } else {
          html += `<div class="admin-table-wrapper"><table class="admin-table"><thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Actions</th></tr></thead><tbody>`;
          for (const u of currentUserList) {
            html += `<tr data-user-id="${u.id}">
              <td>${u.id}</td>
              <td>${u.name}</td>
              <td>${u.email}</td>
              <td>${u.role}</td>
              <td><button class="btn-primary view-user-btn" style="width: auto; display: inline-block; padding: 0.4rem 0.8rem; font-size: 0.875rem;">View</button></td>
            </tr>`;
          }
          html += '</tbody></table></div>';
        }
        contentArea.innerHTML = html;
    
        // Add event listeners for view buttons
        document.querySelectorAll('.view-user-btn').forEach(btn => {
          btn.onclick = function() {
            const userId = this.closest('tr').getAttribute('data-user-id');
            const user = currentUserList.find(u => u.id === userId);
            if (user) {
                showUserModal(user);
            }
          };
        });
      } catch (err) {
        contentArea.innerHTML = `<h2>Users</h2><p style="color:#dc2626;">${err.message}</p>`;
      }
    }
    
    function showUserModal(user) {
      // Create modal backdrop
      const modalBackdrop = document.createElement('div');
      modalBackdrop.className = 'modal-backdrop';
    
      // Create modal content
      const address = user.address || 'No address provided';
      const mapSrc = address !== 'No address provided'
        ? `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`
        : '';
    
      modalBackdrop.innerHTML = `
        <div class="modal-content">
          <div class="modal-header">
            <h3>User Details</h3>
            <button class="modal-close">&times;</button>
          </div>
          <div class="modal-body">
            <div class="user-details-grid">
              <div class="user-detail"><strong>Name:</strong> ${user.name}</div>
              <div class="user-detail"><strong>Email:</strong> ${user.email}</div>
              <div class="user-detail"><strong>Phone:</strong> ${user.phone || 'N/A'}</div>
              <div class="user-detail"><strong>Role:</strong> ${user.role}</div>
              <div class="user-detail" style="grid-column: 1 / -1;"><strong>Address:</strong> ${address}</div>
            </div>
            <h4>User Location</h4>
            ${mapSrc ? `<iframe class="user-map" src="${mapSrc}" loading="lazy"></iframe>` : '<p>Map not available because no address was provided.</p>'}
          </div>
        </div>
      `;
    
      // Append to body
      document.body.appendChild(modalBackdrop);
    
      // Show modal with transition
      setTimeout(() => modalBackdrop.classList.add('show'), 10);
    
      // Close functionality
      const closeModal = () => {
        modalBackdrop.classList.remove('show');
        modalBackdrop.addEventListener('transitionend', () => modalBackdrop.remove());
      };
    
      modalBackdrop.querySelector('.modal-close').onclick = closeModal;
      modalBackdrop.addEventListener('click', (e) => {
        if (e.target === modalBackdrop) {
          closeModal();
        }
      });
    }
    
    // --- NOTIFICATIONS SECTION ---
    async function loadNotificationsSection() {
      contentArea.innerHTML = '<h2>Notifications</h2><div>Loading...</div>';
      contentArea.onclick = null; // Clear product section listeners
      try {
        const res = await fetch(NOTIFICATIONS_API, {
          headers: { 'Authorization': 'Bearer ' + localStorage.getItem('adminToken') }
        });
        const data = await res.json();
        let html = `<h2>Notifications</h2><button class="btn-primary" id="show-send-notif" style="float:right;margin-bottom:1rem;">Send Notification</button>`;
        if (!data.notifications.length) {
          html += '<p>No notifications found.</p>';
        } else {
          html += `<div class="admin-table-wrapper"><table class="admin-table"><thead><tr><th>ID</th><th>User</th><th>Message</th><th>Type</th><th>Read</th><th>Date</th></tr></thead><tbody>`;
          for (const n of data.notifications) {
            html += `<tr><td>${n._id}</td><td>${n.userId}</td><td>${n.message}</td><td>${n.type}</td><td>${n.read ? 'Yes' : 'No'}</td><td>${new Date(n.createdAt).toLocaleString()}</td></tr>`;
          }
          html += '</tbody></table></div>';
        }
        contentArea.innerHTML = html;
        document.getElementById('show-send-notif').onclick = showSendNotifForm;
      } catch (err) {
        contentArea.innerHTML = `<h2>Notifications</h2><p style="color:#dc2626;">${err.message}</p>`;
      }
    }
    function showSendNotifForm() {
      contentArea.innerHTML = `<h2>Send Notification</h2>
        <form id="send-notif-form" class="admin-form">
          <div class="form-group"><label>User ID</label><input type="text" id="notif-user-id" required></div>
          <div class="form-group"><label>Message</label><textarea id="notif-message" required></textarea></div>
          <div class="form-group"><label>Type</label><input type="text" id="notif-type" placeholder="order_update/admin"></div>
          <button type="submit" class="btn-primary">Send</button>
          <button type="button" class="btn-secondary" id="cancel-send-notif">Cancel</button>
          <div id="send-notif-message" class="form-message"></div>
        </form>`;
      document.getElementById('cancel-send-notif').onclick = loadNotificationsSection;
      document.getElementById('send-notif-form').onsubmit = async function(e) {
        e.preventDefault();
        const userId = document.getElementById('notif-user-id').value.trim();
        const message = document.getElementById('notif-message').value.trim();
        const type = document.getElementById('notif-type').value.trim();
        const messageDiv = document.getElementById('send-notif-message');
        messageDiv.textContent = '';
        try {
          const res = await fetch(`${API_BASE}/notifications/send`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + localStorage.getItem('adminToken')
            },
            body: JSON.stringify({ userId, message, type })
          });
          const data = await res.json();
          if (res.ok && data.success) {
            messageDiv.style.color = '#2563eb';
            messageDiv.textContent = 'Notification sent!';
            setTimeout(loadNotificationsSection, 1200);
          } else {
            messageDiv.style.color = '#dc2626';
            messageDiv.textContent = data.error || 'Failed to send notification.';
          }
        } catch (err) {
          messageDiv.style.color = '#dc2626';
          messageDiv.textContent = 'Network error.';
        }
      };
    }
    
    // --- ORDERS SECTION ---
    async function loadOrdersSection() {
      contentArea.innerHTML = '<h2>Orders</h2><button id="refresh-orders-btn" class="btn-primary" style="margin-bottom:1rem;">Refresh Orders</button><div id="orders-loading">Loading orders...</div>';
      contentArea.onclick = null; // Clear product section listeners
    
      // Set up auto-refresh
      if (ordersRefreshInterval) clearInterval(ordersRefreshInterval);
      ordersRefreshInterval = setInterval(loadOrdersSection, 30000); // 30 seconds
    
      try {
        const res = await fetch(ORDERS_API, {
          headers: { 'Authorization': 'Bearer ' + localStorage.getItem('adminToken') }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to fetch orders');
        if (!data.orders.length) {
          contentArea.innerHTML = '<h2>Orders</h2><button id="refresh-orders-btn" class="btn-primary" style="margin-bottom:1rem;">Refresh Orders</button><p>No orders found.</p>';
          document.getElementById('refresh-orders-btn').onclick = loadOrdersSection;
          return;
        }
        let html = `<h2>Orders</h2><button id="refresh-orders-btn" class="btn-primary" style="margin-bottom:1rem;">Refresh Orders</button><div class="orders-list">`;
        html += `<div class="admin-table-wrapper"><table class="admin-table"><thead><tr><th>ID</th><th>User</th><th>Product</th><th>Qty</th><th>Total</th><th>Status</th><th>Date</th><th>Action</th></tr></thead><tbody>`;
        for (const order of data.orders) {
          html += `<tr>
            <td>${order._id}</td>
            <td>${order.userId}</td>
            <td>${order.productId}</td>
            <td>${order.quantity}</td>
            <td>₦${order.totalAmount}</td>
            <td>
              <select class="order-status" data-id="${order._id}">
                <option value="pending"${order.status==='pending'?' selected':''}>Pending</option>
                <option value="confirmed"${order.status==='confirmed'?' selected':''}>Confirmed</option>
                <option value="delivered"${order.status==='delivered'?' selected':''}>Delivered</option>
                <option value="rejected"${order.status==='rejected'?' selected':''}>Rejected</option>
              </select>
            </td>
            <td>${new Date(order.createdAt).toLocaleString()}</td>
            <td><button class="btn-primary btn-update-status" data-id="${order._id}">Update</button></td>
          </tr>`;
        }
        html += '</tbody></table></div></div>';
        contentArea.innerHTML = html;
        document.getElementById('refresh-orders-btn').onclick = loadOrdersSection;
        // Add event listeners for update buttons
        document.querySelectorAll('.btn-update-status').forEach(btn => {
          btn.onclick = async function() {
            const id = btn.getAttribute('data-id');
            const status = document.querySelector(`select.order-status[data-id='${id}']`).value;
            btn.textContent = '...';
            btn.disabled = true;
            try {
              const res = await fetch(`${ORDERS_API}/${id}/update`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': 'Bearer ' + localStorage.getItem('adminToken')
                },
                body: JSON.stringify({ status })
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error || 'Failed to update');
              btn.textContent = 'Updated!';
              setTimeout(() => { btn.textContent = 'Update'; btn.disabled = false; }, 1200);
            } catch (err) {
              btn.textContent = 'Error';
              setTimeout(() => { btn.textContent = 'Update'; btn.disabled = false; }, 1200);
            }
          };
        });
      } catch (err) {
        contentArea.innerHTML = `<h2>Orders</h2><button id="refresh-orders-btn" class="btn-primary" style="margin-bottom:1rem;">Refresh Orders</button><p style="color:#dc2626;">${err.message}</p>`;
        document.getElementById('refresh-orders-btn').onclick = loadOrdersSection;
      }
    }
    
    // --- ANALYTICS SECTION ---
    async function loadAnalyticsSection() {
      contentArea.innerHTML = '<h2>Analytics</h2><div>Loading charts...</div>';
      contentArea.onclick = null; // Clear product section listeners
      try {
        const res = await fetch(`${API_BASE}/analytics`, {
          headers: { 'Authorization': 'Bearer ' + localStorage.getItem('adminToken') }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to fetch analytics');
    
        let html = `<h2>Analytics</h2>`;
        html += `<div class="analytics-grid">
            <div class="chart-container">
                <h3>Sales Over Time (Last 30 Days)</h3>
                <canvas id="salesChart"></canvas>
            </div>
            <div class="chart-container">
                <h3>Order Status</h3>
                <canvas id="orderStatusChart"></canvas>
            </div>
            <div class="chart-container">
                <h3>User Registrations (Last 30 Days)</h3>
                <canvas id="userSignupsChart"></canvas>
            </div>
            <div class="data-container">
                  <h3>Top 5 Selling Products</h3>
                  <ul id="topProductsList"></ul>
            </div>
        </div>`;
    
        contentArea.innerHTML = html;
        
        // Render charts
        renderSalesChart(data.salesData);
        renderOrderStatusChart(data.orderStatusCounts);
        renderUserSignupsChart(data.userSignupsData);
    
        // Render top products list
        const topProductsList = document.getElementById('topProductsList');
        if (data.topProducts && data.topProducts.length > 0) {
          topProductsList.innerHTML = data.topProducts
            .map(p => `<li>${p.name} <span>(${p.quantitySold} sold)</span></li>`)
            .join('');
        } else {
          topProductsList.innerHTML = '<li>No sales data available.</li>';
        }
    
      } catch (err) {
        contentArea.innerHTML = `<h2>Analytics</h2><p style="color:#dc2626;">${err.message}</p>`;
      }
    }
    
    function renderSalesChart(salesData) {
      const ctx = document.getElementById('salesChart').getContext('2d');
      new Chart(ctx, {
        type: 'line',
        data: {
          labels: salesData.map(d => d.date),
          datasets: [{
            label: 'Total Sales (₦)',
            data: salesData.map(d => d.sales),
            borderColor: '#2563eb',
            backgroundColor: 'rgba(37, 99, 235, 0.1)',
            fill: true,
            tension: 0.1
          }]
        }
      });
    }
    
    function renderOrderStatusChart(orderStatusCounts) {
      const ctx = document.getElementById('orderStatusChart').getContext('2d');
      const labels = Object.keys(orderStatusCounts);
      const data = Object.values(orderStatusCounts);
      
      // Consistent colors for statuses
      const colorMap = {
        pending: '#f59e0b',
        confirmed: '#3b82f6',
        delivered: '#10b981',
        rejected: '#ef4444',
      };
    
      new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: labels,
          datasets: [{
            label: 'Order Status',
            data: data,
            backgroundColor: labels.map(label => colorMap[label] || '#6b7280'),
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
        }
      });
    }
    
    function renderUserSignupsChart(userSignupsData) {
      const ctx = document.getElementById('userSignupsChart').getContext('2d');
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: userSignupsData.map(d => d.date),
          datasets: [{
            label: 'New Users',
            data: userSignupsData.map(d => d.count),
            backgroundColor: '#8b5cf6',
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
        }
      });
    }
    
    // --- END OF ALL CODE ---
    });