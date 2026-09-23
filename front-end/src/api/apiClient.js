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

async function readJsonOrThrow(response) {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.error || `Error ${response.status}`);
    }
    return data;
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

    async setUserPassword(id, password) {
        const response = await fetchWithAuth(`/users/${id}/password`, {
            method: 'PUT',
            body: JSON.stringify({ password })
        });
        return response.json();
    },

    async unlockUser(id) {
        const response = await fetchWithAuth(`/users/${id}/unlock`, {
            method: 'PUT'
        });
        return response.json();
    },

    async changePassword(currentPassword, newPassword) {
        const response = await fetchWithAuth('/auth/change-password', {
            method: 'POST',
            body: JSON.stringify({ currentPassword, newPassword })
        });
        return response.json();
    },

    // ========================
    // SETTINGS
    // ========================

    async getSettings() {
        const response = await fetchWithAuth('/settings');
        return response.json();
    },

    async updateSetting(key, value) {
        const response = await fetchWithAuth('/settings', {
            method: 'PUT',
            body: JSON.stringify({ key, value })
        });
        return response.json();
    },

    // ========================
    // PERMISSIONS
    // ========================

    async getPermissions() {
        const response = await fetchWithAuth('/permissions');
        return response.json();
    },

    async updateRolePermissions(role, modules) {
        const response = await fetchWithAuth(`/permissions/${role}`, {
            method: 'PUT',
            body: JSON.stringify({ modules })
        });
        return response.json();
    },

    async getMyPermissions() {
        const response = await fetchWithAuth('/permissions/me');
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
        return readJsonOrThrow(response);
    },

    async getPaymentById(id) {
        const response = await fetchWithAuth(`/payments/${id}`);
        return readJsonOrThrow(response);
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
    },

    // ========================
    // SHIFTS (TURNOS)
    // ========================

    async getCurrentShift() {
        const response = await fetchWithAuth('/shifts/current');
        return response.json();
    },

    async openShift(data) {
        const response = await fetchWithAuth('/shifts/open', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        return response.json();
    },

    async closeShift(shiftId, data) {
        const response = await fetchWithAuth(`/shifts/${shiftId}/close`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        return response.json();
    },

    async getShiftHistory(limit) {
        const url = limit ? `/shifts/history?limit=${limit}` : '/shifts/history';
        const response = await fetchWithAuth(url);
        return response.json();
    },

    async getArqueo(shiftId) {
        const response = await fetchWithAuth(`/shifts/${shiftId}/arqueo`);
        return response.json();
    },

    async getShiftTransactions(shiftId) {
        const response = await fetchWithAuth(`/shifts/${shiftId}/transactions`);
        return response.json();
    },

    // ========================
    // PRINT
    // ========================

    async printReceipt(paymentId) {
        const response = await fetchWithAuth(`/print/receipt/${paymentId}`, {
            method: 'POST',
        });
        return response.json();
    },

    async printTest() {
        const response = await fetchWithAuth('/print/test', {
            method: 'POST',
        });
        return response.json();
    },

    async getPrinterStatus() {
        const response = await fetchWithAuth('/print/status');
        return response.json();
    },

    // ========================
    // INVENTARIO
    // ========================

    async listInventory(lowStock = false) {
        const url = lowStock ? '/inventory?lowStock=true' : '/inventory';
        const response = await fetchWithAuth(url);
        return response.json();
    },

    async getInventoryItem(id) {
        const response = await fetchWithAuth(`/inventory/${id}`);
        return response.json();
    },

    async createInventoryItem(data) {
        const response = await fetchWithAuth('/inventory', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        return response.json();
    },

    async updateInventoryItem(id, data) {
        const response = await fetchWithAuth(`/inventory/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
        return response.json();
    },

    async updateStock(id, stock) {
        const response = await fetchWithAuth(`/inventory/${id}/stock`, {
            method: 'PATCH',
            body: JSON.stringify({ stock })
        });
        return response.json();
    },

    async deleteInventoryItem(id) {
        const response = await fetchWithAuth(`/inventory/${id}`, {
            method: 'DELETE'
        });
        return response.json();
    },

    // ========================
    // RECETAS
    // ========================

    async getProductRecipe(productId) {
        const response = await fetchWithAuth(`/recipes/product/${productId}`);
        return response.json();
    },

    async getRecipeCost(productId) {
        const response = await fetchWithAuth(`/recipes/product/${productId}/cost`);
        return response.json();
    },

    async upsertRecipeItem(productId, data) {
        const response = await fetchWithAuth(`/recipes/product/${productId}`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        return response.json();
    },

    async deleteRecipeItem(recipeId) {
        const response = await fetchWithAuth(`/recipes/${recipeId}`, {
            method: 'DELETE'
        });
        return response.json();
    },

    // ========================
    // PROVEEDORES
    // ========================

    async listSuppliers(all = false) {
        const url = all ? '/suppliers?all=true' : '/suppliers';
        const response = await fetchWithAuth(url);
        return response.json();
    },

    async getSupplierDetail(id) {
        const response = await fetchWithAuth(`/suppliers/${id}`);
        return response.json();
    },

    async createSupplier(data) {
        const response = await fetchWithAuth('/suppliers', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        return response.json();
    },

    async updateSupplier(id, data) {
        const response = await fetchWithAuth(`/suppliers/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
        return response.json();
    },

    // ========================
    // ORDENES DE COMPRA
    // ========================

    async listPurchaseOrders(params = {}) {
        const qs = new URLSearchParams();
        if (params.supplier_id) qs.set('supplier_id', params.supplier_id);
        if (params.status) qs.set('status', params.status);
        const url = `/purchase-orders${qs.toString() ? '?' + qs.toString() : ''}`;
        const response = await fetchWithAuth(url);
        return response.json();
    },

    async getPurchaseOrder(id) {
        const response = await fetchWithAuth(`/purchase-orders/${id}`);
        return response.json();
    },

    async createPurchaseOrder(data) {
        const response = await fetchWithAuth('/purchase-orders', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        return response.json();
    },

    async addPoItem(poId, data) {
        const response = await fetchWithAuth(`/purchase-orders/${poId}/items`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        return response.json();
    },

    async deletePoItem(poId, itemId) {
        const response = await fetchWithAuth(`/purchase-orders/${poId}/items/${itemId}`, {
            method: 'DELETE'
        });
        return response.json();
    },

    async receivePurchaseOrder(poId) {
        const response = await fetchWithAuth(`/purchase-orders/${poId}/receive`, {
            method: 'PUT'
        });
        return response.json();
    },

    async cancelPurchaseOrder(poId) {
        const response = await fetchWithAuth(`/purchase-orders/${poId}/cancel`, {
            method: 'PUT'
        });
        return response.json();
    },

    // ========================
    // REPORTES
    // ========================

    async getDashboard() {
        const response = await fetchWithAuth('/reports/dashboard');
        return response.json();
    },

    async getDailyReport(date, start, end) {
        const qs = new URLSearchParams();
        if (date) qs.set('date', date);
        if (start) qs.set('start', start);
        if (end) qs.set('end', end);
        const url = `/reports/daily${qs.toString() ? '?' + qs.toString() : ''}`;
        const response = await fetchWithAuth(url);
        return response.json();
    },

    async getProductRanking(params = {}) {
        const qs = new URLSearchParams();
        if (params.limit) qs.set('limit', params.limit);
        if (params.start) qs.set('start', params.start);
        if (params.end) qs.set('end', params.end);
        const url = `/reports/products/ranking${qs.toString() ? '?' + qs.toString() : ''}`;
        const response = await fetchWithAuth(url);
        return response.json();
    },

    async getHourlySales(date) {
        const url = date ? `/reports/hourly?date=${date}` : '/reports/hourly';
        const response = await fetchWithAuth(url);
        return response.json();
    },

    async getCategorySales(params = {}) {
        const qs = new URLSearchParams();
        if (params.start) qs.set('start', params.start);
        if (params.end) qs.set('end', params.end);
        const url = `/reports/categories${qs.toString() ? '?' + qs.toString() : ''}`;
        const response = await fetchWithAuth(url);
        return response.json();
    },

    async getSalesTrend(params = {}) {
        const qs = new URLSearchParams();
        if (params.start) qs.set('start', params.start);
        if (params.end) qs.set('end', params.end);
        const url = `/reports/trend${qs.toString() ? '?' + qs.toString() : ''}`;
        const response = await fetchWithAuth(url);
        return response.json();
    },

    async getPeriodComparison(date) {
        const url = date ? `/reports/period?date=${date}` : '/reports/period';
        const response = await fetchWithAuth(url);
        return response.json();
    },

    async getCashClosing(shiftId) {
        const response = await fetchWithAuth(`/reports/cash-closing?shiftId=${shiftId}`);
        return response.json();
    }
};
