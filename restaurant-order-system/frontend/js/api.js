/**
 * API Service - Restaurant Order System
 */
const API = {
  baseURL: window.location.port === '5000'
    ? '/api'
    : 'http://localhost:5000/api',

  getToken() {
    return localStorage.getItem('token');
  },

  getHeaders(includeAuth = true) {
    const headers = { 'Content-Type': 'application/json' };
    if (includeAuth && this.getToken()) {
      headers['Authorization'] = `Bearer ${this.getToken()}`;
    }
    return headers;
  },

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: this.getHeaders(options.auth !== false),
      ...options
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Request failed');
      }
      return data;
    } catch (error) {
      if (error.message === 'Failed to fetch') {
        throw new Error('Unable to connect to server. Please ensure the backend is running.');
      }
      throw error;
    }
  },

  // Auth
  register: (data) => API.request('/auth/register', { method: 'POST', body: JSON.stringify(data), auth: false }),
  login: (data) => API.request('/auth/login', { method: 'POST', body: JSON.stringify(data), auth: false }),
  getProfile: () => API.request('/auth/profile'),

  // Foods
  getFoods: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return API.request(`/foods${query ? '?' + query : ''}`, { auth: false });
  },
  getFood: (id) => API.request(`/foods/${id}`, { auth: false }),

  // Categories
  getCategories: () => API.request('/categories', { auth: false }),

  // Orders
  createOrder: (data) => API.request('/orders', { method: 'POST', body: JSON.stringify(data) }),
  getOrders: () => API.request('/orders'),
  getOrder: (id) => API.request(`/orders/${id}`),
  trackOrder: (id) => API.request(`/orders/track/${id}`, { auth: false }),
  getInvoiceUrl: (id) => `${API.baseURL.replace('/api', '')}/api/orders/${id}/invoice`,

  // Coupons
  validateCoupon: (code, amount) => API.request('/coupons/validate', {
    method: 'POST', body: JSON.stringify({ code, amount })
  }),

  // Admin
  getDashboard: () => API.request('/admin/dashboard'),
  getUsers: () => API.request('/admin/users'),
  deleteUser: (id) => API.request(`/admin/users/${id}`, { method: 'DELETE' }),
  exportOrders: () => `${API.baseURL}/admin/export/orders?token=${API.getToken()}`,
  getOffers: () => API.request('/admin/offers', { auth: false }),
  updateOrderStatus: (id, status) => API.request(`/orders/${id}`, {
    method: 'PUT', body: JSON.stringify({ status })
  }),
  deleteOrder: (id) => API.request(`/orders/${id}`, { method: 'DELETE' }),

  createFood: (data) => API.request('/foods', { method: 'POST', body: JSON.stringify(data) }),
  updateFood: (id, data) => API.request(`/foods/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteFood: (id) => API.request(`/foods/${id}`, { method: 'DELETE' }),

  createCategory: (data) => API.request('/categories', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id, data) => API.request(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCategory: (id) => API.request(`/categories/${id}`, { method: 'DELETE' }),

  getCoupons: () => API.request('/coupons'),
  createCoupon: (data) => API.request('/coupons', { method: 'POST', body: JSON.stringify(data) }),
  updateCoupon: (id, data) => API.request(`/coupons/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCoupon: (id) => API.request(`/coupons/${id}`, { method: 'DELETE' }),

  // V2.0 Additions
  getAvailableTables: (params) => API.request(`/reservations/available-tables?${new URLSearchParams(params).toString()}`, { auth: false }),
  createReservation: (data) => API.request('/reservations', { method: 'POST', body: JSON.stringify(data) }),
  getReservations: (params = {}) => API.request(`/reservations?${new URLSearchParams(params).toString()}`),
  updateReservationStatus: (id, status) => API.request(`/reservations/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),

  getTables: (params = {}) => API.request(`/tables?${new URLSearchParams(params).toString()}`, { auth: false }),
  getFloorMap: () => API.request('/tables/floor-map', { auth: false }),
  getTableQRCode: (id) => API.request(`/tables/${id}/qr`),
  updateTableStatus: (id, status) => API.request(`/tables/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),

  getKitchenOrders: (params = {}) => API.request(`/kitchen/orders?${new URLSearchParams(params).toString()}`),
  updateKitchenStatus: (id, status) => API.request(`/kitchen/orders/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),

  getWaiterRequests: () => API.request('/waiter/requests'),
  createWaiterRequest: (data) => API.request('/waiter/request', { method: 'POST', body: JSON.stringify(data), auth: false }),
  resolveWaiterRequest: (id) => API.request(`/waiter/requests/${id}/resolve`, { method: 'PUT' }),

  getPendingBillOrders: () => API.request('/cashier/orders'),
  generateBillDetails: (orderId) => API.request(`/cashier/invoice/${orderId}`),
  getBillPdfUrl: (orderId) => `${API.baseURL}/cashier/invoice/${orderId}/pdf`,
  processRefund: (data) => API.request('/cashier/refund', { method: 'POST', body: JSON.stringify(data) }),

  submitFeedback: (data) => API.request('/ai/feedback', { method: 'POST', body: JSON.stringify(data), auth: false }),
  getFeedback: () => API.request('/ai/feedback'),
  getFeedbackSummary: () => API.request('/ai/feedback-summary'),
  getFoodRecommendations: (userId) => API.request(`/ai/recommendations/${userId}`),
  sendChatMessage: (message, context = {}) => API.request('/ai/chat', { method: 'POST', body: JSON.stringify({ message, ...context }), auth: false }),

  getInventory: () => API.request('/inventory'),
  getLowStockInventory: () => API.request('/inventory/low-stock'),
  updateInventoryStock: (id, qty) => API.request(`/inventory/${id}`, { method: 'PUT', body: JSON.stringify({ quantity: qty }) }),

  // Health
  healthCheck: () => API.request('/admin/health', { auth: false })
};

window.API = API;
