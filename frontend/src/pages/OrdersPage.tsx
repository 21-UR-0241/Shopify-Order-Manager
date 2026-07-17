

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storeAPI, orderAPI } from '../api';
import { Store, ShopifyOrder, OrdersResponse, OrderFilters } from '../types';
import { format } from 'date-fns';

// ─── Design tokens (matches Shopify Admin) ─────────────────────────────────
const t = {
  bg: '#f1f2f4',
  surface: '#ffffff',
  border: '#e1e3e5',
  borderSubdued: '#f1f2f4',
  text: '#202223',
  textSubdued: '#6d7175',
  textDisabled: '#8c9196',
  green: '#008060',
  greenLight: '#f1f8f5',
  red: '#d72c0d',
  redLight: '#fff4f4',
  yellow: '#ffc453',
  yellowLight: '#fff5ea',
  blue: '#0070f3',
  blueLight: '#f0f6ff',
  purple: '#5c6ac4',
  purpleLight: '#f4f5fa',
  radius: '8px',
  radiusSm: '4px',
};

// ─── Helpers ───────────────────────────────────────────────────────────────
const getOrderEmail = (order: ShopifyOrder): string => {
  const check = (v: any) =>
    v && typeof v === 'string' && v !== 'false' && v !== 'true' && v.trim() !== '';
  if (check(order.email)) return order.email as string;
  if (check(order.customer?.email)) return order.customer!.email as string;
  return '—';
};

// ─── Small UI atoms ────────────────────────────────────────────────────────
function Badge({
  label, color, bg,
}: { label: string; color: string; bg: string }) {
  return (
    <span style={{
      fontSize: 12, fontWeight: 500, padding: '2px 8px',
      borderRadius: 10, background: bg, color,
      whiteSpace: 'nowrap',
    }}>{label}</span>
  );
}

function FinancialBadge({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    paid: [t.green, t.greenLight],
    pending: ['#916a00', t.yellowLight],
    refunded: [t.blue, t.blueLight],
    partially_refunded: ['#916a00', t.yellowLight],
    voided: [t.textSubdued, t.bg],
  };
  const [color, bg] = map[status] ?? [t.textSubdued, t.bg];
  const label = status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return <Badge label={label} color={color} bg={bg} />;
}

function FulfillmentBadge({ status }: { status: string | null }) {
  if (!status || status === 'null') return <Badge label="Unfulfilled" color={t.textSubdued} bg={t.bg} />;
  if (status === 'fulfilled') return <Badge label="Fulfilled" color={t.green} bg={t.greenLight} />;
  if (status === 'partial') return <Badge label="Partial" color={'#916a00'} bg={t.yellowLight} />;
  return <Badge label={status} color={t.textSubdued} bg={t.bg} />;
}

