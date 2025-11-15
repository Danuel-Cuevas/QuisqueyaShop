// Admin Functions
async function createSampleProductsFromAdmin() {
    if (!currentUser || currentUser.role !== 'admin') {
        showToast('Solo administradores pueden crear productos', 'error');
        return;
    }
    
    if (!authToken) {
        showToast('Por favor inicia sesión', 'error');
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
    
    showToast('Creando productos...', 'success');
    let created = 0;
    let errors = 0;
    
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
                created++;
                // Product created successfully
            } else {
                const error = await response.json().catch(() => ({}));
                if (error.error && error.error.includes('already exists')) {
                    // Product already exists
                } else {
                    errors++;
                    console.error('Error creating product:', product.name, error);
                }
            }
        } catch (error) {
            errors++;
            console.error('Error processing product:', product.name, error);
        }
    }
    
    showToast(`Productos creados: ${created}, Errores: ${errors}`, created > 0 ? 'success' : 'error');
    await loadAdminProducts();
    await loadProducts();
}

// Show admin tab
function showAdminTab(tab) {
    // Hide all tabs
    document.querySelectorAll('.admin-tab-content').forEach(t => t.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    
    // Show selected tab
    document.getElementById(`admin-${tab}`).style.display = 'block';
    event.target.classList.add('active');
    
    // Load data for the tab
    if (tab === 'products') {
        loadAdminProducts();
    } else if (tab === 'users') {
        loadAdminUsers();
    } else if (tab === 'orders') {
        loadAdminOrders();
    } else if (tab === 'reports') {
        loadAdminReports();
    } else if (tab === 'settings') {
        loadAppSettings();
    }
}

async function loadAppSettings() {
    // Load current logo
    const savedLogo = localStorage.getItem('app_logo');
    if (savedLogo) {
        const preview = document.getElementById('logo-preview');
        if (preview) {
            preview.src = savedLogo;
            document.getElementById('logo-preview-container').style.display = 'block';
        }
    }
}

// Products CRUD
async function loadAdminProducts() {
    if (!currentUser || currentUser.role !== 'admin') {
        showToast('Acceso denegado', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/catalog/products`, {
            headers: authToken ? {
                'Authorization': `Bearer ${authToken}`
            } : {}
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP ${response.status}`);
        }
        
        const data = await response.json();
        products = Array.isArray(data) ? data : [];
        renderAdminProducts();
    } catch (error) {
        console.error('Error loading admin products:', error);
        showToast('Error al cargar productos: ' + error.message, 'error');
        // Show empty state
        document.getElementById('admin-products-list').innerHTML = 
            '<div class="empty-state">Error al cargar productos. Verifica que los emuladores estén corriendo.</div>';
    }
}

function renderAdminProducts() {
    const list = document.getElementById('admin-products-list');
    
    if (!products || products.length === 0) {
        list.innerHTML = '<div class="empty-state">No hay productos. Crea uno nuevo.</div>';
        return;
    }
    
    list.innerHTML = products.map(product => `
        <div class="admin-item">
            <div class="admin-item-info">
                <div class="admin-item-title">${product.name}</div>
                <div class="admin-item-details">
                    ${product.description || 'Sin descripción'} | 
                    $${product.price?.toFixed(2) || '0.00'} | 
                    Stock: ${product.stock || 0} | 
                    Categoría: ${product.category || 'N/A'}
                </div>
            </div>
            <div class="admin-item-actions">
                <button class="btn btn-primary" onclick="editProduct('${product.id}')">Editar</button>
                <button class="btn btn-danger" onclick="deleteProduct('${product.id}')">Eliminar</button>
            </div>
        </div>
    `).join('');
}

