import { useState, useRef, useEffect, useCallback } from "react";

const DARK = { bg:'#06101e', surface:'#0b1828', card:'#0f2040', border:'#1a3a5c', text:'#cce0f5', muted:'#6b8ba6', accent:'#00d4f0', purple:'#9b8cf9', green:'#22d3a0', amber:'#fbbf24', red:'#f87070', code:'#040e1c', codeBorder:'#1a3050' };
const LIGHT = { bg:'#eef3fa', surface:'#ffffff', card:'#ffffff', border:'#c8d8ec', text:'#0a1828', muted:'#4d6380', accent:'#0284c7', purple:'#6d3ed8', green:'#059669', amber:'#d97706', red:'#dc2626', code:'#e2ebf5', codeBorder:'#b8ccdf' };

const NAV = [
  { id:'hero', label:'Overview' }, { id:'what', label:'What are APIs?' }, { id:'why', label:'Why APIs?' },
  { id:'protocols', label:'Protocol Guide' }, { id:'rest', label:'REST APIs' }, { id:'graphql', label:'GraphQL' },
  { id:'grpc', label:'gRPC' }, { id:'realtime', label:'Real-Time' }, { id:'pagination', label:'Pagination' },
  { id:'versioning', label:'Versioning' }, { id:'auth', label:'Authentication' }, { id:'ratelimit', label:'Rate Limiting' },
  { id:'security', label:'Security' }, { id:'statuscodes', label:'Status Codes' }, { id:'bestpractices', label:'Best Practices' },
  { id:'companies', label:'Companies' }, { id:'interview', label:'Interview Q&A' }, { id:'cheatsheet', label:'Cheat Sheet' },
];

const QA = [
  { level:'Beginner', q:'What is the difference between PUT and PATCH?', a:'PUT replaces the entire resource — you must send the full object. PATCH updates only the specified fields. PUT is idempotent (same result if called multiple times); PATCH may or may not be. Example: PUT /users/1 requires all fields; PATCH /users/1 {email: "new@x.com"} only updates email.', signal:'Mention idempotency. Know that PUT creates if missing.' },
  { level:'Beginner', q:'What are the main HTTP status code families?', a:'2xx = Success (200 OK, 201 Created, 204 No Content). 3xx = Redirect. 4xx = Client error — the caller did something wrong (400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 429 Too Many Requests). 5xx = Server error — your system failed (500 Internal Server Error, 503 Service Unavailable).', signal:'Key distinction: 4xx = client fault, 5xx = server fault.' },
  { level:'Beginner', q:'What is idempotency and why does it matter?', a:'Idempotency means calling the same request multiple times produces the same result. GET, PUT, DELETE are idempotent. POST is not. This matters because networks fail and clients retry — you need to know which operations are safe to retry without side effects. Two POST /bookings calls create two bookings; two DELETE /bookings/55 calls leave the same end state.', signal:'Always link idempotency to retry safety in distributed systems.' },
  { level:'Intermediate', q:'REST vs GraphQL — when would you choose each?', a:'Use REST by default — 90% of cases. It is simpler, cacheable, and familiar to all developers. Use GraphQL when: (1) mobile and web clients need different data shapes (over/under-fetching), (2) the frontend team needs to iterate without backend changes, (3) you need to aggregate from multiple resources in one round trip. Avoid GraphQL for simple CRUD with uniform clients or when HTTP caching is critical — GraphQL POSTs are not cacheable by CDNs.', signal:'Show you know the tradeoffs, not just that GraphQL is "more modern".' },
  { level:'Intermediate', q:'Explain the JWT authentication flow', a:'1) User logs in with credentials. 2) Server validates and generates a JWT containing user_id, role, and expiry, signed with a secret key. 3) Client stores the JWT (memory or httpOnly cookie). 4) Every request sends Authorization: Bearer <token>. 5) Any service validates: signature is valid, token is not expired, claims match permissions — no database lookup needed. Use short-lived access tokens (15-60 min) with a refresh token to issue new ones.', signal:'Mention stateless validation, short expiry, and refresh tokens.' },
  { level:'Intermediate', q:'What is the N+1 problem in GraphQL?', a:'When you query 100 events with their venues, a naive implementation runs 1 query for events + 1 query per event for its venue = 101 queries. At scale this destroys performance. Solution: DataLoader — a batching library that collects all venue IDs across a request, then runs one query: SELECT * FROM venues WHERE id IN (...all ids...). This reduces 101 queries to 2.', signal:'Always mention DataLoader as the standard solution.' },
  { level:'Intermediate', q:'How does pagination work at scale?', a:'Three strategies: (1) Offset — ?offset=40&limit=20. Simple but breaks with concurrent inserts and is slow on large offsets (DB scans all prior rows). (2) Cursor — ?cursor=<opaque_token>&limit=20. Encodes the last-seen position, stable under inserts, fast — ideal for feeds and timelines. (3) Keyset — ?after_id=123&after_date=2024-01-01. Most performant for large tables using indexed columns. Never return unbounded lists — always paginate.', signal:'Know when to use each. Production preference: cursor or keyset.' },
  { level:'Advanced', q:'Design a rate limiting system', a:'Implement at the API gateway level. Four strategies: Fixed Window (simple, bursts at boundary), Sliding Window (smoother, counts rolling N seconds), Token Bucket (allows bursts up to bucket size, refills at fixed rate — best for legitimate traffic spikes), Leaky Bucket (strict even output rate). Return 429 with Retry-After header. Store counters in Redis. Typical limits: 1000 req/hour per auth user, 100/hour per IP unauthenticated, 10/min for sensitive endpoints.', signal:'Mention Redis, the specific strategy tradeoffs, and response headers.' },
  { level:'Advanced', q:'When would you use gRPC instead of REST?', a:'Use gRPC for internal service-to-service communication where you control both sides. gRPC uses HTTP/2 + Protocol Buffers (binary, compressed, multiplexed) — significantly faster than HTTP/1.1 + JSON. Advantages: strict .proto contract with generated type-safe clients in any language, native streaming (unary, server, client, bidirectional), compile-time type safety. Avoid for public browser clients (needs grpc-web proxy). In practice: REST for public endpoints, gRPC for internal microservices pipelines.', signal:'Contrast with REST clearly. Mention proto files and code generation.' },
  { level:'Advanced', q:'How would you version an API?', a:'Four strategies: (1) URL path — /v1/events → /v2/events. Recommended. Explicit, easy to route, easy to test. (2) Header — API-Version: 2. Cleaner URLs but invisible in address bar, harder to test. (3) Query parameter — /events?version=2. Easy to add but pollutes query string. (4) Content negotiation — Accept: application/vnd.api.v2+json. Purist REST but very complex. Best approach: start with URL versioning, run v1 and v2 in parallel, deprecate v1 with sunset headers after migration window.', signal:'Know all four. Recommend URL versioning with confidence.' },
  { level:'System Design', q:'How would you design the API for a ticket booking system?', a:'Protocol: REST (default). Key endpoints: GET /events (paginated), GET /events/{id}, POST /events/{id}/bookings (create), GET /bookings/{id} (own only for customers). Security: JWT for users, API keys for partners. Pagination: cursor-based on list endpoints. Rate limit POST /bookings at 10/min to prevent double-booking spam. Idempotency key header on POST /bookings for retry safety. RBAC: customers see own bookings, managers see venue bookings, admins see all. Consider optimistic locking (409 Conflict) for concurrent seat selection.', signal:'Show you cover: protocol choice, endpoints, auth, pagination, rate limiting in 2-3 mins.' },
];

