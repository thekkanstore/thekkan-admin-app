import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { Login } from './components/Login';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { UsersPage } from './pages/Userspage';
import { CategoriesPage } from './pages/CategoriesPage';
import { StoreDetailsPage } from './pages/StoreDetailsPage';
import type { Store } from './interfaces';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('users');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsLoggedIn(true);
      } else {
        setIsLoggedIn(false);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      setIsLoggedIn(false);
      setCurrentPage('users');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleViewStore = (store: Store) => {
    setSelectedStore(store);
    setCurrentPage('store-details');
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'users':
        return <UsersPage onViewStore={handleViewStore} />;
      case 'categories':
        return <CategoriesPage />;
      case 'store-details':
        return <StoreDetailsPage store={selectedStore} />;
      default:
        return <UsersPage onViewStore={handleViewStore} />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-black">
      <Navbar 
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        onLogout={handleLogout}
      />
      
      <Sidebar 
        isOpen={isSidebarOpen}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        onClose={() => setIsSidebarOpen(false)}
      />

      <main className="pt-16 lg:pl-64 min-h-screen">
        <div className="p-6">
          {renderPage()}
        </div>
      </main>
    </div>
  );
}

export default App;