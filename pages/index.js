import { useState, useEffect, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid } from "recharts";

const QUARTERS = ["Q1 2025","Q2 2025","Q3 2025","Q4 2025","Q1 2026","Q2 2026","Q3 2026","Q4 2026"];
const CATS = ["Pre Vendas","PoC","Treinamento","Reunião","Suporte","Evento","Closed Won"];
const CAT_ICONS = {"Pre Vendas":"📋","PoC":"🔬","Treinamento":"🎓","Reunião":"🤝","Suporte":"🛠️","Evento":"🎯","Closed Won":"🏆"};
const ETAPAS = ["Spec-In","BOM","BID"];
const ETAPA_COLOR = {"Spec-In":"#3B82F6","BOM":"#8B5CF6","BID":"#EAB308"};
const STATUS_LIST = ["Em Andamento","Concluído","Suspenso"];
const STATUS_COLOR = {"Em Andamento":"#F97316","Concluído":"#10B981","Suspenso":"#EF4444"};
const CAT_COLOR = {"Pre Vendas":"#3B82F6","PoC":"#F97316","Treinamento":"#10B981","Reunião":"#8B5CF6","Suporte":"#EAB308","Evento":"#EC4899","Closed Won":"#EF4444"};

async function apiFetch(path, opts={}) {
  const r = await fetch(path, {headers:{"Content-Type":"application/json"},...opts});
  if (!r.ok) { const e = await r.json(); throw new Error(e.error||r.statusText); }
  return r.json();
}
const loadActivities = q => apiFetch(`/api/activities?quarter=${encodeURIComponent(q)}`);
const createActivity = d => apiFetch("/api/activities",{method:"POST",body:JSON.stringify(d)});
const updateActivity = (id,d) => apiFetch(`/api/activities/${id}`,{method:"PUT",body:JSON.stringify(d)});
const deleteActivity = id => apiFetch(`/api/activities/${id}`,{method:"DELETE"});

