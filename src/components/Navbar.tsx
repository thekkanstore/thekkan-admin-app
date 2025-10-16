import { Search, Bell, Settings, LogOut, Menu, X } from 'lucide-react';

interface NavbarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  onLogout: () => void;
}

export const Navbar = ({ isSidebarOpen, setIsSidebarOpen, onLogout }: NavbarProps) => {
  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-zinc-900 border-b border-zinc-800 z-40">
      <div className="h-full px-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="lg:hidden text-zinc-400 hover:text-white transition-colors"
          >
            {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <div className="text-xl font-bold text-white">Admin Panel</div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-zinc-700 rounded-full"></div>
            <div className="hidden md:block">
              <p className="text-white text-sm font-medium">Admin User</p>
              <p className="text-zinc-500 text-xs">admin@example.com</p>
            </div>
            <button 
              onClick={onLogout}
              className="text-zinc-400 hover:text-white transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};