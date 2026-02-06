import { Link, Outlet, useLocation } from '@tanstack/react-router';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function RootLayout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { label: 'Dashboard', href: '/' },
    { label: 'Transactions', href: '/transactions' },
    { label: 'Budgets', href: '/budgets' },
    { label: 'Settings', href: '/settings' },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 md:hidden z-40"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:static w-64 bg-white shadow-lg transform transition-transform duration-300 md:transform-none ${
          isMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } h-full z-50 flex flex-col`}
      >
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold text-primary">Kwartangina</h1>
          <p className="text-sm text-gray-500">Finance Manager</p>
        </div>

        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  to={item.href}
                  className={`block px-4 py-2 rounded-lg transition-colors ${
                    location.pathname === item.href
                      ? 'bg-primary text-white'
                      : 'hover:bg-gray-100'
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t text-sm text-gray-500">
          <p>© 2026 Kwartangina</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white shadow md:hidden">
          <div className="px-4 py-3 flex items-center justify-between">
            <h1 className="text-lg font-bold text-primary">Kwartangina</h1>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
