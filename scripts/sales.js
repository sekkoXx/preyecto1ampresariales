document.addEventListener('DOMContentLoaded', () => {
    const productGrid = document.getElementById('pos-product-grid');
    const searchInput = document.getElementById('pos-search');
    const cartItemsContainer = document.getElementById('cart-items');
    const salesPanelTitle = document.getElementById('sales-panel-title');
    const processButton = document.getElementById('btn-process-sale');
    const clearButton = document.getElementById('btn-clear-cart');

    function updateSalesModeLabels() {
        const isBuyer = State.currentUser?.rol === 'buyer';
        if (salesPanelTitle) {
            salesPanelTitle.innerText = isBuyer ? 'Carrito de Compra' : 'Carrito de Venta';
        }
        if (searchInput) {
            searchInput.placeholder = isBuyer ? 'Buscar productos para comprar...' : 'Buscar productos para vender...';
        }
        if (processButton) {
            processButton.innerText = isBuyer ? 'Finalizar Compra' : 'Procesar Venta';
        }
        if (clearButton) {
            clearButton.innerText = isBuyer ? 'Cancelar Compra' : 'Cancelar Venta';
        }
    }

    window.addEventListener('userChanged', updateSalesModeLabels);
    
    // Cart state
    let cart = [];

    function renderProducts(filter = '') {
        if (!State.isAuthenticated) {
            productGrid.innerHTML = '<div class="empty-state" style="grid-column: 1/-1;"><i class="bx bx-lock-alt"></i><h3>Inicia Sesión</h3><p>Para poder comprar, necesitas iniciar sesión.</p></div>';
            return;
        }

        if (State.isLoadingProducts) {
            productGrid.innerHTML = Array.from({length: 8}).map(() => `
                <div class="product-card skeleton" style="border: none;">
                    <div class="skeleton-card" style="height: 120px; margin-bottom: 12px; border-radius: var(--radius-md);"></div>
                    <div class="skeleton-text" style="width: 80%; margin: 0 auto 8px auto;"></div>
                    <div class="skeleton-text" style="width: 50%; margin: 0 auto 8px auto; height: 18px;"></div>
                    <div class="skeleton-text" style="width: 60%; margin: 0 auto;"></div>
                </div>
            `).join('');
            return;
        }

        productGrid.innerHTML = '';
        
        // Solo mostrar productos con stock disponible
        const availableProducts = State.products.filter(p => p.stock > 0);
        
        const products = availableProducts.filter(p => {
            const nombre = (p.name || p.nombre || '').toLowerCase();
            const categoria = (p.category || p.categoria || '').toLowerCase();
            const search = filter.toLowerCase();
            return nombre.includes(search) || categoria.includes(search);
        });

        if (products.length === 0) {
            const isBuyer = State.currentUser?.rol === 'buyer';
            productGrid.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1;">
                    <i class="bx bx-receipt"></i>
                    <h3>No hay productos disponibles</h3>
                    <p>${isBuyer ? 'Intenta buscar con otros términos.' : 'Agrega stock a tus productos en el Inventario para vender.'}</p>
                </div>
            `;
            return;
        }

        products.forEach(p => {
            const images = p.images || p.imagenes || [];
            const nombre = p.name || p.nombre;
            const precio = p.price || p.precio;
            const imgHtml = (images && images.length > 0) 
                            ? `<img src="${images[0]}" class="product-img">` 
                            : `<div class="product-img"><i class='bx bx-image'></i></div>`;

            const div = document.createElement('div');
            div.className = 'product-card';
            div.innerHTML = `
                ${imgHtml}
                <h4>${nombre}</h4>
                <div class="price">$${parseFloat(precio).toFixed(2)}</div>
                <div class="stock">Disponibles: ${p.stock}</div>
            `;
            div.addEventListener('click', () => addToCart(p));
            productGrid.appendChild(div);
        });
    }

    searchInput.addEventListener('input', (e) => {
        renderProducts(e.target.value);
    });

    function renderCart() {
        cartItemsContainer.innerHTML = '';
        let total = 0;

        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<p style="text-align:center; color: var(--text-muted); margin-top:20px;">El carrito está vacío</p>';
        }

        cart.forEach((item, index) => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;

            const div = document.createElement('div');
            div.className = 'cart-item';
            div.innerHTML = `
                <div class="cart-item-info">
                    <h5>${item.name || item.nombre}</h5>
                    <p>$${item.price.toFixed(2)} c/u</p>
                </div>
                <div class="cart-item-controls">
                    <button class="qty-btn" onclick="updateCartQty(${index}, -1)">-</button>
                    <span>${item.quantity}</span>
                    <button class="qty-btn" onclick="updateCartQty(${index}, 1)">+</button>
                </div>
                <div class="cart-item-total">
                    $${itemTotal.toFixed(2)}
                </div>
                <i class='bx bx-trash remove-item' onclick="removeFromCart(${index})"></i>
            `;
            cartItemsContainer.appendChild(div);
        });

        document.getElementById('cart-subtotal').innerText = `$${total.toFixed(2)}`;
        document.getElementById('cart-total').innerText = `$${total.toFixed(2)}`;
    }

    function addToCart(product) {
        const productPrice = Number(product.price || product.precio);
        const existingItem = cart.find(item => item.id === product.id);
        
        if (existingItem) {
            if (existingItem.quantity < product.stock) {
                existingItem.quantity += 1;
            } else {
                State.notify('No hay suficiente stock disponible.', true);
            }
        } else {
            cart.push({ ...product, price: productPrice, quantity: 1 });
        }
        
        renderCart();
    }

    window.updateCartQty = function(index, change) {
        const item = cart[index];
        const newQty = item.quantity + change;
        
        const product = State.products.find(p => p.id === item.id);
        
        if (newQty > 0) {
            if (newQty <= product.stock) {
                item.quantity = newQty;
            } else {
                State.notify('Stock máximo alcanzado.');
            }
        } else {
            removeFromCart(index);
        }
        renderCart();
    };

    window.removeFromCart = function(index) {
        cart.splice(index, 1);
        renderCart();
    };

    document.getElementById('btn-clear-cart').addEventListener('click', () => {
        cart = [];
        renderCart();
    });

    document.getElementById('btn-process-sale').addEventListener('click', async () => {
        if (cart.length === 0) {
            State.notify('El carrito está vacío.');
            return;
        }

        try {
            await State.createSale(cart);

            //  actualizar historial automáticamente
            if (State.currentUser?.rol === 'buyer' && State.fetchPurchaseHistory) {
                await State.fetchPurchaseHistory();
            }

            cart = [];
            renderCart();
            renderProducts(searchInput.value);
            State.notify(State.currentUser?.rol === 'buyer' ? '¡Compra registrada con éxito!' : '¡Venta registrada con éxito!');
        } catch (error) {
            State.notify(error.message, true);
        }
    });

    window.addEventListener('productsUpdated', () => renderProducts(searchInput.value));
    window.addEventListener('productsLoading', () => renderProducts(searchInput.value));
    
    // Initial Render
    updateSalesModeLabels();
    renderProducts();
    renderCart();
});