const fmt = v => !v?"—":v>=1000000?`R$${(v/1000000).toFixed(1)}M`:v>=1000?`R$${(v/1000).toFixed(0)}k`:`R$${Number(v).toFixed(0)}`;
const Tag = ({label,color}) => <span style={{background:color+"22",color,borderRadius:5,padding:"2px 8px",fontSize:11,fontWeight:700,whiteSpace:"nowrap"}}>{label}</span>;
const Tip = ({active,payload,label}) => {
  if (!active||!payload?.length) return null;
  return <div style={{background:"#1E293B",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#fff"}}>
    <div style={{fontWeight:700,marginBottom:4}}>{label}</div>
    {payload.map((p,i)=><div key={i} style={{color:p.color||"#fff"}}>{p.name}: {p.value}</div>)}
  </div>;
};

const Modal = ({entry,onSave,onClose,defaultQuarter}) => {
  const isEdit = !!entry?.id;
  const blank = {Atividade:"",Categoria:"Pre Vendas",Etapa:"BOM",Status:"Em Andamento","Cliente Final":"",Integrador:"",Quarter:defaultQuarter,"Valor (R$)":"","Meta Quarter (R$)":"",Data:"",Observações:""};
  const [form,setForm] = useState(isEdit?{...entry}:blank);
  const [saving,setSaving] = useState(false);
  const set = (k,v) => setForm(f=>{
    const n={...f,[k]:v};
    if (k==="Categoria"&&v!=="Pre Vendas") n.Etapa="";
    if (k==="Categoria"&&v==="Pre Vendas") n.Etapa="BOM";
    return n;
  });
  const inp = {width:"100%",padding:"8px 10px",borderRadius:8,border:"1px solid #E2E8F0",fontSize:13,color:"#1E293B",background:"#F8FAFC",outline:"none",boxSizing:"border-box"};
  const lbl = {fontSize:11,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:"0.05em",display:"block",marginBottom:4};
  const save = async () => {
    if (!form.Atividade.trim()) return alert("Informe o título.");
    setSaving(true); await onSave(form); setSaving(false);
  };
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.55)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:"#fff",borderRadius:16,width:"100%",maxWidth:520,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 24px 64px rgba(0,0,0,0.2)"}}>
        <div style={{padding:"20px 24px 16px",borderBottom:"1px solid #F1F5F9",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:15,fontWeight:700,color:"#0F172A"}}>{isEdit?"Editar":"Nova Atividade"}</span>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:22,color:"#94A3B8"}}>×</button>
        </div>
        <div style={{padding:"20px 24px",display:"flex",flexDirection:"column",gap:14}}>
          <div><label style={lbl}>Título</label><input style={inp} value={form.Atividade} onChange={e=>set("Atividade",e.target.value)} placeholder="Ex: BOM — Prefeitura Cubatão"/></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div><label style={lbl}>Categoria</label>
              <select style={inp} value={form.Categoria} onChange={e=>set("Categoria",e.target.value)}>
                {CATS.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Etapa</label>
              {form.Categoria==="Pre Vendas"
                ? <select style={inp} value={form.Etapa} onChange={e=>set("Etapa",e.target.value)}>{ETAPAS.map(e=><option key={e}>{e}</option>)}</select>
                : <select style={{...inp,opacity:0.4,cursor:"not-allowed"}} disabled><option>— N/A —</option></select>}
            </div>
          </div>
          <div><label style={lbl}>Status</label>
            <div style={{display:"flex",gap:8}}>
              {STATUS_LIST.map(s=>(
                <button key={s} onClick={()=>set("Status",s)} style={{flex:1,padding:"8px 4px",borderRadius:8,border:`2px solid ${form.Status===s?STATUS_COLOR[s]:"#E2E8F0"}`,background:form.Status===s?STATUS_COLOR[s]+"18":"#fff",color:form.Status===s?STATUS_COLOR[s]:"#94A3B8",cursor:"pointer",fontSize:12,fontWeight:700}}>{s}</button>
              ))}
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div><label style={lbl}>Cliente Final</label><input style={inp} value={form["Cliente Final"]} onChange={e=>set("Cliente Final",e.target.value)} placeholder="Ex: Prefeitura Cubatão"/></div>
            <div><label style={lbl}>Integrador</label><input style={inp} value={form.Integrador} onChange={e=>set("Integrador",e.target.value)} placeholder="Ex: ARC Soluções"/></div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
            <div><label style={lbl}>Quarter</label>
              <select style={inp} value={form.Quarter} onChange={e=>set("Quarter",e.target.value)}>{QUARTERS.map(q=><option key={q}>{q}</option>)}</select>
            </div>
            <div><label style={lbl}>{form.Categoria==="Closed Won"?"Valor Realizado":"Valor (R$)"}</label>
              <input style={inp} type="number" value={form["Valor (R$)"]} onChange={e=>set("Valor (R$)",e.target.value)} placeholder="0"/>
            </div>
            <div><label style={lbl}>Data</label><input style={inp} type="date" value={form.Data} onChange={e=>set("Data",e.target.value)}/></div>
          </div>
          {form.Categoria==="Closed Won"&&<div><label style={lbl}>Meta Quarter (R$)</label><input style={inp} type="number" value={form["Meta Quarter (R$)"]} onChange={e=>set("Meta Quarter (R$)",e.target.value)}/></div>}
          <div><label style={lbl}>Observações</label><textarea style={{...inp,resize:"vertical",minHeight:60}} value={form.Observações} onChange={e=>set("Observações",e.target.value)}/></div>
        </div>
        <div style={{padding:"0 24px 20px",display:"flex",gap:10,justifyContent:"flex-end"}}>
          <button onClick={onClose} style={{padding:"9px 18px",borderRadius:8,border:"1px solid #E2E8F0",background:"#fff",color:"#64748B",cursor:"pointer",fontSize:13,fontWeight:600}}>Cancelar</button>
          <button onClick={save} disabled={saving} style={{padding:"9px 18px",borderRadius:8,border:"none",background:saving?"#94A3B8":"#1E293B",color:"#fff",cursor:saving?"not-allowed":"pointer",fontSize:13,fontWeight:600}}>{saving?"Salvando...":isEdit?"Salvar":"Adicionar"}</button>
        </div>
      </div>
    </div>
  );
};

