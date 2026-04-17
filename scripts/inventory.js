document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('inventory-table-body');
    const searchInput = document.getElementById('inventory-search');
    
    //  NUEVOS FILTROS
    const filterCategory = document.getElementById('filter-category');
    const filterMinPrice = document.getElementById('filter-min-price');
    const filterMaxPrice = document.getElementById('filter-max-price');
    const filterSoldByMe = document.getElementById('filter-sold-by-me');
    
    // Modal elements
    const modal = document.getElementById('product-modal');
    const form = document.getElementById('product-form');
    const btnAdd = document.getElementById('btn-add-product');
    const btnCloseElements = document.querySelectorAll('.close-modal');
    const modalTitle = document.getElementById('modal-title');
    const fileInput = document.getElementById('product-images');
    const imagePreview = document.getElementById('image-preview');
    
    let currentProductImages = [];

    //  NUEVO: GENERAR CATEGORÍAS DINÁMICAS
    function cargarCategorias() {
        if (!filterCategory) return;

        const categorias = [...new Set(
            State.products.map(p => (p.category || p.categoria || '').toLowerCase())
        )];

        filterCategory.innerHTML = '<option value="">Todas</option>';

        categorias.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            filterCategory.appendChild(option);
        });
    }

    function renderTable(filter = '') {
        if (!State.isAuthenticated) {
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Inicia sesion para ver productos.</td></tr>';
            return;
        }

        tableBody.innerHTML = '';

        // valores de filtros
        const categoriaFiltro = filterCategory?.value.toLowerCase() || '';
        const precioMin = parseFloat(filterMinPrice?.value) || 0;
        const precioMax = parseFloat(filterMaxPrice?.value) || Infinity;

        let alertShown = false;
        
        const isSeller = State.currentUser?.rol === 'seller';
        const onlySoldByMe = isSeller && filterSoldByMe && filterSoldByMe.checked;

        const products = State.products.filter(p => {
            const nombre = (p.name || p.nombre || '').toLowerCase();
            const categoria = (p.category || p.categoria || '').toLowerCase();
            const precio = p.price || p.precio;
            const search = filter.toLowerCase();

            const matchSearch = nombre.includes(search) || categoria.includes(search);
            const matchCategory = categoria.includes(categoriaFiltro);
            const matchPrice = precio >= precioMin && precio <= precioMax;
            const matchSeller = !onlySoldByMe || p.seller_id === State.currentUser?.id;

            return matchSearch && matchCategory && matchPrice && matchSeller;
        });

        if (products.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No se encontraron productos.</td></tr>';
            return;
        }

        products.forEach(p => {
            const tr = document.createElement('tr');
            
            //  ALERTA STOCK BAJO SOLO PARA VENDEDORES Y SUS PRODUCTOS
            if (p.stock < 5 && p.seller_id === State.currentUser?.id && !alertShown) {
                State.notify(`⚠️ Tienes stock bajo en tu producto: ${p.name || p.nombre}`);
                alertShown = true;
            }

            const stockClass = p.stock < 10 ? 'low-stock' : '';
            const nombre = p.name || p.nombre;
            const categoria = p.category || p.categoria;
            const precio = p.price || p.precio;

            tr.innerHTML = `
                <td>#${p.id}</td>
                <td><strong>${nombre}</strong></td>
                <td>${categoria}</td>
                <td>$${parseFloat(precio).toFixed(2)}</td>
                <td class="${stockClass}">${p.stock}</td>
                <td><span class="badge" style="background:#e0e7ff;color:#3730a3;">${p.seller_username || 'Sistema'}</span></td>
                ${['admin', 'seller'].includes(State.currentUser?.rol) ? `
                <td class="actions-cell">
                    <button class="btn btn-secondary btn-icon" onclick="editProduct('${p.id}')">
                        <i class='bx bx-edit-alt'></i>
                    </button>
                    <button class="btn btn-danger btn-icon" onclick="deleteProduct('${p.id}')">
                        <i class='bx bx-trash'></i>
                    </button>
                </td>
                ` : '<td class="seller-only" style="display:none;"></td>'}
            `;
            tableBody.appendChild(tr);
        });
    }

    searchInput.addEventListener('input', (e) => {
        renderTable(e.target.value);
    });

    //  EVENTOS DE FILTROS
    filterCategory?.addEventListener('input', () => renderTable(searchInput.value));
    filterMinPrice?.addEventListener('input', () => renderTable(searchInput.value));
    filterMaxPrice?.addEventListener('input', () => renderTable(searchInput.value));
    filterSoldByMe?.addEventListener('change', () => renderTable(searchInput.value));

    //  ACTUALIZAR TODO AL CAMBIAR PRODUCTOS
    window.addEventListener('productsUpdated', () => {
        cargarCategorias();
        renderTable(searchInput.value);
    });

    // Image Upload Logic
    fileInput.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);
        if (currentProductImages.length + files.length > 5) {
            State.notify('Solo puedes subir un máximo de 5 imágenes.', true);
            e.target.value = '';
            return;
        }

        for (const file of files) {
            if (currentProductImages.length >= 5) break;
            const base64 = await resizeImage(file);
            currentProductImages.push(base64);
        }
        
        e.target.value = '';
        renderImagePreviews();
    });

    function renderImagePreviews() {
        imagePreview.innerHTML = '';
        currentProductImages.forEach((img, index) => {
            const div = document.createElement('div');
            div.className = 'preview-img-container';
            div.innerHTML = `
                <img src="${img}" class="preview-img">
                <button type="button" class="remove-img-btn" onclick="removeImage(${index})">&times;</button>
            `;
            imagePreview.appendChild(div);
        });
    }

    window.removeImage = function(index) {
        currentProductImages.splice(index, 1);
        renderImagePreviews();
    };

    function resizeImage(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    const MAX_WIDTH = 300;
                    const MAX_HEIGHT = 300;
                    let width = img.width;
                    let height = img.height;
                    
                    if (width > height) {
                        if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                    } else {
                        if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.7));
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    // Modal Logic
    btnAdd.addEventListener('click', () => {
        form.reset();
        document.getElementById('product-id').value = '';
        currentProductImages = [];
        renderImagePreviews();
        modalTitle.innerText = 'Agregar Nuevo Producto';
        modal.classList.add('active');
    });

    btnCloseElements.forEach(btn => {
        btn.addEventListener('click', () => {
            modal.classList.remove('active');
        });
    });

    // Form Submit (Create / Update)
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const id = document.getElementById('product-id').value;
        const nombre = document.getElementById('product-name').value.trim();
        const categoria = document.getElementById('product-category').value.trim();
        const precio = parseFloat(document.getElementById('product-price').value);
        const stock = parseInt(document.getElementById('product-stock').value);

        if (nombre.length < 2) {
            State.notify('El nombre del producto debe tener al menos 2 caracteres.', true);
            return;
        }
        if (precio < 0.01) {
            State.notify('El precio debe ser al menos 0.01.', true);
            return;
        }
        if (stock < 0) {
            State.notify('El stock no puede ser negativo.', true);
            return;
        }

        const payload = {
            nombre,
            categoria,
            precio,
            stock,
            imagenes: currentProductImages,
        };

        try {
            if (id) {
                await State.updateProduct(id, payload);
            } else {
                await State.createProduct(payload);
            }
            modal.classList.remove('active');
        } catch (error) {
            State.notify(error.message, true);
        }
    });

    window.editProduct = function(id) {
        const product = State.products.find(p => p.id === id);
        if (product) {
            document.getElementById('product-id').value = product.id;
            document.getElementById('product-name').value = product.name || product.nombre;
            document.getElementById('product-category').value = product.category || product.categoria;
            document.getElementById('product-price').value = product.price || product.precio;
            document.getElementById('product-stock').value = product.stock;
            
            currentProductImages = product.images || product.imagenes ? [...(product.images || product.imagenes)] : [];
            renderImagePreviews();
            
            modalTitle.innerText = 'Editar Producto';
            modal.classList.add('active');
        }
    };

    // =============================
// CARGAR CATEGORÍAS DINÁMICAS
// =============================
function loadCategories() {
    if (!filterCategory) return;

    const categorias = [...new Set(State.products.map(p => p.category || p.categoria))];

    filterCategory.innerHTML = '<option value="">Todas</option>';

    categorias.forEach(cat => {
        if (!cat) return;
        const option = document.createElement('option');
        option.value = cat.toLowerCase();
        option.textContent = cat;
        filterCategory.appendChild(option);
    });
}

// Se ejecuta cuando cambian productos
window.addEventListener('productsUpdated', loadCategories);

// Ejecutar al inicio
loadCategories();

    window.deleteProduct = async function(id) {
        if (confirm('¿Estás seguro de que deseas eliminar este producto?')) {
            try {
                await State.deleteProduct(id);
            } catch (error) {
                State.notify(error.message, true);
            }
        }
    };

    // INIT
    cargarCategorias();
    renderTable();
});