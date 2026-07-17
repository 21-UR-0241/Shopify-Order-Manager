// import axios from 'axios';
// import { Store, OrdersResponse, OrderFilters } from './types';

// const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// const api = axios.create({
//   baseURL: API_BASE_URL,
//   headers: {
//     'Content-Type': 'application/json',
//   },
// });

// // Store APIs
// export const storeAPI = {
//   getAll: () => api.get<Store[]>('/stores'),
  
//   getOne: (storeId: string) => api.get<Store>(`/stores/${storeId}`),
  
//   create: (data: {
//     shopDomain: string;
//     accessToken: string;
//     storeName: string;
//     email?: string;
//     currency?: string;
//     timezone?: string;
//   }) => api.post<Store>('/stores', data),
  
//   update: (storeId: string, data: Partial<Store>) =>
//     api.put<Store>(`/stores/${storeId}`, data),
  
//   delete: (storeId: string) => api.delete(`/stores/${storeId}`),
  
//   getInfo: (storeId: string) => api.get(`/stores/${storeId}/info`),
// };

// // Order APIs
// export const orderAPI = {
//   getAllStores: (filters?: OrderFilters) =>
//     api.get<OrdersResponse[]>('/orders/all', { params: filters }),
  
//   getFromStore: (storeId: string, filters?: OrderFilters) =>
//     api.get<OrdersResponse>(`/orders/store/${storeId}`, { params: filters }),
  
//   getOne: (storeId: string, orderId: string) =>
//     api.get(`/orders/store/${storeId}/${orderId}`),
  
//   fulfill: (
//     storeId: string,
//     orderId: string,
//     data: {
//       tracking_number?: string;
//       tracking_company?: string;
//       tracking_url?: string;
//       notify_customer?: boolean;
//     }
//   ) => api.post(`/orders/store/${storeId}/${orderId}/fulfill`, data),
  
//   cancel: (
//     storeId: string,
//     orderId: string,
//     data: {
//       reason?: string;
//       restock?: boolean;
//     }
//   ) => api.post(`/orders/store/${storeId}/${orderId}/cancel`, data),
  
//   update: (storeId: string, orderId: string, data: any) =>
//     api.put(`/orders/store/${storeId}/${orderId}`, data),
  
//   refund: (
//     storeId: string,
//     orderId: string,
//     data: {
//       amount: number;
//       reason?: string;
//       restock?: boolean;
//       notify?: boolean;
//     }
//   ) => api.post(`/orders/store/${storeId}/${orderId}/refund`, data),
// };

// export default api;


// import axios, { InternalAxiosRequestConfig } from 'axios';

// const API_BASE_URL = 'http://localhost:3001';

// const api = axios.create({
//   baseURL: API_BASE_URL,
// });

// // Add auth token to all requests
// api.interceptors.request.use(
//   (config: InternalAxiosRequestConfig) => {
//     const token = localStorage.getItem('authToken');
//     if (token) {
//       config.headers = config.headers || {};
//       config.headers.Authorization = `Bearer ${token}`;
//     }
//     return config;
//   },
//   (error) => {
//     return Promise.reject(error);
//   }
// );

// // Handle 401 errors
// api.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     if (error.response?.status === 401) {
//       localStorage.removeItem('authToken');
//       localStorage.removeItem('user');
//       window.location.href = '/';
//     }
//     return Promise.reject(error);
//   }
// );

// // Store APIs
// export const storeAPI = {
//   getAll: () => api.get('/api/stores'),
  
//   getOne: (storeId: string) => api.get(`/api/stores/${storeId}`),
  
//   create: (data: {
//     shopDomain: string;
//     accessToken: string;
//     storeName: string;
//     email?: string;
//     currency?: string;
//     timezone?: string;
//   }) => api.post('/api/stores', data),
  
//   update: (storeId: string, data: any) =>
//     api.put(`/api/stores/${storeId}`, data),
  
