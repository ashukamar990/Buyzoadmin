// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAMDAW2Gvsh8qJY5gZoFvgiMHxO5qjQl-I",
  authDomain: "videoapp-67c32.firebaseapp.com",
  databaseURL: "https://videoapp-67c32-default-rtdb.firebaseio.com",
  projectId: "videoapp-67c32",
  storageBucket: "videoapp-67c32.firebasestorage.app",
  messagingSenderId: "711675594877",
  appId: "1:711675594877:web:7786ab4a432d60e6f70914"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Firebase database references
const productsRef = database.ref('products');
const ordersRef = database.ref('orders');
const policiesRef = database.ref('policies');

// Admin State
let currentAdminTab = 'dashboard';
let currentProductsPage = 1;
let currentOrdersPage = 1;
let currentCustomersPage = 1;
let productsPerPage = 10;
let ordersPerPage = 10;
let customersPerPage = 10;
let uploadedImages = [];
let allProducts = [];
let allOrders = [];

// Initialize admin panel
function initAdminPanel() {
  // Check if user is logged in
  const isLoggedIn = localStorage.getItem('admin_logged_in') === 'true';
  
  if (isLoggedIn) {
    document.getElementById('adminLoginPage').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'block';
    loadDashboardData();
    loadProducts();
    loadOrders();
    loadTrendingProducts();
    loadCustomers();
    loadPolicies();
  } else {
    document.getElementById('adminLoginPage').style.display = 'flex';
    document.getElementById('adminPanel').style.display = 'none';
  }
  
  // Setup tab navigation
  document.querySelectorAll('.admin-nav a').forEach(tab => {
    tab.addEventListener('click', function(e) {
      e.preventDefault();
      if (this.dataset.tab) {
        showTab(this.dataset.tab);
      }
    });
  });
  
  // Setup policy tabs
  document.querySelectorAll('.admin-tabs .tab').forEach(tab => {
    tab.addEventListener('click', function() {
      const policy = this.dataset.policy;
      showPolicyTab(policy);
    });
  });
  
  // Setup search and filters
  document.getElementById('productSearch').addEventListener('input', filterProducts);
  document.getElementById('categoryFilter').addEventListener('change', filterProducts);
  document.getElementById('orderSearch').addEventListener('input', filterOrders);
  document.getElementById('statusFilter').addEventListener('change', filterOrders);
  document.getElementById('dateFilter').addEventListener('change', filterOrders);
  document.getElementById('customerSearch').addEventListener('input', filterCustomers);
  
  // Select all orders checkbox
  document.getElementById('selectAllOrders').addEventListener('change', function() {
    const checkboxes = document.querySelectorAll('#ordersTable input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
      checkbox.checked = this.checked;
    });
  });
}

// Admin login function
function adminLogin() {
  const email = document.getElementById('adminEmail').value;
  const password = document.getElementById('adminPassword').value;
  
  // Simple validation - in a real app, this would call an API
  if (email === 'admin@buyzo.com' && password === 'admin123') {
    localStorage.setItem('admin_logged_in', 'true');
    document.getElementById('adminLoginPage').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'block';
    loadDashboardData();
  } else {
    alert('Invalid credentials. Try admin@buyzo.com / admin123');
  }
}

// Logout function
function logout() {
  localStorage.removeItem('admin_logged_in');
  document.getElementById('adminLoginPage').style.display = 'flex';
  document.getElementById('adminPanel').style.display = 'none';
}

// Toggle sidebar on mobile
function toggleSidebar() {
  document.getElementById('adminSidebar').classList.toggle('active');
}

