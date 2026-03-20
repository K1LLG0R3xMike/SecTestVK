import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Layout = ({ children }) => {
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: 'dashboard' },
    { name: 'Projects', path: '/projects', icon: 'folder_open' },
    { name: 'Scans', path: '/scans', icon: 'radar' },
    { name: 'Findings', path: '/findings', icon: 'security' },
    { name: 'Reports', path: '/reports', icon: 'assessment' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-background text-on-surface font-body">
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-4 h-16 bg-[#0c0e16] border-b border-outline-variant/10">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary">terminal</span>
          <h1 className="font-headline tracking-tight text-xl font-bold text-primary tracking-widest uppercase">SecTest VK</h1>
        </div>
        <div className="hidden md:flex items-center gap-8">
          <nav className="flex gap-6 font-label text-xs uppercase tracking-widest">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`${
                  isActive(item.path)
                    ? 'text-primary border-b-2 border-primary pb-1'
                    : 'text-on-surface/60 hover:text-primary transition-colors'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>
          <button className="bg-primary text-on-primary px-4 py-2 rounded-md font-medium text-sm active:scale-95 duration-200 transition-colors">
            Quick Scan
          </button>
        </div>
        <div className="md:hidden">
          <span className="material-symbols-outlined text-primary">menu</span>
        </div>
      </header>

      <div className="flex pt-16">
        {/* NavigationDrawer (Sidebar Desktop) */}
        <aside className="hidden md:flex flex-col py-6 px-4 h-[calc(100vh-64px)] w-80 bg-[#11131c] fixed left-0 top-16 border-r border-outline-variant/10">
          <div className="flex items-center gap-4 mb-10 px-2">
            <div className="w-12 h-12 rounded-full bg-surface-container-highest flex items-center justify-center overflow-hidden border border-outline-variant/20">
              <img 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuC_COeN5jp7qcIZ_9jszUnspRrBdg0Gx_noXhAA6DUkWoko3tU5J8Te6FpZ_scWOrfYOSSXqNsPl4ZPj_4EA3qcTmxX71-qu6BdXiyvTYSseaXAMqndfQdfEu_okI2l-u-aIY5U1LBdjWLm1IxoINOLF03Cm11GzQSEV0WHYfPBL_YniTYGQmWtvP5BZC8DXE-sbCiCOsg1Yte8-LYjLs8O0MzNjBrp-yYDPdtcaDJ-kXVqT-D4w0svwHJucraMLAES6XH-Kg5i8TA" 
                alt="User" 
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <p className="font-headline font-bold text-primary text-sm">Security Analyst</p>
              <p className="text-xs text-on-surface-variant">active_scans: 3</p>
            </div>
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-label text-sm ${
                  isActive(item.path)
                    ? 'text-primary bg-surface-container-high font-semibold shadow-lg shadow-primary/5'
                    : 'text-on-surface/70 hover:bg-surface-container-high'
                }`}
              >
                <span className={`material-symbols-outlined ${isActive(item.path) ? 'fill-1' : ''}`}>
                  {item.icon}
                </span>
                <span>{item.name}</span>
              </Link>
            ))}
          </nav>
          <div className="mt-auto px-4">
            <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-mono">v1.0.4</p>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 md:ml-80 min-h-[calc(100vh-64px)] overflow-y-auto">
          {children}
        </main>
      </div>

      {/* BottomNavBar (Mobile Only) */}
      <nav className="md:hidden fixed bottom-0 w-full z-50 flex justify-around items-center px-2 pb-safe h-20 bg-[#0c0e16]/80 backdrop-blur-xl border-t border-primary/10">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center justify-center transition-all ${
              isActive(item.path)
                ? 'text-primary font-bold bg-primary/10 rounded-xl px-3 py-1'
                : 'text-on-surface/50'
            }`}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span className="font-body text-[10px] uppercase tracking-widest mt-1">{item.name}</span>
          </Link>
        ))}
      </nav>

      {/* FAB */}
      <button className="fixed bottom-24 right-6 md:bottom-8 md:right-8 w-14 h-14 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-2xl shadow-primary/40 hover:scale-110 active:scale-95 transition-all z-40">
        <span className="material-symbols-outlined text-3xl">add</span>
      </button>
    </div>
  );
};

export default Layout;
