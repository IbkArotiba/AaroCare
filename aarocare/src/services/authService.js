// src/services/authService.js
import axios from 'axios';

// Use the same logic that works in main.jsx
const API_URL = import.meta.env.VITE_API_URL || '/api';

console.log('🔍 DEBUG - Direct API_URL:', API_URL);
console.log('🔍 DEBUG - VITE_API_URL env var:', import.meta.env.VITE_API_URL);

// Create an axios instance with auth token injection
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true
});

// Add detailed debugging to requests
api.interceptors.request.use(async (config) => {
  const fullUrl = config.baseURL + config.url;
  console.log('🔍 REQUEST DEBUG:');
  console.log('  - Method:', config.method.toUpperCase());
  console.log('  - Base URL:', config.baseURL);
  console.log('  - Endpoint:', config.url);
  console.log('  - Full URL:', fullUrl);
  console.log('  - Data:', config.data);
  
  try {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  } catch (error) {
    return config;
  }
});

// Add response debugging
api.interceptors.response.use(
  (response) => {
    console.log('🔍 RESPONSE SUCCESS:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.log('🔍 RESPONSE ERROR:');
    console.log('  - Status:', error.response?.status);
    console.log('  - URL:', error.config?.url);
    console.log('  - Full URL:', error.config?.baseURL + error.config?.url);
    console.log('  - Error:', error.message);
    console.log('  - Response data:', error.response?.data);
    return Promise.reject(error);
  }
);

export const authService = {
  async login(email, password) {
    try {
      console.log('🔍 LOGIN ATTEMPT - Email:', email);
      const response = await api.post('/auth/login', {
        email,
        password,
      });
      
      // Store tokens
      const { user, accessToken, refreshToken } = response.data;
      localStorage.setItem('authToken', accessToken);
      if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
      
      return {
        user,
        accessToken,
        refreshToken
      };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  async getCurrentUser() {
    try {
      console.log('🔍 GET CURRENT USER ATTEMPT');
      const response = await api.get('/auth/me');
      return response.data.user;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  },

  async logout() {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
    }
  },

  async refreshToken() {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) throw new Error('No refresh token available');
      
      const response = await api.post('/auth/refresh', {
        refreshToken,
      });
      
      const { accessToken, newRefreshToken } = response.data;
      localStorage.setItem('authToken', accessToken);
      if (newRefreshToken) localStorage.setItem('refreshToken', newRefreshToken);
      
      return accessToken;
    } catch (error) {
      console.error('Token refresh error:', error);
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      throw error;
    }
  },

  async updateUser(userAttributes) {
    try {
      const response = await api.put('/auth/profile', userAttributes);
      return response.data.user;
    } catch (error) {
      console.error('Update user error:', error);
      throw error;
    }
  },

  async changePassword(currentPassword, newPassword) {
    try {
      console.log('🔍 CHANGE PASSWORD ATTEMPT');
      const response = await api.post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword
      });
      return response.data;
    } catch (error) {
      console.error('Change password error:', error);
      throw error;
    }
  },

  async forgotPassword(email) {
    try {
      const response = await api.post('/auth/forgot-password', { email });
      return response.data;
    } catch (error) {
      console.error('Forgot password error:', error);
      throw error;
    }
  },

  async resetPassword(email, code, newPassword) {
    try {
      const response = await api.post('/auth/reset-password', {
        email,
        code,
        password: newPassword
      });
      return response.data;
    } catch (error) {
      console.error('Reset password error:', error);
      throw error;
    }
  },

  async register(userData) {
    try {
      const response = await api.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  }
};