function showProductModal(productId = null) {
    const modal = document.getElementById('product-modal');
    const form = document.getElementById('product-form');
    const title = document.getElementById('modal-title');
    
    if (productId) {
        // Edit mode
        const product = products.find(p => p.id === productId);
        if (product) {
            title.textContent = 'Editar Producto';
            document.getElementById('product-id').value = product.id;
            document.getElementById('product-name').value = product.name || '';
            document.getElementById('product-description').value = product.description || '';
            document.getElementById('product-price').value = product.price || '';
            document.getElementById('product-stock').value = product.stock || '';
            document.getElementById('product-category').value = product.category || '';
            document.getElementById('product-sku').value = product.sku || '';
            document.getElementById('product-image').value = product.imageUrl || '';
            
            // Show image preview if exists
            if (product.imageUrl) {
                const preview = document.getElementById('image-preview');
                const previewImg = document.getElementById('preview-img');
                previewImg.src = product.imageUrl;
                preview.style.display = 'block';
            }
        }
    } else {
        // Create mode
        title.textContent = 'Nuevo Producto';
        form.reset();
        document.getElementById('product-id').value = '';
        clearImagePreview();
    }
    
    modal.style.display = 'flex';
}

function closeProductModal() {
    document.getElementById('product-modal').style.display = 'none';
    document.getElementById('product-form').reset();
    clearImagePreview();
}

// Make functions globally available
window.previewImage = function(event) {
    const file = event.target.files[0];
    if (file) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
            showToast('Por favor selecciona un archivo de imagen válido', 'error');
            event.target.value = '';
            return;
        }
        
        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            showToast('La imagen es demasiado grande. Máximo 5MB', 'error');
            event.target.value = '';
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById('image-preview');
            const previewImg = document.getElementById('preview-img');
            previewImg.src = e.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}

window.clearImagePreview = function() {
    const preview = document.getElementById('image-preview');
    const fileInput = document.getElementById('product-image-file');
    const urlInput = document.getElementById('product-image');
    
    preview.style.display = 'none';
    document.getElementById('preview-img').src = '';
    if (fileInput) fileInput.value = '';
    if (urlInput) urlInput.value = '';
}

async function uploadProductImage(file, productId) {
    try {
        // Generate unique filename
        const timestamp = Date.now();
        const filename = `product_${productId || timestamp}_${file.name}`;
        const path = `products/${filename}`;
        
        // For emulator, use base64 data URL
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    // Return data URL for emulator
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
        console.error('Error uploading image:', error);
        throw error;
    }
}

async function saveProduct(e) {
    e.preventDefault();
    
    if (!currentUser || currentUser.role !== 'admin') {
        showToast('Solo administradores pueden crear/editar productos', 'error');
        return;
    }
    
    if (!authToken) {
        showToast('Por favor inicia sesión como administrador', 'error');
        return;
    }
    
    const productId = document.getElementById('product-id').value;
    const fileInput = document.getElementById('product-image-file');
    const imageUrlInput = document.getElementById('product-image');
    
    let imageUrl = imageUrlInput.value || '';
    
    // Upload image if file is selected
    if (fileInput.files && fileInput.files.length > 0) {
        const file = fileInput.files[0];
        try {
            showToast('Subiendo imagen...', 'info');
            imageUrl = await uploadProductImage(file, productId);
            showToast('Imagen subida correctamente', 'success');
        } catch (error) {
            showToast('Error al subir imagen: ' + error.message, 'error');
            return;
        }
    }
    
    const productData = {
        name: document.getElementById('product-name').value,
        description: document.getElementById('product-description').value,
        price: parseFloat(document.getElementById('product-price').value),
        stock: parseInt(document.getElementById('product-stock').value),
        category: document.getElementById('product-category').value,
        sku: document.getElementById('product-sku').value,
        imageUrl: imageUrl
    };
    
    // Validate data
    if (!productData.name || !productData.description || !productData.sku) {
        showToast('Por favor completa todos los campos requeridos', 'error');
        return;
    }
    
    try {
        const url = productId 
            ? `${API_BASE}/catalog/products/${productId}`
            : `${API_BASE}/catalog/products`;
        
        const method = productId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(productData)
        });
        
        if (response.ok) {
            const result = await response.json();
            showToast(productId ? 'Producto actualizado exitosamente' : 'Producto creado exitosamente', 'success');
            closeProductModal();
            await loadAdminProducts();
            await loadProducts(); // Refresh main products list
        } else {
            const error = await response.json().catch(() => ({ error: 'Error desconocido' }));
            showToast(error.error || 'Error al guardar producto', 'error');
            console.error('Error response:', error);
        }
    } catch (error) {
        showToast('Error de conexión: ' + error.message, 'error');
        console.error('Error saving product:', error);
    }
}

function editProduct(productId) {
    showProductModal(productId);
}

