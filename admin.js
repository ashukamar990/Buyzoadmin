// /js/admin.js
import { db } from '../js/firebase.js';
import { 
  ref, 
  onValue, 
  set, 
  update, 
  remove, 
  push 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// Initialize Firebase Auth
const auth = getAuth();

// Global state
let editingProductId = null;
let currentUser = null;

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
  // Check auth state
  onAuthStateChanged(auth, (user) => {
    if (user) {
      currentUser = user;
      showPage('dashboardPage');
      loadData();
    } else {
      showPage('loginPage');
    }
  });
  
  // Set up event listeners
  setupEventListeners();
});

// Set up event listeners
function setupEventListeners() {
  // Login form
  document.getElementById('loginBtn').addEventListener('click', login);
  
  // Logout button
  document.getElementById('logoutBtn').addEventListener('click', logout);
  
  // Admin tabs
  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', function() {
      const tabName = this.getAttribute('data-tab');
      
      // Update active tab
      document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
      this.classList.add('active');
      
      // Show corresponding content
      document.querySelectorAll('.admin-tab-content').forEach(content => {
        content.classList.remove('active');
        if (content.getAttribute('data-tab') === tabName) {
          content.classList.add('active');
        }
      });
    });
  });
  
  // Product management
  document.getElementById('addProductBtn').addEventListener('click', () => {
    openProductModal();
  });
  
  document.getElementById('cancelProductBtn').addEventListener('click', () => {
    closeProductModal();
  });
  
  document.getElementById('saveProductBtn').addEventListener('click', saveProduct);
  
  // Policy management
  document.getElementById('savePoliciesBtn').addEventListener('click', savePolicies);
}

// Login function
async function login() {
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  
  if (!email || !password) {
    alert('Please enter email and password');
    return;
  }
  
  try {
    await signInWithEmailAndPassword(auth, email, password);
    // Auth state change will handle the UI update
  } catch (error) {
    console.error('Login error:', error);
    alert('Login failed: ' + error.message);
  }
}

// Logout function
async function logout() {
  try {
    await signOut(auth);
    // Auth state change will handle the UI update
  } catch (error) {
    console.error('Logout error:', error);
    alert('Logout failed: ' + error.message);
  }
}

// Load all data
function loadData() {
  loadProducts();
  loadOrders();
  loadPolicies();
}

// Load products for admin
function loadProducts() {
  const productsRef = ref(db, "products/");
  onValue(productsRef, (snapshot) => {
    const products = snapshot.val() || {};
    renderProductsTable(products);
  });
}

// Load orders for admin
function loadOrders() {
  const ordersRef = ref(db, "orders/");
  onValue(ordersRef, (snapshot) => {
    const orders = snapshot.val() || {};
    renderOrdersTable(orders);
  });
}

// Load policies for admin
function loadPolicies() {
  const policiesRef = ref(db, "policies/");
  onValue(policiesRef, (snapshot) => {
    const policies = snapshot.val() || {};
    
    // Populate policy editors
    if (policies.about) document.getElementById('aboutPolicy').value = policies.about;
    if (policies.refund) document.getElementById('refundPolicy').value = policies.refund;
    if (policies.terms) document.getElementById('termsPolicy').value = policies.terms;
    if (policies.shipping) document.getElementById('shippingPolicy').value = policies.shipping;
    if (policies.privacy) document.getElementById('privacyPolicy').value = policies.privacy;
  });
}

// Render products table
function renderProductsTable(products) {
  const table = document.getElementById('productsTable');
  table.innerHTML = '';
  
  if (Object.keys(products).length === 0) {
    table.innerHTML = '<tr><td colspan="5" style="text-align: center;">No products found</td></tr>';
    return;
  }
  
  Object.entries(products).forEach(([id, product]) => {
    const row = document.createElement('tr');
    
    const imgUrl = product.images && product.images.length ? product.images[0] : '';
    
    row.innerHTML = `
      <td><div class="admin-thumb" style="background-image: url('${imgUrl}')"></div></td>
      <td>${product.title}</td>
      <td>₹${product.price}</td>
      <td>${product.category || 'N/A'}</td>
      <td>
        <button class="action-btn edit-btn" data-id="${id}">Edit</button>
        <button class="action-btn delete-btn" data-id="${id}">Delete</button>
      </td>
    `;
    
    table.appendChild(row);
  });
  
  // Add event listeners to action buttons
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const productId = this.getAttribute('data-id');
      editProduct(productId);
    });
  });
  
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const productId = this.getAttribute('data-id');
      deleteProduct(productId);
    });
  });
}

