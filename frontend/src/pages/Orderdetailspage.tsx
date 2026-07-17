




import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storeAPI, orderAPI } from '../api';
import { ShopifyOrder } from '../types';
import { format } from 'date-fns';

// ─── Design tokens (shared with OrdersPage / SalesPage) ───────────────────
const t = {
  bg: '#f1f2f4',
  surface: '#ffffff',
  border: '#e1e3e5',
  borderSubdued: '#f1f2f4',
  text: '#202223',
  textSubdued: '#6d7175',
  textDisabled: '#8c9196',
  green: '#008060',     greenLight: '#f1f8f5',  greenBorder: '#b3dfd4',
  red: '#d72c0d',       redLight: '#fff4f4',    redBorder: '#fecaca',
  yellow: '#b98900',    yellowLight: '#fff5ea', yellowBorder: '#ffc453',
  blue: '#0070f3',      blueLight: '#f0f6ff',   blueBorder: '#c7dff7',
  purple: '#5c6ac4',    purpleLight: '#f4f5fa', purpleBorder: '#c9cfe4',
  radius: '8px',
  radiusSm: '6px',
};

// ─── Shared primitives ────────────────────────────────────────────────────
const base: React.CSSProperties = {
  fontFamily: '"DM Sans","Helvetica Neue",sans-serif',
  fontSize: 14,
  color: t.text,
  lineHeight: 1.5,
};

const btn = (variant: 'default'|'primary'|'green'|'red'|'yellow' = 'default', extra?: React.CSSProperties): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
  border: 'none', borderRadius: t.radiusSm, transition: 'filter .15s',
  fontFamily: '"DM Sans",sans-serif',
  background: variant === 'default' ? t.surface : variant === 'primary' ? t.text : variant === 'green' ? t.green : variant === 'red' ? t.red : '#f59e0b',
  color: variant === 'default' ? t.text : '#fff',
  ...(variant === 'default' ? { border: `1px solid ${t.border}` } : {}),
  ...extra,
});

const inp: React.CSSProperties = {
  width: '100%', padding: '8px 10px', fontSize: 14, color: t.text,
  border: `1px solid ${t.border}`, borderRadius: t.radiusSm,
  background: t.surface, outline: 'none', boxSizing: 'border-box',
  fontFamily: '"DM Sans",sans-serif', transition: 'border-color .15s',
};

const focus = (e: React.FocusEvent<any>) => (e.target.style.borderColor = t.blue);
const blur  = (e: React.FocusEvent<any>) => (e.target.style.borderColor = t.border);

// ─── Badge ────────────────────────────────────────────────────────────────
function Badge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span style={{ fontSize: 12, fontWeight: 500, padding: '2px 9px', borderRadius: 10, background: bg, color, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  );
}
function FinancialBadge({ status }: { status: string }) {
  const m: Record<string, [string, string]> = {
    paid:                [t.green,  t.greenLight],
    pending:             [t.yellow, t.yellowLight],
    refunded:            [t.blue,   t.blueLight],
    partially_refunded:  [t.yellow, t.yellowLight],
    voided:              [t.textSubdued, t.bg],
  };
  const [c, bg] = m[status] ?? [t.textSubdued, t.bg];
  return <Badge label={status.replace(/_/g,' ').replace(/\b\w/g,x=>x.toUpperCase())} color={c} bg={bg} />;
}
function FulfillBadge({ status }: { status: string|null }) {
  if (!status) return <Badge label="Unfulfilled" color={t.textSubdued} bg={t.bg} />;
  if (status === 'fulfilled') return <Badge label="Fulfilled" color={t.green} bg={t.greenLight} />;
  if (status === 'partial')   return <Badge label="Partial"   color={t.yellow} bg={t.yellowLight} />;
  return <Badge label={status} color={t.textSubdued} bg={t.bg} />;
}

