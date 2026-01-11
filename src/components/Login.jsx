import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { LogIn, Users, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

// Roles y usuarios predefinidos
const ROLES = {
  ADMIN: 'Administrador',
  VENDEDOR: 'Vendedor',
  PRODUCCION: 'Producción',
  CONTABILIDAD: 'Contabilidad'
};

const DEMO_USERS = [
  { id: 'admin', name: 'Admin General', role: ROLES.ADMIN, color: 'bg-slate-800' },
  { id: 'vend1', name: 'Juan Pérez', role: ROLES.VENDEDOR, color: 'bg-blue-600' },
  { id: 'vend2', name: 'María García', role: ROLES.VENDEDOR, color: 'bg-blue-600' },
  { id: 'prod', name: 'Jefe Taller', role: ROLES.PRODUCCION, color: 'bg-orange-600' },
  { id: 'conta', name: 'Contador', role: ROLES.CONTABILIDAD, color: 'bg-green-600' }
];

const Login = ({ onLogin }) => {
  const [selectedUser, setSelectedUser] = useState(null);
  const { toast } = useToast();

  const handleLogin = (e) => {
    e.preventDefault();
    if (selectedUser) {
      onLogin(selectedUser);
      toast({
        title: "👋 ¡Bienvenido!",
        description: `Iniciaste sesión como ${selectedUser.name} (${selectedUser.role})`,
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-lg"
      >
        <div className="text-center mb-8">
          <div className="bg-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-white">
            <Users className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Sistema de Órdenes</h1>
          <p className="text-slate-500">Selecciona tu perfil para ingresar</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="grid grid-cols-1 gap-3 max-h-60 overflow-y-auto pr-2">
            {DEMO_USERS.map((user) => (
              <div
                key={user.id}
                onClick={() => setSelectedUser(user)}
                className={cn(
                  "flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all hover:bg-slate-50",
                  selectedUser?.id === user.id 
                    ? "border-blue-600 bg-blue-50 ring-1 ring-blue-600" 
                    : "border-slate-200"
                )}
              >
                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm mr-3 shrink-0", user.color)}>
                  {user.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-800">{user.name}</h3>
                  <p className="text-xs text-slate-500">{user.role}</p>
                </div>
                {selectedUser?.id === user.id && (
                  <Check className="h-5 w-5 text-blue-600" />
                )}
              </div>
            ))}
          </div>

          <Button 
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-6"
            disabled={!selectedUser}
          >
            <LogIn className="mr-2 h-5 w-5" /> Ingresar al Sistema
          </Button>
        </form>
      </motion.div>
    </div>
  );
};

export default Login;