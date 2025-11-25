import axios from 'axios';

import { CONFIG } from 'src/config-global';

// ----------------------------------------------------------------------

const axiosInstance = axios.create({ baseURL: CONFIG.site.serverUrl });

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject((error.response && error.response.data) || 'Something went wrong!')
);

export default axiosInstance;

// ----------------------------------------------------------------------

export const fetcher = async (args) => {
  try {
    const [url, config] = Array.isArray(args) ? args : [args];

    const res = await axiosInstance.get(url, { ...config });

    return res.data;
  } catch (error) {
    // Only log errors that are not 404s for demo endpoints
    const isDemoEndpoint = error?.config?.url?.match(/\/(calendar|kanban|mail|post|product)/);
    const is404 = error?.status === 404 || error?.detail === 'Not Found';

    if (!(isDemoEndpoint && is404)) {
      console.error('Failed to fetch:', error);
    }
    throw error;
  }
};

// ----------------------------------------------------------------------

export const endpoints = {
  chat: '/api/chat',
  kanban: '/api/v1/kanban',
  calendar: '/api/calendar',
  auth: {
    me: '/api/v1/users/me',
    signIn: '/api/v1/login/access-token',
    signUp: '/api/v1/users/signup',
  },
  mail: {
    list: '/api/mail/list',
    details: '/api/mail/details',
    labels: '/api/mail/labels',
  },
  post: {
    list: '/api/post/list',
    details: '/api/post/details',
    latest: '/api/post/latest',
    search: '/api/post/search',
  },
  product: {
    list: '/api/product/list',
    details: '/api/product/details',
    search: '/api/product/search',
  },
  builder: {
    blocks: '/api/v1/blocks',
    messages: '/api/v1/builder/messages',
    chat: '/api/v1/builder/chat',
  },
  entities: {
    list: '/api/v1/entities',
    stats: '/api/v1/entities/stats',
    recent: '/api/v1/entities/recent',
    categories: '/api/v1/entities/categories/list',
    create: '/api/v1/entities',
    details: (id) => `/api/v1/entities/${id}`,
    update: (id) => `/api/v1/entities/${id}`,
    delete: (id) => `/api/v1/entities/${id}`,
  },
  neoAgents: {
    list: '/api/v1/neo-agents',
    create: '/api/v1/neo-agents',
    details: (id) => `/api/v1/neo-agents/${id}`,
    update: (id) => `/api/v1/neo-agents/${id}`,
    delete: (id) => `/api/v1/neo-agents/${id}`,
  },
  knowledge: {
    list: '/api/v1/knowledge',
    stats: '/api/v1/knowledge/stats',
    create: '/api/v1/knowledge',
    upload: '/api/v1/knowledge/upload',
    bulk: '/api/v1/knowledge/bulk',
    embedAll: '/api/v1/knowledge/embed-all',
    details: (id) => `/api/v1/knowledge/${id}`,
    update: (id) => `/api/v1/knowledge/${id}`,
    delete: (id) => `/api/v1/knowledge/${id}`,
  },
};