async function deleteProduct(productId) {
    if (!confirm('¿Estás seguro de eliminar este producto? Esta acción no se puede deshacer.')) {
        return;
    }
    
    if (!currentUser || currentUser.role !== 'admin') {
        showToast('Solo administradores pueden eliminar productos', 'error');
        return;
    }
    
    if (!authToken) {
        showToast('Por favor inicia sesión como administrador', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/catalog/products/${productId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            showToast('Producto eliminado exitosamente', 'success');
            await loadAdminProducts();
            await loadProducts(); // Refresh main products list
        } else {
            const error = await response.json().catch(() => ({ error: 'Error desconocido' }));
            showToast(error.error || 'Error al eliminar producto', 'error');
            console.error('Error response:', error);
        }
    } catch (error) {
        showToast('Error de conexión: ' + error.message, 'error');
        console.error('Error deleting product:', error);
    }
}

// Users Management
async function loadAdminUsers() {
    if (!currentUser || currentUser.role !== 'admin') {
        showToast('Acceso denegado', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/users/users`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (!response.ok) throw new Error('Failed to load users');
        
        const users = await response.json();
        renderAdminUsers(users);
    } catch (error) {
        console.error('Error loading users:', error);
        showToast('Error al cargar usuarios', 'error');
    }
}

function renderAdminUsers(users) {
    const list = document.getElementById('admin-users-list');
    
    if (!users || users.length === 0) {
        list.innerHTML = '<div class="empty-state">No hay usuarios registrados</div>';
        return;
    }
    
    list.innerHTML = users.map(user => `
        <div class="admin-item">
            <div class="admin-item-info">
                <div class="admin-item-title">${user.displayName || user.email}</div>
                <div class="admin-item-details">
                    ${user.email} | Rol: ${user.role || 'user'} | Creado: ${new Date(user.createdAt).toLocaleDateString()}
                </div>
            </div>
            <div class="admin-item-actions">
                <button class="btn btn-primary" onclick="changeUserRole('${user.uid}', '${user.role === 'admin' ? 'user' : 'admin'}')">
                    ${user.role === 'admin' ? 'Quitar Admin' : 'Hacer Admin'}
                </button>
            </div>
        </div>
    `).join('');
}

async function changeUserRole(uid, newRole) {
    if (!currentUser || currentUser.role !== 'admin') {
        showToast('Solo administradores pueden cambiar roles', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/users/role/${uid}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ role: newRole })
        });
        
        if (response.ok) {
            showToast(`Rol actualizado a ${newRole}`, 'success');
            await loadAdminUsers();
        } else {
            const error = await response.json();
            showToast(error.error || 'Error al cambiar rol', 'error');
        }
    } catch (error) {
        showToast('Error de conexión', 'error');
        console.error('Error changing role:', error);
    }
}

// Orders Management
async function loadAdminOrders() {
    if (!currentUser || currentUser.role !== 'admin') {
        showToast('Acceso denegado', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/orders`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (!response.ok) throw new Error('Failed to load orders');
        
        const orders = await response.json();
        renderAdminOrders(orders);
    } catch (error) {
        console.error('Error loading orders:', error);
        showToast('Error al cargar pedidos', 'error');
        document.getElementById('admin-orders-list').innerHTML = '<div class="empty-state">Error al cargar pedidos</div>';
    }
}

function renderAdminOrders(orders) {
    const list = document.getElementById('admin-orders-list');
    
    if (!orders || orders.length === 0) {
        list.innerHTML = '<div class="empty-state">No hay pedidos registrados</div>';
        return;
    }
    
    const statusTranslations = {
        'pending': 'Pendiente',
        'confirmed': 'Confirmado',
        'paid': 'Pagado',
        'shipped': 'Enviado',
        'delivered': 'Entregado',
        'cancelled': 'Cancelado'
    };
    
    const statusColors = {
        'pending': 'var(--warning)',
        'confirmed': 'var(--primary)',
        'paid': 'var(--success)',
        'shipped': 'var(--info)',
        'delivered': 'var(--success)',
        'cancelled': 'var(--danger)'
    };
    
    list.innerHTML = orders.map(order => {
        const statusText = statusTranslations[order.status] || order.status;
        const statusColor = statusColors[order.status] || 'var(--text-light)';
        const canCancel = order.status !== 'cancelled' && order.status !== 'delivered';
        
        return `
        <div class="admin-item">
            <div class="admin-item-info">
                <div class="admin-item-title">Pedido #${order.id?.substring(0, 8) || 'N/A'}</div>
                <div class="admin-item-details">
                    <div style="margin-top: 0.5rem;">
                        <span style="display: inline-block; padding: 0.25rem 0.75rem; background: ${statusColor}; color: white; border-radius: 4px; font-size: 0.875rem; font-weight: 600;">
                            ${statusText}
                        </span>
                    </div>
                    <div style="margin-top: 0.5rem; font-size: 0.875rem; color: var(--text-light);">
                        Total: $${order.total?.toFixed(2) || '0.00'} | 
                        Items: ${order.items?.length || 0} | 
                        Fecha: ${order.createdAt ? new Date(order.createdAt).toLocaleString() : 'N/A'}
                    </div>
                    ${order.userId ? `
                    <div style="margin-top: 0.25rem; font-size: 0.875rem; color: var(--text-light);">
                        Usuario: ${order.userId.substring(0, 8)}...
                    </div>
                    ` : ''}
                </div>
            </div>
            <div class="admin-item-actions">
                ${canCancel ? `
                <button class="btn btn-danger" onclick="cancelOrder('${order.id}')">Cancelar Pedido</button>
                ` : ''}
                ${order.status === 'pending' ? `
                <button class="btn btn-primary" onclick="updateOrderStatus('${order.id}', 'confirmed')" style="margin-left: 0.5rem;">Confirmar</button>
                ` : ''}
            </div>
        </div>
        `;
    }).join('');
}

async function cancelOrder(orderId) {
    if (!currentUser || currentUser.role !== 'admin') {
        showToast('Solo administradores pueden cancelar pedidos', 'error');
        return;
    }
    
    if (!confirm('¿Estás seguro de que deseas cancelar este pedido?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/orders/${orderId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ status: 'cancelled' })
        });
        
        if (response.ok) {
            showToast('Pedido cancelado exitosamente', 'success');
            await loadAdminOrders();
        } else {
            const error = await response.json().catch(() => ({ error: 'Error desconocido' }));
            showToast(error.error || 'Error al cancelar pedido', 'error');
        }
    } catch (error) {
        showToast('Error de conexión: ' + error.message, 'error');
        console.error('Error cancelling order:', error);
    }
}

async function updateOrderStatus(orderId, newStatus) {
    if (!currentUser || currentUser.role !== 'admin') {
        showToast('Solo administradores pueden actualizar estados', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/orders/${orderId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ status: newStatus })
        });
        
        if (response.ok) {
            const statusLabels = {
                'confirmed': 'confirmado',
                'paid': 'pagado',
                'shipped': 'enviado',
                'delivered': 'entregado'
            };
            showToast(`Pedido ${statusLabels[newStatus] || 'actualizado'} exitosamente`, 'success');
            await loadAdminOrders();
        } else {
            const error = await response.json().catch(() => ({ error: 'Error desconocido' }));
            showToast(error.error || 'Error al actualizar estado', 'error');
        }
    } catch (error) {
        showToast('Error de conexión: ' + error.message, 'error');
        console.error('Error updating order status:', error);
    }
}

