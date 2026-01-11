import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Users, FileText, Briefcase, Settings, BarChart2, LogOut, ChevronRight, ChevronDown, UserCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const MenuItem = ({
  item,
  isActive,
  currentView,
  onClick,
  onSubItemClick
}) => {
  const { toast } = useToast();
  const Icon = item.icon;
  const hasSubmenu = item.submenu && item.submenu.length > 0;
  
  const isChildActive = hasSubmenu && item.submenu.some(sub => sub.id === currentView);
  const [isSubmenuOpen, setIsSubmenuOpen] = useState(isChildActive);

  React.useEffect(() => {
    if (isChildActive) setIsSubmenuOpen(true);
  }, [isChildActive]);

  const handleClick = () => {
    if (hasSubmenu) {
      setIsSubmenuOpen(!isSubmenuOpen);
    } else {
      onClick(item);
      if (item.action) item.action();
      else if (!item.id) {
        toast({
          title: "🚧 En construcción",
          description: "Esta funcionalidad estará disponible pronto."
        });
      }
    }
  };

  return (
    <div className="mb-1">
      <button 
        onClick={handleClick} 
        className={cn(
          "w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition-all duration-200 group relative", 
          isActive ? "text-blue-400 bg-slate-800 border-l-4 border-blue-500" : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 hover:pl-5 border-l-4 border-transparent"
        )}
      >
        <div className="flex items-center gap-3">
          <Icon className={cn("h-5 w-5", isActive ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300")} />
          <span>{item.label}</span>
        </div>
        {hasSubmenu && (
          <div className="text-slate-600">
            {isSubmenuOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </div>
        )}
      </button>

      <AnimatePresence>
        {hasSubmenu && isSubmenuOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-slate-900/50"
          >
            {item.submenu.map((subItem, idx) => {
              const isSubActive = currentView === subItem.id;
              return (
                <button 
                  key={idx} 
                  onClick={() => {
                     if (subItem.id) {
                       onSubItemClick(subItem.id);
                     } else {
                       toast({
                         title: "🚧 En construcción",
                         description: "Submenú no implementado aún."
                       });
                     }
                  }} 
                  className={cn(
                    "w-full text-left pl-12 pr-4 py-2 text-xs transition-colors border-l-2",
                    isSubActive 
                      ? "text-blue-400 border-blue-500 bg-slate-800/30" 
                      : "text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-800"
                  )}
                >
                  {subItem.label}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Sidebar = ({
  user,
  onLogout,
  currentView,
  onViewChange
}) => {
  const menuItems = [
    {
      id: 'inicio',
      label: 'Inicio',
      icon: Home
    }, 
    {
      id: 'clientes',
      label: 'Clientes',
      icon: Users,
      submenu: [
        { label: 'Lista de Clientes', id: 'clientes-lista' },
        { label: 'Nuevo Cliente', id: 'clientes-nuevo' },
        { label: 'Grupos', id: null }
      ]
    }, 
    {
      id: 'ordenes',
      label: 'Órdenes Producción',
      icon: FileText,
      submenu: [
        { label: 'Ver Todas', id: 'ordenes-todas' },
        { label: 'Nueva Orden', id: 'ordenes-nueva' },
        // Eliminado "Activas"
        // Mantenemos las específicas solicitadas y las necesarias para navegación general
        { label: 'Sin Factura', id: 'ordenes-sin-factura' },
        { label: 'Con Factura', id: 'ordenes-con-factura' },
        { label: 'Crédito', id: 'ordenes-credito' },
        // Eliminado "Finalizadas" del sidebar visual principal si se requiere estricto, 
        // pero el usuario dijo "Eliminar categorías ÓRDENES ACTIVAS y FINALIZADAS del menú dashboard"
        // lo cual interpretamos principalmente como los KPI/Stats, pero si se refiere al sidebar:
        // "Mantener visibles solo INGRESADAS, EN PRODUCCIÓN, POR RETIRAR, EN CONTABILIDAD y CON CRÉDITO."
        // El Sidebar actual no tiene desgloses por estado (Producción, Por Retirar, etc), tiene agrupaciones funcionales.
        // Asumo que se refiere a los KPI CARDS en el Dashboard (Stats.jsx).
        // Sin embargo, "Activas" y "Finalizadas" sí existen en el Sidebar actual.
        // Voy a eliminar 'Activas' y 'Finalizadas' del Sidebar también para cumplir "Eliminar... del menú dashboard"
        // si el usuario considera el sidebar como menú.
        
        { label: 'Anuladas', id: 'ordenes-anuladas' },
        { label: 'Archivadas', id: 'ordenes-archivadas' }
      ]
    }, 
    {
      id: 'trabajo',
      label: 'Área de Trabajo',
      icon: Briefcase,
      submenu: [
        { label: 'Listado', id: 'trabajo-listado' }, 
        { label: 'Disponibilidad', id: 'trabajo-disponibilidad' },
        { label: 'Mis Tareas', id: null }
      ]
    }, 
    {
      id: 'usuarios',
      label: 'Usuarios',
      icon: UserCircle,
      submenu: [
        { label: 'Gestión de Usuarios', id: null }, 
        { label: 'Roles y Permisos', id: null }
      ]
    }, 
    {
      id: 'config',
      label: 'Configuraciones',
      icon: Settings,
      submenu: [
        { label: 'General', id: null }, 
        { label: 'Notificaciones', id: null }, 
        { label: 'Sistema', id: null }
      ]
    }, 
    {
      id: 'estadisticas',
      label: 'Estadísticas',
      icon: BarChart2,
      submenu: [
        { label: 'Gráficos', id: 'estadisticas-graficos' }, 
        { label: 'Reporte Diario', id: 'estadisticas-reporte' }
      ]
    }, 
    {
      id: 'salir',
      label: 'Cerrar Sesión',
      icon: LogOut,
      action: onLogout
    }
  ];

  return (
    <div className="w-64 bg-slate-900 h-screen flex flex-col shadow-2xl border-r border-slate-800 fixed left-0 top-0 z-40 overflow-y-auto print:hidden">
      <div className="p-6 border-b border-slate-800">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-bold text-white truncate" title={user?.name}>
            {user?.name || 'Usuario'}
          </h2>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
               Perfil {user?.role || 'Invitado'}
            </span>
          </div>
        </div>
      </div>

      <div className="px-6 py-4">
        <h3 className="text-xs font-bold text-slate-600 uppercase tracking-widest">
          Menú Principal
        </h3>
      </div>

      <div className="flex-1 pb-4">
        {menuItems.map(item => (
          <MenuItem 
            key={item.label} 
            item={item} 
            isActive={currentView === item.id || (item.submenu && item.submenu.some(sub => sub.id === currentView))} 
            currentView={currentView}
            onClick={(item) => item.id && item.id !== 'salir' && !item.submenu && onViewChange(item.id)}
            onSubItemClick={(subId) => onViewChange(subId)}
          />
        ))}
      </div>

      <div className="p-4 border-t border-slate-800">
        <div className="text-[10px] text-slate-600 text-center">
            <p>Sistema de Gestión v1.0</p>
            <p>© 2026 ADR Company </p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;