//   delete: (storeId: string) => api.delete(`/api/stores/${storeId}`),
// };

// // Order APIs
// export const orderAPI = {
//   // Get all orders (simple endpoint)
//   getAll: () => api.get('/api/orders'),
  
//   // Get orders from all stores (with filters)
//   getAllStores: (filters?: any) => api.get('/api/orders/all', { params: filters }),
  
//   // Get orders from specific store
//   getFromStore: (storeId: string, filters?: any) =>
//     api.get(`/api/orders/store/${storeId}`, { params: filters }),
  
//   // Get single order
//   getOne: (storeId: string, orderId: string) =>
//     api.get(`/api/orders/store/${storeId}/${orderId}`),
  
//   // Fulfill order
//   fulfill: (storeId: string, orderId: string, data: any) => 
//     api.post(`/api/orders/store/${storeId}/${orderId}/fulfill`, data),
  
//   // Cancel order
//   cancel: (storeId: string, orderId: string, data: any) => 
//     api.post(`/api/orders/store/${storeId}/${orderId}/cancel`, data),
  
//   // Update order
//   update: (storeId: string, orderId: string, data: any) =>
//     api.put(`/api/orders/store/${storeId}/${orderId}`, data),
  
//   // Create refund
//   refund: (storeId: string, orderId: string, data: any) => 
//     api.post(`/api/orders/store/${storeId}/${orderId}/refund`, data),
  
//   // Duplicate order
//   duplicate: (storeId: string, orderId: string) =>
//     api.post(`/api/orders/store/${storeId}/${orderId}/duplicate`),
  
//   // Create draft order (RENAMED from 'create' to 'createDraft')
//   createDraft: (storeId: string, data: any) =>
//     api.post(`/api/orders/store/${storeId}/create`, data),
  
//   // Get products from store
//   getProducts: (storeId: string) => 
//     api.get(`/api/stores/${storeId}/products`),


//   // Add note to order
//   addNote: (storeId: string, orderId: string, note: string, isCustomerNote: boolean = false) =>
//     api.post(`/api/orders/store/${storeId}/${orderId}/note`, { note, isCustomerNote }),

//   // Add line items
//   addLineItems: (storeId: string, orderId: string, items: Array<{ variant_id: number; quantity: number }>) =>
//     api.post(`/api/orders/store/${storeId}/${orderId}/items/add`, { items }),

//   // Remove line items
//   removeLineItems: (storeId: string, orderId: string, lineItemIds: number[]) =>
//     api.post(`/api/orders/store/${storeId}/${orderId}/items/remove`, { lineItemIds }),

//   // Bulk tag orders
//   bulkTag: (storeId: string, orderIds: string[], tags: string) =>
//     api.post('/api/orders/bulk/tag', { storeId, orderIds, tags }),

//   // Export orders to CSV
//   exportCSV: (storeId: string, orderIds: string[]) =>
//     api.post('/api/orders/export', { storeId, orderIds }),




// };

// // Auth APIs
// export const authAPI = {
//   login: (email: string, password: string, rememberMe?: boolean) =>
//     api.post('/api/auth/login', { email, password, rememberMe }),
  
//   verify: () => api.get('/api/auth/verify'),
  
//   logout: () => api.post('/api/auth/logout'),
// };

// // User APIs (Admin only)
// export const userAPI = {
//   getAll: () => api.get('/api/users'),
  
//   create: (data: {
//     email: string;
//     password: string;
//     userName?: string;
//     role?: 'USER' | 'ADMIN';
//   }) => api.post('/api/users', data),
  
//   update: (userId: string, data: {
//     email?: string;
//     userName?: string;
//     role?: 'USER' | 'ADMIN';
//     isActive?: boolean;
//   }) => api.put(`/api/users/${userId}`, data),
  
//   delete: (userId: string) => api.delete(`/api/users/${userId}`),
// };

// export default api;




