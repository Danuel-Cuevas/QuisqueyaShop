// Configuration - Auto-detect environment
const isLocal = window.location.hostname === 'localhost' || 
                window.location.hostname === '127.0.0.1' || 
                window.location.hostname === '' ||
                (typeof window.isLocalEnv !== 'undefined' && window.isLocalEnv);

// API URLs - Adapt based on environment
const PROJECT_ID = 'vendeloya-2e40d';
const REGION = 'us-central1';

const API_BASE = isLocal 
    ? `http://127.0.0.1:5001/${PROJECT_ID}/${REGION}/apiGateway`
    : `https://${REGION}-${PROJECT_ID}.cloudfunctions.net/apiGateway`;

const AUTH_BASE = isLocal
    ? `http://127.0.0.1:5001/${PROJECT_ID}/${REGION}/usersService`
    : `https://${REGION}-${PROJECT_ID}.cloudfunctions.net/usersService`;

const FIREBASE_AUTH_URL = isLocal 
    ? 'http://127.0.0.1:9099' 
    : 'https://identitytoolkit.googleapis.com';

// State
let currentUser = null;
let authToken = null;
let products = [];
let cart = null;
let orders = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadLocalCart(); // Load local cart if exists
    loadProducts();
    loadAppSettings(); // Load app settings (logo, etc.)
    showSection('products');
});

// Load local cart from localStorage
function loadLocalCart() {
    const savedCart = localStorage.getItem('localCart');
    if (savedCart) {
        try {
            cart = JSON.parse(savedCart);
            if (cart && cart.items) {
                renderCart();
            }
        } catch (e) {
            cart = null;
        }
    }
}

async function checkAuth() {
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('user');
    
    if (token && user) {
        authToken = token;
        currentUser = JSON.parse(user);
        updateAuthUI();
        loadCart();
        loadOrders();
    }
}

