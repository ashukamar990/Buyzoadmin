// /js/public.js
import { db } from './firebase.js';
import { ref, onValue, push, set } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// Global state
let selectedProduct = null;
let orderDraft = {
  productId: null, 
  size: null, 
  qty: 1, 
  fullname: '',
  mobile: '',
  pincode: '',
  city: '',
  state: '',
  house: '',
  payment: 'prepaid',
  timestamp: null
};

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
  // Load products
  loadProducts();
  
  // Load categories
  loadCategories();
  
  // Load policies
  loadPolicies();
  
  // Set up event listeners
  setupEventListeners();
});

// Load products from Firebase
function loadProducts() {
  const productsRef = ref(db, "products/");
  onValue(productsRef, (snapshot) => {
    const products = snapshot.val() || {};
    renderProducts(products);
  }, {
    onlyOnce: false // Realtime updates
  });
}

// Load categories from products
function loadCategories() {
  const productsRef = ref(db, "products/");
  onValue(productsRef, (snapshot) => {
    const products = snapshot.val() || {};
    const categories = new Set();
    
    // Extract categories from products
    Object.values(products).forEach(product => {
      if (product.category) {
        categories.add(product.category);
      }
    });
    
    renderCategories(Array.from(categories));
  });
}

// Load policies from Firebase
function loadPolicies() {
  const policiesRef = ref(db, "policies/");
  onValue(policiesRef, (snapshot) => {
    window.policies = snapshot.val() || {};
  });
}

// Render products to the grid
function renderProducts(products) {
  const productGrid = document.getElementById('productGrid');
  
  if (Object.keys(products).length === 0) {
    productGrid.innerHTML = '<div class="card-panel" style="text-align:center">No products available</div>';
    return;
  }
  
  productGrid.innerHTML = '';
  
  Object.entries(products).forEach(([id, product]) => {
    const card = document.createElement('div');
    card.className = 'card';
    const imgUrl = product.images && product.images.length ? product.images[0] : '';
    
    card.innerHTML = `
      <div class="product-img" style="background-image:url('${imgUrl}')"></div>
      <div class="card-body">
        <div class="title">${product.title}</div>
        <div class="price">₹${product.price}</div>
        <div class="badge">${product.desc}</div>
        <div style="margin-top:auto;display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn orderBtn" data-id="${id}">Order Now</button>
          <button class="btn secondary viewBtn" data-id="${id}">View Details</button>
        </div>
      </div>
    `;
    
    productGrid.appendChild(card);
  });
  
  // Add event listeners to product cards
  document.querySelectorAll('.orderBtn').forEach(btn => {
    btn.addEventListener('click', function() {
      const productId = this.getAttribute('data-id');
      startOrder(productId);
    });
  });
  
  document.querySelectorAll('.viewBtn').forEach(btn => {
    btn.addEventListener('click', function() {
      const productId = this.getAttribute('data-id');
      showProductDetail(productId);
    });
  });
}

// Render categories
function renderCategories(categories) {
  const container = document.getElementById('categoriesContainer');
  container.innerHTML = '';
  
  // Add "All" category
  const allPill = document.createElement('div');
  allPill.className = 'category-pill active';
  allPill.setAttribute('data-category', 'all');
  allPill.textContent = 'All';
  allPill.addEventListener('click', () => filterProductsByCategory('all'));
  container.appendChild(allPill);
  
  // Add other categories
  categories.forEach(category => {
    const pill = document.createElement('div');
    pill.className = 'category-pill';
    pill.setAttribute('data-category', category);
    pill.textContent = category;
    pill.addEventListener('click', () => filterProductsByCategory(category));
    container.appendChild(pill);
  });
}

