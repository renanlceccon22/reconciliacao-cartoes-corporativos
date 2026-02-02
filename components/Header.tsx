
import React from 'react';
import { supabase } from '../src/lib/supabase';

const Header: React.FC = () => {
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <header className="bg-[#003B71] text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-5">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center p-1.5 shadow-inner hover:scale-105 transition-transform duration-300">
            <img src="/logo.png" alt="Educação Adventista" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Reconciliação de Cartões</h1>
            <p className="text-xs text-blue-100 opacity-90 uppercase tracking-widest font-semibold">Educação Adventista</p>
          </div>
        </div>
        <div className="flex items-center space-x-8">
          <div className="hidden md:block text-sm font-medium border-l border-blue-400 pl-4 py-1">
            Gestão de Faturas v1.0
          </div>
          <button
            onClick={handleLogout}
            className="text-sm font-bold bg-white/10 hover:bg-white/20 px-4 py-2.5 rounded-xl transition-colors flex items-center space-x-2"
          >
            <span>SAIR</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