// ─── Tag Modal ─────────────────────────────────────────────────────────────
function TagModal({ count, onConfirm, onClose }: {
  count: number; onConfirm: (v: string) => void; onClose: () => void;
}) {
  const [value, setValue] = useState('');
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
    }} onClick={onClose}>
      <div style={{
        background: t.surface, borderRadius: t.radius, width: 440,
        boxShadow: '0 20px 60px rgba(0,0,0,.15)', border: `1px solid ${t.border}`,
        overflow: 'hidden',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${t.border}` }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: t.text, fontSize: 14 }}>Add tags</div>
          <div style={{ fontSize: 13, color: t.textSubdued, marginTop: 2 }}>
            Tagging {count} selected order{count !== 1 ? 's' : ''}
          </div>
        </div>
        <div style={{ padding: '16px 20px' }}>
          <input autoFocus value={value} onChange={e => setValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && value.trim()) onConfirm(value); if (e.key === 'Escape') onClose(); }}
            placeholder="e.g. urgent, wholesale, priority"
            style={{
              width: '100%', padding: '8px 10px', fontSize: 14,
              border: `1px solid ${t.border}`, borderRadius: t.radiusSm,
              outline: 'none', color: t.text, boxSizing: 'border-box',
            }}
            onFocus={e => (e.target.style.borderColor = t.blue)}
            onBlur={e => (e.target.style.borderColor = t.border)}
          />
          <div style={{ fontSize: 12, color: t.textSubdued, marginTop: 6 }}>
            Separate multiple tags with commas
          </div>
        </div>
        <div style={{
          padding: '12px 20px', borderTop: `1px solid ${t.border}`,
          display: 'flex', justifyContent: 'flex-end', gap: 8, background: '#fafbfb',
        }}>
          <button onClick={onClose} style={{
            padding: '7px 14px', fontSize: 13, fontWeight: 500,
            border: `1px solid ${t.border}`, borderRadius: t.radiusSm,
            background: t.surface, color: t.text, cursor: 'pointer',
          }}>Cancel</button>
          <button disabled={!value.trim()} onClick={() => value.trim() && onConfirm(value)} style={{
            padding: '7px 14px', fontSize: 13, fontWeight: 500,
            border: 'none', borderRadius: t.radiusSm, cursor: value.trim() ? 'pointer' : 'not-allowed',
            background: value.trim() ? t.purple : t.border,
            color: value.trim() ? '#fff' : t.textDisabled,
          }}>Add tags</button>
        </div>
      </div>
    </div>
  );
}

// ─── Toast notification ────────────────────────────────────────────────────
function Toast({ type, title, message, onClose }: {
  type: 'success' | 'error' | 'info'; title: string; message?: string; onClose: () => void;
}) {
  const cfg = {
    success: { color: t.green, bg: t.greenLight, border: '#b3dfd4', icon: '✓' },
    error: { color: t.red, bg: t.redLight, border: '#fdd', icon: '✕' },
    info: { color: t.blue, bg: t.blueLight, border: '#c7dff7', icon: 'i' },
  }[type];

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      background: t.surface, border: `1px solid ${cfg.border}`,
      borderLeft: `4px solid ${cfg.color}`, borderRadius: t.radius,
      padding: '12px 16px', maxWidth: 360,
      boxShadow: '0 4px 24px rgba(0,0,0,.12)',
      display: 'flex', alignItems: 'flex-start', gap: 10,
    }}>
      <span style={{
        width: 20, height: 20, borderRadius: '50%', background: cfg.bg,
        color: cfg.color, fontSize: 11, fontWeight: 800,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
      }}>{cfg.icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>{title}</div>
        {message && <div style={{ fontSize: 12, color: t.textSubdued, marginTop: 2 }}>{message}</div>}
      </div>
      <button onClick={onClose} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: t.textDisabled, fontSize: 16, lineHeight: 1, padding: 0,
      }}>×</button>
    </div>
  );
}

// ─── Select / Filter components ─────────────────────────────────────────────
function SelectField({ label, value, onChange, children }: {
  label: string; value: string; onChange: (v: string) => void; children: React.ReactNode;
}) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: t.textSubdued, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </label>
      <select value={value} onChange={e => onChange(e.target.value)} style={{
        padding: '8px 30px 8px 12px', fontSize: 14, color: t.text,
        border: `1px solid ${t.border}`, borderRadius: t.radiusSm,
        background: `${t.surface} url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%236d7175'/%3E%3C/svg%3E") no-repeat right 10px center`,
        appearance: 'none', cursor: 'pointer', outline: 'none', minWidth: 140,
      }}>
        {children}
      </select>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────
function OrdersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedStore, setSelectedStore] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<OrderFilters>({ status: 'any', limit: 50 });
  const [pageInfo, setPageInfo] = useState<string | undefined>(undefined);
  const [pageHistory, setPageHistory] = useState<string[]>([]);
  const [selectedOrders, setSelectedOrders] = useState<Array<{ storeId: string; orderId: string }>>([]);
  const [showTagModal, setShowTagModal] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; title: string; message?: string } | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', title: string, message?: string) => {
    setToast({ type, title, message });
    setTimeout(() => setToast(null), 5000);
  };

  // ── Stores ──
  const { data: storesData, isLoading: storesLoading } = useQuery({
    queryKey: ['stores'],
    queryFn: async () => (await storeAPI.getAll()).data,
  });
  const stores: Store[] = storesData?.stores ?? [];

  // ── Orders ──
  const { data: ordersData, isLoading: ordersLoading, error: ordersError, refetch } = useQuery({
    queryKey: ['orders', selectedStore, filters, pageInfo],
    queryFn: async () => {
      const qf = { ...filters, page_info: pageInfo };
      if (selectedStore === 'all') {
        const res = await orderAPI.getAllStores(qf);
        const d = res.data;

        // DEBUG: remove after confirming shape
        console.log('[getAllStores] raw response keys:', Object.keys(d ?? {}));
        console.log('[getAllStores] isArray:', Array.isArray(d));
        if (Array.isArray(d) && d.length > 0) console.log('[getAllStores] first item keys:', Object.keys(d[0] ?? {}));

        // Handle every known backend shape
        let normalised: any[] = [];
        if (Array.isArray(d)) {
          normalised = d;
        } else if (Array.isArray(d?.stores)) {
          normalised = d.stores;
        } else if (Array.isArray(d?.results)) {
          normalised = d.results;
        } else if (d?.storeId || d?.orders) {
          normalised = [d];
        }

        // Ensure each entry has the expected shape
        return normalised.map((entry: any) => ({
          storeId:   entry.storeId   ?? entry.id   ?? '',
          storeName: entry.storeName ?? entry.name ?? 'Unknown',
          orders:    entry.orders    ?? entry.data ?? [],
          pageInfo:  entry.pageInfo  ?? entry.pagination ?? null,
          success:   true,
        }));
      } else {
        const res = await orderAPI.getFromStore(selectedStore, qf);
        const d = res.data;
        return [{
          storeId:   d.storeId   ?? d.id   ?? selectedStore,
          storeName: d.storeName ?? d.name ?? 'Store',
          orders:    d.orders    ?? d.data ?? [],
          pageInfo:  d.pageInfo  ?? null,
          success:   true,
        }];
      }
    },
    enabled: stores.length > 0,
  });

  // ── Mutations ──
  const bulkTagMutation = useMutation({
    mutationFn: ({ storeId, orderIds, tags }: { storeId: string; orderIds: string[]; tags: string }) =>
      orderAPI.bulkTag(storeId, orderIds, tags).then(r => r.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      showToast('success', 'Tags added', `${data.summary?.successful ?? '?'} order(s) tagged`);
      setSelectedOrders([]);
    },
    onError: (e: any) => showToast('error', 'Tagging failed', e.response?.data?.error ?? e.message),
  });

  const bulkExportMutation = useMutation({
    mutationFn: ({ storeId, orderIds }: { storeId: string; orderIds: string[] }) =>
      orderAPI.exportCSV(storeId, orderIds).then(r => r.data),
    onSuccess: (data) => {
      const blob = new Blob([data.csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement('a'), { href: url, download: data.filename });
      a.click(); URL.revokeObjectURL(url);
      showToast('success', 'Export ready', `${data.count} order(s) downloaded`);
      setSelectedOrders([]);
    },
    onError: (e: any) => showToast('error', 'Export failed', e.response?.data?.error ?? e.message),
  });

  // ── Flatten orders ──
  const allOrders: Array<{ storeId: string; storeName: string; order: ShopifyOrder }> = [];
  (ordersData ?? []).forEach((storeOrders: any) => {
    const sid  = storeOrders?.storeId   ?? storeOrders?.id   ?? '';
    const name = storeOrders?.storeName ?? storeOrders?.name ?? 'Unknown Store';
    const orders: any[] = Array.isArray(storeOrders?.orders) ? storeOrders.orders
                        : Array.isArray(storeOrders?.data)   ? storeOrders.data
                        : [];
    orders.forEach((order: ShopifyOrder) => allOrders.push({ storeId: sid, storeName: name, order }));
  });

  const filteredOrders = searchQuery.trim()
    ? allOrders.filter(({ storeName, order }) => {
        const q = searchQuery.toLowerCase();
        return (
          order.name?.toLowerCase().includes(q) ||
          `${order.customer?.first_name ?? ''} ${order.customer?.last_name ?? ''}`.toLowerCase().includes(q) ||
          getOrderEmail(order).toLowerCase().includes(q) ||
          storeName.toLowerCase().includes(q) ||
          (order.tags ?? '').toLowerCase().includes(q)
        );
      })
    : allOrders;

  // ── Selection ──
  const toggleSelect = (storeId: string, orderId: string) =>
    setSelectedOrders(prev =>
      prev.some(o => o.storeId === storeId && o.orderId === orderId)
        ? prev.filter(o => !(o.storeId === storeId && o.orderId === orderId))
        : [...prev, { storeId, orderId }]
    );

  const toggleSelectAll = () =>
    setSelectedOrders(
      selectedOrders.length === filteredOrders.length
        ? []
        : filteredOrders.map(({ storeId, order }) => ({ storeId, orderId: order.id.toString() }))
    );

  const handleBulkTag = (tags: string) => {
    const byStore: Record<string, string[]> = {};
    selectedOrders.forEach(({ storeId, orderId }) => {
      (byStore[storeId] ??= []).push(orderId);
    });
    Object.entries(byStore).forEach(([storeId, orderIds]) =>
      bulkTagMutation.mutate({ storeId, orderIds, tags })
    );
    setShowTagModal(false);
  };

  const handleBulkExport = () => {
    const byStore: Record<string, string[]> = {};
    selectedOrders.forEach(({ storeId, orderId }) => {
      (byStore[storeId] ??= []).push(orderId);
    });
    Object.entries(byStore).forEach(([storeId, orderIds]) =>
      bulkExportMutation.mutate({ storeId, orderIds })
    );
  };

  const resetPagination = () => { setPageInfo(undefined); setPageHistory([]); };

  // ── Loading / error states ──
  if (storesLoading) return (
    <div style={{ padding: 40, textAlign: 'center', color: t.textSubdued, fontFamily: '"DM Sans", sans-serif', fontSize: 13 }}>
      Loading stores…
    </div>
  );

  if (!stores.length) return (
    <div style={{ padding: 60, textAlign: 'center', fontFamily: '"DM Sans", sans-serif' }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>🏪</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: t.text, marginBottom: 4 }}>No stores connected</div>
      <div style={{ fontSize: 13, color: t.textSubdued }}>Connect a Shopify store to view orders.</div>
    </div>
  );

  const pageNum = pageHistory.length + 1;
  const hasNext = ordersData?.[0]?.pageInfo?.hasNext;

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Toast */}
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Tag modal */}
      {showTagModal && (
        <TagModal count={selectedOrders.length} onConfirm={handleBulkTag} onClose={() => setShowTagModal(false)} />
      )}

      <div style={{ background: t.bg, minHeight: '100vh', padding: 24, fontFamily: '"DM Sans", "Helvetica Neue", sans-serif' }}>
        <div style={{ maxWidth: 1300, margin: '0 auto' }}>

          {/* ── Page header ── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 650, color: t.text, letterSpacing: '-0.3px' }}>Orders</h2>
              <p style={{ margin: '2px 0 0', fontSize: 14, color: t.textSubdued }}>
                {ordersLoading ? 'Loading…' : `${filteredOrders.length} order${filteredOrders.length !== 1 ? 's' : ''}`}
              </p>
            </div>
            <button
              onClick={() => navigate('/orders/create')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '9px 18px', fontSize: 14, fontWeight: 600,
                background: t.text, color: '#fff', border: 'none',
                borderRadius: t.radiusSm, cursor: 'pointer',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#3a3d3f')}
              onMouseLeave={e => (e.currentTarget.style.background = t.text)}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 1v10M1 6h10" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              Create order
            </button>
          </div>

          {/* ── Filter bar ── */}
          <div style={{
            background: t.surface, borderRadius: t.radius,
            border: `1px solid ${t.border}`, marginBottom: 12,
            overflow: 'hidden',
          }}>
            {/* Search */}
            <div style={{ padding: '12px 16px', borderBottom: `1px solid ${t.border}` }}>
              <div style={{ position: 'relative', maxWidth: 520 }}>
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none"
                  style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                  <circle cx="9" cy="9" r="6" stroke={t.textSubdued} strokeWidth="1.5"/>
                  <path d="M13.5 13.5L17 17" stroke={t.textSubdued} strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search orders, customers, tags…"
                  style={{
                    width: '100%', padding: '9px 32px 9px 32px', fontSize: 14,
                    border: `1px solid ${t.border}`, borderRadius: t.radiusSm,
                    outline: 'none', color: t.text, background: t.surface,
                    boxSizing: 'border-box',
                  }}
                  onFocus={e => (e.target.style.borderColor = t.blue)}
                  onBlur={e => (e.target.style.borderColor = t.border)}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} style={{
                    position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: t.textSubdued, fontSize: 16, lineHeight: 1, padding: 0,
                  }}>×</button>
                )}
              </div>
            </div>

            {/* Filters row */}
            <div style={{ padding: '12px 16px', display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' as const }}>
              <SelectField label="Store" value={selectedStore} onChange={v => { setSelectedStore(v); resetPagination(); setSelectedOrders([]); }}>
                <option value="all">All stores</option>
                {stores.map((s: Store) => <option key={s.id} value={s.id}>{s.storeName}</option>)}
              </SelectField>

              <SelectField label="Status" value={filters.status ?? 'any'} onChange={v => { setFilters(f => ({ ...f, status: v as any })); resetPagination(); }}>
                <option value="any">Any</option>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
                <option value="cancelled">Cancelled</option>
              </SelectField>

              <SelectField label="Payment" value={filters.financial_status ?? ''} onChange={v => { setFilters(f => ({ ...f, financial_status: v || undefined })); resetPagination(); }}>
                <option value="">Any</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="refunded">Refunded</option>
              </SelectField>

              <SelectField label="Fulfillment" value={filters.fulfillment_status ?? ''} onChange={v => { setFilters(f => ({ ...f, fulfillment_status: v || undefined })); resetPagination(); }}>
                <option value="">Any</option>
                <option value="fulfilled">Fulfilled</option>
                <option value="partial">Partial</option>
                <option value="null">Unfulfilled</option>
              </SelectField>

              <button onClick={() => { resetPagination(); refetch(); setSelectedOrders([]); }}
                style={{
                  padding: '7px 14px', fontSize: 13, fontWeight: 500,
                  border: `1px solid ${t.border}`, borderRadius: t.radiusSm,
                  background: t.surface, color: t.text, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 20,
                }}
                onMouseEnter={e => (e.currentTarget.style.background = t.bg)}
                onMouseLeave={e => (e.currentTarget.style.background = t.surface)}
              >
                <svg width="13" height="13" viewBox="0 0 20 20" fill="none">
                  <path d="M4 10a6 6 0 106-6H7m0 0l3-3M7 4L4 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Refresh
              </button>
            </div>
          </div>

          {/* ── Bulk actions bar ── */}
          {selectedOrders.length > 0 && (
            <div style={{
              background: t.purpleLight, border: `1px solid #c9cfe4`,
              borderRadius: t.radius, padding: '10px 16px', marginBottom: 12,
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: t.purple }}>
                {selectedOrders.length} selected
              </span>
              <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
                <button onClick={() => setShowTagModal(true)} disabled={bulkTagMutation.isPending}
                  style={{
                    padding: '7px 14px', fontSize: 13, fontWeight: 500,
                    border: `1px solid #c9cfe4`, borderRadius: t.radiusSm,
                    background: t.purple, color: '#fff', cursor: 'pointer',
                  }}>
                  {bulkTagMutation.isPending ? 'Tagging…' : 'Add tags'}
                </button>
                <button onClick={handleBulkExport} disabled={bulkExportMutation.isPending}
                  style={{
                    padding: '7px 14px', fontSize: 13, fontWeight: 500,
                    border: `1px solid ${t.border}`, borderRadius: t.radiusSm,
                    background: t.surface, color: t.text, cursor: 'pointer',
                  }}>
                  {bulkExportMutation.isPending ? 'Exporting…' : 'Export CSV'}
                </button>
                <button onClick={() => setSelectedOrders([])}
                  style={{
                    padding: '7px 14px', fontSize: 13, fontWeight: 500,
                    border: `1px solid ${t.border}`, borderRadius: t.radiusSm,
                    background: 'none', color: t.textSubdued, cursor: 'pointer',
                  }}>
                  Deselect
                </button>
              </div>
            </div>
          )}

          {/* ── Table card ── */}
          <div style={{ background: t.surface, borderRadius: t.radius, border: `1px solid ${t.border}`, overflow: 'hidden' }}>
            {ordersLoading ? (
              <div style={{ padding: '60px 24px', textAlign: 'center', fontSize: 14, color: t.textSubdued }}>
                Loading orders…
              </div>
            ) : ordersError ? (
              <div style={{ padding: '60px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: t.red, marginBottom: 8 }}>Failed to load orders</div>
                <button onClick={() => refetch()} style={{
                  padding: '7px 14px', fontSize: 13, border: `1px solid ${t.border}`,
                  borderRadius: t.radiusSm, background: t.surface, cursor: 'pointer',
                }}>Try again</button>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div style={{ padding: '60px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>{searchQuery ? '🔍' : '📦'}</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: t.text, marginBottom: 4 }}>
                  {searchQuery ? 'No orders match your search' : 'No orders found'}
                </div>
                <div style={{ fontSize: 13, color: t.textSubdued }}>
                  {searchQuery ? 'Try different search terms or clear your filters.' : 'Orders will appear here when they come in.'}
                </div>
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} style={{
                    marginTop: 16, padding: '7px 14px', fontSize: 13,
                    border: `1px solid ${t.border}`, borderRadius: t.radiusSm,
                    background: t.surface, cursor: 'pointer', color: t.text,
                  }}>Clear search</button>
                )}
              </div>
            ) : (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#fafbfb' }}>
                        <th style={{ padding: '9px 16px', width: 40, borderBottom: `1px solid ${t.border}` }}>
                          <input type="checkbox"
                            checked={selectedOrders.length === filteredOrders.length && filteredOrders.length > 0}
                            ref={el => { if (el) el.indeterminate = selectedOrders.length > 0 && selectedOrders.length < filteredOrders.length; }}
                            onChange={toggleSelectAll}
                            style={{ cursor: 'pointer', accentColor: t.purple }}
                          />
                        </th>
                        {['Order', 'Date', 'Customer', 'Total', 'Payment', 'Fulfillment', 'Store', ''].map((h, i) => (
                          <th key={i} style={{
                            padding: '9px 12px', textAlign: 'left',
                            fontSize: 13, fontWeight: 600, color: t.textSubdued,
                            borderBottom: `1px solid ${t.border}`,
                            letterSpacing: '0.02em', whiteSpace: 'nowrap',
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map(({ storeId, storeName, order }, idx) => {
                        const isSelected = selectedOrders.some(o => o.storeId === storeId && o.orderId === order.id.toString());
                        const isLast = idx === filteredOrders.length - 1;
                        return (
                          <tr key={`${storeId}-${order.id}`}
                            style={{ background: isSelected ? '#faf8ff' : 'transparent' }}
                            onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = '#fafbfb'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isSelected ? '#faf8ff' : 'transparent'; }}
                          >
                            {/* Checkbox */}
                            <td style={{ padding: '10px 16px', borderBottom: isLast ? 'none' : `1px solid ${t.borderSubdued}`, width: 40 }}>
                              <input type="checkbox" checked={isSelected}
                                onChange={() => toggleSelect(storeId, order.id.toString())}
                                style={{ cursor: 'pointer', accentColor: t.purple }}
                              />
                            </td>
                            {/* Order # */}
                            <td style={{ padding: '10px 12px', borderBottom: isLast ? 'none' : `1px solid ${t.borderSubdued}`, whiteSpace: 'nowrap' }}>
                              <span style={{ fontWeight: 600, color: t.blue, fontSize: 14 }}>{order.name}</span>
                            </td>
                            {/* Date */}
                            <td style={{ padding: '12px 12px', borderBottom: isLast ? 'none' : `1px solid ${t.borderSubdued}`, color: t.textSubdued, whiteSpace: 'nowrap' }}>
                              {format(new Date(order.created_at), 'MMM d, yyyy')}
                            </td>
                            {/* Customer */}
                            <td style={{ padding: '10px 12px', borderBottom: isLast ? 'none' : `1px solid ${t.borderSubdued}` }}>
                              <div style={{ fontWeight: 500, color: t.text, fontSize: 14 }}>
                                {order.customer?.first_name || order.customer?.last_name
                                  ? `${order.customer?.first_name ?? ''} ${order.customer?.last_name ?? ''}`.trim()
                                  : '—'}
                              </div>
                              <div style={{ fontSize: 13, color: t.textSubdued }}>{getOrderEmail(order)}</div>
                            </td>
                            {/* Total */}
                            <td style={{ padding: '10px 12px', borderBottom: isLast ? 'none' : `1px solid ${t.borderSubdued}`, whiteSpace: 'nowrap' }}>
                              <span style={{ fontWeight: 600, color: t.text }}>{order.currency} {order.total_price}</span>
                            </td>
                            {/* Payment */}
                            <td style={{ padding: '10px 12px', borderBottom: isLast ? 'none' : `1px solid ${t.borderSubdued}` }}>
                              <FinancialBadge status={order.financial_status} />
                            </td>
                            {/* Fulfillment */}
                            <td style={{ padding: '10px 12px', borderBottom: isLast ? 'none' : `1px solid ${t.borderSubdued}` }}>
                              <FulfillmentBadge status={order.fulfillment_status} />
                            </td>
                            {/* Store */}
                            <td style={{ padding: '10px 12px', borderBottom: isLast ? 'none' : `1px solid ${t.borderSubdued}`, color: t.textSubdued, fontSize: 13, whiteSpace: 'nowrap' }}>
                              {storeName}
                            </td>
                            {/* Action */}
                            <td style={{ padding: '10px 12px', borderBottom: isLast ? 'none' : `1px solid ${t.borderSubdued}`, textAlign: 'right' }}>
                              <button
                                onClick={() => {
                                console.log('[view order] storeId:', storeId, 'orderId:', order.id, 'storeName:', storeName);
                                if (!storeId) {
                                  alert('Error: missing storeId for this order. Check console.');
                                  return;
                                }
                                navigate(`/orders/${storeId}/${order.id}`);
                              }}
                                style={{
                                  padding: '6px 14px', fontSize: 13, fontWeight: 500,
                                  border: `1px solid ${t.border}`, borderRadius: t.radiusSm,
                                  background: t.surface, color: t.text, cursor: 'pointer',
                                }}
                                onMouseEnter={e => (e.currentTarget.style.background = t.bg)}
                                onMouseLeave={e => (e.currentTarget.style.background = t.surface)}
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {!searchQuery && ordersData?.[0]?.pageInfo && (
                  <div style={{
                    padding: '12px 16px', borderTop: `1px solid ${t.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: '#fafbfb',
                  }}>
                    <span style={{ fontSize: 14, color: t.textSubdued }}>Page {pageNum}</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button disabled={pageHistory.length === 0}
                        onClick={() => {
                          const prev = pageHistory[pageHistory.length - 1];
                          setPageHistory(h => h.slice(0, -1));
                          setPageInfo(prev || undefined);
                        }}
                        style={{
                          padding: '6px 14px', fontSize: 13, fontWeight: 500,
                          border: `1px solid ${t.border}`, borderRadius: t.radiusSm,
                          background: pageHistory.length === 0 ? t.bg : t.surface,
                          color: pageHistory.length === 0 ? t.textDisabled : t.text,
                          cursor: pageHistory.length === 0 ? 'not-allowed' : 'pointer',
                        }}>← Previous</button>
                      <button disabled={!hasNext}
                        onClick={() => {
                          const next = ordersData?.[0]?.pageInfo?.nextPageInfo;
                          if (next) { setPageHistory(h => [...h, pageInfo ?? '']); setPageInfo(next); }
                        }}
                        style={{
                          padding: '6px 14px', fontSize: 13, fontWeight: 500,
                          border: `1px solid ${t.border}`, borderRadius: t.radiusSm,
                          background: !hasNext ? t.bg : t.surface,
                          color: !hasNext ? t.textDisabled : t.text,
                          cursor: !hasNext ? 'not-allowed' : 'pointer',
                        }}>Next →</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default OrdersPage;