// Show specific tab
function showTab(tabName) {
  // Hide all tabs
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  
  // Remove active class from all nav items
  document.querySelectorAll('.admin-nav a').forEach(nav => {
    nav.classList.remove('active');
  });
  
  // Show selected tab
  document.getElementById(tabName).classList.add('active');
  
  // Set active nav item
  document.querySelector(`.admin-nav a[data-tab="${tabName}"]`).classList.add('active');
  
  // Update page title
  document.getElementById('adminPageTitle').textContent = 
    tabName.charAt(0).toUpperCase() + tabName.slice(1);
  
  currentAdminTab = tabName;
  
  // Load data if needed
  if (tabName === 'dashboard') {
    loadDashboardData();
  } else if (tabName === 'products') {
    loadProducts();
  } else if (tabName === 'orders') {
    loadOrders();
  } else if (tabName === 'trending') {
    loadTrendingProducts();
  } else if (tabName === 'customers') {
    loadCustomers();
  } else if (tabName === 'policies') {
    loadPolicies();
  }
}

// Show policy tab
function showPolicyTab(policy) {
  // Remove active class from all policy tabs
  document.querySelectorAll('.admin-tabs .tab').forEach(tab => {
    tab.classList.remove('active');
  });
  
  // Hide all policy contents
  document.querySelectorAll('.policy-content').forEach(content => {
    content.classList.remove('active');
  });
  
  // Activate selected tab and content
  document.querySelector(`.tab[data-policy="${policy}"]`).classList.add('active');
  document.querySelector(`.policy-content[data-policy="${policy}"]`).classList.add('active');
}

// Calculate earnings data
function calculateEarnings(orders, products) {
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  
  let totalEarnings = 0;
  let lastWeekEarnings = 0;
  let previousWeekEarnings = 0;
  let lastMonthEarnings = 0;
  let previousMonthEarnings = 0;
  
  orders.forEach(order => {
    const product = products.find(p => p.id === order.productId);
    if (product) {
      const orderValue = product.price * order.qty;
      const orderDate = new Date(order.timestamp);
      
      totalEarnings += orderValue;
      
      // Last week earnings (last 7 days)
      if (orderDate >= oneWeekAgo) {
        lastWeekEarnings += orderValue;
      }
      
      // Previous week earnings (7-14 days ago)
      if (orderDate >= twoWeeksAgo && orderDate < oneWeekAgo) {
        previousWeekEarnings += orderValue;
      }
      
      // Last month earnings (last 30 days)
      if (orderDate >= oneMonthAgo) {
        lastMonthEarnings += orderValue;
      }
      
      // Previous month earnings (30-60 days ago)
      if (orderDate >= twoMonthsAgo && orderDate < oneMonthAgo) {
        previousMonthEarnings += orderValue;
      }
    }
  });
  
  // Calculate trends
  const weeklyTrend = previousWeekEarnings > 0 
    ? ((lastWeekEarnings - previousWeekEarnings) / previousWeekEarnings) * 100 
    : lastWeekEarnings > 0 ? 100 : 0;
    
  const monthlyTrend = previousMonthEarnings > 0 
    ? ((lastMonthEarnings - previousMonthEarnings) / previousMonthEarnings) * 100 
    : lastMonthEarnings > 0 ? 100 : 0;
  
  return {
    totalEarnings,
    lastWeekEarnings,
    lastMonthEarnings,
    weeklyTrend,
    monthlyTrend
  };
}

