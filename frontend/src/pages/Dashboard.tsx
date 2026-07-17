import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { storeAPI, orderAPI } from '../api';

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
}

// ─── Design tokens (matches all other pages) ──────────────────────────────
const t = {
  bg:           '#f1f2f4',
  surface:      '#ffffff',
  border:       '#e1e3e5',
  borderSubdued:'#f1f2f4',
  text:         '#202223',
  textSubdued:  '#6d7175',
  textDisabled: '#8c9196',
  green:        '#008060',
  greenLight:   '#f1f8f5',
  greenBorder:  '#b3dfd4',
  red:          '#d72c0d',
  redLight:     '#fff4f4',
  blue:         '#0070f3',
  blueLight:    '#f0f6ff',
  purple:       '#5c6ac4',
  purpleLight:  '#f4f5fa',
  radius:       '8px',
  radiusSm:     '6px',
};

function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const s = localStorage.getItem('user');
    if (s) setUser(JSON.parse(s));
  }, []);

  const { data: storesData, isLoading: storesLoading } = useQuery({
    queryKey: ['stores'],
    queryFn: async () => (await storeAPI.getAll()).data,
  });

  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => (await orderAPI.getAll()).data,
    enabled: !!storesData?.stores?.length,
  });

  const storesCount = storesData?.stores?.length ?? 0;
  const ordersCount = ordersData?.orders?.length ?? 0;

  // Derived greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const displayName = user?.firstName ?? user?.email?.split('@')[0] ?? 'there';

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>

      <div style={{ background: t.bg, minHeight: '100vh', padding: '28px 24px', fontFamily: '"DM Sans","Helvetica Neue",sans-serif', color: t.text }}>
        <div style={{ maxWidth: 960, margin: '0 auto', animation: 'fadeUp .3s ease' }}>

          {/* ── Page header ── */}
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 650, color: t.text, letterSpacing: '-0.3px' }}>
              {greeting}, {displayName}
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: 14, color: t.textSubdued }}>
              Here's what's happening with your stores today.
            </p>
          </div>

          {/* ── Stat cards ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
            {/* Stores */}
            <StatCard
              label="Active stores"
              value={storesLoading ? null : storesCount}
              accent={t.purple}
              accentLight={t.purpleLight}
              icon={<StoreIcon />}
              sub={storesLoading ? 'Loading…' : storesCount > 0 ? `${storesCount} connected` : 'No stores yet'}
              subOk={storesCount > 0}
              onClick={() => navigate('/stores')}
            />
            {/* Orders */}
            <StatCard
              label="Recent orders"
              value={ordersLoading ? null : ordersCount}
              accent={t.green}
              accentLight={t.greenLight}
              icon={<BoxIcon />}
              sub={ordersLoading ? 'Loading…' : ordersCount > 0 ? 'Click to view all' : 'No orders yet'}
              subOk={ordersCount > 0}
              onClick={() => navigate('/orders')}
            />
            {/* Role */}
            <StatCard
              label="Account type"
              value={null}
              accent={t.blue}
              accentLight={t.blueLight}
              icon={<UserIcon />}
              roleLabel={user?.role}
              sub={user?.email ?? '—'}
            />
          </div>

          {/* ── Quick actions ── */}
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: t.radius, overflow: 'hidden', marginBottom: 12 }}>
            <div style={{ padding: '11px 16px', borderBottom: `1px solid ${t.border}`, background: '#fafbfb' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: t.text }}>Quick actions</span>
            </div>
            <div style={{ padding: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {[
                { label: 'Manage stores',  path: '/stores',        icon: <StoreIcon />,   primary: true  },
                { label: 'View orders',    path: '/orders',        icon: <BoxIcon />,     primary: false },
                { label: 'Create order',   path: '/orders/create', icon: <PlusIcon />,    primary: false },
                { label: 'Sales report',   path: '/sales',         icon: <ChartIcon />,   primary: false },
              ].map(({ label, path, icon, primary }) => (
                <ActionButton key={path} icon={icon} label={label} primary={primary} onClick={() => navigate(path)} />
              ))}
            </div>
          </div>

          {/* ── Footer note ── */}
          <p style={{ fontSize: 12, color: t.textDisabled, textAlign: 'center', margin: 0 }}>
            Shopify Order Manager · {user?.role === 'ADMIN' ? 'Admin access' : 'Standard access'}
          </p>

        </div>
      </div>
    </>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────
function StatCard({ label, value, accent, accentLight, icon, sub, subOk, roleLabel, onClick }: {
  label: string;
  value: number | null;
  accent: string;
  accentLight: string;
  icon: React.ReactNode;
  sub: string;
  subOk?: boolean;
  roleLabel?: string;
  onClick?: () => void;
}) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: t.surface,
        border: `1px solid ${hov && onClick ? accent : t.border}`,
        borderRadius: t.radius,
        padding: '18px 20px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color .15s, box-shadow .15s',
        boxShadow: hov && onClick ? `0 0 0 3px ${accentLight}` : 'none',
        position: 'relative', overflow: 'hidden',
      }}
    >
      {/* Accent strip */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: 3, height: '100%', background: accent, borderRadius: '8px 0 0 8px' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: t.textSubdued }}>{label}</div>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: accentLight, display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent, flexShrink: 0 }}>
          {icon}
        </div>
      </div>

      {roleLabel ? (
        <div style={{ fontSize: 20, fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
          {roleLabel}
        </div>
      ) : value === null ? (
        <div style={{ width: 36, height: 36, border: `3px solid ${accentLight}`, borderTopColor: accent, borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: 4 }} />
      ) : (
        <div style={{ fontSize: 32, fontWeight: 700, color: t.text, lineHeight: 1, marginBottom: 4 }}>
          {value.toLocaleString()}
        </div>
      )}

      <div style={{ fontSize: 12, color: subOk ? t.green : t.textSubdued, fontWeight: subOk ? 500 : 400 }}>
        {subOk && '✓ '}{sub}
      </div>
    </div>
  );
}

// ─── ActionButton ─────────────────────────────────────────────────────────
function ActionButton({ icon, label, primary, onClick }: {
  icon: React.ReactNode; label: string; primary: boolean; onClick: () => void;
}) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 7,
        padding: '8px 16px', fontSize: 13, fontWeight: 500,
        border: primary ? 'none' : `1px solid ${t.border}`,
        borderRadius: t.radiusSm, cursor: 'pointer',
        background: primary ? (hov ? '#3a3d3f' : t.text) : (hov ? t.bg : t.surface),
        color: primary ? '#fff' : t.text,
        transition: 'background .15s',
        fontFamily: '"DM Sans",sans-serif',
      }}
    >
      {icon}{label}
    </button>
  );
}

// ─── SVG icons ────────────────────────────────────────────────────────────
const StoreIcon = () => (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
    <path d="M3 7h14M3 7l1-4h12l1 4M3 7v10h14V7M8 13v-3h4v3" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
  </svg>
);
const BoxIcon = () => (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
    <path d="M2 7l8-4 8 4v9l-8 4-8-4V7z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
    <path d="M10 3v13M2 7l8 4 8-4" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
  </svg>
);
const UserIcon = () => (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
    <circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M4 17c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
);
const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
    <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
);
const ChartIcon = () => (
  <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
    <path d="M3 14l4-4 4 3 4-6 3 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    <rect x="2" y="2" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.4"/>
  </svg>
);

export default Dashboard;