// Filter products by category
function filterProductsByCategory(category) {
  // Update active category
  document.querySelectorAll('.category-pill').forEach(pill => {
    pill.classList.remove('active');
    if (pill.getAttribute('data-category') === category) {
      pill.classList.add('active');
    }
  });
  
  // If "All" is selected, show all products
  if (category === 'all') {
    loadProducts();
    return;
  }
  
  // Filter products by category
  const productsRef = ref(db, "products/");
  onValue(productsRef, (snapshot) => {
    const products = snapshot.val() || {};
    const filteredProducts = {};
    
    Object.entries(products).forEach(([id, product]) => {
      if (product.category === category) {
        filteredProducts[id] = product;
      }
    });
    
    renderProducts(filteredProducts);
  });
}

// Show product detail
function showProductDetail(productId) {
  const productRef = ref(db, `products/${productId}`);
  onValue(productRef, (snapshot) => {
    const product = snapshot.val();
    if (!product) return;
    
    // Update product detail page
    document.getElementById('detailTitle').textContent = product.title;
    document.getElementById('detailPrice').textContent = `₹${product.price}`;
    document.getElementById('detailDesc').textContent = product.desc;
    document.getElementById('detailFullDesc').textContent = product.fullDesc;
    
    // Set up product meta info
    const metaInfo = `
      <p><strong>Category:</strong> ${product.category}</p>
      <p><strong>Available Sizes:</strong> ${product.sizes.join(', ')}</p>
    `;
    document.getElementById('detailMeta').innerHTML = metaInfo;
    
    // Set up product images
    const mainImage = document.getElementById('detailMainImage');
    const thumbnailsContainer = document.getElementById('detailThumbnails');
    
    if (product.images && product.images.length) {
      mainImage.style.backgroundImage = `url('${product.images[0]}')`;
      thumbnailsContainer.innerHTML = '';
      
      product.images.forEach((img, index) => {
        const thumb = document.createElement('div');
        thumb.className = 'product-detail-thumbnail';
        thumb.style.backgroundImage = `url('${img}')`;
        thumb.addEventListener('click', () => {
          mainImage.style.backgroundImage = `url('${img}')`;
        });
        thumbnailsContainer.appendChild(thumb);
      });
    }
    
    // Set up order button
    document.getElementById('detailOrderBtn').onclick = function() {
      startOrder(productId);
    };
    
    // Show product detail page
    showPage('productDetailPage');
  });
}

// Start order process
function startOrder(productId) {
  const productRef = ref(db, `products/${productId}`);
  onValue(productRef, (snapshot) => {
    selectedProduct = snapshot.val();
    if (!selectedProduct) return;
    
    document.getElementById('spTitle').textContent = selectedProduct.title;
    document.getElementById('spPrice').textContent = `₹${selectedProduct.price}`;
    
    // Size options
    const sizeSelect = document.getElementById('sizeSelect');
    sizeSelect.innerHTML = '<option value="">Select size</option>';
    selectedProduct.sizes.forEach(s => {
      sizeSelect.insertAdjacentHTML('beforeend', `<option>${s}</option>`);
    });
    
    // Setup quantity control
    const qtyInput = document.getElementById('qtySelect');
    qtyInput.value = '1';
    
    // Add event listeners to plus/minus buttons
    document.querySelector('.qty-minus').addEventListener('click', function() {
      let qty = parseInt(qtyInput.value);
      if (qty > 1) {
        qtyInput.value = qty - 1;
      }
    });
    
    document.querySelector('.qty-plus').addEventListener('click', function() {
      let qty = parseInt(qtyInput.value);
      qtyInput.value = qty + 1;
    });
    
    orderDraft.productId = productId;
    
    showPage('orderPage');
  });
}

// Show policy page
function showPolicy(policyType) {
  if (!window.policies) {
    showToast('Policies not loaded yet', 'error');
    return;
  }
  
  const policyTitleMap = {
    about: 'About Us',
    refund: 'Refund Policy',
    terms: 'Terms & Conditions',
    shipping: 'Shipping Policy',
    privacy: 'Privacy Policy'
  };
  
  document.getElementById('policyTitle').textContent = policyTitleMap[policyType] || 'Policy';
  document.getElementById('policyContent').textContent = window.policies[policyType] || 'Content not available.';
  
  showPage('policyPage');
}