// Load dashboard data
function loadDashboardData() {
  // Load products and orders from Firebase
  productsRef.once('value').then(productsSnapshot => {
    const products = productsSnapshot.val() || {};
    const productsArray = Object.keys(products).map(key => ({ id: key, ...products[key] }));
    allProducts = productsArray;
    
    ordersRef.once('value').then(ordersSnapshot => {
      const orders = ordersSnapshot.val() || {};
      const ordersArray = Object.keys(orders).map(key => ({ id: key, ...orders[key] }));
      allOrders = ordersArray;
      
      const trendingProducts = productsArray.filter(p => p.trending);
      
      // Update stats
      document.getElementById('totalProducts').textContent = productsArray.length;
      document.getElementById('totalOrders').textContent = ordersArray.length;
      document.getElementById('pendingOrders').textContent = ordersArray.filter(o => o.status === 'Pending').length;
      document.getElementById('trendingProducts').textContent = trendingProducts.length;
      
      // Calculate and update earnings
      const earnings = calculateEarnings(ordersArray, productsArray);
      document.getElementById('totalEarnings').textContent = `₹${earnings.totalEarnings.toLocaleString()}`;
      document.getElementById('lastWeekEarnings').textContent = `₹${earnings.lastWeekEarnings.toLocaleString()}`;
      document.getElementById('lastMonthEarnings').textContent = `₹${earnings.lastMonthEarnings.toLocaleString()}`;
      
      // Update trends
      updateTrendElement('lastWeekTrend', earnings.weeklyTrend);
      updateTrendElement('lastMonthTrend', earnings.monthlyTrend);
      
      // Load recent orders
      const recentOrders = ordersArray.slice(-5).reverse();
      const recentOrdersHtml = recentOrders.map(order => {
        const product = productsArray.find(p => p.id === order.productId);
        return `
          <tr>
            <td>#${order.id || 'N/A'}</td>
            <td>${order.fullname}</td>
            <td>${product ? product.title : 'Unknown Product'}</td>
            <td>₹${product ? product.price * order.qty : 'N/A'}</td>
            <td><span class="badge ${getStatusBadgeClass(order.status)}">${order.status || 'Pending'}</span></td>
            <td>${new Date(order.timestamp).toLocaleDateString()}</td>
          </tr>
        `;
      }).join('');
      
      document.getElementById('recentOrders').innerHTML = recentOrdersHtml || '<tr><td colspan="6" style="text-align: center">No orders found</td></tr>';
    });
  });
}

// Update trend element with appropriate icon and color
function updateTrendElement(elementId, trendValue) {
  const element = document.getElementById(elementId);
  const valueElement = element.querySelector('span:last-child');
  const iconElement = element.querySelector('i');
  
  valueElement.textContent = `${Math.abs(trendValue).toFixed(1)}%`;
  
  if (trendValue >= 0) {
    element.className = 'earnings-trend';
    iconElement.className = 'fas fa-caret-up trend-up';
  } else {
    element.className = 'earnings-trend';
    iconElement.className = 'fas fa-caret-down trend-down';
  }
}

// Get status badge class
function getStatusBadgeClass(status) {
  switch(status) {
    case 'Delivered': return 'badge-success';
    case 'Shipped': return 'badge-info';
    case 'Confirmed': return 'badge-info';
    case 'Cancelled': return 'badge-error';
    default: return 'badge-warning';
  }
}

