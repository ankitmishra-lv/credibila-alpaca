import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from './api.js';

const SEED = { AAPL:335.88, MSFT:497.59, TSLA:377.99, NVDA:223.71, SPY:767.29, GOOGL:174.80, AMZN:186.30 };
const fmt = n => (n<0?'-$':'$') + Math.abs(n).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});

function loadLS(){
  try{ const raw = localStorage.getItem('brokerReactState'); if(raw) return JSON.parse(raw); }catch(e){}
  return null;
}
function saveLS(s){ try{ localStorage.setItem('brokerReactState', JSON.stringify(s)); }catch(e){} }

export default function App(){
  const saved = loadLS();
  const [screen, setScreen] = useState(saved?.account ? 'dashboard' : (saved?.loggedIn ? 'create' : 'login'));
  const [apiBase, setApiBase] = useState(saved?.apiBase || import.meta.env.VITE_API_BASE || 'http://localhost:4000');
  const [account, setAccount] = useState(saved?.account || null);
  const [notifications, setNotifications] = useState(saved?.notifications || []);
  const [positions, setPositions] = useState({});
  const [orders, setOrders] = useState([]);
  const [watchlist, setWatchlist] = useState(saved?.watchlist || ['AAPL','MSFT','TSLA','NVDA','SPY']);
  const [prices, setPrices] = useState(saved?.prices || {...SEED});
  const [dayStart] = useState(saved?.dayStart || {...SEED});
  const [activeSym, setActiveSym] = useState('AAPL');

  const notify = useCallback((icon, title, detail) => {
    setNotifications(n => [{ icon, title, detail, t: new Date().toLocaleString() }, ...n]);
  }, []);

  useEffect(() => { saveLS({ apiBase, account, notifications, watchlist, prices, dayStart, loggedIn: screen!=='login' }); },
    [apiBase, account, notifications, watchlist, prices, dayStart, screen]);

  const price = sym => {
    if (prices[sym] != null) return prices[sym];
    const p = 100 + Math.random()*300;
    setPrices(prev => ({ ...prev, [sym]: p }));
    dayStart[sym] = p;
    return p;
  };

  const refreshFromBackend = useCallback(async () => {
    if (!account?.id) return;
    try {
      const [details, pos, ord] = await Promise.all([
        api(apiBase, `/api/accounts/${account.id}/trading-details`).catch(()=>null),
        api(apiBase, `/api/accounts/${account.id}/positions`).catch(()=>[]),
        api(apiBase, `/api/accounts/${account.id}/orders?status=all`).catch(()=>[]),
      ]);
      if (details) setAccount(a => ({ ...a, cash: parseFloat(details.cash||0), buying_power: parseFloat(details.buying_power||0) }));
      const posMap = {};
      (pos||[]).forEach(p => { posMap[p.symbol] = { qty: parseFloat(p.qty), avg: parseFloat(p.avg_entry_price) }; });
      setPositions(posMap);
      setOrders((ord||[]).map(o => ({
        symbol:o.symbol, side:o.side, qty:o.qty, type:o.type,
        filled_avg_price: o.filled_avg_price ? parseFloat(o.filled_avg_price) : 0,
        status:o.status, time:new Date(o.submitted_at||Date.now()).toLocaleTimeString(),
      })));
    } catch (e) { notify('⚠️','Could not refresh from backend', e.message); }
  }, [account?.id, apiBase, notify]);

  useEffect(() => { if (screen==='dashboard') refreshFromBackend(); }, [screen]); // eslint-disable-line

  if (screen === 'login') return <LoginView apiBase={apiBase} setApiBase={setApiBase} onSuccess={()=>setScreen('create')} notify={notify} />;
  if (screen === 'create') return <CreateAccountView apiBase={apiBase} onCreated={(acct)=>{ setAccount(acct); notify('🏦','Account created', `#${acct.account_number} · status ${acct.status}`); setScreen('fund'); }} onUseExisting={()=>setScreen('existing')} />;
  if (screen === 'existing') return <UseExistingView apiBase={apiBase} onLoaded={(acct)=>{ setAccount(acct); notify('✅','Loaded existing account', `#${acct.account_number} · status ${acct.status}`); setScreen('dashboard'); }} onBack={()=>setScreen('create')} />;
  if (screen === 'fund') return <FundView apiBase={apiBase} accountId={account.id} onDone={()=>setScreen('dashboard')} notify={notify} />;

  return (
    <Dashboard
      apiBase={apiBase} account={account} setAccount={setAccount}
      notifications={notifications} notify={notify}
      positions={positions} orders={orders}
      watchlist={watchlist} setWatchlist={setWatchlist}
      activeSym={activeSym} setActiveSym={setActiveSym}
      price={price} refreshFromBackend={refreshFromBackend}
      onLogout={()=>{ localStorage.removeItem('brokerReactState'); setAccount(null); setScreen('login'); }}
    />
  );
}