// Render orders table
function renderOrdersTable(orders) {
  const table = document.getElementById('ordersTable');
  table.innerHTML = '';
  
  if (Object.keys(orders).length === 0) {
    table.innerHTML = '<tr><td colspan="7" style="text-align: center;">No orders found</td></tr>';
    return;
  }
  
  Object.entries(orders).forEach(([id, order]) => {
    const row = document.createElement('tr');
    const date = new Date(order.timestamp).toLocaleDateString();
    
    row.innerHTML = `
      <td>${id.substring(0, 8)}</td>
      <td>${order.fullname}</td>
      <td>${order.productId}</td>
      <td>₹${calculateOrderTotal(order)}</td>
      <td>
        <select class="status-select" data-id="${id}">
          <option value="Pending" ${order.status === 'Pending' ? 'selected' : ''}>Pending</option>
          <option value="Shipped" ${order.status === 'Shipped' ? 'selected' : ''}>Shipped</option>
          <option value="Delivered" ${order.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
          <option value="Cancelled" ${order.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
        </select>
      </td>
      <td>${date}</td>
      <td>
        <button class="action-btn edit-btn view-order-btn" data-id="${id}">View</button>
      </td>
    `;
    
    table.appendChild(row);
  });
  
  // Add event listeners to status selects
  document.querySelectorAll('.status-select').forEach(select => {
    select.addEventListener('change', function() {
      const orderId = this.getAttribute('data-id');
      const newStatus = this.value;
      updateOrderStatus(orderId, newStatus);
    });
  });
}

// Calculate order total
function calculateOrderTotal(order) {
  // In a real app, you would fetch the product price from the database
  // For simplicity, we'll use a placeholder
  const productPrice = 999; // This should come from the product data
  return productPrice * order.qty + 50; // ₹50 delivery charge
}

// Open product modal for adding/editing
function openProductModal(product = null) {
  editingProductId = product ? product.id : null;
  
  document.getElementById('productModalTitle').textContent = 
    product ? 'Edit Product' : 'Add Product';
  
  if (product) {
    document.getElementById('productTitle').value = product.title || '';
    document.getElementById('productPrice').value = product.price || '';
    document.getElementById('productCategory').value = product.category || '';
    document.getElementById('productDesc').value = product.desc || '';
    document.getElementById('productFullDesc').value = product.fullDesc || '';
    document.getElementById('productSizes').value = product.sizes ? product.sizes.join(', ') : '';
    document.getElementById('productImages').value = product.images ? product.images.join('\n') : '';
  } else {
    // Clear form for new product
    document.getElementById('productTitle').value = '';
    document.getElementById('productPrice').value = '';
    document.getElementById('productCategory').value = '';
    document.getElementById('productDesc').value = '';
    document.getElementById('productFullDesc').value = '';
    document.getElementById('productSizes').value = '';
    document.getElementById('productImages').value = '';
  }
  
  document.getElementById('productModal').classList.add('active');
}

// Close product modal
function closeProductModal() {
  document.getElementById('productModal').classList.remove('active');
  editingProductId = null;
}

// Edit product
function editProduct(productId) {
  const productRef = ref(db, `products/${productId}`);
  onValue(productRef, (snapshot) => {
    const product = snapshot.val();
    if (product) {
      product.id = productId;
      openProductModal(product);
    }
  }, { onlyOnce: true });
}

// Save product
async function saveProduct() {
  const title = document.getElementById('productTitle').value;
  const price = parseFloat(document.getElementById('productPrice').value);
  const category = document.getElementById('productCategory').value;
  const desc = document.getElementById('productDesc').value;
  const fullDesc = document.getElementById('productFullDesc').value;
  const sizes = document.getElementById('productSizes').value.split(',').map(s => s.trim());
  const images = document.getElementById('productImages').value.split('\n').filter(url => url.trim() !== '');
  
  if (!title || !price || !category) {
    alert('Please fill in required fields: Title, Price, and Category');
    return;
  }
  
  const productData = {
    title,
    price,
    category,
    desc,
    fullDesc,
    sizes,
    images,
    timestamp: Date.now()
  };
  
  try {
    if (editingProductId) {
      // Update existing product
      await set(ref(db, `products/${editingProductId}`), productData);
      alert('Product updated successfully!');
    } else {
      // Add new product
      const newProductRef = push(ref(db, "products/"));
      await set(newProductRef, productData);
      alert('Product added successfully!');
    }
    
    closeProductModal();
  } catch (error) {
    console.error('Error saving product:', error);
    alert('Failed to save product: ' + error.message);
  }
}

// Delete product
async function deleteProduct(productId) {
  if (!confirm('Are you sure you want to delete this product?')) {
    return;
  }
  
  try {
    await remove(ref(db, `products/${productId}`));
    alert('Product deleted successfully!');
  } catch (error) {
    console.error('Error deleting product:', error);
    alert('Failed to delete product: ' + error.message);
  }
}

// Update order status
async function updateOrderStatus(orderId, status) {
  try {
    await update(ref(db, `orders/${orderId}`), { status });
    alert('Order status updated successfully!');
  } catch (error) {
    console.error('Error updating order status:', error);
    alert('Failed to update order status: ' + error.message);
  }
}

// Save policies
async function savePolicies() {
  const policies = {
    about: document.getElementById('aboutPolicy').value,
    refund: document.getElementById('refundPolicy').value,
    terms: document.getElementById('termsPolicy').value,
    shipping: document.getElementById('shippingPolicy').value,
    privacy: document.getElementById('privacyPolicy').value
  };
  
  try {
    await set(ref(db, "policies"), policies);
    alert('Policies saved successfully!');
  } catch (error) {
    console.error('Error saving policies:', error);
    alert('Failed to save policies: ' + error.message);
  }
}

// Show page by id
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}