// Place order
async function placeOrder(order) {
  try {
    const newRef = push(ref(db, "orders/"));
    await set(newRef, { 
      ...order, 
      timestamp: Date.now(), 
      status: "Pending" 
    });
    
    showToast('Order placed successfully!');
    showPage('successPage');
  } catch (error) {
    console.error('Error placing order:', error);
    showToast('Failed to place order. Please try again.', 'error');
  }
}

// Show toast notification
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');
  
  toastMessage.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.add('show');
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// Show page by id
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
}

// Set up event listeners
function setupEventListeners() {
  // Order process navigation
  document.getElementById('toUserInfo').addEventListener('click', () => {
    const size = document.getElementById('sizeSelect').value;
    const qty = Number(document.getElementById('qtySelect').value || 1);
    
    if (!size) {
      showToast('Please select a size', 'error');
      return;
    }
    
    orderDraft.size = size;
    orderDraft.qty = qty;
    
    showPage('userPage');
  });
  
  document.getElementById('backToProducts').addEventListener('click', () => {
    showPage('productsPage');
  });
  
  document.getElementById('editOrder').addEventListener('click', () => {
    showPage('orderPage');
  });
  
  document.getElementById('toPayment').addEventListener('click', () => {
    const fullname = document.getElementById('fullname').value.trim();
    const mobile = document.getElementById('mobile').value.trim();
    const pincode = document.getElementById('pincode').value.trim();
    const city = document.getElementById('city').value.trim();
    const state = document.getElementById('state').value.trim();
    const house = document.getElementById('house').value.trim();
    
    if (!fullname || !mobile || !pincode || !city || !state || !house) {
      showToast('Please fill all required fields', 'error');
      return;
    }
    
    if (!/^\d{10}$/.test(mobile)) {
      showToast('Enter a valid 10-digit mobile number', 'error');
      return;
    }
    
    orderDraft.fullname = fullname;
    orderDraft.mobile = mobile;
    orderDraft.pincode = pincode;
    orderDraft.city = city;
    orderDraft.state = state;
    orderDraft.house = house;
    
    const price = selectedProduct.price * orderDraft.qty;
    const delivery = 50;
    const total = price + delivery;
    
    document.getElementById('sumProduct').textContent = selectedProduct.title;
    document.getElementById('sumQty').textContent = orderDraft.qty;
    document.getElementById('sumPrice').textContent = `₹${price}`;
    document.getElementById('sumTotal').textContent = `₹${total}`;
    
    showPage('paymentPage');
  });
  
  document.getElementById('payBack').addEventListener('click', () => {
    showPage('userPage');
  });
  
  document.getElementById('confirmOrder').addEventListener('click', () => {
    const payment = document.querySelector('input[name="pay"]:checked').value;
    orderDraft.payment = payment;
    orderDraft.timestamp = Date.now();
    
    placeOrder(orderDraft);
  });
  
  document.getElementById('goHome').addEventListener('click', () => {
    showPage('productsPage');
  });
  
  // Header buttons
  document.getElementById('openContact').addEventListener('click', () => {
    showPolicy('about');
  });
  
  // Search functionality
  document.getElementById('searchInput').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    
    const productsRef = ref(db, "products/");
    onValue(productsRef, (snapshot) => {
      const products = snapshot.val() || {};
      const filteredProducts = {};
      
      Object.entries(products).forEach(([id, product]) => {
        if (
          product.title.toLowerCase().includes(query) ||
          product.desc.toLowerCase().includes(query) ||
          product.category.toLowerCase().includes(query)
        ) {
          filteredProducts[id] = product;
        }
      });
      
      renderProducts(filteredProducts);
    });
  });
}