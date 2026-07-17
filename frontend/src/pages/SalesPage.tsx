import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { salesAPI } from '../api';

// ─── Types ────────────────────────────────────────────────────────────────────
interface StoreSales {
  storeId: string;
  storeName: string;
  shopDomain: string;
  currency: string;
  totalOrders: number;
  totalRevenue: number;
  totalRefunds: number;
  netRevenue: number;
  avgOrderValue: number;
  paidOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
  topProducts: Array<{ title: string; quantity: number; revenue: number }>;
}

interface SalesSummary {
  stores: StoreSales[];
  grandTotal: {
    totalOrders: number;
    totalRevenue: number;
    totalRefunds: number;
    netRevenue: number;
  };
  generatedAt: string;
  dateRange: { from: string; to: string };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(n);

function exportToCSV(data: SalesSummary) {
  const rows: string[][] = [
    ['Sales Report', `Generated: ${new Date(data.generatedAt).toLocaleString()}`],
    ['Date Range', `${data.dateRange.from} to ${data.dateRange.to}`],
    [],
    ['Store Name', 'Domain', 'Currency', 'Total Orders', 'Paid', 'Pending', 'Cancelled',
      'Gross Revenue', 'Refunds', 'Net Revenue', 'Avg Order Value'],
    ...data.stores.map((s) => [
      s.storeName, s.shopDomain, s.currency,
      String(s.totalOrders), String(s.paidOrders), String(s.pendingOrders), String(s.cancelledOrders),
      s.totalRevenue.toFixed(2), s.totalRefunds.toFixed(2), s.netRevenue.toFixed(2), s.avgOrderValue.toFixed(2),
    ]),
    [],
    ['GRAND TOTAL', '', '', String(data.grandTotal.totalOrders), '', '', '',
      data.grandTotal.totalRevenue.toFixed(2), data.grandTotal.totalRefunds.toFixed(2),
      data.grandTotal.netRevenue.toFixed(2), ''],
  ];
  const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sales-report-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── CSS-in-JS tokens (Shopify Admin palette) ────────────────────────────────
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
  radius: '8px',
  radiusSm: '4px',
  shadow: '0 0 0 1px rgba(63,63,68,.05), 0 1px 3px 0 rgba(63,63,68,.15)',
  shadowSubdued: '0 0 0 1px #e1e3e5',
};

const styles: Record<string, React.CSSProperties> = {
  page: { background: t.bg, minHeight: '100vh', padding: '24px', fontFamily: '"DM Sans", "Helvetica Neue", sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap' as const, gap: 12 },
  title: { fontSize: 20, fontWeight: 650, color: t.text, margin: 0, letterSpacing: '-0.3px' },
  subtitle: { fontSize: 13, color: t.textSubdued, margin: '2px 0 0' },
  card: { background: t.surface, borderRadius: t.radius, border: `1px solid ${t.border}`, overflow: 'hidden' },
  cardPadded: { background: t.surface, borderRadius: t.radius, border: `1px solid ${t.border}`, padding: '16px 20px' },
  label: { fontSize: 12, fontWeight: 600, color: t.textSubdued, textTransform: 'uppercase' as const, letterSpacing: '0.06em' },
  metricValue: { fontSize: 26, fontWeight: 700, color: t.text, letterSpacing: '-0.5px', lineHeight: 1.2 },
  btn: {
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px',
    fontSize: 13, fontWeight: 500, borderRadius: t.radiusSm, cursor: 'pointer',
    border: `1px solid ${t.border}`, background: t.surface, color: t.text,
    transition: 'background 0.15s',
  },
  btnPrimary: {
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px',
    fontSize: 13, fontWeight: 500, borderRadius: t.radiusSm, cursor: 'pointer',
    border: '1px solid #006e52', background: t.green, color: '#fff',
    transition: 'background 0.15s',
  },
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
function MetricCard({ label, value, note, accent }: { label: string; value: string; note?: string; accent?: string }) {
  return (
    <div style={{ ...styles.cardPadded, borderTop: `3px solid ${accent ?? t.border}` }}>
      <div style={styles.label}>{label}</div>
      <div style={{ ...styles.metricValue, marginTop: 6 }}>{value}</div>
      {note && <div style={{ fontSize: 12, color: t.textSubdued, marginTop: 4 }}>{note}</div>}
    </div>
  );
}

// ─── Currency Badge ───────────────────────────────────────────────────────────
function CurrencyBadge({ currency }: { currency: string }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '2px 6px', borderRadius: 3,
      background: t.blueLight, color: t.blue, letterSpacing: '0.04em',
    }}>{currency}</span>
  );
}

