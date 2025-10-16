import { useEffect, useState } from 'react';
import { collection, onSnapshot, doc, updateDoc, query, where } from 'firebase/firestore';
import { database } from '../firebase';
import { Loader2, Package, DollarSign, Tag, Box, Search } from 'lucide-react';
import { Store, Product } from '../interfaces';

interface StoreDetailsPageProps {
  store: Store | null;
}

export const StoreDetailsPage = ({ store }: StoreDetailsPageProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(false);
  const [vendorStatus, setVendorStatus] = useState(store?.vendorStatus || 'pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);

  // Update vendorStatus when store changes
  useEffect(() => {
    if (store?.vendorStatus) {
      setVendorStatus(store.vendorStatus);
    }
  }, [store]);

  useEffect(() => {
    if (!store) {
        setLoading(false);
        setProducts([]);
        return;
    }
    const productsRef = collection(database, 'products');
    const q = query(productsRef, where('storeId', '==', store.id));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const storeProducts: Product[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        const product = {
          id: doc.id,
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
    }, (error) => {
      console.error('Error fetching products:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [store]);

  useEffect(() => {
    const lowercasedQuery = searchQuery.toLowerCase();
    const filtered = products.filter(product =>
      product.name.toLowerCase().includes(lowercasedQuery) ||
      (product.description && product.description.toLowerCase().includes(lowercasedQuery))
    );
    setFilteredProducts(filtered);
  }, [searchQuery, products]);


  const handleStatusChange = async (newStatus: string) => {
    if (!store) return;
    if (newStatus === vendorStatus) return;

    if (!confirm(`Are you sure you want to change the vendor status to "${newStatus}"?`)) {
      return;
    }

    setStatusLoading(true);

    try {
      const storeRef = doc(database, 'stores', store.id);
      await updateDoc(storeRef, {
        vendorStatus: newStatus
      });

      setVendorStatus(newStatus);
      alert(`Vendor status updated to "${newStatus}" successfully!`);
    } catch (error) {
      console.error('Error updating vendor status:', error);
      alert('Failed to update vendor status');
    } finally {
      setStatusLoading(false);
    }
  };

  // Helper function for status colors
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-950/50 text-green-400 border-green-900';
      case 'rejected':
        return 'bg-red-950/50 text-red-400 border-red-900';
      case 'pending':
      default:
        return 'bg-yellow-950/50 text-yellow-400 border-yellow-900';
    }
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

  return (
    <div className="space-y-6">
      {/* Store Header */}
      <div className='bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-row w-full justify-between items-start'>
        <div className="">
          <h1 className="text-3xl font-bold text-white mb-3">{store.storeName}</h1>
          <div className="space-y-2 text-zinc-400">
            <p className="flex items-center gap-2">
              <span className="text-zinc-500">📍</span>
              {store.address}, {store.city}, {store.state}
            </p>
            <div className="flex items-center gap-4 flex-wrap">
              <p className="flex items-center gap-2">
                <span className="text-zinc-500">📞</span>
                {store.phoneNumber}
              </p>
              <span className="text-zinc-600">|</span>
              <p className="flex items-center gap-2">
                <span className="text-zinc-500">✉️</span>
                {store.email}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 items-end">
          <label className="text-sm text-zinc-500 font-medium">Vendor Status</label>
          <div className="relative">
            <select
              value={vendorStatus}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={statusLoading}
              className={`appearance-none px-4 py-2 pr-10 rounded-lg border font-medium text-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${getStatusColor(vendorStatus)}`}
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>

            {statusLoading ? (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin pointer-events-none" />
            ) : (
              <svg
                className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
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
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
            <button onClick={() => setIsSearchVisible(!isSearchVisible)} className="text-zinc-400 hover:text-white p-2 rounded-lg hover:bg-zinc-800">
              <Search className="w-5 h-5" />
            </button>
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center">
            <Box className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
            <p className="text-zinc-400 text-lg">{searchQuery ? 'No products match your search' : 'No products found for this store'}</p>
            <p className="text-zinc-500 text-sm mt-2">{searchQuery ? 'Try a different search term' : 'Products will appear here once added'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts.map((product) => {
              const actualPrice = parseFloat(product.actualPrice as any) || 0;
              const discountPrice = parseFloat(product.discountPrice as any) || 0;
              const hasDiscount = discountPrice > 0 && discountPrice < actualPrice;
              const displayPrice = hasDiscount ? discountPrice : actualPrice;
              const savings = hasDiscount ? actualPrice - discountPrice : 0;
              const savingsPercent = hasDiscount ? ((savings / actualPrice) * 100).toFixed(0) : 0;

              return (
                <div
                  key={product.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition-all hover:shadow-lg hover:shadow-zinc-900/50"
                >
                  {/* Product Image/Icon */}
                  <div className="relative w-full h-48 bg-zinc-950 rounded-lg mb-4 flex items-center justify-center border border-zinc-800 overflow-hidden">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <Package className="w-16 h-16 text-zinc-700" />
                    )}

                    {/* Badges */}
                    <div className="absolute top-2 right-2 flex flex-col gap-2">
                      {product.isSecondHand && (
                        <span className="bg-amber-900/90 text-amber-200 text-xs font-bold px-2 py-1 rounded">
                          USED
                        </span>
                      )}
                      {hasDiscount && (
                        <span className="bg-red-600/90 text-white text-xs font-bold px-2 py-1 rounded">
                          {savingsPercent}% OFF
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Product Info */}
                  <div className="space-y-3">
                    <h3 className="text-white font-semibold text-lg line-clamp-2">
                      {product.name}
                    </h3>

                    {product.description && (
                      <p className="text-zinc-400 text-sm line-clamp-2">
                        {product.description}
                      </p>
                    )}

                    <div className="pt-3 border-t border-zinc-800">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-green-400" />
                        <span className="text-white font-bold text-2xl">
                          ₹{displayPrice.toLocaleString()}
                        </span>
                      </div>

                      {hasDiscount && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-zinc-500 text-sm line-through">
                            ₹{actualPrice.toLocaleString()}
                          </span>
                          <span className="text-green-400 text-sm font-semibold">
                            Save ₹{savings.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Status */}
                    <div className="pt-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${product.status === 'instock'
                        ? 'bg-green-950/50 text-green-400 border border-green-900'
                        : product.status === 'outofstock'
                          ? 'bg-red-950/50 text-red-400 border border-red-900'
                          : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                        }`}>
                        {product.status === 'instock' ? 'In Stock' :
                          product.status === 'outofstock' ? 'Out of Stock' :
                            product.status}
                      </span>

                      {!product.isActive && (
                        <span className="ml-2 px-3 py-1 rounded-full text-xs font-medium bg-gray-800 text-gray-400 border border-gray-700">
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};