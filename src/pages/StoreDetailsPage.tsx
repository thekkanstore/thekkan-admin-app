import { useEffect, useState } from 'react';
import { collection, onSnapshot, doc, updateDoc, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { database } from '../firebase';
import {
  Loader2,
  Package,
  Box,
  Search,
  Trash2,
  CreditCard,
  CheckCircle2,
  PlusCircle,
  AlertCircle
} from 'lucide-react';
import { format, addMonths, addYears } from 'date-fns';
import type { Store, Product } from '../interfaces';

interface StoreDetailsPageProps {
  store: Store | null;
}

export const StoreDetailsPage = ({ store: initialStore }: StoreDetailsPageProps) => {
  const [store, setStore] = useState<Store | null>(initialStore);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(false);
  const [vendorStatus, setVendorStatus] = useState(initialStore?.vendorStatus || 'pending');
  const [paymentStatus, setPaymentStatus] = useState(initialStore?.paymentStatus || 'pending');
  const [subscriptionPlan, setSubscriptionPlan] = useState(initialStore?.subscriptionPlan || '12_months');
  const [subscriptionEndDate, setSubscriptionEndDate] = useState<string>('');

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Subscribe to live store document
  useEffect(() => {
    if (!initialStore?.id) return;
    const storeRef = doc(database, 'stores', initialStore.id);
    const unsubscribe = onSnapshot(storeRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const updatedStore = {
          id: snap.id,
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
          subscriptionStartDate: data.subscriptionStartDate?.toDate ? data.subscriptionStartDate.toDate() : data.subscriptionStartDate,
          subscriptionEndDate: data.subscriptionEndDate?.toDate ? data.subscriptionEndDate.toDate() : data.subscriptionEndDate,
        } as Store;
        setStore(updatedStore);
        setVendorStatus(updatedStore.vendorStatus || 'pending');
        setPaymentStatus(updatedStore.paymentStatus || 'pending');
        setSubscriptionPlan(updatedStore.subscriptionPlan || '12_months');

        if (updatedStore.subscriptionEndDate) {
          const d = updatedStore.subscriptionEndDate instanceof Date ? updatedStore.subscriptionEndDate : new Date(updatedStore.subscriptionEndDate);
          if (!isNaN(d.getTime())) {
            setSubscriptionEndDate(format(d, 'yyyy-MM-dd'));
          }
        }
      }
    });

    return () => unsubscribe();
  }, [initialStore?.id]);

  // Fetch products
  useEffect(() => {
    if (!store?.id) {
      setLoading(false);
      setProducts([]);
      return;
    }
    const productsRef = collection(database, 'products');
    const q = query(productsRef, where('storeId', '==', store.id));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const storeProducts: Product[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const product = {
            id: docSnap.id,
            name: data.name || 'Unnamed Product',
            actualPrice: parseFloat(data.actualPrice) || 0,
            discountPrice: parseFloat(data.discountPrice) || 0,
            description: data.description || '',
            categoryId: data.categoryId || '',
            status: data.status || '',
            image: data.image || '',
            storeId: data.storeId || '',
            isActive: data.isActive ?? true,
            isSecondHand: data.isSecondHand ?? false,
            userId: data.userId || '',
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          } as any;

          storeProducts.push(product);
        });

        setProducts(storeProducts);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching products:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [store?.id]);

  useEffect(() => {
    const lowercasedQuery = searchQuery.toLowerCase();
    const filtered = products.filter(
      (product) =>
        product.name.toLowerCase().includes(lowercasedQuery) ||
        (product.description && product.description.toLowerCase().includes(lowercasedQuery))
    );
    setFilteredProducts(filtered);
  }, [searchQuery, products]);

  const handleUpdateStoreField = async (fields: Partial<Store>) => {
    if (!store) return;
    setStatusLoading(true);

    try {
      const storeRef = doc(database, 'stores', store.id);
      await updateDoc(storeRef, {
        ...fields,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error('Error updating store:', error);
      alert('Failed to update store settings.');
    } finally {
      setStatusLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!store || newStatus === vendorStatus) return;
    setVendorStatus(newStatus);
    await handleUpdateStoreField({ vendorStatus: newStatus });
  };

  const handlePaymentStatusChange = async (newPaymentStatus: string) => {
    if (!store || newPaymentStatus === paymentStatus) return;
    setPaymentStatus(newPaymentStatus);

    const updatePayload: any = { paymentStatus: newPaymentStatus };
    // If setting to PAID and no subscriptionEndDate exists, set to 1 year by default
    if (newPaymentStatus.toUpperCase() === 'PAID' && !store.subscriptionEndDate) {
      const startDate = new Date();
      const endDate = addYears(startDate, 1);
      updatePayload.subscriptionStartDate = startDate;
      updatePayload.subscriptionEndDate = endDate;
      setSubscriptionEndDate(format(endDate, 'yyyy-MM-dd'));
    }

    await handleUpdateStoreField(updatePayload);
  };

  const handleQuickExtend = async (months: number) => {
    if (!store) return;
    const currentEnd = store.subscriptionEndDate instanceof Date
      ? store.subscriptionEndDate
      : store.subscriptionEndDate ? new Date(store.subscriptionEndDate) : new Date();

    const baseDate = currentEnd > new Date() ? currentEnd : new Date();
    const newEndDate = addMonths(baseDate, months);

    setSubscriptionEndDate(format(newEndDate, 'yyyy-MM-dd'));
    await handleUpdateStoreField({
      subscriptionEndDate: newEndDate,
      paymentStatus: 'PAID',
      vendorStatus: 'approved',
    });
  };

  const handleCustomDateChange = async (dateStr: string) => {
    if (!store || !dateStr) return;
    setSubscriptionEndDate(dateStr);
    const newDate = new Date(`${dateStr}T23:59:59`);
    await handleUpdateStoreField({
      subscriptionEndDate: newDate,
    });
  };

  const handleDeleteStore = async () => {
    if (!store) return;
    setIsDeleting(true);

    try {
      const productsRef = collection(database, 'products');
      const q = query(productsRef, where('storeId', '==', store.id));
      const querySnapshot = await getDocs(q);

      let batch = writeBatch(database);
      let count = 0;

      for (const docSnap of querySnapshot.docs) {
        batch.delete(docSnap.ref);
        count++;
        if (count === 490) {
          await batch.commit();
          batch = writeBatch(database);
          count = 0;
        }
      }

      const storeRef = doc(database, 'stores', store.id);
      batch.delete(storeRef);
      await batch.commit();

      alert('Store and its products deleted successfully!');
      setShowDeletePopup(false);
      window.location.reload();
    } catch (error) {
      console.error('Error deleting store:', error);
      alert('Failed to delete store and products.');
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return 'bg-emerald-950/60 text-emerald-400 border-emerald-800';
      case 'rejected':
        return 'bg-red-950/60 text-red-400 border-red-800';
      case 'inactive':
        return 'bg-zinc-800 text-zinc-400 border-zinc-700';
      case 'private':
        return 'bg-purple-950/60 text-purple-400 border-purple-800';
      case 'pending':
      default:
        return 'bg-amber-950/60 text-amber-400 border-amber-800';
    }
  };

  const getPaymentColor = (status: string) => {
    if (status?.toUpperCase() === 'PAID') {
      return 'bg-emerald-950/60 text-emerald-400 border-emerald-800';
    }
    return 'bg-amber-950/60 text-amber-400 border-amber-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Package className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
          <p className="text-white text-xl font-semibold">Store not found</p>
          <p className="text-zinc-400 mt-2">The store you're looking for doesn't exist</p>
        </div>
      </div>
    );
  }

  const isSubscriptionActive = store.subscriptionEndDate && (
    (store.subscriptionEndDate instanceof Date ? store.subscriptionEndDate : new Date(store.subscriptionEndDate)) > new Date()
  );

  return (
    <div className="space-y-6">
      {/* Store Header & Info */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col md:flex-row w-full justify-between items-start gap-6">
        <div className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold text-white">{store.storeName}</h1>
            <span className="text-xs px-2.5 py-1 rounded-md bg-zinc-800 text-zinc-400 font-mono">
              ID: {store.id}
            </span>
          </div>
          <div className="space-y-1.5 text-zinc-400 text-sm">
            <p className="flex items-center gap-2">
              <span className="text-zinc-500">📍</span>
              {store.address}, {store.city}, {store.state}
            </p>
            <div className="flex items-center gap-4 flex-wrap">
              <p className="flex items-center gap-2">
                <span className="text-zinc-500">📞</span>
                {store.phoneNumber || 'No phone'}
              </p>
              <span className="text-zinc-700">•</span>
              <p className="flex items-center gap-2">
                <span className="text-zinc-500">✉️</span>
                {store.email || 'No email'}
              </p>
              <span className="text-zinc-700">•</span>
              <p className="flex items-center gap-2">
                <span className="text-zinc-500">👤</span>
                User: <span className="font-mono text-zinc-300">{store.userId || 'N/A'}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowDeletePopup(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-950/50 text-red-400 border border-red-900 rounded-lg hover:bg-red-900/50 transition-colors text-sm font-medium"
          >
            <Trash2 className="w-4 h-4" />
            Delete Store
          </button>
        </div>
      </div>

      {/* Admin Controls Panel: Vendor Status & Subscription Management */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Vendor & Payment Status */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            Store Status & Approval
          </h3>
          <p className="text-xs text-zinc-400">Control store visibility on homepage and search results.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {/* Vendor Status */}
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Vendor Status
              </label>
              <select
                value={vendorStatus}
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={statusLoading}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-semibold uppercase tracking-wider cursor-pointer disabled:opacity-50 transition-colors ${getStatusColor(
                  vendorStatus
                )}`}
              >
                <option value="pending">Pending</option>
                <option value="approved">Approved (Live)</option>
                <option value="rejected">Rejected</option>
                <option value="inactive">Inactive</option>
                <option value="private">Private</option>
              </select>
            </div>

            {/* Payment Status */}
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Payment Status
              </label>
              <select
                value={paymentStatus}
                onChange={(e) => handlePaymentStatusChange(e.target.value)}
                disabled={statusLoading}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-semibold uppercase tracking-wider cursor-pointer disabled:opacity-50 transition-colors ${getPaymentColor(
                  paymentStatus
                )}`}
              >
                <option value="PAID">PAID (Verified)</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>
          </div>

          <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 text-xs text-zinc-400 space-y-1">
            <div className="flex items-center justify-between">
              <span>Homepage & Search Eligibility:</span>
              {vendorStatus === 'approved' && paymentStatus.toUpperCase() === 'PAID' && isSubscriptionActive ? (
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> ELIGIBLE (LIVE)
                </span>
              ) : (
                <span className="text-amber-400 font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> NOT LIVE
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Subscription Plan & Expiry */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-400" />
            Subscription & Validity
          </h3>
          <p className="text-xs text-zinc-400">Manage plan duration or extend subscription expiration date.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {/* Plan */}
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Plan
              </label>
              <select
                value={subscriptionPlan}
                onChange={(e) => {
                  setSubscriptionPlan(e.target.value);
                  handleUpdateStoreField({ subscriptionPlan: e.target.value });
                }}
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="12_months">12 Months (Annual - ₹2,999)</option>
                <option value="3_months">3 Months (₹999)</option>
              </select>
            </div>

            {/* Expiry Date */}
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Expiration Date
              </label>
              <input
                type="date"
                value={subscriptionEndDate}
                onChange={(e) => handleCustomDateChange(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Quick Extend Buttons */}
          <div className="pt-2 flex items-center gap-2">
            <span className="text-xs text-zinc-400 font-medium">Quick Extend:</span>
            <button
              onClick={() => handleQuickExtend(1)}
              disabled={statusLoading}
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs rounded-lg font-medium transition-colors border border-zinc-700 flex items-center gap-1"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              +1 Month
            </button>
            <button
              onClick={() => handleQuickExtend(3)}
              disabled={statusLoading}
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs rounded-lg font-medium transition-colors border border-zinc-700 flex items-center gap-1"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              +3 Months
            </button>
            <button
              onClick={() => handleQuickExtend(12)}
              disabled={statusLoading}
              className="px-3 py-1.5 bg-blue-950 hover:bg-blue-900 text-blue-300 text-xs rounded-lg font-semibold transition-colors border border-blue-800 flex items-center gap-1"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              +1 Year
            </button>
          </div>
        </div>
      </div>

      {/* Products Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Package className="w-6 h-6" />
            Products
            <span className="text-zinc-500 text-lg font-normal">({filteredProducts.length})</span>
          </h2>
          <div className="flex items-center gap-2">
            {isSearchVisible && (
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            )}
            <button
              onClick={() => setIsSearchVisible(!isSearchVisible)}
              className="text-zinc-400 hover:text-white p-2 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center">
            <Box className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
            <p className="text-zinc-400 text-lg">
              {searchQuery ? 'No products match your search' : 'No products found for this store'}
            </p>
            <p className="text-zinc-500 text-sm mt-2">
              {searchQuery ? 'Try a different search term' : 'Products will appear here once added'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-700 transition-colors flex flex-col"
              >
                <div className="h-48 bg-zinc-950 relative flex items-center justify-center">
                  {product.image ? (
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <Box className="w-12 h-12 text-zinc-700" />
                  )}
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="text-white font-semibold text-base line-clamp-1">{product.name}</h3>
                    <p className="text-zinc-400 text-xs line-clamp-2 mt-1">{product.description}</p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                    <div>
                      <span className="text-white font-bold text-lg">₹{product.discountPrice || product.actualPrice}</span>
                      {product.discountPrice > 0 && product.actualPrice > product.discountPrice && (
                        <span className="text-zinc-500 line-through text-xs ml-2">₹{product.actualPrice}</span>
                      )}
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                      {product.status || 'instock'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeletePopup && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Delete Store</h3>
            <p className="text-sm text-zinc-400">
              Are you sure you want to permanently delete store <strong className="text-white">"{store.storeName}"</strong>? This will also remove all {products.length} products associated with this store.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowDeletePopup(false)}
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
export default StoreDetailsPage;