// ─── Status Pill ──────────────────────────────────────────────────────────────
function StatusPill({ count, label, color, bg }: { count: number; label: string; color: string; bg: string }) {
  if (count === 0) return null;
  return (
    <span style={{ fontSize: 12, fontWeight: 500, padding: '2px 8px', borderRadius: 10, background: bg, color }}>
      {count} {label}
    </span>
  );
}

// ─── Store Row ────────────────────────────────────────────────────────────────
function StoreRow({ s, rank, isLast }: { s: StoreSales; rank: number; isLast: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <tr
        onClick={() => setOpen(p => !p)}
        style={{ cursor: 'pointer', background: open ? '#fafbfb' : 'transparent' }}
        onMouseEnter={(e) => { if (!open) (e.currentTarget as HTMLElement).style.background = '#fafbfb'; }}
        onMouseLeave={(e) => { if (!open) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
      >
        {/* Rank */}
        <td style={{ padding: '12px 16px', width: 40, borderBottom: (!isLast || open) ? `1px solid ${t.borderSubdued}` : 'none' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: rank <= 3 ? t.green : t.textDisabled }}>
            {rank <= 3 ? ['1st', '2nd', '3rd'][rank - 1] : `#${rank}`}
          </span>
        </td>

        {/* Store name */}
        <td style={{ padding: '12px 16px', borderBottom: (!isLast || open) ? `1px solid ${t.borderSubdued}` : 'none' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>{s.storeName}</div>
          <div style={{ fontSize: 12, color: t.textSubdued, marginTop: 1 }}>{s.shopDomain}</div>
        </td>

        {/* Currency */}
        <td style={{ padding: '12px 16px', borderBottom: (!isLast || open) ? `1px solid ${t.borderSubdued}` : 'none' }}>
          <CurrencyBadge currency={s.currency} />
        </td>

        {/* Orders */}
        <td style={{ padding: '12px 16px', textAlign: 'right', borderBottom: (!isLast || open) ? `1px solid ${t.borderSubdued}` : 'none' }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: t.text }}>{s.totalOrders.toLocaleString()}</div>
          <div style={{ display: 'flex', gap: 4, marginTop: 4, justifyContent: 'flex-end', flexWrap: 'wrap' as const }}>
            <StatusPill count={s.paidOrders} label="paid" color={t.green} bg={t.greenLight} />
            <StatusPill count={s.pendingOrders} label="pending" color="#916a00" bg={t.yellowLight} />
            <StatusPill count={s.cancelledOrders} label="cancelled" color={t.red} bg={t.redLight} />
          </div>
        </td>

        {/* Gross */}
        <td style={{ padding: '12px 16px', textAlign: 'right', borderBottom: (!isLast || open) ? `1px solid ${t.borderSubdued}` : 'none' }}>
          <span style={{ fontSize: 14, color: t.text }}>{fmt(s.totalRevenue, s.currency)}</span>
        </td>

        {/* Refunds */}
        <td style={{ padding: '12px 16px', textAlign: 'right', borderBottom: (!isLast || open) ? `1px solid ${t.borderSubdued}` : 'none' }}>
          <span style={{ fontSize: 14, color: s.totalRefunds > 0 ? t.red : t.textDisabled }}>
            {s.totalRefunds > 0 ? `-${fmt(s.totalRefunds, s.currency)}` : '—'}
          </span>
        </td>

        {/* Net */}
        <td style={{ padding: '12px 16px', textAlign: 'right', borderBottom: (!isLast || open) ? `1px solid ${t.borderSubdued}` : 'none' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: s.netRevenue > 0 ? t.green : t.red }}>
            {fmt(s.netRevenue, s.currency)}
          </span>
        </td>

        {/* Avg */}
        <td style={{ padding: '12px 16px', textAlign: 'right', borderBottom: (!isLast || open) ? `1px solid ${t.borderSubdued}` : 'none' }}>
          <span style={{ fontSize: 14, color: t.text }}>{fmt(s.avgOrderValue, s.currency)}</span>
        </td>

        {/* Chevron */}
        <td style={{ padding: '12px 16px', width: 32, borderBottom: (!isLast || open) ? `1px solid ${t.borderSubdued}` : 'none' }}>
          <svg width="16" height="16" viewBox="0 0 20 20" fill={t.textSubdued}
            style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', display: 'block' }}>
            <path d="M5 7l5 5 5-5" stroke={t.textSubdued} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </td>
      </tr>

      {/* Expanded: top products */}
      {open && s.topProducts?.length > 0 && (
        <tr>
          <td colSpan={9} style={{ padding: 0, borderBottom: !isLast ? `1px solid ${t.borderSubdued}` : 'none' }}>
            <div style={{ padding: '12px 16px 16px 72px', background: '#fafbfb' }}>
              <div style={{ ...styles.label, marginBottom: 8 }}>Top Products</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {s.topProducts.map((p, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '7px 0', borderBottom: i < s.topProducts.length - 1 ? `1px solid ${t.borderSubdued}` : 'none',
                  }}>
                    <span style={{ fontSize: 13, color: t.text, maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.title}
                    </span>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: t.textSubdued }}>{p.quantity} sold</span>
                      <span style={{ fontSize: 13, fontWeight: 500, color: t.text }}>{fmt(p.revenue, s.currency)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SalesPage() {
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);
  const toStr = (d: Date) => d.toISOString().slice(0, 10);

  const [dateFrom, setDateFrom] = useState(toStr(thirtyDaysAgo));
  const [dateTo, setDateTo] = useState(toStr(today));
  const [sortBy, setSortBy] = useState<'netRevenue' | 'totalOrders' | 'avgOrderValue'>('netRevenue');
  const [downloading, setDownloading] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery<SalesSummary>({
    queryKey: ['sales', dateFrom, dateTo],
    queryFn: async () => {
      const res = await salesAPI.getSummary({ from: dateFrom, to: dateTo });
      return res.data;
    },
  });

  const handleDownload = useCallback(async () => {
    setDownloading(true);
    try { if (data) exportToCSV(data); }
    finally { setDownloading(false); }
  }, [data]);

  const sortedStores = data?.stores
    ? [...data.stores].sort((a, b) => b[sortBy] - a[sortBy])
    : [];

  const grand = data?.grandTotal;

  return (
    <>
      {/* Load DM Sans */}
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div style={styles.page}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>

          {/* ── Header ── */}
          <div style={styles.header}>
            <div>
              <h2 style={styles.title}>Sales</h2>
              <p style={styles.subtitle}>
                {data ? `${data.dateRange.from} – ${data.dateRange.to}` : 'Revenue across all stores'}
              </p>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' as const }}>
              {/* Date range */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: t.surface, border: `1px solid ${t.border}`,
                borderRadius: t.radiusSm, padding: '6px 12px',
              }}>
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                  <rect x="3" y="4" width="14" height="14" rx="2" stroke={t.textSubdued} strokeWidth="1.5"/>
                  <path d="M3 8h14M7 2v4M13 2v4" stroke={t.textSubdued} strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <input type="date" value={dateFrom} max={dateTo}
                  onChange={(e) => setDateFrom(e.target.value)}
                  style={{ border: 'none', outline: 'none', fontSize: 13, color: t.text, background: 'transparent', cursor: 'pointer' }}
                />
                <span style={{ color: t.textSubdued, fontSize: 13 }}>–</span>
                <input type="date" value={dateTo} min={dateFrom} max={toStr(today)}
                  onChange={(e) => setDateTo(e.target.value)}
                  style={{ border: 'none', outline: 'none', fontSize: 13, color: t.text, background: 'transparent', cursor: 'pointer' }}
                />
              </div>

              <button style={styles.btn} onClick={() => refetch()}
                onMouseEnter={(e) => (e.currentTarget.style.background = t.bg)}
                onMouseLeave={(e) => (e.currentTarget.style.background = t.surface)}>
                <svg width="13" height="13" viewBox="0 0 20 20" fill="none">
                  <path d="M4 10a6 6 0 106-6H7m0 0l3-3M7 4L4 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Refresh
              </button>

              <button
                style={{ ...styles.btnPrimary, opacity: (!data || downloading) ? 0.6 : 1, cursor: (!data || downloading) ? 'not-allowed' : 'pointer' }}
                onClick={handleDownload}
                disabled={!data || downloading}
                onMouseEnter={(e) => { if (data) (e.currentTarget.style.background = '#006e52'); }}
                onMouseLeave={(e) => { if (data) (e.currentTarget.style.background = t.green); }}
              >
                <svg width="13" height="13" viewBox="0 0 20 20" fill="none">
                  <path d="M10 3v10M6 9l4 4 4-4M4 16h12" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {downloading ? 'Exporting…' : 'Export CSV'}
              </button>
            </div>
          </div>

          {/* ── Loading ── */}
          {isLoading && (
            <div style={{ ...styles.card, padding: '60px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: t.textSubdued }}>Loading sales data…</div>
            </div>
          )}

          {/* ── Error ── */}
          {isError && (
            <div style={{ ...styles.card, padding: '60px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: t.red, marginBottom: 8 }}>Failed to load sales data</div>
              <button style={styles.btn} onClick={() => refetch()}>Try again</button>
            </div>
          )}

          {data && (
            <>
              {/* ── Metric Cards ── */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
                <MetricCard label="Net Revenue" value={fmt(grand?.netRevenue ?? 0)} accent={t.green}
                  note={`${(grand?.totalOrders ?? 0).toLocaleString()} orders total`} />
                <MetricCard label="Gross Revenue" value={fmt(grand?.totalRevenue ?? 0)} accent={t.blue} />
                <MetricCard label="Refunds" value={fmt(grand?.totalRefunds ?? 0)} accent={t.red} />
                <MetricCard label="Total Orders" value={(grand?.totalOrders ?? 0).toLocaleString()} accent={t.purple} />
                <MetricCard label="Stores" value={String(data.stores.length)} note="Active" accent={t.yellow} />
              </div>

              {/* ── Table ── */}
              <div style={styles.card}>
                {/* Table header controls */}
                <div style={{
                  padding: '12px 16px', borderBottom: `1px solid ${t.border}`,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
                }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: t.text }}>
                    {sortedStores.length} stores
                  </span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <span style={{ fontSize: 12, color: t.textSubdued, alignSelf: 'center', marginRight: 4 }}>Sort by</span>
                    {(['netRevenue', 'totalOrders', 'avgOrderValue'] as const).map((k) => (
                      <button key={k} onClick={() => setSortBy(k)} style={{
                        padding: '4px 10px', fontSize: 12, fontWeight: 500,
                        border: `1px solid ${sortBy === k ? t.green : t.border}`,
                        borderRadius: t.radiusSm, cursor: 'pointer',
                        background: sortBy === k ? t.greenLight : t.surface,
                        color: sortBy === k ? t.green : t.textSubdued,
                        transition: 'all 0.15s',
                      }}>
                        {k === 'netRevenue' ? 'Revenue' : k === 'totalOrders' ? 'Orders' : 'Avg. Order'}
                      </button>
                    ))}
                  </div>
                </div>

                {sortedStores.length === 0 ? (
                  <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                    <div style={{ fontSize: 13, color: t.textSubdued }}>No sales data found for this date range</div>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' as const }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: '#fafbfb' }}>
                          {['', 'Store', 'Currency', 'Orders', 'Gross Revenue', 'Refunds', 'Net Revenue', 'Avg. Order', ''].map((h, i) => (
                            <th key={i} style={{
                              padding: '9px 16px', textAlign: i >= 4 && i <= 7 ? 'right' : 'left',
                              fontSize: 12, fontWeight: 600, color: t.textSubdued,
                              borderBottom: `1px solid ${t.border}`, whiteSpace: 'nowrap',
                              letterSpacing: '0.02em',
                            }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sortedStores.map((s, i) => (
                          <StoreRow key={s.storeId} s={s} rank={i + 1} isLast={i === sortedStores.length - 1} />
                        ))}
                      </tbody>
                      {/* Grand total footer */}
                      <tfoot>
                        <tr style={{ background: '#fafbfb', borderTop: `2px solid ${t.border}` }}>
                          <td colSpan={3} style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: t.text }}>
                            Total
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: 13, fontWeight: 600, color: t.text }}>
                            {(grand?.totalOrders ?? 0).toLocaleString()}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: 13, fontWeight: 600, color: t.text }}>
                            {fmt(grand?.totalRevenue ?? 0)}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: 13, fontWeight: 600, color: t.red }}>
                            {(grand?.totalRefunds ?? 0) > 0 ? `-${fmt(grand?.totalRefunds ?? 0)}` : '—'}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: 13, fontWeight: 700, color: t.green }}>
                            {fmt(grand?.netRevenue ?? 0)}
                          </td>
                          <td colSpan={2} />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>

              {/* Footer */}
              <p style={{ fontSize: 12, color: t.textDisabled, textAlign: 'center', marginTop: 16 }}>
                Generated {new Date(data.generatedAt).toLocaleString()}
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
}