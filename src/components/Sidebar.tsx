import { Home, FolderOpen } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  currentPage: string;
  onPageChange: (page: string) => void;
  onClose: () => void;
}

export const Sidebar = ({ isOpen, currentPage, onPageChange, onClose }: SidebarProps) => {
  const menuItems = [
    { id: 'users', label: 'Users', icon: Home },
    { id: 'categories', label: 'Categories', icon: FolderOpen },
  ];

  return (
    <>
      <aside className={`fixed left-0 top-16 bottom-0 w-64 bg-zinc-900 border-r border-zinc-800 z-30 transform transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0`}>
        <div className="p-4 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onPageChange(item.id);
                onClose();
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                currentPage === item.id
                  ? 'bg-white text-black'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </aside>

      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={onClose}
        ></div>
      )}
    </>
  );
};
