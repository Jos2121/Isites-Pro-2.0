import { ReactNode, useState } from 'react';
import { LogOut, MessageCircle, Settings, Users, FileText, Building2, Menu, X, DollarSign } from 'lucide-react';
import { useAuth } from '@/react-app/hooks/useAuth';
import { usePlatformSettings } from '@/react-app/hooks/usePlatformSettings';
import { Link, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: ReactNode;
}

// Platform Logo Component
function PlatformLogo() {
  const { settings } = usePlatformSettings();

  if (settings.logo_url) {
    return <img src={settings.logo_url} alt="Logo" className="w-10 h-10 object-cover rounded-lg shadow-sm" />;
  }

  return (
    <div className="w-10 h-10 bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
      <span className="text-white font-bold text-lg">IP</span>
    </div>
  );
}

// Platform Name Component
function PlatformName() {
  const { settings } = usePlatformSettings();

  return <span className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">{settings.platform_name}</span>;
}

// Support Button Component
function SupportButton() {
  const { settings } = usePlatformSettings();
  const supportPhone = settings.support_phone || '51987654321';

  return (
    <a
      href={`https://wa.me/${supportPhone.replace(/[^0-9]/g, '')}?text=Hola,%20necesito%20soporte%20con%20la%20plataforma`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center px-4 py-2.5 text-sm font-medium rounded-xl text-white bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 shadow-md hover:shadow-lg transition-all duration-200"
    >
      <MessageCircle className="w-4 h-4 mr-2" />
      Soporte
    </a>
  );
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (!user) return null;

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Building2, roles: ['admin', 'employee', 'superadmin'] },
    { name: 'Clientes', href: '/customers', icon: Users, roles: ['admin', 'employee'] },
    { name: 'Administradores', href: '/admins', icon: Users, roles: ['superadmin'] },
    { name: 'Ingresos', href: '/ingresos', icon: DollarSign, roles: ['admin', 'superadmin'] },
    { name: 'Contactos', href: '/contacts', icon: Users, roles: ['admin', 'superadmin'] },
    { name: 'Planes', href: '/plans', icon: FileText, roles: ['superadmin'] },
    { name: 'Configuraciones', href: '/settings', icon: Settings, roles: ['admin', 'superadmin'] },
    { name: 'Mi Cuenta', href: '/my-account', icon: Users, roles: ['admin'] },
  ];

  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(user.role)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-lg shadow-sm border-b border-gray-200/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/dashboard" className="flex items-center space-x-3 group">
                <div className="transform group-hover:scale-110 transition-transform duration-200">
                  <PlatformLogo />
                </div>
                <PlatformName />
              </Link>
              
              {/* Desktop Navigation */}
              <div className="hidden md:flex ml-10 space-x-1">
                {filteredNavigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                        isActive
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                          : 'text-gray-700 hover:bg-gray-100/80 hover:text-gray-900'
                      }`}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center space-x-4">
              <SupportButton />

              {/* User Info */}
              <div className="flex items-center space-x-3 pl-4 border-l border-gray-200">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                  {user.role !== 'superadmin' && (
                    <p className="text-xs text-gray-400">{(user as any).organization_name}</p>
                  )}
                </div>
                <button
                  onClick={logout}
                  className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                  title="Cerrar sesión"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center space-x-3">
              <SupportButton />
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white/95 backdrop-blur-lg">
            <div className="px-4 py-3 space-y-1">
              {filteredNavigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    {item.name}
                  </Link>
                );
              })}
              
              <div className="pt-3 mt-3 border-t border-gray-200">
                <div className="px-4 py-2">
                  <p className="text-sm font-medium text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                  {user.role !== 'superadmin' && (
                    <p className="text-xs text-gray-400">{(user as any).organization_name}</p>
                  )}
                </div>
                <button
                  onClick={() => {
                    logout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                >
                  <LogOut className="w-5 h-5 mr-3" />
                  Cerrar sesión
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}