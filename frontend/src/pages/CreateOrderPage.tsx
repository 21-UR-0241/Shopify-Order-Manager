



import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storeAPI, orderAPI } from '../api';

// ─── Types ────────────────────────────────────────────────────────────────
interface LineItem {
  id: string; title: string; variant_title: string;
  quantity: number; price: string; sku: string;
  product_id?: string; variant_id?: string;
}
interface ShopifyProduct {
  id: string; title: string;
  variants: Array<{ id:string; title:string; price:string; sku:string; inventory_quantity:number }>;
  image?: { src: string };
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
  yellow:       '#b98900', yellowLight:'#fff5ea', yellowBorder:'#ffc453',
  blue:         '#0070f3', blueLight:  '#f0f6ff', blueBorder:  '#c7dff7',
  purple:       '#5c6ac4',
  radius:       '8px',
  radiusSm:     '6px',
};

const inp: React.CSSProperties = {
  width:'100%', padding:'8px 10px', fontSize:13, color:t.text,
  border:`1px solid ${t.border}`, borderRadius:t.radiusSm,
  background:t.surface, outline:'none', boxSizing:'border-box',
  fontFamily:'"DM Sans",sans-serif', transition:'border-color .15s',
};
const focus = (e: React.FocusEvent<any>) => (e.target.style.borderColor = t.blue);
const blur  = (e: React.FocusEvent<any>) => (e.target.style.borderColor = t.border);

