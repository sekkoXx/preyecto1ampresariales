document.addEventListener('DOMContentLoaded', () => {
    const productGrid = document.getElementById('pos-product-grid');
    const searchInput = document.getElementById('pos-search');
    const cartItemsContainer = document.getElementById('cart-items');
    
    // Cart state
    let cart = [];

    function renderProducts(filter = '') {
        productGrid.innerHTML = '';
        
        // Solo mostrar productos con stock disponible
        const availableProducts = State.products.filter(p => p.stock > 0);
        
        const products = availableProducts.filter(p => 
            p.name.toLowerCase().includes(filter.toLowerCase()) || 
            p.category.toLowerCase().includes(filter.toLowerCase())
        );

        if (products.length === 0) {
            productGrid.innerHTML = '<p style="grid-column: 1/-1; text-align:center; color: var(--text-muted);">No hay productos disponibles.</p>';
            return;
        }

        products.forEach(p => {
            const imgHtml = (p.images && p.images.length > 0) 
                            ? `<img src="${p.images[0]}" class="product-img">` 
                            : `<div class="product-img"><i class='bx bx-image'></i></div>`;

            const div = document.createElement('div');
            div.className = 'product-card';
            div.innerHTML = `
                ${imgHtml}
                <h4>${p.name}</h4>
                <div class="price">$${parseFloat(p.price).toFixed(2)}</div>
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
                    <h5>${item.name}</h5>
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
        const existingItem = cart.find(item => item.id === product.id);
        
        if (existingItem) {
            if (existingItem.quantity < product.stock) {
                existingItem.quantity += 1;
            } else {
                State.notify('No hay suficiente stock disponible.', true);
            }
        } else {
            cart.push({ ...product, quantity: 1 });
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

    document.getElementById('btn-process-sale').addEventListener('click', () => {
        if (cart.length === 0) {
            State.notify('El carrito está vacío.');
            return;
        }

        // Process Sale
        const saleTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        // 1. Decrease stock for each item sold
        cart.forEach(cartItem => {
            const productIndex = State.products.findIndex(p => p.id === cartItem.id);
            if (productIndex !== -1) {
                State.products[productIndex].stock -= cartItem.quantity;
            }
        });

        // 2. Record the sale
        const newSale = {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            items: [...cart],
            total: saleTotal
        };

        State.sales.push(newSale);
        
        // 3. Save updates to local storage
        State.saveProducts();
        State.saveSales();

        // 4. Clear Cart and notify
        cart = [];
        renderCart();
        renderProducts(searchInput.value);
        State.notify('¡Venta registrada con éxito!');
    });

    window.addEventListener('productsUpdated', () => renderProducts());
    
    // Initial Render
    renderProducts();
    renderCart();
});
