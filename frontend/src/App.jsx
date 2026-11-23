import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard, Users, ArrowLeftRight, GitBranch, Search, ShieldAlert,
  Database, ChartNoAxesCombined, FileText, Menu, X, Plus, RefreshCw,
  ZoomIn, ZoomOut, Maximize, CheckCircle2, AlertTriangle, Building2
} from 'lucide-react';
import {
  ReactFlow, Background, Controls, MiniMap, MarkerType, useNodesState, useEdgesState
} from '@xyflow/react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const API = '/api';
const PERFORMANCE_ALGORITHM_VERSION = 'directed-cycle-path-v2';
const navItems = [
  ['dashboard', LayoutDashboard, 'Dashboard'],
  ['actors', Users, 'Actors'],
  ['transfers', ArrowLeftRight, 'Transfers'],
  ['graph', GitBranch, 'Provenance Graph'],
  ['bfs', Search, 'Origin Tracking'],
  ['dfs', ShieldAlert, 'Fraud Detection'],
  ['synthetic', Database, 'Synthetic Data'],
  ['performance', ChartNoAxesCombined, 'Performance'],
  ['reports', FileText, 'Reports']
];

async function api(path, options = {}) {
  const response = await fetch(API + path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function App() {
  const [page, setPage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [actors, setActors] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [graph, setGraph] = useState({ actors: [], transfers: [] });
  const [cycles, setCycles] = useState([]);
  const [cycleTransfers, setCycleTransfers] = useState([]);
  const [riskAssessments, setRiskAssessments] = useState([]);
  const [performance, setPerformance] = useState([]);
  const [notice, setNotice] = useState('');

  const refresh = async () => {
    try {
      const [a, t, g, runs] = await Promise.all([
        api('/actors'), api('/transfers'), api('/graph'), api('/analysis/results')
      ]);
      setActors(a.actors || a);
      setTransfers(t.transfers || t);
      setGraph(g);
      setPerformance((runs || []).flatMap(run =>
        (run.results || []).map(result => ({
          ...result,
          runId: run.id,
          runCreatedAt: run.createdAt,
          algorithmVersion: run.algorithmVersion
        }))
      ));
      setCycles([]);
      setCycleTransfers([]);
      setRiskAssessments([]);
    } catch (error) {
      setNotice(error.message);
    }
  };

  useEffect(() => { refresh(); }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  const navigate = (value) => {
    setPage(value);
    setSidebarOpen(false);
  };

  const pageProps = { actors, transfers, graph, cycles, setCycles, cycleTransfers, setCycleTransfers,
    riskAssessments, setRiskAssessments, performance,
    setPerformance, refresh, setNotice };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark"><GitBranch size={20} /></div>
          <div><strong>Provenance</strong><span>Graph Intelligence</span></div>
        </div>
        <nav>
          {navItems.map(([id, Icon, label]) => (
            <button key={id} className={page === id ? 'active' : ''} onClick={() => navigate(id)}>
              <Icon size={18} /><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-status"><span className="status-dot"></span>System operational</div>
      </aside>
      {sidebarOpen && <div className="overlay" onClick={() => setSidebarOpen(false)} />}
      <main>
        <header className="topbar">
          <button className="menu-button" onClick={() => setSidebarOpen(true)}><Menu size={22} /></button>
          <div>
            <p className="eyebrow">Supply Chain Monitor</p>
            <h1>{navItems.find((item) => item[0] === page)?.[2]}</h1>
          </div>
          <button className="icon-button" onClick={refresh} title="Refresh data"><RefreshCw size={18} /></button>
        </header>
        {notice && <div className="toast">{notice}</div>}
        <div className="content">
          {page === 'dashboard' && <Dashboard {...pageProps} navigate={navigate} />}
          {page === 'actors' && <Actors {...pageProps} />}
          {page === 'transfers' && <Transfers {...pageProps} />}
          {page === 'graph' && <GraphPage {...pageProps} />}
          {page === 'bfs' && <BFSPage {...pageProps} />}
          {page === 'dfs' && <DFSPage {...pageProps} />}
          {page === 'synthetic' && <SyntheticPage {...pageProps} />}
          {page === 'performance' && <PerformancePage {...pageProps} />}
          {page === 'reports' && <ReportsPage {...pageProps} />}
        </div>
      </main>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone }) {
  return <div className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={20} /></div><div><p>{label}</p><strong>{value}</strong></div></div>;
}

function Dashboard({ actors, transfers, cycles, riskAssessments, navigate }) {
  const analysisComplete = riskAssessments.length > 0;
  const lowRisk = riskAssessments.filter((item) => item.riskClassification === 'LOW RISK').length;
  const elevatedRisk = riskAssessments.filter((item) =>
    item.riskClassification === 'HIGH RISK' || item.riskClassification === 'CRITICAL RISK'
  ).length;
  return <>
    <div className="stats-grid">
      <StatCard icon={Users} label="Supply Chain Actors" value={actors.length} tone="blue" />
      <StatCard icon={ArrowLeftRight} label="Transfer Events" value={transfers.length} tone="green" />
      <StatCard icon={Building2} label="Products in Motion" value={new Set(transfers.map(t => t.productId)).size} tone="purple" />
      <StatCard icon={ShieldAlert} label="Detected Cycles" value={cycles.length} tone="red" />
    </div>
    <div className="dashboard-grid">
      <section className="panel wide">
        <div className="panel-heading"><div><p className="eyebrow">Live Activity</p><h2>Recent Transfers</h2></div></div>
        <TransferTable transfers={transfers.slice().reverse().slice(0, 6)} />
      </section>
      <section className="panel">
        <div className="panel-heading"><div><p className="eyebrow">Risk Summary</p><h2>Fraud Detection</h2></div></div>
        <div className="risk-row"><div><span className="risk-value">{analysisComplete ? lowRisk : '—'}</span><p>Low-risk transfers</p></div><div><span className="risk-value red-text">{analysisComplete ? elevatedRisk : '—'}</span><p>High / critical flags</p></div></div>
        {!analysisComplete && <p className="muted">Run DFS &amp; Risk Analysis to classify transfers. A cycle alone is not proof of wrongdoing.</p>}
      </section>
    </div>
    <section className="panel quick-panel">
      <div className="panel-heading"><div><p className="eyebrow">Shortcuts</p><h2>Quick Actions</h2></div></div>
      <div className="quick-actions">
        <button onClick={() => navigate('actors')}><Plus size={17}/>Add Actor</button>
        <button onClick={() => navigate('transfers')}><ArrowLeftRight size={17}/>Add Transfer</button>
        <button onClick={() => navigate('bfs')}><Search size={17}/>Trace Origin</button>
        <button className="danger" onClick={() => navigate('dfs')}><ShieldAlert size={17}/>Run Fraud Detection</button>
      </div>
    </section>
  </>;
}

function TransferTable({ transfers, onDelete, onDetails }) {
  return <div className="table-wrap"><table><thead><tr><th>Transfer</th><th>Product</th><th>Source</th><th>Destination</th><th>Purpose</th><th>Date</th><th>Status</th>{(onDelete||onDetails)&&<th>Actions</th>}</tr></thead>
    <tbody>{transfers.map(t => <tr key={t.id}><td>#{t.id}</td><td>{t.productId ?? t.product}</td><td>{t.sourceId ?? t.source}</td><td>{t.destinationId ?? t.destination}</td><td>{t.purpose || 'Not specified'}</td><td>{t.transferDate ? new Date(t.transferDate).toLocaleDateString() : '-'}</td><td><span className="badge success">Recorded</span></td>{(onDelete||onDetails)&&<td>{onDetails&&<button className="text-button" onClick={()=>onDetails(t.id)}>Details</button>}{onDelete&&<button className="text-button danger-text" onClick={()=>onDelete(t.id)}>Delete</button>}</td>}</tr>)}</tbody>
  </table></div>;
}

function Actors({ actors, refresh, setNotice }) {
  const [form, setForm] = useState({ id: '', name: '', type: 'Supplier' });
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const submit = async (event) => {
    event.preventDefault();
    try {
      await api('/actors', { method: 'POST', body: JSON.stringify({ id: Number(form.id), name: form.name, type: form.type }) });
      setForm({ id: '', name: '', type: 'Supplier' });
      await refresh();
      setNotice('Actor created successfully');
    } catch (error) { setNotice(error.message); }
  };
  const remove = async (id) => {
    try { await api(`/actors/${id}`, { method: 'DELETE' }); await refresh(); setNotice('Actor deleted'); }
    catch (error) { setNotice(error.message); }
  };
  const edit = async (actor) => {
    const name = window.prompt('Actor name', actor.name);
    if (!name) return;
    const type = window.prompt('Actor type', actor.type) || actor.type;
    try { await api(`/actors/${actor.id}`, { method: 'PUT', body: JSON.stringify({ name, type }) }); await refresh(); }
    catch (error) { setNotice(error.message); }
  };
  const shown = actors.filter(a =>
    (filter === 'All' || a.type === filter) &&
    `${a.id} ${a.name} ${a.type}`.toLowerCase().includes(search.toLowerCase())
  );
  return <>
    <section className="panel form-panel"><div className="panel-heading"><div><p className="eyebrow">Create</p><h2>New Supply Chain Actor</h2></div></div>
      <form className="form-grid" onSubmit={submit}>
        <label>Actor ID<input required type="number" min="0" value={form.id} onChange={e => setForm({...form, id: e.target.value})}/></label>
        <label>Actor Name<input required value={form.name} onChange={e => setForm({...form, name: e.target.value})}/></label>
        <label>Actor Type<select value={form.type} onChange={e => setForm({...form, type: e.target.value})}><option>Supplier</option><option>Manufacturer</option><option>Distributor</option><option>Pharmacy</option><option>Customer</option></select></label>
        <button className="primary" type="submit"><Plus size={17}/>Add Actor</button>
      </form>
    </section>
    <section className="panel">
      <div className="panel-heading"><div><p className="eyebrow">Directory</p><h2>Registered Actors</h2></div><div className="filters"><input placeholder="Search actors..." value={search} onChange={e => setSearch(e.target.value)}/><select value={filter} onChange={e => setFilter(e.target.value)}><option>All</option><option>Supplier</option><option>Manufacturer</option><option>Distributor</option><option>Pharmacy</option><option>Customer</option></select></div></div>
      <div className="table-wrap"><table><thead><tr><th>ID</th><th>Name</th><th>Type</th><th>Actions</th></tr></thead><tbody>{shown.map(a => <tr key={a.id}><td><strong>#{a.id}</strong></td><td>{a.name}</td><td><span className="badge blue-badge">{a.type}</span></td><td><button className="text-button" onClick={() => edit(a)}>Edit</button><button className="text-button danger-text" onClick={() => remove(a.id)}>Delete</button></td></tr>)}</tbody></table></div>
    </section>
  </>;
}

function Transfers({ actors, transfers, refresh, setNotice }) {
  const [form, setForm] = useState({ id: '', productId: '', sourceId: '', destinationId: '', purpose: '', otherReason: '', transferDate: new Date().toISOString().slice(0,10), description: '', authorizationStatus: 'not-specified', authorizationReference: '' });
  const [search, setSearch] = useState('');
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const submit = async (event) => {
    event.preventDefault();
    try {
      await api('/transfers', { method: 'POST', body: JSON.stringify({
        id: form.id ? Number(form.id) : undefined, productId: Number(form.productId),
        sourceId: Number(form.sourceId), destinationId: Number(form.destinationId),
        purpose: form.purpose, otherReason: form.otherReason,
        transferDate: form.transferDate, description: form.description,
        authorizationStatus: form.authorizationStatus,
        authorizationReference: form.authorizationReference
      }) });
      setForm({ id: '', productId: '', sourceId: '', destinationId: '', purpose: '', otherReason: '', transferDate: new Date().toISOString().slice(0,10), description: '', authorizationStatus: 'not-specified', authorizationReference: '' });
      setSelectedTransfer(null);
      await refresh(); setNotice('Transfer recorded');
    } catch (error) { setNotice(error.message); }
  };
  const remove = async (id) => {
    try { await api(`/transfers/${id}`, { method: 'DELETE' }); if (selectedTransfer?.id === id) setSelectedTransfer(null); await refresh(); setNotice('Transfer deleted'); }
    catch (error) { setNotice(error.message); }
  };
  const showDetails = async (id) => {
    try { setSelectedTransfer(await api(`/transfers/${id}`)); }
    catch (error) { setNotice(error.message); }
  };
  const shown = transfers.filter(t => `${t.id} ${t.productId} ${t.sourceId} ${t.destinationId} ${t.purpose} ${t.otherReason}`.toLowerCase().includes(search.toLowerCase()));
  return <>
    <section className="panel form-panel"><div className="panel-heading"><div><p className="eyebrow">Record</p><h2>New Product Transfer</h2></div></div>
      <form className="form-grid transfers-form" onSubmit={submit}>
        <label>Transfer ID <small>(optional)</small><input type="number" min="1" value={form.id} onChange={e => setForm({...form, id:e.target.value})}/></label>
        <label>Product ID<input required type="number" min="1" value={form.productId} onChange={e => setForm({...form, productId:e.target.value})}/></label>
        <label>Source Actor<select required value={form.sourceId} onChange={e => setForm({...form, sourceId:e.target.value})}><option value="">Select source</option>{actors.map(a => <option key={a.id} value={a.id}>{a.id} - {a.name}</option>)}</select></label>
        <label>Destination Actor<select required value={form.destinationId} onChange={e => setForm({...form, destinationId:e.target.value})}><option value="">Select destination</option>{actors.map(a => <option key={a.id} value={a.id}>{a.id} - {a.name}</option>)}</select></label>
        <label>Transfer Purpose<select required value={form.purpose} onChange={e => setForm({...form, purpose:e.target.value, otherReason:''})}><option value="">Select Transfer Purpose</option><option>Raw Material Supply</option><option>Manufacturing / Processing</option><option>Packaging</option><option>Quality Testing / Inspection</option><option>Labelling</option><option>Storage / Warehousing</option><option>Distribution</option><option>Retail / Pharmacy Supply</option><option>Return After Processing</option><option>Product Recall</option><option>Other</option></select></label>
        {form.purpose === 'Other' && <label className="wide-field">Why is this transfer happening?<textarea required maxLength="2000" value={form.otherReason} onChange={e => setForm({...form, otherReason:e.target.value})} placeholder="Explain the reason for this transfer"/></label>}
        <label>Transfer Date<input required type="date" value={form.transferDate} onChange={e => setForm({...form, transferDate:e.target.value})}/></label>
        <label>Authorization Status<select value={form.authorizationStatus} onChange={e => setForm({...form, authorizationStatus:e.target.value, authorizationReference:''})}><option value="not-specified">Not specified</option><option value="documented">Authorization documented</option><option value="not-required">Authorization not required</option><option value="missing">Missing / unverified</option></select></label>
        {form.authorizationStatus === 'documented' && <label>Authorization Reference<input required maxLength="200" value={form.authorizationReference} onChange={e => setForm({...form, authorizationReference:e.target.value})} placeholder="Approval or document reference"/></label>}
        <label className="wide-field">Transfer Description<textarea maxLength="3000" value={form.description} onChange={e => setForm({...form, description:e.target.value})} placeholder="Describe the activity and supporting documentation"/></label>
        <button className="primary" type="submit"><Plus size={17}/>Add Transfer</button>
      </form>
    </section>
    <section className="panel"><div className="panel-heading"><div><p className="eyebrow">History</p><h2>Transfer Records</h2></div><div className="filters"><input placeholder="Search transfers..." value={search} onChange={e => setSearch(e.target.value)}/></div></div>
      <TransferTable transfers={shown} onDelete={remove} onDetails={showDetails} />
      {selectedTransfer && <div className="transfer-details"><div className="panel-heading"><div><p className="eyebrow">Transfer #{selectedTransfer.id}</p><h2>Transfer Details</h2></div><button className="text-button" onClick={()=>setSelectedTransfer(null)}>Close</button></div><dl><div><dt>Product</dt><dd>{selectedTransfer.productId}</dd></div><div><dt>Source Actor</dt><dd>{selectedTransfer.sourceId}</dd></div><div><dt>Destination Actor</dt><dd>{selectedTransfer.destinationId}</dd></div><div><dt>Transfer Purpose</dt><dd>{selectedTransfer.purpose}</dd></div>{selectedTransfer.purpose === 'Other' && <div><dt>Other Explanation</dt><dd>{selectedTransfer.otherReason}</dd></div>}<div><dt>Transfer Date</dt><dd>{selectedTransfer.transferDate || 'Not provided'}</dd></div><div><dt>Description</dt><dd>{selectedTransfer.description || 'None'}</dd></div><div><dt>Authorization Status</dt><dd>{selectedTransfer.authorizationStatus}</dd></div>{selectedTransfer.authorizationReference && <div><dt>Authorization Reference</dt><dd>{selectedTransfer.authorizationReference}</dd></div>}</dl></div>}
    </section>
  </>;
}

function GraphPage({ graph, cycles = [], cycleTransfers = [] }) {
  const columns = Math.max(1, Math.ceil(Math.sqrt(graph.actors.length)));
  const cycleIds = new Set(cycles.flat());
  const cycleEdgeIds = new Set(cycleTransfers.flatMap(cycle =>
    cycle.map(transfer => transfer.id)
  ));
  const initialNodes = graph.actors.map((actor, index) => ({
    id: String(actor.id),
    position: { x: 180 * (index % columns), y: 140 * Math.floor(index / columns) },
    data: { label: `${actor.name}\n${actor.type}` },
    style: { borderRadius: 12, border: `2px solid ${cycleIds.has(actor.id) ? '#dc2626' : '#315bca'}`, background: cycleIds.has(actor.id) ? '#fee2e2' : '#eff4ff', color: '#172b4d', width: 150, whiteSpace: 'pre-line', textAlign: 'center' }
  }));
  const initialEdges = graph.transfers.map((transfer, index) => ({
    id: `e-${transfer.id || index}-${transfer.sourceId}-${transfer.destinationId}`,
    source: String(transfer.sourceId),
    target: String(transfer.destinationId),
    label: `P${transfer.productId}`,
    markerEnd: { type: MarkerType.ArrowClosed, color: cycleEdgeIds.has(transfer.id) ? '#dc2626' : '#94a3b8' },
    animated: cycleEdgeIds.has(transfer.id),
    style: { stroke: cycleEdgeIds.has(transfer.id) ? '#dc2626' : '#94a3b8' }
  }));
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [graph, cycles, cycleTransfers, setNodes, setEdges]);
  return <section className="panel graph-panel">
    <div className="panel-heading"><div><p className="eyebrow">Directed Network</p><h2>Interactive Provenance Graph</h2></div><span className="badge success">{graph.actors.length} actors · {graph.transfers.length} transfers</span></div>
    <div className="graph-canvas">
      <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} fitView>
        <Background /><MiniMap /><Controls />
      </ReactFlow>
    </div>
  </section>;
}

function BFSPage({ actors, graph, setNotice }) {
  const [actorId, setActorId] = useState('');
  const [productId, setProductId] = useState('');
  const [result, setResult] = useState(null);
  const run = async () => {
    if (!actorId) return setNotice('Select an actor');
    try {
      const data = await api('/analysis/bfs', { method: 'POST', body: JSON.stringify({
        actorId: Number(actorId),
        ...(productId === '' ? {} : { productId: Number(productId) })
      }) });
      setResult(data);
    } catch (error) { setNotice(error.message); }
  };
  const highlightIds = result ? new Set([Number(actorId), ...(result.traversalOrder || result.ancestors || [])]) : new Set();
  const discoveryEdgeKeys = new Set((result?.discoveryEdges || []).map(edge =>
    `${edge.source}:${edge.destination}:${edge.product}`
  ));
  const columns = Math.max(1, Math.ceil(Math.sqrt(graph.actors.length)));
  const nodes = graph.actors.map((a, i) => ({
    id: String(a.id), position: {x: 180*(i%columns), y:140*Math.floor(i/columns)},
    data:{label:`${a.name}\n${a.type}`},
    style:{borderRadius:12,border:`2px solid ${highlightIds.has(a.id)?(a.id===Number(actorId)?'#1d4ed8':'#16a34a'):'#94a3b8'}`,background:highlightIds.has(a.id)?(a.id===Number(actorId)?'#dbeafe':'#dcfce7'):'#fff',width:150,textAlign:'center',whiteSpace:'pre-line'}
  }));
  const edges = graph.transfers.map((t,i) => {
    const active = discoveryEdgeKeys.has(`${t.sourceId}:${t.destinationId}:${t.productId}`);
    return {
      id:`b${t.id || i}`,
      source:String(t.sourceId),
      target:String(t.destinationId),
      label:`P${t.productId}`,
      markerEnd:{type:MarkerType.ArrowClosed,color:active?'#16a34a':'#94a3b8'},
      style:{stroke:active?'#16a34a':'#94a3b8',strokeWidth:active?3:1.5}
    };
  });
  return <>
    <section className="panel form-panel"><div className="panel-heading"><div><p className="eyebrow">Reverse BFS</p><h2>Trace Upstream Origins</h2></div></div>
      <div className="inline-form"><label>Select Actor<select value={actorId} onChange={e=>setActorId(e.target.value)}><option value="">Choose actor</option>{actors.map(a=><option key={a.id} value={a.id}>{a.id} - {a.name}</option>)}</select></label><label>Product Filter<select value={productId} onChange={e=>setProductId(e.target.value)}><option value="">All products</option>{[...new Set(graph.transfers.map(t=>t.productId))].map(id=><option key={id} value={id}>Product {id}</option>)}</select></label><button className="primary" onClick={run}><Search size={17}/>Trace Origin</button></div>
    </section>
    {result && <div className="dashboard-grid">
      <section className="panel"><div className="panel-heading"><div><p className="eyebrow">C++ Reverse BFS · {result.productId === undefined ? 'All products' : `Product ${result.productId}`}</p><h2>{result.upstreamCount} Upstream Ancestors</h2></div><span className="badge success">{result.executionTimeMs?.toFixed(4)} ms</span></div>
        <p className="muted">Traversal order is the order actors were first discovered through incoming transfers.</p>
        <ol className="origin-list">{(result.traversalOrder || result.ancestors || []).map(id => {const a=graph.actors.find(x=>x.id===id);return <li key={id}><span>{id}</span><div><strong>{a?.name||`Actor ${id}`}</strong><small>{a?.type||'Actor'} · discovered upstream</small></div></li>;})}</ol>
      </section>
      <section className="panel graph-panel"><div className="graph-canvas small"><ReactFlow nodes={nodes} edges={edges} fitView><Background/><Controls/></ReactFlow></div></section>
    </div>}
  </>;
}

function DFSPage({ graph, cycles, setCycles, cycleTransfers, setCycleTransfers, riskAssessments,
  setRiskAssessments, setNotice }) {
  const [selected, setSelected] = useState(null);
  const [time, setTime] = useState(null);
  const [riskSummary, setRiskSummary] = useState(null);
  const run = async () => {
    try {
      const data = await api('/analysis/risk', { method:'POST', body:JSON.stringify({}) });
      setCycles(data.cycles || []);
      setCycleTransfers(data.cycleTransfers || []);
      setRiskAssessments(data.assessments || []);
      setRiskSummary(data.summary || null);
      setTime(data.executionTimeMs);
      setSelected((data.cycles||[])[0] || null);
    } catch (error) { setNotice(error.message); }
  };
  const selectedSet = new Set(selected || []);
  const selectedCycleIndex = cycles.indexOf(selected);
  const selectedTransferIds = new Set((cycleTransfers[selectedCycleIndex] || []).map(transfer => transfer.id));
  const columns = Math.max(1, Math.ceil(Math.sqrt(graph.actors.length)));
  const nodes = graph.actors.map((a,i)=>({id:String(a.id),position:{x:180*(i%columns),y:140*Math.floor(i/columns)},data:{label:`${a.name}\n${a.type}`},style:{borderRadius:12,border:`2px solid ${selectedSet.has(a.id)?'#dc2626':'#94a3b8'}`,background:selectedSet.has(a.id)?'#fee2e2':'#fff',width:150,textAlign:'center',whiteSpace:'pre-line'}}));
  const edges = graph.transfers.map((t,i)=>{
    const active=selectedTransferIds.has(t.id);
    return {id:`d${t.id||i}`,source:String(t.sourceId),target:String(t.destinationId),label:`P${t.productId}`,markerEnd:{type:MarkerType.ArrowClosed,color:active?'#dc2626':'#94a3b8'},animated:active,style:{stroke:active?'#dc2626':'#94a3b8',strokeWidth:active?3:1.5}};
  });
  return <>
    <section className="panel form-panel"><div className="panel-heading"><div><p className="eyebrow">Three-colour DFS + contextual rules</p><h2>Circular Transfer and Description Analysis</h2></div><button className="danger primary" onClick={run}><ShieldAlert size={17}/>Run DFS &amp; Risk Analysis</button></div></section>
    {time !== null && <div className={`result-banner ${cycles.length?'warning':'success'}`}>{cycles.length?<AlertTriangle size={22}/>:<CheckCircle2 size={22}/>}<div><strong>{cycles.length?'CIRCULAR TRANSFER PATTERNS DETECTED':'NO CIRCULAR TRANSFER PATTERNS DETECTED'}</strong><small>{cycles.length} cycle(s) · DFS {time.toFixed(4)} ms. A cycle alone is not evidence of wrongdoing.</small></div></div>}
    {cycles.length>0 && <div className="dashboard-grid">
      <section className="panel"><div className="panel-heading"><div><p className="eyebrow">Detected Cycles</p><h2>Select a cycle</h2></div></div>
        <div className="cycle-list">{cycles.map((cycle,index)=><button key={index} className={selected===cycle?'active':''} onClick={()=>setSelected(cycle)}><strong>Cycle {index+1}</strong><span>{cycle.join(' → ')}</span><div className="cycle-purpose-list">{(cycleTransfers[index]||[]).map((transfer, transferIndex)=><small key={transfer.id || transferIndex}>{transfer.sourceId} → {transfer.destinationId}: {transfer.purpose}{transfer.purpose === 'Other' && transfer.otherReason ? ` — ${transfer.otherReason}` : ''}{transfer.description ? ` — ${transfer.description}` : ''}</small>)}</div></button>)}</div>
      </section>
      <section className="panel graph-panel"><div className="graph-canvas small"><ReactFlow nodes={nodes} edges={edges} fitView><Background/><Controls/></ReactFlow></div></section>
    </div>}
    {riskAssessments.length > 0 && <RiskAssessmentResults assessments={riskAssessments} summary={riskSummary} />}
  </>;
}

function RiskAssessmentResults({ assessments, summary }) {
  const riskClass = (classification) => classification.toLowerCase().replace(/\s+/g, '-');
  const displaySummary = summary || assessments.reduce((counts, assessment) => {
    counts[assessment.riskClassification] = (counts[assessment.riskClassification] || 0) + 1;
    return counts;
  }, {});
  return <section className="panel risk-assessments">
    <div className="panel-heading"><div><p className="eyebrow">Automated Review · Not Verified Fraud</p><h2>Transfer Risk Assessments</h2></div></div>
    <div className="risk-counts">{Object.entries(displaySummary).map(([label, count])=><span key={label} className={`risk-pill ${riskClass(label)}`}>{label}: {count}</span>)}</div>
    <p className="risk-disclaimer">These rule-based flags support investigation. They do not establish that fraud has occurred.</p>
    <div className="table-wrap"><table className="risk-table"><thead><tr><th>Transfer</th><th>Organizations</th><th>Purpose</th><th>User Description</th><th>Detected Indicators</th><th>Risk</th><th>Classification Reason</th><th>Recommended Action</th></tr></thead>
      <tbody>{assessments.map((assessment,index)=><tr key={assessment.transferId ?? index}>
        <td>#{assessment.transferId}<small>{assessment.cycleAssociated?'In detected cycle':'Not in detected cycle'}</small></td>
        <td>{assessment.sourceOrganization}<small>to {assessment.destinationOrganization}</small></td>
        <td>{assessment.purpose}</td>
        <td className="risk-description">{assessment.userDescription || 'No description supplied'}<small>Authorization: {assessment.authorizationStatus}{assessment.authorizationReference ? ` · ${assessment.authorizationReference}` : ''}</small></td>
        <td>{assessment.riskIndicators.length ? <ul>{assessment.riskIndicators.map(indicator=><li key={indicator}>{indicator}</li>)}</ul> : 'No strong indicators detected'}</td>
        <td><span className={`risk-badge ${riskClass(assessment.riskClassification)}`}>{assessment.riskClassification}</span></td>
        <td>{assessment.classificationReason}</td>
        <td>{assessment.recommendedAction}</td>
      </tr>)}</tbody>
    </table></div>
  </section>;
}

function SyntheticPage({ refresh, setNotice, setCycles, setCycleTransfers }) {
  const [form,setForm]=useState({vertices:100,edges:150,cycles:2,seed:2026});
  const [result,setResult]=useState(null);
  useEffect(() => {
    api('/synthetic')
      .then(data => { if (data.synthetic) setResult(data); })
      .catch(error => setNotice(error.message));
  }, [setNotice]);
  const generate=async()=>{
    try {const data=await api('/synthetic/generate',{method:'POST',body:JSON.stringify(form)});setResult(data);await refresh();setNotice('Synthetic dataset generated');}
    catch(error){setNotice(error.message);}
  };
  const clear=async()=>{try{await api('/synthetic',{method:'DELETE'});setResult(null);setCycles([]);setCycleTransfers([]);await refresh();setNotice('Synthetic dataset cleared');}catch(error){setNotice(error.message);}};
  return <>
    <section className="panel form-panel"><div className="panel-heading"><div><p className="eyebrow">C++ Generator</p><h2>Generate Supply Chain Dataset</h2></div></div>
      <div className="presets"><button onClick={()=>setForm({vertices:100,edges:150,cycles:2,seed:2026})}>Small · 100</button><button onClick={()=>setForm({vertices:500,edges:750,cycles:5,seed:2027})}>Medium · 500</button><button onClick={()=>setForm({vertices:1000,edges:1500,cycles:10,seed:2028})}>Large · 1000</button><button onClick={()=>setForm({vertices:5000,edges:7500,cycles:20,seed:2029})}>Extra Large · 5000</button></div>
      <div className="form-grid"><label>Actors<input type="number" min="1" max="10000" value={form.vertices} onChange={e=>setForm({...form,vertices:Number(e.target.value)})}/></label><label>Transfers<input type="number" min={Math.max(0,form.vertices-1+form.cycles)} max="50000" value={form.edges} onChange={e=>setForm({...form,edges:Number(e.target.value)})}/></label><label>Cycles to inject<input type="number" min="0" max={Math.floor(form.vertices/3)} value={form.cycles} onChange={e=>setForm({...form,cycles:Number(e.target.value)})}/></label><label>Random seed<input type="number" min="0" max="4294967295" value={form.seed} onChange={e=>setForm({...form,seed:Number(e.target.value)})}/></label></div>
      <p className="muted">Use at most floor(actors / 3) cycles and at least actors − 1 + cycles transfers so the requested graph and ground truth are generated exactly.</p>
      <div className="action-row"><button className="primary" onClick={generate}><Database size={17}/>Generate Dataset</button><button onClick={clear}>Clear Dataset</button></div>
    </section>
    {result && <>
      <div className="stats-grid"><StatCard icon={Users} label="Generated Actors" value={result.graph?.actors?.length||0} tone="blue"/><StatCard icon={ArrowLeftRight} label="Generated Transfers" value={result.graph?.transfers?.length||0} tone="green"/><StatCard icon={ShieldAlert} label="Injected Cycles" value={result.truth?.length||0} tone="red"/><StatCard icon={ChartNoAxesCombined} label="Random Seed" value={result.seed ?? form.seed} tone="purple"/></div>
      <section className="panel"><div className="panel-heading"><div><p className="eyebrow">Generator Ground Truth</p><h2>Injected Directed Cycles</h2></div></div><p className="muted">These known cycle sequences are used to evaluate DFS detection accuracy.</p><ol className="origin-list">{(result.truth||[]).map((cycle,index)=><li key={index}><span>{index+1}</span><div><strong>{cycle.map(id=>result.graph?.actors?.find(actor=>actor.id===id)?.name||`Actor ${id}`).join(' → ')}</strong><small>Cycle {index+1} · {cycle.length-1} directed transfers</small></div></li>)}</ol></section>
    </>}
  </>;
}

function PerformancePage({ performance,setPerformance,setNotice }) {
  const run=async()=>{try{const data=await api('/analysis/performance',{method:'POST',body:'{}'});setPerformance(previous=>[...(data.results||[]).map(result=>({...result,runId:data.id,runCreatedAt:data.createdAt,algorithmVersion:data.algorithmVersion})),...previous]);setNotice('Performance analysis completed');}catch(error){setNotice(error.message);}};
  const currentResults=(performance||[]).filter(r=>r.algorithmVersion===PERFORMANCE_ALGORITHM_VERSION);
  const legacyResults=(performance||[]).filter(r=>r.algorithmVersion!==PERFORMANCE_ALGORITHM_VERSION);
  const chartData=currentResults.map(r=>({...r,name:r.vertices}));
  return <>
    <section className="panel form-panel"><div className="panel-heading"><div><p className="eyebrow">Measured Results</p><h2>BFS and DFS Performance</h2></div><button className="primary" onClick={run}><ChartNoAxesCombined size={17}/>Run 100–5000 Vertex Tests</button></div></section>
    {legacyResults.length>0&&<div className="result-banner warning"><AlertTriangle size={22}/><div><strong>Historical results retained</strong><small>{legacyResults.length} saved result(s) predate the directed-cycle-path algorithm version and are excluded from current charts. Run the tests again to create comparable current-version measurements.</small></div></div>}
    {currentResults.length>0&&<div className="chart-grid">
        <section className="panel"><div className="panel-heading"><h2>Execution Time Comparison</h2></div><div className="chart"><ResponsiveContainer><LineChart data={chartData}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="name"/><YAxis/><Tooltip/><Legend/><Line type="monotone" dataKey="bfsMilliseconds" name="BFS ms" stroke="#2563eb"/><Line type="monotone" dataKey="dfsMilliseconds" name="DFS ms" stroke="#dc2626"/></LineChart></ResponsiveContainer></div></section>
        <section className="panel"><div className="panel-heading"><h2>Detection Accuracy</h2></div><div className="chart"><ResponsiveContainer><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="name"/><YAxis/><Tooltip/><Legend/><Bar dataKey="precision" name="Precision" fill="#2563eb"/><Bar dataKey="recall" name="Recall" fill="#16a34a"/><Bar dataKey="f1" name="F1" fill="#f59e0b"/></BarChart></ResponsiveContainer></div></section>
      </div>}
    {performance.length>0&&<section className="panel"><div className="panel-heading"><div><p className="eyebrow">Detailed Metrics</p><h2>Performance Results</h2></div></div><div className="table-wrap"><table><thead><tr><th>Algorithm Version</th><th>Vertices</th><th>Edges</th><th>BFS ms</th><th>DFS ms</th><th>Injected</th><th>Detected</th><th>TP</th><th>FP</th><th>FN</th><th>Precision</th><th>Recall</th><th>F1</th></tr></thead><tbody>{performance.map((r,index)=><tr key={`${r.runId||'run'}-${r.vertices}-${index}`}><td>{r.algorithmVersion===PERFORMANCE_ALGORITHM_VERSION?'Current':'Historical — rerun'}</td><td>{r.vertices}</td><td>{r.edges}</td><td>{r.bfsMilliseconds?.toFixed(4)}</td><td>{r.dfsMilliseconds?.toFixed(4)}</td><td>{r.injectedCycles}</td><td>{r.detectedCycles}</td><td>{r.truePositives}</td><td>{r.falsePositives}</td><td>{r.falseNegatives}</td><td>{r.precision?.toFixed(4)}</td><td>{r.recall?.toFixed(4)}</td><td>{r.f1?.toFixed(4)}</td></tr>)}</tbody></table></div></section>}
  </>;
}

function ReportsPage({ graph, cycles, performance, setNotice }) {
  const downloadCsv=()=>{window.location.href='/api/reports/export';};
  const printPdf=()=>window.print();
  return <>
    <section className="panel"><div className="panel-heading"><div><p className="eyebrow">Export Center</p><h2>Analysis Reports</h2></div></div>
      <div className="report-grid"><article><FileText size={28}/><h3>PDF Report</h3><p>Print or save the current project summary as a PDF.</p><button className="primary" onClick={printPdf}>Download / Print PDF</button></article><article><ArrowLeftRight size={28}/><h3>Transfer CSV</h3><p>Export all recorded transfer events and actor relationships.</p><button onClick={downloadCsv}>Export CSV</button></article></div>
    </section>
    <section className="panel report-summary"><div className="panel-heading"><div><p className="eyebrow">Live Summary</p><h2>Provenance Graph Report</h2></div></div><dl><div><dt>Total actors</dt><dd>{graph.actors.length}</dd></div><div><dt>Total transfers</dt><dd>{graph.transfers.length}</dd></div><div><dt>Detected cycles</dt><dd>{cycles.length}</dd></div><div><dt>Performance runs</dt><dd>{new Set(performance.map(result=>result.runId).filter(Boolean)).size}</dd></div></dl><h3>Complexity Analysis</h3><p><strong>Reverse BFS:</strong> O(V + E) time, O(V) space.</p><p><strong>Three-colour DFS:</strong> O(V + E) time, O(V) space.</p><p className="muted">Detected cycles indicate suspicious transfer patterns, not definitive proof of fraud.</p></section>
  </>;
}

export default App;
