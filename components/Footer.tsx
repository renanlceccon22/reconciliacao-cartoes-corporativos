
import React from 'react';

const Footer: React.FC = () => {
    return (
        <footer className="bg-[#002D52] text-white border-t-4 border-[#FDB913] py-10 mt-auto">
            <div className="container mx-auto px-4 text-center">
                <div className="mb-6">
                    <p className="text-[11px] font-bold tracking-[0.2em] uppercase mb-1">
                        DESENVOLVEDOR: <span className="text-[#FDB913]">RENAN CECCON</span>
                    </p>
                    <p className="text-[10px] font-medium text-blue-100/60 tracking-wider">
                        Contato: renanlceccon@yahoo.com.br
                    </p>
                </div>

                <div className="max-w-xs h-px bg-white/10 mx-auto mb-8"></div>

                <div className="space-y-2 text-white/40">
                    <p className="text-[9px] font-bold tracking-[0.3em] uppercase">
                        © 2026 SISTEMA DE RECONCILIAÇÃO DE CARTÕES
                    </p>
                    <p className="text-[8px] font-semibold tracking-[0.2em] uppercase">
                        TODOS OS DIREITOS RESERVADOS.
                    </p>
                    <div className="pt-6">
                        <p className="text-[10px] font-black tracking-[0.4em] text-white/30">
                            VERSÃO 1.0.0
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
