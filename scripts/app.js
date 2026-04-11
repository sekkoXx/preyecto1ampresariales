const API_BASE = 'http://127.0.0.1:8000';

const State = {
    products: [],
    sales: [],
    token: localStorage.getItem('nexpos_token') || '',
    currentUser: null,

    get isAuthenticated() {
        return Boolean(this.token);
    },

    notify(msg, isError = false) {
        alert(msg);
        if (isError) {
            console.error(msg);
        }
    },

    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('nexpos_token', token);
        } else {
            localStorage.removeItem('nexpos_token');
        }
    },

    async request(path, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        };

        if (this.token) {
            headers.Authorization = `Bearer ${this.token}`;
        }

        const response = await fetch(`${API_BASE}${path}`, {
            ...options,
            headers,
        });

        if (response.status === 401) {
            this.logout();
            throw new Error('Tu sesion expiro. Inicia sesion de nuevo.');
        }

        if (!response.ok) {
            let detail = 'Error en la solicitud';
            try {
                const data = await response.json();
                detail = data.detail || detail;
            } catch (_) {
                // Ignore parse errors and keep generic message.
            }
            throw new Error(detail);
        }

        if (response.status === 204) {
            return null;
        }

        return response.json();
    },

    async login(username, password) {
        const data = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
        });
        this.setToken(data.access_token);
        await this.loadCurrentUser();
    },

    logout() {
        this.setToken('');
        this.currentUser = null;
        this.products = [];
        this.sales = [];
        document.getElementById('auth-overlay').classList.add('active');
    },

    async loadCurrentUser() {
        this.currentUser = await this.request('/auth/me');
        const label = document.getElementById('user-label');
        label.innerText = `Bienvenido, ${this.currentUser.username}`;
    },

    async fetchProducts() {
        this.products = await this.request('/productos');
        window.dispatchEvent(new Event('productsUpdated'));
    },

    async createProduct(payload) {
        await this.request('/productos', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        await this.fetchProducts();
    },

    async updateProduct(id, payload) {
        await this.request(`/productos/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        });
        await this.fetchProducts();
    },

    async deleteProduct(id) {
        await this.request(`/productos/${id}`, {
            method: 'DELETE',
        });
        await this.fetchProducts();
    },

    async fetchSales() {
        this.sales = await this.request('/ventas');
        window.dispatchEvent(new Event('salesUpdated'));
    },

    async createSale(cartItems) {
        const payload = {
            productos: cartItems.map(item => ({
                producto_id: Number(item.id),
                cantidad: item.quantity,
            })),
        };
        await this.request('/ventas', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        await Promise.all([this.fetchProducts(), this.fetchSales()]);
    },

    async init() {
        if (!this.token) {
            return;
        }

        try {
            await this.loadCurrentUser();
            await Promise.all([this.fetchProducts(), this.fetchSales()]);
            document.getElementById('auth-overlay').classList.remove('active');
        } catch (error) {
            this.notify(error.message, true);
            this.logout();
        }
    },
};

window.State = State;

document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('.nav-links li');
    const views = document.querySelectorAll('.view');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const logoutButton = document.getElementById('btn-logout');

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navLinks.forEach(l => l.classList.remove('active'));
            views.forEach(v => v.classList.remove('active'));

            link.classList.add('active');
            const target = link.getAttribute('data-target');
            document.getElementById(target).classList.add('active');

            if (target === 'inventory') {
                window.dispatchEvent(new Event('productsUpdated'));
            }
            if (target === 'sales') {
                window.dispatchEvent(new Event('productsUpdated'));
            }
            if (target === 'dashboard') {
                updateDashboard();
            }
        });
    });

    function updateDashboard() {
        document.getElementById('dash-total-products').innerText = State.products.length;

        const lowStockCount = State.products.filter(p => p.stock < 10).length;
        document.getElementById('dash-low-stock').innerText = lowStockCount;

        const totalSales = State.sales.reduce((sum, sale) => sum + sale.total, 0);
        document.getElementById('dash-total-sales').innerText = `$${totalSales.toFixed(2)}`;
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        loginError.innerText = '';

        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;

        try {
            await State.login(username, password);
            await Promise.all([State.fetchProducts(), State.fetchSales()]);
            document.getElementById('auth-overlay').classList.remove('active');
            updateDashboard();
        } catch (error) {
            loginError.innerText = error.message;
        }
    });

    logoutButton.addEventListener('click', () => {
        State.logout();
    });

    window.addEventListener('productsUpdated', updateDashboard);
    window.addEventListener('salesUpdated', updateDashboard);

    updateDashboard();
    State.init().then(updateDashboard);
});