import React, { useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useToastStore } from '../../store/useToastStore';
import api from '../../services/api';
import {
  X,
  Mail,
  Lock,
  User,
  Phone,
  Building2,
  Gift,
  ArrowRight,
  Eye,
  EyeOff,
  Sparkles
} from 'lucide-react';

export default function AuthModal() {
  const { authModalOpen, authModalMode, closeAuthModal, openAuthModal, setAuth } = useAuthStore();
  const { success, error: toastError } = useToastStore();

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'CUSTOMER',
    organizationName: '',
    referralCode: ''
  });

  if (!authModalOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (checked ? 'ORGANIZER' : 'CUSTOMER') : value
    }));
    setErrorMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      if (authModalMode === 'login') {
        const res = await api.post('/auth/login', {
          email: formData.email,
          password: formData.password
        });
        const authData = res.data?.data || res.data;
        setAuth(authData.user, authData.accessToken, authData.refreshToken);
        success(`Welcome back, ${authData.user.name}!`);
        closeAuthModal();
      } else if (authModalMode === 'register') {
        const payload = {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
          role: formData.role,
          ...(formData.role === 'ORGANIZER' ? { organizationName: formData.organizationName } : {}),
          ...(formData.referralCode ? { referralCode: formData.referralCode } : {})
        };
        const res = await api.post('/auth/register', payload);
        const authData = res.data?.data || res.data;
        setAuth(authData.user, authData.accessToken, authData.refreshToken);
        success(`Account created successfully! Enjoy booking on ShowPulse.`);
        closeAuthModal();
      } else if (authModalMode === 'forgot') {
        await api.post('/auth/forgot-password', { email: formData.email });
        success('Password reset instructions generated.');
        openAuthModal('login');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="glass-dropdown w-full max-w-md rounded-2xl border border-slate-700/80 p-6 shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center pb-4 border-b border-slate-800">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-primary/10 border border-brand-primary/30 text-indigo-300 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>ShowPulse Pass</span>
          </div>
          <h3 className="text-xl font-bold font-display text-white">
            {authModalMode === 'login' && 'Welcome Back'}
            {authModalMode === 'register' && 'Create Your Account'}
            {authModalMode === 'forgot' && 'Reset Password'}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            {authModalMode === 'login' && 'Sign in to access tickets, rewards, and real-time bookings'}
            {authModalMode === 'register' && 'Join ShowPulse to get 100 bonus loyalty points immediately'}
            {authModalMode === 'forgot' && 'Enter your registered email to receive reset instructions'}
          </p>
        </div>

        {/* Error Banner */}
        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
            {errorMsg}
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {authModalMode === 'register' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="e.g. John Doe"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-dark-900 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-brand-primary"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                name="email"
                required
                placeholder="name@domain.com"
                value={formData.email}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-dark-900 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-brand-primary"
              />
            </div>
          </div>

          {authModalMode !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-slate-300">
                  Password
                </label>
                {authModalMode === 'login' && (
                  <button
                    type="button"
                    onClick={() => openAuthModal('forgot')}
                    className="text-[11px] text-brand-primary hover:text-indigo-400 transition-colors"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-dark-900 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-brand-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {authModalMode === 'register' && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Phone Number (Optional)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    name="phone"
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-dark-900 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-brand-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Referral Code (Optional)
                </label>
                <div className="relative">
                  <Gift className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    name="referralCode"
                    placeholder="SPXXXX"
                    value={formData.referralCode}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-dark-900 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-brand-primary uppercase"
                  />
                </div>
              </div>

              {/* Organizer Toggle */}
              <div className="pt-2 border-t border-slate-800">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    name="role"
                    checked={formData.role === 'ORGANIZER'}
                    onChange={handleChange}
                    className="w-4 h-4 rounded text-brand-primary bg-dark-900 border-slate-700 focus:ring-brand-primary"
                  />
                  <span className="text-xs font-medium text-amber-300">
                    Register as Event / Cinema Organizer
                  </span>
                </label>

                {formData.role === 'ORGANIZER' && (
                  <div className="mt-3">
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Organization / Brand Name
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        name="organizationName"
                        required={formData.role === 'ORGANIZER'}
                        placeholder="e.g. Apex Cinemas / LiveNation Patna"
                        value={formData.organizationName}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-dark-900 border border-amber-500/50 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-brand-primary to-indigo-600 hover:from-indigo-500 hover:to-indigo-700 text-white font-semibold text-sm shadow-glow-primary transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span>Processing...</span>
            ) : (
              <>
                <span>
                  {authModalMode === 'login' && 'Sign In'}
                  {authModalMode === 'register' && 'Create Account'}
                  {authModalMode === 'forgot' && 'Send Reset Link'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Modal Switcher Footer */}
        <div className="mt-6 pt-4 border-t border-slate-800 text-center text-xs text-slate-400">
          {authModalMode === 'login' ? (
            <p>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => openAuthModal('register')}
                className="font-semibold text-brand-primary hover:text-indigo-400 transition-colors ml-1"
              >
                Sign up now
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => openAuthModal('login')}
                className="font-semibold text-brand-primary hover:text-indigo-400 transition-colors ml-1"
              >
                Sign in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