import axios, { InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = 'http://localhost:3001';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add auth token to all requests
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Store APIs
// ─────────────────────────────────────────────────────────────────────────────
export const storeAPI = {
  getAll: () => api.get('/api/stores'),

  getOne: (storeId: string) => api.get(`/api/stores/${storeId}`),

  create: (data: {
    shopDomain: string;
    accessToken: string;
    storeName: string;
    email?: string;
    currency?: string;
    timezone?: string;
  }) => api.post('/api/stores', data),

  update: (storeId: string, data: any) =>
    api.put(`/api/stores/${storeId}`, data),

  delete: (storeId: string) => api.delete(`/api/stores/${storeId}`),
};

// ─────────────────────────────────────────────────────────────────────────────
// Order APIs
// ─────────────────────────────────────────────────────────────────────────────
export const orderAPI = {
  // Get all orders (simple endpoint)
  getAll: () => api.get('/api/orders'),

  // Get orders from all stores (with filters)
  getAllStores: (filters?: any) => api.get('/api/orders/all', { params: filters }),

  // Get orders from specific store
  getFromStore: (storeId: string, filters?: any) =>
    api.get(`/api/orders/store/${storeId}`, { params: filters }),

  // Get single order
  getOne: (storeId: string, orderId: string) =>
    api.get(`/api/orders/store/${storeId}/${orderId}`),

  // Fulfill order (manual tracking)
  fulfill: (storeId: string, orderId: string, data: {
    tracking_number: string;
    tracking_company: string;
    notify_customer: boolean;
  }) =>
    api.post(`/api/orders/store/${storeId}/${orderId}/fulfill`, data),

  // Cancel order
  cancel: (storeId: string, orderId: string, data: {
    reason: string;
    restock: boolean;
  }) =>
    api.post(`/api/orders/store/${storeId}/${orderId}/cancel`, data),

  // Update order (note, tags, email)
  update: (storeId: string, orderId: string, data: any) =>
    api.put(`/api/orders/store/${storeId}/${orderId}`, data),

  // Create refund
  refund: (storeId: string, orderId: string, data: {
    amount: number;
    reason?: string;
    restock: boolean;
    notify: boolean;
  }) =>
    api.post(`/api/orders/store/${storeId}/${orderId}/refund`, data),

  // Duplicate order as draft
  duplicate: (storeId: string, orderId: string) =>
    api.post(`/api/orders/store/${storeId}/${orderId}/duplicate`),

  // Create draft order
  createDraft: (storeId: string, data: any) =>
    api.post(`/api/orders/store/${storeId}/create`, data),

  // Get products from store
  getProducts: (storeId: string) =>
    api.get(`/api/stores/${storeId}/products`),

  // Add note to order
  addNote: (
    storeId: string,
    orderId: string,
    note: string,
    isCustomerNote: boolean = false
  ) =>
    api.post(`/api/orders/store/${storeId}/${orderId}/note`, {
      note,
      isCustomerNote,
    }),

  // Add line items
  addLineItems: (
    storeId: string,
    orderId: string,
    items: Array<{ variant_id: number; quantity: number }>
  ) =>
    api.post(`/api/orders/store/${storeId}/${orderId}/items/add`, { items }),

  // Remove line items
  removeLineItems: (
    storeId: string,
    orderId: string,
    lineItemIds: number[]
  ) =>
    api.post(`/api/orders/store/${storeId}/${orderId}/items/remove`, {
      lineItemIds,
    }),

  // Bulk tag orders
  bulkTag: (storeId: string, orderIds: string[], tags: string) =>
    api.post('/api/orders/bulk/tag', { storeId, orderIds, tags }),

  // Export orders to CSV
  exportCSV: (storeId: string, orderIds: string[]) =>
    api.post('/api/orders/export', { storeId, orderIds }),

  // ───────────────────────────────────────────────────────────────────────────
  // Shopify Shipping / Label APIs  (Path A — requires Shopify Shipping enabled)
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Check if this store is eligible to purchase Shopify Shipping labels.
   * Backend must call Shopify's carrier service / shop settings to verify.
   *
   * GET /api/orders/store/:storeId/shipping/availability
   *
   * Expected response:
   *   { eligible_for_shipping_labels: boolean }
   */
  checkShippingAvailability: (storeId: string) =>
    api.get(`/api/orders/store/${storeId}/shipping/availability`),

  /**
   * Fetch available shipping rates for an order from Shopify.
   * Backend must:
   *   1. Call GET /admin/api/2024-01/fulfillment_orders.json?order_id={orderId}
   *      to get the fulfillment_order_id
   *   2. Call POST /admin/api/2024-01/fulfillment_orders/{id}/fulfillment_order_move.json
   *      (or the carrier service rates endpoint) with package weight + dims
   *
   * POST /api/orders/store/:storeId/:orderId/shipping/rates
   * Body: { weight: number, dimensions: { length, width, height } }
   *
   * Expected response:
   *   {
   *     fulfillmentOrderId: string,
   *     rates: Array<{
   *       id: string,
   *       shipping_rate_handle: string,
   *       title: string,
   *       service_code: string,
   *       currency: string,
   *       total_price: string,      // e.g. "7.99"
   *       delivery_days?: number,
   *       phone_required?: boolean,
   *     }>
   *   }
   */
  getShopifyShippingRates: (
    storeId: string,
    orderId: string,
    data: {
      weight: number;
      dimensions: { length: number; width: number; height: number };
    }
  ) =>
    api.post(
      `/api/orders/store/${storeId}/${orderId}/shipping/rates`,
      data
    ),

  /**
   * Purchase a Shopify Shipping label using the selected rate handle.
   * Backend must call:
   *   POST /admin/api/2024-01/fulfillments.json
   *   with fulfillment_order_id + rate_handle → Shopify creates fulfillment
   *   + purchases label + attaches tracking automatically.
   *
   * POST /api/orders/store/:storeId/shipping/purchase
   * Body: { fulfillmentOrderId, rateHandle, notifyCustomer }
   *
   * Expected response:
   *   {
   *     tracking_number: string,
   *     tracking_company: string,
   *     label_url: string,          // PDF download URL
   *   }
   */
  purchaseShopifyLabel: (
    storeId: string,
    data: {
      fulfillmentOrderId: string;
      rateHandle: string;
      notifyCustomer: boolean;
    }
  ) =>
    api.post(`/api/orders/store/${storeId}/shipping/purchase`, data),
};

// ─────────────────────────────────────────────────────────────────────────────
// Auth APIs
// ─────────────────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (email: string, password: string, rememberMe?: boolean) =>
    api.post('/api/auth/login', { email, password, rememberMe }),

  verify: () => api.get('/api/auth/verify'),

  logout: () => api.post('/api/auth/logout'),
};

// ─────────────────────────────────────────────────────────────────────────────
// User APIs (Admin only)
// ─────────────────────────────────────────────────────────────────────────────
export const userAPI = {
  getAll: () => api.get('/api/users'),

  create: (data: {
    email: string;
    password: string;
    userName?: string;
    role?: 'USER' | 'ADMIN';
  }) => api.post('/api/users', data),

  update: (
    userId: string,
    data: {
      email?: string;
      userName?: string;
      role?: 'USER' | 'ADMIN';
      isActive?: boolean;
    }
  ) => api.put(`/api/users/${userId}`, data),

  delete: (userId: string) => api.delete(`/api/users/${userId}`),
};

// ─────────────────────────────────────────────────────────────────────────────
// Sales APIs
// ─────────────────────────────────────────────────────────────────────────────
export const salesAPI = {
  getSummary: (params: { from?: string; to?: string }) =>
    api.get('/api/sales/summary', { params }),
};

export default api;