// ─── Toast ────────────────────────────────────────────────────────────────
function Toast({ type, title, message, onClose }: {
  type:'success'|'error'|'warning'; title:string; message?:string; onClose:()=>void;
}) {
  const cfg = {
    success: { accent:t.green,  bg:t.greenLight,  border:t.greenBorder,  dot:'✓' },
    error:   { accent:t.red,    bg:t.redLight,    border:t.redBorder,    dot:'✕' },
    warning: { accent:t.yellow, bg:t.yellowLight, border:t.yellowBorder, dot:'!' },
  }[type];
  return (
    <div style={{
      position:'fixed',bottom:24,right:24,zIndex:9999,
      background:t.surface, borderLeft:`4px solid ${cfg.accent}`,
      border:`1px solid ${cfg.border}`,borderRadius:t.radius,
      padding:'14px 18px',maxWidth:380,
      boxShadow:'0 6px 30px rgba(0,0,0,.12)',
      display:'flex',alignItems:'flex-start',gap:10,
      fontFamily:'"DM Sans",sans-serif',
      animation:'slideToast .25s ease',
    }}>
      <style>{`@keyframes slideToast{from{transform:translateX(40px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
      <span style={{width:20,height:20,borderRadius:'50%',background:cfg.bg,color:cfg.accent,fontSize:11,fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:1}}>{cfg.dot}</span>
      <div style={{flex:1}}>
        <div style={{fontSize:13,fontWeight:600,color:t.text}}>{title}</div>
        {message && <div style={{fontSize:12,color:t.textSubdued,marginTop:3,whiteSpace:'pre-line',lineHeight:1.5}}>{message}</div>}
      </div>
      <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:t.textDisabled,fontSize:18,lineHeight:1,padding:0,flexShrink:0}}>×</button>
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────
function Section({ title, children }: { title:string; children:React.ReactNode }) {
  return (
    <div style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:t.radius,overflow:'hidden',marginBottom:12}}>
      <div style={{padding:'10px 16px',borderBottom:`1px solid ${t.border}`,background:'#fafbfb'}}>
        <div style={{fontSize:13,fontWeight:600,color:t.text}}>{title}</div>
      </div>
      <div style={{padding:16}}>{children}</div>
    </div>
  );
}

// ─── Field ────────────────────────────────────────────────────────────────
function Field({ label, hint, span, children }: { label:string; hint?:string; span?:boolean; children:React.ReactNode }) {
  return (
    <div style={{gridColumn:span?'1 / -1':undefined,display:'flex',flexDirection:'column',gap:4}}>
      <label style={{fontSize:12,fontWeight:600,color:t.textSubdued,letterSpacing:'0.02em'}}>{label}</label>
      {children}
      {hint && <div style={{fontSize:11,color:t.textDisabled}}>{hint}</div>}
    </div>
  );
}

// ─── Grid ─────────────────────────────────────────────────────────────────
function Grid({ cols=2, children }: { cols?:number; children:React.ReactNode }) {
  return <div style={{display:'grid',gridTemplateColumns:`repeat(${cols},1fr)`,gap:10}}>{children}</div>;
}

// ─── Product dropdown ─────────────────────────────────────────────────────
function ProductDropdown({ products, onSelect, selectedTitle }: {
  products:ShopifyProduct[]; onSelect:(pid:string,vid:string)=>void; selectedTitle:string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e:MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const filtered = (search.trim()
    ? products.filter(p => p.title.toLowerCase().includes(search.toLowerCase()) || p.variants.some(v => v.sku?.toLowerCase().includes(search.toLowerCase())))
    : products
  ).slice(0, 15);

  return (
    <div ref={ref} style={{position:'relative'}}>
      <button type="button" onClick={()=>setOpen(v=>!v)} style={{
        width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',
        padding:'8px 10px',background:t.surface,border:`1px solid ${t.border}`,
        borderRadius:t.radiusSm,cursor:'pointer',fontSize:13,
        color:selectedTitle?t.text:t.textDisabled,fontFamily:'"DM Sans",sans-serif',
        transition:'border-color .15s',
      }}
      onFocus={focus} onBlur={blur}>
        <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'92%'}}>
          {selectedTitle || 'Search or select a product…'}
        </span>
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{flexShrink:0,opacity:.5,transform:open?'rotate(180deg)':'none',transition:'transform .15s'}}>
          <path d="M1 1l4 4 4-4" stroke={t.textSubdued} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && (
        <div style={{
          position:'absolute',top:'calc(100% + 4px)',left:0,right:0,
          background:t.surface,border:`1px solid ${t.border}`,borderRadius:t.radius,
          boxShadow:'0 8px 30px rgba(0,0,0,.1)',zIndex:999,overflow:'hidden',
        }}>
          <div style={{padding:8,borderBottom:`1px solid ${t.borderSubdued}`}}>
            <input autoFocus type="text" value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Search by name or SKU…" onClick={e=>e.stopPropagation()}
              style={{...inp,padding:'6px 9px'}} onFocus={focus} onBlur={blur} />
          </div>
          <div style={{maxHeight:240,overflowY:'auto'}}>
            {filtered.length===0 ? (
              <div style={{padding:12,textAlign:'center',color:t.textDisabled,fontSize:13}}>No products found</div>
            ) : filtered.map(product => product.variants.map(variant => (
              <div key={`${product.id}-${variant.id}`}
                onClick={()=>{onSelect(product.id,variant.id);setOpen(false);setSearch('');}}
                style={{padding:'9px 12px',cursor:'pointer',borderBottom:`1px solid ${t.borderSubdued}`}}
                onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background=t.bg}
                onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background='transparent'}>
                <div style={{fontSize:13,fontWeight:600,color:t.text,marginBottom:2}}>
                  {product.title}
                  {variant.title!=='Default Title' && <span style={{fontWeight:400,color:t.textSubdued}}> — {variant.title}</span>}
                </div>
                <div style={{display:'flex',gap:10,fontSize:12,color:t.textSubdued}}>
                  <span>${parseFloat(variant.price).toFixed(2)}</span>
                  {variant.sku && <span>SKU: {variant.sku}</span>}
                  <span>Stock: {variant.inventory_quantity}</span>
                </div>
              </div>
            )))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Line item card ───────────────────────────────────────────────────────
function LineItemCard({ item, idx, products, showProductSearch, onChange, onRemove, canRemove }: {
  item:LineItem; idx:number; products:ShopifyProduct[]; showProductSearch:boolean;
  onChange:(id:string,field:keyof LineItem,val:any)=>void;
  onRemove:(id:string)=>void; canRemove:boolean;
}) {
  const lineTotal = ((parseFloat(item.price)||0) * (parseInt(String(item.quantity))||0)).toFixed(2);
  return (
    <div style={{border:`1px solid ${t.border}`,borderRadius:t.radiusSm,overflow:'hidden',marginBottom:8}}>
      {/* Card header */}
      <div style={{padding:'9px 12px',background:'#fafbfb',borderBottom:`1px solid ${t.border}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <span style={{fontSize:12,fontWeight:600,color:t.textSubdued}}>Item {idx+1}</span>
        {canRemove && (
          <button onClick={()=>onRemove(item.id)} style={{
            fontSize:12,color:t.red,background:'none',border:'none',cursor:'pointer',
            padding:'2px 6px',fontFamily:'inherit',
          }}>Remove</button>
        )}
      </div>
      <div style={{padding:12}}>
        {showProductSearch && products.length>0 && (
          <div style={{marginBottom:10}}>
            <Field label="Product">
              <ProductDropdown
                products={products}
                onSelect={(pid,vid)=>{
                  const p=products.find(x=>x.id===pid);
                  const v=p?.variants.find(x=>x.id===vid);
                  if(!p||!v) return;
                  onChange(item.id,'title',p.title);
                  onChange(item.id,'variant_title',v.title!=='Default Title'?v.title:'');
                  onChange(item.id,'price',v.price);
                  onChange(item.id,'sku',v.sku||'');
                  onChange(item.id,'product_id',pid);
                  onChange(item.id,'variant_id',vid);
                }}
                selectedTitle={item.title?(item.variant_title?`${item.title} — ${item.variant_title}`:item.title):''}
              />
            </Field>
          </div>
        )}
        <Grid cols={2}>
          <Field label="Title *">
            <input value={item.title} onChange={e=>onChange(item.id,'title',e.target.value)}
              placeholder="Product name" style={inp} onFocus={focus} onBlur={blur} />
          </Field>
          <Field label="Variant">
            <input value={item.variant_title} onChange={e=>onChange(item.id,'variant_title',e.target.value)}
              placeholder="Large / Blue" style={inp} onFocus={focus} onBlur={blur} />
          </Field>
          <Field label="SKU">
            <input value={item.sku} onChange={e=>onChange(item.id,'sku',e.target.value)}
              placeholder="TSH-001-L" style={inp} onFocus={focus} onBlur={blur} />
          </Field>
          <Field label="Qty *">
            <input type="number" min="1" value={item.quantity}
              onChange={e=>onChange(item.id,'quantity',parseInt(e.target.value)||1)}
              style={inp} onFocus={focus} onBlur={blur} />
          </Field>
          <Field label="Unit price *">
            <input type="number" step="0.01" min="0" placeholder="0.00" value={item.price}
              onChange={e=>onChange(item.id,'price',e.target.value)}
              style={inp} onFocus={focus} onBlur={blur} />
          </Field>
          <Field label="Line total">
            <div style={{
              padding:'8px 10px',background:t.greenLight,border:`1px solid ${t.greenBorder}`,
              borderRadius:t.radiusSm,fontSize:14,fontWeight:700,color:t.green,
            }}>
              ${lineTotal}
            </div>
          </Field>
        </Grid>
      </div>
    </div>
  );
}

// ─── Address fields ───────────────────────────────────────────────────────
function AddressFields({ value, onChange }: {
  value:Record<string,string>; onChange:(k:string,v:string)=>void;
}) {
  return (
    <Grid cols={2}>
      <Field label="Address line 1" span>
        <input value={value.address1} onChange={e=>onChange('address1',e.target.value)}
          placeholder="123 Main Street" style={inp} onFocus={focus} onBlur={blur} />
      </Field>
      <Field label="Address line 2" span>
        <input value={value.address2} onChange={e=>onChange('address2',e.target.value)}
          placeholder="Apt 4B" style={inp} onFocus={focus} onBlur={blur} />
      </Field>
      <Field label="City">
        <input value={value.city} onChange={e=>onChange('city',e.target.value)}
          placeholder="New York" style={inp} onFocus={focus} onBlur={blur} />
      </Field>
      <Field label="State / Province">
        <input value={value.province} onChange={e=>onChange('province',e.target.value)}
          placeholder="NY" style={inp} onFocus={focus} onBlur={blur} />
      </Field>
      <Field label="Country">
        <input value={value.country} onChange={e=>onChange('country',e.target.value)}
          placeholder="United States" style={inp} onFocus={focus} onBlur={blur} />
      </Field>
      <Field label="ZIP / Postal code">
        <input value={value.zip} onChange={e=>onChange('zip',e.target.value)}
          placeholder="10001" style={inp} onFocus={focus} onBlur={blur} />
      </Field>
    </Grid>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────
function CreateOrderPage() {
  const navigate = useNavigate();
  const { storeId } = useParams<{ storeId?:string }>();
  const queryClient = useQueryClient();

  const [selectedStore,  setSelectedStore]  = useState(storeId||'');
  const [customer,       setCustomer]       = useState({ email:'', first_name:'', last_name:'', phone:'' });
  const [shipping,       setShipping]       = useState({ address1:'', address2:'', city:'', province:'', country:'', zip:'' });
  const [billing,        setBilling]        = useState({ address1:'', address2:'', city:'', province:'', country:'', zip:'' });
  const [sameAddr,       setSameAddr]       = useState(true);
  const [lineItems,      setLineItems]      = useState<LineItem[]>([{ id:Date.now().toString(), title:'', variant_title:'', quantity:1, price:'', sku:'' }]);
  const [orderInfo,      setOrderInfo]      = useState({ note:'', tags:'', email_customer:false, tax_exempt:false });
  const [toast,          setToast]          = useState<{type:'success'|'error'|'warning';title:string;message?:string}|null>(null);

  const showToast = (type:'success'|'error'|'warning', title:string, message?:string) => {
    setToast({type,title,message});
    if(type!=='error') setTimeout(()=>setToast(null),5000);
  };

  const { data:storesData, isLoading:storesLoading } = useQuery({
    queryKey:['stores'],
    queryFn: async () => (await storeAPI.getAll()).data,
  });
  const stores = storesData?.stores ?? [];

  const { data:productsData, isLoading:productsLoading } = useQuery({
    queryKey:['products',selectedStore],
    queryFn: async () => selectedStore ? (await orderAPI.getProducts(selectedStore)).data : null,
    enabled: !!selectedStore,
  });
  const products:ShopifyProduct[] = productsData?.products ?? [];

  const createMutation = useMutation({
    mutationFn: (data:any) => orderAPI.createDraft(selectedStore, data),
    onSuccess: (r) => {
      queryClient.invalidateQueries({ queryKey:['orders'] });
      const d = r.data.draftOrder;
      showToast('success','Draft order created',`Order ${d.name} created — redirecting to orders…`);
      setTimeout(()=>navigate('/orders'), 1800);
    },
    onError: (e:any) => showToast('error','Failed to create order', e.response?.data?.error??e.message),
  });

  const updateItem = (id:string, field:keyof LineItem, val:any) =>
    setLineItems(prev => prev.map(i => i.id===id ? {...i,[field]:val} : i));

  const subtotal = lineItems.reduce((s,i) => s + (parseFloat(i.price)||0) * (parseInt(String(i.quantity))||0), 0);

  const handleSubmit = () => {
    if (!selectedStore) { showToast('warning','Select a store','Please select a store before creating an order.'); return; }
    if (!customer.email) { showToast('warning','Email required','Please enter a customer email address.'); return; }
    const valid = lineItems.filter(i => i.title && i.price && i.quantity>0);
    if (!valid.length) { showToast('warning','Add items','Please add at least one item with a title, price, and quantity.'); return; }
    createMutation.mutate({
      line_items: valid.map(i=>({ title:i.title, variant_title:i.variant_title||undefined, quantity:parseInt(String(i.quantity)), price:i.price, sku:i.sku||undefined, variant_id:i.variant_id||undefined })),
      customer: { email:customer.email, first_name:customer.first_name||undefined, last_name:customer.last_name||undefined, phone:customer.phone||undefined },
      shipping_address: shipping.address1 ? {...shipping} : undefined,
      billing_address: sameAddr ? undefined : billing.address1 ? {...billing} : undefined,
      note: orderInfo.note||undefined, tags:orderInfo.tags||undefined,
      email: orderInfo.email_customer, tax_exempt: orderInfo.tax_exempt,
    });
  };

  if (storesLoading) return (
    <div style={{padding:60,textAlign:'center',fontSize:13,color:t.textSubdued,fontFamily:'"DM Sans",sans-serif'}}>Loading…</div>
  );

  if (!stores.length) return (
    <div style={{maxWidth:360,margin:'60px auto',textAlign:'center',fontFamily:'"DM Sans",sans-serif'}}>
      <div style={{width:48,height:48,borderRadius:12,background:t.greenLight,border:`1px solid ${t.greenBorder}`,margin:'0 auto 16px',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <svg width="22" height="22" viewBox="0 0 20 20" fill="none"><path d="M3 7h14M3 7l1-4h12l1 4M3 7v10h14V7" stroke={t.green} strokeWidth="1.4" strokeLinejoin="round"/></svg>
      </div>
      <div style={{fontSize:15,fontWeight:600,color:t.text,marginBottom:6}}>No stores connected</div>
      <div style={{fontSize:13,color:t.textSubdued,marginBottom:20}}>Connect a Shopify store first to create orders.</div>
      <button onClick={()=>navigate('/stores')} style={{padding:'8px 18px',fontSize:13,fontWeight:600,background:t.text,color:'#fff',border:'none',borderRadius:t.radiusSm,cursor:'pointer',fontFamily:'inherit'}}>
        Go to Stores
      </button>
    </div>
  );

  return (
    <>
      {toast && <Toast {...toast} onClose={()=>setToast(null)} />}

      <div style={{background:t.bg,minHeight:'100vh',padding:'24px',fontFamily:'"DM Sans","Helvetica Neue",sans-serif'}}>
        <div style={{maxWidth:820,margin:'0 auto'}}>

          {/* Header */}
          <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20,flexWrap:'wrap'}}>
            <button onClick={()=>navigate('/orders')} style={{
              display:'inline-flex',alignItems:'center',gap:5,
              padding:'6px 10px',fontSize:12,fontWeight:500,
              border:`1px solid ${t.border}`,borderRadius:t.radiusSm,
              background:t.surface,color:t.textSubdued,cursor:'pointer',fontFamily:'inherit',
            }}>
              <svg width="13" height="13" viewBox="0 0 20 20" fill="none"><path d="M13 4l-6 6 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Orders
            </button>
            <div>
              <h2 style={{margin:0,fontSize:20,fontWeight:650,color:t.text,letterSpacing:'-0.3px'}}>Create draft order</h2>
              <p style={{margin:'3px 0 0',fontSize:13,color:t.textSubdued}}>Fill in the details below to create a Shopify draft order</p>
            </div>
          </div>

          {/* ── Store ── */}
          <Section title="Store">
            <Field label="Select store *">
              <select value={selectedStore} onChange={e=>setSelectedStore(e.target.value)}
                style={{...inp,background:`${t.surface} url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%236d7175'/%3E%3C/svg%3E") no-repeat right 10px center`,appearance:'none',paddingRight:28,cursor:'pointer'}}
                onFocus={focus} onBlur={blur}>
                <option value="">— Choose a store —</option>
                {stores.map((s:any) => <option key={s.id} value={s.id}>{s.storeName}</option>)}
              </select>
            </Field>
            {selectedStore && (
              <div style={{marginTop:8,fontSize:12,color:productsLoading?t.textSubdued:t.green,fontWeight:productsLoading?400:500}}>
                {productsLoading ? 'Loading products…' : `${products.length} products available`}
              </div>
            )}
          </Section>

          {/* ── Customer ── */}
          <Section title="Customer">
            <Grid cols={2}>
              <Field label="Email *">
                <input type="email" placeholder="customer@example.com" value={customer.email}
                  onChange={e=>setCustomer(p=>({...p,email:e.target.value}))} style={inp} onFocus={focus} onBlur={blur} />
              </Field>
              <Field label="Phone">
                <input type="tel" placeholder="+1 555 000 0000" value={customer.phone}
                  onChange={e=>setCustomer(p=>({...p,phone:e.target.value}))} style={inp} onFocus={focus} onBlur={blur} />
              </Field>
              <Field label="First name">
                <input placeholder="John" value={customer.first_name}
                  onChange={e=>setCustomer(p=>({...p,first_name:e.target.value}))} style={inp} onFocus={focus} onBlur={blur} />
              </Field>
              <Field label="Last name">
                <input placeholder="Doe" value={customer.last_name}
                  onChange={e=>setCustomer(p=>({...p,last_name:e.target.value}))} style={inp} onFocus={focus} onBlur={blur} />
              </Field>
            </Grid>
          </Section>

          {/* ── Line items ── */}
          <Section title="Line items">
            {lineItems.map((item,idx) => (
              <LineItemCard
                key={item.id} item={item} idx={idx}
                products={products} showProductSearch={!!selectedStore}
                onChange={updateItem}
                onRemove={id=>setLineItems(prev=>prev.filter(i=>i.id!==id))}
                canRemove={lineItems.length>1}
              />
            ))}

            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:4,flexWrap:'wrap',gap:10}}>
              <button onClick={()=>setLineItems(p=>[...p,{id:Date.now().toString(),title:'',variant_title:'',quantity:1,price:'',sku:''}])}
                style={{
                  display:'inline-flex',alignItems:'center',gap:5,
                  padding:'7px 12px',fontSize:13,fontWeight:500,
                  border:`1px solid ${t.border}`,borderRadius:t.radiusSm,
                  background:t.surface,color:t.text,cursor:'pointer',fontFamily:'inherit',
                }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                Add item
              </button>

              <div style={{
                display:'flex',alignItems:'center',gap:12,padding:'10px 16px',
                background:t.bg,border:`1px solid ${t.border}`,borderRadius:t.radiusSm,
              }}>
                <span style={{fontSize:13,color:t.textSubdued,fontWeight:500}}>Subtotal</span>
                <span style={{fontSize:18,fontWeight:700,color:t.green}}>${subtotal.toFixed(2)}</span>
              </div>
            </div>
            <div style={{fontSize:11,color:t.textDisabled,marginTop:6}}>Taxes and shipping calculated by Shopify at checkout.</div>
          </Section>

          {/* ── Shipping ── */}
          <Section title="Shipping address">
            <AddressFields value={shipping} onChange={(k,v)=>setShipping(p=>({...p,[k]:v}))} />
          </Section>

          {/* ── Billing ── */}
          <Section title="Billing address">
            <label style={{display:'flex',alignItems:'center',gap:8,fontSize:13,cursor:'pointer',marginBottom:sameAddr?0:14}}>
              <input type="checkbox" checked={sameAddr} onChange={e=>setSameAddr(e.target.checked)} style={{accentColor:t.purple,cursor:'pointer'}} />
              Same as shipping address
            </label>
            {!sameAddr && <AddressFields value={billing} onChange={(k,v)=>setBilling(p=>({...p,[k]:v}))} />}
          </Section>

          {/* ── Additional ── */}
          <Section title="Additional info">
            <div style={{marginBottom:14}}>
              <Field label="Internal notes" hint="Not visible to customers.">
                <textarea value={orderInfo.note} onChange={e=>setOrderInfo(p=>({...p,note:e.target.value}))}
                  placeholder="Private notes…" rows={2}
                  style={{...inp,resize:'vertical',minHeight:70}}
                  onFocus={focus} onBlur={blur} />
              </Field>
            </div>
            <div style={{marginBottom:14}}>
              <Field label="Tags" hint="Separate with commas.">
                <input value={orderInfo.tags} onChange={e=>setOrderInfo(p=>({...p,tags:e.target.value}))}
                  placeholder="draft, custom, wholesale" style={inp} onFocus={focus} onBlur={blur} />
              </Field>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {[
                {k:'email_customer',label:'Send invoice to customer'},
                {k:'tax_exempt',    label:'Customer is tax exempt'},
              ].map(({k,label})=>(
                <label key={k} style={{display:'flex',alignItems:'center',gap:8,fontSize:13,cursor:'pointer',color:t.text}}>
                  <input type="checkbox" checked={(orderInfo as any)[k]} onChange={e=>setOrderInfo(p=>({...p,[k]:e.target.checked}))} style={{accentColor:t.purple,cursor:'pointer'}} />
                  {label}
                </label>
              ))}
            </div>
          </Section>

          {/* ── Footer actions ── */}
          <div style={{
            background:t.surface,border:`1px solid ${t.border}`,borderRadius:t.radius,
            padding:'14px 20px',display:'flex',justifyContent:'flex-end',gap:10,
          }}>
            <button onClick={()=>navigate('/orders')} disabled={createMutation.isPending}
              style={{padding:'8px 16px',fontSize:13,fontWeight:500,border:`1px solid ${t.border}`,borderRadius:t.radiusSm,background:t.surface,color:t.text,cursor:'pointer',fontFamily:'inherit'}}>
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={createMutation.isPending}
              style={{
                padding:'8px 20px',fontSize:13,fontWeight:600,border:'none',borderRadius:t.radiusSm,
                background:createMutation.isPending?t.textDisabled:t.text,
                color:'#fff',cursor:createMutation.isPending?'not-allowed':'pointer',fontFamily:'inherit',
                display:'inline-flex',alignItems:'center',gap:7,
              }}>
              {createMutation.isPending ? (
                <>
                  <span style={{width:13,height:13,border:'2px solid rgba(255,255,255,.3)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin .8s linear infinite',display:'inline-block'}} />
                  Creating…
                </>
              ) : 'Create draft order'}
            </button>
          </div>

        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </>
  );
}

export default CreateOrderPage;