function LoginView({ apiBase, setApiBase, onSuccess, notify }){
  const [email, setEmail] = useState('jane@example.com');
  const [password, setPassword] = useState('demo1234');
  const [base, setBase] = useState(apiBase);
  const [err, setErr] = useState('');

  const doLogin = async () => {
    setErr('');
    try {
      const res = await fetch(`${base}/health`);
      if (!res.ok) throw new Error();
    } catch {
      setErr(`Can't reach backend at ${base}. Is the Express proxy running?`);
      return;
    }
    setApiBase(base);
    notify('✅','Logged in', email);
    onSuccess();
  };

  return (
    <div className="authwrap">
      <div className="brand"><span className="dot"></span>Broker Demo</div>
      <div className="card">
        <h1>Log In</h1>
        <p className="sub">React frontend talking to your real Express proxy + Alpaca sandbox.</p>
        <label>Backend URL</label>
        <input value={base} onChange={e=>setBase(e.target.value)} />
        <label>Email</label>
        <input type="email" value={email} onChange={e=>setEmail(e.target.value)} />
        <label>Password</label>
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        <button className="btn-primary" onClick={doLogin}>Log In</button>
        {err && <div className="sub" style={{color:'#ef4444', marginTop:10}}>{err}</div>}
      </div>
    </div>
  );
}

function CreateAccountView({ apiBase, onCreated, onUseExisting }){
  const [given, setGiven] = useState('John');
  const [family, setFamily] = useState('Doe');
  const [email, setEmail] = useState('jane@example.com');
  const [dob, setDob] = useState('1990-01-01');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    setBusy(true); setErr('');
    const payload = {
      contact:{ email_address:email, phone_number:'555-666-7788', street_address:['20 N San Mateo Dr'], city:'San Mateo', state:'CA', postal_code:'94401', country:'USA' },
      identity:{ given_name:given, family_name:family, date_of_birth:dob, tax_id_type:'USA_SSN', tax_id:'549-32-7861', country_of_citizenship:'USA', country_of_birth:'USA', country_of_tax_residence:'USA', funding_source:['employment_income'] },
      disclosures:{ is_control_person:false, is_affiliated_exchange_or_finra:false, is_politically_exposed:false, immediate_family_exposed:false },
      agreements:[
        { agreement:'margin_agreement', signed_at:new Date().toISOString(), ip_address:'127.0.0.1' },
        { agreement:'account_agreement', signed_at:new Date().toISOString(), ip_address:'127.0.0.1' },
        { agreement:'customer_agreement', signed_at:new Date().toISOString(), ip_address:'127.0.0.1' },
      ],
    };
    try {
      const account = await api(apiBase, '/api/accounts', { method:'POST', body:payload });
      onCreated({ id:account.id, account_number:account.account_number, status:account.status, cash:0, given_name:given, family_name:family });
    } catch (e) { setErr(e.message); }
    setBusy(false);
  };

  return (
    <div className="authwrap">
      <div className="brand"><span className="dot"></span>Broker Demo</div>
      <div className="card">
        <h1>Create Brokerage Account</h1>
        <p className="sub">Submits <code>POST /v1/accounts</code> via your proxy. Non-form fields use Alpaca's documented sandbox test values.</p>
        <div className="row2">
          <div><label>Given Name</label><input value={given} onChange={e=>setGiven(e.target.value)} /></div>
          <div><label>Family Name</label><input value={family} onChange={e=>setFamily(e.target.value)} /></div>
        </div>
        <label>Email Address</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} />
        <label>Date of Birth</label><input type="date" value={dob} onChange={e=>setDob(e.target.value)} />
        <button className="btn-primary" disabled={busy} onClick={submit}>{busy ? 'Submitting…' : 'Submit Application'}</button>
        {err && <div className="sub" style={{color:'#ef4444', marginTop:10}}>{err}</div>}
        <div className="link" onClick={onUseExisting}>Already have an account? Use its ID →</div>
      </div>
    </div>
  );
}