function updateAuthUI() {
    const loginBtn = document.getElementById('login-btn');
    const userInfo = document.getElementById('user-info');
    const userName = document.getElementById('user-name');
    const adminBtn = document.getElementById('admin-btn');
    const profileBtn = document.getElementById('profile-btn');
    
    if (currentUser && authToken) {
        // User is logged in
        if (loginBtn) loginBtn.style.display = 'none';
        if (userInfo) {
            userInfo.style.display = 'flex';
            userInfo.style.gap = '1rem';
            userInfo.style.alignItems = 'center';
        }
        // Update user name
        if (userName) {
            userName.textContent = currentUser.displayName || currentUser.email;
        }
        
        // Update user avatar
        const avatarImg = document.getElementById('user-avatar-img');
        const avatarPlaceholder = document.getElementById('user-avatar-placeholder');
        if (currentUser.photoURL) {
            if (avatarImg) {
                avatarImg.src = currentUser.photoURL;
                avatarImg.style.display = 'block';
            }
            if (avatarPlaceholder) avatarPlaceholder.style.display = 'none';
        } else {
            if (avatarImg) avatarImg.style.display = 'none';
            if (avatarPlaceholder) avatarPlaceholder.style.display = 'block';
        }
        
        // Show profile button for all logged in users
        if (profileBtn) profileBtn.style.display = 'block';
        
        // Show admin button only for admins
        if (adminBtn) {
            if (currentUser.role === 'admin') {
                adminBtn.style.display = 'block';
            } else {
                adminBtn.style.display = 'none';
            }
        }
    } else {
        // User is logged out
        if (loginBtn) loginBtn.style.display = 'block';
        if (userInfo) userInfo.style.display = 'none';
        if (adminBtn) adminBtn.style.display = 'none';
        if (profileBtn) profileBtn.style.display = 'none';
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;

    try {
        // Register user via backend service
        const response = await fetch(`${AUTH_BASE}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, displayName: name })
        });

        const data = await response.json();
        
        if (response.ok) {
            showToast(`Usuario creado: ${email}. Ahora puedes iniciar sesión.`, 'success');
            showLogin();
        } else {
            showToast(data.error || 'Error al registrarse', 'error');
        }
    } catch (error) {
        showToast('Error de conexión: ' + error.message, 'error');
        console.error('Registration error:', error);
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        // Use Firebase Auth SDK
        const { signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
        const auth = window.firebaseAuth;
        
        if (!auth) {
            throw new Error('Firebase Auth no está inicializado');
        }

        // Sign in with email and password
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const firebaseUser = userCredential.user;
        
        // Get ID token
        const idToken = await firebaseUser.getIdToken();
        
        // Get user profile from our service
        let userProfile = null;
        try {
            const profileResponse = await fetch(`${AUTH_BASE}/profile/${firebaseUser.uid}`, {
                headers: {
                    'Authorization': `Bearer ${idToken}`
                }
            });
            
            if (profileResponse.ok) {
                userProfile = await profileResponse.json();
            }
        } catch (profileError) {
            console.warn('Could not fetch user profile:', profileError);
        }

        // If profile doesn't exist, create basic one
        if (!userProfile) {
            userProfile = {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName || email.split('@')[0],
                role: 'user'
            };
        }

        // Get custom claims from token
        const tokenResult = await firebaseUser.getIdTokenResult();
        const role = tokenResult.claims.role || userProfile.role || 'user';

        // Store auth data
        authToken = idToken;
        currentUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: userProfile.displayName || firebaseUser.displayName || email.split('@')[0],
            role: role,
            photoURL: firebaseUser.photoURL
        };
        
        localStorage.setItem('authToken', authToken);
        localStorage.setItem('user', JSON.stringify(currentUser));
        
        updateAuthUI();
        showToast('Sesión iniciada correctamente', 'success');
        hideLogin();
        loadCart();
        loadOrders();
    } catch (error) {
        console.error('Login error:', error);
        let errorMessage = 'Error al iniciar sesión';
        
        if (error.code === 'auth/user-not-found') {
            errorMessage = 'Usuario no encontrado. Por favor regístrate primero.';
        } else if (error.code === 'auth/wrong-password') {
            errorMessage = 'Contraseña incorrecta';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Email inválido';
        } else if (error.code === 'auth/user-disabled') {
            errorMessage = 'Usuario deshabilitado';
        } else if (error.code === 'auth/network-request-failed') {
            errorMessage = 'Error de conexión. Verifica tu conexión a internet.';
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        showToast(errorMessage, 'error');
    }
}

async function logout() {
    // Sign out from Firebase Auth if available
    if (window.firebaseAuth) {
        try {
            const { signOut } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
            await signOut(window.firebaseAuth);
        } catch (error) {
            console.warn('Error signing out from Firebase:', error);
        }
    }
    
    // Clear all user data from memory
    currentUser = null;
    authToken = null;
    cart = null;
    orders = [];
    
    // Clear all user data from localStorage
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    localStorage.removeItem('localCart');
    
    // Reset cart UI
    if (document.getElementById('cart-count')) {
        document.getElementById('cart-count').textContent = '0';
    }
    
    // Clear cart display
    const cartItems = document.getElementById('cart-items');
    const cartSummary = document.getElementById('cart-summary');
    if (cartItems) {
        cartItems.innerHTML = '<div class="empty-state">Tu carrito está vacío</div>';
    }
    if (cartSummary) {
        cartSummary.style.display = 'none';
    }
    
    // Clear orders display
    const ordersList = document.getElementById('orders-list');
    if (ordersList) {
        ordersList.innerHTML = '<div class="empty-state">No tienes pedidos aún</div>';
    }
    
    // Hide all sections first
    document.querySelectorAll('.section').forEach(s => s.style.display = 'none');
    
    // Hide admin section if visible
    const adminSection = document.getElementById('admin-section');
    if (adminSection) {
        adminSection.style.display = 'none';
    }
    
    // Hide login/register sections
    const loginSection = document.getElementById('login-section');
    const registerSection = document.getElementById('register-section');
    if (loginSection) loginSection.style.display = 'none';
    if (registerSection) registerSection.style.display = 'none';
    
    // Update UI (this will hide user info and show login button)
    updateAuthUI();
    
    // Show products section
    const productsSection = document.getElementById('products-section');
    if (productsSection) {
        productsSection.style.display = 'block';
    }
    
    showToast('Sesión cerrada correctamente', 'success');
}

// Navigation
function showSection(section) {
    document.querySelectorAll('.section').forEach(s => s.style.display = 'none');
    
    // Check admin access
    if (section === 'admin' && (!currentUser || currentUser.role !== 'admin')) {
        showToast('Acceso denegado. Solo administradores pueden acceder.', 'error');
        showSection('products');
        return;
    }
    
    document.getElementById(`${section}-section`).style.display = 'block';
    
    if (section === 'cart') {
        loadCart();
    } else if (section === 'orders') {
        if (currentUser) {
            loadOrders();
        } else {
            showLogin();
        }
    } else if (section === 'profile') {
        if (currentUser) {
            loadProfile();
        } else {
            showLogin();
        }
    } else if (section === 'admin') {
        showAdminTab('products');
    }
}

function showLogin() {
    document.getElementById('login-section').style.display = 'block';
    document.getElementById('register-section').style.display = 'none';
    showSection('login');
}

function showRegister() {
    document.getElementById('register-section').style.display = 'block';
    document.getElementById('login-section').style.display = 'none';
    showSection('register');
}

function hideLogin() {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('register-section').style.display = 'none';
}

// Products
async function loadProducts() {
    try {
        console.log('Loading products from:', `${API_BASE}/catalog/products`);
        const response = await fetch(`${API_BASE}/catalog/products`);
        
        console.log('Response status:', response.status, response.statusText);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response:', errorText);
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        console.log('Products data received:', data);
        console.log('Data type:', typeof data, 'Is array:', Array.isArray(data));
        
        // Handle different response formats
        if (Array.isArray(data)) {
            products = data;
        } else if (data && Array.isArray(data.products)) {
            products = data.products;
        } else if (data && Array.isArray(data.data)) {
            products = data.data;
        } else if (data && typeof data === 'object') {
            // If it's a single product object, wrap it in an array
            products = [data];
        } else {
            products = [];
        }
        
        console.log('Final products array:', products);
        console.log('Products count:', products.length);
        
        // Only show toast if array is truly empty (not just loading)
        if (products.length === 0) {
            renderProducts();
            // Don't show error toast for empty state - just render empty message
            return;
        }
        
        renderProducts();
        console.log('Products rendered successfully');
    } catch (error) {
        console.error('Error loading products:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        products = [];
        renderProducts();
        showToast('Error al cargar productos: ' + error.message, 'error');
    }
}

// Get sample products for demo
function getSampleProducts() {
    return [
        { id: '1', name: 'Laptop Gaming', description: 'Laptop de alto rendimiento para gaming', price: 1299.99, category: 'Electronics', stock: 10, sku: 'LAP-001', imageUrl: '' },
        { id: '2', name: 'Smartphone Pro', description: 'Último modelo con cámara avanzada', price: 899.99, category: 'Electronics', stock: 15, sku: 'PHN-001', imageUrl: '' },
        { id: '3', name: 'Auriculares Bluetooth', description: 'Sonido de alta calidad', price: 149.99, category: 'Audio', stock: 25, sku: 'AUD-001', imageUrl: '' },
        { id: '4', name: 'Tablet 10 pulgadas', description: 'Perfecta para trabajo y entretenimiento', price: 399.99, category: 'Electronics', stock: 8, sku: 'TAB-001', imageUrl: '' },
        { id: '5', name: 'Smartwatch', description: 'Monitorea tu salud y actividad', price: 249.99, category: 'Wearables', stock: 20, sku: 'WAT-001', imageUrl: '' },
        { id: '6', name: 'Cámara Digital', description: 'Captura momentos perfectos', price: 599.99, category: 'Electronics', stock: 12, sku: 'CAM-001', imageUrl: '' }
    ];
}

async function createSampleProducts() {
    if (!currentUser || currentUser.role !== 'admin') {
        return;
    }
    
    const sampleProducts = [
        { name: 'Laptop Gaming', description: 'Laptop de alto rendimiento para gaming', price: 1299.99, category: 'Electronics', stock: 10, sku: 'LAP-001' },
        { name: 'Smartphone Pro', description: 'Último modelo con cámara avanzada', price: 899.99, category: 'Electronics', stock: 15, sku: 'PHN-001' },
        { name: 'Auriculares Bluetooth', description: 'Sonido de alta calidad', price: 149.99, category: 'Audio', stock: 25, sku: 'AUD-001' },
        { name: 'Tablet 10 pulgadas', description: 'Perfecta para trabajo y entretenimiento', price: 399.99, category: 'Electronics', stock: 8, sku: 'TAB-001' },
        { name: 'Smartwatch', description: 'Monitorea tu salud y actividad', price: 249.99, category: 'Wearables', stock: 20, sku: 'WAT-001' },
        { name: 'Cámara Digital', description: 'Captura momentos perfectos', price: 599.99, category: 'Electronics', stock: 12, sku: 'CAM-001' }
    ];
    
    for (const product of sampleProducts) {
        try {
            const response = await fetch(`${API_BASE}/catalog/products`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(product)
            });
            
            if (response.ok) {
                // Product created
            }
        } catch (error) {
            console.error('Error creating sample product:', error);
        }
    }
}

function renderProducts() {
    const grid = document.getElementById('products-grid');
    
    if (!grid) {
        console.warn('Products grid element not found');
        return;
    }
    
    if (!products || products.length === 0) {
        const emptyMessage = currentUser && currentUser.role === 'admin'
            ? '<div class="empty-state">No hay productos disponibles. <button class="btn btn-primary" onclick="showProductModal()" style="margin-top: 1rem;">Crear Producto</button></div>'
            : '<div class="empty-state">No hay productos disponibles en este momento.</div>';
        grid.innerHTML = emptyMessage;
        return;
    }
    
    grid.innerHTML = products.map(product => {
        const imageDisplay = product.imageUrl 
            ? `<img src="${product.imageUrl}" alt="${product.name}" style="width: 100%; height: 200px; object-fit: cover; border-radius: 8px 8px 0 0;">`
            : `<div class="product-image">${getProductEmoji(product.category)}</div>`;
        
        return `
        <div class="product-card">
            ${imageDisplay}
            <div class="product-info">
                <div class="product-name">${product.name}</div>
                <div class="product-description">${product.description || 'Sin descripción'}</div>
                <div class="product-footer">
                    <div class="product-price">$${product.price?.toFixed(2) || '0.00'}</div>
                    <button class="btn btn-primary" onclick="addToCart('${product.id}')">
                        Agregar
                    </button>
                </div>
            </div>
        </div>
        `;
    }).join('');
}

function getProductEmoji(category) {
    // Return empty string - images will be used instead
    return '';
}

// Cart
async function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) {
        showToast('Producto no encontrado', 'error');
        return;
    }
    
    // If user is not logged in, use local cart
    if (!currentUser || !authToken) {
        addToLocalCart(product);
        showToast('Producto agregado al carrito local. Inicia sesión para sincronizar.', 'success');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/cart/user/${currentUser.uid}/items`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                productId: productId,
                quantity: 1
            })
        });
        
        if (response.ok) {
            showToast('Producto agregado al carrito', 'success');
            loadCart();
        } else {
            const data = await response.json().catch(() => ({}));
            showToast(data.error || 'Error al agregar producto', 'error');
            // Fallback: add to local cart
            addToLocalCart(product);
        }
    } catch (error) {
        console.error('Error adding to cart:', error);
        showToast('Error de conexión. Agregado al carrito local.', 'error');
        // Fallback: add to local cart
        addToLocalCart(product);
    }
}