function useTheme() {
  const [dark, setDark] = useState(true);
  return { t: dark ? DARK : LIGHT, dark, toggle: () => setDark(d => !d) };
}

function CodeBlock({ code, t }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard?.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const highlighted = code.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/(#[^\n]*)/g,'<span style="color:#6a8fa0">$1</span>')
    .replace(/("(?:[^"\\]|\\.)*")/g,'<span style="color:#6de0a0">$1</span>')
    .replace(/\b(GET|POST|PUT|PATCH|DELETE|HTTP)\b/g,'<span style="color:#f0a060">$1</span>')
    .replace(/\b(type|query|mutation|message|syntax|service|rpc|returns|stream|int32|string|bool|class|async|await|import)\b/g,'<span style="color:#90b8f8">$1</span>')
    .replace(/\b(\d{3,}|\d+\.\d+)\b/g,'<span style="color:#fbbf24">$1</span>');
  return (
    <div style={{ position:'relative', margin:'1rem 0', borderRadius:8, border:`1px solid ${t.codeBorder}`, background:t.code, overflow:'hidden' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'6px 12px', borderBottom:`1px solid ${t.codeBorder}`, background:t.dark?'#08182c':t.code }}>
        <div style={{ display:'flex', gap:6 }}>
          {['#f87171','#fbbf24','#22d3a0'].map(c => <div key={c} style={{ width:10,height:10,borderRadius:'50%',background:c }} />)}
        </div>
        <button onClick={copy} style={{ fontSize:11, color:t.muted, background:'none', border:`1px solid ${t.border}`, borderRadius:4, padding:'2px 8px', cursor:'pointer' }}>
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <pre style={{ margin:0, padding:'1rem', overflowX:'auto', fontFamily:'Menlo,Monaco,"Courier New",monospace', fontSize:12.5, lineHeight:1.7, color:t.text }} dangerouslySetInnerHTML={{ __html: highlighted }} />
    </div>
  );
}

function Badge({ children, color, t }) {
  const colors = { cyan:[t.accent,'rgba(0,212,240,0.12)'], purple:[t.purple,'rgba(155,140,249,0.12)'], green:[t.green,'rgba(34,211,160,0.12)'], amber:[t.amber,'rgba(251,191,36,0.12)'], red:[t.red,'rgba(248,112,112,0.12)'] };
  const [fg,bg] = colors[color] || colors.cyan;
  return <span style={{ fontSize:11, fontWeight:600, letterSpacing:'0.04em', padding:'2px 8px', borderRadius:20, background:bg, color:fg, border:`1px solid ${fg}30`, display:'inline-block' }}>{children}</span>;
}

function Card({ children, t, style={} }) {
  return <div style={{ background:t.card, border:`1px solid ${t.border}`, borderRadius:10, padding:'1.25rem', ...style }}>{children}</div>;
}

function SectionTitle({ children, sub, t }) {
  return (
    <div style={{ marginBottom:'1.5rem' }}>
      <h2 style={{ fontSize:26, fontWeight:700, color:t.text, margin:0, fontFamily:'"Georgia",serif', letterSpacing:'-0.02em' }}>{children}</h2>
      {sub && <p style={{ color:t.muted, marginTop:6, marginBottom:0, fontSize:14 }}>{sub}</p>}
    </div>
  );
}

function Tbl({ headers, rows, t }) {
  const th = { background:t.dark?'#0a1f38':'#dce8f5', padding:'8px 12px', textAlign:'left', fontSize:12, fontWeight:600, color:t.accent, letterSpacing:'0.06em', whiteSpace:'nowrap' };
  const td = { padding:'10px 12px', fontSize:13, color:t.text, borderTop:`1px solid ${t.border}`, verticalAlign:'top', lineHeight:1.5 };
  return (
    <div style={{ overflowX:'auto', borderRadius:8, border:`1px solid ${t.border}`, margin:'1rem 0' }}>
      <table style={{ width:'100%', borderCollapse:'collapse' }}>
        <thead><tr>{headers.map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
        <tbody>{rows.map((r,i)=><tr key={i}>{r.map((c,j)=><td key={j} style={td}>{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

function Section({ id, children }) {
  return <section id={id} style={{ marginBottom:'3rem', scrollMarginTop:'20px' }}>{children}</section>;
}

function QAItem({ item, t }) {
  const [open, setOpen] = useState(false);
  const levelColor = { Beginner:'green', Intermediate:'cyan', Advanced:'purple', 'System Design':'amber' };
  return (
    <div style={{ border:`1px solid ${open?t.accent+'60':t.border}`, borderRadius:8, marginBottom:10, overflow:'hidden', transition:'border-color 0.2s' }}>
      <button onClick={() => setOpen(o=>!o)} style={{ width:'100%', background: open?`${t.accent}10`:'none', border:'none', padding:'12px 16px', display:'flex', alignItems:'flex-start', gap:12, cursor:'pointer', textAlign:'left' }}>
        <span style={{ color: open?t.accent:t.muted, fontSize:18, lineHeight:1, marginTop:1, flexShrink:0, transition:'transform 0.2s', transform: open?'rotate(90deg)':'none' }}>›</span>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
            <Badge color={levelColor[item.level]} t={t}>{item.level}</Badge>
          </div>
          <p style={{ margin:0, fontSize:14, fontWeight:600, color:t.text, lineHeight:1.4 }}>{item.q}</p>
        </div>
      </button>
      {open && (
        <div style={{ padding:'0 16px 16px 46px' }}>
          <p style={{ fontSize:13.5, color:t.text, lineHeight:1.7, margin:'0 0 12px' }}>{item.a}</p>
          <div style={{ background:`${t.accent}10`, borderLeft:`3px solid ${t.accent}`, borderRadius:'0 6px 6px 0', padding:'8px 12px' }}>
            <span style={{ fontSize:11, fontWeight:700, color:t.accent, letterSpacing:'0.06em' }}>INTERVIEWER SIGNAL </span>
            <span style={{ fontSize:12.5, color:t.muted }}>{item.signal}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function Checklist({ items, t }) {
  const [checked, setChecked] = useState({});
  const toggle = k => setChecked(c => ({ ...c, [k]: !c[k] }));
  const done = Object.values(checked).filter(Boolean).length;
  return (
    <div>
      <div style={{ marginBottom:12, display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ flex:1, height:6, background:t.border, borderRadius:3, overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${(done/items.length)*100}%`, background:t.accent, borderRadius:3, transition:'width 0.3s' }} />
        </div>
        <span style={{ fontSize:12, color:t.muted }}>{done}/{items.length}</span>
      </div>
      {items.map((item,i) => (
        <div key={i} onClick={() => toggle(i)} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'8px 0', cursor:'pointer', borderTop: i>0?`1px solid ${t.border}`:'none' }}>
          <div style={{ width:18, height:18, borderRadius:4, border:`2px solid ${checked[i]?t.accent:t.border}`, background:checked[i]?t.accent:'none', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1, transition:'all 0.15s' }}>
            {checked[i] && <span style={{ color:'#fff', fontSize:12, fontWeight:700, lineHeight:1 }}>✓</span>}
          </div>
          <span style={{ fontSize:13.5, color:checked[i]?t.muted:t.text, textDecoration:checked[i]?'line-through':'none', lineHeight:1.5, transition:'color 0.15s' }}>{item}</span>
        </div>
      ))}
    </div>
  );
}

export default function APIHub() {
  const { t, dark, toggle } = useTheme();
  const [search, setSearch] = useState('');
  const [activeNav, setActiveNav] = useState('hero');
  const [qaFilter, setQaFilter] = useState('All');
  const mainRef = useRef(null);

  const scrollTo = id => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior:'smooth', block:'start' });
    setActiveNav(id);
  };

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const handler = () => {
      const sections = NAV.map(n => document.getElementById(n.id)).filter(Boolean);
      const scrollY = el.scrollTop + 80;
      for (let i = sections.length - 1; i >= 0; i--) {
        if (sections[i].offsetTop <= scrollY) { setActiveNav(sections[i].id); break; }
      }
    };
    el.addEventListener('scroll', handler);
    return () => el.removeEventListener('scroll', handler);
  }, []);

  const filteredNav = NAV.filter(n => n.label.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ display:'flex', height:'100vh', fontFamily:'"Segoe UI","Helvetica Neue",system-ui,sans-serif', background:t.bg, color:t.text, overflow:'hidden' }}>
      {/* Sidebar */}
      <aside style={{ width:210, flexShrink:0, background:t.surface, borderRight:`1px solid ${t.border}`, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ padding:'16px 14px 10px', borderBottom:`1px solid ${t.border}` }}>
          <div style={{ fontSize:12, fontWeight:700, color:t.accent, letterSpacing:'0.1em', marginBottom:8 }}>API INTERVIEW HUB</div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search topics..." style={{ width:'100%', boxSizing:'border-box', background:t.card, border:`1px solid ${t.border}`, borderRadius:6, padding:'6px 10px', fontSize:12, color:t.text, outline:'none' }} />
        </div>
        <nav style={{ flex:1, overflowY:'auto', padding:'8px 0' }}>
          {filteredNav.map(n => (
            <button key={n.id} onClick={() => scrollTo(n.id)} style={{ width:'100%', display:'block', textAlign:'left', padding:'7px 14px', background:activeNav===n.id?`${t.accent}18`:'none', border:'none', borderLeft:activeNav===n.id?`3px solid ${t.accent}`:'3px solid transparent', color:activeNav===n.id?t.accent:t.muted, fontSize:13, cursor:'pointer', transition:'all 0.15s' }}>
              {n.label}
            </button>
          ))}
        </nav>
        <div style={{ padding:'10px 14px', borderTop:`1px solid ${t.border}` }}>
          <button onClick={toggle} style={{ width:'100%', background:`${t.accent}15`, border:`1px solid ${t.accent}40`, borderRadius:6, padding:'7px', fontSize:12, color:t.accent, cursor:'pointer', fontWeight:600 }}>
            {dark ? '☀ Light Mode' : '◑ Dark Mode'}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main ref={mainRef} style={{ flex:1, overflowY:'auto', padding:'2rem 2.5rem' }}>

        {/* HERO */}
        <Section id="hero">
          <div style={{ background:dark?'linear-gradient(135deg,#0f2040 0%,#0b1828 50%,#0f2040 100%)':'linear-gradient(135deg,#dce8f8 0%,#eef3fa 50%,#dce8f8 100%)', border:`1px solid ${t.border}`, borderRadius:16, padding:'2.5rem', marginBottom:'2rem', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:-40, right:-40, width:200, height:200, borderRadius:'50%', background:`${t.accent}08`, border:`1px solid ${t.accent}20` }} />
            <div style={{ position:'absolute', top:20, right:20, width:100, height:100, borderRadius:'50%', background:`${t.purple}08`, border:`1px solid ${t.purple}20` }} />
            <Badge color="cyan" t={t}>INTERVIEW PREP</Badge>
            <h1 style={{ fontSize:32, fontWeight:800, color:t.text, margin:'14px 0 10px', lineHeight:1.2, fontFamily:'"Georgia",serif', letterSpacing:'-0.02em' }}>
              Complete API Interview<br/>Preparation Hub
            </h1>
            <p style={{ color:t.muted, fontSize:15, lineHeight:1.7, maxWidth:520, margin:'0 0 1.5rem' }}>
              Master REST, GraphQL, gRPC, Authentication, Pagination, Security, and Real-World API Design Patterns — all from one source.
            </p>
            <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
              {['Start Learning →', 'Interview Q&A', 'Cheat Sheet'].map((label,i) => (
                <button key={label} onClick={() => scrollTo(i===0?'what':i===1?'interview':'cheatsheet')} style={{ padding:'9px 18px', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer', background:i===0?t.accent:'none', color:i===0?'#000':t.accent, border:`1.5px solid ${t.accent}${i===0?'':''}`  }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12 }}>
            {[['10+','Core Topics'],['50+','Interview Qs'],['15+','Code Examples'],['5','Real Companies']].map(([n,l]) => (
              <Card key={l} t={t} style={{ textAlign:'center', padding:'1rem' }}>
                <div style={{ fontSize:28, fontWeight:800, color:t.accent, fontFamily:'monospace' }}>{n}</div>
                <div style={{ fontSize:12, color:t.muted, marginTop:2 }}>{l}</div>
              </Card>
            ))}
          </div>
        </Section>

        {/* WHAT */}
        <Section id="what">
          <SectionTitle t={t} sub="The foundation of every system design interview">What are APIs?</SectionTitle>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem', marginBottom:'1rem' }}>
            <Card t={t}>
              <h3 style={{ fontSize:14, fontWeight:700, color:t.accent, margin:'0 0 8px', letterSpacing:'0.04em' }}>DEFINITION</h3>
              <p style={{ fontSize:13.5, color:t.text, lineHeight:1.7, margin:0 }}>An API (Application Programming Interface) is a contract that allows two software systems to communicate. It defines what requests can be made, how to make them, what data to send, and what to expect in return.</p>
            </Card>
            <Card t={t}>
              <h3 style={{ fontSize:14, fontWeight:700, color:t.purple, margin:'0 0 8px', letterSpacing:'0.04em' }}>THE RESTAURANT ANALOGY</h3>
              <p style={{ fontSize:13.5, color:t.text, lineHeight:1.7, margin:0 }}>You (client) order from a menu (API contract). The waiter (API) carries your request to the kitchen (server) and returns your food (response). You never enter the kitchen — the API is the interface.</p>
            </Card>
          </div>
          <Card t={t}>
            <h3 style={{ fontSize:14, fontWeight:700, color:t.green, margin:'0 0 12px', letterSpacing:'0.04em' }}>REQUEST-RESPONSE LIFECYCLE</h3>
            <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
              {['Client', '→ HTTP Request', 'DNS Lookup', '→ TCP/TLS', 'Server', '→ Process', 'Database', '→ Response', 'Client'].map((step, i) => (
                <div key={i} style={{ padding:'6px 12px', borderRadius:20, background:i%2===0?`${t.accent}15`:`${t.border}60`, border:`1px solid ${i%2===0?t.accent:t.border}40`, fontSize:12, color:i%2===0?t.accent:t.muted, fontWeight:i%2===0?600:400 }}>
                  {step}
                </div>
              ))}
            </div>
          </Card>
          <CodeBlock t={t} code={`GET /events/123 HTTP/1.1
Host: api.ticketmaster.com
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
Accept: application/json

# Server Response:
HTTP/1.1 200 OK
Content-Type: application/json

{
  "id": "123",
  "name": "Taylor Swift — Eras Tour",
  "date": "2024-07-15T20:00:00Z",
  "venue": { "name": "Wembley Stadium", "city": "London" },
  "tickets_available": 342
}`} />
        </Section>

        {/* WHY */}
        <Section id="why">
          <SectionTitle t={t} sub="Why modern software is built API-first">Why APIs?</SectionTitle>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:12, marginBottom:'1rem' }}>
            {[
              { title:'Decoupling', color:'cyan', desc:'Frontend and backend evolve independently. Teams ship faster without blocking each other.' },
              { title:'Scalability', color:'purple', desc:'Scale individual services independently. API gateways load-balance across instances.' },
              { title:'Reusability', color:'green', desc:'One API serves web, mobile, partners, and internal tools without duplication.' },
              { title:'Integration', color:'amber', desc:'Connect third-party services: Stripe for payments, Twilio for SMS, Google Maps for location.' },
            ].map(c => (
              <Card key={c.title} t={t}>
                <Badge color={c.color} t={t}>{c.title}</Badge>
                <p style={{ fontSize:13, color:t.muted, lineHeight:1.6, margin:'8px 0 0' }}>{c.desc}</p>
              </Card>
            ))}
          </div>
          <Card t={t}>
            <h3 style={{ fontSize:14, fontWeight:700, color:t.amber, margin:'0 0 12px', letterSpacing:'0.04em' }}>REAL-WORLD API EXAMPLES</h3>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {[['Stripe Payments API','POST /charges — charge a card in any app without handling card data directly'],['Google Maps API','GET /directions — embed routing into any app without building map infrastructure'],['Spotify API','GET /me/player — build apps that control music playback'],['Weather API','GET /forecast?city=London — any app can show weather without running weather servers']].map(([name,desc]) => (
                <div key={name} style={{ padding:'10px 12px', background:`${t.amber}0a`, border:`1px solid ${t.amber}30`, borderRadius:8 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:t.amber, marginBottom:4 }}>{name}</div>
                  <div style={{ fontSize:12, color:t.muted }}>{desc}</div>
                </div>
              ))}
            </div>
          </Card>
        </Section>

        {/* PROTOCOLS */}
        <Section id="protocols">
          <SectionTitle t={t} sub="Choose the right protocol — from the cheat sheet">Protocol Selection Guide</SectionTitle>
          <Card t={t} style={{ marginBottom:'1rem', background:`${t.accent}08`, border:`1px solid ${t.accent}40` }}>
            <p style={{ fontSize:14, color:t.text, margin:0, lineHeight:1.7 }}>
              <span style={{ color:t.accent, fontWeight:700 }}>Interview strategy: </span>
              Say "I'll use REST APIs here" and move on unless the problem explicitly calls for something else. Interviewers respect decisiveness. Only switch when you have a specific reason from the signal words below.
            </p>
          </Card>
          <Tbl t={t}
            headers={['Protocol','Best For','Signal Words / Triggers','Avoid When']}
            rows={[
              ['REST','Web & mobile apps, CRUD, public APIs','Default choice — 90% of cases','Almost never avoid REST'],
              ['GraphQL','Flexible data fetching, multiple client types','"over-fetching", "under-fetching", mobile vs web','Simple CRUD with uniform clients'],
              ['gRPC / RPC','Internal services, high-performance pipelines','"microservices", "internal API", performance-critical','Public browser clients (needs proxy)'],
              ['WebSocket','Real-time: chat, live feeds, multiplayer','"real-time", "live updates", "persistent connection"','Simple request/response patterns'],
              ['SSE','Server-to-client live updates (one-way)','"notifications", "live dashboard", "server push"','When client also needs to push data'],
            ]}
          />
        </Section>

        {/* REST */}
        <Section id="rest">
          <SectionTitle t={t} sub="The default choice — master this before anything else">REST APIs</SectionTitle>
          <h3 style={{ fontSize:16, fontWeight:700, color:t.accent, marginBottom:8 }}>Resource Modeling</h3>
          <p style={{ fontSize:13.5, color:t.muted, lineHeight:1.7, marginBottom:'0.5rem' }}>Think about the <em>things</em> in your system, not the actions. Resources are plural nouns. Map core entities to URL paths.</p>
          <CodeBlock t={t} code={`# Core resource endpoints (Ticketmaster-style)
GET    /events              # List all events
GET    /events/{id}         # Get one event
POST   /events              # Create new event
PUT    /events/{id}         # Replace entire event
PATCH  /events/{id}         # Update partial fields
DELETE /events/{id}         # Remove event

# Relationships — nest when parent is required
GET    /events/{id}/tickets     # Tickets for this event
POST   /events/{id}/bookings    # Create a booking

# Use query params for optional filters
GET    /events?city=NYC&page=2
GET    /tickets?event_id=123&section=VIP`} />

          <h3 style={{ fontSize:16, fontWeight:700, color:t.accent, margin:'1.5rem 0 8px' }}>HTTP Methods & Idempotency</h3>
          <Tbl t={t}
            headers={['Method','Purpose','Idempotent?','Safe?','Example']}
            rows={[
              ['GET','Retrieve resource(s). Never changes state.','✓ Yes','✓ Yes','GET /events/123'],
              ['POST','Create a new resource. Server assigns the ID.','✗ No','✗ No','POST /events {body}'],
              ['PUT','Replace entire resource. Creates if missing.','✓ Yes','✗ No','PUT /events/123 {full object}'],
              ['PATCH','Update partial fields only.','Maybe','✗ No','PATCH /users/1 {email only}'],
              ['DELETE','Remove resource. Repeat = same end state.','✓ Yes','✗ No','DELETE /bookings/55'],
            ]}
          />
          <Card t={t} style={{ background:`${t.amber}0a`, border:`1px solid ${t.amber}30` }}>
            <span style={{ fontWeight:700, color:t.amber }}>Why idempotency matters: </span>
            <span style={{ fontSize:13.5, color:t.text }}>Networks fail and clients retry requests. GET, PUT, DELETE are safe to retry. POST is not — two POST calls create two bookings. Always design for retry safety.</span>
          </Card>

          <h3 style={{ fontSize:16, fontWeight:700, color:t.accent, margin:'1.5rem 0 8px' }}>Passing Data</h3>
          <Tbl t={t}
            headers={['Location','Format','Use When','Example']}
            rows={[
              ['Path parameter','/events/123','Required — identifies the specific resource','GET /events/123/tickets'],
              ['Query parameter','?city=NYC&page=2','Optional — filtering, sorting, pagination','GET /events?city=NYC&limit=20'],
              ['Request body','JSON object','Creating or updating — complex/sensitive data','POST /bookings {tickets, payment}'],
            ]}
          />
        </Section>

        {/* GRAPHQL */}
        <Section id="graphql">
          <SectionTitle t={t} sub="Flexible data fetching — use when clients need different shapes">GraphQL</SectionTitle>
          <Card t={t} style={{ marginBottom:'1rem', background:`${t.purple}08`, border:`1px solid ${t.purple}30` }}>
            <p style={{ fontSize:13.5, color:t.text, margin:0, lineHeight:1.7 }}>REST endpoints return a fixed shape. A mobile app may need only event name and date, while web needs full venue details. With REST you either create multiple endpoints (proliferation) or return everything and waste bandwidth (over-fetching). GraphQL uses a single endpoint that accepts queries describing exactly what data the client wants.</p>
          </Card>
          <CodeBlock t={t} code={`type Event {
  id: ID!
  name: String!
  date: DateTime!
  venue: Venue!         # Nested type — traversable
  tickets: [Ticket!]!   # List of tickets
}

type Query {
  event(id: ID!): Event
  events(limit: Int, after: String): [Event!]!  # Cursor pagination
}

type Mutation {
  createBooking(input: BookingInput!): Booking!
  cancelBooking(id: ID!): Boolean!
}

type Subscription {
  ticketSold(eventId: ID!): TicketEvent!  # Real-time updates
}`} />
          <CodeBlock t={t} code={`# Mobile: only name and date
query GetEventMobile {
  event(id: "123") { name, date }
}

# Web: full details in one round trip
query GetEventWeb {
  event(id: "123") {
    name, date
    venue { name address }
    tickets { section price available }
  }
}

# Mutation
mutation CreateBooking {
  createBooking(input: { eventId: "123", tickets: [{section: "VIP", qty: 2}] }) {
    id status
  }
}`} />
          <h3 style={{ fontSize:16, fontWeight:700, color:t.red, margin:'1.5rem 0 8px' }}>The N+1 Problem — Most Important GraphQL Gotcha</h3>
          <CodeBlock t={t} code={`# Problem: 100 events = 101 queries
# 1 query: SELECT * FROM events LIMIT 100
# 100 more: SELECT * FROM venues WHERE id = ? (once per event)

# Solution: DataLoader batches related queries
class VenueLoader(DataLoader):
  async def batch_load_fn(self, venue_ids):
    # 1 query: SELECT * FROM venues WHERE id IN (...all ids...)
    venues = await db.query(
      "SELECT * FROM venues WHERE id = ANY($1)", [venue_ids]
    )
    return [venues_by_id.get(id) for id in venue_ids]`} />
          <Tbl t={t}
            headers={['Situation','Use GraphQL?']}
            rows={[
              ['Mobile app needs different data than web dashboard','✓ Yes — classic use case'],
              ['Frontend team iterates without backend involvement','✓ Yes — they request new fields freely'],
              ['Interviewer says "over-fetching" or "under-fetching"','✓ Yes — direct signal'],
              ['Simple CRUD app with uniform clients','✗ No — REST is simpler'],
              ['Need simple HTTP caching (CDN, browser cache)','✗ No — REST GET is cacheable; GraphQL POST is not'],
              ['Public API for third-party developers','✗ No — REST is more familiar and documented'],
            ]}
          />
        </Section>

        {/* GRPC */}
        <Section id="grpc">
          <SectionTitle t={t} sub="High-performance internal service communication">gRPC</SectionTitle>
          <Tbl t={t}
            headers={['Aspect','REST','gRPC']}
            rows={[
              ['Paradigm','Resource-oriented (nouns)','Action-oriented (functions)'],
              ['Protocol','HTTP/1.1 + JSON','HTTP/2 + Protocol Buffers (binary)'],
              ['Performance','Moderate','High (binary, compressed, multiplexed)'],
              ['Browser support','Native','Requires grpc-web proxy'],
              ['Contract','OpenAPI / informal','Strict .proto file — required'],
              ['Code generation','Optional','Required — generated clients in any language'],
              ['Streaming','Workarounds (SSE, WebSocket)','Native: unary, server, client, bidirectional'],
              ['Best for','Public APIs, web & mobile clients','Internal service-to-service communication'],
            ]}
          />
          <CodeBlock t={t} code={`syntax = "proto3";

service BookingService {
  // Unary: one request, one response (like REST)
  rpc CreateBooking (BookingRequest) returns (BookingResponse);

  // Server streaming: one request, many responses
  rpc StreamAvailability (EventId) returns (stream TicketUpdate);

  // Bidirectional streaming: many requests, many responses
  rpc Chat (stream Message) returns (stream Message);
}

message BookingRequest {
  string event_id = 1;  # Field numbers are permanent — never reuse
  string user_id = 2;
  int32 quantity = 3;
  string section = 4;
}

message BookingResponse {
  string booking_id = 1;
  string status = 2;
}`} />
          <Card t={t} style={{ background:`${t.green}0a`, border:`1px solid ${t.green}30` }}>
            <span style={{ fontWeight:700, color:t.green }}>In practice: </span>
            <span style={{ fontSize:13.5, color:t.text }}>Use REST for public endpoints consumed by web/mobile clients. Use gRPC for internal service-to-service calls where you control both sides. Use gRPC when the interviewer mentions microservices, performance constraints, polyglot teams, or streaming between services.</span>
          </Card>
        </Section>

        {/* REAL-TIME */}
        <Section id="realtime">
          <SectionTitle t={t} sub="When REST's request-response model isn't enough">Real-Time Patterns</SectionTitle>
          <Tbl t={t}
            headers={['Pattern','Direction','Protocol','Best For','Complexity']}
            rows={[
              ['WebSocket','Both (full-duplex)','ws://','Chat, games, collaborative editing','High'],
              ['SSE','Server → Client','HTTP text/event-stream','Live notifications, dashboards, feeds','Low'],
              ['Long Polling','Server → Client','HTTP','Simple notifications, legacy support','Medium'],
              ['Short Polling','Client polls server','HTTP','When real-time is a nice-to-have','Lowest'],
            ]}
          />
          <CodeBlock t={t} code={`# Server-Sent Events (SSE) — simplest real-time pattern
# Server (Node.js):
res.setHeader("Content-Type", "text/event-stream");
res.setHeader("Cache-Control", "no-cache");

setInterval(() => {
  res.write(\`data: \${JSON.stringify({ price: getPrice() })}\n\n\`);
}, 1000);

# Client:
const es = new EventSource("/prices/AAPL");
es.onmessage = (e) => updateDisplay(JSON.parse(e.data));`} />
          <Card t={t} style={{ background:`${t.purple}08`, border:`1px solid ${t.purple}30` }}>
            <p style={{ fontSize:13.5, color:t.text, margin:0, lineHeight:1.7 }}>
              <span style={{ fontWeight:700, color:t.purple }}>Interview tip: </span>
              When the interviewer says "real-time", "live updates", "notifications", or "persistent connection" — mention WebSocket or SSE and explain the tradeoff: WebSocket is bidirectional (chat), SSE is server-push only (dashboards, notifications) but simpler and works over plain HTTP.
            </p>
          </Card>
        </Section>

        {/* PAGINATION */}
        <Section id="pagination">
          <SectionTitle t={t} sub="Always paginate list endpoints — returning millions of records is a design failure">Pagination</SectionTitle>
          <Tbl t={t}
            headers={['Type','How It Works','Pros','Cons','Use When']}
            rows={[
              ['Offset','?offset=40&limit=20','Simple. Easy "jump to page N".','Breaks with concurrent inserts. Slow on large offsets (DB scans all rows).','Simple admin dashboards, no real-time data'],
              ['Cursor','?cursor=eyJpZCI6NDB9&limit=20','Stable. Fast. Handles inserts gracefully.','Cannot jump to page N. Cursor must be opaque.','Feeds, timelines, high-volume data'],
              ['Keyset','?after_id=123&after_date=2024-01-01','Most performant on large tables.','Requires composite unique sort key.','Large datasets, production systems'],
            ]}
          />
          <CodeBlock t={t} code={`# Cursor pagination response shape
{
  "data": [ { "id": 1, ... }, { "id": 2, ... } ],
  "pagination": {
    "next_cursor": "eyJpZCI6MjB9",  # Encode the last-seen ID/timestamp
    "has_next": true,
    "total_count": 1547
  }
}

# Next page request:
GET /events?cursor=eyJpZCI6MjB9&limit=20`} />
        </Section>

        {/* VERSIONING */}
        <Section id="versioning">
          <SectionTitle t={t} sub="APIs change over time — versioning lets you evolve without breaking clients">API Versioning</SectionTitle>
          <Tbl t={t}
            headers={['Strategy','Format','Pros','Cons']}
            rows={[
              ['URL Path (recommended)','/v1/events → /v2/events','Explicit, easy to route, easy to test in browser','URL changes; clients must update'],
              ['Header','API-Version: 2','Clean URLs, follows HTTP standards','Invisible in URL, harder to test, less common'],
              ['Query Parameter','/events?version=2','Simple to add without new routes','Pollutes query string, easy to forget'],
              ['Content Type','Accept: application/vnd.api.v2+json','Purist REST approach','Very complex, rarely used'],
            ]}
          />
          <Card t={t} style={{ background:`${t.accent}08`, border:`1px solid ${t.accent}30` }}>
            <p style={{ fontSize:13.5, color:t.text, margin:0, lineHeight:1.7 }}>
              <span style={{ fontWeight:700, color:t.accent }}>Interview guidance: </span>
              URL versioning is the safest choice — most interviewers know it. Run v1 and v2 in parallel, deprecate v1 with Sunset headers after a migration window. Versioning is often skipped entirely in interviews, which is fine — only mention it if the interviewer raises it.
            </p>
          </Card>
        </Section>

        {/* AUTH */}
        <Section id="auth">
          <SectionTitle t={t} sub="Authentication = who are you? Authorization = what can you do?">Authentication & Authorization</SectionTitle>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem', marginBottom:'1rem' }}>
            <Card t={t} style={{ background:`${t.accent}08`, border:`1px solid ${t.accent}30` }}>
              <h3 style={{ fontSize:13, fontWeight:700, color:t.accent, margin:'0 0 6px' }}>AUTHENTICATION (AuthN)</h3>
              <p style={{ fontSize:13.5, color:t.text, margin:0, lineHeight:1.7 }}>Verifying identity — who are you? Logging in, presenting credentials, validating a token. Happens first.</p>
            </Card>
            <Card t={t} style={{ background:`${t.purple}08`, border:`1px solid ${t.purple}30` }}>
              <h3 style={{ fontSize:13, fontWeight:700, color:t.purple, margin:'0 0 6px' }}>AUTHORIZATION (AuthZ)</h3>
              <p style={{ fontSize:13.5, color:t.text, margin:0, lineHeight:1.7 }}>Checking permissions — what are you allowed to do? Happens after identity is confirmed. Separate step.</p>
            </Card>
          </div>
          <h3 style={{ fontSize:16, fontWeight:700, color:t.accent, marginBottom:8 }}>JWT Tokens</h3>
          <CodeBlock t={t} code={`# JWT structure: header.payload.signature (base64url encoded)
# Payload contains user context:
{
  "user_id": "123",
  "email": "john@example.com",
  "role": "customer",
  "exp": 1734307200   # Expiry timestamp
}

# Sent with every request:
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoiMTIzIn0.abc123

# Server validates:
# 1. Signature is valid (not tampered)
# 2. Token is not expired
# 3. Claims match the required permissions

# Properties: Stateless (no DB lookup), short-lived (15-60 min) + refresh token`} />
          <h3 style={{ fontSize:16, fontWeight:700, color:t.accent, margin:'1.5rem 0 8px' }}>API Keys</h3>
          <CodeBlock t={t} code={`# Client sends key in header:
GET /events
Authorization: Bearer sk_live_abc123def456...

# Server verifies:
SELECT client_id, permissions, rate_limit
FROM api_keys
WHERE key_hash = hash(received_key) AND revoked = false

# Use for: server-to-server, third-party developers
# Never for end users — no user context, no expiry by default`} />
          <h3 style={{ fontSize:16, fontWeight:700, color:t.accent, margin:'1.5rem 0 8px' }}>RBAC Table</h3>
          <Tbl t={t}
            headers={['Endpoint','Customer','Manager','Admin']}
            rows={[
              ['GET /events','✓ All','✓ All','✓ All'],
              ['POST /events','✗ No','✓ Own venue','✓ Yes'],
              ['GET /bookings/{id}','Own only','✓ All','✓ All'],
              ['DELETE /bookings/{id}','Own only','✗ No','✓ Yes'],
              ['GET /reports/revenue','✗ No','Own venue only','✓ Yes'],
            ]}
          />
        </Section>

        {/* RATE LIMITING */}
        <Section id="ratelimit">
          <SectionTitle t={t} sub="Protect your system from abuse, scraping, and accidental overuse">Rate Limiting</SectionTitle>
          <Tbl t={t}
            headers={['Strategy','How It Works','Best For']}
            rows={[
              ['Fixed Window','Count requests per fixed time window (e.g., 1000/hour). Resets at boundary.','Simple implementation, predictable'],
              ['Sliding Window','Rolling window of the last N seconds. No burst at boundary.','Smoother limiting, more accurate'],
              ['Token Bucket','Bucket refills at fixed rate. Allows controlled bursts up to bucket size.','Allows legitimate traffic bursts'],
              ['Leaky Bucket','Requests queue and processed at a fixed rate. Smooths bursty traffic.','Strict, even output rate'],
            ]}
          />
          <CodeBlock t={t} code={`HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 1000      # Your limit
X-RateLimit-Remaining: 0     # How many left
X-RateLimit-Reset: 1672531200  # Unix timestamp when limit resets
Retry-After: 60              # Seconds until retry is safe

# Typical limits:
# 1000 requests/hour per authenticated user
# 100 requests/hour per IP (unauthenticated)
# 10 requests/minute for sensitive endpoints like POST /bookings`} />
        </Section>

        {/* SECURITY */}
        <Section id="security">
          <SectionTitle t={t} sub="Security checklist from the cheat sheet">Security Checklist</SectionTitle>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
            {[
              { title:'Input Validation', color:'red', items:['Validate and sanitize all input — type, length, format, range','Reject unexpected fields — do not pass raw input to your database','Validate on the server — never trust client-side validation alone'] },
              { title:'Transport & Data', color:'amber', items:['Always use HTTPS — never expose endpoints over plain HTTP','Never log sensitive data — no passwords, card numbers, tokens in logs','Hash API keys before storing — never store plain text secrets'] },
              { title:'Auth & Access', color:'cyan', items:['Validate JWT signature and expiry on every request','Never trust user-provided IDs without checking ownership','Apply principle of least privilege — minimum permissions needed','Use short-lived access tokens (15–60 min) + refresh tokens'] },
              { title:'Infrastructure', color:'purple', items:['Rate limit all public endpoints to prevent abuse and DDoS','Set CORS headers to restrict which origins can call your API','Return generic error messages — never expose stack traces or internals'] },
            ].map(({ title, color, items }) => (
              <Card key={title} t={t}>
                <h3 style={{ fontSize:13, fontWeight:700, marginBottom:10, margin:'0 0 10px' }}><Badge color={color} t={t}>{title}</Badge></h3>
                {items.map((item,i) => (
                  <div key={i} style={{ display:'flex', gap:8, alignItems:'flex-start', padding:'5px 0', borderTop:i>0?`1px solid ${t.border}`:'none' }}>
                    <span style={{ color:t.green, fontSize:14, lineHeight:1, marginTop:2, flexShrink:0 }}>✓</span>
                    <span style={{ fontSize:12.5, color:t.muted, lineHeight:1.5 }}>{item}</span>
                  </div>
                ))}
              </Card>
            ))}
          </div>
        </Section>

        {/* STATUS CODES */}
        <Section id="statuscodes">
          <SectionTitle t={t} sub="Know the common ones — the key distinction is 4xx vs 5xx">HTTP Status Codes</SectionTitle>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))', gap:12 }}>
            {[
              { family:'2xx Success', color:'green', codes:[['200','OK','Standard success for GET, PUT, PATCH'],['201','Created','POST succeeded — new resource made'],['204','No Content','Success but no body (DELETE, some PATCH)']] },
              { family:'4xx Client Error', color:'amber', codes:[['400','Bad Request','Malformed syntax, missing required fields'],['401','Unauthorized','No auth credentials provided'],['403','Forbidden','Auth valid, but no permission'],['404','Not Found','Resource does not exist'],['409','Conflict','Duplicate booking, optimistic lock'],['422','Unprocessable','Well-formed but fails validation'],['429','Too Many Requests','Rate limit exceeded — retry after delay']] },
              { family:'5xx Server Error', color:'red', codes:[['500','Internal Server Error','Bug or crash on the server side'],['503','Service Unavailable','Server is down or overloaded']] },
            ].map(({ family, color, codes }) => (
              <Card key={family} t={t}>
                <Badge color={color} t={t}>{family}</Badge>
                <div style={{ marginTop:10 }}>
                  {codes.map(([code, name, desc]) => (
                    <div key={code} style={{ display:'grid', gridTemplateColumns:'40px 1fr', gap:8, padding:'7px 0', borderTop:`1px solid ${t.border}` }}>
                      <span style={{ fontSize:13, fontWeight:700, color: color==='green'?t.green:color==='amber'?t.amber:t.red, fontFamily:'monospace' }}>{code}</span>
                      <div>
                        <div style={{ fontSize:12.5, fontWeight:600, color:t.text }}>{name}</div>
                        <div style={{ fontSize:11.5, color:t.muted, lineHeight:1.4 }}>{desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </Section>

        {/* BEST PRACTICES */}
        <Section id="bestpractices">
          <SectionTitle t={t} sub="Production-grade API design principles">Best Practices</SectionTitle>
          <Checklist t={t} items={[
            'Use plural nouns for resources: /events, /users, /bookings — never /getEvent',
            'Always paginate list endpoints — never return unbounded collections',
            'Return meaningful error messages with error code, message, and request ID',
            'Use HTTPS everywhere — no exceptions for any environment',
            'Version your API from day one — easier to add than retrofit',
            'Validate all input server-side — never trust client-side validation',
            'Use idempotency keys for POST endpoints that create resources',
            'Implement rate limiting at the API gateway level, not in application code',
            'Use short-lived JWT tokens (15-60 min) with refresh token rotation',
            'Set CORS headers explicitly — avoid wildcard * in production',
            'Never log sensitive data: passwords, card numbers, JWT tokens',
            'Hash API keys before storing — treat them like passwords',
            'Return 429 with Retry-After header when rate limits are hit',
            'Use cursor-based pagination for feeds and high-volume data',
            'Document your API with OpenAPI/Swagger specifications',
          ]} />
        </Section>

        {/* COMPANIES */}
        <Section id="companies">
          <SectionTitle t={t} sub="Real-world API decisions at scale">How Top Companies Use APIs</SectionTitle>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:12 }}>
            {[
              { name:'Netflix', style:'REST + gRPC', why:'REST for public client APIs (web/mobile). gRPC for internal microservices with 700+ services. GraphQL for BFF (Backend for Frontend) pattern — each client type gets a tailored API layer.', scale:'200M+ subscribers, global CDN' },
              { name:'Spotify', style:'REST + gRPC', why:'Public REST API for third-party developers. Internal gRPC for service communication. Web API returns different fields than mobile API — perfect GraphQL signal.', scale:'600M+ users, 100M+ tracks' },
              { name:'Stripe', style:'REST', why:'Pure REST for the public API — simple, predictable, well-documented. Idempotency keys on all POST endpoints prevent double-charges. Webhook events for async payment state.', scale:'$1T+ payments processed' },
              { name:'Uber', style:'REST + gRPC + WebSocket', why:'REST for booking flows. gRPC for internal services (matching, pricing). WebSocket for real-time driver location updates. SSE for notifications.', scale:'130M+ monthly users, 28 countries' },
              { name:'Amazon', style:'REST + gRPC internal', why:'AWS public APIs are REST with extreme consistency. Internal services use gRPC. Strict API versioning — APIs never break backwards compatibility.', scale:'1M+ AWS customers' },
            ].map(c => (
              <Card key={c.name} t={t}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                  <h3 style={{ fontSize:16, fontWeight:700, color:t.text, margin:0 }}>{c.name}</h3>
                  <Badge color="cyan" t={t}>{c.style}</Badge>
                </div>
                <p style={{ fontSize:13, color:t.muted, lineHeight:1.6, margin:'0 0 8px' }}>{c.why}</p>
                <div style={{ fontSize:11, color:t.accent, fontWeight:600 }}>{c.scale}</div>
              </Card>
            ))}
          </div>
        </Section>

        {/* INTERVIEW Q&A */}
        <Section id="interview">
          <SectionTitle t={t} sub="Expandable answers with interviewer expectations">Interview Q&A</SectionTitle>
          <div style={{ display:'flex', gap:8, marginBottom:'1rem', flexWrap:'wrap' }}>
            {['All','Beginner','Intermediate','Advanced','System Design'].map(f => (
              <button key={f} onClick={() => setQaFilter(f)} style={{ padding:'5px 14px', borderRadius:20, fontSize:12, fontWeight:600, cursor:'pointer', background:qaFilter===f?t.accent:'none', color:qaFilter===f?'#000':t.muted, border:`1.5px solid ${qaFilter===f?t.accent:t.border}` }}>
                {f}
              </button>
            ))}
          </div>
          {QA.filter(q => qaFilter==='All' || q.level===qaFilter).map((item, i) => <QAItem key={i} item={item} t={t} />)}
        </Section>

        {/* CHEAT SHEET */}
        <Section id="cheatsheet">
          <SectionTitle t={t} sub="Quick reference for system design interviews">Cheat Sheet</SectionTitle>
          <Card t={t} style={{ marginBottom:'1rem', background:`${t.accent}08`, border:`1px solid ${t.accent}40` }}>
            <h3 style={{ fontSize:14, fontWeight:700, color:t.accent, margin:'0 0 8px' }}>TIME ALLOCATION</h3>
            <p style={{ fontSize:13.5, color:t.text, margin:0, lineHeight:1.7 }}>Spend at most 5 minutes on API design. Show judgment and move on. Interviewers lose marks for candidates who get bogged down here instead of discussing architecture.</p>
          </Card>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem', marginBottom:'1rem' }}>
            <Card t={t}>
              <h3 style={{ fontSize:13, fontWeight:700, color:t.green, margin:'0 0 10px' }}>WHAT TO COVER (in order)</h3>
              {['State your protocol choice: "I\'ll use REST APIs here"','List your key endpoints — 3 to 6 is enough','Mention authentication: "endpoints are secured with JWT"','Mention pagination on list endpoints','Move on to high-level design'].map((item,i) => (
                <div key={i} style={{ display:'flex', gap:10, padding:'5px 0', borderTop:i>0?`1px solid ${t.border}`:'none' }}>
                  <span style={{ color:t.green, fontWeight:700, fontFamily:'monospace', flexShrink:0 }}>{i+1}.</span>
                  <span style={{ fontSize:13, color:t.muted }}>{item}</span>
                </div>
              ))}
            </Card>
            <Card t={t}>
              <h3 style={{ fontSize:13, fontWeight:700, color:t.amber, margin:'0 0 10px' }}>WHAT TO SKIP (unless asked)</h3>
              {['Exact status codes — say "2xx for success, 4xx for client error"','Versioning — only mention if the interviewer raises it','Detailed rate limiting algorithms','Complete request/response schemas'].map((item,i) => (
                <div key={i} style={{ display:'flex', gap:10, padding:'5px 0', borderTop:i>0?`1px solid ${t.border}`:'none' }}>
                  <span style={{ color:t.amber, flexShrink:0 }}>✕</span>
                  <span style={{ fontSize:13, color:t.muted }}>{item}</span>
                </div>
              ))}
            </Card>
          </div>
          <h3 style={{ fontSize:16, fontWeight:700, color:t.accent, marginBottom:8 }}>Signal Words — Your Response</h3>
          <Tbl t={t}
            headers={['If the interviewer says...','Your response']}
            rows={[
              ['"over-fetching" or "under-fetching"','Mention GraphQL and explain why it fits'],
              ['"microservices" or "internal service communication"','Consider gRPC for those internal calls'],
              ['"real-time", "live", "notifications"','Mention WebSocket or SSE and explain the tradeoff'],
              ['"millions of users" or "scale"','Ensure pagination, rate limiting, and auth are mentioned'],
              ['"mobile and web clients need different data"','GraphQL is the right answer here'],
              ['"third-party developers" or "public API"','REST with API keys, versioning, and rate limiting'],
            ]}
          />
          <Card t={t} style={{ marginTop:'1rem', background:dark?'#0f2040':'#dce8f5' }}>
            <h3 style={{ fontSize:14, fontWeight:700, color:t.accent, margin:'0 0 12px' }}>COMPLETE QUICK REFERENCE</h3>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:'1rem' }}>
              {[
                { title:'HTTP Methods', items:['GET — Read (safe, idempotent)','POST — Create (neither)','PUT — Replace (idempotent)','PATCH — Partial update','DELETE — Remove (idempotent)'] },
                { title:'Auth Options', items:['JWT — user-facing web/mobile','API Keys — server-to-server','OAuth 2.0 — third-party delegation','Sessions — stateful (older apps)'] },
                { title:'Pagination', items:['Offset — simple dashboards','Cursor — feeds, timelines','Keyset — large production tables','Always paginate lists!'] },
                { title:'Status Families', items:['2xx — Success','3xx — Redirect','4xx — Client fault','5xx — Server fault','429 — Rate limited'] },
              ].map(({ title, items }) => (
                <div key={title}>
                  <div style={{ fontSize:12, fontWeight:700, color:t.accent, letterSpacing:'0.06em', marginBottom:6 }}>{title}</div>
                  {items.map((item,i) => <div key={i} style={{ fontSize:12.5, color:t.muted, padding:'3px 0', borderTop:i>0?`1px solid ${t.border}`:'none' }}>{item}</div>)}
                </div>
              ))}
            </div>
          </Card>
        </Section>

        <div style={{ height:'2rem' }} />
      </main>
    </div>
  );
}
