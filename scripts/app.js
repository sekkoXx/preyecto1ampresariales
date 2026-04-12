const API_BASE = 'http://127.0.0.1:8000';

const State = {
    products: [],
    sales: [],
    users: [], // For admin
    chartData: [],
    
    
    purchaseHistory: [],

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
            } catch (_) { }
            throw new Error(detail);
        }

        if (response.status === 204) {
            return null;
        }

        return response.json();
    },

    async register(username, password, rol) {
        return this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ username, password, rol }),
        });
    },

    async login(username, password) {
        const data = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
        });
        this.setToken(data.access_token);
        await this.loadCurrentUser();

        
        if (this.currentUser.rol === 'seller' && !this.currentUser.is_approved) {
            this.logout();
            throw new Error('Tu cuenta de vendedor está pendiente de aprobación.');
        }
    },

    logout() {
        this.setToken('');
        this.currentUser = null;
        this.products = [];
        this.sales = [];
        this.users = [];
        this.purchaseHistory = [];
        document.getElementById('auth-overlay').classList.add('active');
    },

    async loadCurrentUser() {
        this.currentUser = await this.request('/auth/me');
        const label = document.getElementById('user-label');
        const badge = document.getElementById('user-role-badge');
        label.innerText = `Bienvenido, ${this.currentUser.username}`;
        badge.innerText = this.currentUser.rol.toUpperCase();
        badge.className = `badge ${this.currentUser.rol}`;

        const isSellerOrAdmin = ['admin', 'seller'].includes(this.currentUser.rol);
        const isAdmin = this.currentUser.rol === 'admin';

        document.getElementById('nav-sales').style.display = isSellerOrAdmin ? 'flex' : 'none';
        document.getElementById('nav-admin').style.display = isAdmin ? 'flex' : 'none';
        
        document.querySelectorAll('.seller-only').forEach(el => {
            el.style.display = isSellerOrAdmin ? '' : 'none';
        });

        if (isAdmin) {
            await this.fetchUsers();
            this.renderAdminUsers();
        }

        if (isSellerOrAdmin) {
            await this.fetchChartData();
        }
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

        await Promise.all([this.fetchProducts(), this.fetchSales(), this.fetchPurchaseHistory()]);

        if (['admin', 'seller'].includes(this.currentUser.rol)) {
            await this.fetchChartData();
        }
    },

    async fetchUsers() {
        this.users = await this.request('/admin/users');
    },

    async approveUser(userId, isApproved) {
        await this.request(`/admin/users/${userId}/approve?is_approved=${isApproved}`, { method: 'PUT' });
        await this.fetchUsers();
        this.renderAdminUsers();
    },

    renderAdminUsers() {
        const tbody = document.getElementById('admin-users-table');
        if (!tbody) return;
        tbody.innerHTML = '';
        this.users.forEach(u => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${u.id}</td>
                <td>${u.username}</td>
                <td><span class="badge ${u.rol}">${u.rol}</span></td>
                <td>${u.is_approved ? 'Aprobado' : 'Pendiente'}</td>
                <td>
                    ${u.rol !== 'admin' && !u.is_approved ? 
                        `<button class="btn btn-success btn-icon" onclick="State.approveUser(${u.id}, true)"><i class='bx bx-check'></i></button>` 
                        : ''}
                    ${u.rol !== 'admin' && u.is_approved ? 
                        `<button class="btn btn-danger btn-icon" onclick="State.approveUser(${u.id}, false)"><i class='bx bx-x'></i></button>`
                        : ''}
                </td>
            `;
            tbody.appendChild(tr);
        });
    },

    async fetchChartData() {
        try {
            this.chartData = await this.request('/metrics/sales-chart');
            window.dispatchEvent(new Event('chartUpdated'));
        } catch(e) {}
    },

    
    async fetchPurchaseHistory() {
        this.purchaseHistory = await this.request('/ventas');
        window.dispatchEvent(new Event('historyUpdated'));
    },

    async init() {
        if (!this.token) return;
        try {
            await this.loadCurrentUser();
            await Promise.all([
                this.fetchProducts(),
                this.fetchSales(),
                this.fetchPurchaseHistory()
            ]);
            document.getElementById('auth-overlay').classList.remove('active');
        } catch (error) {
            this.logout();
        }
    },
};

window.State = State;

let salesChartObj = null;

document.addEventListener('DOMContentLoaded', () => {

    const navLinks = document.querySelectorAll('.nav-links li');
    const views = document.querySelectorAll('.view');

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (link.style.display === 'none') return;
            navLinks.forEach(l => l.classList.remove('active'));
            views.forEach(v => v.classList.remove('active'));

            link.classList.add('active');
            const target = link.getAttribute('data-target');
            document.getElementById(target).classList.add('active');

            if (target === 'inventory') window.dispatchEvent(new Event('productsUpdated'));
            if (target === 'sales') window.dispatchEvent(new Event('productsUpdated'));
            if (target === 'dashboard') updateDashboard();
            if (target === 'history') renderHistory(); 
        });
    });

    function updateDashboard() {
        if (State.currentUser?.rol === 'seller') {
            const sellerProducts = State.products.filter(p => p.seller_id === State.currentUser.id);
            document.getElementById('dash-total-products').innerText = sellerProducts.length;
            
            // For seller, total sales from chart data which is already filtered in backend
            const totalSales = State.chartData.reduce((sum, item) => sum + item.total, 0);
            document.getElementById('dash-total-sales').innerText = `$${totalSales.toFixed(2)}`;
        } else {
            document.getElementById('dash-total-products').innerText = State.products.length;
            const totalSales = State.sales.reduce((sum, sale) => sum + sale.total, 0);
            document.getElementById('dash-total-sales').innerText = `$${totalSales.toFixed(2)}`;
        }
    }

    window.addEventListener('productsUpdated', updateDashboard);
    window.addEventListener('salesUpdated', updateDashboard);
    window.addEventListener('chartUpdated', updateDashboard);

    //  render historial
    function renderHistory() {
        const container = document.getElementById('history-container');
        if (!container) return;

        container.innerHTML = '';

        State.purchaseHistory.forEach(s => {
            const div = document.createElement('div');
            div.className = 'history-item';
            div.innerHTML = `
                <p><strong>Fecha:</strong> ${s.fecha || '---'}</p>
                <p><strong>Total:</strong> $${s.total}</p>
            `;
            container.appendChild(div);
        });
    }

    window.addEventListener('historyUpdated', renderHistory);

    // Auth
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const authError = document.getElementById('auth-error');

    document.getElementById('link-to-register').addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        document.getElementById('auth-title').innerText = 'Crear cuenta nueva';
        authError.innerText = '';
    });

    document.getElementById('link-to-login').addEventListener('click', (e) => {
        e.preventDefault();
        registerForm.style.display = 'none';
        loginForm.style.display = 'block';
        document.getElementById('auth-title').innerText = 'Inicia sesion para continuar';
        authError.innerText = '';
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        authError.innerText = '';
        const user = document.getElementById('login-username').value.trim();
        const pass = document.getElementById('login-password').value;

        try {
            await State.login(user, pass);
            await Promise.all([State.fetchProducts(), State.fetchSales()]);
            document.getElementById('auth-overlay').classList.remove('active');
            updateDashboard();
        } catch (err) {
            authError.innerText = err.message;
        }
    });

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        authError.innerText = '';
        const user = document.getElementById('reg-username').value.trim();
        const pass = document.getElementById('reg-password').value;
        const role = document.getElementById('reg-role').value;

        try {
            await State.register(user, pass, role);
            State.notify(role === 'seller' ? 'Cuenta creada. Espera aprobación del Admin.' : 'Cuenta creada.');
            document.getElementById('link-to-login').click();
        } catch (err) {
            authError.innerText = err.message;
        }
    });

    document.getElementById('btn-logout').addEventListener('click', () => {
        State.logout();
    });

    const btnExportPdf = document.getElementById('btn-export-pdf');
    if (btnExportPdf) {
        btnExportPdf.addEventListener('click', () => {
            const element = document.getElementById('dashboard');
            // Hide the button itself in the PDF
            const opt = {
              margin:       0.5,
              filename:     'reporte_ventas.pdf',
              image:        { type: 'jpeg', quality: 0.98 },
              html2canvas:  { scale: 2 },
              jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
            };
            
            btnExportPdf.style.display = 'none';
            html2pdf().set(opt).from(element).save().then(() => {
                btnExportPdf.style.display = 'inline-block';
            });
        });
    }

    updateDashboard();
    State.init().then(updateDashboard);
});