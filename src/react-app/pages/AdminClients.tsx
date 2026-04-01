import { useState, useEffect } from 'react';
import { Search, Users, MessageCircle, Edit, Trash2, Plus, X as XIcon, RefreshCw, Ban, CheckCircle } from 'lucide-react';
import { useAuth, apiCall } from '@/react-app/hooks/useAuth';
import { useToast } from '@/react-app/hooks/useToast';
import Layout from '@/react-app/components/Layout';
import ConfirmModal from '@/react-app/components/ConfirmModal';
import Pagination from '@/react-app/components/Pagination';
import { formatLocalDate, getInputDateValue, getTodayInputValue } from '@/react-app/utils/dateUtils';

interface Subscription {
  id: number;
  customer_id: number;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  plan_id: number;
  plan_name: string;
  plan_price: number;
  status: string;
  start_date: string;
  end_date: string;
  created_at: string;
}

interface Plan {
  id: number;
  name: string;
  price: number;
  duration_months: number;
}

interface PaymentMethod {
  id: number;
  name: string;
  type: string;
  qr_image_url?: string;
  account_number?: string;
  account_holder?: string;
  bank_name?: string;
  is_active?: boolean;
}

export default function AdminClients() {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [filteredSubscriptions, setFilteredSubscriptions] = useState<Subscription[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [showNewSubscriptionModal, setShowNewSubscriptionModal] = useState(false);
  const [showBulkSubscriptionModal, setShowBulkSubscriptionModal] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [renewingSubscription, setRenewingSubscription] = useState<Subscription | null>(null);
  
  // Paginación Server-Side
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // Fetch subscriptions depends on currentPage
  useEffect(() => {
    if (user?.organization_id) {
      fetchSubscriptions();
    }
  }, [user, currentPage]);

  // Fetch payment methods only once per user change
  useEffect(() => {
    if (user?.organization_id) {
      fetchPaymentMethods();
    }
  }, [user]);

  // Auto-refresh subscriptions every 30 seconds
  useEffect(() => {
    if (user?.organization_id) {
      const interval = setInterval(() => {
        fetchSubscriptions();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [user, currentPage]);

  useEffect(() => {
    let filtered = subscriptions;
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(sub => sub.status === statusFilter);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(sub => 
        sub.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.customer_phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (sub.customer_email && sub.customer_email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        sub.plan_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredSubscriptions(filtered);
  }, [subscriptions, statusFilter, searchTerm]);

  const fetchSubscriptions = async () => {
    try {
      const response = await apiCall(`/api/subscriptions?organization_id=${user?.organization_id}&page=${currentPage}&limit=${ITEMS_PER_PAGE}`);
      if (response.ok) {
        const data = await response.json();
        setSubscriptions(data.subscriptions || []);
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages);
        } else {
          // Fallback seguro en caso de que el backend aún no retorne pagination
          setTotalPages(Math.ceil((data.subscriptions?.length || 0) / ITEMS_PER_PAGE) || 1);
        }
      }
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      const response = await apiCall(`/api/organization-payment-methods?organization_id=${user?.organization_id}`);
      if (response.ok) {
        const data = await response.json();
        setPaymentMethods(data.payment_methods.filter((pm: PaymentMethod) => pm.is_active));
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'expiring': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
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
      case 'cancelled': return 'Cancelada';
      default: return status;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN'
    }).format(amount);
  };

  const generateWhatsAppMessage = (subscription: Subscription) => {
    const customerName = subscription.customer_name;
    const planName = subscription.plan_name;
    const endDate = formatLocalDate(subscription.end_date);
    
    let message = '*RECORDATORIO*\n\n';
    
    switch (subscription.status) {
      case 'pending':
        message += `¡Hola ${customerName}!\nTu suscripción al plan ${planName} está pendiente de pago.\n\nPuedes realizar tu pago a través de nuestros métodos de pago:\n`;
        break;
      case 'active':
        message += `¡Hola ${customerName}!\nTu suscripción al plan ${planName} está activa.\n\nTu próxima renovación será el ${endDate}.\n\nSi necesitas ayuda, contáctanos por este medio.`;
        return message;
      case 'expiring':
        message += `¡Hola ${customerName}!\n\nTu suscripción al plan ${planName} está por vencer el ${endDate}.\n\nPara mantener tu servicio activo, puedes realizar tu renovación a través de nuestros métodos de pago:\n`;
        break;
      case 'expired':
        message += `¡Hola ${customerName}!\nTu suscripción al plan ${planName} ha vencido el ${endDate}.\n\nSi deseas renovarlo puedes realizar tu pago a través de nuestros métodos de pago:\n`;
        break;
      case 'cancelled':
        message += `¡Hola ${customerName}!\n\nTu suscripción fue cancelada. Si esto fue un error o deseas reactivarla, contáctanos por este medio.`;
        return message;
      default:
        message += `¡Hola ${customerName}!\nTe contactamos sobre tu suscripción al plan ${planName}.\n\n`;
    }

    if (['pending', 'expiring', 'expired'].includes(subscription.status)) {
      paymentMethods.forEach(method => {
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

  const updateSubscriptionStatus = async (subscriptionId: number, newStatus: string) => {
    try {
      const response = await apiCall(`/api/subscriptions/${subscriptionId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (response.ok) {
        fetchSubscriptions();
        showSuccess('Éxito', newStatus === 'cancelled' ? 'Suscripción suspendida' : 'Suscripción activada');
      } else {
        showError('Error', 'No se pudo cambiar el estado de la suscripción');
      }
    } catch (error) {
      console.error('Error updating subscription status:', error);
      showError('Error', 'Error de conexión');
    }
  };

  const deleteSubscription = async (subscriptionId: number) => {
    try {
      const response = await apiCall(`/api/subscriptions/${subscriptionId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        fetchSubscriptions();
        showSuccess('Éxito', 'Suscripción eliminada correctamente');
      } else {
        showError('Error', 'No se pudo eliminar la suscripción');
      }
    } catch (error) {
      console.error('Error deleting subscription:', error);
      showError('Error', 'Error de conexión al eliminar la suscripción');
    }
  };

  const handleDeleteClick = (subscriptionId: number, customerName: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Confirmar eliminación',
      message: `¿Estás seguro de que quieres eliminar la suscripción de ${customerName}? Esta acción no se puede deshacer.`,
      onConfirm: () => {
        deleteSubscription(subscriptionId);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
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
            <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
            <p className="text-gray-600">Gestiona las suscripciones de tus clientes</p>
          </div>
          
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
            <button
              onClick={() => setShowNewSubscriptionModal(true)}
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 w-full sm:w-auto"
            >
              <Users className="w-4 h-4 mr-2" />
              Nueva Suscripción
            </button>
            <button
              onClick={() => setShowBulkSubscriptionModal(true)}
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 w-full sm:w-auto"
            >
              <Users className="w-4 h-4 mr-2" />
              Añadir Masivas
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
                  placeholder="Buscar cliente, teléfono o plan..."
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
                <option value="cancelled">Canceladas</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
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
                        <div className="text-sm font-medium text-gray-900">{subscription.customer_name}</div>
                        <div className="text-sm text-gray-500">{subscription.customer_phone}</div>
                        {subscription.customer_email && (
                          <div className="text-sm text-gray-500">{subscription.customer_email}</div>
                        )}
                      </div>
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
                          href={`https://wa.me/${subscription.customer_phone?.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(generateWhatsAppMessage(subscription))}`}
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
                          title="Renovar Suscripción"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => setEditingSubscription(subscription)}
                          className="text-blue-600 hover:text-blue-800 p-1"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => handleDeleteClick(subscription.id, subscription.customer_name)}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => {
                            const newStatus = subscription.status === 'cancelled' ? 'active' : 'cancelled';
                            updateSubscriptionStatus(subscription.id, newStatus);
                          }}
                          className={`p-1 transition-colors ${
                            subscription.status === 'cancelled'
                              ? 'text-green-600 hover:text-green-800'
                              : 'text-orange-600 hover:text-orange-800'
                          }`}
                          title={subscription.status === 'cancelled' ? "Activar Suscripción" : "Suspender Suscripción"}
                        >
                          {subscription.status === 'cancelled' ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            <Ban className="w-4 h-4" />
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
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay clientes</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || statusFilter !== 'all' 
                ? 'No se encontraron clientes con los filtros aplicados.'
                : 'No hay suscripciones de clientes registradas.'
              }
            </p>
          </div>
        )}

        {showNewSubscriptionModal && (
          <NewSubscriptionModal 
            onClose={() => setShowNewSubscriptionModal(false)}
            onSuccess={() => {
              setShowNewSubscriptionModal(false);
              fetchSubscriptions();
            }}
            organizationId={user?.organization_id!}
          />
        )}

        {showBulkSubscriptionModal && (
          <BulkSubscriptionModal 
            onClose={() => setShowBulkSubscriptionModal(false)}
            onSuccess={() => {
              setShowBulkSubscriptionModal(false);
              fetchSubscriptions();
            }}
            organizationId={user?.organization_id!}
          />
        )}

        {editingSubscription && (
          <EditSubscriptionModal 
            subscription={editingSubscription}
            onClose={() => setEditingSubscription(null)}
            onSuccess={() => {
              setEditingSubscription(null);
              fetchSubscriptions();
            }}
            organizationId={user?.organization_id!}
          />
        )}
        
        {renewingSubscription && (
          <RenewSubscriptionModal 
            subscription={renewingSubscription}
            onClose={() => setRenewingSubscription(null)}
            onSuccess={() => {
              setRenewingSubscription(null);
              fetchSubscriptions();
            }}
            organizationId={user?.organization_id!}
          />
        )}

        <ConfirmModal
          isOpen={confirmModal.isOpen}
          onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
          onConfirm={confirmModal.onConfirm}
          title={confirmModal.title}
          message={confirmModal.message}
          type="danger"
          confirmText="Eliminar"
          cancelText="Cancelar"
        />
      </div>
    </Layout>
  );
}

function RenewSubscriptionModal({ subscription, onClose, onSuccess, organizationId }: {
  subscription: Subscription;
  onClose: () => void;
  onSuccess: () => void;
  organizationId: number;
}) {
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>(subscription.plan_id.toString());

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await apiCall(`/api/subscription-plans?organization_id=${organizationId}`);
        if (response.ok) {
          const data = await response.json();
          setPlans(data.plans);
        }
      } catch (error) {
        console.error('Error fetching plans:', error);
      }
    };
    fetchPlans();
  }, [organizationId]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount);
  };

  const handleRenew = async () => {
    setLoading(true);
    try {
      const response = await apiCall(`/api/subscriptions/${subscription.id}/renew`, {
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
          <h3 className="text-xl font-bold text-gray-900">Renovar Suscripción</h3>
          <p className="text-sm text-gray-500 mt-2">
            Selecciona el plan a renovar. Se registrará un nuevo ingreso y se extenderá la fecha de vencimiento.
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Cliente:</span>
            <span className="font-medium text-gray-900">{subscription.customer_name}</span>
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
            <span className="text-gray-500 font-medium mt-1">Monto a registrar:</span>
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

function NewSubscriptionModal({ onClose, onSuccess, organizationId }: { 
  onClose: () => void; 
  onSuccess: () => void;
  organizationId?: number;
}) {
  const { showSuccess, showError } = useToast();
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    plan_id: '',
    start_date: getTodayInputValue()
  });
  const [discount, setDiscount] = useState<number | ''>('');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (organizationId) {
      fetchPlans();
    }
  }, [organizationId]);

  const fetchPlans = async () => {
    try {
      const response = await apiCall(`/api/subscription-plans?organization_id=${organizationId}`);
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
      // First create the customer
      const customerResponse = await apiCall('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_id: organizationId!,
          name: formData.customer_name,
          phone: formData.customer_phone,
          email: formData.customer_email || null,
        }),
      });

      if (!customerResponse.ok) {
        const data = await customerResponse.json();
        throw new Error(data.error || 'Error al crear cliente');
      }

      const customerData = await customerResponse.json();
      
      // Then create the subscription
      const subscriptionResponse = await apiCall('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_id: organizationId!,
          customer_id: customerData.customer.id,
          plan_id: formData.plan_id,
          start_date: formData.start_date,
          status: 'pending',
          discount: Number(discount) || 0
        }),
      });

      if (subscriptionResponse.ok) {
        showSuccess('Éxito', 'Suscripción creada correctamente');
        onSuccess();
      } else {
        const data = await subscriptionResponse.json();
        const errorMessage = data.error || 'Error al crear suscripción';
        setError(errorMessage);
        showError('Error', errorMessage);
      }
    } catch (error) {
      console.error('Error creating subscription:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error de conexión';
      setError(errorMessage);
      showError('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const selectedPlan = plans.find(p => p.id.toString() === formData.plan_id);
  const totalToCharge = Math.max(0, (selectedPlan?.price || 0) - (Number(discount) || 0));

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Nueva Suscripción</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nombre del Cliente</label>
              <input
                type="text"
                required
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Teléfono</label>
              <input
                type="tel"
                required
                value={formData.customer_phone}
                onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Email (opcional)</label>
              <input
                type="email"
                value={formData.customer_email}
                onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Plan</label>
              <select
                required
                value={formData.plan_id}
                onChange={(e) => setFormData({ ...formData, plan_id: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Seleccionar plan...</option>
                {plans.map((plan) => (
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
                required
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

function EditSubscriptionModal({ subscription, onClose, onSuccess, organizationId }: { 
  subscription: Subscription; 
  onClose: () => void; 
  onSuccess: () => void;
  organizationId?: number;
}) {
  const { showSuccess, showError } = useToast();
  const [formData, setFormData] = useState({
    customer_name: subscription.customer_name,
    customer_phone: subscription.customer_phone,
    customer_email: subscription.customer_email || '',
    plan_id: '',
    start_date: getInputDateValue(subscription.start_date),
    upgrade_amount: ''
  });
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (organizationId) {
      fetchPlans();
    }
  }, [organizationId]);

  const fetchPlans = async () => {
    try {
      const response = await apiCall(`/api/subscription-plans?organization_id=${organizationId}`);
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
      const response = await apiCall(`/api/subscriptions/${subscription.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: formData.customer_name,
          customer_phone: formData.customer_phone,
          customer_email: formData.customer_email || null,
          plan_id: formData.plan_id ? parseInt(formData.plan_id) : null,
          start_date: formData.start_date,
          upgrade_amount: formData.upgrade_amount ? parseFloat(formData.upgrade_amount) : 0
        }),
      });

      if (response.ok) {
        showSuccess('Éxito', 'Suscripción actualizada correctamente');
        onSuccess();
      } else {
        const data = await response.json();
        const errorMessage = data.error || 'Error al actualizar la suscripción';
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
          <h3 className="text-lg font-medium text-gray-900 mb-4">Editar Suscripción</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nombre del Cliente</label>
              <input
                type="text"
                required
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Teléfono</label>
              <input
                type="tel"
                required
                value={formData.customer_phone}
                onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={formData.customer_email}
                onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
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
                {plans.map((plan) => (
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

interface BulkSubscriptionRow {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  plan_id: string;
  start_date: string;
  notes: string;
}

function BulkSubscriptionModal({ onClose, onSuccess, organizationId }: { 
  onClose: () => void; 
  onSuccess: () => void;
  organizationId?: number;
}) {
  const { showSuccess, showError } = useToast();
  const [rows, setRows] = useState<BulkSubscriptionRow[]>([
    {
      id: Math.random().toString(36).substring(2, 9),
      customer_name: '',
      customer_phone: '',
      customer_email: '',
      plan_id: '',
      start_date: getTodayInputValue(),
      notes: ''
    }
  ]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (organizationId) {
      fetchPlans();
    }
  }, [organizationId]);

  const fetchPlans = async () => {
    try {
      const response = await apiCall(`/api/subscription-plans?organization_id=${organizationId}`);
      if (response.ok) {
        const data = await response.json();
        setPlans(data.plans);
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
    }
  };

  const addRow = () => {
    setRows([...rows, {
      id: Math.random().toString(36).substring(2, 9),
      customer_name: '',
      customer_phone: '',
      customer_email: '',
      plan_id: '',
      start_date: getTodayInputValue(),
      notes: ''
    }]);
  };

  const removeRow = (id: string) => {
    if (rows.length > 1) {
      setRows(rows.filter(row => row.id !== id));
    }
  };

  const updateRow = (id: string, field: keyof BulkSubscriptionRow, value: string) => {
    setRows(rows.map(row => row.id === id ? { ...row, [field]: value } : row));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors([]);

    const newErrors: string[] = [];
    let successCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      if (!row.customer_name || !row.customer_phone || !row.plan_id) {
        newErrors.push(`Fila ${i + 1}: Faltan campos requeridos`);
        continue;
      }

      try {
        // Create customer
        const customerResponse = await apiCall('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            organization_id: organizationId!,
            name: row.customer_name,
            phone: row.customer_phone,
            email: row.customer_email || null,
            notes: row.notes || null
          }),
        });

        if (!customerResponse.ok) {
          const data = await customerResponse.json();
          newErrors.push(`Fila ${i + 1}: ${data.error || 'Error al crear cliente'}`);
          continue;
        }

        const customerData = await customerResponse.json();
        
        // Create subscription
        const subscriptionResponse = await apiCall('/api/subscriptions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            organization_id: organizationId!,
            customer_id: customerData.customer.id,
            plan_id: row.plan_id,
            start_date: row.start_date,
            status: 'pending',
            notes: row.notes || null
          }),
        });

        if (subscriptionResponse.ok) {
          successCount++;
        } else {
          const data = await subscriptionResponse.json();
          newErrors.push(`Fila ${i + 1}: ${data.error || 'Error al crear suscripción'}`);
        }
      } catch (error) {
        newErrors.push(`Fila ${i + 1}: Error de conexión`);
      }
    }

    setLoading(false);

    if (newErrors.length > 0) {
      setErrors(newErrors);
      if (successCount > 0) {
        showSuccess('Parcialmente exitoso', `Se crearon ${successCount} de ${rows.length} suscripciones`);
      } else {
        showError('Error', 'No se pudo crear ninguna suscripción');
      }
    } else {
      showSuccess('Éxito', `Se crearon ${successCount} suscripciones correctamente`);
      onSuccess();
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
      <div className="relative bg-white rounded-xl shadow-xl max-w-6xl w-full mx-auto max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Añadir Suscripciones Masivas</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-1">Complete los datos de cada suscripción que desea crear</p>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombre *
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Teléfono *
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Plan *
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha Inicio *
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notas
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        required
                        value={row.customer_name}
                        onChange={(e) => updateRow(row.id, 'customer_name', e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Nombre del cliente"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="tel"
                        required
                        value={row.customer_phone}
                        onChange={(e) => updateRow(row.id, 'customer_phone', e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Teléfono"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="email"
                        value={row.customer_email}
                        onChange={(e) => updateRow(row.id, 'customer_email', e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Email (opcional)"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        required
                        value={row.plan_id}
                        onChange={(e) => updateRow(row.id, 'plan_id', e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">Seleccionar...</option>
                        {plans.map((plan) => (
                          <option key={plan.id} value={plan.id}>
                            {plan.name} - S/ {plan.price}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="date"
                        required
                        value={row.start_date}
                        onChange={(e) => updateRow(row.id, 'start_date', e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={row.notes}
                        onChange={(e) => updateRow(row.id, 'notes', e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Notas (opcional)"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => removeRow(row.id)}
                        disabled={rows.length === 1}
                        className="text-red-600 hover:text-red-800 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Eliminar fila"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4">
            <button
              type="button"
              onClick={addRow}
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              Añadir Fila
            </button>
          </div>

          {errors.length > 0 && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <h4 className="text-sm font-medium text-red-800 mb-2">Errores encontrados:</h4>
              <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </form>

        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Total de suscripciones a crear: <span className="font-medium">{rows.length}</span>
            </p>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={loading || rows.length === 0}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
              >
                {loading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                )}
                {loading ? 'Creando...' : 'Crear Suscripciones'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}