function UseExistingView({ apiBase, onLoaded, onBack }){
  const [id, setId] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    if (!id.trim()) { setErr('Enter an account ID.'); return; }
    setBusy(true); setErr('');
    try {
      const acct = await api(apiBase, `/api/accounts/${id.trim()}`);
      onLoaded({ id:acct.id, account_number:acct.account_number, status:acct.status, cash:0, given_name:acct.identity?.given_name||'', family_name:acct.identity?.family_name||'' });
    } catch (e) { setErr(e.message); }
    setBusy(false);
  };

  return (
    <div className="authwrap">
      <div className="brand"><span className="dot"></span>Broker Demo</div>
      <div className="card">
        <h1>Use Existing Account</h1>
        <p className="sub">Skip creation and jump straight to the dashboard for an account you already made.</p>
        <label>Account ID</label>
        <input value={id} onChange={e=>setId(e.target.value)} placeholder="e.g. 8f8c8cee-2591-4f83-..." />
        <button className="btn-primary" disabled={busy} onClick={submit}>{busy ? 'Loading…' : 'Load Account'}</button>
        {err && <div className="sub" style={{color:'#ef4444', marginTop:10}}>{err}</div>}
        <div className="link" onClick={onBack}>← Back</div>
      </div>
    </div>
  );
}

function FundView({ apiBase, accountId, onDone, notify }){
  const [sweepId, setSweepId] = useState('');
  const [amount, setAmount] = useState('50000');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    if (!sweepId.trim()) { setErr('Enter a sweep/from-account ID from Brokerdash.'); return; }
    setBusy(true); setErr('');
    try {
      await api(apiBase, '/api/journals', { method:'POST', body:{ to_account:accountId, from_account:sweepId, entry_type:'JNLC', amount:String(amount) } });
      notify('💵','Journal submitted', `$${amount} requested from sweep account`);
      onDone();
    } catch (e) { setErr(e.message); }
    setBusy(false);
  };

  return (
    <div className="authwrap">
      <div className="brand"><span className="dot"></span>Broker Demo</div>
      <div className="card">
        <h1>Fund Account</h1>
        <p className="sub">Sandbox accounts start at $0. Enter the sweep/from-account ID from your Brokerdash sandbox settings.</p>
        <label>From Account ID (sweep account)</label><input value={sweepId} onChange={e=>setSweepId(e.target.value)} placeholder="e.g. abc123..." />
        <label>Amount (USD)</label><input type="number" value={amount} onChange={e=>setAmount(e.target.value)} />
        <button className="btn-primary" disabled={busy} onClick={submit}>{busy ? 'Journaling…' : 'Journal Funds'}</button>
        <div className="link" style={{textAlign:'left', marginTop:10}} onClick={onDone}>Skip for now →</div>
        {err && <div className="sub" style={{color:'#ef4444', marginTop:10}}>{err}</div>}
      </div>
    </div>
  );
}

function useChartSeries(sym, price){
  const cache = useRef({});
  if (!cache.current[sym]) {
    let p = price(sym) * 0.97, arr = [];
    for (let i=0;i<60;i++){ p += (Math.random()-0.48)*p*0.012; arr.push(p); }
    arr[arr.length-1] = price(sym);
    cache.current[sym] = arr;
  }
  return cache.current[sym];
}

