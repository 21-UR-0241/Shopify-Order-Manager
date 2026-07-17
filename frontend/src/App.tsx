// import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
// import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// import LoginPage from './pages/LoginPage';
// import Dashboard from './pages/Dashboard';
// import StoresPage from './pages/StoresPage';
// import OrdersPage from './pages/OrdersPage';
// import OrderDetailsPage from './pages/Orderdetailspage';
// import CreateOrderPage from './pages/CreateOrderPage';  // ← Add this import
// import UserManagementPage from './pages/UserManagementPage';
// import './App.css';
// import SalesPage from './pages/SalesPage';

// const queryClient = new QueryClient({
//   defaultOptions: {
//     queries: {
//       refetchOnWindowFocus: false,
//       retry: 1,
//     },
//   },
// });

// function App() {
//   const isLoggedIn = localStorage.getItem('authToken');
//   const userStr = localStorage.getItem('user');
//   const user = userStr ? JSON.parse(userStr) : null;
//   const isAdmin = user?.role === 'ADMIN';

//   const handleLogout = () => {
//     localStorage.removeItem('authToken');
//     localStorage.removeItem('user');
//     window.location.href = '/';
//   };

//   if (!isLoggedIn) {
//     return (
//       <QueryClientProvider client={queryClient}>
//         <Router>
//           <Routes>
//             <Route path="*" element={<LoginPage />} />
//           </Routes>
//         </Router>
//       </QueryClientProvider>
//     );
//   }

//   return (
//     <QueryClientProvider client={queryClient}>
//       <Router>
//         <div className="app">
//           {/* Header */}
//           <header style={{
//             background: 'white',
//             borderBottom: '1px solid #e5e7eb',
//             padding: '1rem 2rem',
//             position: 'sticky',
//             top: 0,
//             zIndex: 100,
//             boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
//           }}>
//             <div style={{
//               maxWidth: '1400px',
//               margin: '0 auto',
//               display: 'flex',
//               justifyContent: 'space-between',
//               alignItems: 'center'
//             }}>
//               <h1 style={{ 
//                 margin: 0, 
//                 fontSize: '1.5rem',
//                 background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
//                 WebkitBackgroundClip: 'text',
//                 WebkitTextFillColor: 'transparent',
//                 fontWeight: 700
//               }}>
//                 🛍️ Shopify Order Manager
//               </h1>
              
//               <nav style={{ 
//                 display: 'flex', 
//                 alignItems: 'center', 
//                 gap: '0.5rem' 
//               }}>
//                 <NavLink 
//                   to="/" 
//                   end
//                   style={({ isActive }) => ({
//                     padding: '0.5rem 1rem',
//                     borderRadius: '8px',
//                     textDecoration: 'none',
//                     fontWeight: 600,
//                     fontSize: '0.875rem',
//                     background: isActive ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent',
//                     color: isActive ? 'white' : '#6b7280',
//                     transition: 'all 0.2s'
//                   })}
//                 >
//                   🏠 Dashboard
//                 </NavLink>
//                 <NavLink 
//                   to="/stores"
//                   style={({ isActive }) => ({
//                     padding: '0.5rem 1rem',
//                     borderRadius: '8px',
//                     textDecoration: 'none',
//                     fontWeight: 600,
//                     fontSize: '0.875rem',
//                     background: isActive ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent',
//                     color: isActive ? 'white' : '#6b7280',
//                     transition: 'all 0.2s'
//                   })}
//                 >
//                   🏪 Stores
//                 </NavLink>
//                 <NavLink 
//                   to="/orders"
//                   style={({ isActive }) => ({
//                     padding: '0.5rem 1rem',
//                     borderRadius: '8px',
//                     textDecoration: 'none',
//                     fontWeight: 600,
//                     fontSize: '0.875rem',
//                     background: isActive ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent',
//                     color: isActive ? 'white' : '#6b7280',
//                     transition: 'all 0.2s'
//                   })}
//                 >
//                   📦 Orders
//                 </NavLink>
//                 <NavLink
//                   to="/sales"
//                   style={({ isActive }) => ({
//                     padding: '0.5rem 1rem',
//                     borderRadius: '8px',
//                     textDecoration: 'none',
//                     fontWeight: 600,
//                     fontSize: '0.875rem',
//                     background: isActive ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent',
//                     color: isActive ? 'white' : '#6b7280',
//                     transition: 'all 0.2s'
//                   })}
//                 >
//                   📊 Sales
//                 </NavLink>
                
