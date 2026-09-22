import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem('showpulse_user')) || null,
  accessToken: localStorage.getItem('accessToken') || null,
  refreshToken: localStorage.getItem('refreshToken') || null,
  isAuthenticated: !!localStorage.getItem('accessToken'),
  authModalOpen: false,
  authModalMode: 'login', // 'login' | 'register' | 'forgot'

  setAuth: (user, accessToken, refreshToken) => {
    if (user) localStorage.setItem('showpulse_user', JSON.stringify(user));
    if (accessToken) localStorage.setItem('accessToken', accessToken);
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);

    set({
      user,
      accessToken,
      refreshToken,
      isAuthenticated: true,
      authModalOpen: false
    });
  },

  updateUser: (user) => {
    localStorage.setItem('showpulse_user', JSON.stringify(user));
    set({ user });
  },

  logout: () => {
    localStorage.removeItem('showpulse_user');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false
    });
  },

  openAuthModal: (mode = 'login') => {
    set({ authModalOpen: true, authModalMode: mode });
  },

  closeAuthModal: () => {
    set({ authModalOpen: false });
  }
}));
