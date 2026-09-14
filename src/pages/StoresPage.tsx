import { useState, useEffect } from 'react';
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  writeBatch,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { database } from '../firebase';
import {
  Loader2,
  Store as StoreIcon,
  Search,
  Download,
  Trash2,
  Eye,
  CheckCircle2,
  Clock,
  CreditCard,
  Building2
} from 'lucide-react';
import { format } from 'date-fns';
import type { Store } from '../interfaces';

interface StoresPageProps {
  onViewStore: (store: Store) => void;
}

export const StoresPage = ({ onViewStore }: StoresPageProps) => {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [filteredStores, setFilteredStores] = useState<Store[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');

  const [storeToDelete, setStoreToDelete] = useState<Store | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [statusLoadingMap, setStatusLoadingMap] = useState<{ [key: string]: boolean }>({});

  // Fetch stores from Firestore (real-time listener)
  useEffect(() => {
    const storesRef = collection(database, 'stores');

    const unsubscribe = onSnapshot(
      storesRef,
      (snapshot) => {
        const storesArray: Store[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          storesArray.push({
            id: docSnap.id,
            ...data,
            createdAt: data.createdAt?.toDate
              ? data.createdAt.toDate()
              : data.createdAt ? new Date(data.createdAt) : new Date(),
            updatedAt: data.updatedAt?.toDate
              ? data.updatedAt.toDate()
              : data.updatedAt ? new Date(data.updatedAt) : new Date(),
            subscriptionStartDate: data.subscriptionStartDate?.toDate
              ? data.subscriptionStartDate.toDate()
              : data.subscriptionStartDate ? new Date(data.subscriptionStartDate) : null,
            subscriptionEndDate: data.subscriptionEndDate?.toDate
              ? data.subscriptionEndDate.toDate()
              : data.subscriptionEndDate ? new Date(data.subscriptionEndDate) : null,
          } as Store);
        });

        // Sort by createdAt descending (newest first)
        storesArray.sort((a, b) => {
          const timeA = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
          const timeB = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
          return timeB - timeA;
        });

        setStores(storesArray);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching stores:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Filter stores based on search query and status filter
  useEffect(() => {
    const lowercasedQuery = searchQuery.toLowerCase();
    const filtered = stores.filter((store) => {
      const matchesSearch =
        (store.storeName?.toLowerCase() || '').includes(lowercasedQuery) ||
        (store.city?.toLowerCase() || '').includes(lowercasedQuery) ||
        (store.state?.toLowerCase() || '').includes(lowercasedQuery) ||
        (store.email?.toLowerCase() || '').includes(lowercasedQuery) ||
        String(store.phoneNumber || '').toLowerCase().includes(lowercasedQuery) ||
        (store.userId?.toLowerCase() || '').includes(lowercasedQuery);

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'approved' && store.vendorStatus?.toLowerCase() === 'approved') ||
        (statusFilter === 'pending' && (!store.vendorStatus || store.vendorStatus?.toLowerCase() === 'pending')) ||
        (statusFilter === 'paid' && store.paymentStatus?.toUpperCase() === 'PAID');

      return matchesSearch && matchesStatus;
    });

    setFilteredStores(filtered);
  }, [searchQuery, statusFilter, stores]);

  const handleStatusChange = async (storeId: string, newStatus: string) => {
    setStatusLoadingMap((prev) => ({ ...prev, [storeId]: true }));

    try {
      const storeRef = doc(database, 'stores', storeId);
      await updateDoc(storeRef, {
        vendorStatus: newStatus,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error('Error updating vendor status:', error);
      alert('Failed to update vendor status.');
    } finally {
      setStatusLoadingMap((prev) => ({ ...prev, [storeId]: false }));
    }
  };

  const handlePaymentStatusChange = async (store: Store, newPaymentStatus: string) => {
    setStatusLoadingMap((prev) => ({ ...prev, [store.id]: true }));

    try {
      const storeRef = doc(database, 'stores', store.id);
      const updateData: any = {
        paymentStatus: newPaymentStatus,
        updatedAt: new Date(),
      };

      if (newPaymentStatus.toUpperCase() === 'PAID' && !store.subscriptionEndDate) {
        const startDate = new Date();
        const endDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
        updateData.subscriptionStartDate = startDate;
        updateData.subscriptionEndDate = endDate;
        updateData.vendorStatus = 'approved';
      }

      await updateDoc(storeRef, updateData);
    } catch (error) {
      console.error('Error updating payment status:', error);
      alert('Failed to update payment status.');
    } finally {
      setStatusLoadingMap((prev) => ({ ...prev, [store.id]: false }));
    }
  };

  const handleDeleteStore = async () => {
    if (!storeToDelete) return;
    setIsDeleting(true);

    try {
      // 1. Get all products for this store
      const productsRef = collection(database, 'products');
      const q = query(productsRef, where('storeId', '==', storeToDelete.id));
      const querySnapshot = await getDocs(q);

      let batch = writeBatch(database);
      let count = 0;

      // 2. Delete all products in chunks
      for (const docSnap of querySnapshot.docs) {
        batch.delete(docSnap.ref);
        count++;
        if (count === 490) {
          await batch.commit();
          batch = writeBatch(database);
          count = 0;
        }
      }

      // 3. Delete the store document
      const storeRef = doc(database, 'stores', storeToDelete.id);
      batch.delete(storeRef);
      await batch.commit();

      setStoreToDelete(null);
      alert('Store and its products deleted successfully!');
    } catch (error) {
      console.error('Error deleting store:', error);
      alert('Failed to delete store.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Export stores to CSV
  const handleExportCSV = () => {
    const headers = [
      'Store Name',
      'City',
      'State',
      'Address',
      'Email',
      'Phone Number',
      'Vendor Status',
      'Payment Status',
      'Subscription Plan',
      'Subscription End Date',
      'User ID',
      'Store ID',
      'Created At'
    ];

    const csvRows = filteredStores.map((store) => {
      const createdAtStr = store.createdAt instanceof Date ? format(store.createdAt, 'yyyy-MM-dd HH:mm:ss') : 'N/A';
      const endDateStr = store.subscriptionEndDate instanceof Date ? format(store.subscriptionEndDate, 'yyyy-MM-dd') : 'N/A';

      return [
        `"${(store.storeName || 'N/A').replace(/"/g, '""')}"`,
        `"${(store.city || 'N/A').replace(/"/g, '""')}"`,
        `"${(store.state || 'N/A').replace(/"/g, '""')}"`,
        `"${(store.address || 'N/A').replace(/"/g, '""')}"`,
        `"${(store.email || 'N/A').replace(/"/g, '""')}"`,
        `"${String(store.phoneNumber || 'N/A').replace(/"/g, '""')}"`,
        `"${(store.vendorStatus || 'pending').replace(/"/g, '""')}"`,
        `"${(store.paymentStatus || 'N/A').replace(/"/g, '""')}"`,
        `"${(store.subscriptionPlan || 'N/A').replace(/"/g, '""')}"`,
        `"${endDateStr}"`,
        `"${(store.userId || 'N/A').replace(/"/g, '""')}"`,
        `"${store.id}"`,
        `"${createdAtStr}"`
      ].join(',');
    });

    const csvContent = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `dealzhub_stores_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return 'bg-emerald-950/60 text-emerald-400 border-emerald-800';
      case 'rejected':
        return 'bg-red-950/60 text-red-400 border-red-800';
      case 'inactive':
        return 'bg-zinc-800 text-zinc-400 border-zinc-700';
      case 'pending':
      default:
        return 'bg-amber-950/60 text-amber-400 border-amber-800';
    }
  };

  // Stats calculation
  const totalStores = stores.length;
  const approvedStores = stores.filter((s) => s.vendorStatus?.toLowerCase() === 'approved').length;
  const paidStores = stores.filter((s) => s.paymentStatus?.toUpperCase() === 'PAID').length;
  const pendingStores = stores.filter((s) => !s.vendorStatus || s.vendorStatus?.toLowerCase() === 'pending').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <StoreIcon className="w-7 h-7 text-emerald-400" />
            Stores Management
          </h1>
          <p className="text-zinc-400 text-sm mt-1">Manage vendor stores, subscriptions, and approval status.</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Status Filter Buttons */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-1 text-xs font-medium text-zinc-400">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                statusFilter === 'all' ? 'bg-zinc-800 text-white' : 'hover:text-white'
              }`}
            >
              All ({totalStores})
            </button>
            <button
              onClick={() => setStatusFilter('approved')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                statusFilter === 'approved' ? 'bg-emerald-900/50 text-emerald-300' : 'hover:text-white'
              }`}
            >
              Approved ({approvedStores})
            </button>
            <button
              onClick={() => setStatusFilter('paid')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                statusFilter === 'paid' ? 'bg-blue-900/50 text-blue-300' : 'hover:text-white'
              }`}
            >
              Paid ({paidStores})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                statusFilter === 'pending' ? 'bg-amber-900/50 text-amber-300' : 'hover:text-white'
              }`}
            >
              Pending ({pendingStores})
            </button>
          </div>

          {isSearchVisible && (
            <input
              type="text"
              placeholder="Search store, city, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              autoFocus
            />
          )}

          <button
            onClick={() => setIsSearchVisible(!isSearchVisible)}
            className="text-zinc-400 hover:text-white p-2 rounded-lg hover:bg-zinc-800 transition-colors"
            title="Search"
          >
            <Search className="w-5 h-5" />
          </button>

          <button
            onClick={handleExportCSV}
            className="text-zinc-400 hover:text-white p-2 rounded-lg hover:bg-zinc-800 transition-colors"
            title="Export as CSV"
          >
            <Download className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-3">
          <div className="p-3 bg-zinc-800 rounded-lg text-zinc-300">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-zinc-400 text-xs">Total Stores</p>
            <p className="text-xl font-bold text-white">{totalStores}</p>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-3">
          <div className="p-3 bg-emerald-950/70 border border-emerald-900 rounded-lg text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-zinc-400 text-xs">Approved</p>
            <p className="text-xl font-bold text-emerald-400">{approvedStores}</p>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-3">
          <div className="p-3 bg-blue-950/70 border border-blue-900 rounded-lg text-blue-400">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <p className="text-zinc-400 text-xs">Paid Subscriptions</p>
            <p className="text-xl font-bold text-blue-400">{paidStores}</p>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-3">
          <div className="p-3 bg-amber-950/70 border border-amber-900 rounded-lg text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-zinc-400 text-xs">Pending Approval</p>
            <p className="text-xl font-bold text-amber-400">{pendingStores}</p>
          </div>
        </div>
      </div>

      {/* Stores Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-zinc-950 border-b border-zinc-800 text-zinc-400 font-medium text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Store Name</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Payment</th>
                <th className="px-6 py-4">Subscription</th>
                <th className="px-6 py-4">Vendor Status</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filteredStores.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-zinc-500">
                    <StoreIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-base font-medium text-zinc-400">No stores found</p>
                    <p className="text-sm text-zinc-500 mt-1">
                      {searchQuery ? 'Try matching another name, city, or email.' : 'No stores registered in the database yet.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredStores.map((store) => {
                  const isStatusUpdating = !!statusLoadingMap[store.id];
                  const endDateStr = store.subscriptionEndDate instanceof Date
                    ? format(store.subscriptionEndDate, 'MMM dd, yyyy')
                    : null;

                  return (
                    <tr key={store.id} className="hover:bg-zinc-800/50 transition-colors">
                      {/* Store Name */}
                      <td className="px-6 py-4">
                        <div className="font-semibold text-white text-base">{store.storeName || 'Unnamed Store'}</div>
                        <div className="text-xs text-zinc-500 mt-0.5 truncate max-w-[180px]">ID: {store.id}</div>
                      </td>

                      {/* Location */}
                      <td className="px-6 py-4 text-sm text-zinc-300">
                        <div>{store.city || 'N/A'}, {store.state || ''}</div>
                        <div className="text-xs text-zinc-500 truncate max-w-[200px]">{store.address}</div>
                      </td>

                      {/* Contact */}
                      <td className="px-6 py-4 text-sm text-zinc-300">
                        <div>{store.email || 'N/A'}</div>
                        <div className="text-xs text-zinc-400 mt-0.5">{store.phoneNumber || 'N/A'}</div>
                      </td>

                      {/* Payment Status Dropdown */}
                      <td className="px-6 py-4">
                        <div className="relative inline-block">
                          <select
                            value={store.paymentStatus?.toUpperCase() === 'PAID' ? 'PAID' : (store.paymentStatus || 'pending')}
                            onChange={(e) => handlePaymentStatusChange(store, e.target.value)}
                            disabled={isStatusUpdating}
                            className={`appearance-none px-2.5 py-1 pr-7 rounded-lg border text-xs font-semibold uppercase tracking-wider cursor-pointer disabled:opacity-50 transition-colors ${
                              store.paymentStatus?.toUpperCase() === 'PAID'
                                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800'
                                : 'bg-amber-950/60 text-amber-400 border-amber-800'
                            }`}
                          >
                            <option value="PAID">PAID</option>
                            <option value="pending">Pending</option>
                            <option value="failed">Failed</option>
                            <option value="refunded">Refunded</option>
                          </select>
                        </div>
                      </td>

                      {/* Subscription Plan & Expiry */}
                      <td className="px-6 py-4 text-sm text-zinc-300">
                        <div className="font-medium text-zinc-200">
                          {store.subscriptionPlan === '3_months' ? '3 Months' : '12 Months (Annual)'}
                        </div>
                        {endDateStr && (
                          <div className="text-xs text-zinc-400 mt-0.5">Expires: {endDateStr}</div>
                        )}
                      </td>

                      {/* Vendor Status Dropdown */}
                      <td className="px-6 py-4">
                        <div className="relative inline-block">
                          <select
                            value={store.vendorStatus || 'pending'}
                            onChange={(e) => handleStatusChange(store.id, e.target.value)}
                            disabled={isStatusUpdating}
                            className={`appearance-none px-3 py-1.5 pr-8 rounded-lg border text-xs font-semibold uppercase tracking-wider cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${getStatusColor(
                              store.vendorStatus
                            )}`}
                          >
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                            <option value="inactive">Inactive</option>
                          </select>
                          {isStatusUpdating && (
                            <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-white pointer-events-none" />
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => onViewStore(store)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-950/60 text-blue-400 border border-blue-900 hover:bg-blue-900/60 transition-colors"
                            title="View store & products"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View
                          </button>
                          <button
                            onClick={() => setStoreToDelete(store)}
                            className="p-1.5 rounded-lg text-red-400 hover:bg-red-950/50 hover:text-red-300 border border-transparent hover:border-red-900 transition-colors"
                            title="Delete store"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {storeToDelete && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Delete Store</h3>
            <p className="text-sm text-zinc-400">
              Are you sure you want to permanently delete store <strong className="text-white">"{storeToDelete.storeName}"</strong>? This will also remove all products associated with this store. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setStoreToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteStore}
                disabled={isDeleting}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default StoresPage;