// ─── Toast ────────────────────────────────────────────────────────────────
function Toast({ type, title, message, onClose }: {
  type: 'success'|'error'|'warning'|'info'; title: string; message?: string; onClose: () => void;
}) {
  const cfg = {
    success: { accent: t.green,  bg: t.greenLight,  border: t.greenBorder,  dot: '✓' },
    error:   { accent: t.red,    bg: t.redLight,    border: t.redBorder,    dot: '✕' },
    warning: { accent: t.yellow, bg: t.yellowLight, border: t.yellowBorder, dot: '!' },
    info:    { accent: t.blue,   bg: t.blueLight,   border: t.blueBorder,   dot: 'i' },
  }[type];
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      background: t.surface, borderLeft: `4px solid ${cfg.accent}`,
      border: `1px solid ${cfg.border}`, borderRadius: t.radius,
      padding: '14px 18px', maxWidth: 380, minWidth: 280,
      boxShadow: '0 6px 30px rgba(0,0,0,.13)',
      display: 'flex', alignItems: 'flex-start', gap: 12,
      animation: 'slideToast .25s ease',
      fontFamily: '"DM Sans",sans-serif',
    }}>
      <style>{`@keyframes slideToast{from{transform:translateX(40px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
      <span style={{
        width: 22, height: 22, borderRadius: '50%', background: cfg.bg,
        color: cfg.accent, fontSize: 11, fontWeight: 800, flexShrink: 0, marginTop: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>{cfg.dot}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{title}</div>
        {message && <div style={{ fontSize: 12, color: t.textSubdued, marginTop: 3, whiteSpace: 'pre-line', lineHeight: 1.5 }}>{message}</div>}
      </div>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.textDisabled, fontSize: 18, lineHeight: 1, padding: 0, flexShrink: 0 }}>×</button>
    </div>
  );
}

// ─── Confirm dialog ───────────────────────────────────────────────────────
function ConfirmDialog({ show, title, message, confirmLabel='Confirm', danger=false, onConfirm, onCancel }: {
  show: boolean; title: string; message: string; confirmLabel?: string;
  danger?: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  if (!show) return null;
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999 }} onClick={onCancel}>
      <div style={{ background: t.surface, borderRadius: t.radius, width: 420, border:`1px solid ${t.border}`, boxShadow:'0 20px 60px rgba(0,0,0,.2)', overflow:'hidden', fontFamily:'"DM Sans",sans-serif' }} onClick={e=>e.stopPropagation()}>
        <div style={{ padding:'16px 20px', borderBottom:`1px solid ${t.border}` }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: t.text }}>{title}</div>
        </div>
        <div style={{ padding:'14px 20px' }}>
          <p style={{ margin:0, fontSize:13, color:t.textSubdued, lineHeight:1.6, whiteSpace:'pre-line' }}>{message}</p>
        </div>
        <div style={{ padding:'12px 20px', borderTop:`1px solid ${t.border}`, display:'flex', justifyContent:'flex-end', gap:8, background:'#fafbfb' }}>
          <button style={btn('default')} onClick={onCancel}>Cancel</button>
          <button style={btn(danger?'red':'primary')} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────
function Card({ title, action, children }: { title?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: t.surface, border:`1px solid ${t.border}`, borderRadius: t.radius, overflow:'hidden', marginBottom:12 }}>
      {title && (
        <div style={{ padding:'11px 16px', borderBottom:`1px solid ${t.border}`, background:'#fafbfb', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontSize:13, fontWeight:600, color:t.text }}>{title}</span>
          {action}
        </div>
      )}
      <div style={{ padding:16 }}>{children}</div>
    </div>
  );
}

// ─── Info banner ──────────────────────────────────────────────────────────
function Banner({ type, children }: { type:'info'|'warning'|'danger'; children: React.ReactNode }) {
  const cfg = {
    info:    { bg: t.blueLight,   border: t.blueBorder,   color: '#1a4a7a' },
    warning: { bg: t.yellowLight, border: t.yellowBorder, color: '#7a5a00' },
    danger:  { bg: t.redLight,    border: t.redBorder,    color: '#7a1a00' },
  }[type];
  return (
    <div style={{ background:cfg.bg, border:`1px solid ${cfg.border}`, borderRadius:t.radiusSm, padding:'10px 14px', fontSize:13, color:cfg.color, marginBottom:14, lineHeight:1.6 }}>
      {children}
    </div>
  );
}

// ─── Form field wrapper ───────────────────────────────────────────────────
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom:14 }}>
      <label style={{ display:'block', fontSize:13, fontWeight:600, color:t.text, marginBottom:5 }}>{label}</label>
      {children}
      {hint && <div style={{ fontSize:11, color:t.textSubdued, marginTop:4 }}>{hint}</div>}
    </div>
  );
}

// ─── Sidebar nav button ───────────────────────────────────────────────────
function NavBtn({ active, onClick, icon, label, subtle }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string; subtle?: boolean;
}) {
  return (
    <button onClick={onClick} style={{
      display:'flex', alignItems:'center', gap:9, width:'100%',
      padding:'8px 10px', fontSize:13, fontWeight: active?600:400,
      border:'none', borderRadius:t.radiusSm, cursor:'pointer', textAlign:'left',
      background: active ? t.bg : 'transparent',
      color: subtle ? t.red : active ? t.text : t.textSubdued,
      fontFamily:'"DM Sans",sans-serif', transition:'background .12s',
    }}
    onMouseEnter={e=>{ if(!active)(e.currentTarget as HTMLElement).style.background=t.bg; }}
    onMouseLeave={e=>{ if(!active)(e.currentTarget as HTMLElement).style.background='transparent'; }}>
      <span style={{ fontSize:15, flexShrink:0 }}>{icon}</span>
      {label}
    </button>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────
const Divider = () => <div style={{ height:1, background:t.border, margin:'6px 0' }} />;

// ─── Shipping rate card ───────────────────────────────────────────────────
interface ShopifyShippingRate {
  id: string; shipping_rate_handle: string; title: string;
  service_code: string; currency: string; total_price: string;
  delivery_days?: number; carrier?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════
type Tab = 'details'|'fulfill'|'edit'|'refund'|'cancel'|'reship'|'notes';

function OrderDetailsPage() {
  const { storeId, orderId } = useParams<{ storeId: string; orderId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<Tab>('details');
  const [toast, setToast] = useState<{ type:'success'|'error'|'warning'|'info'; title:string; message?:string }|null>(null);
  const [confirm, setConfirm] = useState<{ show:boolean; title:string; message:string; confirmLabel?:string; danger?:boolean; fn:()=>void }>({ show:false, title:'', message:'', fn:()=>{} });

  // shipping
  const [fulfillMode, setFulfillMode] = useState<'shopify'|'manual'>('shopify');
  const [pkg, setPkg] = useState({ weight:1, length:12, width:8, height:4 });
  const [fulfillmentOrderId, setFulfillmentOrderId] = useState('');
  const [rates, setRates] = useState<ShopifyShippingRate[]>([]);
  const [selectedRate, setSelectedRate] = useState<ShopifyShippingRate|null>(null);
  const [loadingRates, setLoadingRates] = useState(false);
  const [ratesError, setRatesError] = useState<string|null>(null);

  // forms
  const [fulfillData, setFulfillData] = useState({ tracking_number:'', tracking_company:'', notify_customer:true });
  const [editData, setEditData]       = useState({ note:'', tags:'', email:'', markDeliveryFailed:false });
  const [refundData, setRefundData]   = useState({ amount:0, reason:'', restock:false, notify:true });
  const [cancelData, setCancelData]   = useState({ reason:'customer', restock:true });
  const [reshipData, setReshipData]   = useState({ tracking_number:'', tracking_company:'', notify_customer:true, failure_reason:'lost' });
  const [newNote, setNewNote]         = useState('');

  // ── Queries ───────────────────────────────────────────────────────────
  const { data: orderData, isLoading, error } = useQuery({
    queryKey: ['order', storeId, orderId],
    queryFn: async () => (await orderAPI.getOne(storeId!, orderId!)).data,
    enabled: !!storeId && !!orderId,
  });
  const { data: storeData } = useQuery({
    queryKey: ['store', storeId],
    queryFn: async () => (await storeAPI.getOne(storeId!)).data,
    enabled: !!storeId,
  });
  const { data: shippingAvail } = useQuery({
    queryKey: ['shipping-availability', storeId],
    queryFn: async () => (await orderAPI.checkShippingAvailability(storeId!)).data,
    enabled: !!storeId && tab === 'fulfill',
  });

  const order: ShopifyOrder|undefined = orderData?.order;
  const storeName = storeData?.store?.storeName ?? 'Store';
  const hasShopifyShipping = shippingAvail?.eligible_for_shipping_labels ?? false;
  const isDeliveryFailed = order?.tags?.includes('delivery-failed');

  const getEmail = (o: ShopifyOrder) => {
    const ok = (v:any) => v && typeof v==='string' && v!=='false' && v!=='true' && v.trim();
    return ok(o.email) ? o.email : ok(o.customer?.email) ? o.customer!.email : '—';
  };
  const detectCarrier = (tn: string) => {
    const c = tn.replace(/\s/g,'');
    if (/^1Z/.test(c)) return 'UPS';
    if (/^9[234]/.test(c)) return 'USPS';
    if (/^\d{12,15}$/.test(c)) return 'FedEx';
    return '';
  };

  const showToast  = (type:'success'|'error'|'warning'|'info', title:string, msg?:string) => {
    setToast({ type, title, message:msg });
    if(type!=='info') setTimeout(()=>setToast(null), 5000);
  };
  const askConfirm = (title:string, message:string, fn:()=>void, danger=false, confirmLabel='Confirm') =>
    setConfirm({ show:true, title, message, fn, danger, confirmLabel });

  const inv = () => {
    queryClient.invalidateQueries({ queryKey:['order',storeId,orderId] });
    queryClient.invalidateQueries({ queryKey:['orders'] });
  };

  useEffect(() => {
    if (order) {
      setEditData({ note:order.note??'', tags:order.tags??'', email:getEmail(order as ShopifyOrder), markDeliveryFailed:!!order.tags?.includes('delivery-failed') });
      setRefundData(p=>({...p, amount:parseFloat(order.total_price)}));
    }
  }, [order]);

  useEffect(() => {
    if (fulfillData.tracking_number && !fulfillData.tracking_company) {
      const c = detectCarrier(fulfillData.tracking_number);
      if (c) setFulfillData(p=>({...p,tracking_company:c}));
    }
  }, [fulfillData.tracking_number]);

  // ── Mutations ─────────────────────────────────────────────────────────
  const fetchRatesMutation = useMutation({
    mutationFn: async () => {
      setLoadingRates(true); setRatesError(null);
      return (await orderAPI.getShopifyShippingRates(storeId!, orderId!, { weight:pkg.weight, dimensions:{length:pkg.length,width:pkg.width,height:pkg.height} })).data;
    },
    onSuccess: d => {
      setFulfillmentOrderId(d.fulfillmentOrderId); setRates(d.rates??[]); setLoadingRates(false);
      if (!d.rates?.length) setRatesError('No rates found. Try adjusting weight or dimensions.');
    },
    onError: (e:any) => { setLoadingRates(false); setRatesError(e.response?.data?.error??e.message); },
  });

  const purchaseLabelMutation = useMutation({
    mutationFn: (handle:string) => orderAPI.purchaseShopifyLabel(storeId!, { fulfillmentOrderId, rateHandle:handle, notifyCustomer:fulfillData.notify_customer }).then(r=>r.data),
    onSuccess: d => { inv(); showToast('success','Label purchased',`Tracking: ${d.tracking_number}`); setTimeout(()=>setTab('details'),1500); },
    onError: (e:any) => showToast('error','Purchase failed',e.response?.data?.error??e.message),
  });

  const fulfillMutation = useMutation({
    mutationFn: (d:any) => orderAPI.fulfill(storeId!, orderId!, d),
    onSuccess: () => { inv(); showToast('success','Order fulfilled'); setTab('details'); setFulfillData({tracking_number:'',tracking_company:'',notify_customer:true}); },
    onError: (e:any) => showToast('error','Fulfillment failed',e.response?.data?.error??e.message),
  });

  const updateMutation = useMutation({
    mutationFn: (d:any) => orderAPI.update(storeId!, orderId!, d),
    onSuccess: () => { inv(); showToast('success','Order updated'); setTab('details'); },
    onError: (e:any) => showToast('error','Update failed',e.response?.data?.error??e.message),
  });

  const refundMutation = useMutation({
    mutationFn: (d:any) => orderAPI.refund(storeId!, orderId!, d),
    onSuccess: () => { inv(); showToast('success','Refund processed'); setTab('details'); },
    onError: (e:any) => showToast('error','Refund failed',e.response?.data?.error??e.message),
  });

  const cancelMutation = useMutation({
    mutationFn: (d:any) => orderAPI.cancel(storeId!, orderId!, d),
    onSuccess: () => { inv(); showToast('success','Order cancelled'); setTab('details'); },
    onError: (e:any) => showToast('error','Cancellation failed',e.response?.data?.error??e.message),
  });

  const reshipMutation = useMutation({
    mutationFn: async (d:any) => {
      const tags = (order!.tags??'').split(',').map((x:string)=>x.trim()).filter(Boolean).filter((x:string)=>x!=='delivery-failed').concat(['re-shipped']).join(', ');
      await orderAPI.update(storeId!, orderId!, { tags, note:`${order!.note??''}\n[${new Date().toLocaleDateString()}] Re-shipped: ${d.failure_reason}` });
      return orderAPI.fulfill(storeId!, orderId!, { tracking_number:d.tracking_number, tracking_company:d.tracking_company, notify_customer:d.notify_customer });
    },
    onSuccess: () => { inv(); showToast('success','Order re-shipped'); setTab('details'); },
    onError: (e:any) => showToast('error','Re-ship failed',e.response?.data?.error??e.message),
  });

  const duplicateMutation = useMutation({
    mutationFn: () => orderAPI.duplicate(storeId!, orderId!),
    onSuccess: r => { inv(); const d=r.data.draftOrder; showToast(d._warning?'warning':'success','Draft created',`ID: ${d.id}${d._warning?`\n⚠ ${d._warning}`:''}`); },
    onError: (e:any) => showToast('error','Duplicate failed',e.response?.data?.error??e.message),
  });

  const addNoteMutation = useMutation({
    mutationFn: (note:string) => orderAPI.addNote(storeId!, orderId!, note, false),
    onSuccess: () => { inv(); showToast('success','Note added'); setNewNote(''); },
    onError: (e:any) => showToast('error','Failed to add note',e.response?.data?.error??e.message),
  });

  const handleUpdate = () => {
    const arr = (editData.tags??'').split(',').map((x:string)=>x.trim()).filter(Boolean);
    if (editData.markDeliveryFailed) { if (!arr.includes('delivery-failed')) arr.push('delivery-failed'); }
    else { const i=arr.indexOf('delivery-failed'); if(i>-1) arr.splice(i,1); }
    updateMutation.mutate({ note:editData.note, tags:arr.join(', '), email:editData.email });
  };

  // ── States ────────────────────────────────────────────────────────────
  if (isLoading) return (
    <div style={{ ...base, padding:60, textAlign:'center', color:t.textSubdued }}>Loading order…</div>
  );
  if (error || !order) return (
    <div style={{ ...base, padding:32 }}>
      <div style={{ background:t.redLight, border:`1px solid ${t.redBorder}`, borderRadius:t.radius, padding:'14px 18px', fontSize:13, color:t.red, marginBottom:14 }}>
        Failed to load order. Please try again.
      </div>
      <button style={btn()} onClick={() => navigate('/orders')}>← Back to Orders</button>
    </div>
  );

  // ── Layout ────────────────────────────────────────────────────────────
  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap" rel="stylesheet"/>

      {toast && <Toast {...toast} onClose={()=>setToast(null)} />}
      <ConfirmDialog
        show={confirm.show} title={confirm.title} message={confirm.message}
        confirmLabel={confirm.confirmLabel} danger={confirm.danger}
        onConfirm={()=>{ confirm.fn(); setConfirm(p=>({...p,show:false})); }}
        onCancel={()=>setConfirm(p=>({...p,show:false}))}
      />

      <div style={{ ...base, background:t.bg, minHeight:'100vh', padding:'20px 24px' }}>
        <div style={{ maxWidth:1140, margin:'0 auto' }}>

          {/* ── Breadcrumb ── */}
          <button onClick={()=>navigate('/orders')} style={{
            ...btn(), marginBottom:14, fontSize:12, padding:'5px 10px',
          }}>
            <svg width="13" height="13" viewBox="0 0 20 20" fill="none">
              <path d="M13 4l-6 6 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Orders
          </button>

          {/* ── Header ── */}
          <div style={{
            background: t.surface, border:`1px solid ${t.border}`,
            borderRadius: t.radius, padding:'16px 20px', marginBottom:14,
            display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12,
          }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:5, flexWrap:'wrap' }}>
                <h1 style={{ margin:0, fontSize:20, fontWeight:650, letterSpacing:'-0.3px', color:t.text }}>
                  {order.name}
                </h1>
                <FinancialBadge status={order.financial_status} />
                <FulfillBadge status={order.fulfillment_status} />
                {isDeliveryFailed && <Badge label="Delivery failed" color={t.red} bg={t.redLight} />}
              </div>
              <div style={{ fontSize:13, color:t.textSubdued }}>
                {storeName} · {format(new Date(order.created_at), 'PPp')}
              </div>
            </div>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <div style={{ fontSize:22, fontWeight:700, color:t.green }}>{order.currency} {order.total_price}</div>
              <button
                style={btn('default')}
                disabled={duplicateMutation.isPending}
                onClick={()=>askConfirm('Duplicate order?',`Create a draft based on ${order.name}?`,()=>duplicateMutation.mutate())}
              >
                {duplicateMutation.isPending ? 'Duplicating…' : 'Duplicate'}
              </button>
            </div>
          </div>

          {/* ── Two-col grid ── */}
          <div style={{ display:'grid', gridTemplateColumns:'176px 1fr', gap:14, alignItems:'start' }}>

            {/* ── Sidebar ── */}
            <div style={{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:t.radius, padding:8, position:'sticky', top:20 }}>
              <div style={{ fontSize:11, fontWeight:700, color:t.textDisabled, textTransform:'uppercase', letterSpacing:'0.07em', padding:'4px 6px 7px' }}>View</div>
              <NavBtn active={tab==='details'} onClick={()=>setTab('details')} icon={<svg width="14" height="14" viewBox="0 0 20 20" fill="none"><rect x="3" y="3" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M7 8h6M7 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>} label="Details" />
              <NavBtn active={tab==='notes'} onClick={()=>setTab('notes')} icon={<svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M4 4h12v9H4zM4 13l3 3h9" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>} label="Notes" />

              <Divider />
              <div style={{ fontSize:11, fontWeight:700, color:t.textDisabled, textTransform:'uppercase', letterSpacing:'0.07em', padding:'4px 6px 7px' }}>Actions</div>

              {!order.fulfillment_status && (
                <NavBtn active={tab==='fulfill'} onClick={()=>setTab('fulfill')} icon={<svg width="14" height="14" viewBox="0 0 20 20" fill="none"><rect x="2" y="7" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M6 7V5a4 4 0 018 0v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>} label="Fulfill" />
              )}
              {isDeliveryFailed && order.fulfillment_status && (
                <NavBtn active={tab==='reship'} onClick={()=>setTab('reship')} icon={<svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M4 10a6 6 0 1010.392-4.5M4 10V6m0 4H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>} label="Re-ship" />
              )}
              <NavBtn active={tab==='edit'} onClick={()=>setTab('edit')} icon={<svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M13 3l4 4-9 9H4v-4l9-9z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>} label="Edit" />
              {order.financial_status === 'paid' && (
                <NavBtn active={tab==='refund'} onClick={()=>setTab('refund')} icon={<svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M10 4v12M6 8l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>} label="Refund" />
              )}
              {order.financial_status !== 'refunded' && (
                <NavBtn active={tab==='cancel'} onClick={()=>setTab('cancel')} icon={<svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>} label="Cancel" subtle />
              )}

              <Divider />
              <div style={{ padding:'6px 8px' }}>
                <div style={{ fontSize:12, fontWeight:600, color:t.text, marginBottom:2 }}>{storeName}</div>
                <div style={{ fontSize:11, color:t.textSubdued, wordBreak:'break-all' }}>{storeData?.store?.shopDomain}</div>
              </div>
            </div>

            {/* ── Content ── */}
            <div>

              {/* ════ DETAILS ════ */}
              {tab==='details' && (
                <>
                  {/* Customer */}
                  <Card title="Customer">
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
                      {[
                        { label:'Name',  val:`${order.customer?.first_name??''} ${order.customer?.last_name??''}`.trim() || '—' },
                        { label:'Email', val: getEmail(order as ShopifyOrder), mono:true },
                        { label:'Phone', val: order.customer?.phone ?? '—' },
                      ].map(({ label, val, mono }) => (
                        <div key={label}>
                          <div style={{ fontSize:11, fontWeight:600, color:t.textSubdued, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:4 }}>{label}</div>
                          <div style={{ fontSize:14, fontWeight:500, color:t.text, fontFamily:mono?'monospace':'inherit' }}>{val}</div>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* Items */}
                  {!!order.line_items?.length && (
                    <Card title={`Items (${order.line_items.length})`}>
                      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                        <thead>
                          <tr>
                            {['Product','SKU','Qty','Unit price','Total'].map((h,i)=>(
                              <th key={h} style={{ padding:'7px 10px', textAlign:i<2?'left':'right', fontSize:12, fontWeight:600, color:t.textSubdued, borderBottom:`1px solid ${t.border}`, background:'#fafbfb' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {order.line_items.map((item:any,i:number)=>(
                            <tr key={item.id??i} style={{ borderBottom:i<order.line_items!.length-1?`1px solid ${t.borderSubdued}`:'none' }}>
                              <td style={{ padding:'10px 10px' }}>
                                <div style={{ fontWeight:600, color:t.text }}>{item.name??item.title}</div>
                                {item.variant_title && item.variant_title!=='Default Title' && <div style={{ fontSize:11, color:t.textSubdued, marginTop:2 }}>{item.variant_title}</div>}
                              </td>
                              <td style={{ padding:'10px 10px', fontFamily:'monospace', fontSize:12, color:t.textSubdued }}>{item.sku||'—'}</td>
                              <td style={{ padding:'10px 10px', textAlign:'right', fontWeight:500 }}>{item.quantity}</td>
                              <td style={{ padding:'10px 10px', textAlign:'right', color:t.textSubdued }}>{order.currency} {parseFloat(item.price).toFixed(2)}</td>
                              <td style={{ padding:'10px 10px', textAlign:'right', fontWeight:700, color:t.green }}>{order.currency} {(parseFloat(item.price)*item.quantity).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {/* Totals */}
                      <div style={{ borderTop:`1px solid ${t.border}`, paddingTop:8, marginTop:4 }}>
                        {[
                          ['Subtotal', order.subtotal_price],
                          ['Tax', order.total_tax],
                        ].map(([l,v])=>(
                          <div key={l as string} style={{ display:'flex', justifyContent:'space-between', padding:'3px 10px', fontSize:13, color:t.textSubdued }}>
                            <span>{l}</span><span>{order.currency} {v}</span>
                          </div>
                        ))}
                        <div style={{ display:'flex', justifyContent:'space-between', padding:'8px 10px', fontSize:15, fontWeight:700, borderTop:`1px solid ${t.border}`, marginTop:4 }}>
                          <span>Total</span>
                          <span style={{ color:t.green }}>{order.currency} {order.total_price}</span>
                        </div>
                      </div>
                    </Card>
                  )}

                  {/* Fulfillments */}
                  {!!order.fulfillments?.length && (
                    <Card title="Fulfillments">
                      {order.fulfillments.map((f:any,i:number)=>(
                        <div key={i} style={{
                          background: f.tracking_number ? t.greenLight : t.bg,
                          border:`1px solid ${f.tracking_number ? t.greenBorder : t.border}`,
                          borderRadius: t.radiusSm, padding:'14px 16px',
                          marginBottom: i<order.fulfillments!.length-1 ? 8 : 0,
                        }}>
                          {f.tracking_number ? (
                            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:12 }}>
                              {[
                                ['Tracking', f.tracking_number, true],
                                ['Carrier', f.tracking_company, false],
                                ['Status', f.status, false],
                                ['Date', f.created_at ? format(new Date(f.created_at),'PP') : null, false],
                              ].filter(([,v])=>v).map(([l,v,mono]:any)=>(
                                <div key={l as string}>
                                  <div style={{ fontSize:11, fontWeight:600, color:t.green, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:3 }}>{l}</div>
                                  <div style={{ fontSize:14, fontWeight:mono?700:500, color:t.green, fontFamily:mono?'monospace':'inherit', textTransform:l==='Status'?'capitalize':undefined }}>{v}</div>
                                </div>
                              ))}
                              {f.tracking_url && (
                                <div>
                                  <div style={{ fontSize:11, fontWeight:600, color:t.green, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:3 }}>Track</div>
                                  <a href={f.tracking_url} target="_blank" rel="noopener noreferrer" style={{ fontSize:13, color:t.green, fontWeight:600 }}>Track shipment →</a>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div style={{ fontSize:13, color:t.textSubdued }}>Fulfilled — no tracking number provided</div>
                          )}
                        </div>
                      ))}
                    </Card>
                  )}

                  {/* Notes & tags */}
                  {(order.note || order.tags) && (
                    <Card title="Notes & Tags">
                      {order.note && (
                        <div style={{ background:t.bg, borderRadius:t.radiusSm, padding:'10px 12px', fontSize:13, lineHeight:1.6, color:t.text, marginBottom:order.tags?12:0, whiteSpace:'pre-wrap' }}>
                          {order.note}
                        </div>
                      )}
                      {order.tags && (
                        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                          {order.tags.split(',').map((tag:string,i:number)=>(
                            <span key={i} style={{ fontSize:12, padding:'2px 9px', background:t.bg, border:`1px solid ${t.border}`, borderRadius:10, color:t.textSubdued }}>{tag.trim()}</span>
                          ))}
                        </div>
                      )}
                    </Card>
                  )}
                </>
              )}

              {/* ════ NOTES ════ */}
              {tab==='notes' && (
                <Card title="Notes">
                  {order.note && (
                    <div style={{ marginBottom:16 }}>
                      <div style={{ fontSize:12, fontWeight:600, color:t.textSubdued, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6 }}>Existing notes</div>
                      <div style={{ background:t.bg, borderRadius:t.radiusSm, padding:'10px 12px', fontSize:13, lineHeight:1.6, color:t.text, maxHeight:180, overflowY:'auto', whiteSpace:'pre-wrap' }}>
                        {order.note}
                      </div>
                    </div>
                  )}
                  <Field label="Add note" hint="Notes are private — not visible to customers.">
                    <textarea
                      value={newNote} onChange={e=>setNewNote(e.target.value)}
                      rows={4} placeholder="Write a note…"
                      style={{ ...inp, resize:'vertical', minHeight:90 }}
                      onFocus={focus} onBlur={blur}
                    />
                  </Field>
                  <div style={{ display:'flex', gap:8 }}>
                    <button style={{ ...btn('primary'), opacity:(!newNote.trim()||addNoteMutation.isPending)?.5:1 }}
                      disabled={!newNote.trim()||addNoteMutation.isPending} onClick={()=>addNoteMutation.mutate(newNote)}>
                      {addNoteMutation.isPending ? 'Saving…' : 'Save note'}
                    </button>
                    <button style={btn()} onClick={()=>setNewNote('')}>Clear</button>
                  </div>
                </Card>
              )}

              {/* ════ FULFILL ════ */}
              {tab==='fulfill' && (
                <Card title="Fulfill order">
                  {hasShopifyShipping && (
                    <div style={{ display:'flex', gap:8, marginBottom:16 }}>
                      {(['shopify','manual'] as const).map(m=>(
                        <button key={m} onClick={()=>{setFulfillMode(m);setRatesError(null);setRates([]);setSelectedRate(null);}} style={{
                          flex:1, padding:'8px 14px', fontSize:13, fontWeight:500,
                          border:`1px solid ${fulfillMode===m?t.text:t.border}`, borderRadius:t.radiusSm,
                          background:fulfillMode===m?t.text:'transparent',
                          color:fulfillMode===m?'#fff':t.textSubdued, cursor:'pointer', fontFamily:'inherit',
                          transition:'all .15s',
                        }}>
                          {m==='shopify' ? 'Buy Shopify label' : 'Manual tracking'}
                        </button>
                      ))}
                    </div>
                  )}

                  {hasShopifyShipping && fulfillMode==='shopify' && (
                    <>
                      <div style={{ background:t.bg, borderRadius:t.radiusSm, padding:'14px 16px', marginBottom:14 }}>
                        <div style={{ fontSize:12, fontWeight:600, color:t.textSubdued, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:10 }}>Package</div>
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
                          {[
                            ['Weight (lbs)', pkg.weight, (v:string)=>setPkg(p=>({...p,weight:parseFloat(v)||1})),'0.1'],
                            ['Length (in)', pkg.length, (v:string)=>setPkg(p=>({...p,length:parseInt(v)||12})),'1'],
                            ['Width (in)', pkg.width, (v:string)=>setPkg(p=>({...p,width:parseInt(v)||8})),'1'],
                            ['Height (in)', pkg.height, (v:string)=>setPkg(p=>({...p,height:parseInt(v)||4})),'1'],
                          ].map(([l,v,fn,step]:any)=>(
                            <div key={l}>
                              <div style={{ fontSize:11, fontWeight:600, color:t.textSubdued, marginBottom:4 }}>{l}</div>
                              <input type="number" step={step} min={step} value={v} onChange={e=>fn(e.target.value)}
                                style={{ ...inp, padding:'7px 9px', fontSize:13 }} onFocus={focus} onBlur={blur} />
                            </div>
                          ))}
                        </div>
                        <button
                          style={{ ...btn('primary'), marginTop:12, width:'100%', justifyContent:'center', opacity:loadingRates?.5:1 }}
                          disabled={loadingRates} onClick={()=>fetchRatesMutation.mutate()}>
                          {loadingRates ? 'Fetching rates…' : 'Get shipping rates'}
                        </button>
                      </div>

                      {ratesError && (
                        <Banner type="warning">
                          <strong>Could not load rates</strong> — {ratesError}
                          <div style={{ marginTop:8 }}>
                            <button style={{ ...btn(), fontSize:12, padding:'5px 10px' }} onClick={()=>{setFulfillMode('manual');setRatesError(null);}}>
                              Switch to manual
                            </button>
                          </div>
                        </Banner>
                      )}

                      {rates.length>0 && (
                        <>
                          <div style={{ fontSize:12, fontWeight:600, color:t.textSubdued, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8 }}>Select a service</div>
                          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                            {rates.map(rate=>(
                              <button key={rate.id}
                                onClick={()=>{ setSelectedRate(rate); askConfirm(
                                  `Purchase label — ${rate.title}`,
                                  `Cost: ${rate.currency} ${parseFloat(rate.total_price).toFixed(2)}\nDelivery: ${rate.delivery_days??'N/A'} days\n\nThis will purchase the label, fulfill the order, and send tracking to the customer.`,
                                  ()=>purchaseLabelMutation.mutate(rate.shipping_rate_handle)
                                ); }}
                                disabled={purchaseLabelMutation.isPending}
                                style={{
                                  display:'flex', justifyContent:'space-between', alignItems:'center',
                                  padding:'12px 14px', textAlign:'left',
                                  border:`1px solid ${selectedRate?.id===rate.id?t.text:t.border}`,
                                  borderRadius:t.radiusSm, background:selectedRate?.id===rate.id?t.bg:t.surface,
                                  cursor:'pointer', fontFamily:'inherit', transition:'border-color .15s',
                                }}>
                                <div>
                                  <div style={{ fontSize:14, fontWeight:600, color:t.text }}>{rate.title}</div>
                                  <div style={{ fontSize:12, color:t.textSubdued, marginTop:2 }}>
                                    {rate.service_code}{rate.delivery_days?` · ${rate.delivery_days} days`:''}
                                  </div>
                                </div>
                                <div style={{ fontSize:15, fontWeight:700, color:t.text, flexShrink:0 }}>
                                  {rate.currency} {parseFloat(rate.total_price).toFixed(2)}
                                </div>
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </>
                  )}

                  {(!hasShopifyShipping || fulfillMode==='manual') && (
                    <>
                      <Field label="Tracking number *">
                        <input value={fulfillData.tracking_number} onChange={e=>setFulfillData(p=>({...p,tracking_number:e.target.value}))}
                          placeholder="e.g. 1Z999AA10123456784" style={inp} onFocus={focus} onBlur={blur} />
                      </Field>
                      <Field label="Carrier">
                        <input value={fulfillData.tracking_company} onChange={e=>setFulfillData(p=>({...p,tracking_company:e.target.value}))}
                          placeholder="UPS, FedEx, USPS, Canada Post…" style={inp} onFocus={focus} onBlur={blur} />
                        {fulfillData.tracking_company && <div style={{ fontSize:11, color:t.green, marginTop:4, fontWeight:500 }}>Auto-detected: {fulfillData.tracking_company}</div>}
                      </Field>
                      <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, cursor:'pointer', marginBottom:18 }}>
                        <input type="checkbox" checked={fulfillData.notify_customer} onChange={e=>setFulfillData(p=>({...p,notify_customer:e.target.checked}))} style={{ accentColor:t.purple, cursor:'pointer' }} />
                        Send shipment notification to customer
                      </label>
                      <div style={{ display:'flex', gap:8 }}>
                        <button style={{ ...btn('green'), opacity:(!fulfillData.tracking_number||fulfillMutation.isPending)?.5:1 }}
                          disabled={!fulfillData.tracking_number||fulfillMutation.isPending} onClick={()=>fulfillMutation.mutate(fulfillData)}>
                          {fulfillMutation.isPending ? 'Fulfilling…' : 'Fulfill order'}
                        </button>
                        <button style={btn()} onClick={()=>setTab('details')}>Cancel</button>
                      </div>
                    </>
                  )}
                </Card>
              )}

              {/* ════ EDIT ════ */}
              {tab==='edit' && (
                <Card title="Edit order">
                  <Field label="Internal notes" hint="Not visible to customers.">
                    <textarea value={editData.note} onChange={e=>setEditData(p=>({...p,note:e.target.value}))}
                      rows={3} placeholder="Add internal notes…" style={{ ...inp, resize:'vertical', minHeight:80 }}
                      onFocus={focus} onBlur={blur} />
                  </Field>
                  <Field label="Tags" hint="Separate with commas.">
                    <input value={editData.tags} onChange={e=>setEditData(p=>({...p,tags:e.target.value}))}
                      placeholder="urgent, wholesale, vip" style={inp} onFocus={focus} onBlur={blur} />
                  </Field>
                  <Field label="Customer email">
                    <input type="email" value={editData.email} onChange={e=>setEditData(p=>({...p,email:e.target.value}))}
                      style={inp} onFocus={focus} onBlur={blur} />
                  </Field>
                  <label style={{
                    display:'flex', alignItems:'flex-start', gap:9, fontSize:13, cursor:'pointer',
                    padding:'10px 12px', background:t.yellowLight, border:`1px solid ${t.yellowBorder}`,
                    borderRadius:t.radiusSm, marginBottom:18,
                  }}>
                    <input type="checkbox" checked={editData.markDeliveryFailed} onChange={e=>setEditData(p=>({...p,markDeliveryFailed:e.target.checked}))}
                      style={{ accentColor:t.purple, marginTop:2, cursor:'pointer', flexShrink:0 }} />
                    <div>
                      <div style={{ fontWeight:600, color:t.yellow, marginBottom:2 }}>Mark as delivery failed</div>
                      <div style={{ fontSize:12, color:t.textSubdued }}>Enables the Re-ship action for this order.</div>
                    </div>
                  </label>
                  <div style={{ display:'flex', gap:8 }}>
                    <button style={{ ...btn('primary'), opacity:updateMutation.isPending?.5:1 }} disabled={updateMutation.isPending} onClick={handleUpdate}>
                      {updateMutation.isPending ? 'Saving…' : 'Save changes'}
                    </button>
                    <button style={btn()} onClick={()=>setTab('details')}>Cancel</button>
                  </div>
                </Card>
              )}

              {/* ════ REFUND ════ */}
              {tab==='refund' && (
                <Card title="Refund order">
                  <Banner type="warning">
                    Refunds are applied to the customer's original payment method and <strong>cannot be undone</strong>.
                  </Banner>
                  <Field label="Refund amount" hint={`Order total: ${order.currency} ${order.total_price}`}>
                    <input type="number" step="0.01" min="0" max={parseFloat(order.total_price)}
                      value={refundData.amount} onChange={e=>setRefundData(p=>({...p,amount:parseFloat(e.target.value)||0}))}
                      style={inp} onFocus={focus} onBlur={blur} />
                  </Field>
                  <Field label="Reason (optional)">
                    <textarea value={refundData.reason} onChange={e=>setRefundData(p=>({...p,reason:e.target.value}))}
                      rows={2} placeholder="Reason for refund…" style={{ ...inp, resize:'vertical' }}
                      onFocus={focus} onBlur={blur} />
                  </Field>
                  <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:18 }}>
                    {[{ k:'restock',label:'Restock items' },{ k:'notify',label:'Send refund notification to customer' }].map(({ k,label })=>(
                      <label key={k} style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, cursor:'pointer' }}>
                        <input type="checkbox" checked={(refundData as any)[k]} onChange={e=>setRefundData(p=>({...p,[k]:e.target.checked}))} style={{ accentColor:t.purple, cursor:'pointer' }} />
                        {label}
                      </label>
                    ))}
                  </div>
                  <div style={{ display:'flex', gap:8 }}>
                    <button style={{ ...btn('red'), opacity:(!refundData.amount||refundMutation.isPending)?.5:1 }}
                      disabled={!refundData.amount||refundMutation.isPending}
                      onClick={()=>askConfirm('Process refund?',`Refund ${order.currency} ${refundData.amount.toFixed(2)} to the customer?`,()=>refundMutation.mutate(refundData),true,'Process refund')}>
                      {refundMutation.isPending ? 'Processing…' : 'Process refund'}
                    </button>
                    <button style={btn()} onClick={()=>setTab('details')}>Cancel</button>
                  </div>
                </Card>
              )}

              {/* ════ CANCEL ════ */}
              {tab==='cancel' && (
                <Card title="Cancel order">
                  <Banner type="danger">
                    Cancelling will notify the customer and <strong>cannot be undone</strong>.
                  </Banner>
                  <Field label="Reason">
                    <select value={cancelData.reason} onChange={e=>setCancelData(p=>({...p,reason:e.target.value}))}
                      style={{ ...inp, background:`${t.surface} url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%236d7175'/%3E%3C/svg%3E") no-repeat right 10px center`, appearance:'none', paddingRight:28, cursor:'pointer' }}
                      onFocus={focus} onBlur={blur}>
                      <option value="customer">Customer request</option>
                      <option value="fraud">Suspected fraud</option>
                      <option value="inventory">Out of stock</option>
                      <option value="declined">Payment declined</option>
                      <option value="other">Other</option>
                    </select>
                  </Field>
                  <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, cursor:'pointer', marginBottom:18 }}>
                    <input type="checkbox" checked={cancelData.restock} onChange={e=>setCancelData(p=>({...p,restock:e.target.checked}))} style={{ accentColor:t.purple, cursor:'pointer' }} />
                    Return items to inventory
                  </label>
                  <div style={{ display:'flex', gap:8 }}>
                    <button style={{ ...btn('red'), opacity:cancelMutation.isPending?.5:1 }} disabled={cancelMutation.isPending}
                      onClick={()=>askConfirm('Cancel order?',`Cancel ${order.name}? This cannot be undone.`,()=>cancelMutation.mutate(cancelData),true,'Cancel order')}>
                      {cancelMutation.isPending ? 'Cancelling…' : 'Cancel order'}
                    </button>
                    <button style={btn()} onClick={()=>setTab('details')}>Back</button>
                  </div>
                </Card>
              )}

              {/* ════ RESHIP ════ */}
              {tab==='reship' && (
                <Card title="Re-ship order">
                  <Banner type="warning">
                    Creates a new fulfillment for a replacement shipment. The original fulfillment record is preserved.
                  </Banner>
                  <Field label="Reason for failure">
                    <select value={reshipData.failure_reason} onChange={e=>setReshipData(p=>({...p,failure_reason:e.target.value}))}
                      style={{ ...inp, background:`${t.surface} url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%236d7175'/%3E%3C/svg%3E") no-repeat right 10px center`, appearance:'none', paddingRight:28, cursor:'pointer' }}
                      onFocus={focus} onBlur={blur}>
                      <option value="lost">Lost in transit</option>
                      <option value="damaged">Package damaged</option>
                      <option value="wrong_address">Wrong address</option>
                      <option value="refused">Customer refused delivery</option>
                      <option value="returned">Returned to sender</option>
                      <option value="other">Other</option>
                    </select>
                  </Field>
                  <Field label="New tracking number *">
                    <input value={reshipData.tracking_number} onChange={e=>setReshipData(p=>({...p,tracking_number:e.target.value}))}
                      placeholder="1Z999AA10123456784" style={inp} onFocus={focus} onBlur={blur} />
                  </Field>
                  <Field label="Carrier">
                    <input value={reshipData.tracking_company} onChange={e=>setReshipData(p=>({...p,tracking_company:e.target.value}))}
                      placeholder="UPS, FedEx, Canada Post…" style={inp} onFocus={focus} onBlur={blur} />
                  </Field>
                  <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, cursor:'pointer', marginBottom:18 }}>
                    <input type="checkbox" checked={reshipData.notify_customer} onChange={e=>setReshipData(p=>({...p,notify_customer:e.target.checked}))} style={{ accentColor:t.purple, cursor:'pointer' }} />
                    Send replacement notification to customer
                  </label>
                  <div style={{ display:'flex', gap:8 }}>
                    <button style={{ ...btn('yellow'), opacity:(!reshipData.tracking_number||reshipMutation.isPending)?.5:1 }}
                      disabled={!reshipData.tracking_number||reshipMutation.isPending} onClick={()=>reshipMutation.mutate(reshipData)}>
                      {reshipMutation.isPending ? 'Processing…' : 'Re-ship order'}
                    </button>
                    <button style={btn()} onClick={()=>setTab('details')}>Cancel</button>
                  </div>
                </Card>
              )}

            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default OrderDetailsPage;