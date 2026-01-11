import React from 'react';
import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';

const WorkAreaList = ({ orders, user, onViewOrder }) => {
  // Filtrar órdenes según el rol del usuario para mostrar solo sus tareas pendientes
  const filteredOrders = orders.filter(order => {
    // Siempre excluir estados ANULADA y ARCHIVADA (inactivos reales para tareas)
    if (order.status === 'ANULADA' || order.status === 'ARCHIVADA') return false;

    // Lógica específica para Administrador: Solo ver FINALIZADA
    // (Según requerimiento: mostrar únicamente órdenes Finalizadas, excluir Ingresadas/Otras)
    if (user.role === 'Administrador') {
       return order.status === 'FINALIZADA';
    }

    // Para los demás roles, excluimos FINALIZADA (ya no es tarea pendiente para ellos)
    if (order.status === 'FINALIZADA') return false;
    
    // Filtros por rol (Standard)
    if (user.role === 'Producción') return order.status === 'PRODUCCION';
    if (user.role === 'Contabilidad') return order.status === 'CONTABILIDAD';
    if (user.role === 'Vendedor') return ['VENTAS', 'VENTAS POR RETIRAR'].includes(order.status);
    
    return false;
  });

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('es-ES', { 
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const formatOrderId = (order) => {
    if (order.orderNumber) {
        return order.orderNumber.toString().padStart(7, '0');
    }
    // Fallback for any legacy data
    return (order.id || '').toString().slice(-7).padStart(7, '0');
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 font-bold">Orden</th>
              <th className="px-6 py-4 font-bold">Fecha Entrega</th>
              <th className="px-6 py-4 font-bold">Cliente</th>
              <th className="px-6 py-4 font-bold">Titulo</th>
              <th className="px-6 py-4 font-bold text-center">Detalles</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
             {filteredOrders.length > 0 ? (
                filteredOrders.map(order => (
                  <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                     <td className="px-6 py-4">
                        <button 
                          onClick={() => onViewOrder(order)}
                          className="font-bold text-blue-600 hover:text-blue-800 hover:underline text-base"
                        >
                          {formatOrderId(order)}
                        </button>
                     </td>
                     <td className="px-6 py-4 text-slate-600 font-medium">
                        {formatDate(order.fechaEntrega)}
                     </td>
                     <td className="px-6 py-4 font-bold text-slate-800 uppercase">
                        {order.cliente}
                     </td>
                     <td className="px-6 py-4 text-slate-600 uppercase font-medium">
                        {order.tipoLetrero}
                     </td>
                     <td className="px-6 py-4 text-center">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-slate-400 hover:text-blue-600"
                          onClick={() => onViewOrder(order)}
                        >
                          <Eye className="h-5 w-5" />
                        </Button>
                     </td>
                  </tr>
                ))
             ) : (
                <tr>
                   <td colSpan="5" className="px-6 py-12 text-center text-slate-500 italic">
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-lg font-medium text-slate-400">Todo al día</span>
                        <span>No hay tareas pendientes en tu área de trabajo.</span>
                      </div>
                   </td>
                </tr>
             )}
          </tbody>
        </table>
      </div>
      <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 text-xs text-slate-500">
         Mostrando {filteredOrders.length} tareas pendientes
      </div>
    </div>
  );
};

export default WorkAreaList;