function Chart({ sym, price }){
  const data = useChartSeries(sym, price);
  const w=700,h=220,pad=6;
  const min=Math.min(...data), max=Math.max(...data);
  const x = i => pad + i*(w-2*pad)/(data.length-1);
  const y = v => pad + (h-2*pad) - ((v-min)/(max-min||1))*(h-2*pad);
  const up = data[data.length-1] >= data[0];
  const line = data.map((v,i)=> `${i===0?'M':'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = line + ` L${x(data.length-1).toFixed(1)},${h-pad} L${x(0).toFixed(1)},${h-pad} Z`;
  const color = up ? '#22c55e' : '#ef4444';
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="220" preserveAspectRatio="none">
      <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity="0.35"/><stop offset="100%" stopColor={color} stopOpacity="0"/>
      </linearGradient></defs>
      <path d={area} fill="url(#g)" stroke="none"/>
      <path d={line} fill="none" stroke={color} strokeWidth="2"/>
    </svg>
  );
}

function Dashboard({ apiBase, account, notifications, notify, positions, orders, watchlist, setWatchlist, activeSym, setActiveSym, price, refreshFromBackend, onLogout }){
  const [sub, setSub] = useState('positions');
  const [side, setSide] = useState('buy');
  const [unit, setUnit] = useState('shares');
  const [symbol, setSymbol] = useState(activeSym);
  const [qty, setQty] = useState(0);
  const [type, setType] = useState('market');
  const [tif, setTif] = useState('Day');
  const [limitPrice, setLimitPrice] = useState(0);
  const [addSym, setAddSym] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [seen, setSeen] = useState(0);
  const [showFund, setShowFund] = useState(false);
  const [fundFrom, setFundFrom] = useState('');
  const [fundAmt, setFundAmt] = useState('5000');
  const [fundErr, setFundErr] = useState('');
  const [fundBusy, setFundBusy] = useState(false);

  const doFund = async () => {
    if (!fundFrom.trim()) { setFundErr('Enter a sweep/from-account ID.'); return; }
    setFundBusy(true); setFundErr('');
    try {
      await api(apiBase, '/api/journals', { method:'POST', body:{ to_account:account.id, from_account:fundFrom, entry_type:'JNLC', amount:String(fundAmt) } });
      notify('💵','Journal submitted', `$${fundAmt} requested from sweep account`);
      setShowFund(false);
      await refreshFromBackend();
    } catch (e) { setFundErr(e.message); }
    setFundBusy(false);
  };

  const posVal = Object.entries(positions).reduce((s,[sym,p])=> s + (p.qty>0? p.qty*price(sym):0), 0);
  const equity = (account.cash||0) + posVal;
  const px = price(symbol);

  const placeOrder = async () => {
    if (!symbol || qty<=0) return;
    setSubmitting(true);
    const shares = unit==='dollars' ? +(qty/px).toFixed(4) : qty;
    const body = { symbol: symbol.toUpperCase(), qty:String(shares), side, type, time_in_force: tif.toLowerCase() };
    if (type==='limit') body.limit_price = String(limitPrice);
    try {
      const order = await api(apiBase, `/api/accounts/${account.id}/orders`, { method:'POST', body });
      notify(side==='buy'?'🟢':'🔴', `Order ${order.status}: ${side.toUpperCase()} ${shares} ${symbol}`, `type ${type} · id ${order.id}`);
      setQty(0);
      await refreshFromBackend();
      setSub('history');
    } catch (e) {
      notify('⚠️','Order rejected', e.message);
      setSub('notifs');
    }
    setSubmitting(false);
  };

  const closePosition = async (sym) => {
    const pos = positions[sym]; if (!pos || pos.qty<=0) return;
    try {
      await api(apiBase, `/api/accounts/${account.id}/orders`, { method:'POST', body:{ symbol:sym, qty:String(pos.qty), side:'sell', type:'market', time_in_force:'day' } });
      notify('🔴', `Close submitted: ${sym}`, `Selling ${pos.qty} shares`);
      await refreshFromBackend();
    } catch (e) { notify('⚠️','Close failed', e.message); }
  };

  const addSymbolToWatchlist = () => {
    const s = addSym.trim().toUpperCase();
    if (!s) return;
    if (!watchlist.includes(s)) setWatchlist(w => [...w, s]);
    price(s);
    setAddSym('');
  };

  const unseenCount = notifications.length - seen;
  const posEntries = Object.entries(positions).filter(([,p])=>p.qty>0);
  const openOrders = orders.filter(o => o.status==='pending' || o.status==='new' || o.status==='accepted');

  return (
    <div id="dash" className="active">
      <div className="topbar">
        <div className="name">{account.given_name} {account.family_name} <span className="pill-paper">PAPER</span></div>
        <div className="stat-blk"><div className="l">Equity</div><div className="v">{fmt(equity)}</div></div>
        <div className="stat-blk"><div className="l">Buying Power</div><div className="v">{fmt(account.buying_power ?? account.cash ?? 0)}</div></div>
        <div className="stat-blk"><div className="l">Cash</div><div className="v">{fmt(account.cash||0)}</div></div>
        <div className="spacer"></div>
        <button className="btn-ghost" style={{padding:'8px 12px', fontSize:12}} onClick={()=>setShowFund(s=>!s)}>+ Fund</button>
        <div className="bell" onClick={()=>{ setSub('notifs'); setSeen(notifications.length); }}>
          🔔{unseenCount>0 && <span className="badge">{unseenCount}</span>}
        </div>
        <div className="market-status">Sandbox</div>
        <div className="logout" onClick={onLogout}>Log out</div>
      </div>
      {showFund && (
        <div className="card" style={{position:'absolute', top:56, right:20, width:280, zIndex:10}}>
          <h2>Fund Account</h2>
          <label>From Account ID (sweep account)</label>
          <input value={fundFrom} onChange={e=>setFundFrom(e.target.value)} placeholder="e.g. abc123..." />
          <label>Amount (USD)</label>
          <input type="number" value={fundAmt} onChange={e=>setFundAmt(e.target.value)} />
          <button className="btn-primary" disabled={fundBusy} onClick={doFund}>{fundBusy ? 'Journaling…' : 'Journal Funds'}</button>
          {fundErr && <div className="sub" style={{color:'#ef4444', marginTop:8}}>{fundErr}</div>}
        </div>
      )}

      <div className="body">
        <div className="col-watch">
          <h2>Watchlist</h2>
          <div className="addrow">
            <input placeholder="Add symbol" value={addSym} onChange={e=>setAddSym(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addSymbolToWatchlist()} />
            <button onClick={addSymbolToWatchlist}>Add</button>
          </div>
          <div>
            {watchlist.map(sym => {
              const p = price(sym);
              return (
                <div key={sym} className={`wl-item${sym===activeSym?' active':''}`} onClick={()=>{ setActiveSym(sym); setSymbol(sym); }}>
                  <div className="sym">{sym}</div>
                  <div className="px">{fmt(p)}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="col-main">
          <div className="ticker-hd">
            <span className="sym">{activeSym}</span>
            <span className="px">{fmt(price(activeSym))}</span>
          </div>
          <div className="bidask">Bid {fmt(price(activeSym)-0.15)} Ask {fmt(price(activeSym)+0.15)}</div>
          <div className="chartbox">
            <Chart sym={activeSym} price={price} />
            <div className="chart-note">Daily closes, last 60 sessions (simulated watchlist prices — wire in Alpaca Market Data API for real quotes).</div>
          </div>

          <div className="tablecard">
            <div className="subtabs">
              <div className={`subtab${sub==='positions'?' active':''}`} onClick={()=>setSub('positions')}>Positions ({posEntries.length})</div>
              <div className={`subtab${sub==='open'?' active':''}`} onClick={()=>setSub('open')}>Open orders ({openOrders.length})</div>
              <div className={`subtab${sub==='history'?' active':''}`} onClick={()=>setSub('history')}>Order history</div>
              <div className={`subtab${sub==='notifs'?' active':''}`} onClick={()=>{ setSub('notifs'); setSeen(notifications.length); }}>Notifications</div>
            </div>

            {sub==='positions' && (
              <div className="overflow">
                <table><thead><tr><th>Symbol</th><th>Qty</th><th>Avg Cost</th><th>Price</th><th>Mkt Value</th><th>P/L</th><th></th></tr></thead>
                <tbody>
                  {posEntries.map(([sym,p])=>{
                    const mkt = price(sym), mv = p.qty*mkt, pl = (mkt-p.avg)*p.qty, plPct=((mkt-p.avg)/p.avg)*100;
                    return (
                      <tr key={sym}>
                        <td className="linklike">{sym}</td><td>{p.qty}</td><td>{fmt(p.avg)}</td><td>{fmt(mkt)}</td><td>{fmt(mv)}</td>
                        <td className={pl>=0?'up':'down'}>{pl>=0?'+':''}{fmt(pl)} ({plPct>=0?'+':''}{plPct.toFixed(2)}%)</td>
                        <td><button className="closebtn" onClick={()=>closePosition(sym)}>Close</button></td>
                      </tr>
                    );
                  })}
                </tbody></table>
                {posEntries.length===0 && <div className="empty">No open positions.</div>}
              </div>
            )}
            {sub==='open' && (
              <div className="overflow">
                <table><thead><tr><th>Symbol</th><th>Side</th><th>Qty</th><th>Type</th><th>Status</th></tr></thead>
                <tbody>{openOrders.map((o,i)=>(
                  <tr key={i}><td>{o.symbol}</td><td className={o.side==='buy'?'up':'down'}>{o.side.toUpperCase()}</td><td>{o.qty}</td><td>{o.type}</td><td><span className="tag">{o.status}</span></td></tr>
                ))}</tbody></table>
                {openOrders.length===0 && <div className="empty">No open orders.</div>}
              </div>
            )}
            {sub==='history' && (
              <div className="overflow">
                <table><thead><tr><th>Symbol</th><th>Side</th><th>Qty</th><th>Fill Px</th><th>Status</th><th>Time</th></tr></thead>
                <tbody>{orders.map((o,i)=>(
                  <tr key={i}><td>{o.symbol}</td><td className={o.side==='buy'?'up':'down'}>{o.side.toUpperCase()}</td><td>{o.qty}</td><td>{fmt(o.filled_avg_price)}</td><td><span className="tag">{o.status}</span></td><td>{o.time}</td></tr>
                ))}</tbody></table>
                {orders.length===0 && <div className="empty">No orders yet.</div>}
              </div>
            )}
            {sub==='notifs' && (
              <div>
                {notifications.map((n,i)=>(
                  <div key={i} style={{display:'flex',gap:10,padding:'10px 0',borderBottom:'1px solid var(--border)'}}>
                    <div>{n.icon}</div>
                    <div><div style={{fontSize:13,fontWeight:600}}>{n.title}</div><div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>{n.detail} · {n.t}</div></div>
                  </div>
                ))}
                {notifications.length===0 && <div className="empty">No notifications yet.</div>}
              </div>
            )}
          </div>
        </div>

        <div className="col-ticket">
          <div className="sidewrap">
            <h2>Order Ticket</h2>
            <div className="side-toggle">
              <div className={`buy${side==='buy'?' active':''}`} onClick={()=>setSide('buy')}>Buy</div>
              <div className={`sell${side==='sell'?' active':''}`} onClick={()=>setSide('sell')}>Sell</div>
            </div>
            <label>Symbol</label>
            <input value={symbol} onChange={e=>setSymbol(e.target.value.toUpperCase())} />
            <div className="noposline">{positions[symbol]?.qty>0 ? `Position: ${positions[symbol].qty} shares @ ${fmt(positions[symbol].avg)}` : 'No position'}</div>
            <div className="unit-toggle">
              <div className={unit==='shares'?'active':''} onClick={()=>setUnit('shares')}>Shares</div>
              <div className={unit==='dollars'?'active':''} onClick={()=>setUnit('dollars')}>Dollars</div>
            </div>
            <label>{unit==='shares' ? 'Shares' : 'Dollars'}</label>
            <input type="number" min="0" step="0.0001" value={qty} onChange={e=>setQty(parseFloat(e.target.value)||0)} />
            <div className="row2" style={{marginTop:8}}>
              <div><label>Order type</label>
                <select value={type} onChange={e=>setType(e.target.value)}>
                  <option value="market">Market</option><option value="limit">Limit</option>
                </select>
              </div>
              <div><label>Time in force</label>
                <select value={tif} onChange={e=>setTif(e.target.value)}>
                  <option>Day</option><option>GTC</option>
                </select>
              </div>
            </div>
            {type==='limit' && (
              <div><label>Limit price ($)</label><input type="number" step="0.01" value={limitPrice} onChange={e=>setLimitPrice(parseFloat(e.target.value)||0)} /></div>
            )}
            <div className="reftbl">
              <div className="r"><span>Reference price</span><span>{fmt(px)}</span></div>
              <div className="r"><span>Estimated cost</span><span>{qty>0 ? fmt(unit==='dollars'?qty:qty*px) : '–'}</span></div>
            </div>
            <button className={`reviewbtn${side==='sell'?' sell':''}`} disabled={submitting} onClick={placeOrder}>
              {submitting ? 'Submitting…' : `Review ${side} order`}
            </button>
            <div className="note">Sandbox orders respect real market hours — a market order placed while closed queues for the next session.</div>
          </div>
        </div>
      </div>
    </div>
  );
}