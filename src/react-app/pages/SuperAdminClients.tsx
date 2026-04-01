import { useState, useEffect } from 'react';
import { Search, Users, Plus, Edit2, Trash2, MessageCircle, Ban, CheckCircle, RefreshCw } from 'lucide-react';
import Layout from '@/react-app/components/Layout';
import { apiCall } from '@/react-app/hooks/useAuth';
import { useToast } from '@/react-app/hooks/useToast';
import ConfirmModal from '@/react-app/components/ConfirmModal';
import Pagination from '@/react-app/components/Pagination';
import { formatLocalDate, getInputDateValue, getTodayInputValue } from '@/react-app/utils/dateUtils';

interface AdminSubscription {
  id: number;
  admin_name: string;
  admin_email: string;
  admin_phone: string;
  organization_name: string;
  plan_id: number;
  plan_name: string;
  plan_price: number;
  duration_type: string;
  status: string;
  start_date: string;
  end_date: string;
  created_at: string;
  is_active: boolean;
}

export default function SuperAdminClients() {
  const [subscriptions, setSubscriptions] = useState<AdminSubscription[]>([]);
  const [filteredSubscriptions, setFilteredSubscriptions] = useState<AdminSubscription[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showNewSubscriptionModal, setShowNewSubscriptionModal] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<AdminSubscription | null>(null);
  const [renewingSubscription, setRenewingSubscription] = useState<AdminSubscription | null>(null);
  const [superAdminPaymentMethods, setSuperAdminPaymentMethods] = useState<any[]>([]);
  const { showSuccess, showError } = useToast();
  
  // Paginación Server-Side
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const ITEMS_PER_PAGE = 10;
  
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    type?: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirmar',
    type: 'danger',
    onConfirm: () => {}
  });

  useEffect(() => {
    fetchAdminSubscriptions();
  }, [currentPage]);

  useEffect(() => {
    fetchSuperAdminPaymentMethods();
  }, []);

  useEffect(() => {
    let filtered = subscriptions;
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(sub => sub.status === statusFilter);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(sub => 
        sub.admin_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.admin_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.organization_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.plan_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredSubscriptions(filtered);
  }, [subscriptions, statusFilter, searchTerm]);

  const fetchAdminSubscriptions = async () => {
    try {
      setLoading(true);
      const response = await apiCall(`/api/superadmin/admin-subscriptions?page=${currentPage}&limit=${ITEMS_PER_PAGE}`);
      if (response.ok) {
        const data = await response.json();
        setSubscriptions(data.subscriptions);
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages);
        } else {
          setTotalPages(Math.ceil((data.subscriptions?.length || 0) / ITEMS_PER_PAGE) || 1);
        }
      }
    } catch (error) {
      console.error('Error fetching admin subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuperAdminPaymentMethods = async () => {
    try {
      const response = await apiCall('/api/superadmin/payment-methods');
      if (response.ok) {
        const data = await response.json();
        setSuperAdminPaymentMethods(data.payment_methods.filter((pm: any) => pm.is_active));
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'expiring': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'expired': return 'bg-red-100 text-red-800 border-red-200';
      case 'cancelled': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'active': return 'Activa';
      case 'expiring': return 'Por Vencer';
      case 'expired': return 'Vencida';
      case 'cancelled': return 'Suspendida';
      default: return status;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN'
    }).format(amount);
  };

  const toggleSubscriptionStatus = async (subscriptionId: number, currentIsActive: boolean) => {
    const newStatus = currentIsActive ? 'cancelled' : 'active';
    try {
      const response = await apiCall(`/api/superadmin/admin-subscriptions/${subscriptionId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (response.ok) {
        fetchAdminSubscriptions();
        showSuccess('Éxito', currentIsActive ? 'Cuenta suspendida correctamente' : 'Cuenta activada correctamente');
      }
    } catch (error) {
      console.error('Error updating subscription status:', error);
    }
  };

  const handleToggleStatusClick = (subscriptionId: number, adminName: string, currentIsActive: boolean) => {
    setConfirmModal({
      isOpen: true,
      title: currentIsActive ? 'Confirmar Suspensión' : 'Confirmar Activación',
      message: currentIsActive 
        ? `¿Estás seguro de que quieres suspender la cuenta de ${adminName}? El administrador y sus clientes no podrán acceder al sistema hasta que la cuenta sea reactivada.`
        : `¿Estás seguro de que quieres reactivar la cuenta de ${adminName}?`,
      confirmText: currentIsActive ? 'Suspender' : 'Activar',
      type: currentIsActive ? 'warning' : 'info',
      onConfirm: () => {
        toggleSubscriptionStatus(subscriptionId, currentIsActive);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const deleteSubscription = async (subscriptionId: number) => {
    try {
      const response = await apiCall(`/api/superadmin/admin-subscriptions/${subscriptionId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        fetchAdminSubscriptions();
        showSuccess('Éxito', 'Administrador eliminado correctamente');
      } else {
        showError('Error', 'No se pudo eliminar el administrador');
      }
    } catch (error) {
      console.error('Error deleting subscription:', error);
      showError('Error', 'Error de conexión al eliminar el administrador');
    }
  };

  const handleDeleteClick = (subscriptionId: number, adminName: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Confirmar eliminación',
      message: `¿Estás seguro de que quieres eliminar al administrador ${adminName}? Esta acción eliminará también toda su información y no se puede deshacer.`,
      confirmText: 'Eliminar',
      type: 'danger',
      onConfirm: () => {
        deleteSubscription(subscriptionId);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const generateWhatsAppMessage = (subscription: AdminSubscription) => {
    const customerName = subscription.admin_name;
    const planName = subscription.plan_name;
    const endDate = formatLocalDate(subscription.end_date);
    
    let message = '*RECORDATORIO*\n\n';
    
    switch (subscription.status) {
      case 'pending':
        message += `¡Hola ${customerName}!\nTu suscripción al plan ${planName} está pendiente de activación.\n\nPuedes realizar tu pago a través de nuestros métodos de pago:\n`;
        break;
      case 'active':
        message += `¡Hola ${customerName}!\nTu suscripción al plan ${planName} está activa.\n\nGracias por confiar en nosotros. Tu próxima renovación será el ${endDate}.\n\nSi necesitas ayuda, contáctanos por este medio.`;
        return message;
      case 'expiring':
        message += `¡Hola ${customerName}!\n\nTu suscripción al plan ${planName} está por vencer el ${endDate}.\n\nPara mantener tu servicio activo, puedes realizar tu renovación a través de nuestros métodos de pago:\n`;
        break;
      case 'expired':
        message += `¡Hola ${customerName}!\nTu suscripción al plan ${planName} ha vencido el ${endDate}.\n\nSi deseas renovarlo puedes realizar tu pago a través de nuestros métodos de pago:\n`;
        break;
      case 'cancelled':
        message += `¡Hola ${customerName}!\n\nTu cuenta fue suspendida o cancelada. Si esto fue un error o deseas reactivarla, contáctanos por este medio.\n\nSi necesitas ayuda, contáctanos por este medio.`;
        return message;
      default:
        message += `¡Hola ${customerName}!\nTe contactamos sobre tu suscripción al plan ${planName}.\n\n`;
    }

    if (['pending', 'expiring', 'expired'].includes(subscription.status)) {
      superAdminPaymentMethods.forEach(method => {
        if (method.type === 'digital_wallet') {
          message += `\n${method.name}: ${method.account_number}`;
        } else {
          message += `\n${method.name}:\nCuenta: ${method.account_number}\nTitular: ${method.account_holder}\nBanco: ${method.bank_name}`;
        }
      });
      message += '\n\nSi necesitas ayuda, contáctanos por este medio.';
    }

    return message;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Administradores</h1>
            <p className="text-gray-600">Lista de suscripciones de administradores del SaaS</p>
          </div>
          
          <div className="mt-4 lg:mt-0">
            <button 
              onClick={() => setShowNewSubscriptionModal(true)}
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 w-full sm:w-auto"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nueva Suscripción
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Buscar administrador, organización o plan..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="all">Todos los estados</option>
                <option value="pending">Pendientes</option>
                <option value="active">Activas</option>
                <option value="expiring">Por Vencer</option>
                <option value="expired">Vencidas</option>
                <option value="cancelled">Suspendidas</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Administrador</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Organización</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fechas</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSubscriptions.map((subscription) => (
                  <tr key={subscription.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{subscription.admin_name}</div>
                        <div className="text-sm text-gray-500">{subscription.admin_email}</div>
                        <div className="text-sm text-gray-500">{subscription.admin_phone}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{subscription.organization_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{subscription.plan_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{formatCurrency(subscription.plan_price)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(subscription.status)}`}>
                        {getStatusText(subscription.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div>Inicio: {formatLocalDate(subscription.start_date)}</div>
                        <div>Vence: {formatLocalDate(subscription.end_date)}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <a
                          href={`https://wa.me/${subscription.admin_phone?.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(generateWhatsAppMessage(subscription))}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-600 hover:text-green-800 p-1"
                          title="Enviar mensaje WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </a>
                        
                        <button
                          onClick={() => setRenewingSubscription(subscription)}
                          className="text-emerald-600 hover:text-emerald-800 p-1"
                          title="Renovar Plan"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => setEditingSubscription(subscription)}
                          className="text-blue-600 hover:text-blue-800 p-1"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(subscription.id, subscription.admin_name)}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => handleToggleStatusClick(subscription.id, subscription.admin_name, subscription.is_active)}
                          className={`p-1 ${
                            subscription.is_active
                              ? 'text-orange-600 hover:text-orange-800'
                              : 'text-green-600 hover:text-green-800'
                          }`}
                          title={subscription.is_active ? "Suspender cuenta" : "Activar cuenta"}
                        >
                          {subscription.is_active ? (
                            <Ban className="w-4 h-4" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <Pagination 
            currentPage={currentPage} 
            totalPages={totalPages} 
            onPageChange={setCurrentPage} 
          />
        </div>

        {filteredSubscriptions.length === 0 && (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay suscripciones</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || statusFilter !== 'all' 
                ? 'No se encontraron suscripciones con los filtros aplicados.'
                : 'No hay suscripciones de administradores registradas.'
              }
            </p>
          </div>
        )}

        {showNewSubscriptionModal && (
          <NewSubscriptionModal 
            onClose={() => setShowNewSubscriptionModal(false)}
            onSuccess={() => {
              setShowNewSubscriptionModal(false);
              fetchAdminSubscriptions();
            }}
          />
        )}

        {editingSubscription && (
          <EditSubscriptionModal 
            subscription={editingSubscription}
            onClose={() => setEditingSubscription(null)}
            onSuccess={() => {
              setEditingSubscription(null);
              fetchAdminSubscriptions();
            }}
          />
        )}

        {renewingSubscription && (
          <RenewAdminSubscriptionModal 
            subscription={renewingSubscription}
            onClose={() => setRenewingSubscription(null)}
            onSuccess={() => {
              setRenewingSubscription(null);
              fetchAdminSubscriptions();
            }}
          />
        )}

        <ConfirmModal
          isOpen={confirmModal.isOpen}
          onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
          onConfirm={confirmModal.onConfirm}
          title={confirmModal.title}
          message={confirmModal.message}
          type={confirmModal.type || 'danger'}
          confirmText={confirmModal.confirmText || 'Confirmar'}
          cancelText="Cancelar"
        />
      </div>
    </Layout>
  );
}

function RenewAdminSubscriptionModal({ subscription, onClose, onSuccess }: {
  subscription: AdminSubscription;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>(subscription.plan_id.toString());

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await apiCall('/api/superadmin/saas-plans');
        if (response.ok) {
          const data = await response.json();
          setPlans(data.plans);
        }
      } catch (error) {
        console.error('Error fetching plans:', error);
      }
    };
    fetchPlans();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount);
  };

  const handleRenew = async () => {
    setLoading(true);
    try {
      const response = await apiCall(`/api/superadmin/admin-subscriptions/${subscription.id}/renew`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: parseInt(selectedPlanId) })
      });

      if (response.ok) {
        showSuccess('Éxito', 'Suscripción renovada y pago registrado correctamente');
        onSuccess();
      } else {
        const data = await response.json();
        showError('Error', data.error || 'Error al renovar la suscripción');
      }
    } catch (error) {
      console.error('Error renewing subscription:', error);
      showError('Error', 'Error de conexión al renovar la suscripción');
    } finally {
      setLoading(false);
    }
  };

  const selectedPlan = plans.find(p => p.id.toString() === selectedPlanId);
  const displayPrice = selectedPlan ? selectedPlan.price : subscription.plan_price;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
      <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="text-center mb-6">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-emerald-100 mb-4">
            <RefreshCw className="h-6 w-6 text-emerald-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">Renovar Administrador</h3>
          <p className="text-sm text-gray-500 mt-2">
            Selecciona el plan a renovar. Se registrará un nuevo ingreso en la plataforma y se extenderá la vigencia del administrador.
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Administrador:</span>
            <span className="font-medium text-gray-900">{subscription.admin_name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Organización:</span>
            <span className="font-medium text-gray-900">{subscription.organization_name}</span>
          </div>
          
          <div className="flex flex-col text-sm space-y-2">
            <label className="text-gray-500 font-medium">Plan a Renovar:</label>
            <select
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 text-sm py-2 px-3"
            >
              {plans.map(plan => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} - {formatCurrency(plan.price)}
                </option>
              ))}
              {plans.length === 0 && (
                <option value={subscription.plan_id}>{subscription.plan_name}</option>
              )}
            </select>
          </div>
          
          <div className="flex justify-between text-sm border-t border-gray-200 pt-3 mt-4">
            <span className="text-gray-500 font-medium mt-1">Ingreso a registrar:</span>
            <span className="font-bold text-xl text-emerald-600">{formatCurrency(displayPrice)}</span>
          </div>
        </div>

        <div className="flex space-x-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleRenew}
            disabled={loading}
            className="flex-1 py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 flex justify-center items-center"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              'Confirmar Renovación'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function NewSubscriptionModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { showSuccess, showError } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    plan_id: '',
    organization_name: '',
    start_date: getTodayInputValue()
  });
  const [discount, setDiscount] = useState<number | ''>('');
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSaasPlans();
  }, []);

  const fetchSaasPlans = async () => {
    try {
      const response = await apiCall('/api/superadmin/saas-plans');
      if (response.ok) {
        const data = await response.json();
        setPlans(data.plans);
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await apiCall('/api/superadmin/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          start_date: formData.start_date,
          discount: Number(discount) || 0
        }),
      });

      if (response.ok) {
        showSuccess('Éxito', 'Administrador creado correctamente');
        onSuccess();
      } else {
        const data = await response.json();
        const errorMessage = data.error || 'Error al crear la suscripción';
        setError(errorMessage);
        showError('Error', errorMessage);
      }
    } catch (error) {
      const errorMessage = 'Error de conexión';
      setError(errorMessage);
      showError('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const selectedPlan = plans.find((p: any) => p.id.toString() === formData.plan_id);
  const totalToCharge = Math.max(0, (selectedPlan?.price || 0) - (Number(discount) || 0));

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Crear Nuevo Administrador</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nombre de la Organización</label>
              <input
                type="text"
                required
                value={formData.organization_name}
                onChange={(e) => setFormData({ ...formData, organization_name: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Nombre</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Correo Electrónico</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Contraseña</label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Teléfono / WhatsApp</label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Elegir Plan</label>
              <select
                required
                value={formData.plan_id}
                onChange={(e) => setFormData({ ...formData, plan_id: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Seleccionar plan...</option>
                {plans.map((plan: any) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} - S/ {plan.price} ({plan.duration_months || 1} {plan.duration_months === 1 ? 'mes' : 'meses'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Descuento (S/)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={discount}
                onChange={(e) => setDiscount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.00"
              />
              {formData.plan_id && (
                <p className="mt-2 text-sm font-bold text-gray-900">
                  Total a cobrar: S/ {totalToCharge.toFixed(2)}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Fecha de Inicio</label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Creando...' : 'Crear Suscripción'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function EditSubscriptionModal({ subscription, onClose, onSuccess }: { 
  subscription: AdminSubscription; 
  onClose: () => void; 
  onSuccess: () => void;
}) {
  const { showSuccess, showError } = useToast();
  const [formData, setFormData] = useState({
    name: subscription.admin_name,
    email: subscription.admin_email,
    phone: subscription.admin_phone,
    organization_name: subscription.organization_name,
    plan_id: '',
    start_date: getInputDateValue(subscription.start_date),
    password: '',
    upgrade_amount: ''
  });
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSaasPlans();
  }, []);

  const fetchSaasPlans = async () => {
    try {
      const response = await apiCall('/api/superadmin/saas-plans');
      if (response.ok) {
        const data = await response.json();
        setPlans(data.plans);
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await apiCall(`/api/superadmin/admin-subscriptions/${subscription.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          organization_name: formData.organization_name,
          plan_id: formData.plan_id ? parseInt(formData.plan_id) : null,
          start_date: formData.start_date,
          password: formData.password || null,
          upgrade_amount: formData.upgrade_amount ? parseFloat(formData.upgrade_amount) : 0
        }),
      });

      if (response.ok) {
        showSuccess('Éxito', 'Administrador actualizado correctamente');
        onSuccess();
      } else {
        const data = await response.json();
        const errorMessage = data.error || 'Error al actualizar el administrador';
        setError(errorMessage);
        showError('Error', errorMessage);
      }
    } catch (error) {
      const errorMessage = 'Error de conexión';
      setError(errorMessage);
      showError('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Validamos estrictamente que sea diferente usando .toString() en ambos
  const isPlanChanged = formData.plan_id !== '' && formData.plan_id !== subscription.plan_id.toString();

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Editar Administrador</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nombre de la Organización</label>
              <input
                type="text"
                required
                value={formData.organization_name}
                onChange={(e) => setFormData({ ...formData, organization_name: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Nombre</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Correo Electrónico</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Teléfono / WhatsApp</label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Cambiar Plan (opcional)</label>
              <select
                value={formData.plan_id}
                onChange={(e) => setFormData({ ...formData, plan_id: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Mantener plan actual ({subscription.plan_name})</option>
                {plans.map((plan: any) => (
                  <option key={plan.id} value={plan.id.toString()}>
                    {plan.name} - S/ {plan.price} ({plan.duration_months || 1} {plan.duration_months === 1 ? 'mes' : 'meses'})
                  </option>
                ))}
              </select>
            </div>

            {isPlanChanged && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 animate-slide-in">
                <label className="block text-sm font-medium text-blue-900 mb-1">Monto cobrado por el cambio (S/)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.upgrade_amount}
                  onChange={(e) => setFormData({ ...formData, upgrade_amount: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ej. 50.00"
                />
                <p className="text-xs text-blue-700 mt-2">
                  Al ingresar un monto aquí, el cliente cambiará de plan pero mantendrá su fecha de inicio original. El nuevo vencimiento se calculará en base a esa fecha original.
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">Fecha de Inicio</label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                disabled={isPlanChanged && parseFloat(formData.upgrade_amount || '0') > 0}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Cambiar Contraseña (opcional)</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Dejar vacío para mantener la actual"
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Actualizando...' : 'Actualizar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}