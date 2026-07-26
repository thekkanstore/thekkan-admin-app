import { useState, useEffect } from 'react';
import { Loader2, Eye, Copy, Search, Download, Trash2 } from 'lucide-react';
import {
  collection,
  onSnapshot,
  doc,
  writeBatch,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { database } from '../firebase';
import { format } from 'date-fns';


import type { User, Store } from '../interfaces';

interface UsersPageProps {
  onViewStore: (store: Store) => void;
}

export const UsersPage = ({ onViewStore }: UsersPageProps) => {
  const [users, setUsers] = useState<User[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [tooltipVisible, setTooltipVisible] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);

  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch users from Firestore
  useEffect(() => {
    const usersRef = collection(database, 'users');

    const unsubscribe = onSnapshot(usersRef, (snapshot) => {
      const usersArray: User[] = [];
      snapshot.forEach((doc) => {
        const userData = doc.data();
        usersArray.push({
          id: doc.id,
          ...userData,
          createdAt: userData.createdAt?.toDate ? userData.createdAt.toDate() : new Date(userData.createdAt || Date.now()),
        } as User);
      });
      
      // Sort by createdAt descending (newest first)
      usersArray.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      setUsers(usersArray);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching users:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Fetch stores from Firestore
  useEffect(() => {
    const storesRef = collection(database, 'stores');

    const unsubscribe = onSnapshot(storesRef, (snapshot) => {
      const storesArray: Store[] = [];
      snapshot.forEach((doc) => {
        storesArray.push({
          id: doc.id,
          ...doc.data()
        } as Store);
      });
      setStores(storesArray);
    }, (error) => {
      console.error('Error fetching stores:', error);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const lowercasedQuery = searchQuery.toLowerCase();
    const filtered = users.filter(user =>
      (user.name?.toLowerCase() || '').includes(lowercasedQuery) ||
      (user.email?.toLowerCase() || '').includes(lowercasedQuery) ||
      (user.phoneNumber?.toLowerCase() || '').includes(lowercasedQuery)
    );
    
    // Keep the sorted order (newest first) after filtering
    setFilteredUsers(filtered);
  }, [searchQuery, users]);

  // Get store for a specific user
  const getUserStore = (userId: string): Store | undefined => {
    return stores.find(store => store.userId === userId);
  };

  // Handle view store button click
  const handleViewStore = (userId: string) => {
    const store = getUserStore(userId);
    if (store) {
      onViewStore(store);
    }
  };

  // Export users to CSV (Excel compatible)
  const handleExportCSV = () => {
    const headers = ['Name', 'Email', 'Phone Number', 'Role', 'Store ID', 'User ID', 'Created At'];
    
    const csvRows = filteredUsers.map(user => {
      const userStore = getUserStore(user.id);
      const roleStr = Array.isArray(user.role) ? user.role.join(', ') : (user.role || 'N/A');
      
      return [
        `"${(user.name || 'N/A').replace(/"/g, '""')}"`,
        `"${(user.email || 'N/A').replace(/"/g, '""')}"`,
        `"${(user.phoneNumber || 'N/A').replace(/"/g, '""')}"`,
        `"${String(roleStr).replace(/"/g, '""')}"`,
        `"${userStore ? userStore.id : 'N/A'}"`,
        `"${user.id}"`,
        `"${format(user.createdAt, "dd-MM-yyyy HH:mm")}"`
      ].join(',');
    });
    
    const csvContent = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `users_export_${format(new Date(), "yyyyMMdd_HHmmss")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    
    try {
      let batch = writeBatch(database);
      let count = 0;
      
      const userStore = getUserStore(userToDelete.id);
      
      // If user has a store, delete store and its products
      if (userStore) {
        // Delete all products for this store
        const productsRef = collection(database, 'products');
        const q = query(productsRef, where('storeId', '==', userStore.id));
        const querySnapshot = await getDocs(q);
        
        for (const docSnap of querySnapshot.docs) {
          batch.delete(docSnap.ref);
          count++;
          if (count === 490) {
            await batch.commit();
            batch = writeBatch(database);
            count = 0;
          }
        }
        
        // Delete store
        const storeRef = doc(database, 'stores', userStore.id);
        batch.delete(storeRef);
        count++;
        if (count === 490) {
          await batch.commit();
          batch = writeBatch(database);
          count = 0;
        }
      }
      
      // Delete the user from Firestore
      const userRef = doc(database, 'users', userToDelete.id);
      batch.delete(userRef);
      
      await batch.commit();
      
      // We cannot easily delete the Firebase Auth user from the client side without Admin SDK,
      // but deleting from Firestore fulfills "deleted from firestore permanantly".
      alert('User, store, and products deleted successfully from Firestore.');
      setUserToDelete(null);
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Users Management</h1>
        <div className="flex items-center gap-2">
          {isSearchVisible && (
            <input
              type="text"
              placeholder="Search by name, email, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
          <button onClick={() => setIsSearchVisible(!isSearchVisible)} className="text-zinc-400 hover:text-white p-2 rounded-lg hover:bg-zinc-800" title="Search">
            <Search className="w-5 h-5" />
          </button>
          <button onClick={handleExportCSV} className="text-zinc-400 hover:text-white p-2 rounded-lg hover:bg-zinc-800" title="Export as CSV">
            <Download className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-zinc-950">
            <tr>
              <th className="text-left px-6 py-4 text-zinc-400 font-medium text-sm">Name</th>
              <th className="text-left px-6 py-4 text-zinc-400 font-medium text-sm">Email</th>
              <th className="text-left px-6 py-4 text-zinc-400 font-medium text-sm">PhoneNumber</th>
              <th className="text-left px-6 py-4 text-zinc-400 font-medium text-sm">Role</th>
              <th className="text-left px-6 py-4 text-zinc-400 font-medium text-sm">Store</th>
              <th className="text-left px-6 py-4 text-zinc-400 font-medium text-sm">UserId</th>
              <th className="text-left px-6 py-4 text-zinc-400 font-medium text-sm">Created At</th>
              <th className="text-center px-6 py-4 text-zinc-400 font-medium text-sm">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-zinc-500">
                  {searchQuery ? 'No users match your search' : 'No users found'}
                </td>
              </tr>
            ) : (
              filteredUsers.map((user, index) => {
                const userStore = getUserStore(user.id);

                return (
                  <tr key={user.id} className={index !== filteredUsers.length - 1 ? 'border-b border-zinc-800' : ''}>
                    <td className="px-6 py-4 text-white font-medium">{user.name || 'N/A'}</td>
                    <td className="px-6 py-4 text-zinc-400">{user.email || 'N/A'}</td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 text-zinc-300 rounded-full text-sm mr-2">
                        {user.phoneNumber || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 flex flex-col gap-4">
                      {Array.isArray(user.role) ? user.role.map((role: string, index: number) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-zinc-800 text-zinc-300 rounded-full text-sm mr-2"
                        >
                          {role}
                        </span>
                      )) : <span className="px-3 py-1 bg-zinc-800 text-zinc-300 rounded-full text-sm mr-2">{user.role}</span>}
                    </td>
                    <td className="px-6 py-4">
                      {userStore ? (
                        <button
                          onClick={() => handleViewStore(user.id)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg font-medium text-sm transition-colors bg-blue-950/50 text-blue-400 border border-blue-900 hover:bg-blue-900/50"
                        >
                          <Eye className="w-4 h-4" />
                          View Store
                        </button>
                      ) : (
                        <span className="text-zinc-500 text-sm">No store</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-zinc-400">
                      <div className="flex items-center gap-2">
                        <span className="truncate max-w-[100px]">{user.id}</span>
                        <div className="relative" onMouseEnter={() => setTooltipVisible(user.id)} onMouseLeave={() => setTooltipVisible(null)}>
                          <Copy
                            className="w-4 h-4 text-zinc-500 hover:text-white cursor-pointer"
                            onClick={() => navigator.clipboard.writeText(user.id)}
                          />
                          {tooltipVisible === user.id && (
                            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-max max-w-xs bg-zinc-800 text-white text-xs rounded py-1 px-2 z-10">
                              go to firebase console and go to authentication and users table search for this id and disable account and enable accouunt
                              <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-zinc-800"></div>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-zinc-400">
                      {format(user.createdAt, "dd-MM-yyyy HH:mm")}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <button
                          onClick={() => setUserToDelete(user)}
                          className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors"
                          title="Delete User"
                        >
                          <Trash2 className="w-5 h-5" />
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

      {/* Delete User Confirmation Popup */}
      {userToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4 text-red-400">
              <Trash2 className="w-6 h-6" />
              <h3 className="text-xl font-bold">Delete User?</h3>
            </div>
            
            <p className="text-zinc-300 mb-2">
              Are you sure you want to permanently delete <span className="font-semibold text-white">"{userToDelete.name || userToDelete.email || 'this user'}"</span>?
            </p>
            <p className="text-zinc-500 text-sm mb-6">
              This action cannot be undone. It will permanently delete this user's profile from Firestore, along with their store and all of their products if they exist.
            </p>
            
            <div className="flex items-center justify-end gap-3">
              <button 
                onClick={() => setUserToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 bg-zinc-800 text-zinc-300 border border-zinc-700 rounded-lg hover:bg-zinc-700 transition-colors font-medium text-sm disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteUser}
                disabled={isDeleting}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white border border-red-500 rounded-lg hover:bg-red-500 transition-colors font-medium text-sm disabled:opacity-50"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {isDeleting ? 'Deleting...' : 'Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};