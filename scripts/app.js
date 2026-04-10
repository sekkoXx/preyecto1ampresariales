// Database/State Management using LocalStorage
const State = {
    products: [],
    sales: [],
    
    init() {
        const storedProducts = localStorage.getItem('nexpos_products');
        const storedSales = localStorage.getItem('nexpos_sales');
        
        if (storedProducts) {
            this.products = JSON.parse(storedProducts);
        } else {
            // Demo data if empty
            this.products = [
                { id: '1', name: 'Laptop Ultrabook', category: 'Electrónica', price: 850.00, stock: 15 },
                { id: '2', name: 'Mouse Inalámbrico', category: 'Accesorios', price: 25.50, stock: 50 },
                { id: '3', name: 'Teclado Mecánico', category: 'Accesorios', price: 75.00, stock: 5 },
                { id: '4', name: 'Monitor 24"', category: 'Electrónica', price: 150.00, stock: 20 }
            ];
            this.saveProducts();
        }

        if (storedSales) {
            this.sales = JSON.parse(storedSales);
        }
    },

    saveProducts() {
        localStorage.setItem('nexpos_products', JSON.stringify(this.products));
        window.dispatchEvent(new Event('productsUpdated'));
    },

    saveSales() {
        localStorage.setItem('nexpos_sales', JSON.stringify(this.sales));
        window.dispatchEvent(new Event('salesUpdated'));
    },
    
    // Notifications utility
    notify(msg, isError = false) {
        // A simple alert for now
        alert(msg);
    }
};

// Application Logic
document.addEventListener('DOMContentLoaded', () => {
    State.init();
    
    // Navigation Logic
    const navLinks = document.querySelectorAll('.nav-links li');
    const views = document.querySelectorAll('.view');

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navLinks.forEach(l => l.classList.remove('active'));
            views.forEach(v => v.classList.remove('active'));

            link.classList.add('active');
            const target = link.getAttribute('data-target');
            document.getElementById(target).classList.add('active');

            // View specific refresh
            if (target === 'dashboard') updateDashboard();
            if (target === 'inventory') window.dispatchEvent(new Event('productsUpdated'));
            if (target === 'sales') window.dispatchEvent(new Event('productsUpdated'));
        });
    });

    // Dashboard Updates
    function updateDashboard() {
        document.getElementById('dash-total-products').innerText = State.products.length;
        
        const lowStockCount = State.products.filter(p => p.stock < 10).length;
        document.getElementById('dash-low-stock').innerText = lowStockCount;

        const totalSales = State.sales.reduce((sum, sale) => sum + sale.total, 0);
        document.getElementById('dash-total-sales').innerText = `$${totalSales.toFixed(2)}`;
    }

    // Initialize Dashboard
    updateDashboard();

    // Listen to updates
    window.addEventListener('productsUpdated', updateDashboard);
    window.addEventListener('salesUpdated', updateDashboard);
});
