import { useState, useEffect } from 'react';
import { Users, Home, FolderOpen, Package } from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { database } from '../firebase';

export const DashboardPage = () => {
  const [counts, setCounts] = useState({
    users: 0,
    stores: 0,
    categories: 0,
    products: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Subscribe to users collection
    const unsubscribeUsers = onSnapshot(
      collection(database, 'users'),
      (snapshot) => {
        setCounts(prev => ({ ...prev, users: snapshot.size }));
      },
      (error) => console.error('Error fetching users count:', error)
    );

    // Subscribe to stores collection
    const unsubscribeStores = onSnapshot(
      collection(database, 'stores'),
      (snapshot) => {
        setCounts(prev => ({ ...prev, stores: snapshot.size }));
      },
      (error) => console.error('Error fetching stores count:', error)
    );

    // Subscribe to categories collection
    const unsubscribeCategories = onSnapshot(
      collection(database, 'categories'),
      (snapshot) => {
        setCounts(prev => ({ ...prev, categories: snapshot.size }));
      },
      (error) => console.error('Error fetching categories count:', error)
    );

    // Subscribe to products collection
    const unsubscribeProducts = onSnapshot(
      collection(database, 'products'),
      (snapshot) => {
        setCounts(prev => ({ ...prev, products: snapshot.size }));
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching products count:', error);
        setLoading(false);
      }
    );

    // Cleanup subscriptions on unmount
    return () => {
      unsubscribeUsers();
      unsubscribeStores();
      unsubscribeCategories();
      unsubscribeProducts();
    };
  }, []);

  const stats = [
    { label: 'Total Users', value: counts.users.toString(), icon: Users, color: 'text-blue-400' },
    { label: 'Total Stores', value: counts.stores.toString(), icon: Home, color: 'text-green-400' },
    { label: 'Categories', value: counts.categories.toString(), icon: FolderOpen, color: 'text-purple-400' },
    { label: 'Products', value: counts.products.toString(), icon: Package, color: 'text-orange-400' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Dashboard Overview</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <stat.icon className={`w-8 h-8 ${stat.color}`} />
            </div>
            <p className="text-zinc-400 text-sm mb-1">{stat.label}</p>
            <p className="text-3xl font-bold text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Recent Activity</h2>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4 pb-4 border-b border-zinc-800 last:border-0 last:pb-0">
              <div className="w-10 h-10 bg-zinc-800 rounded-full"></div>
              <div className="flex-1">
                <p className="text-white font-medium">New user registered</p>
                <p className="text-zinc-400 text-sm">2 minutes ago</p>
              </div>
            </div>
          ))}
        </div>
      </div> */}
    </div>
  );
};