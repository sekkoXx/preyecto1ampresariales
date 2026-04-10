document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('inventory-table-body');
    const searchInput = document.getElementById('inventory-search');
    
    // Modal elements
    const modal = document.getElementById('product-modal');
    const form = document.getElementById('product-form');
    const btnAdd = document.getElementById('btn-add-product');
    const btnCloseElements = document.querySelectorAll('.close-modal');
    const modalTitle = document.getElementById('modal-title');
    const fileInput = document.getElementById('product-images');
    const imagePreview = document.getElementById('image-preview');
    
    let currentProductImages = [];

    function renderTable(filter = '') {
        tableBody.innerHTML = '';
        
        const products = State.products.filter(p => 
            p.name.toLowerCase().includes(filter.toLowerCase()) || 
            p.category.toLowerCase().includes(filter.toLowerCase())
        );

        if (products.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No se encontraron productos.</td></tr>';
            return;
        }

        products.forEach(p => {
            const tr = document.createElement('tr');
            
            // Highlight low stock
            const stockClass = p.stock < 10 ? 'low-stock' : '';

            tr.innerHTML = `
                <td>#${p.id}</td>
                <td><strong>${p.name}</strong></td>
                <td>${p.category}</td>
                <td>$${parseFloat(p.price).toFixed(2)}</td>
                <td class="${stockClass}">${p.stock}</td>
                <td class="actions-cell">
                    <button class="btn btn-secondary btn-icon" onclick="editProduct('${p.id}')">
                        <i class='bx bx-edit-alt'></i>
                    </button>
                    <button class="btn btn-danger btn-icon" onclick="deleteProduct('${p.id}')">
                        <i class='bx bx-trash'></i>
                    </button>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    }

    searchInput.addEventListener('input', (e) => {
        renderTable(e.target.value);
    });

    // Listen for state changes
    window.addEventListener('productsUpdated', () => renderTable(searchInput.value));

    // Image Upload Logic
    fileInput.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);
        if (currentProductImages.length + files.length > 5) {
            State.notify('Solo puedes subir un máximo de 5 imágenes.', true);
            e.target.value = ''; // reset
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
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const id = document.getElementById('product-id').value;
        const nombre = document.getElementById('product-name').value;
        const categoria = document.getElementById('product-category').value;
        const precio = parseFloat(document.getElementById('product-price').value);
        const stock = parseInt(document.getElementById('product-stock').value);

        if (id) {
            // Update
            const index = State.products.findIndex(p => p.id === id);
            if (index !== -1) {
                State.products[index] = { id, name: nombre, category: categoria, price: precio, stock, images: currentProductImages };
            }
        } else {
            // Create
            const newId = Date.now().toString(); // simple ID generator
            State.products.push({ id: newId, name: nombre, category: categoria, price: precio, stock, images: currentProductImages });
        }

        State.saveProducts();
        modal.classList.remove('active');
    });

    // Expose edit and delete to global scope for inline handlers
    window.editProduct = function(id) {
        const product = State.products.find(p => p.id === id);
        if (product) {
            document.getElementById('product-id').value = product.id;
            document.getElementById('product-name').value = product.name;
            document.getElementById('product-category').value = product.category;
            document.getElementById('product-price').value = product.price;
            document.getElementById('product-stock').value = product.stock;
            
            currentProductImages = product.images ? [...product.images] : [];
            renderImagePreviews();
            
            modalTitle.innerText = 'Editar Producto';
            modal.classList.add('active');
        }
    };

    window.deleteProduct = function(id) {
        if (confirm('¿Estás seguro de que deseas eliminar este producto?')) {
            State.products = State.products.filter(p => p.id !== id);
            State.saveProducts();
        }
    };

    // Initial render
    renderTable();
});
