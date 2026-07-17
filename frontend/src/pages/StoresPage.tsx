

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storeAPI } from '../api';

interface Store {
  id: string;
  shopDomain: string;
  storeName: string;
  email: string | null;
  currency: string | null;
  timezone: string | null;
  isActive: boolean;
  createdAt: string;
}

// ─── Design tokens ────────────────────────────────────────────────────────
const t = {
  bg:           '#f1f2f4',
  surface:      '#ffffff',
  border:       '#e1e3e5',
  borderSubdued:'#f1f2f4',
  text:         '#202223',
  textSubdued:  '#6d7175',
  textDisabled: '#8c9196',
  green:        '#008060', greenLight: '#f1f8f5', greenBorder: '#b3dfd4',
  red:          '#d72c0d', redLight:   '#fff4f4', redBorder:   '#fecaca',
  radius:       '8px',
  radiusSm:     '6px',
};

const inp: React.CSSProperties = {
  width: '100%', padding: '8px 10px', fontSize: 14, color: t.text,
  border: `1px solid ${t.border}`, borderRadius: t.radiusSm,
  background: t.surface, outline: 'none', boxSizing: 'border-box',
  fontFamily: '"DM Sans",sans-serif', transition: 'border-color .15s',
};
const focus = (e: React.FocusEvent<any>) => (e.target.style.borderColor = '#0070f3');
const blur  = (e: React.FocusEvent<any>) => (e.target.style.borderColor = t.border);

