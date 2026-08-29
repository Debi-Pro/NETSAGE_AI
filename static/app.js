let cases=[],current=null,lastDiagnosis=null;
const $=s=>document.querySelector(s);
async function get(u){return (await fetch(u)).json()}
function show(v){document.querySelectorAll('.view').forEach(x=>x.classList.add('hidden'));$('#'+v).classList.remove('hidden');document.querySelectorAll('.nav').forEach(n=>n.classList.toggle('active',n.dataset.view===v));$('#title').textContent={command:'Command Center',workbench:'Evidence Workbench',cases:'Case Intelligence',review:'Review Console',rai:'Responsible AI',architecture:'Architecture'}[v]}
document.querySelectorAll('.nav').forEach(n=>n.onclick=()=>show(n.dataset.view));
function tick(){$('#clock').textContent=new Date().toLocaleTimeString([],{hour12:false})}setInterval(tick,1000);tick();

async function init(){
 cases=await get('/api/cases'); renderStats(); renderCases(cases); renderRai();
 let s=$('#caseSelect');cases.forEach(c=>s.add(new Option(c.case_id+' · '+c.symptom,c.case_id)));s.onchange=loadCase;
 let f=$('#filter');[...new Set(cases.map(c=>c.concept))].sort().forEach(x=>f.add(new Option(x,x)));f.onchange=filterCases;$('#search').oninput=filterCases;
 init3D();
}
async function renderStats(){let s=await get('/api/stats');$('#stats').innerHTML=[['30','Verified scenarios'],[Object.keys(s.concepts).length,'Fault domains'],[s.rai_corrections,'Human corrections'],[s.agreement_rate+'%','Baseline agreement']].map(x=>`<div class="metric"><b>${x[0]}</b><span>${x[1]}</span></div>`).join('');$('#concepts').innerHTML=Object.entries(s.concepts).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<div class="barrow"><div class="barlabel"><span>${k}</span><span>${v}</span></div><div class="bar"><i style="width:${v/30*100}%"></i></div></div>`).join('')}
function renderCases(list){$('#caseGrid').innerHTML=list.map(c=>`<article class="case" onclick="selectCase('${c.case_id}')"><div class="case-id">${c.case_id}</div><h4>${c.symptom}</h4><div class="chips"><span class="chip">${c.concept}</span><span class="chip">${c.osi_layer}</span><span class="chip ${c.severity.toLowerCase()}">${c.severity}</span></div></article>`).join('')}
function filterCases(){let q=$('#search').value.toLowerCase(),f=$('#filter').value;renderCases(cases.filter(c=>(!q||Object.values(c).join(' ').toLowerCase().includes(q))&&(!f||c.concept===f)))}
function selectCase(id){$('#caseSelect').value=id;loadCase();show('workbench')}
function loadCase(){let c=cases.find(x=>x.case_id===$('#caseSelect').value);if(!c)return;current=c;$('#symptom').value=c.symptom;$('#topologyNote').value=c.topology_note;$('#observed').value=c.symptom;$('#evidence').value=c.show_outputs;$('#formMsg').textContent='Loaded '+c.case_id+' evidence.'}
async function analyzeLive(){
 let payload={case_id:current?.case_id||'LIVE',symptom:$('#symptom').value,topology_note:$('#topologyNote').value+' '+$('#observed').value,show_outputs:$('#evidence').value,expected_fault:current?.expected_fault||'Unknown',osi_layer:current?.osi_layer||'Pending',concept:current?.concept||'Unknown',severity:current?.severity||'Medium'};
 if(!payload.symptom||!payload.show_outputs){$('#formMsg').textContent='Add a symptom and command evidence first.';return}
 $('#modelBadge').textContent='RUNNING';$('#stream').innerHTML='<div class="stream-step"><small>01 · INGEST</small><b>Reading incident evidence…</b><p>Symptoms, topology and Cisco output received.</p></div>';
 await new Promise(r=>setTimeout(r,400));$('#stream').innerHTML+='<div class="stream-step"><small>02 · VECTORIZATION</small><b>Building TF-IDF feature representation…</b><p>Transforming network language into local numerical features.</p></div>';
 await new Promise(r=>setTimeout(r,450));$('#stream').innerHTML+='<div class="stream-step"><small>03 · SEMANTIC RETRIEVAL</small><b>Searching the troubleshooting knowledge base…</b><p>Comparing this incident with 30 known fault cases using cosine similarity.</p></div>';
 let d=await (await fetch('/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})).json();lastDiagnosis=d;
 await new Promise(r=>setTimeout(r,400));$('#stream').innerHTML+=`<div class="stream-step"><small>04 · VALIDATION</small><b>Running independent deterministic checks…</b><p>${d.rule_checks.filter(x=>x.status==='FAIL').length} validation signal(s) require attention.</p></div>`;
 await new Promise(r=>setTimeout(r,350));$('#modelBadge').textContent='DIAGNOSIS READY';
 $('#stream').innerHTML+=`<div class="result-card"><div class="eyebrow">✦ LOCAL NLP DIAGNOSIS</div><h3>${d.root_cause}</h3><div class="score"><div class="ring" style="--s:${d.confidence_score}"><b>${d.confidence_score}%</b></div><div style="font-size:8px;color:#718a84">Semantic confidence<br><b style="color:#c9ddd8">${d.confidence}</b> · ${d.osi_layer}<br>Matched case <b>${d.matched_case}</b></div></div><div class="eyebrow" style="margin-top:12px">EVIDENCE</div><ul class="evidence">${d.evidence.map(x=>`<li>${x}</li>`).join('')}</ul><div class="eyebrow" style="margin-top:12px">RETRIEVED CASES</div><div class="neighbors">${d.neighbors.map(n=>`<span class="neighbor">${n.case_id} · ${n.similarity}</span>`).join('')}</div><div class="eyebrow" style="margin-top:12px">NEXT COMMAND</div><div class="terminal">${d.next_command}</div><div class="decision"><button class="accept" onclick="openReview('Accepted')">✓ REVIEW / ACCEPT</button><button class="edit" onclick="openReview('Edited')">✎ EDIT DIAGNOSIS</button><button class="reject" onclick="openReview('Rejected')">× REJECT</button></div></div>`;
}
function openReview(decision){
 show('review');
 let d=lastDiagnosis;
 if(!d)return;
 let editable=decision==='Edited';
 $('#reviewBox').innerHTML=`<div class="review-top">
 <div class="panel">
   <div class="eyebrow">AI RECOMMENDATION</div>
   <h3 id="reviewRootCause">${d.root_cause}</h3>
   <p style="color:#788ba0;font-size:9px">Confidence ${d.confidence_score}% · ${d.confidence} · ${d.osi_layer}</p>
   <div class="terminal">${d.next_command}</div>
 </div>
 <div class="panel">
   <div class="eyebrow">INDEPENDENT CHECKS</div>
   ${d.rule_checks.map(x=>`<div style="padding:8px 0;border-bottom:1px solid #1d2a38;font-size:8px"><b>${x.check}</b><span style="float:right;color:${x.status==='FAIL'?'#ff7189':'#5ff2ca'}">${x.status}</span></div>`).join('')}
 </div></div>
 <div class="panel" style="margin-top:10px">
   <div class="eyebrow">HUMAN REVIEW</div>
   <p style="font-size:9px;color:#74869b">The reviewer can correct the AI before saving the final decision. Saved decisions are persisted locally and appear in the audit log.</p>
   <label style="display:block;color:#8799ad;font-size:9px;margin:12px 0">Root cause
     <textarea id="editCause" ${editable?'':'disabled'} rows="3" style="width:100%;margin-top:6px;background:#070d14;border:1px solid #1d2a38;border-radius:7px;color:#d4e0ec;padding:10px;font:10px Inter">${d.root_cause}</textarea>
   </label>
   <label style="display:block;color:#8799ad;font-size:9px;margin:12px 0">Reviewer note
     <textarea id="reviewNote" rows="3" style="width:100%;margin-top:6px;background:#070d14;border:1px solid #1d2a38;border-radius:7px;color:#d4e0ec;padding:10px;font:10px Inter" placeholder="Explain why you accepted, edited or rejected the AI recommendation…"></textarea>
   </label>
   <div class="decision">
     <button class="accept" onclick="saveDecision('Accepted')">✓ SAVE ACCEPT</button>
     <button class="edit" onclick="enableEdit()">✎ EDIT & SAVE</button>
     <button class="reject" onclick="saveDecision('Rejected')">× SAVE REJECT</button>
   </div>
 </div>
 <div class="panel" style="margin-top:10px"><div class="panel-head"><span>RECENT REVIEW ACTIVITY</span><b>PERSISTED AUDIT LOG</b></div><div id="recentReviews">Loading…</div></div>`;
 loadRecentReviews();
}
function enableEdit(){
 const el=$('#editCause');
 el.disabled=false;el.focus();el.style.borderColor='#5ff2ca';
 $('#reviewNote').placeholder='Describe the correction you made…';
}
async function saveDecision(action){
 const note=$('#reviewNote')?.value.trim();
 const correctedCause=$('#editCause')?.value.trim();
 const finalNote=note || (action==='Accepted' ? 'Human accepted the AI recommendation.' : action==='Rejected' ? 'Human rejected the AI recommendation.' : 'Human edited the AI recommendation.');
 const res=await fetch('/api/review',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
   case_id:current?.case_id||'LIVE',
   action,
   note: action==='Edited' ? `${finalNote} Final root cause: ${correctedCause}` : finalNote
 })});
 const data=await res.json();
 if(data.ok){
   $('#reviewBox').insertAdjacentHTML('afterbegin',`<div class="saved-toast">✓ REVIEW SAVED · ${action.toUpperCase()} · ${data.total} total audit events</div>`);
   loadRecentReviews();
   renderRai();
 }
}
async function loadRecentReviews(){
 const rows=await get('/api/reviews');
 const recent=rows.slice().reverse().slice(0,8);
 const el=$('#recentReviews');
 if(!el)return;
 el.innerHTML=recent.map(r=>`<div class="rai-row"><b>${r.case_id} · ${r.action}</b><p>${r.note}</p><p style="color:#4f6479">${r.timestamp}</p></div>`).join('')||'<div class="empty">No reviews yet.</div>';
}
async function renderRai(){
 const data=await get('/api/rai');
 const initial=data.initial||[];
 const live=(data.reviews||[]).slice().reverse();
 $('#raiTable').innerHTML=`<div style="margin-bottom:12px;color:#71869b;font-size:9px">Live review events are stored in <b>data/review_log.json</b> and survive page refreshes and app restarts.</div>`+
 (live.length?live.map(r=>`<div class="rai-row"><b>${r.case_id} · ${r.action} · LIVE</b><p><strong>Reviewer:</strong> ${r.note}</p><p style="color:#4f6479">${r.timestamp}</p></div>`).join(''):'')+
 `<div class="eyebrow" style="margin:16px 0 7px">INITIAL RESPONSIBLE-AI CASES</div>`+
 initial.map(r=>`<div class="rai-row"><b>${r.case_id} · ${r.review_action}</b><p><strong>Initial:</strong> ${r.initial_ai_answer}</p><p><strong>Correction:</strong> ${r.human_correction}</p><p><strong>Reason:</strong> ${r.reason}</p></div>`).join('');
}
async function runDemo(){show('workbench');$('#caseSelect').value='NS001';loadCase();await new Promise(r=>setTimeout(r,300));analyzeLive()}

function init3D(){
 const c=$('#topology'),ctx=c.getContext('2d');let W,H,rx=.24,ry=-.38,zoom=1,drag=false,lx=0,ly=0,t=0;
 const nodes=[
  {id:'PC-30',x:-1.8,y:.45,z:.1,c:'#6f94ff',type:'HOST'},
  {id:'SW-CORE',x:-.5,y:.1,z:.25,c:'#5ff2ca',type:'SWITCH'},
  {id:'R1',x:.8,y:.55,z:.1,c:'#f5c86b',type:'ROUTER'},
  {id:'SERVER',x:1.9,y:-.2,z:-.05,c:'#ff7189',type:'SERVER'},
  {id:'DNS',x:.7,y:-.95,z:-.2,c:'#a889ff',type:'DNS'},
  {id:'DHCP',x:-.7,y:-.9,z:.05,c:'#5fc9ff',type:'DHCP'}
 ];
 const edges=[[0,1],[1,2],[2,3],[2,4],[1,5]];let packets=edges.map((e,i)=>({e,p:(i*.19)%1}));
 function resize(){let r=c.getBoundingClientRect();W=c.width=r.width*devicePixelRatio;H=c.height=r.height*devicePixelRatio;ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);W=r.width;H=r.height}
 function proj(n){let x=n.x,y=n.y,z=n.z,cy=Math.cos(ry),sy=Math.sin(ry),cx=Math.cos(rx),sx=Math.sin(rx);let x1=x*cy-z*sy,z1=x*sy+z*cy;let y1=y*cx-z1*sx,z2=y*sx+z1*cx;let p=zoom*110/(3.2+z2);return{x:W/2+x1*p,y:H/2+y1*p,p,z:z2}}
 function draw(){
  ctx.clearRect(0,0,W,H);t+=.012;let ps=nodes.map(proj);
  ctx.save();ctx.translate(0,0);
  // floor grid
  ctx.strokeStyle='#1c344633';ctx.lineWidth=1;for(let i=-6;i<=6;i++){let a=proj({x:i*.45,y:1.25,z:-1.2}),b=proj({x:i*.45,y:1.25,z:1.2});ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();let d=proj({x:-2.7,y:1.25,z:i*.45}),e=proj({x:2.7,y:1.25,z:i*.45});ctx.beginPath();ctx.moveTo(d.x,d.y);ctx.lineTo(e.x,e.y);ctx.stroke()}
  edges.forEach((e)=>{let a=ps[e[0]],b=ps[e[1]];ctx.strokeStyle='#355168aa';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke()});
  packets.forEach(pk=>{pk.p=(pk.p+.004)%1;let a=ps[pk.e[0]],b=ps[pk.e[1]],x=a.x+(b.x-a.x)*pk.p,y=a.y+(b.y-a.y)*pk.p;ctx.fillStyle='#5ff2ca';ctx.shadowBlur=10;ctx.shadowColor='#5ff2ca';ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0});
  nodes.forEach((n,i)=>{let p=ps[i],r=Math.max(8,10*p.p/40);ctx.globalAlpha=.16;ctx.fillStyle=n.c;ctx.beginPath();ctx.arc(p.x,p.y,r*3,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;ctx.fillStyle='#091019';ctx.strokeStyle=n.c;ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle=n.c;ctx.font='700 8px Inter';ctx.textAlign='center';ctx.fillText(n.id,p.x,p.y-r-7);ctx.fillStyle='#667a91';ctx.font='6px Inter';ctx.fillText(n.type,p.x,p.y+r+9)});
  ctx.restore();requestAnimationFrame(draw)
 }
 c.addEventListener('pointerdown',e=>{drag=true;lx=e.clientX;ly=e.clientY;c.setPointerCapture(e.pointerId)});c.addEventListener('pointerup',()=>drag=false);c.addEventListener('pointermove',e=>{if(!drag)return;ry+=(e.clientX-lx)*.008;rx+=(e.clientY-ly)*.008;rx=Math.max(-1.1,Math.min(1.1,rx));lx=e.clientX;ly=e.clientY});c.addEventListener('wheel',e=>{e.preventDefault();zoom*=e.deltaY<0?1.08:.92;zoom=Math.max(.65,Math.min(1.7,zoom))},{passive:false});resize();window.addEventListener('resize',resize);draw()
}
init();
