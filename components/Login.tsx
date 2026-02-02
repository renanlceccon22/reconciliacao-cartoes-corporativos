
import React, { useState } from 'react';
import { supabase } from '../src/lib/supabase';

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) throw error;
        } catch (err: any) {
            setError(err.message || 'Erro ao fazer login');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
                <div className="bg-[#003B71] p-8 text-center text-white">
                    <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center p-3 shadow-inner mx-auto mb-4">
                        <img src="/logo.png" alt="Educação Adventista" className="w-full h-full object-contain" />
                    </div>
                    <h2 className="text-2xl font-bold">Acesso ao Sistema</h2>
                    <p className="text-blue-100/70 text-sm mt-2 uppercase tracking-widest font-medium">Reconciliação de Cartões</p>
                </div>

                <form onSubmit={handleLogin} className="p-8 space-y-6">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg text-center animate-shake">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-[#003B71] uppercase mb-1.5 ml-1">E-mail</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#003B71] focus:bg-white outline-none transition-all placeholder:text-gray-400 text-base"
                                placeholder="exemplo@educacaoadventista.org.br"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-[#003B71] uppercase mb-1.5 ml-1">Senha</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#003B71] focus:bg-white outline-none transition-all placeholder:text-gray-400 text-base"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#003B71] hover:bg-[#002B51] text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-900/10 disabled:opacity-50 flex items-center justify-center space-x-2 active:scale-[0.98] text-base"
                    >
                        {loading ? (
                            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <span>ENTRAR NO SISTEMA</span>
                        )}
                    </button>

                    <p className="text-center text-xs text-gray-500">
                        Ambiente restrito e seguro.
                    </p>
                </form>
            </div>
        </div>
    );
};

export default Login;