const KanbanView = ({activities}) => {
  const cols = [
    {label:"📋 Pre Vendas",items:activities.filter(a=>a.Categoria==="Pre Vendas"&&a.Status==="Em Andamento"),color:"#3B82F6"},
    {label:"🔬 PoC",items:activities.filter(a=>a.Categoria==="PoC"&&a.Status==="Em Andamento"),color:"#F97316"},
    {label:"🎓 Treinamento",items:activities.filter(a=>a.Categoria==="Treinamento"&&a.Status==="Em Andamento"),color:"#10B981"},
    {label:"🤝 Reunião",items:activities.filter(a=>a.Categoria==="Reunião"&&a.Status==="Em Andamento"),color:"#8B5CF6"},
    {label:"🛠️ Suporte",items:activities.filter(a=>a.Categoria==="Suporte"&&a.Status==="Em Andamento"),color:"#EAB308"},
    {label:"🎯 Evento",items:activities.filter(a=>a.Categoria==="Evento"&&a.Status==="Em Andamento"),color:"#EC4899"},
  ].filter(c=>c.items.length>0);
  return (
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:14}}>
      {cols.map(col=>(
        <div key={col.label}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10}}>
            <span style={{width:8,height:8,borderRadius:"50%",background:col.color,display:"inline-block"}}/>
            <span style={{fontSize:12,fontWeight:700,color:"#475569",textTransform:"uppercase",letterSpacing:"0.05em"}}>{col.label}</span>
            <span style={{marginLeft:"auto",background:"#F1F5F9",color:"#64748B",borderRadius:20,padding:"1px 8px",fontSize:11,fontWeight:700}}>{col.items.length}</span>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {col.items.map(a=>(
              <div key={a.id} style={{background:"#fff",borderRadius:11,padding:12,border:"1px solid #F1F5F9",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
                <div style={{fontSize:12,fontWeight:700,color:"#0F172A",marginBottom:4}}>{a.Atividade||"—"}</div>
                <div style={{fontSize:11,color:"#94A3B8",marginBottom:8}}>{a["Cliente Final"]||"—"}</div>
                <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                  {a.Etapa&&<Tag label={a.Etapa} color={ETAPA_COLOR[a.Etapa]||"#64748B"}/>}
                  {a.Integrador&&<span style={{fontSize:10,color:"#64748B"}}>🤝 {a.Integrador}</span>}
                </div>
                {a.Data&&<div style={{fontSize:10,color:"#94A3B8",marginTop:6}}>📅 {new Date(a.Data+"T12:00").toLocaleDateString("pt-BR",{day:"2-digit",month:"short"})}</div>}
              </div>
            ))}
          </div>
        </div>
      ))}
      {cols.length===0&&<div style={{gridColumn:"1/-1",padding:"48px",textAlign:"center",background:"#fff",borderRadius:13,border:"1px solid #F1F5F9",color:"#94A3B8",fontSize:13}}>Nenhuma atividade em andamento.</div>}
    </div>
  );
};

