
import React from 'react';
import { Allocation } from '../types';

interface AllocationTableProps {
  allocations: Allocation[];
}

const AllocationTable: React.FC<AllocationTableProps> = ({ allocations }) => {
  const total = allocations.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
      <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
        <h3 className="font-semibold text-gray-700">Alocações Contábeis Extraídas</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descrição / C. Custo</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Valor (R$)</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {allocations.map((a, idx) => (
              <tr key={idx} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{a.date}</td>
                <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                  {a.description}
                  {(a.costCenter || a.batch) && (
                    <div className="flex space-x-2 text-xs text-gray-400 font-normal mt-0.5">
                      {a.costCenter && <span>C.C: {a.costCenter}</span>}
                      {a.batch && <span className="text-blue-500 font-semibold">Lote: {a.batch}</span>}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                  {a.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50">
            <tr>
              <td colSpan={2} className="px-6 py-4 text-sm font-bold text-[#003B71] text-right">TOTAL ALOCADO</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-[#003B71]">
                {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default AllocationTable;
