const API_BASE = 'http://localhost:3000/api';

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

async function fetchWithAuth(url, options = {}) {
    const accessToken = localStorage.getItem('accessToken');

    const config = {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
            ...options.headers
        }
    };

    const response = await fetch(`${API_BASE}${url}`, config);

    if (response.status === 401) {
        const data = await response.json();

        if (data.code === 'TOKEN_EXPIRED') {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then(token => {
                    config.headers.Authorization = `Bearer ${token}`;
                    return fetch(`${API_BASE}${url}`, config);
                });
            }

            isRefreshing = true;

            try {
                const refreshToken = localStorage.getItem('refreshToken');
                const refreshResponse = await fetch(`${API_BASE}/auth/refresh`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refreshToken })
                });

                if (!refreshResponse.ok) {
                    throw new Error('Refresh failed');
                }

                const refreshData = await refreshResponse.json();
                localStorage.setItem('accessToken', refreshData.accessToken);
                localStorage.setItem('refreshToken', refreshData.refreshToken);

                processQueue(null, refreshData.accessToken);

                config.headers.Authorization = `Bearer ${refreshData.accessToken}`;
                return fetch(`${API_BASE}${url}`, config);
            } catch (error) {
                processQueue(error, null);
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('user');
                window.location.href = '/login';
                throw error;
            } finally {
                isRefreshing = false;
            }
        }
    }

    return response;
}

export const api = {
    async login(username, password) {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        return response.json();
    },

    async refresh(refreshToken) {
        const response = await fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken })
        });
        return response.json();
    },

    async logout(refreshToken) {
        const response = await fetchWithAuth('/auth/logout', {
            method: 'POST',
            body: JSON.stringify({ refreshToken })
        });
        return response.json();
    },

    async getProfile() {
        const response = await fetchWithAuth('/auth/profile');
        return response.json();
    },

    async getUsers() {
        const response = await fetchWithAuth('/users');
        return response.json();
    },

    async createUser(data) {
        const response = await fetchWithAuth('/users', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        return response.json();
    },

    async updateUser(id, data) {
        const response = await fetchWithAuth(`/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
        return response.json();
    },

    async deleteUser(id) {
        const response = await fetchWithAuth(`/users/${id}`, {
            method: 'DELETE'
        });
        return response.json();
    },

    // ========================
    // CATALOGS
    // ========================

    async getCatalogGroups() {
        const response = await fetchWithAuth('/catalogs/groups');
        return response.json();
    },

    async getCatalogGroup(id) {
        const response = await fetchWithAuth(`/catalogs/groups/${id}`);
        return response.json();
    },

    async createCatalogGroup(data) {
        const response = await fetchWithAuth('/catalogs/groups', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        return response.json();
    },

    async updateCatalogGroup(id, data) {
        const response = await fetchWithAuth(`/catalogs/groups/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
        return response.json();
    },

    async deleteCatalogGroup(id) {
        const response = await fetchWithAuth(`/catalogs/groups/${id}`, {
            method: 'DELETE'
        });
        return response.json();
    },

    async getCatalogItems(slug) {
        const response = await fetchWithAuth(`/catalogs/groups/${slug}/items`);
        return response.json();
    },

    async getCatalogItem(id) {
        const response = await fetchWithAuth(`/catalogs/items/${id}`);
        return response.json();
    },

    async createCatalogItem(data) {
        const response = await fetchWithAuth('/catalogs/items', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        return response.json();
    },

    async updateCatalogItem(id, data) {
        const response = await fetchWithAuth(`/catalogs/items/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
        return response.json();
    },

    async deleteCatalogItem(id) {
        const response = await fetchWithAuth(`/catalogs/items/${id}`, {
            method: 'DELETE'
        });
        return response.json();
    },

    // ========================
    // PRODUCTS
    // ========================

    getUploadUrl(filename) {
        return `http://localhost:3000/uploads/products/${filename}`;
    },

    async getProducts(categoryId) {
        const url = categoryId ? `/products?category=${categoryId}` : '/products';
        const response = await fetchWithAuth(url);
        return response.json();
    },

    async getProduct(id) {
        const response = await fetchWithAuth(`/products/${id}`);
        return response.json();
    },

    async createProduct(formData) {
        const accessToken = localStorage.getItem('accessToken');
        const response = await fetch(`${API_BASE}/products`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}` },
            body: formData
        });
        return response.json();
    },

    async updateProduct(id, formData) {
        const accessToken = localStorage.getItem('accessToken');
        const response = await fetch(`${API_BASE}/products/${id}`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${accessToken}` },
            body: formData
        });
        return response.json();
    },

    async deleteProduct(id) {
        const response = await fetchWithAuth(`/products/${id}`, {
            method: 'DELETE'
        });
        return response.json();
    },

    // ========================
    // CATEGORIES (from catalogs)
    // ========================

    async getCategories() {
        const response = await fetchWithAuth('/catalogs/groups');
        const groups = await response.json();
        const catGroup = groups.find(g => g.slug === 'categorias_producto');
        if (!catGroup) return [];
        const itemsResponse = await fetchWithAuth(`/catalogs/groups/${catGroup.slug}/items`);
        return itemsResponse.json();
    },

    // ========================
    // PRODUCT MODIFIERS
    // ========================

    async getProductModifiers(productId) {
        const response = await fetchWithAuth(`/products/${productId}/modifiers`);
        return response.json();
    },

    async assignProductModifiers(productId, groupIds) {
        const response = await fetchWithAuth(`/products/${productId}/modifiers`, {
            method: 'PUT',
            body: JSON.stringify({ group_ids: groupIds })
        });
        return response.json();
    },

    // ========================
    // TABLES
    // ========================

    async getTables() {
        const response = await fetchWithAuth('/tables');
        return response.json();
    },

    // ========================
    // ORDERS
    // ========================

    async getParkedOrders() {
        const response = await fetchWithAuth('/orders?status=pausada');
        return response.json();
    },

    async getOrder(id) {
        const response = await fetchWithAuth(`/orders/${id}`);
        return response.json();
    },

    async createOrder(data) {
        const response = await fetchWithAuth('/orders', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        return response.json();
    },

    async updateOrder(id, data) {
        const response = await fetchWithAuth(`/orders/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
        return response.json();
    },

    async voidOrder(id) {
        const response = await fetchWithAuth(`/orders/${id}`, {
            method: 'DELETE'
        });
        return response.json();
    },

    async addOrderItem(orderId, data) {
        const response = await fetchWithAuth(`/orders/${orderId}/items`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        return response.json();
    },

    async deleteOrderItem(orderId, itemId) {
        const response = await fetchWithAuth(`/orders/${orderId}/items/${itemId}`, {
            method: 'DELETE'
        });
        return response.json();
    },

    // ========================
    // PAYMENTS
    // ========================

    async recordPayment(data) {
        const response = await fetchWithAuth('/payments', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        return response.json();
    },

    async getPaymentById(id) {
        const response = await fetchWithAuth(`/payments/${id}`);
        return response.json();
    },

    async getDailyPayments(date) {
        const url = date ? `/payments/daily?date=${date}` : '/payments/daily';
        const response = await fetchWithAuth(url);
        return response.json();
    },

    async getDailySalesSummary(date) {
        const url = date ? `/payments/daily/summary?date=${date}` : '/payments/daily/summary';
        const response = await fetchWithAuth(url);
        return response.json();
    }
};
