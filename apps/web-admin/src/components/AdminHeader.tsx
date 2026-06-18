import React from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';

interface AdminHeaderProps {
  onHomeClick: () => void;
}

export default function AdminHeader({ onHomeClick }: AdminHeaderProps) {
  const handleLogout = async () => {
    try {
      await signOut(auth);
      window.location.href = '/login';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };
  return (
    <header className="sticky top-0 z-50 bg-[#0A0F1C]/80 backdrop-blur-xl border-b border-white/10 shadow-2xl transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Brand */}
          <div 
            className="flex items-center cursor-pointer group"
            onClick={onHomeClick}
          >
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/40 group-hover:shadow-blue-500/60 transition-all duration-300 transform group-hover:scale-105">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="ml-3 flex flex-col">
              <span className="text-xl font-black tracking-tight text-white group-hover:text-blue-400 transition-colors">
                CORNER<span className="text-blue-500">CLICK</span>
              </span>
              <span className="text-[10px] font-bold text-gray-400 tracking-widest uppercase -mt-1 group-hover:text-gray-300 transition-colors">
                Admin Console
              </span>
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center space-x-1">
              <button className="px-4 py-2 text-sm font-semibold text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors border border-white/5 shadow-inner">
                Dashboard
              </button>
              <button className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                Judges
              </button>
              <button className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                Settings
              </button>
            </div>

            <div className="h-6 w-px bg-white/10 hidden sm:block mx-2"></div>
            
            <div className="flex items-center gap-3">
              <button className="relative p-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-white/5 focus:outline-none" title="Notificaciones">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="absolute top-1 right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
              </button>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20"
                  title="Cerrar sesión"
                >
                  Cerrar Sesión
                </button>
                
                <div className="flex items-center gap-3 cursor-pointer p-1.5 pr-3 rounded-full border border-white/10 bg-[#121A2F] hover:border-blue-500/50 hover:bg-[#1A243E] transition-all group">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-inner ring-2 ring-[#0A0F1C] group-hover:scale-105 transition-transform">
                    AD
                  </div>
                  <div className="flex flex-col items-start hidden sm:flex">
                    <span className="text-sm font-semibold text-gray-200 leading-none">Super Admin</span>
                    <span className="text-[10px] text-blue-400 font-medium">Online</span>
                  </div>
                  <svg className="w-4 h-4 text-gray-400 ml-1 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
