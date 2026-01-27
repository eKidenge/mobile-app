// config/api.ts
export const API_CONFIG = {
  BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || 'https://teleconnect-krga.onrender.com/api',
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
};

export const ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/login/',
    REGISTER: '/register/',
    LOGOUT: '/logout/',
    REFRESH_TOKEN: '/token/refresh/',
  },
  
  // User Management
  USER: {
    PROFILE: '/user/profile/',
    FAVORITES: '/user/favorites/',
    UPDATE_PROFILE: '/user/profile/update/',
  },
  
  // Professional Management
  PROFESSIONAL: {
    LIST: '/professionals/',
    DETAIL: '/professional/:id/',
    DASHBOARD: '/professional/:id/dashboard/',
    SIGNUP: '/professional/signup/',
    VERIFY: '/professional/verify/',
  },
  
  // Admin Endpoints
  ADMIN: {
    DASHBOARD: '/admin/dashboard/',
    STATS: '/admin/dashboard/stats/',
    ACTIVITY: '/admin/dashboard/recent-activity/',
    REVENUE: '/admin/dashboard/revenue-chart/',
    
    PROFESSIONALS: {
      LIST: '/admin/professionals/',
      DETAIL: '/admin/professional/:id/',
      APPROVE: '/admin/professionals/:id/approve/',
      REJECT: '/admin/professionals/:id/reject/',
      UPDATE_STATUS: '/admin/professionals/:id/status/',
    },
    
    CATEGORIES: {
      LIST: '/admin/categories/',
      CREATE: '/admin/categories/',
      UPDATE: '/admin/categories/:id/update/',
      DELETE: '/admin/categories/:id/delete/',
    },
    
    USERS: {
      LIST: '/admin/users/',
      DETAIL: '/admin/users/:id/',
      UPDATE_STATUS: '/admin/users/:id/status/',
      UPDATE_ROLE: '/admin/users/:id/role/',
      DELETE: '/admin/users/:id/delete/',
    },
    
    TRANSACTIONS: {
      LIST: '/admin/transactions/',
      DETAIL: '/admin/transactions/:id/',
      REFUND: '/admin/transactions/:id/refund/',
    },
    
    DISPUTES: {
      LIST: '/admin/disputes/',
      DETAIL: '/admin/disputes/:id/',
      UPDATE_STATUS: '/admin/disputes/:id/status/',
      ASSIGN: '/admin/disputes/:id/assign/',
    },
    
    ANALYTICS: {
      USERS: '/admin/analytics/users/',
      SESSIONS: '/admin/analytics/sessions/',
      FINANCIAL: '/admin/analytics/financial/',
      PROFESSIONALS: '/admin/analytics/professionals/',
    },
  },
  
  // Sessions & Payments
  SESSIONS: {
    LIST: '/sessions/',
    HISTORY: '/sessions/history/',
    CREATE: '/sessions/create/',
    DETAIL: '/sessions/:id/',
    UPDATE_STATUS: '/sessions/:id/status/',
    COMPLETE: '/sessions/:id/complete/',
    MESSAGES: '/sessions/:id/messages/',
  },
  
  PAYMENTS: {
    CREATE: '/payments/create/',
    HISTORY: '/payments/history/',
    DETAIL: '/payments/:id/',
  },
  
  // File Uploads
  UPLOAD: {
    PROFILE_IMAGE: '/upload/profile-image/',
    LICENSE_FILE: '/upload/license-file/',
  },
  
  // Search
  SEARCH: {
    PROFESSIONALS: '/search/professionals/',
    USERS: '/admin/search/users/',
  },
};

// Helper function to build URLs with parameters
export const buildUrl = (endpoint: string, params: Record<string, string | number> = {}) => {
  let url = endpoint;
  Object.keys(params).forEach(key => {
    url = url.replace(`:${key}`, params[key].toString());
  });
  return url;
};