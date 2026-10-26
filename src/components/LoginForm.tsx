/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Key, Mail, ShieldAlert } from 'lucide-react';
import logo from '../assets/images/logo.png';

interface LoginFormProps {
  onLogin: (doctorName: string, email: string) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Derive doctor name from email or default to Dr. García
    let derivedName = "Dr. García";
    if (email.trim()) {
      const prefix = email.split('@')[0];
      // Capitalize first letter of email username
      const capitalizedUser = prefix.charAt(0).toUpperCase() + prefix.slice(1);
      
      if (capitalizedUser.toLowerCase().includes('ramos')) {
        derivedName = "Dr. Ramos";
      } else if (capitalizedUser.toLowerCase().includes('garcia') || capitalizedUser.toLowerCase().includes('garcía')) {
        derivedName = "Dr. García";
      } else {
        derivedName = `Dr. ${capitalizedUser}`;
      }
    }

    onLogin(derivedName, email || 'doctor@clinic.com');
  };

  const handleQuickCreate = () => {
    onLogin("Dr. García", "doctor.garcia@novadental.pe");
  };

  return (
    <div className="min-h-screen bg-[#F5EFEB] flex items-center justify-center p-4" id="login-container">
      <div className="bg-white rounded-3xl border border-[#C8D9E6] shadow-xl max-w-md w-full overflow-hidden p-6 md:p-8 space-y-6">
        {/* Brand visual header logos */}
        <div className="text-center space-y-3">
          <img
            src={logo}
            alt="Nova Dental"
            className="mx-auto h-24 md:h-28 w-auto object-contain"
          />
          <span className="text-[10px] uppercase font-bold tracking-widest text-[#567C8D]">
            Portal Clínico Digital • Perú
          </span>
        </div>

        {/* Input box form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold">
          <div className="space-y-1.5">
            <label className="block text-[#2F4156]/80 uppercase tracking-widest text-[10px]">
              Correo Electrónico Clínico
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 w-4.5 h-4.5 text-[#567C8D]" />
              <input
                type="email"
                placeholder="doctor@novadental.pe"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-[#C8D9E6] rounded-xl text-sm focus:outline-none focus:border-[#567C8D] text-[#2F4156]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[#2F4156]/80 uppercase tracking-widest text-[10px]">
              Contraseña de Acceso
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-3.5 w-4.5 h-4.5 text-[#567C8D]" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-[#C8D9E6] rounded-xl text-sm focus:outline-none focus:border-[#567C8D] text-[#2F4156]"
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-[#2F4156]/70">
            <div className="flex items-center gap-1.5">
              <input
                type="checkbox"
                id="remember"
                defaultChecked
                className="rounded border-[#C8D9E6] text-[#2F4156] focus:ring-[#567C8D]"
              />
              <label htmlFor="remember" className="cursor-pointer">Recordar sesión</label>
            </div>
            <a href="#reset" className="hover:underline hover:text-[#2F4156] transition-[#567C8D]">¿Olvidaste clave?</a>
          </div>

          <button
            type="submit"
            className="w-full bg-[#2F4156] hover:bg-[#567C8D] text-white py-3.5 rounded-xl font-bold tracking-wide text-xs transition duration-200 shadow-md border-0 uppercase mt-2 outline-none"
          >
            Iniciar Sesión Dental
          </button>
        </form>

        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-[#C8D9E6]"></div>
          <span className="flex-shrink mx-3 text-gray-400 text-[10px] font-bold uppercase tracking-widest">O</span>
          <div className="flex-grow border-t border-[#C8D9E6]"></div>
        </div>

        {/* Quick create direct entry button */}
        <button
          onClick={handleQuickCreate}
          className="w-full bg-white text-[#2F4156] hover:bg-[#F5EFEB] border border-[#C8D9E6] py-3 rounded-xl font-bold text-xs shadow-sm transition outline-none"
        >
          Crear cuenta / Acceso directo demo
        </button>

        {/* Security badge statement */}
        <p className="text-[10px] text-center text-[#2F4156]/50 font-medium flex items-center justify-center gap-1">
          <ShieldAlert className="w-3.5 h-3.5 text-[#567C8D]" />
          Demostración visual: este acceso no verifica la contraseña.
        </p>
      </div>
    </div>
  );
};
