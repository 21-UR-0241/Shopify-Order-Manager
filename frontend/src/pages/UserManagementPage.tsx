
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userAPI } from '../api';
import { format } from 'date-fns';

interface User {
  id: string; email: string; userName: string | null;
  role: string; isActive: boolean; createdAt: string; updatedAt: string;
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
  width:'100%', padding:'8px 10px', fontSize:14, color:t.text,
  border:`1px solid ${t.border}`, borderRadius:t.radiusSm,
  background:t.surface, outline:'none', boxSizing:'border-box',
  fontFamily:'"DM Sans",sans-serif', transition:'border-color .15s',
};
const focus = (e: React.FocusEvent<any>) => (e.target.style.borderColor = t.blue);
const blur  = (e: React.FocusEvent<any>) => (e.target.style.borderColor = t.border);

// ─── Toast ────────────────────────────────────────────────────────────────
function Toast({ type, title, onClose }: { type:'success'|'error'; title:string; onClose:()=>void }) {
  const cfg = type==='success'
    ? { accent:t.green, bg:t.greenLight, border:t.greenBorder, dot:'✓' }
    : { accent:t.red,   bg:t.redLight,   border:t.redBorder,   dot:'✕' };
  return (
    <div style={{
      position:'fixed',bottom:24,right:24,zIndex:9999,
      background:t.surface,borderLeft:`4px solid ${cfg.accent}`,
      border:`1px solid ${cfg.border}`,borderRadius:t.radius,
      padding:'14px 18px',maxWidth:360,
      boxShadow:'0 6px 30px rgba(0,0,0,.12)',
      display:'flex',alignItems:'center',gap:10,
      fontFamily:'"DM Sans",sans-serif',animation:'slideToast .25s ease',
    }}>
      <style>{`@keyframes slideToast{from{transform:translateX(40px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
      <span style={{width:20,height:20,borderRadius:'50%',background:cfg.bg,color:cfg.accent,fontSize:11,fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{cfg.dot}</span>
      <span style={{flex:1,fontSize:13,fontWeight:600,color:t.text}}>{title}</span>
      <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:t.textDisabled,fontSize:18,lineHeight:1,padding:0}}>×</button>
    </div>
  );
}

// ─── Confirm dialog ───────────────────────────────────────────────────────
function ConfirmDialog({ show, message, onConfirm, onCancel }: {
  show:boolean; message:string; onConfirm:()=>void; onCancel:()=>void;
}) {
  if (!show) return null;
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.45)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999}} onClick={onCancel}>
      <div style={{background:t.surface,borderRadius:t.radius,width:400,border:`1px solid ${t.border}`,boxShadow:'0 20px 60px rgba(0,0,0,.2)',overflow:'hidden',fontFamily:'"DM Sans",sans-serif'}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:'16px 20px',borderBottom:`1px solid ${t.border}`}}>
          <div style={{fontSize:15,fontWeight:600,color:t.text}}>Remove user</div>
        </div>
        <div style={{padding:'14px 20px'}}>
          <p style={{margin:0,fontSize:13,color:t.textSubdued,lineHeight:1.6}}>{message}</p>
        </div>
        <div style={{padding:'12px 20px',borderTop:`1px solid ${t.border}`,display:'flex',justifyContent:'flex-end',gap:8,background:'#fafbfb'}}>
          <button onClick={onCancel} style={{padding:'7px 14px',fontSize:13,fontWeight:500,border:`1px solid ${t.border}`,borderRadius:t.radiusSm,background:t.surface,color:t.text,cursor:'pointer',fontFamily:'inherit'}}>Cancel</button>
          <button onClick={onConfirm} style={{padding:'7px 14px',fontSize:13,fontWeight:500,border:'none',borderRadius:t.radiusSm,background:t.red,color:'#fff',cursor:'pointer',fontFamily:'inherit'}}>Remove</button>
        </div>
      </div>
    </div>
  );
}

// ─── User modal ───────────────────────────────────────────────────────────
function UserModal({ editing, onClose, onSubmit, loading }: {
  editing: User|null; onClose:()=>void;
  onSubmit:(data:any)=>void; loading:boolean;
}) {
  const [form, setForm] = useState({
    email: editing?.email ?? '',
    password: '',
    userName: editing?.userName ?? '',
    role: (editing?.role ?? 'USER') as 'USER'|'ADMIN',
  });

  const set = (k:string) => (e:React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) =>
    setForm(p=>({...p,[k]:e.target.value}));

  const handleSubmit = (e:React.FormEvent) => {
    e.preventDefault();
    onSubmit(editing
      ? { email:form.email, userName:form.userName||null, role:form.role }
      : form
    );
  };

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.45)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999}} onClick={onClose}>
      <div style={{background:t.surface,borderRadius:t.radius,width:440,border:`1px solid ${t.border}`,boxShadow:'0 20px 60px rgba(0,0,0,.2)',overflow:'hidden',fontFamily:'"DM Sans",sans-serif'}} onClick={e=>e.stopPropagation()}>

        <div style={{padding:'16px 20px',borderBottom:`1px solid ${t.border}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{fontSize:15,fontWeight:600,color:t.text}}>{editing ? 'Edit user' : 'Add user'}</div>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:t.textDisabled,fontSize:20,lineHeight:1,padding:0}}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{padding:20,display:'flex',flexDirection:'column',gap:14}}>

            <div>
              <label style={{display:'block',fontSize:13,fontWeight:600,color:t.text,marginBottom:5}}>Email *</label>
              <input type="email" value={form.email} onChange={set('email')} placeholder="user@example.com" required style={inp} onFocus={focus} onBlur={blur} />
            </div>

            {!editing && (
              <div>
                <label style={{display:'block',fontSize:13,fontWeight:600,color:t.text,marginBottom:5}}>Password *</label>
                <input type="password" value={form.password} onChange={set('password')} placeholder="Minimum 6 characters" required minLength={6} style={inp} onFocus={focus} onBlur={blur} />
              </div>
            )}

            <div>
              <label style={{display:'block',fontSize:13,fontWeight:600,color:t.text,marginBottom:5}}>Display name</label>
              <input value={form.userName} onChange={set('userName')} placeholder="Jane Smith" style={inp} onFocus={focus} onBlur={blur} />
            </div>

            <div>
              <label style={{display:'block',fontSize:13,fontWeight:600,color:t.text,marginBottom:5}}>Role *</label>
              <select value={form.role} onChange={set('role')} required
                style={{...inp,background:`${t.surface} url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%236d7175'/%3E%3C/svg%3E") no-repeat right 10px center`,appearance:'none',paddingRight:28,cursor:'pointer'}}
                onFocus={focus} onBlur={blur}>
                <option value="USER">Member</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>

          </div>

          <div style={{padding:'12px 20px',borderTop:`1px solid ${t.border}`,display:'flex',justifyContent:'flex-end',gap:8,background:'#fafbfb'}}>
            <button type="button" onClick={onClose} style={{padding:'7px 14px',fontSize:13,fontWeight:500,border:`1px solid ${t.border}`,borderRadius:t.radiusSm,background:t.surface,color:t.text,cursor:'pointer',fontFamily:'inherit'}}>
              Cancel
            </button>
            <button type="submit" disabled={loading} style={{
              padding:'7px 16px',fontSize:13,fontWeight:600,border:'none',borderRadius:t.radiusSm,
              background:loading?t.textDisabled:t.text,color:'#fff',cursor:loading?'not-allowed':'pointer',
              fontFamily:'inherit',display:'inline-flex',alignItems:'center',gap:6,
            }}>
              {loading ? (
                <><span style={{width:12,height:12,border:'2px solid rgba(255,255,255,.3)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin .8s linear infinite',display:'inline-block'}} />Saving…</>
              ) : editing ? 'Save changes' : 'Create user'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Avatar initial ───────────────────────────────────────────────────────
function Avatar({ name, email }: { name:string|null; email:string }) {
  const ch = (name || email)[0].toUpperCase();
  const colors = ['#f1f8f5','#f0f6ff','#fff5ea','#f4f5fa','#fff4f4'];
  const idx = ch.charCodeAt(0) % colors.length;
  return (
    <div style={{
      width:30,height:30,borderRadius:'50%',flexShrink:0,
      background:colors[idx],border:`1px solid ${t.border}`,
      display:'flex',alignItems:'center',justifyContent:'center',
      fontSize:13,fontWeight:700,color:t.textSubdued,
    }}>{ch}</div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────
function UserManagementPage() {
  const queryClient = useQueryClient();
  const [showModal,  setShowModal]  = useState(false);
  const [editing,    setEditing]    = useState<User|null>(null);
  const [toast,      setToast]      = useState<{type:'success'|'error';title:string}|null>(null);
  const [confirmDel, setConfirmDel] = useState<string|null>(null);

  const { data:usersData, isLoading, error } = useQuery({
    queryKey:['users'],
    queryFn: async () => (await userAPI.getAll()).data,
  });
  const users:User[] = usersData?.users ?? [];

  const showToast = (type:'success'|'error', title:string) => {
    setToast({type,title});
    setTimeout(()=>setToast(null),4000);
  };

  const createMutation = useMutation({
    mutationFn: (data:any) => userAPI.create(data),
    onSuccess: () => { queryClient.invalidateQueries({queryKey:['users']}); setShowModal(false); showToast('success','User created'); },
    onError: (e:any) => showToast('error', e.response?.data?.error??e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({id,data}:{id:string;data:any}) => userAPI.update(id,data),
    onSuccess: () => { queryClient.invalidateQueries({queryKey:['users']}); setEditing(null); setShowModal(false); showToast('success','User updated'); },
    onError: (e:any) => showToast('error', e.response?.data?.error??e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id:string) => userAPI.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({queryKey:['users']}); showToast('success','User removed'); },
    onError: (e:any) => showToast('error', e.response?.data?.error??e.message),
  });

  const handleEdit = (user:User) => { setEditing(user); setShowModal(true); };
  const handleClose = () => { setShowModal(false); setEditing(null); };
  const handleSubmit = (data:any) => editing
    ? updateMutation.mutate({id:editing.id, data})
    : createMutation.mutate(data);

  if (isLoading) return <div style={{padding:60,textAlign:'center',fontSize:13,color:t.textSubdued,fontFamily:'"DM Sans",sans-serif'}}>Loading users…</div>;
  if (error)     return <div style={{padding:32,fontFamily:'"DM Sans",sans-serif'}}><div style={{background:t.redLight,border:`1px solid ${t.redBorder}`,borderRadius:t.radius,padding:'14px 18px',fontSize:13,color:t.red}}>Failed to load users.</div></div>;

  return (
    <>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {toast && <Toast type={toast.type} title={toast.title} onClose={()=>setToast(null)} />}

      <ConfirmDialog
        show={!!confirmDel}
        message="Are you sure you want to remove this user? This cannot be undone."
        onConfirm={()=>{ if(confirmDel) deleteMutation.mutate(confirmDel); setConfirmDel(null); }}
        onCancel={()=>setConfirmDel(null)}
      />

      {showModal && (
        <UserModal
          editing={editing} onClose={handleClose} onSubmit={handleSubmit}
          loading={createMutation.isPending || updateMutation.isPending}
        />
      )}

      <div style={{background:t.bg,minHeight:'100vh',padding:'24px',fontFamily:'"DM Sans","Helvetica Neue",sans-serif'}}>
        <div style={{maxWidth:1100,margin:'0 auto'}}>

          {/* Page header */}
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20,flexWrap:'wrap',gap:12}}>
            <div>
              <h2 style={{margin:0,fontSize:22,fontWeight:650,color:t.text,letterSpacing:'-0.3px'}}>Users</h2>
              <p style={{margin:'3px 0 0',fontSize:14,color:t.textSubdued}}>
                {users.length > 0 ? `${users.length} user${users.length!==1?'s':''}`:'No users yet'}
              </p>
            </div>
            <button onClick={()=>setShowModal(true)} style={{
              display:'inline-flex',alignItems:'center',gap:6,
              padding:'8px 16px',fontSize:13,fontWeight:600,
              border:'none',borderRadius:t.radiusSm,cursor:'pointer',
              background:t.text,color:'#fff',fontFamily:'inherit',
            }}
            onMouseEnter={e=>(e.currentTarget.style.background='#3a3d3f')}
            onMouseLeave={e=>(e.currentTarget.style.background=t.text)}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="white" strokeWidth="1.8" strokeLinecap="round"/></svg>
              Add user
            </button>
          </div>

          {/* Table */}
          <div style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:t.radius,overflow:'hidden'}}>
            {users.length===0 ? (
              <div style={{padding:'72px 24px',textAlign:'center'}}>
                <div style={{width:52,height:52,borderRadius:12,background:t.blueLight,border:`1px solid ${t.blueBorder}`,margin:'0 auto 16px',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <svg width="22" height="22" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="7" r="3" stroke={t.blue} strokeWidth="1.4"/><path d="M4 17c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke={t.blue} strokeWidth="1.4" strokeLinecap="round"/></svg>
                </div>
                <div style={{fontSize:15,fontWeight:600,color:t.text,marginBottom:6}}>No users yet</div>
                <div style={{fontSize:13,color:t.textSubdued,marginBottom:20}}>Click "Add user" to create the first account.</div>
                <button onClick={()=>setShowModal(true)} style={{padding:'8px 18px',fontSize:13,fontWeight:600,background:t.text,color:'#fff',border:'none',borderRadius:t.radiusSm,cursor:'pointer',fontFamily:'inherit'}}>
                  Add user
                </button>
              </div>
            ) : (
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                  <thead>
                    <tr style={{background:'#fafbfb'}}>
                      {['User','Email','Role','Status','Created',''].map((h,i)=>(
                        <th key={i} style={{padding:'9px 16px',textAlign:i===5?'right':'left',fontSize:12,fontWeight:600,color:t.textSubdued,borderBottom:`1px solid ${t.border}`,letterSpacing:'0.02em',whiteSpace:'nowrap'}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user,idx)=>{
                      const isLast = idx===users.length-1;
                      return (
                        <tr key={user.id}
                          style={{borderBottom:isLast?'none':`1px solid ${t.borderSubdued}`}}
                          onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='#fafbfb'}
                          onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background='transparent'}>

                          {/* User */}
                          <td style={{padding:'11px 16px'}}>
                            <div style={{display:'flex',alignItems:'center',gap:10}}>
                              <Avatar name={user.userName} email={user.email} />
                              <div style={{fontSize:14,fontWeight:600,color:t.text}}>{user.userName||'—'}</div>
                            </div>
                          </td>

                          {/* Email */}
                          <td style={{padding:'11px 16px'}}>
                            <span style={{fontSize:13,fontFamily:'monospace',color:t.textSubdued}}>{user.email}</span>
                          </td>

                          {/* Role */}
                          <td style={{padding:'11px 16px'}}>
                            <span style={{
                              fontSize:12,fontWeight:500,padding:'2px 9px',borderRadius:10,
                              background: user.role==='ADMIN' ? t.yellowLight : t.blueLight,
                              color:      user.role==='ADMIN' ? t.yellow      : t.blue,
                            }}>
                              {user.role==='ADMIN' ? 'Admin' : 'Member'}
                            </span>
                          </td>

                          {/* Status */}
                          <td style={{padding:'11px 16px'}}>
                            <span style={{
                              fontSize:12,fontWeight:500,padding:'2px 9px',borderRadius:10,
                              background: user.isActive ? t.greenLight : t.redLight,
                              color:      user.isActive ? t.green      : t.red,
                            }}>
                              {user.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>

                          {/* Created */}
                          <td style={{padding:'11px 16px',fontSize:13,color:t.textSubdued,whiteSpace:'nowrap'}}>
                            {format(new Date(user.createdAt),'MMM d, yyyy')}
                          </td>

                          {/* Actions */}
                          <td style={{padding:'11px 16px',textAlign:'right'}}>
                            <div style={{display:'flex',gap:6,justifyContent:'flex-end'}}>
                              <button onClick={()=>handleEdit(user)} style={{
                                padding:'5px 12px',fontSize:12,fontWeight:500,cursor:'pointer',
                                border:`1px solid ${t.border}`,borderRadius:t.radiusSm,
                                background:t.surface,color:t.text,fontFamily:'inherit',transition:'background .12s',
                              }}
                              onMouseEnter={e=>{ (e.currentTarget as HTMLElement).style.background=t.bg; }}
                              onMouseLeave={e=>{ (e.currentTarget as HTMLElement).style.background=t.surface; }}>
                                Edit
                              </button>
                              <button onClick={()=>setConfirmDel(user.id)} style={{
                                padding:'5px 12px',fontSize:12,fontWeight:500,cursor:'pointer',
                                border:`1px solid ${t.border}`,borderRadius:t.radiusSm,
                                background:t.surface,color:t.red,fontFamily:'inherit',transition:'all .12s',
                              }}
                              onMouseEnter={e=>{ (e.currentTarget as HTMLElement).style.background=t.redLight; (e.currentTarget as HTMLElement).style.borderColor=t.redBorder; }}
                              onMouseLeave={e=>{ (e.currentTarget as HTMLElement).style.background=t.surface; (e.currentTarget as HTMLElement).style.borderColor=t.border; }}>
                                Remove
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
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

export default UserManagementPage;