// Make functions globally available
window.cancelOrder = cancelOrder;
window.updateOrderStatus = updateOrderStatus;

// Reports Management
async function loadAdminReports() {
    if (!currentUser || currentUser.role !== 'admin') {
        showToast('Acceso denegado', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/reports`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (!response.ok) throw new Error('Failed to load reports');
        
        const reports = await response.json();
        if (reports && reports.length > 0) {
            renderAdminReports(reports);
        } else {
            document.getElementById('admin-reports-list').innerHTML = '<div class="empty-state">No hay reportes generados. Genera uno nuevo.</div>';
        }
    } catch (error) {
        console.error('Error loading reports:', error);
        document.getElementById('admin-reports-list').innerHTML = '<div class="empty-state">Error al cargar reportes. Verifica que los emuladores estén corriendo.</div>';
    }
}

function renderAdminReports(reports) {
    const list = document.getElementById('admin-reports-list');
    
    const typeLabels = {
        'sales': 'Ventas',
        'inventory': 'Inventario',
        'products': 'Productos',
        'users': 'Usuarios'
    };
    
    list.innerHTML = reports.map(report => {
        const typeLabel = typeLabels[report.type] || report.type;
        const dateRange = report.startDate && report.endDate 
            ? `${new Date(report.startDate).toLocaleDateString()} - ${new Date(report.endDate).toLocaleDateString()}`
            : 'Sin rango de fechas';
        
        return `
        <div class="admin-item">
            <div class="admin-item-info">
                <div class="admin-item-title">${typeLabel}</div>
                <div class="admin-item-details">
                    ${dateRange} | 
                    Generado: ${new Date(report.generatedAt).toLocaleString()}
                </div>
            </div>
            <div class="admin-item-actions">
                <button class="btn btn-primary" onclick="viewReport('${report.id}')">Ver Detalles</button>
                <button class="btn btn-danger" onclick="deleteReport('${report.id}')" style="margin-left: 0.5rem;">Eliminar</button>
            </div>
        </div>
        `;
    }).join('');
}

function showReportModal(type) {
    const modal = document.getElementById('report-modal');
    const title = document.getElementById('report-modal-title');
    const typeInput = document.getElementById('report-type');
    const dateFields = document.getElementById('report-date-fields');
    const startDateInput = document.getElementById('report-start-date');
    const endDateInput = document.getElementById('report-end-date');
    
    const typeLabels = {
        'sales': 'Reporte de Ventas',
        'inventory': 'Reporte de Inventario',
        'products': 'Reporte de Productos'
    };
    
    title.textContent = typeLabels[type] || 'Generar Reporte';
    typeInput.value = type;
    
    // Show/hide date fields based on report type
    if (type === 'sales') {
        dateFields.style.display = 'block';
        startDateInput.required = true;
        endDateInput.required = true;
        
        // Set default dates (last 30 days)
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        
        startDateInput.value = startDate.toISOString().split('T')[0];
        endDateInput.value = endDate.toISOString().split('T')[0];
    } else {
        // Hide date fields for inventory and products
        dateFields.style.display = 'none';
        startDateInput.required = false;
        endDateInput.required = false;
    }
    
    modal.style.display = 'flex';
}

function closeReportModal() {
    document.getElementById('report-modal').style.display = 'none';
    document.getElementById('report-form').reset();
}

async function generateReport(e) {
    e.preventDefault();
    
    if (!currentUser || currentUser.role !== 'admin') {
        showToast('Solo administradores pueden generar reportes', 'error');
        return;
    }
    
    const type = document.getElementById('report-type').value;
    
    try {
        showToast('Generando reporte...', 'info');
        
        let endpoint = '';
        let body = {};
        
        if (type === 'sales') {
            const startDateInput = document.getElementById('report-start-date').value;
            const endDateInput = document.getElementById('report-end-date').value;
            
            if (!startDateInput || !endDateInput) {
                showToast('Por favor selecciona ambas fechas', 'error');
                return;
            }
            
            const startDate = new Date(startDateInput);
            const endDate = new Date(endDateInput);
            
            // Set time to start and end of day
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(23, 59, 59, 999);
            
            if (startDate > endDate) {
                showToast('La fecha de inicio debe ser anterior a la fecha de fin', 'error');
                return;
            }
            
            endpoint = '/sales';
            body = {
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString()
            };
        } else if (type === 'inventory') {
            endpoint = '/inventory';
            body = {};
        } else if (type === 'products') {
            endpoint = '/products';
            body = {};
        } else {
            showToast('Tipo de reporte no válido', 'error');
            return;
        }
        
        const response = await fetch(`${API_BASE}/reports${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(body)
        });
        
        if (response.ok) {
            const report = await response.json();
            showToast('Reporte generado exitosamente', 'success');
            closeReportModal();
            await loadAdminReports();
            // Auto-open the generated report
            await viewReport(report.id);
        } else {
            const error = await response.json().catch(() => ({ error: 'Error desconocido' }));
            showToast(error.error || 'Error al generar reporte', 'error');
        }
    } catch (error) {
        showToast('Error de conexión: ' + error.message, 'error');
        console.error('Error generating report:', error);
    }
}