//                 {/* Show Users link only for admins */}
//                 {isAdmin && (
//                   <NavLink 
//                     to="/users"
//                     style={({ isActive }) => ({
//                       padding: '0.5rem 1rem',
//                       borderRadius: '8px',
//                       textDecoration: 'none',
//                       fontWeight: 600,
//                       fontSize: '0.875rem',
//                       background: isActive ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent',
//                       color: isActive ? 'white' : '#6b7280',
//                       transition: 'all 0.2s'
//                     })}
//                   >
//                     👥 Users
//                   </NavLink>
//                 )}
                
//                 <div style={{
//                   marginLeft: '1rem',
//                   paddingLeft: '1rem',
//                   borderLeft: '1px solid #e5e7eb',
//                   display: 'flex',
//                   alignItems: 'center',
//                   gap: '1rem'
//                 }}>
//                   <div style={{ textAlign: 'right' }}>
//                       <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
//                         {user?.userName || user?.email}
//                       </div>
//                     <div style={{ 
//                       fontSize: '0.75rem', 
//                       color: user?.role === 'ADMIN' ? '#f59e0b' : '#6b7280', 
//                       textTransform: 'uppercase',
//                       fontWeight: user?.role === 'ADMIN' ? 600 : 400
//                     }}>
//                       {user?.role === 'ADMIN' ? '👑 ' : ''}{user?.role}
//                     </div>
//                   </div>
//                   <button
//                     onClick={handleLogout}
//                     style={{
//                       padding: '0.5rem 1rem',
//                       background: '#ef4444',
//                       color: 'white',
//                       border: 'none',
//                       borderRadius: '8px',
//                       cursor: 'pointer',
//                       fontSize: '0.875rem',
//                       fontWeight: 600,
//                       transition: 'all 0.2s'
//                     }}
//                     onMouseEnter={(e) => e.currentTarget.style.background = '#dc2626'}
//                     onMouseLeave={(e) => e.currentTarget.style.background = '#ef4444'}
//                   >
//                     🚪 Logout
//                   </button>
//                 </div>
//               </nav>
//             </div>
//           </header>

//           {/* Main Content */}
//           <main style={{ background: '#f3f4f6', minHeight: 'calc(100vh - 73px)' }}>
// <Routes>
//   <Route path="/" element={<Dashboard />} />
//   <Route path="/stores" element={<StoresPage />} />
//   <Route path="/orders" element={<OrdersPage />} />
//   <Route path="/orders/create" element={<CreateOrderPage />} />
//   <Route path="/orders/:storeId/:orderId" element={<OrderDetailsPage />} />
//   <Route path="/sales" element={<SalesPage />} />   {/* ← moved above * */}
//   {isAdmin && <Route path="/users" element={<UserManagementPage />} />}
//   <Route path="*" element={<Dashboard />} />         {/* ← always last */}
// </Routes>
//           </main>
//         </div>
//       </Router>
//     </QueryClientProvider>
//   );
// }

// export default App;


import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import StoresPage from './pages/StoresPage';
import OrdersPage from './pages/OrdersPage';
import OrderDetailsPage from './pages/Orderdetailspage';
import CreateOrderPage from './pages/CreateOrderPage';
import UserManagementPage from './pages/UserManagementPage';
import SalesPage from './pages/SalesPage';
import './App.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
});

// ─── Design tokens ────────────────────────────────────────────────────────
const t = {
  bg:          '#f1f2f4',
  surface:     '#ffffff',
  border:      '#e1e3e5',
  text:        '#202223',
  textSubdued: '#6d7175',
  green:       '#008060',
  greenLight:  '#f1f8f5',
  red:         '#d72c0d',
  radius:      '6px',
};

// ─── SVG icons ────────────────────────────────────────────────────────────
const HomeIcon  = () => <svg width="15" height="15" viewBox="0 0 20 20" fill="none"><path d="M3 9.5L10 3l7 6.5V17a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="M7 18v-6h6v6" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>;
const StoreIcon = () => <svg width="15" height="15" viewBox="0 0 20 20" fill="none"><path d="M3 7h14M3 7l1-4h12l1 4M3 7v10h14V7" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>;
const BoxIcon   = () => <svg width="15" height="15" viewBox="0 0 20 20" fill="none"><path d="M2 7l8-4 8 4v9l-8 4-8-4V7z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="M10 3v13M2 7l8 4 8-4" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>;
const ChartIcon = () => <svg width="15" height="15" viewBox="0 0 20 20" fill="none"><path d="M3 14l4-4 4 3 4-6 3 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/><rect x="2" y="2" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.4"/></svg>;
const UserIcon  = () => <svg width="15" height="15" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="1.4"/><path d="M4 17c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>;
const LogoutIcon= () => <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M13 4h4v12h-4M9 14l4-4-4-4M13 10H4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>;