// Fallback: Add to local cart when API is not available
function addToLocalCart(product) {
    if (!cart) {
        cart = { items: [], total: 0 };
    }
    const existingItem = cart.items.find(item => item.productId === product.id);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.items.push({
            productId: product.id,
            quantity: 1,
            price: product.price,
            productName: product.name
        });
    }
    cart.total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    renderCart();
    // Save to localStorage
    localStorage.setItem('localCart', JSON.stringify(cart));
}

function loadLocalCart() {
    try {
        const savedCart = localStorage.getItem('localCart');
        if (savedCart) {
            cart = JSON.parse(savedCart);
            renderCart();
        } else {
            cart = { items: [], total: 0 };
            renderCart();
        }
    } catch (error) {
        console.error('Error loading local cart:', error);
        cart = { items: [], total: 0 };
        renderCart();
    }
}

async function loadCart() {
    // Always load local cart first
    loadLocalCart();
    
    // If user is logged in, try to load from server and merge
    if (currentUser && authToken) {
        try {
            const response = await fetch(`${API_BASE}/cart/user/${currentUser.uid}`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            
            if (response.ok) {
                const serverCart = await response.json();
                // Merge local and server cart
                if (serverCart && serverCart.items && serverCart.items.length > 0) {
                    // Merge items: prefer server items, but keep local if not in server
                    const mergedItems = [...serverCart.items];
                    if (cart && cart.items) {
                        cart.items.forEach(localItem => {
                            const exists = mergedItems.find(si => si.productId === localItem.productId);
                            if (!exists) {
                                mergedItems.push(localItem);
                            }
                        });
                    }
                    cart = {
                        ...serverCart,
                        items: mergedItems,
                        total: mergedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
                    };
                    renderCart();
                    // Save merged cart to localStorage
                    localStorage.setItem('localCart', JSON.stringify(cart));
                }
            }
        } catch (error) {
            console.error('Error loading cart from server:', error);
            // Keep using local cart
        }
    }
}

function renderCart() {
    const cartItems = document.getElementById('cart-items');
    const cartSummary = document.getElementById('cart-summary');
    const cartCount = document.getElementById('cart-count');
    
    if (!cart || !cart.items || cart.items.length === 0) {
        cartItems.innerHTML = '<div class="empty-state">Tu carrito está vacío</div>';
        cartSummary.style.display = 'none';
        cartCount.textContent = '0';
        return;
    }
    
    cartCount.textContent = cart.items.reduce((sum, item) => sum + item.quantity, 0).toString();
    
    cartItems.innerHTML = cart.items.map(item => {
        const product = products.find(p => p.id === item.productId);
        return `
            <div class="cart-item">
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.productName || product?.name || 'Producto'}</div>
                    <div class="cart-item-details">$${item.price?.toFixed(2)} c/u</div>
                </div>
                <div class="cart-item-controls">
                    <div class="quantity-control">
                        <button class="quantity-btn" onclick="updateQuantity('${item.productId}', ${item.quantity - 1})">-</button>
                        <span class="quantity-value">${item.quantity}</span>
                        <button class="quantity-btn" onclick="updateQuantity('${item.productId}', ${item.quantity + 1})">+</button>
                    </div>
                    <div class="cart-item-price">$${(item.price * item.quantity).toFixed(2)}</div>
                    <button class="btn btn-danger" onclick="removeFromCart('${item.productId}')">Eliminar</button>
                </div>
            </div>
        `;
    }).join('');
    
    document.getElementById('cart-total').textContent = `$${cart.total?.toFixed(2) || '0.00'}`;
    cartSummary.style.display = 'block';
}

async function updateQuantity(productId, newQuantity) {
    if (newQuantity <= 0) {
        removeFromCart(productId);
        return;
    }
    
    // Update local cart immediately
    if (cart && cart.items) {
        const item = cart.items.find(i => i.productId === productId);
        if (item) {
            item.quantity = newQuantity;
            cart.total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            renderCart();
            localStorage.setItem('localCart', JSON.stringify(cart));
        }
    }
    
    // If user is logged in, sync with server
    if (currentUser && authToken) {
        try {
            const response = await fetch(`${API_BASE}/cart/user/${currentUser.uid}/items/${productId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ quantity: newQuantity })
            });
            
            if (response.ok) {
                await loadCart();
            }
        } catch (error) {
            console.error('Error updating quantity on server:', error);
            // Keep local changes
        }
    }
}

async function removeFromCart(productId) {
    // Remove from local cart immediately
    if (cart && cart.items) {
        cart.items = cart.items.filter(item => item.productId !== productId);
        cart.total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        renderCart();
        localStorage.setItem('localCart', JSON.stringify(cart));
        showToast('Producto eliminado', 'success');
    }
    
    // If user is logged in, sync with server
    if (currentUser && authToken) {
        try {
            const response = await fetch(`${API_BASE}/cart/user/${currentUser.uid}/items/${productId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            
            if (response.ok) {
                await loadCart();
            }
        } catch (error) {
            console.error('Error removing from server cart:', error);
            // Keep local changes
        }
    }
}

async function checkout() {
    if (!cart || !cart.items || cart.items.length === 0) {
        showToast('Tu carrito está vacío', 'error');
        return;
    }
    
    // Require login for checkout
    if (!currentUser || !authToken) {
        showToast('Por favor inicia sesión para proceder con la compra', 'error');
        showLogin();
        return;
    }
    
    // Confirm purchase (simulated)
    const confirmMessage = `¿Confirmar compra simulado por $${cart.total?.toFixed(2) || '0.00'}?\n\n` +
                           `Esta es una compra de prueba. No se procesará ningún pago real.`;
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    try {
        showToast('Procesando compra simulada...', 'info');
        
        // First, sync local cart to server if needed
        if (cart.items && cart.items.length > 0) {
            // Get or create cart on server
            let cartResponse = await fetch(`${API_BASE}/cart/user/${currentUser.uid}`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            
            let cartData;
            if (cartResponse.ok) {
                cartData = await cartResponse.json();
            } else {
                // Create cart on server with local items
                for (const item of cart.items) {
                    await fetch(`${API_BASE}/cart/user/${currentUser.uid}/items`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${authToken}`
                        },
                        body: JSON.stringify({
                            productId: item.productId,
                            quantity: item.quantity
                        })
                    });
                }
                cartResponse = await fetch(`${API_BASE}/cart/user/${currentUser.uid}`, {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                });
                cartData = await cartResponse.json();
            }
            
            if (!cartData || !cartData.id) {
                showToast('Error al obtener el carrito', 'error');
                return;
            }
            
            // Create order (simulated purchase - no real payment)
            const orderResponse = await fetch(`${API_BASE}/orders/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    cartId: cartData.id,
                    shippingAddress: {
                        street: 'Dirección de prueba',
                        city: 'Ciudad de prueba',
                        country: 'País de prueba'
                    }
                })
            });
            
            if (orderResponse.ok) {
                const order = await orderResponse.json();
                showToast('¡Compra simulada completada! Pedido creado exitosamente (sin pago real)', 'success');
                // Clear local cart
                cart = { items: [], total: 0 };
                localStorage.removeItem('localCart');
                loadCart();
                loadOrders();
                showSection('orders');
            } else {
                const error = await orderResponse.json().catch(() => ({ error: 'Error desconocido' }));
                showToast(error.error || 'Error al crear pedido', 'error');
            }
        }
    } catch (error) {
        showToast('Error de conexión: ' + error.message, 'error');
        console.error('Checkout error:', error);
    }
}

async function loadProfile() {
    if (!currentUser || !authToken) {
        showToast('Por favor inicia sesión', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${AUTH_BASE}/profile/${currentUser.uid}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            const profile = await response.json();
            
            // Populate form
            document.getElementById('profile-display-name').value = profile.displayName || '';
            document.getElementById('profile-email').value = profile.email || currentUser.email || '';
            document.getElementById('profile-role').value = profile.role === 'admin' ? 'Administrador' : 'Usuario';
            document.getElementById('profile-created-at').value = profile.createdAt 
                ? new Date(profile.createdAt).toLocaleDateString('es-ES')
                : 'N/A';
            
            // Load profile photo
            const photoImg = document.getElementById('profile-photo-img');
            const photoPlaceholder = document.getElementById('profile-photo-placeholder');
            const removeBtn = document.getElementById('remove-photo-btn');
            if (profile.photoURL) {
                if (photoImg) {
                    photoImg.src = profile.photoURL;
                    photoImg.style.display = 'block';
                }
                if (photoPlaceholder) photoPlaceholder.style.display = 'none';
                if (removeBtn) removeBtn.style.display = 'inline-block';
            } else {
                if (photoImg) photoImg.style.display = 'none';
                if (photoPlaceholder) photoPlaceholder.style.display = 'block';
                if (removeBtn) removeBtn.style.display = 'none';
            }
        } else {
            // Use current user data if profile not found
            document.getElementById('profile-display-name').value = currentUser.displayName || '';
            document.getElementById('profile-email').value = currentUser.email || '';
            document.getElementById('profile-role').value = currentUser.role === 'admin' ? 'Administrador' : 'Usuario';
            document.getElementById('profile-created-at').value = 'N/A';
            
            // Load profile photo from currentUser
            const photoImg = document.getElementById('profile-photo-img');
            const photoPlaceholder = document.getElementById('profile-photo-placeholder');
            const removeBtn = document.getElementById('remove-photo-btn');
            if (currentUser.photoURL) {
                if (photoImg) {
                    photoImg.src = currentUser.photoURL;
                    photoImg.style.display = 'block';
                }
                if (photoPlaceholder) photoPlaceholder.style.display = 'none';
                if (removeBtn) removeBtn.style.display = 'inline-block';
            } else {
                if (photoImg) photoImg.style.display = 'none';
                if (photoPlaceholder) photoPlaceholder.style.display = 'block';
                if (removeBtn) removeBtn.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        // Use current user data as fallback
        document.getElementById('profile-display-name').value = currentUser.displayName || '';
        document.getElementById('profile-email').value = currentUser.email || '';
        document.getElementById('profile-role').value = currentUser.role === 'admin' ? 'Administrador' : 'Usuario';
        document.getElementById('profile-created-at').value = 'N/A';
        
        // Load profile photo from currentUser
        const photoImg = document.getElementById('profile-photo-img');
        const photoPlaceholder = document.getElementById('profile-photo-placeholder');
        const removeBtn = document.getElementById('remove-photo-btn');
        if (currentUser.photoURL) {
            if (photoImg) {
                photoImg.src = currentUser.photoURL;
                photoImg.style.display = 'block';
            }
            if (photoPlaceholder) photoPlaceholder.style.display = 'none';
            if (removeBtn) removeBtn.style.display = 'inline-block';
        } else {
            if (photoImg) photoImg.style.display = 'none';
            if (photoPlaceholder) photoPlaceholder.style.display = 'block';
            if (removeBtn) removeBtn.style.display = 'none';
        }
    }
}

async function updateProfile(e) {
    e.preventDefault();
    
    if (!currentUser || !authToken) {
        showToast('Por favor inicia sesión', 'error');
        return;
    }
    
    const displayName = document.getElementById('profile-display-name').value.trim();
    const photoImg = document.getElementById('profile-photo-img');
    let photoURL = null;
    
    // Get photo URL if exists
    if (photoImg && photoImg.src && photoImg.style.display !== 'none') {
        photoURL = photoImg.src;
    }
    
    if (!displayName) {
        showToast('El nombre de usuario es requerido', 'error');
        return;
    }
    
    try {
        showToast('Actualizando perfil...', 'info');
        
        // Upload photo if it's a new file (data URL)
        let finalPhotoURL = photoURL;
        if (photoURL && photoURL.startsWith('data:')) {
            try {
                const fileInput = document.getElementById('profile-photo-input');
                if (fileInput && fileInput.files && fileInput.files.length > 0) {
                    const file = fileInput.files[0];
                    // Upload and get URL (will be data URL for emulator, or Storage URL for production)
                    finalPhotoURL = await uploadProfilePhoto(file, currentUser.uid);
                }
            } catch (error) {
                console.error('Error uploading photo:', error);
                showToast('Error al subir foto, pero se guardará el nombre', 'warning');
                finalPhotoURL = null; // Don't save invalid photo
            }
        }
        
        const response = await fetch(`${AUTH_BASE}/profile/${currentUser.uid}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ displayName, photoURL: finalPhotoURL || null })
        });
        
        if (response.ok) {
            const updatedProfile = await response.json();
            
            // Update current user in memory
            currentUser.displayName = updatedProfile.displayName || displayName;
            if (updatedProfile.photoURL !== undefined) {
                currentUser.photoURL = updatedProfile.photoURL || null;
            }
            localStorage.setItem('user', JSON.stringify(currentUser));
            
            // Update UI
            updateAuthUI();
            
            showToast('Perfil actualizado exitosamente', 'success');
            
            // Reload profile to show updated photo
            await loadProfile();
        } else {
            const error = await response.json().catch(() => ({ error: 'Error desconocido' }));
            showToast(error.error || 'Error al actualizar perfil', 'error');
        }
    } catch (error) {
        showToast('Error de conexión: ' + error.message, 'error');
        console.error('Error updating profile:', error);
    }
}

async function loadAppSettings() {
    try {
        // Try to load from localStorage first (for emulator)
        const savedLogo = localStorage.getItem('app_logo');
        if (savedLogo) {
            const logoImg = document.getElementById('logo-image');
            const logoText = document.getElementById('logo-text');
            if (logoImg && savedLogo) {
                logoImg.src = savedLogo;
                logoImg.style.display = 'inline-block';
                logoText.style.display = 'none';
            }
        }
        
        // In production, load from Firestore
        // For now, we'll use localStorage for emulator
    } catch (error) {
        console.error('Error loading app settings:', error);
    }
}

async function saveAppLogo(logoUrl) {
    try {
        // Save to localStorage for emulator
        localStorage.setItem('app_logo', logoUrl);
        
        // Update logo in UI
        const logoImg = document.getElementById('logo-image');
        const logoText = document.getElementById('logo-text');
        if (logoImg && logoUrl) {
            logoImg.src = logoUrl;
            logoImg.style.display = 'inline-block';
            logoText.style.display = 'none';
        } else if (logoText) {
            logoImg.style.display = 'none';
            logoText.style.display = 'inline';
        }
        
        // In production, save to Firestore app_settings collection
        if (currentUser && currentUser.role === 'admin' && authToken) {
            try {
                await fetch(`${API_BASE}/app/settings`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify({ logoUrl })
                });
            } catch (error) {
                // Using localStorage only for emulator
            }
        }
    } catch (error) {
        console.error('Error saving logo:', error);
    }
}

function handleProfilePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        showToast('Por favor selecciona un archivo de imagen válido', 'error');
        return;
    }
    
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
        showToast('La imagen es demasiado grande. Máximo 2MB', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const preview = document.getElementById('profile-photo-img');
        const placeholder = document.getElementById('profile-photo-placeholder');
        const removeBtn = document.getElementById('remove-photo-btn');
        
        if (preview) {
            preview.src = e.target.result;
            preview.style.display = 'block';
        }
        if (placeholder) placeholder.style.display = 'none';
        if (removeBtn) removeBtn.style.display = 'inline-block';
    };
    reader.readAsDataURL(file);
}

async function removeProfilePhoto() {
    const preview = document.getElementById('profile-photo-img');
    const placeholder = document.getElementById('profile-photo-placeholder');
    const removeBtn = document.getElementById('remove-photo-btn');
    const input = document.getElementById('profile-photo-input');
    
    if (preview) {
        preview.src = '';
        preview.style.display = 'none';
    }
    if (placeholder) placeholder.style.display = 'block';
    if (removeBtn) removeBtn.style.display = 'none';
    if (input) input.value = '';
    
    // Also update in backend if user is logged in
    if (currentUser && authToken) {
        try {
            await fetch(`${AUTH_BASE}/profile/${currentUser.uid}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ photoURL: null })
            });
            currentUser.photoURL = null;
            localStorage.setItem('user', JSON.stringify(currentUser));
            updateAuthUI();
            showToast('Foto eliminada exitosamente', 'success');
        } catch (error) {
            console.error('Error removing photo:', error);
            showToast('Error al eliminar foto', 'error');
        }
    }
}

async function uploadProfilePhoto(file, userId) {
    try {
        // Generate unique filename
        const timestamp = Date.now();
        const filename = `profile_${userId}_${timestamp}_${file.name}`;
        const path = `users/${userId}/${filename}`;
        
        // For emulator, use base64 data URL
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    resolve(reader.result);
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        } else {
            // For production, use Firebase Storage
            if (window.firebaseStorage && window.firebaseStorage.upload) {
                return await window.firebaseStorage.upload(file, path);
            } else {
                throw new Error('Firebase Storage no está disponible');
            }
        }
    } catch (error) {
        console.error('Error uploading profile photo:', error);
        throw error;
    }
}

function handleLogoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        showToast('Por favor selecciona un archivo de imagen válido', 'error');
        return;
    }
    
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
        showToast('La imagen es demasiado grande. Máximo 2MB', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const preview = document.getElementById('logo-preview');
        const container = document.getElementById('logo-preview-container');
        
        if (preview) preview.src = e.target.result;
        if (container) container.style.display = 'block';
    };
    reader.readAsDataURL(file);
}

function cancelLogoUpload() {
    const container = document.getElementById('logo-preview-container');
    const input = document.getElementById('logo-file-input');
    
    if (container) container.style.display = 'none';
    if (input) input.value = '';
}

async function saveLogo() {
    const preview = document.getElementById('logo-preview');
    if (!preview || !preview.src) {
        showToast('No hay logo para guardar', 'error');
        return;
    }
    
    try {
        showToast('Guardando logo...', 'info');
        await saveAppLogo(preview.src);
        showToast('Logo guardado exitosamente', 'success');
        cancelLogoUpload();
    } catch (error) {
        showToast('Error al guardar logo: ' + error.message, 'error');
    }
}

window.loadProfile = loadProfile;
window.updateProfile = updateProfile;
window.handleProfilePhotoUpload = handleProfilePhotoUpload;
window.removeProfilePhoto = removeProfilePhoto;
window.handleLogoUpload = handleLogoUpload;
window.cancelLogoUpload = cancelLogoUpload;
window.saveLogo = saveLogo;

