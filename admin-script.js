// ONGOD Gadget Shop Admin - Shared Script

const API_BASE = 'https://phone-2cv4.onrender.com/api/admin';

// Helper: Check if admin is logged in
function isAdminLoggedIn() {
  return !!localStorage.getItem('adminToken');
}

// Helper: Set admin token
function setAdminToken(token) {
  localStorage.setItem('adminToken', token);
}

// Helper: Remove admin token
function removeAdminToken() {
  localStorage.removeItem('adminToken');
}

// Helper: Get admin token
function getAdminToken() {
  return localStorage.getItem('adminToken');
}

// Helper: Auth header
function adminAuthHeader() {
  const token = getAdminToken();
  return token ? { 'Authorization': 'Bearer ' + token } : {};
}

// Redirect to login if not authenticated
if (window.location.pathname.includes('admin-dashboard.html') && !isAdminLoggedIn()) {
  window.location.href = 'admin-login.html';
}

// Logout handler
const logoutBtn = document.getElementById('admin-logout');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    removeAdminToken();
    window.location.href = 'admin-login.html';
  });
}

// Navigation handler
const navItems = document.querySelectorAll('.admin-nav li[data-section]');
const topbarTitle = document.getElementById('admin-topbar-title');
const contentArea = document.getElementById('admin-content');

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
  // Load default section
  loadAdminSection('dashboard');
}