const ExecutiveView = ({activities,quarter}) => {
  const total = activities.length;
  const concluidos = activities.filter(a=>a.Status==="Concluído").length;
  const emAndamento = activities.filter(a=>a.Status==="Em Andamento").length;
  const suspensos = activities.filter(a=>a.Status==="Suspenso").length;
  const pct = n => total>0?Math.round((n/total)*100):0;
  const closedWon = activities.filter(a=>a.Categoria==="Closed Won");
  const realizado = closedWon.reduce((s,a)=>s+(Number(a["Valor (R$)"])||0),0);
  const meta = closedWon.reduce((s,a)=>s+(Number(a["Meta Quarter (R$)"])||0),0);
  const atingimento = meta>0?Math.min((realizado/meta)*100,100):0;
  const topClientes = Object.entries(activities.reduce((acc,a)=>{
    if (a["Cliente Final"]) acc[a["Cliente Final"]]=(acc[a["Cliente Final"]]||0)+1;
    return acc;
  },{})).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const catData = CATS.filter(c=>c!=="Closed Won").map(c=>({name:c.replace(" ",""),value:activities.filter(a=>a.Categoria===c).length,fill:CAT_COLOR[c]})).filter(d=>d.value>0);

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{background:"linear-gradient(135deg,#0F172A 0%,#1E293B 100%)",borderRadius:16,padding:"28px 32px",color:"#fff"}}>
        <div style={{fontSize:11,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8}}>Relatório Executivo</div>
        <div style={{fontSize:24,fontWeight:800,marginBottom:4}}>KPI Pre-Sales Gov — {quarter}</div>
        <div style={{fontSize:13,color:"#94A3B8"}}>Hikvision Brazil · Sul & Sudeste · {new Date().toLocaleDateString("pt-BR",{month:"long",year:"numeric"})}</div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
        {[
          {label:"Total Atividades",value:total,color:"#6366F1",icon:"📁"},
          {label:"Concluídas",value:`${concluidos} (${pct(concluidos)}%)`,color:"#10B981",icon:"✅"},
          {label:"Em Andamento",value:`${emAndamento} (${pct(emAndamento)}%)`,color:"#F97316",icon:"⏳"},
          {label:"Suspensas",value:`${suspensos} (${pct(suspensos)}%)`,color:"#EF4444",icon:"⛔"},
        ].map(k=>(
          <div key={k.label} style={{background:"#fff",borderRadius:13,padding:"16px 18px",border:"1px solid #F1F5F9",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
              <span style={{fontSize:11,fontWeight:700,color:"#94A3B8",textTransform:"uppercase"}}>{k.label}</span>
              <span style={{fontSize:16}}>{k.icon}</span>
            </div>
            <div style={{fontSize:24,fontWeight:800,color:k.color}}>{k.value}</div>
          </div>
        ))}
      </div>

      <div style={{background:"#fff",borderRadius:13,padding:"20px 24px",border:"1px solid #FEE2E2"}}>
        <div style={{fontSize:13,fontWeight:700,color:"#0F172A",marginBottom:14}}>🏆 Closed Won — Atingimento de Meta</div>
        <div style={{display:"flex",gap:32,marginBottom:14}}>
          <div><div style={{fontSize:11,color:"#94A3B8"}}>Realizado</div><div style={{fontSize:26,fontWeight:800,color:"#EF4444"}}>{fmt(realizado)}</div></div>
          <div><div style={{fontSize:11,color:"#94A3B8"}}>Meta</div><div style={{fontSize:26,fontWeight:800,color:"#475569"}}>{meta>0?fmt(meta):"Não definida"}</div></div>
          <div><div style={{fontSize:11,color:"#94A3B8"}}>Atingimento</div><div style={{fontSize:26,fontWeight:800,color:atingimento>=100?"#10B981":atingimento>=70?"#EAB308":"#EF4444"}}>{meta>0?`${atingimento.toFixed(0)}%`:"—"}</div></div>
        </div>
        {meta>0&&<div style={{background:"#F1F5F9",borderRadius:8,height:10,overflow:"hidden"}}><div style={{height:"100%",width:`${atingimento}%`,background:atingimento>=100?"#10B981":atingimento>=70?"#EAB308":"#EF4444",borderRadius:8,transition:"width 0.6s"}}/></div>}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <div style={{background:"#fff",borderRadius:13,padding:"18px 20px",border:"1px solid #F1F5F9"}}>
          <div style={{fontSize:12,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:14}}>Distribuição por Categoria</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={catData} margin={{left:-10,right:10}}>
              <XAxis dataKey="name" tick={{fontSize:10,fill:"#475569"}}/>
              <YAxis tick={{fontSize:10,fill:"#94A3B8"}} allowDecimals={false}/>
              <Tooltip content={<Tip/>}/>
              <Bar dataKey="value" name="Qtd" radius={[5,5,0,0]}>{catData.map((b,i)=><Cell key={i} fill={b.fill}/>)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{background:"#fff",borderRadius:13,padding:"18px 20px",border:"1px solid #F1F5F9"}}>
          <div style={{fontSize:12,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:14}}>Top 5 Clientes</div>
          {topClientes.length===0?<div style={{color:"#94A3B8",fontSize:13}}>Sem dados</div>:
            topClientes.map(([cliente,n],i)=>(
              <div key={cliente} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                <div style={{width:22,height:22,borderRadius:6,background:["#6366F1","#3B82F6","#10B981","#F97316","#EC4899"][i],display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:"#fff",flexShrink:0}}>{i+1}</div>
                <div style={{flex:1,fontSize:12,color:"#0F172A",fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{cliente}</div>
                <div style={{fontSize:12,fontWeight:800,color:"#475569"}}>{n}</div>
                <div style={{width:60,background:"#F1F5F9",borderRadius:4,height:6,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${(n/topClientes[0][1])*100}%`,background:"#6366F1",borderRadius:4}}/>
                </div>
              </div>
            ))
          }
        </div>
      </div>

      <div style={{background:"#fff",borderRadius:13,padding:"18px 20px",border:"1px solid #F1F5F9"}}>
        <div style={{fontSize:12,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:14}}>Pre Vendas por Etapa</div>
        <div style={{display:"flex",gap:16}}>
          {ETAPAS.map(etapa=>{
            const n = activities.filter(a=>a.Categoria==="Pre Vendas"&&a.Etapa===etapa).length;
            const conc = activities.filter(a=>a.Categoria==="Pre Vendas"&&a.Etapa===etapa&&a.Status==="Concluído").length;
            return (
              <div key={etapa} style={{flex:1,background:ETAPA_COLOR[etapa]+"11",borderRadius:10,padding:"14px 16px",border:`1px solid ${ETAPA_COLOR[etapa]}33`}}>
                <div style={{fontSize:11,fontWeight:700,color:ETAPA_COLOR[etapa],textTransform:"uppercase",marginBottom:6}}>{etapa}</div>
                <div style={{fontSize:28,fontWeight:800,color:ETAPA_COLOR[etapa]}}>{n}</div>
                <div style={{fontSize:11,color:"#94A3B8",marginTop:4}}>{conc} concluídos</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [tab,setTab] = useState("dashboard");
  const [quarter,setQuarter] = useState("Q2 2026");
  const [activities,setActivities] = useState([]);
  const [syncing,setSyncing] = useState(false);
  const [loading,setLoading] = useState(false);
  const [modal,setModal] = useState(null);
  const [filterCat,setFilterCat] = useState("Todas");
  const [filterStatus,setFilterStatus] = useState("Todos");
  const [filterEtapa,setFilterEtapa] = useState("Todas");
  const [sortBy,setSortBy] = useState("data-desc");
  const [toast,setToast] = useState("");

  const showToast = msg => { setToast(msg); setTimeout(()=>setToast(""),2800); };

  const sync = useCallback(async () => {
    setSyncing(true);
    try { const d = await loadActivities(quarter); setActivities(d); showToast(`✓ ${d.length} atividades`); }
    catch(e) { showToast("⚠️ "+e.message); }
    setSyncing(false);
  },[quarter]);

  useEffect(()=>{ sync(); },[sync]);

  const handleSave = async form => {
    setLoading(true); setModal(null);
    try {
      if (form.id) { const u = await updateActivity(form.id,form); setActivities(p=>p.map(a=>a.id===form.id?u:a)); showToast("✓ Atualizado"); }
      else { const c = await createActivity(form); setActivities(p=>[c,...p]); showToast("✓ Salvo"); }
    } catch(e) { showToast("⚠️ "+e.message); }
    setLoading(false);
  };

  const handleDelete = async id => {
    if (!confirm("Excluir?")) return;
    setLoading(true);
    try { await deleteActivity(id); setActivities(p=>p.filter(a=>a.id!==id)); showToast("✓ Excluído"); }
    catch(e) { showToast("⚠️ "+e.message); }
    setLoading(false);
  };

  const byCount = cat => activities.filter(a=>a.Categoria===cat).length;
  const closedWon = activities.filter(a=>a.Categoria==="Closed Won");
  const valorRealizado = closedWon.reduce((s,a)=>s+(Number(a["Valor (R$)"])||0),0);
  const metaQuarter = closedWon.reduce((s,a)=>s+(Number(a["Meta Quarter (R$)"])||0),0);
  const pctMeta = metaQuarter>0?Math.min((valorRealizado/metaQuarter)*100,100):0;
  const preVendas = activities.filter(a=>a.Categoria==="Pre Vendas");

  const kpis = [
    {cat:"Pre Vendas",count:byCount("Pre Vendas"),sub:`BOM: ${preVendas.filter(a=>a.Etapa==="BOM").length} · Spec-In: ${preVendas.filter(a=>a.Etapa==="Spec-In").length} · BID: ${preVendas.filter(a=>a.Etapa==="BID").length}`},
    {cat:"PoC",count:byCount("PoC"),sub:`Em Andamento: ${activities.filter(a=>a.Categoria==="PoC"&&a.Status==="Em Andamento").length} · Concluído: ${activities.filter(a=>a.Categoria==="PoC"&&a.Status==="Concluído").length}`},
    {cat:"Treinamento",count:byCount("Treinamento"),sub:"realizados no quarter"},
    {cat:"Reunião",count:byCount("Reunião"),sub:"reuniões registradas"},
    {cat:"Suporte",count:byCount("Suporte"),sub:"atendimentos"},
    {cat:"Evento",count:byCount("Evento"),sub:"eventos participados"},
  ];

  const barData = CATS.filter(c=>c!=="Closed Won").map(c=>({name:c.split(" ")[0],value:activities.filter(a=>a.Categoria===c).length,fill:CAT_COLOR[c]}));
  const pieStatus = STATUS_LIST.map(s=>({name:s,value:activities.filter(a=>a.Status===s).length,fill:STATUS_COLOR[s]})).filter(d=>d.value>0);
  const pieEtapa = ETAPAS.map(e=>({name:e,value:preVendas.filter(a=>a.Etapa===e).length,fill:ETAPA_COLOR[e]})).filter(d=>d.value>0);

  const weekMap={};
  activities.forEach(a=>{
    if (!a.Data) return;
    const d=new Date(a.Data+"T12:00:00");
    const w=`${d.getMonth()+1}/${Math.ceil(d.getDate()/7)}ª`;
    weekMap[w]=(weekMap[w]||0)+1;
  });
  const trendData=Object.entries(weekMap).slice(-8).map(([w,v])=>({semana:w,atividades:v}));

  const summaryData=CATS.map(cat=>{
    const rows=activities.filter(a=>a.Categoria===cat);
    const statuses=[...new Set(rows.map(a=>a.Status))].filter(Boolean);
    const etapas=cat==="Pre Vendas"?[...new Set(rows.map(a=>a.Etapa))].filter(Boolean):[];
    return {cat,total:rows.length,statuses:statuses.map(s=>({s,n:rows.filter(a=>a.Status===s).length})),etapas:etapas.map(e=>({e,n:rows.filter(a=>a.Etapa===e).length}))};
  }).filter(r=>r.total>0);

  let filtered=[...activities];
  if (filterCat!=="Todas") filtered=filtered.filter(a=>a.Categoria===filterCat);
  if (filterStatus!=="Todos") filtered=filtered.filter(a=>a.Status===filterStatus);
  if (filterEtapa!=="Todas") filtered=filtered.filter(a=>a.Etapa===filterEtapa);
  filtered.sort((a,b)=>{
    if (sortBy==="data-desc") return new Date(b.Data||0)-new Date(a.Data||0);
    if (sortBy==="data-asc") return new Date(a.Data||0)-new Date(b.Data||0);
    return a.Categoria.localeCompare(b.Categoria);
  });

  const sel={padding:"7px 12px",borderRadius:8,border:"1px solid #E2E8F0",background:"#fff",fontSize:12,color:"#475569",outline:"none",cursor:"pointer"};
  const btnTab=(t,label)=><button onClick={()=>setTab(t)} style={{padding:"8px 16px",borderRadius:8,border:"none",background:tab===t?"#1E293B":"transparent",color:tab===t?"#fff":"#64748B",cursor:"pointer",fontSize:13,fontWeight:700}}>{label}</button>;

  return (
    <div style={{minHeight:"100vh",background:"#F8FAFC"}}>
      {toast&&<div style={{position:"fixed",top:16,right:16,zIndex:2000,background:"#1E293B",color:"#fff",borderRadius:10,padding:"10px 18px",fontSize:13,fontWeight:600,boxShadow:"0 8px 24px rgba(0,0,0,0.2)",animation:"fadeIn 0.2s"}}>{toast}</div>}
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}`}</style>

      <div style={{background:"#0F172A",padding:"0 24px"}}>
        <div style={{maxWidth:1200,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",height:56}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:30,height:30,borderRadius:7,background:"#6366F1",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:800,color:"#fff"}}>H</div>
            <span style={{fontSize:14,fontWeight:700,color:"#fff"}}>KPI Tracker — Pre-Sales Gov</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{display:"flex",background:"#1E293B",borderRadius:10,padding:3,gap:1}}>
              {btnTab("dashboard","📊 Dashboard")}
              {btnTab("kanban","📌 Kanban")}
              {btnTab("executive","📈 Executivo")}
              {btnTab("log","📋 Log")}
            </div>
            <select style={{...sel,background:"#1E293B",color:"#94A3B8",borderColor:"#334155"}} value={quarter} onChange={e=>setQuarter(e.target.value)}>
              {QUARTERS.map(q=><option key={q}>{q}</option>)}
            </select>
            <button onClick={sync} disabled={syncing} style={{padding:"7px 14px",borderRadius:8,border:"none",background:syncing?"#334155":"#6366F1",color:"#fff",cursor:syncing?"not-allowed":"pointer",fontSize:12,fontWeight:700}}>
              {syncing?"⏳ Sync...":"↻ Sync"}
            </button>
          </div>
        </div>
      </div>

      <div style={{maxWidth:1200,margin:"0 auto",padding:"24px"}}>

        {tab==="dashboard"&&(
          <>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:14}}>
              {kpis.map(k=>(
                <div key={k.cat} style={{background:"#fff",borderRadius:13,padding:"16px 18px",border:"1px solid #F1F5F9",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                    <span style={{fontSize:11,fontWeight:700,color:"#94A3B8",textTransform:"uppercase",letterSpacing:"0.06em"}}>{k.cat}</span>
                    <span style={{fontSize:18}}>{CAT_ICONS[k.cat]}</span>
                  </div>
                  <div style={{fontSize:32,fontWeight:800,color:CAT_COLOR[k.cat],lineHeight:1,marginBottom:6}}>{k.count}</div>
                  <div style={{fontSize:11,color:"#94A3B8"}}>{k.sub}</div>
                </div>
              ))}
            </div>
            <div style={{background:"#fff",borderRadius:13,padding:"18px 22px",border:"1px solid #FEE2E2",marginBottom:14}}>
              <div style={{fontSize:11,fontWeight:700,color:"#94A3B8",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:10}}>🏆 Closed Won — {quarter}</div>
              <div style={{display:"flex",gap:32,marginBottom:12}}>
                <div><div style={{fontSize:11,color:"#94A3B8"}}>Realizado</div><div style={{fontSize:22,fontWeight:800,color:"#EF4444"}}>{fmt(valorRealizado)}</div></div>
                <div><div style={{fontSize:11,color:"#94A3B8"}}>Meta</div><div style={{fontSize:22,fontWeight:800,color:"#475569"}}>{metaQuarter>0?fmt(metaQuarter):"—"}</div></div>
                <div><div style={{fontSize:11,color:"#94A3B8"}}>Atingimento</div><div style={{fontSize:22,fontWeight:800,color:pctMeta>=100?"#10B981":pctMeta>=70?"#EAB308":"#EF4444"}}>{metaQuarter>0?`${pctMeta.toFixed(0)}%`:"—"}</div></div>
                <div><div style={{fontSize:11,color:"#94A3B8"}}>Negócios</div><div style={{fontSize:22,fontWeight:800,color:"#475569"}}>{closedWon.length}</div></div>
              </div>
              {metaQuarter>0&&<div style={{background:"#F1F5F9",borderRadius:8,height:8,overflow:"hidden"}}><div style={{height:"100%",width:`${pctMeta}%`,background:pctMeta>=100?"#10B981":pctMeta>=70?"#EAB308":"#EF4444",borderRadius:8,transition:"width 0.6s"}}/></div>}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1.3fr 1fr 1fr",gap:14,marginBottom:14}}>
              <div style={{background:"#fff",borderRadius:13,padding:"16px 18px",border:"1px solid #F1F5F9"}}>
                <div style={{fontSize:11,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:14}}>Por Categoria</div>
                <ResponsiveContainer width="100%" height={170}>
                  <BarChart data={barData} margin={{left:-10,right:10}}>
                    <XAxis dataKey="name" tick={{fontSize:11,fill:"#475569"}}/>
                    <YAxis tick={{fontSize:10,fill:"#94A3B8"}} allowDecimals={false}/>
                    <Tooltip content={<Tip/>}/>
                    <Bar dataKey="value" name="Qtd" radius={[5,5,0,0]}>{barData.map((b,i)=><Cell key={i} fill={b.fill}/>)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={{background:"#fff",borderRadius:13,padding:"16px 18px",border:"1px solid #F1F5F9"}}>
                <div style={{fontSize:11,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:14}}>Por Status</div>
                <ResponsiveContainer width="100%" height={170}>
                  <PieChart>
                    <Pie data={pieStatus} cx="50%" cy="45%" innerRadius={40} outerRadius={62} dataKey="value" paddingAngle={3}>
                      {pieStatus.map((p,i)=><Cell key={i} fill={p.fill}/>)}
                    </Pie>
                    <Tooltip content={<Tip/>}/><Legend iconType="circle" iconSize={7} formatter={v=><span style={{fontSize:10,color:"#475569"}}>{v}</span>}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{background:"#fff",borderRadius:13,padding:"16px 18px",border:"1px solid #F1F5F9"}}>
                <div style={{fontSize:11,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:14}}>Pre Vendas por Etapa</div>
                <ResponsiveContainer width="100%" height={170}>
                  <PieChart>
                    <Pie data={pieEtapa} cx="50%" cy="45%" innerRadius={40} outerRadius={62} dataKey="value" paddingAngle={3}>
                      {pieEtapa.map((p,i)=><Cell key={i} fill={p.fill}/>)}
                    </Pie>
                    <Tooltip content={<Tip/>}/><Legend iconType="circle" iconSize={7} formatter={v=><span style={{fontSize:10,color:"#475569"}}>{v}</span>}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            {trendData.length>1&&(
              <div style={{background:"#fff",borderRadius:13,padding:"16px 18px",border:"1px solid #F1F5F9",marginBottom:14}}>
                <div style={{fontSize:11,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:14}}>Tendência Semanal</div>
                <ResponsiveContainer width="100%" height={130}>
                  <LineChart data={trendData} margin={{left:-10,right:20}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/>
                    <XAxis dataKey="semana" tick={{fontSize:10,fill:"#94A3B8"}}/>
                    <YAxis tick={{fontSize:10,fill:"#94A3B8"}} allowDecimals={false}/>
                    <Tooltip content={<Tip/>}/>
                    <Line type="monotone" dataKey="atividades" stroke="#6366F1" strokeWidth={2} dot={{r:4,fill:"#6366F1"}} name="Atividades"/>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            {summaryData.length>0&&(
              <div style={{background:"#fff",borderRadius:13,border:"1px solid #F1F5F9",overflow:"hidden"}}>
                <div style={{padding:"13px 18px",borderBottom:"1px solid #F8FAFC",fontSize:11,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:"0.05em"}}>Resumo Categoria × Etapa × Status</div>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead><tr style={{background:"#F8FAFC"}}>
                    {["Categoria","Total","Etapa","Status","Clientes"].map(h=><th key={h} style={{padding:"9px 14px",textAlign:"left",fontSize:11,fontWeight:700,color:"#94A3B8",textTransform:"uppercase"}}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {summaryData.map((r,i)=>{
                      const clients=[...new Set(activities.filter(a=>a.Categoria===r.cat&&a["Cliente Final"]).map(a=>a["Cliente Final"]))].slice(0,3).join(", ");
                      return(
                        <tr key={r.cat} style={{background:i%2===0?"#fff":"#FAFBFC"}}>
                          <td style={{padding:"9px 14px"}}><Tag label={`${CAT_ICONS[r.cat]} ${r.cat}`} color={CAT_COLOR[r.cat]}/></td>
                          <td style={{padding:"9px 14px",fontSize:15,fontWeight:800,color:CAT_COLOR[r.cat]}}>{r.total}</td>
                          <td style={{padding:"9px 14px"}}>{r.etapas.length>0?<div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{r.etapas.map(({e,n})=><Tag key={e} label={`${e}: ${n}`} color={ETAPA_COLOR[e]||"#64748B"}/>)}</div>:<span style={{fontSize:11,color:"#CBD5E1"}}>—</span>}</td>
                          <td style={{padding:"9px 14px"}}><div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{r.statuses.map(({s,n})=><Tag key={s} label={`${s}: ${n}`} color={STATUS_COLOR[s]||"#64748B"}/>)}</div></td>
                          <td style={{padding:"9px 14px",fontSize:11,color:"#64748B"}}>{clients||"—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {tab==="kanban"&&<KanbanView activities={activities}/>}
        {tab==="executive"&&<ExecutiveView activities={activities} quarter={quarter}/>}

        {tab==="log"&&(
          <>
            <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
              <select style={sel} value={filterCat} onChange={e=>setFilterCat(e.target.value)}><option>Todas</option>{CATS.map(c=><option key={c}>{c}</option>)}</select>
              <select style={sel} value={filterEtapa} onChange={e=>setFilterEtapa(e.target.value)}><option>Todas</option>{ETAPAS.map(e=><option key={e}>{e}</option>)}</select>
              <select style={sel} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}><option>Todos</option>{STATUS_LIST.map(s=><option key={s}>{s}</option>)}</select>
              <select style={sel} value={sortBy} onChange={e=>setSortBy(e.target.value)}>
                <option value="data-desc">Data ↓</option>
                <option value="data-asc">Data ↑</option>
                <option value="cat">Categoria</option>
              </select>
              <span style={{fontSize:12,color:"#94A3B8"}}>{filtered.length} itens</span>
              <button onClick={()=>setModal({entry:null})} disabled={loading} style={{marginLeft:"auto",padding:"8px 16px",borderRadius:8,border:"none",background:"#1E293B",color:"#fff",cursor:"pointer",fontSize:13,fontWeight:700}}>+ Nova Atividade</button>
            </div>
            <div style={{background:"#fff",borderRadius:13,border:"1px solid #F1F5F9",overflow:"hidden"}}>
              {filtered.length===0?<div style={{padding:"48px",textAlign:"center",fontSize:13,color:"#94A3B8"}}>Nenhuma atividade encontrada.</div>:(
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead><tr style={{background:"#F8FAFC"}}>
                    {["Atividade","Categoria","Etapa","Status","Cliente Final","Integrador","Data","Valor",""].map(h=>(
                      <th key={h} style={{padding:"10px 14px",textAlign:"left",fontSize:11,fontWeight:700,color:"#94A3B8",textTransform:"uppercase"}}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {filtered.map((a,i)=>(
                      <tr key={a.id} style={{background:i%2===0?"#fff":"#FAFBFC"}}
                        onMouseEnter={e=>e.currentTarget.style.background="#F0F9FF"}
                        onMouseLeave={e=>e.currentTarget.style.background=i%2===0?"#fff":"#FAFBFC"}>
                        <td style={{padding:"10px 14px",fontSize:13,fontWeight:600,color:"#0F172A",maxWidth:180}}><div style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.Atividade||"—"}</div></td>
                        <td style={{padding:"10px 14px"}}><Tag label={`${CAT_ICONS[a.Categoria]||""} ${a.Categoria}`} color={CAT_COLOR[a.Categoria]||"#64748B"}/></td>
                        <td style={{padding:"10px 14px"}}>{a.Etapa?<Tag label={a.Etapa} color={ETAPA_COLOR[a.Etapa]||"#64748B"}/>:<span style={{fontSize:11,color:"#CBD5E1"}}>—</span>}</td>
                        <td style={{padding:"10px 14px"}}><Tag label={a.Status||"—"} color={STATUS_COLOR[a.Status]||"#64748B"}/></td>
                        <td style={{padding:"10px 14px",fontSize:12,color:"#475569"}}>{a["Cliente Final"]||"—"}</td>
                        <td style={{padding:"10px 14px",fontSize:12,color:"#475569"}}>{a.Integrador||"—"}</td>
                        <td style={{padding:"10px 14px",fontSize:12,color:"#94A3B8"}}>{a.Data?new Date(a.Data+"T12:00").toLocaleDateString("pt-BR",{day:"2-digit",month:"short"}):"—"}</td>
                        <td style={{padding:"10px 14px",fontSize:12,fontWeight:600,color:"#475569"}}>{fmt(a["Valor (R$)"])}</td>
                        <td style={{padding:"10px 14px"}}>
                          <div style={{display:"flex",gap:5}}>
                            <button onClick={()=>setModal({entry:a})} style={{padding:"4px 9px",borderRadius:6,border:"1px solid #E2E8F0",background:"#fff",color:"#475569",cursor:"pointer",fontSize:11}}>✏️</button>
                            <button onClick={()=>handleDelete(a.id)} style={{padding:"4px 9px",borderRadius:6,border:"1px solid #FEE2E2",background:"#fff",color:"#EF4444",cursor:"pointer",fontSize:11}}>🗑</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
      {modal&&<Modal entry={modal.entry} onSave={handleSave} onClose={()=>setModal(null)} defaultQuarter={quarter}/>}
    </div>
  );
}
