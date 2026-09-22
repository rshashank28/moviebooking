import { create } from 'zustand';

export const useToastStore = create((set, get) => ({
  toasts: [],
  
  addToast: (message, type = 'info', duration = 4000) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    const newToast = { id, message, type };
    
    set((state) => ({ toasts: [...state.toasts, newToast] }));
    
    if (duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, duration);
    }
  },

  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },

  success: (msg, duration) => get().addToast(msg, 'success', duration),
  error: (msg, duration) => get().addToast(msg, 'error', duration),
  info: (msg, duration) => get().addToast(msg, 'info', duration),
  warning: (msg, duration) => get().addToast(msg, 'warning', duration),
}));