async function loadOrders() {
    if (!currentUser) return;
    
    try {
        const response = await fetch(`${API_BASE}/orders/user/${currentUser.uid}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            orders = await response.json();
            renderOrders();
        }
    } catch (error) {
        console.error('Error loading orders:', error);
        orders = [];
        renderOrders();
    }
}

function renderOrders() {
    const ordersList = document.getElementById('orders-list');
    
    if (!orders || orders.length === 0) {
        ordersList.innerHTML = '<div class="empty-state">No tienes pedidos aún</div>';
        return;
    }
    
    // Translate order status to Spanish
    const statusTranslations = {
        'pending': 'Pendiente',
        'confirmed': 'Confirmado',
        'paid': 'Pagado',
        'shipped': 'Enviado',
        'delivered': 'Entregado',
        'cancelled': 'Cancelado'
    };
    
    ordersList.innerHTML = orders.map(order => {
        const statusText = statusTranslations[order.status] || order.status;
        return `
        <div class="order-card">
            <div class="order-header">
                <div>
                    <div class="order-id">Pedido #${order.id?.substring(0, 8) || 'N/A'}</div>
                    <div style="font-size: 0.9rem; color: var(--text-light); margin-top: 0.25rem;">
                        ${new Date(order.createdAt).toLocaleDateString('es-ES')}
                    </div>
                </div>
                <div class="order-status ${order.status}">${statusText}</div>
            </div>
            <div class="order-total">Total: $${order.total?.toFixed(2) || '0.00'}</div>
        </div>
        `;
    }).join('');
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

window.showToast = showToast;