// Load products
function loadProducts() {
  productsRef.once('value').then(snapshot => {
    const products = snapshot.val() || {};
    const productsArray = Object.keys(products).map(key => ({ id: key, ...products[key] }));
    allProducts = productsArray;
    
    const filteredProducts = filterProductsList(productsArray);
    const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
    
    // Update pagination
    updatePagination('productsPagination', currentProductsPage, totalPages, 'products');
    
    // Get products for current page
    const startIndex = (currentProductsPage - 1) * productsPerPage;
    const paginatedProducts = filteredProducts.slice(startIndex, startIndex + productsPerPage);
    
    // Render products table
    const productsHtml = paginatedProducts.map(product => {
      return `
        <tr>
          <td><img src="${product.images[0]}" width="50" height="50" style="object-fit: cover; border-radius: 6px"></td>
          <td>${product.title}</td>
          <td>${product.category}</td>
          <td>₹${product.price}</td>
          <td>${product.trending ? '<span class="badge badge-success">Yes</span>' : '<span class="badge badge-warning">No</span>'}</td>
          <td>
            <div class="action-buttons">
              <button class="btn secondary btn-sm" onclick="editProduct('${product.id}')"><i class="fas fa-edit"></i></button>
              <button class="btn error btn-sm" onclick="deleteProductConfirm('${product.id}')"><i class="fas fa-trash"></i></button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
    
    document.getElementById('productsTable').innerHTML = productsHtml || '<tr><td colspan="6" style="text-align: center">No products found</td></tr>';
  });
}

// Filter products list
function filterProductsList(products) {
  const searchTerm = document.getElementById('productSearch').value.toLowerCase();
  const category = document.getElementById('categoryFilter').value;
  
  return products.filter(product => {
    const matchesSearch = product.title.toLowerCase().includes(searchTerm) || 
                         product.desc.toLowerCase().includes(searchTerm);
    const matchesCategory = !category || product.category === category;
    
    return matchesSearch && matchesCategory;
  });
}

// Filter products
function filterProducts() {
  currentProductsPage = 1;
  loadProducts();
}

// Load orders
function loadOrders() {
  ordersRef.once('value').then(ordersSnapshot => {
    const orders = ordersSnapshot.val() || {};
    const ordersArray = Object.keys(orders).map(key => ({ id: key, ...orders[key] }));
    allOrders = ordersArray;
    
    const filteredOrders = filterOrdersList(ordersArray, allProducts);
    const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);
    
    // Update pagination
    updatePagination('ordersPagination', currentOrdersPage, totalPages, 'orders');
    
    // Get orders for current page
    const startIndex = (currentOrdersPage - 1) * ordersPerPage;
    const paginatedOrders = filteredOrders.slice(startIndex, startIndex + ordersPerPage);
    
    // Render orders table
    const ordersHtml = paginatedOrders.map(order => {
      const product = allProducts.find(p => p.id === order.productId);
      return `
        <tr>
          <td><input type="checkbox" value="${order.id}"></td>
          <td>#${order.id || 'N/A'}</td>
          <td>${order.fullname}<br><small>${order.mobile}</small></td>
          <td>${product ? product.title : 'Unknown Product'} (x${order.qty})</td>
          <td>₹${product ? product.price * order.qty : 'N/A'}</td>
          <td>
            <select onchange="updateOrderStatus('${order.id}', this.value)" class="status-select">
              <option value="Pending" ${order.status === 'Pending' ? 'selected' : ''}>Pending</option>
              <option value="Confirmed" ${order.status === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
              <option value="Shipped" ${order.status === 'Shipped' ? 'selected' : ''}>Shipped</option>
              <option value="Delivered" ${order.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
              <option value="Cancelled" ${order.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
            </select>
          </td>
          <td>${new Date(order.timestamp).toLocaleDateString()}</td>
          <td>
            <button class="btn secondary btn-sm" onclick="viewOrderDetails('${order.id}')"><i class="fas fa-eye"></i></button>
          </td>
        </tr>
      `;
    }).join('');
    
    document.getElementById('ordersTable').innerHTML = ordersHtml || '<tr><td colspan="8" style="text-align: center">No orders found</td></tr>';
  });
}

// Filter orders list
function filterOrdersList(orders, products) {
  const searchTerm = document.getElementById('orderSearch').value.toLowerCase();
  const status = document.getElementById('statusFilter').value;
  const date = document.getElementById('dateFilter').value;
  
  return orders.filter(order => {
    const product = products.find(p => p.id === order.productId);
    const productName = product ? product.title.toLowerCase() : '';
    const matchesSearch = order.fullname.toLowerCase().includes(searchTerm) || 
                         order.mobile.includes(searchTerm) ||
                         productName.includes(searchTerm);
    const matchesStatus = !status || order.status === status;
    const matchesDate = !date || new Date(order.timestamp).toLocaleDateString() === new Date(date).toLocaleDateString();
    
    return matchesSearch && matchesStatus && matchesDate;
  });
}

// Filter orders
function filterOrders() {
  currentOrdersPage = 1;
  loadOrders();
}

// Update order status
function updateOrderStatus(orderId, status) {
  ordersRef.child(orderId).update({ status: status })
    .then(() => {
      loadOrders();
      
      // If on dashboard, refresh it too
      if (currentAdminTab === 'dashboard') {
        loadDashboardData();
      }
    })
    .catch(error => {
      alert('Error updating order status: ' + error.message);
    });
}

// Apply bulk action to orders
function applyBulkAction() {
  const status = document.getElementById('bulkStatusAction').value;
  if (!status) {
    alert('Please select a status action');
    return;
  }
  
  const checkboxes = document.querySelectorAll('#ordersTable input[type="checkbox"]:checked');
  if (checkboxes.length === 0) {
    alert('Please select at least one order');
    return;
  }
  
  // Check if trying to update more than 100 orders
  if (checkboxes.length > 100) {
    alert('You can only update up to 100 orders at a time');
    return;
  }
  
  if (!confirm(`Are you sure you want to update ${checkboxes.length} order(s) to ${status}?`)) {
    return;
  }
  
  const updates = {};
  checkboxes.forEach(checkbox => {
    updates[`${checkbox.value}/status`] = status;
  });
  
  ordersRef.update(updates)
    .then(() => {
      loadOrders();
      
      // If on dashboard, refresh it too
      if (currentAdminTab === 'dashboard') {
        loadDashboardData();
      }
      
      // Uncheck select all
      document.getElementById('selectAllOrders').checked = false;
    })
    .catch(error => {
      alert('Error updating orders: ' + error.message);
    });
}

// View order details
function viewOrderDetails(orderId) {
  ordersRef.child(orderId).once('value').then(snapshot => {
    const order = snapshot.val();
    if (!order) {
      alert('Order not found');
      return;
    }
    
    const product = allProducts.find(p => p.id === order.productId);
    
    const detailsHtml = `
      <h3>Order Details #${orderId}</h3>
      <p><strong>Customer:</strong> ${order.fullname}</p>
      <p><strong>Mobile:</strong> ${order.mobile}</p>
      <p><strong>Address:</strong> ${order.house}, ${order.city}, ${order.state} - ${order.pincode}</p>
      <p><strong>Product:</strong> ${product ? product.title : 'Unknown'} (x${order.qty})</p>
      <p><strong>Amount:</strong> ₹${product ? product.price * order.qty : 'N/A'}</p>
      <p><strong>Status:</strong> ${order.status || 'Pending'}</p>
      <p><strong>Order Date:</strong> ${new Date(order.timestamp).toLocaleString()}</p>
      <p><strong>Payment Method:</strong> ${order.payment === 'prepaid' ? 'Prepaid' : 'Cash on Delivery'}</p>
    `;
    
    alert(detailsHtml);
  });
}

// Load trending products
function loadTrendingProducts() {
  productsRef.once('value').then(snapshot => {
    const products = snapshot.val() || {};
    const productsArray = Object.keys(products).map(key => ({ id: key, ...products[key] }));
    
    const trendingHtml = productsArray.map(product => {
      return `
        <tr>
          <td><img src="${product.images[0]}" width="50" height="50" style="object-fit: cover; border-radius: 6px"></td>
          <td>${product.title}</td>
          <td>₹${product.price}</td>
          <td>${product.trending ? '<span class="badge badge-success">Yes</span>' : '<span class="badge badge-warning">No</span>'}</td>
          <td>
            <div class="action-buttons">
              <button class="btn ${product.trending ? 'error' : 'success'} btn-sm" onclick="toggleTrending('${product.id}', ${!product.trending})">
                <i class="fas ${product.trending ? 'fa-times' : 'fa-fire'}"></i> 
                ${product.trending ? 'Remove' : 'Add'}
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
    
    document.getElementById('trendingTable').innerHTML = trendingHtml || '<tr><td colspan="5" style="text-align: center">No products found</td></tr>';
  });
}

// Toggle trending status
function toggleTrending(productId, isTrending) {
  productsRef.child(productId).update({ trending: isTrending })
    .then(() => {
      loadTrendingProducts();
      
      // If on dashboard, refresh it too
      if (currentAdminTab === 'dashboard') {
        loadDashboardData();
      }
    })
    .catch(error => {
      alert('Error updating product: ' + error.message);
    });
}

// Load customers
function loadCustomers() {
  ordersRef.once('value').then(snapshot => {
    const orders = snapshot.val() || {};
    const ordersArray = Object.keys(orders).map(key => ({ id: key, ...orders[key] }));
    
    // Extract unique customers based on mobile number
    const customersMap = {};
    ordersArray.forEach(order => {
      if (!customersMap[order.mobile]) {
        customersMap[order.mobile] = {
          name: order.fullname,
          mobile: order.mobile,
          email: order.email || 'N/A',
          location: `${order.city}, ${order.state}`,
          orderCount: 1,
          lastOrder: order.timestamp
        };
      } else {
        customersMap[order.mobile].orderCount++;
        if (new Date(order.timestamp) > new Date(customersMap[order.mobile].lastOrder)) {
          customersMap[order.mobile].lastOrder = order.timestamp;
        }
      }
    });
    
    const customers = Object.values(customersMap);
    const filteredCustomers = filterCustomersList(customers);
    const totalPages = Math.ceil(filteredCustomers.length / customersPerPage);
    
    // Update pagination
    updatePagination('customersPagination', currentCustomersPage, totalPages, 'customers');
    
    // Get customers for current page
    const startIndex = (currentCustomersPage - 1) * customersPerPage;
    const paginatedCustomers = filteredCustomers.slice(startIndex, startIndex + customersPerPage);
    
    // Render customers table
    const customersHtml = paginatedCustomers.map(customer => {
      return `
        <tr>
          <td>${customer.name}</td>
          <td>${customer.mobile}</td>
          <td>${customer.email}</td>
          <td>${customer.location}</td>
          <td>${customer.orderCount}</td>
          <td>${new Date(customer.lastOrder).toLocaleDateString()}</td>
        </tr>
      `;
    }).join('');
    
    document.getElementById('customersTable').innerHTML = customersHtml || '<tr><td colspan="6" style="text-align: center">No customers found</td></tr>';
  });
}

// Filter customers list
function filterCustomersList(customers) {
  const searchTerm = document.getElementById('customerSearch').value.toLowerCase();
  
  return customers.filter(customer => {
    return customer.name.toLowerCase().includes(searchTerm) || 
           customer.mobile.includes(searchTerm) ||
           customer.email.toLowerCase().includes(searchTerm) ||
           customer.location.toLowerCase().includes(searchTerm);
  });
}

// Filter customers
function filterCustomers() {
  currentCustomersPage = 1;
  loadCustomers();
}

// Load policies
function loadPolicies() {
  policiesRef.once('value').then(snapshot => {
    const policies = snapshot.val() || {};
    
    // Set policy content
    document.getElementById('aboutContent').value = policies.about || '';
    document.getElementById('refundContent').value = policies.refund || '';
    document.getElementById('termsContent').value = policies.terms || '';
    document.getElementById('shippingContent').value = policies.shipping || '';
    document.getElementById('privacyContent').value = policies.privacy || '';
  });
}

// Save policy
function savePolicy(policyType) {
  const content = document.getElementById(`${policyType}Content`).value;
  
  policiesRef.update({ [policyType]: content })
    .then(() => {
      alert(`${policyType.charAt(0).toUpperCase() + policyType.slice(1)} policy saved successfully!`);
    })
    .catch(error => {
      alert('Error saving policy: ' + error.message);
    });
}

// Show add product modal
function showAddProductModal() {
  // Reset form
  document.getElementById('productName').value = '';
  document.getElementById('productPrice').value = '';
  document.getElementById('productCategory').value = '';
  document.getElementById('productDesc').value = '';
  document.getElementById('productFullDesc').value = '';
  document.getElementById('productSizes').value = '';
  document.getElementById('productTrending').checked = false;
  document.getElementById('imagePreview').innerHTML = '';
  uploadedImages = [];
  
  // Show modal
  document.getElementById('addProductModal').classList.add('active');
}

// Handle image upload
function handleImageUpload(input) {
  if (input.files && input.files.length > 0) {
    const preview = document.getElementById('imagePreview');
    
    Array.from(input.files).forEach(file => {
      const reader = new FileReader();
      
      reader.onload = function(e) {
        // Store image data
        uploadedImages.push(e.target.result);
        
        // Create preview
        const previewItem = document.createElement('div');
        previewItem.className = 'preview-item';
        previewItem.innerHTML = `
          <img src="${e.target.result}" alt="Preview">
          <div class="remove-image" onclick="removeImage(this)">&times;</div>
        `;
        
        preview.appendChild(previewItem);
      };
      
      reader.readAsDataURL(file);
    });
  }
}

// Remove image from upload preview
function removeImage(button) {
  const previewItem = button.parentElement;
  const imgSrc = previewItem.querySelector('img').src;
  const index = uploadedImages.indexOf(imgSrc);
  
  if (index !== -1) {
    uploadedImages.splice(index, 1);
  }
  
  previewItem.remove();
}

// Save product
function saveProduct() {
  const name = document.getElementById('productName').value;
  const price = document.getElementById('productPrice').value;
  const category = document.getElementById('productCategory').value;
  const desc = document.getElementById('productDesc').value;
  const fullDesc = document.getElementById('productFullDesc').value;
  const sizes = document.getElementById('productSizes').value.split(',').map(s => s.trim());
  const trending = document.getElementById('productTrending').checked;
  
  // Validation
  if (!name || !price || !category || !desc) {
    alert('Please fill in all required fields');
    return;
  }
  
  if (uploadedImages.length === 0) {
    alert('Please upload at least one product image');
    return;
  }
  
  // Create new product
  const newProduct = {
    title: name,
    price: parseInt(price),
    desc: desc,
    fullDesc: fullDesc,
    images: uploadedImages,
    sizes: sizes,
    category: category,
    trending: trending
  };
  
  // Add to Firebase
  productsRef.push(newProduct)
    .then(() => {
      // Close modal and refresh products list
      closeModal('addProductModal');
      loadProducts();
      loadTrendingProducts();
      
      // If on dashboard, refresh it too
      if (currentAdminTab === 'dashboard') {
        loadDashboardData();
      }
      
      alert('Product added successfully!');
    })
    .catch(error => {
      alert('Error adding product: ' + error.message);
    });
}

// Edit product
function editProduct(productId) {
  productsRef.child(productId).once('value').then(snapshot => {
    const product = snapshot.val();
    
    if (!product) {
      alert('Product not found');
      return;
    }
    
    // Fill form with product data
    document.getElementById('editProductId').value = productId;
    document.getElementById('editProductName').value = product.title;
    document.getElementById('editProductPrice').value = product.price;
    document.getElementById('editProductCategory').value = product.category;
    document.getElementById('editProductDesc').value = product.desc;
    document.getElementById('editProductFullDesc').value = product.fullDesc;
    document.getElementById('editProductSizes').value = product.sizes.join(', ');
    document.getElementById('editProductTrending').checked = product.trending || false;
    
    // Show modal
    document.getElementById('editProductModal').classList.add('active');
  });
}

// Update product
function updateProduct() {
  const productId = document.getElementById('editProductId').value;
  const name = document.getElementById('editProductName').value;
  const price = document.getElementById('editProductPrice').value;
  const category = document.getElementById('editProductCategory').value;
  const desc = document.getElementById('editProductDesc').value;
  const fullDesc = document.getElementById('editProductFullDesc').value;
  const sizes = document.getElementById('editProductSizes').value.split(',').map(s => s.trim());
  const trending = document.getElementById('editProductTrending').checked;
  
  // Validation
  if (!name || !price || !category || !desc) {
    alert('Please fill in all required fields');
    return;
  }
  
  // Update product in Firebase
  productsRef.child(productId).update({
    title: name,
    price: parseInt(price),
    desc: desc,
    fullDesc: fullDesc,
    sizes: sizes,
    category: category,
    trending: trending
  })
  .then(() => {
    // Close modal and refresh products list
    closeModal('editProductModal');
    loadProducts();
    loadTrendingProducts();
    
    // If on dashboard, refresh it too
    if (currentAdminTab === 'dashboard') {
      loadDashboardData();
    }
    
    alert('Product updated successfully!');
  })
  .catch(error => {
    alert('Error updating product: ' + error.message);
  });
}

// Delete product confirmation
function deleteProductConfirm(productId) {
  if (confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
    deleteProduct(productId);
  }
}

// Delete product
function deleteProduct(productId) {
  productsRef.child(productId).remove()
    .then(() => {
      // Close modal and refresh products list
      closeModal('editProductModal');
      loadProducts();
      loadTrendingProducts();
      
      // If on dashboard, refresh it too
      if (currentAdminTab === 'dashboard') {
        loadDashboardData();
      }
      
      alert('Product deleted successfully!');
    })
    .catch(error => {
      alert('Error deleting product: ' + error.message);
    });
}

// Export orders
function exportOrders() {
  ordersRef.once('value').then(ordersSnapshot => {
    const orders = ordersSnapshot.val() || {};
    const ordersArray = Object.keys(orders).map(key => ({ id: key, ...orders[key] }));
    
    if (ordersArray.length === 0) {
      alert('No orders to export');
      return;
    }
    
    // Create CSV content
    let csv = 'Order ID,Customer,Product,Quantity,Amount,Status,Date\n';
    
    ordersArray.forEach(order => {
      const product = allProducts.find(p => p.id === order.productId);
      csv += `"${order.id || 'N/A'}","${order.fullname}","${product ? product.title : 'Unknown'}","${order.qty}","${product ? product.price * order.qty : 'N/A'}","${order.status || 'Pending'}","${new Date(order.timestamp).toLocaleDateString()}"\n`;
    });
    
    // Create download link
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `buyzo_orders_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });
}

// Export customers
function exportCustomers() {
  ordersRef.once('value').then(snapshot => {
    const orders = snapshot.val() || {};
    const ordersArray = Object.keys(orders).map(key => ({ id: key, ...orders[key] }));
    
    if (ordersArray.length === 0) {
      alert('No customer data to export');
      return;
    }
    
    // Extract unique customers based on mobile number
    const customersMap = {};
    ordersArray.forEach(order => {
      if (!customersMap[order.mobile]) {
        customersMap[order.mobile] = {
          name: order.fullname,
          mobile: order.mobile,
          email: order.email || 'N/A',
          location: `${order.city}, ${order.state}`,
          orderCount: 1
        };
      } else {
        customersMap[order.mobile].orderCount++;
      }
    });
    
    const customers = Object.values(customersMap);
    
    // Create CSV content
    let csv = 'Name,Mobile,Email,Location,Orders\n';
    
    customers.forEach(customer => {
      csv += `"${customer.name}","${customer.mobile}","${customer.email}","${customer.location}","${customer.orderCount}"\n`;
    });
    
    // Create download link
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `buyzo_customers_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });
}

// Close modal
function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
}

// Update pagination
function updatePagination(elementId, currentPage, totalPages, type) {
  const pagination = document.getElementById(elementId);
  
  if (totalPages <= 1) {
    pagination.innerHTML = '';
    return;
  }
  
  let html = '';
  
  // Previous button
  if (currentPage > 1) {
    html += `<div class="page-item" onclick="changePage('${type}', ${currentPage - 1})">&laquo;</div>`;
  }
  
  // Page numbers
  const startPage = Math.max(1, currentPage - 2);
  const endPage = Math.min(totalPages, startPage + 4);
  
  for (let i = startPage; i <= endPage; i++) {
    html += `<div class="page-item ${i === currentPage ? 'active' : ''}" onclick="changePage('${type}', ${i})">${i}</div>`;
  }
  
  // Next button
  if (currentPage < totalPages) {
    html += `<div class="page-item" onclick="changePage('${type}', ${currentPage + 1})">&raquo;</div>`;
  }
  
  pagination.innerHTML = html;
}

// Change page
function changePage(type, page) {
  if (type === 'products') {
    currentProductsPage = page;
    loadProducts();
  } else if (type === 'orders') {
    currentOrdersPage = page;
    loadOrders();
  } else if (type === 'customers') {
    currentCustomersPage = page;
    loadCustomers();
  }
  
  // Scroll to top
  window.scrollTo(0, 0);
}

// Initialize when page loads
window.addEventListener('DOMContentLoaded', initAdminPanel);