// ─── Toast ────────────────────────────────────────────────────────────────
function Toast({ type, title, onClose }: { type: 'success'|'error'; title: string; onClose: () => void }) {
  const cfg = type === 'success'
    ? { accent: t.green, bg: t.greenLight, border: t.greenBorder, dot: '✓' }
    : { accent: t.red,   bg: t.redLight,   border: t.redBorder,   dot: '✕' };
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      background: t.surface, borderLeft: `4px solid ${cfg.accent}`,
      border: `1px solid ${cfg.border}`, borderRadius: t.radius,
      padding: '14px 18px', maxWidth: 360,
      boxShadow: '0 6px 30px rgba(0,0,0,.12)',
      display: 'flex', alignItems: 'center', gap: 10,
      fontFamily: '"DM Sans",sans-serif',
      animation: 'slideToast .25s ease',
    }}>
      <style>{`@keyframes slideToast{from{transform:translateX(40px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
      <span style={{ width:20,height:20,borderRadius:'50%',background:cfg.bg,color:cfg.accent,fontSize:11,fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>{cfg.dot}</span>
      <span style={{ flex:1, fontSize:13, fontWeight:600, color:t.text }}>{title}</span>
      <button onClick={onClose} style={{ background:'none',border:'none',cursor:'pointer',color:t.textDisabled,fontSize:16,padding:0 }}>×</button>
    </div>
  );
}

// ─── Confirm dialog ───────────────────────────────────────────────────────
function ConfirmDialog({ show, storeName, onConfirm, onCancel }: {
  show: boolean; storeName: string; onConfirm: () => void; onCancel: () => void;
}) {
  if (!show) return null;
  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.45)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999 }} onClick={onCancel}>
      <div style={{ background:t.surface,borderRadius:t.radius,width:420,border:`1px solid ${t.border}`,boxShadow:'0 20px 60px rgba(0,0,0,.2)',overflow:'hidden',fontFamily:'"DM Sans",sans-serif' }} onClick={e=>e.stopPropagation()}>
        <div style={{ padding:'16px 20px',borderBottom:`1px solid ${t.border}` }}>
          <div style={{ fontSize:15,fontWeight:600,color:t.text }}>Remove store</div>
        </div>
        <div style={{ padding:'14px 20px' }}>
          <p style={{ margin:0,fontSize:13,color:t.textSubdued,lineHeight:1.6 }}>
            Are you sure you want to remove <strong style={{ color:t.text }}>{storeName}</strong>? This will disconnect the store and cannot be undone.
          </p>
        </div>
        <div style={{ padding:'12px 20px',borderTop:`1px solid ${t.border}`,display:'flex',justifyContent:'flex-end',gap:8,background:'#fafbfb' }}>
          <button onClick={onCancel} style={{ padding:'7px 14px',fontSize:13,fontWeight:500,border:`1px solid ${t.border}`,borderRadius:t.radiusSm,background:t.surface,color:t.text,cursor:'pointer',fontFamily:'inherit' }}>Cancel</button>
          <button onClick={onConfirm} style={{ padding:'7px 14px',fontSize:13,fontWeight:500,border:'none',borderRadius:t.radiusSm,background:t.red,color:'#fff',cursor:'pointer',fontFamily:'inherit' }}>Remove store</button>
        </div>
      </div>
    </div>
  );
}

// ─── Add Store modal ──────────────────────────────────────────────────────
function AddStoreModal({ onClose, onSubmit, loading }: {
  onClose: () => void;
  onSubmit: (data: any) => void;
  loading: boolean;
}) {
  const [form, setForm] = useState({ shopDomain:'', accessToken:'', storeName:'' });
  const [showToken, setShowToken] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.45)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999 }} onClick={onClose}>
      <div style={{ background:t.surface,borderRadius:t.radius,width:480,border:`1px solid ${t.border}`,boxShadow:'0 20px 60px rgba(0,0,0,.2)',overflow:'hidden',fontFamily:'"DM Sans",sans-serif' }} onClick={e=>e.stopPropagation()}>

        {/* Modal header */}
        <div style={{ padding:'16px 20px',borderBottom:`1px solid ${t.border}`,display:'flex',justifyContent:'space-between',alignItems:'center' }}>
          <div style={{ fontSize:15,fontWeight:600,color:t.text }}>Connect a store</div>
          <button onClick={onClose} style={{ background:'none',border:'none',cursor:'pointer',color:t.textDisabled,fontSize:20,lineHeight:1,padding:0 }}>×</button>
        </div>

        {/* Modal body */}
        <form onSubmit={handleSubmit}>
          <div style={{ padding:'20px' }}>

            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block',fontSize:13,fontWeight:600,color:t.text,marginBottom:5 }}>Store name *</label>
              <input value={form.storeName} onChange={set('storeName')} placeholder="My Shopify Store" required style={inp} onFocus={focus} onBlur={blur} />
              <div style={{ fontSize:11,color:t.textSubdued,marginTop:4 }}>A friendly name to identify this store in your dashboard</div>
            </div>

            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block',fontSize:13,fontWeight:600,color:t.text,marginBottom:5 }}>Shop domain *</label>
              <input value={form.shopDomain} onChange={set('shopDomain')} placeholder="mystore.myshopify.com" required style={inp} onFocus={focus} onBlur={blur} />
              <div style={{ fontSize:11,color:t.textSubdued,marginTop:4 }}>Your full Shopify domain (e.g. mystore.myshopify.com)</div>
            </div>

            <div style={{ marginBottom:6 }}>
              <label style={{ display:'block',fontSize:13,fontWeight:600,color:t.text,marginBottom:5 }}>Admin API access token *</label>
              <div style={{ position:'relative' }}>
                <input
                  type={showToken ? 'text' : 'password'}
                  value={form.accessToken} onChange={set('accessToken')}
                  placeholder="shpat_xxxxxxxxxxxxx" required
                  style={{ ...inp, fontFamily:'monospace', paddingRight:44 }}
                  onFocus={focus} onBlur={blur}
                />
                <button type="button" onClick={() => setShowToken(p=>!p)} style={{
                  position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',
                  background:'none',border:'none',cursor:'pointer',color:t.textSubdued,fontSize:11,fontWeight:600,
                  fontFamily:'inherit',
                }}>
                  {showToken ? 'Hide' : 'Show'}
                </button>
              </div>
              <div style={{ fontSize:11,color:t.textSubdued,marginTop:4 }}>From your Shopify custom app (starts with shpat_)</div>
            </div>

            {/* Info banner */}
            <div style={{ background:t.greenLight,border:`1px solid ${t.greenBorder}`,borderRadius:t.radiusSm,padding:'9px 12px',marginTop:14,fontSize:12,color:t.green,lineHeight:1.5 }}>
              Make sure your custom app has the <strong>read_orders</strong> and <strong>write_orders</strong> API scopes enabled in Shopify.
            </div>
          </div>

          {/* Modal footer */}
          <div style={{ padding:'12px 20px',borderTop:`1px solid ${t.border}`,display:'flex',justifyContent:'flex-end',gap:8,background:'#fafbfb' }}>
            <button type="button" onClick={onClose} style={{ padding:'7px 14px',fontSize:13,fontWeight:500,border:`1px solid ${t.border}`,borderRadius:t.radiusSm,background:t.surface,color:t.text,cursor:'pointer',fontFamily:'inherit' }}>
              Cancel
            </button>
            <button type="submit" disabled={loading} style={{
              padding:'7px 16px',fontSize:13,fontWeight:600,border:'none',borderRadius:t.radiusSm,
              background:loading?t.textDisabled:t.green,color:'#fff',cursor:loading?'not-allowed':'pointer',
              fontFamily:'inherit',display:'inline-flex',alignItems:'center',gap:6,
            }}>
              {loading ? (
                <>
                  <span style={{ width:12,height:12,border:'2px solid rgba(255,255,255,.3)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin .8s linear infinite',display:'inline-block' }} />
                  Connecting…
                </>
              ) : 'Connect store'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Store row ────────────────────────────────────────────────────────────
function StoreRow({ store, onDelete, deleting, isLast }: {
  store: Store; onDelete: (id:string,name:string)=>void; deleting:boolean; isLast:boolean;
}) {
  const [hov, setHov] = useState(false);
  return (
    <tr
      onMouseEnter={()=>setHov(true)}
      onMouseLeave={()=>setHov(false)}
      style={{ background: hov ? '#fafbfb' : 'transparent' }}
    >
      {/* Store name */}
      <td style={{ padding:'12px 16px',borderBottom:isLast?'none':`1px solid ${t.borderSubdued}` }}>
        <div style={{ display:'flex',alignItems:'center',gap:10 }}>
          <div style={{
            width:32,height:32,borderRadius:6,background:t.greenLight,
            border:`1px solid ${t.greenBorder}`,display:'flex',alignItems:'center',
            justifyContent:'center',flexShrink:0,
          }}>
            <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
              <path d="M3 7h14M3 7l1-4h12l1 4M3 7v10h14V7" stroke={t.green} strokeWidth="1.4" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize:14,fontWeight:600,color:t.text }}>{store.storeName}</div>
            {store.email && <div style={{ fontSize:12,color:t.textSubdued }}>{store.email}</div>}
          </div>
        </div>
      </td>

      {/* Domain */}
      <td style={{ padding:'12px 16px',borderBottom:isLast?'none':`1px solid ${t.borderSubdued}` }}>
        <span style={{ fontSize:13,fontFamily:'monospace',color:t.textSubdued }}>{store.shopDomain}</span>
      </td>

      {/* Currency */}
      <td style={{ padding:'12px 16px',borderBottom:isLast?'none':`1px solid ${t.borderSubdued}` }}>
        <span style={{ fontSize:13,color:t.textSubdued }}>{store.currency || '—'}</span>
      </td>

      {/* Status */}
      <td style={{ padding:'12px 16px',borderBottom:isLast?'none':`1px solid ${t.borderSubdued}` }}>
        <span style={{
          fontSize:12,fontWeight:500,padding:'2px 9px',borderRadius:10,
          background: store.isActive ? t.greenLight : t.bg,
          color: store.isActive ? t.green : t.textSubdued,
        }}>
          {store.isActive ? 'Active' : 'Inactive'}
        </span>
      </td>

      {/* Actions */}
      <td style={{ padding:'12px 16px',borderBottom:isLast?'none':`1px solid ${t.borderSubdued}`,textAlign:'right' }}>
        <button
          onClick={()=>onDelete(store.id, store.storeName)}
          disabled={deleting}
          style={{
            padding:'5px 12px',fontSize:12,fontWeight:500,cursor:deleting?'not-allowed':'pointer',
            border:`1px solid ${t.border}`,borderRadius:t.radiusSm,
            background:t.surface,color:t.red,
            fontFamily:'inherit',transition:'background .12s,border-color .12s',
          }}
          onMouseEnter={e=>{ (e.currentTarget as HTMLElement).style.background=t.redLight; (e.currentTarget as HTMLElement).style.borderColor=t.redBorder; }}
          onMouseLeave={e=>{ (e.currentTarget as HTMLElement).style.background=t.surface; (e.currentTarget as HTMLElement).style.borderColor=t.border; }}
        >
          Remove
        </button>
      </td>
    </tr>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────
function StoresPage() {
  const queryClient = useQueryClient();
  const [showAdd,    setShowAdd]    = useState(false);
  const [toast,      setToast]      = useState<{type:'success'|'error';title:string}|null>(null);
  const [confirmDel, setConfirmDel] = useState<{id:string;name:string}|null>(null);

  const { data: storesData, isLoading, error } = useQuery({
    queryKey: ['stores'],
    queryFn: async () => (await storeAPI.getAll()).data,
  });

  const stores: Store[] = storesData?.stores ?? [];

  const showToast = (type:'success'|'error', title:string) => {
    setToast({ type, title });
    setTimeout(()=>setToast(null), 4000);
  };

  const createMutation = useMutation({
    mutationFn: storeAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey:['stores'] });
      setShowAdd(false);
      showToast('success', 'Store connected successfully');
    },
    onError: (e:any) => showToast('error', e.response?.data?.error ?? e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: storeAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey:['stores'] });
      showToast('success', 'Store removed');
    },
    onError: (e:any) => showToast('error', e.response?.data?.error ?? e.message),
  });

  if (isLoading) return (
    <div style={{ padding:60,textAlign:'center',fontSize:13,color:'#6d7175',fontFamily:'"DM Sans",sans-serif' }}>Loading stores…</div>
  );
  if (error) return (
    <div style={{ padding:32,fontFamily:'"DM Sans",sans-serif' }}>
      <div style={{ background:'#fff4f4',border:'1px solid #fecaca',borderRadius:8,padding:'14px 18px',fontSize:13,color:'#d72c0d' }}>
        Failed to load stores: {(error as any).message}
      </div>
    </div>
  );

  return (
    <>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {toast && <Toast type={toast.type} title={toast.title} onClose={()=>setToast(null)} />}

      <ConfirmDialog
        show={!!confirmDel}
        storeName={confirmDel?.name ?? ''}
        onConfirm={() => { if (confirmDel) deleteMutation.mutate(confirmDel.id); setConfirmDel(null); }}
        onCancel={() => setConfirmDel(null)}
      />

      {showAdd && (
        <AddStoreModal
          onClose={()=>setShowAdd(false)}
          onSubmit={data=>createMutation.mutate(data)}
          loading={createMutation.isPending}
        />
      )}

      <div style={{ background:t.bg,minHeight:'100vh',padding:'24px',fontFamily:'"DM Sans","Helvetica Neue",sans-serif' }}>
        <div style={{ maxWidth:1100,margin:'0 auto' }}>

          {/* Page header */}
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20,flexWrap:'wrap',gap:12 }}>
            <div>
              <h2 style={{ margin:0,fontSize:22,fontWeight:650,color:t.text,letterSpacing:'-0.3px' }}>Stores</h2>
              <p style={{ margin:'3px 0 0',fontSize:14,color:t.textSubdued }}>
                {stores.length > 0 ? `${stores.length} store${stores.length !== 1 ? 's' : ''} connected` : 'No stores connected yet'}
              </p>
            </div>
            <button
              onClick={()=>setShowAdd(true)}
              style={{
                display:'inline-flex',alignItems:'center',gap:6,
                padding:'8px 16px',fontSize:13,fontWeight:600,
                border:'none',borderRadius:t.radiusSm,cursor:'pointer',
                background:t.text,color:'#fff',fontFamily:'inherit',
              }}
              onMouseEnter={e=>(e.currentTarget.style.background='#3a3d3f')}
              onMouseLeave={e=>(e.currentTarget.style.background=t.text)}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 1v10M1 6h10" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              Connect store
            </button>
          </div>

          {/* Table card */}
          <div style={{ background:t.surface,border:`1px solid ${t.border}`,borderRadius:t.radius,overflow:'hidden' }}>
            {stores.length === 0 ? (
              <div style={{ padding:'72px 24px',textAlign:'center' }}>
                <div style={{
                  width:52,height:52,borderRadius:12,background:t.greenLight,border:`1px solid ${t.greenBorder}`,
                  margin:'0 auto 16px',display:'flex',alignItems:'center',justifyContent:'center',
                }}>
                  <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
                    <path d="M3 7h14M3 7l1-4h12l1 4M3 7v10h14V7" stroke={t.green} strokeWidth="1.4" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div style={{ fontSize:15,fontWeight:600,color:t.text,marginBottom:6 }}>No stores connected</div>
                <div style={{ fontSize:13,color:t.textSubdued,marginBottom:20,maxWidth:360,margin:'0 auto 20px' }}>
                  Connect your first Shopify store to start managing orders across all your locations.
                </div>
                <button
                  onClick={()=>setShowAdd(true)}
                  style={{
                    display:'inline-flex',alignItems:'center',gap:6,
                    padding:'8px 18px',fontSize:13,fontWeight:600,
                    border:'none',borderRadius:t.radiusSm,cursor:'pointer',
                    background:t.text,color:'#fff',fontFamily:'inherit',
                  }}
                >
                  Connect your first store
                </button>
              </div>
            ) : (
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%',borderCollapse:'collapse',fontSize:13 }}>
                  <thead>
                    <tr style={{ background:'#fafbfb' }}>
                      {['Store','Domain','Currency','Status',''].map((h,i)=>(
                        <th key={i} style={{
                          padding:'9px 16px',textAlign:i===4?'right':'left',
                          fontSize:12,fontWeight:600,color:t.textSubdued,
                          borderBottom:`1px solid ${t.border}`,
                          letterSpacing:'0.02em',whiteSpace:'nowrap',
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stores.map((store, idx) => (
                      <StoreRow
                        key={store.id}
                        store={store}
                        onDelete={(id,name)=>setConfirmDel({id,name})}
                        deleting={deleteMutation.isPending}
                        isLast={idx === stores.length - 1}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}

export default StoresPage;