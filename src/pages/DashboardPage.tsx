import { Users, Home, FolderOpen, LayoutDashboard } from 'lucide-react';

export const DashboardPage = () => {
  const stats = [
    { label: 'Total Users', value: '2,543', change: '+12%', icon: Users },
    { label: 'Active Sessions', value: '1,234', change: '+8%', icon: Home },
    { label: 'Categories', value: '42', change: '+3%', icon: FolderOpen },
    { label: 'Revenue', value: '$12,345', change: '+15%', icon: LayoutDashboard },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Dashboard Overview</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <stat.icon className="w-8 h-8 text-zinc-400" />
              <span className="text-green-400 text-sm font-medium">{stat.change}</span>
            </div>
            <p className="text-zinc-400 text-sm mb-1">{stat.label}</p>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
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
      </div>
    </div>
  );
};