// ─── Nav item ─────────────────────────────────────────────────────────────
function NavItem({ to, icon, label, end }: { to: string; icon: React.ReactNode; label: string; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      style={({ isActive }) => ({
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '6px 10px', fontSize: 13, fontWeight: isActive ? 600 : 400,
        borderRadius: t.radius, textDecoration: 'none',
        background: isActive ? t.bg : 'transparent',
        color: isActive ? t.text : t.textSubdued,
        transition: 'background .12s, color .12s',
        fontFamily: '"DM Sans","Helvetica Neue",sans-serif',
      })}
      onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; if (!el.getAttribute('aria-current')) el.style.background = t.bg; }}
      onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; if (!el.getAttribute('aria-current')) el.style.background = 'transparent'; }}
    >
      {icon}{label}
    </NavLink>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────
function Header({ user, isAdmin }: { user: any; isAdmin: boolean }) {
  const [hovLogout, setHovLogout] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  return (
    <header style={{
      background: t.surface,
      borderBottom: `1px solid ${t.border}`,
      position: 'sticky', top: 0, zIndex: 100,
      fontFamily: '"DM Sans","Helvetica Neue",sans-serif',
    }}>
      <div style={{
        maxWidth: 1300, margin: '0 auto',
        padding: '0 24px', height: 52,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 6,
            background: t.green, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
              <path d="M10 2L3 7v11h5v-5h4v5h5V7L10 2z" fill="white"/>
            </svg>
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, color: t.text, letterSpacing: '-0.2px' }}>
            Order Manager
          </span>
        </div>

        {/* Nav links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, paddingLeft: 16 }}>
          <NavItem to="/"       icon={<HomeIcon />}  label="Dashboard" end />
          <NavItem to="/stores" icon={<StoreIcon />} label="Stores" />
          <NavItem to="/orders" icon={<BoxIcon />}   label="Orders" />
          <NavItem to="/sales"  icon={<ChartIcon />} label="Sales" />
          {isAdmin && <NavItem to="/users" icon={<UserIcon />} label="Users" />}
        </nav>

        {/* User + logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: t.text, lineHeight: 1.2 }}>
              {user?.userName || user?.email?.split('@')[0] || 'User'}
            </div>
            <div style={{
              fontSize: 11, fontWeight: 500, lineHeight: 1.2,
              color: isAdmin ? '#b98900' : t.textSubdued,
              textTransform: 'uppercase', letterSpacing: '0.04em',
            }}>
              {isAdmin ? '★ Admin' : 'Member'}
            </div>
          </div>

          {/* Avatar */}
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: t.bg, border: `1px solid ${t.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, color: t.textSubdued, flexShrink: 0,
          }}>
            {(user?.userName || user?.email || 'U')[0].toUpperCase()}
          </div>

          <div style={{ width: 1, height: 20, background: t.border }} />

          <button
            onClick={handleLogout}
            onMouseEnter={() => setHovLogout(true)}
            onMouseLeave={() => setHovLogout(false)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '6px 10px', fontSize: 13, fontWeight: 500,
              border: `1px solid ${hovLogout ? t.red : t.border}`,
              borderRadius: t.radius, cursor: 'pointer',
              background: hovLogout ? t.red : t.surface,
              color: hovLogout ? '#fff' : t.textSubdued,
              transition: 'all .15s',
              fontFamily: '"DM Sans",sans-serif',
            }}
          >
            <LogoutIcon />Sign out
          </button>
        </div>
      </div>
    </header>
  );
}

// ─── App shell ────────────────────────────────────────────────────────────
function AppShell() {
  const isLoggedIn = localStorage.getItem('authToken');
  const userStr    = localStorage.getItem('user');
  const user       = userStr ? JSON.parse(userStr) : null;
  const isAdmin    = user?.role === 'ADMIN';

  if (!isLoggedIn) {
    return (
      <Routes>
        <Route path="*" element={<LoginPage />} />
      </Routes>
    );
  }

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <div style={{ minHeight: '100vh', background: t.bg }}>
        <Header user={user} isAdmin={isAdmin} />
        <main>
          <Routes>
            <Route path="/"                        element={<Dashboard />} />
            <Route path="/stores"                  element={<StoresPage />} />
            <Route path="/orders"                  element={<OrdersPage />} />
            <Route path="/orders/create"           element={<CreateOrderPage />} />
            <Route path="/orders/:storeId/:orderId"element={<OrderDetailsPage />} />
            <Route path="/sales"                   element={<SalesPage />} />
            {isAdmin && <Route path="/users"       element={<UserManagementPage />} />}
            <Route path="*"                        element={<Dashboard />} />
          </Routes>
        </main>
      </div>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AppShell />
      </Router>
    </QueryClientProvider>
  );
}

export default App;