async function generateInventoryReport() {
    if (!currentUser || currentUser.role !== 'admin') {
        showToast('Solo administradores pueden generar reportes', 'error');
        return;
    }
    
    try {
        showToast('Generando reporte de inventario...', 'info');
        
        const response = await fetch(`${API_BASE}/reports/inventory`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({})
        });
        
        if (response.ok) {
            const report = await response.json();
            showToast('Reporte generado exitosamente', 'success');
            await loadAdminReports();
            await viewReport(report.id);
        } else {
            const error = await response.json().catch(() => ({ error: 'Error desconocido' }));
            showToast(error.error || 'Error al generar reporte', 'error');
        }
    } catch (error) {
        showToast('Error de conexión: ' + error.message, 'error');
        console.error('Error generating report:', error);
    }
}

async function generateProductsReport() {
    if (!currentUser || currentUser.role !== 'admin') {
        showToast('Solo administradores pueden generar reportes', 'error');
        return;
    }
    
    try {
        showToast('Generando reporte de productos...', 'info');
        
        const response = await fetch(`${API_BASE}/reports/products`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({})
        });
        
        if (response.ok) {
            const report = await response.json();
            showToast('Reporte generado exitosamente', 'success');
            await loadAdminReports();
            await viewReport(report.id);
        } else {
            const error = await response.json().catch(() => ({ error: 'Error desconocido' }));
            showToast(error.error || 'Error al generar reporte', 'error');
        }
    } catch (error) {
        showToast('Error de conexión: ' + error.message, 'error');
        console.error('Error generating report:', error);
    }
}

