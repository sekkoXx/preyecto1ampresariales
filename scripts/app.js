const API_BASE = 'http://127.0.0.1:8001';

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
                if (Array.isArray(data.detail)) {
                    detail = data.detail.map(e => `${e.loc ? e.loc[e.loc.length-1] + ': ' : ''}${e.msg}`).join('\n');
                } else {
                    detail = data.detail || detail;
                }
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

    async updateProfile(payload) {
        await this.request('/auth/me', {
            method: 'PUT',
            body: JSON.stringify(payload),
        });
        await this.loadCurrentUser();
    },

    async deleteAccount() {
        await this.request('/auth/me', {
            method: 'DELETE',
        });
        this.logout();
    },

    async loadCurrentUser() {
        this.currentUser = await this.request('/auth/me');
        const label = document.getElementById('user-label');
        const badge = document.getElementById('user-role-badge');
        const navSales = document.getElementById('nav-sales');
        const navHistory = document.getElementById('nav-history');
        label.innerText = `Bienvenido, ${this.currentUser.nickname || this.currentUser.username}`;
        badge.innerText = this.currentUser.rol.toUpperCase();
        badge.className = `badge ${this.currentUser.rol}`;

        // Topbar Profile Icon Update
        const topbarImg = document.getElementById('topbar-profile-img');
        const topbarPlaceholder = document.getElementById('topbar-profile-placeholder');
        if (topbarImg && topbarPlaceholder) {
            if (this.currentUser.profile_image) {
                topbarImg.src = this.currentUser.profile_image;
                topbarImg.style.display = 'block';
                topbarPlaceholder.style.display = 'none';
            } else {
                topbarImg.style.display = 'none';
                topbarPlaceholder.style.display = 'block';
            }
        }

        // Profile View Data Update
        const profileNicknameInput = document.getElementById('profile-nickname');
        const profileImgPreview = document.getElementById('profile-img-preview');
        const profileImgPlaceholder = document.getElementById('profile-img-placeholder');
        
        if (profileNicknameInput) {
            profileNicknameInput.value = this.currentUser.nickname || '';
        }
        
        if (profileImgPreview && profileImgPlaceholder) {
            if (this.currentUser.profile_image) {
                profileImgPreview.src = this.currentUser.profile_image;
                profileImgPreview.style.display = 'block';
                profileImgPlaceholder.style.display = 'none';
            } else {
                profileImgPreview.style.display = 'none';
                profileImgPlaceholder.style.display = 'block';
            }
        }

        const isSellerOrAdmin = ['admin', 'seller'].includes(this.currentUser.rol);
        const isBuyer = this.currentUser.rol === 'buyer';
        const isAdmin = this.currentUser.rol === 'admin';

        navSales.style.display = (isSellerOrAdmin || isBuyer) ? 'flex' : 'none';
        navSales.innerHTML = isBuyer ? "<i class='bx bx-shopping-bag'></i> Comprar" : "<i class='bx bx-cart'></i> Punto de Venta";
        navHistory.style.display = isBuyer ? 'flex' : 'none';
        document.getElementById('nav-admin').style.display = isAdmin ? 'flex' : 'none';
        
        document.querySelectorAll('.seller-only').forEach(el => {
            el.style.display = isSellerOrAdmin ? '' : 'none';
        });

        document.querySelectorAll('.buyer-only').forEach(el => {
            el.style.display = isBuyer ? '' : 'none';
        });

        if (isAdmin) {
            await this.fetchUsers();
            this.renderAdminUsers();
        }

        if (isSellerOrAdmin) {
            await this.fetchChartData();
        }

        window.dispatchEvent(new Event('userChanged'));
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
        if (this.currentUser?.rol === 'buyer') {
            this.sales = [];
            window.dispatchEvent(new Event('salesUpdated'));
            return;
        }
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

        if (this.currentUser?.rol === 'buyer') {
            await Promise.all([this.fetchProducts(), this.fetchPurchaseHistory()]);
        } else {
            await Promise.all([this.fetchProducts(), this.fetchSales()]);
        }

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
        if (this.currentUser?.rol !== 'buyer') {
            this.purchaseHistory = [];
            window.dispatchEvent(new Event('historyUpdated'));
            return;
        }

        this.purchaseHistory = await this.request('/ventas/mis-compras');
        window.dispatchEvent(new Event('historyUpdated'));
    },

    async init() {
        if (!this.token) return;
        try {
            await this.loadCurrentUser();
            const loads = [this.fetchProducts()];
            if (this.currentUser?.rol === 'buyer') {
                loads.push(this.fetchPurchaseHistory());
            } else {
                loads.push(this.fetchSales());
            }
            await Promise.all(loads);
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
        } else if (State.currentUser?.rol === 'buyer') {
            document.getElementById('dash-total-products').innerText = State.products.length;
            const totalSpent = State.purchaseHistory.reduce((sum, purchase) => sum + Number(purchase.total || 0), 0);
            const spentLabel = document.getElementById('buyer-total-spent');
            if (spentLabel) {
                spentLabel.innerText = `$${totalSpent.toFixed(2)}`;
            }
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
        const tableBodies = [
            document.getElementById('history-table-body'),
            document.getElementById('buyer-history-table')
        ].filter(Boolean);

        if (tableBodies.length === 0) return;

        const rows = State.purchaseHistory.map(purchase => {
            const productsHtml = (purchase.productos || []).map(item => `${item.cantidad}x ${item.nombre}`).join('<br>') || '---';
            return `
                <tr>
                    <td>#${purchase.id}</td>
                    <td>${productsHtml}</td>
                    <td>$${Number(purchase.total || 0).toFixed(2)}</td>
                    <td>${purchase.fecha || '---'}</td>
                </tr>
            `;
        }).join('');

        tableBodies.forEach(body => {
            body.innerHTML = rows || '<tr><td colspan="4" style="text-align:center;">Aun no hay compras registradas.</td></tr>';
        });
    }

    window.addEventListener('historyUpdated', renderHistory);
    window.addEventListener('userChanged', updateDashboard);

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
            await Promise.all([
                State.fetchProducts(),
                State.currentUser?.rol === 'buyer' ? State.fetchPurchaseHistory() : State.fetchSales()
            ]);
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

        if (user.length < 3) {
            authError.innerText = 'El usuario debe tener al menos 3 caracteres.';
            return;
        }
        if (pass.length < 6) {
            authError.innerText = 'La contraseña debe tener al menos 6 caracteres.';
            return;
        }

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

    // ===== THEME MANAGEMENT =====
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        const savedTheme = localStorage.getItem('nexpos_theme');
        if (savedTheme === 'light') {
            document.documentElement.classList.add('light-mode');
            document.body.classList.add('light-mode');
            themeToggle.checked = true;
        }

        themeToggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                document.documentElement.classList.add('light-mode');
                document.body.classList.add('light-mode');
                localStorage.setItem('nexpos_theme', 'light');
            } else {
                document.documentElement.classList.remove('light-mode');
                document.body.classList.remove('light-mode');
                localStorage.setItem('nexpos_theme', 'dark');
            }
        });
    }

    // ===== PROFILE MANAGEMENT =====
    let currentProfileImageBase64 = null;
    const profileImageInput = document.getElementById('profile-image-input');
    const profileImgPreview = document.getElementById('profile-img-preview');
    const profileImgPlaceholder = document.getElementById('profile-img-placeholder');

    if (profileImageInput) {
        profileImageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (ev) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    const MAX = 200;
                    let w = img.width;
                    let h = img.height;
                    if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } } 
                    else { if (h > MAX) { w *= MAX / h; h = MAX; } }
                    canvas.width = w; canvas.height = h;
                    ctx.drawImage(img, 0, 0, w, h);
                    
                    currentProfileImageBase64 = canvas.toDataURL('image/jpeg', 0.8);
                    profileImgPreview.src = currentProfileImageBase64;
                    profileImgPreview.style.display = 'block';
                    profileImgPlaceholder.style.display = 'none';
                };
                img.src = ev.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    const btnSaveProfile = document.getElementById('btn-save-profile');
    if (btnSaveProfile) {
        btnSaveProfile.addEventListener('click', async () => {
            const nickname = document.getElementById('profile-nickname').value.trim();
            const payload = {};
            if (nickname !== '') payload.nickname = nickname;
            if (currentProfileImageBase64) payload.profile_image = currentProfileImageBase64;

            try {
                await State.updateProfile(payload);
                State.notify('Perfil guardado con éxito.');
                currentProfileImageBase64 = null; // reset logic
            } catch(e) {
                State.notify(e.message, true);
            }
        });
    }

    const deleteAccountModal = document.getElementById('delete-account-modal');
    const btnDeleteAccountModal = document.getElementById('btn-delete-account-modal');
    const deleteAccountInput = document.getElementById('delete-account-input');
    const btnConfirmDelete = document.getElementById('btn-confirm-delete');
    
    if (btnDeleteAccountModal) {
        btnDeleteAccountModal.addEventListener('click', () => {
            document.getElementById('delete-confirm-username').innerText = State.currentUser.username;
            deleteAccountInput.value = '';
            btnConfirmDelete.disabled = true;
            deleteAccountModal.classList.add('active');
        });
    }

    if (deleteAccountInput) {
        deleteAccountInput.addEventListener('input', (e) => {
            btnConfirmDelete.disabled = e.target.value !== State.currentUser.username;
        });
    }

    document.getElementById('btn-cancel-delete')?.addEventListener('click', () => {
        deleteAccountModal.classList.remove('active');
    });

    btnConfirmDelete?.addEventListener('click', async () => {
        if (deleteAccountInput.value === State.currentUser.username) {
            try {
                await State.deleteAccount();
                deleteAccountModal.classList.remove('active');
                State.notify('Cuenta eliminada permanentemente.');
            } catch (e) {
                State.notify(e.message, true);
            }
        }
    });

    updateDashboard();
    State.init().then(updateDashboard);
});