const API_BASE_URL = 'http://localhost:8080/api/v1';

async function request(url, options = {}) {
    const response = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(error.message || 'Request failed');
    }

    return response.json();
}

const AdminAPI = {
    // Dashboard
    getDashboardSummary: () => request('/admin/dashboard'),

    // Orders
    getOrders: () => request('/admin/orders'),
    getOrderDetail: (orderId) => request(`/admin/orders/${orderId}`),
    updateOrderStatus: (orderId, status, note) => request(`/admin/orders/${orderId}/status`, {
        method: 'POST',
        body: JSON.stringify({ status, note }),
    }),

    // Payments
    getPayments: (params) => {
        const query = params ? '?' + new URLSearchParams(params).toString() : '';
        return request(`/admin/payments${query}`);
    },
    getPaymentDetail: (id) => request(`/admin/payments/${id}`),

    // Menu Items
    getMenuItems: () => request('/admin/menu-items'),
    updateMenuItem: (id, data) => request(`/admin/menu-items/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
    }),

    // Stocks
    getStocks: () => request('/admin/stocks'),
    updateStock: (id, quantity) => request(`/admin/stocks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity }),
    }),
    updateOutOfStock: (id, isOutOfStock) => request(`/admin/stocks/${id}/out-of-stock`, {
        method: 'POST',
        body: JSON.stringify({ isOutOfStock }),
    }),

    // Tickets
    getTickets: () => request('/admin/tickets'),
    callTicket: (id, message) => request(`/admin/tickets/${id}/call`, {
        method: 'POST',
        body: JSON.stringify({ message }),
    }),
    serveTicket: (id, servedBy) => request(`/admin/tickets/${id}/serve`, {
        method: 'POST',
        body: JSON.stringify({ servedBy }),
    }),

    // Analytics
    getAnalytics: (startDate, endDate) => {
        const query = new URLSearchParams({ startDate, endDate }).toString();
        return request(`/admin/analytics?${query}`);
    },

    // Staff Calls
    getStaffCalls: () => request('/admin/staff-calls'),
    resolveStaffCall: (id) => request(`/admin/staff-calls/${id}/resolve`, {
        method: 'POST'
    }),
};