async function viewReport(reportId) {
    if (!currentUser || currentUser.role !== 'admin') {
        showToast('Acceso denegado', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/reports/${reportId}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (!response.ok) throw new Error('Failed to load report');
        
        const report = await response.json();
        renderReportView(report);
    } catch (error) {
        showToast('Error al cargar reporte', 'error');
        console.error('Error loading report:', error);
    }
}

function renderReportView(report) {
    const modal = document.getElementById('report-view-modal');
    const title = document.getElementById('report-view-title');
    const content = document.getElementById('report-view-content');
    
    const typeLabels = {
        'sales': 'Reporte de Ventas',
        'inventory': 'Reporte de Inventario',
        'products': 'Reporte de Productos',
        'users': 'Reporte de Usuarios'
    };
    
    title.textContent = typeLabels[report.type] || 'Reporte';
    
    let html = `
        <div style="margin-bottom: 1.5rem; padding: 1rem; background: var(--bg); border-radius: 8px;">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                <div>
                    <div style="font-size: 0.875rem; color: var(--text-light); margin-bottom: 0.25rem;">Tipo</div>
                    <div style="font-weight: 600;">${typeLabels[report.type] || report.type}</div>
                </div>
                <div>
                    <div style="font-size: 0.875rem; color: var(--text-light); margin-bottom: 0.25rem;">Generado</div>
                    <div style="font-weight: 600;">${new Date(report.generatedAt).toLocaleString()}</div>
                </div>
                ${report.startDate && report.endDate ? `
                <div>
                    <div style="font-size: 0.875rem; color: var(--text-light); margin-bottom: 0.25rem;">Período</div>
                    <div style="font-weight: 600;">${new Date(report.startDate).toLocaleDateString()} - ${new Date(report.endDate).toLocaleDateString()}</div>
                </div>
                ` : ''}
            </div>
        </div>
    `;
    
    // Render based on report type
    if (report.type === 'sales') {
        const data = report.data || {};
        html += `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                <div style="padding: 1.5rem; background: white; border-radius: 8px; box-shadow: var(--shadow);">
                    <div style="font-size: 0.875rem; color: var(--text-light); margin-bottom: 0.5rem;">Total de Ventas</div>
                    <div style="font-size: 2rem; font-weight: 700; color: var(--primary);">$${data.totalSales?.toFixed(2) || '0.00'}</div>
                </div>
                <div style="padding: 1.5rem; background: white; border-radius: 8px; box-shadow: var(--shadow);">
                    <div style="font-size: 0.875rem; color: var(--text-light); margin-bottom: 0.5rem;">Total de Pedidos</div>
                    <div style="font-size: 2rem; font-weight: 700; color: var(--secondary);">${data.totalOrders || 0}</div>
                </div>
                <div style="padding: 1.5rem; background: white; border-radius: 8px; box-shadow: var(--shadow);">
                    <div style="font-size: 0.875rem; color: var(--text-light); margin-bottom: 0.5rem;">Valor Promedio</div>
                    <div style="font-size: 2rem; font-weight: 700; color: var(--warning);">$${data.averageOrderValue?.toFixed(2) || '0.00'}</div>
                </div>
            </div>
        `;
        
        if (data.ordersByStatus) {
            html += `
                <div style="margin-bottom: 1.5rem;">
                    <h4 style="margin-bottom: 1rem;">Pedidos por Estado</h4>
                    <div style="display: grid; gap: 0.5rem;">
                        ${Object.entries(data.ordersByStatus).map(([status, count]) => `
                            <div style="display: flex; justify-content: space-between; padding: 0.75rem; background: white; border-radius: 6px; box-shadow: var(--shadow);">
                                <span style="text-transform: capitalize;">${status}</span>
                                <strong>${count}</strong>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        if (data.orders && data.orders.length > 0) {
            html += `
                <div>
                    <h4 style="margin-bottom: 1rem;">Detalle de Pedidos (${data.orders.length})</h4>
                    <div style="max-height: 400px; overflow-y: auto;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="background: var(--bg);">
                                    <th style="padding: 0.75rem; text-align: left; border-bottom: 2px solid var(--border);">ID</th>
                                    <th style="padding: 0.75rem; text-align: left; border-bottom: 2px solid var(--border);">Total</th>
                                    <th style="padding: 0.75rem; text-align: left; border-bottom: 2px solid var(--border);">Estado</th>
                                    <th style="padding: 0.75rem; text-align: left; border-bottom: 2px solid var(--border);">Fecha</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.orders.slice(0, 50).map(order => `
                                    <tr style="border-bottom: 1px solid var(--border);">
                                        <td style="padding: 0.75rem;">${order.orderId?.substring(0, 8) || 'N/A'}</td>
                                        <td style="padding: 0.75rem;">$${order.total?.toFixed(2) || '0.00'}</td>
                                        <td style="padding: 0.75rem; text-transform: capitalize;">${order.status || 'N/A'}</td>
                                        <td style="padding: 0.75rem;">${order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        } else {
            html += `
                <div style="padding: 2rem; text-align: center; color: var(--text-light);">
                    <p>No se encontraron pedidos en el rango de fechas seleccionado.</p>
                    <p style="margin-top: 0.5rem; font-size: 0.875rem;">Asegúrate de haber realizado compras y que las fechas incluyan el período correcto.</p>
                </div>
            `;
        }
    } else if (report.type === 'inventory') {
        const data = report.data || {};
        html += `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                <div style="padding: 1.5rem; background: white; border-radius: 8px; box-shadow: var(--shadow);">
                    <div style="font-size: 0.875rem; color: var(--text-light); margin-bottom: 0.5rem;">Total Productos</div>
                    <div style="font-size: 2rem; font-weight: 700; color: var(--primary);">${data.totalProducts || 0}</div>
                </div>
                <div style="padding: 1.5rem; background: white; border-radius: 8px; box-shadow: var(--shadow);">
                    <div style="font-size: 0.875rem; color: var(--text-light); margin-bottom: 0.5rem;">Stock Total</div>
                    <div style="font-size: 2rem; font-weight: 700; color: var(--secondary);">${data.totalStock || 0}</div>
                </div>
                <div style="padding: 1.5rem; background: white; border-radius: 8px; box-shadow: var(--shadow);">
                    <div style="font-size: 0.875rem; color: var(--text-light); margin-bottom: 0.5rem;">Disponible</div>
                    <div style="font-size: 2rem; font-weight: 700; color: var(--secondary);">${data.totalAvailable || 0}</div>
                </div>
                <div style="padding: 1.5rem; background: white; border-radius: 8px; box-shadow: var(--shadow);">
                    <div style="font-size: 0.875rem; color: var(--text-light); margin-bottom: 0.5rem;">Bajo Stock</div>
                    <div style="font-size: 2rem; font-weight: 700; color: var(--danger);">${data.lowStockCount || 0}</div>
                </div>
            </div>
        `;
        
        if (data.lowStockItems && data.lowStockItems.length > 0) {
            html += `
                <div>
                    <h4 style="margin-bottom: 1rem; color: var(--danger);">Productos con Bajo Stock</h4>
                    <div style="display: grid; gap: 0.5rem;">
                        ${data.lowStockItems.map(item => `
                            <div style="display: flex; justify-content: space-between; padding: 0.75rem; background: white; border-radius: 6px; box-shadow: var(--shadow);">
                                <span>${item.productName || 'Producto ID: ' + (item.productId?.substring(0, 8) || 'N/A')}</span>
                                <strong style="color: var(--danger);">Stock: ${item.available || 0} (Umbral: ${item.threshold || 10})</strong>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
    } else if (report.type === 'products') {
        const data = report.data || {};
        html += `
            <div style="margin-bottom: 1.5rem;">
                <div style="padding: 1.5rem; background: white; border-radius: 8px; box-shadow: var(--shadow); display: inline-block;">
                    <div style="font-size: 0.875rem; color: var(--text-light); margin-bottom: 0.5rem;">Total de Productos</div>
                    <div style="font-size: 2.5rem; font-weight: 700; color: var(--primary);">${data.totalProducts || 0}</div>
                </div>
            </div>
        `;
        
        if (data.productsByCategory) {
            html += `
                <div style="margin-bottom: 1.5rem;">
                    <h4 style="margin-bottom: 1rem;">Productos por Categoría</h4>
                    <div style="display: grid; gap: 0.5rem;">
                        ${Object.entries(data.productsByCategory).map(([category, count]) => `
                            <div style="display: flex; justify-content: space-between; padding: 0.75rem; background: white; border-radius: 6px; box-shadow: var(--shadow);">
                                <span>${category || 'Sin categoría'}</span>
                                <strong>${count}</strong>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        if (data.products && data.products.length > 0) {
            html += `
                <div>
                    <h4 style="margin-bottom: 1rem;">Lista de Productos (${data.products.length})</h4>
                    <div style="max-height: 400px; overflow-y: auto;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="background: var(--bg);">
                                    <th style="padding: 0.75rem; text-align: left; border-bottom: 2px solid var(--border);">Nombre</th>
                                    <th style="padding: 0.75rem; text-align: left; border-bottom: 2px solid var(--border);">Categoría</th>
                                    <th style="padding: 0.75rem; text-align: left; border-bottom: 2px solid var(--border);">Precio</th>
                                    <th style="padding: 0.75rem; text-align: left; border-bottom: 2px solid var(--border);">Stock</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.products.slice(0, 100).map(product => `
                                    <tr style="border-bottom: 1px solid var(--border);">
                                        <td style="padding: 0.75rem;">${product.name || 'N/A'}</td>
                                        <td style="padding: 0.75rem;">${product.category || 'N/A'}</td>
                                        <td style="padding: 0.75rem;">$${product.price?.toFixed(2) || '0.00'}</td>
                                        <td style="padding: 0.75rem;">${product.stock || 0}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }
    }
    
    content.innerHTML = html;
    modal.style.display = 'flex';
}

function closeReportViewModal() {
    document.getElementById('report-view-modal').style.display = 'none';
}

async function deleteReport(reportId) {
    if (!currentUser || currentUser.role !== 'admin') {
        showToast('Solo administradores pueden eliminar reportes', 'error');
        return;
    }
    
    if (!confirm('¿Estás seguro de que deseas eliminar este reporte?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/reports/${reportId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            showToast('Reporte eliminado exitosamente', 'success');
            await loadAdminReports();
        } else {
            const error = await response.json().catch(() => ({ error: 'Error desconocido' }));
            showToast(error.error || 'Error al eliminar reporte', 'error');
        }
    } catch (error) {
        showToast('Error de conexión: ' + error.message, 'error');
        console.error('Error deleting report:', error);
    }
}

// Make functions globally available
window.showReportModal = showReportModal;
window.closeReportModal = closeReportModal;
window.generateReport = generateReport;
window.generateInventoryReport = generateInventoryReport;
window.generateProductsReport = generateProductsReport;
window.viewReport = viewReport;
window.closeReportViewModal = closeReportViewModal;
window.deleteReport = deleteReport;

