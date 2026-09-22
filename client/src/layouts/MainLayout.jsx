import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import CitySelectorModal from '../components/common/CitySelectorModal';
import ToastContainer from '../components/common/ToastContainer';
import AuthModal from '../components/auth/AuthModal';
import AIAssistantWidget from '../components/ai/AIAssistantWidget';

export default function MainLayout() {
  return (
    <div className="flex flex-col min-h-screen bg-dark-950 text-slate-100">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <CitySelectorModal />
      <AuthModal />
      <ToastContainer />
      <AIAssistantWidget />
    </div>
  );
}