// Load section content
function loadAdminSection(section) {
  switch (section) {
    case 'dashboard':
      contentArea.innerHTML = `<h2>Welcome to the Admin Dashboard</h2><p>Use the sidebar to manage products, orders, users, and more.</p>`;
      break;
    case 'products':
      contentArea.innerHTML = `
        <h2>Product Management</h2>
        <div id="product-image-tool" style="margin-bottom: 2em;">
          <label for="image-url-input"><b>Paste Image URL:</b></label>
          <input type="text" id="image-url-input" placeholder="Enter image URL here" style="width: 60%; margin-left: 1em;">
          <button id="add-image-btn" class="btn-primary" style="margin-left: 1em;">Add Image</button>
          <div id="added-images-list" style="margin-top: 1em; display: flex; gap: 1em;"></div>
        </div>
        <div id="product-create-form-container"></div>
        <p>Coming soon...</p>
      `;
      setTimeout(() => {
        let images = [];
        const imageUrlInput = document.getElementById('image-url-input');
        const addImageBtn = document.getElementById('add-image-btn');
        const imagesList = document.getElementById('added-images-list');
        const formContainer = document.getElementById('product-create-form-container');

        function renderImages() {
          imagesList.innerHTML = images.map((img, idx) => `
            <div style='position:relative;'>
              <img src='${img}' data-idx='${idx}' style='max-width:80px; max-height:80px; border:1px solid #ccc;'>
              <span style='position:absolute;top:2px;right:2px;background:#fff;color:#f00;cursor:pointer;font-weight:bold;padding:0 4px;border-radius:50%;' data-remove='${idx}'>×</span>
            </div>
          `).join('');
        }

        addImageBtn.onclick = function() {
          const url = imageUrlInput.value.trim();
          if (!url || !(url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:image'))) {
            alert('Please enter a valid image URL.');
            return;
          }
          images.push(url);
          renderImages();
          imageUrlInput.value = '';
        };

        imagesList.onclick = function(e) {
          const removeEl = e.target.closest('[data-remove]');
          if (removeEl) {
            const idx = parseInt(removeEl.getAttribute('data-remove'));
            images.splice(idx, 1);
            renderImages();
          }
        };

        // Product creation form
        formContainer.innerHTML = `<button id='open-create-form-btn' class='btn-success'>Create Product</button>`;
        document.getElementById('open-create-form-btn').onclick = function() {
          if (images.length === 0) {
            alert('Please add at least one image.');
            return;
          }
          // Show cropping modal for all images before submitting
          showMultiCropperModal(images, function(croppedImages) {
            showProductForm(croppedImages);
          });
        };

        function showMultiCropperModal(imgs, callback) {
          let current = 0;
          let cropped = [];
          let modal = document.createElement('div');
          modal.style.position = 'fixed';
          modal.style.top = '0';
          modal.style.left = '0';
          modal.style.width = '100vw';
          modal.style.height = '100vh';
          modal.style.background = 'rgba(0,0,0,0.7)';
          modal.style.display = 'flex';
          modal.style.alignItems = 'center';
          modal.style.justifyContent = 'center';
          modal.style.zIndex = '9999';
          document.body.appendChild(modal);

          function showCropStep(idx) {
            modal.innerHTML = `
              <div style='background:#fff;padding:2em;position:relative;max-width:90vw;'>
                <h3>Crop Image ${idx+1} of ${imgs.length}</h3>
                <img id='modal-crop-image' src='${imgs[idx]}' style='max-width:400px;max-height:400px;display:block;'>
                <button id='save-crop-btn' class='btn-primary' style='margin-top:1em;'>Save Crop</button>
                <button id='skip-crop-btn' style='margin-top:1em;margin-left:1em;'>Skip</button>
                <button id='cancel-crop-btn' style='margin-top:1em;margin-left:1em;'>Cancel</button>
              </div>
            `;
            const cropImg = document.getElementById('modal-crop-image');
            let cropper = new Cropper(cropImg, {
              aspectRatio: 1,
              viewMode: 1,
              autoCropArea: 1
            });
            document.getElementById('save-crop-btn').onclick = function() {
              const canvas = cropper.getCroppedCanvas({ width: 300, height: 300 });
              const croppedDataUrl = canvas.toDataURL('image/jpeg');
              cropped[idx] = croppedDataUrl;
              cropper.destroy();
              nextStep();
            };
            document.getElementById('skip-crop-btn').onclick = function() {
              cropped[idx] = imgs[idx];
              cropper.destroy();
              nextStep();
            };
            document.getElementById('cancel-crop-btn').onclick = function() {
              cropper.destroy();
              document.body.removeChild(modal);
            };
          }
          function nextStep() {
            current++;
            if (current < imgs.length) {
              showCropStep(current);
            } else {
              document.body.removeChild(modal);
              callback(cropped);
            }
          }
          showCropStep(current);
        }

        function showProductForm(finalImages) {
          formContainer.innerHTML = `
            <form id='create-product-form' style='margin-top:2em;'>
              <h3>Create New Product</h3>
              <div style='margin-bottom:1em; display:flex; gap:1em;'>
                ${finalImages.map(img => `<img src='${img}' style='max-width:100px; max-height:100px; border:1px solid #ccc;'>`).join('')}
              </div>
              <div><input type='text' id='product-name' placeholder='Product Name' required style='width:60%;margin-bottom:0.5em;'></div>
              <div><input type='number' id='product-price' placeholder='Price' required style='width:60%;margin-bottom:0.5em;'></div>
              <div><input type='text' id='product-category' placeholder='Category' required style='width:60%;margin-bottom:0.5em;'></div>
              <div><input type='text' id='product-brand' placeholder='Brand' required style='width:60%;margin-bottom:0.5em;'></div>
              <div><input type='number' id='product-stock' placeholder='Stock' required style='width:60%;margin-bottom:0.5em;'></div>
              <div><textarea id='product-description' placeholder='Description' required style='width:60%;margin-bottom:0.5em;'></textarea></div>
              <button type='submit' class='btn-primary'>Create Product</button>
              <div id='create-product-message' style='margin-top:1em;'></div>
            </form>
          `;
          const createForm = document.getElementById('create-product-form');
          createForm.onsubmit = async function(e) {
            e.preventDefault();
            const name = document.getElementById('product-name').value.trim();
            const price = document.getElementById('product-price').value.trim();
            const category = document.getElementById('product-category').value.trim();
            const brand = document.getElementById('product-brand').value.trim();
            const stock = document.getElementById('product-stock').value.trim();
            const description = document.getElementById('product-description').value.trim();
            const messageDiv = document.getElementById('create-product-message');
            if (!name || !price || !category || !brand || !stock || !description) {
              messageDiv.textContent = 'Please fill in all fields.';
              messageDiv.style.color = 'red';
              return;
            }
            try {
              const res = await fetch(`${API_BASE.replace('/admin','')}/products`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...adminAuthHeader()
                },
                body: JSON.stringify({
                  name,
                  price,
                  description,
                  category,
                  brand,
                  stock,
                  images: finalImages
                })
              });
              const data = await res.json();
              if (res.ok) {
                messageDiv.textContent = 'Product created successfully!';
                messageDiv.style.color = 'green';
                createForm.reset();
                images = [];
                renderImages();
              } else {
                messageDiv.textContent = data.error || 'Failed to create product.';
                messageDiv.style.color = 'red';
              }
            } catch (err) {
              messageDiv.textContent = 'Network error.';
              messageDiv.style.color = 'red';
            }
          };
        }
        renderImages();
      }, 100);
      break;
    case 'orders':
      contentArea.innerHTML = `<h2>Order Management</h2><p>Coming soon...</p>`;
      break;
    case 'users':
      contentArea.innerHTML = `<h2>User Management</h2><p>Coming soon...</p>`;
      break;
    case 'notifications':
      contentArea.innerHTML = `<h2>Notifications</h2><p>Coming soon...</p>`;
      break;
    case 'analytics':
      contentArea.innerHTML = `<h2>Analytics</h2><p>Coming soon...</p>`;
      break;
    default:
      contentArea.innerHTML = `<h2>Section not found</h2>`;
  }
}

async function loadAnalyticsSection() {
  // ...
  const res = await fetch(`${API_BASE}/analytics`, {
    headers: { 'Authorization': 'Bearer ' + localStorage.getItem('adminToken') }
  });
  // ...
} 