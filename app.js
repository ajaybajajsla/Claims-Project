// Basic store
const LS = {
  get: (k, d=null) => JSON.parse(localStorage.getItem(k) || JSON.stringify(d)),
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
  rm: (k) => localStorage.removeItem(k)
};

function ensureAdminDefaults(){
  const admin = LS.get('admin', {});
  if (!admin.insurers) admin.insurers = ['ICICI Lombard','HDFC ERGO','Bajaj Allianz','Tata AIG','New India'];
  if (!admin.workshops) admin.workshops = ['ABC Motors','Sharma Auto Works','Delite Service Center'];
  if (!admin.dep) admin.dep = { parts:30, paint:50, glass:0, fibre:30, excess:1000 };
  if (!admin.checklist) admin.checklist = ['Claim form','Policy copy','RC','DL','Estimate','Photos'];
  LS.set('admin', admin);
}

// Auth demo
function requireLogin(){
  const session = LS.get('session');
  if (!session) { alert('Please login first'); location.href = 'login.html'; return false; }
  return true;
}

// Common helpers
function uid(){ return 'C'+Math.random().toString(36).slice(2,9); }
function today(){ return new Date().toISOString().slice(0,10); }
function fmt(n){ return Number(n||0).toFixed(2); }

// Router by page
document.addEventListener('DOMContentLoaded', () => {
  ensureAdminDefaults();
  const page = location.pathname.split('/').pop();

  if (page === 'login.html'){
    document.getElementById('loginForm').addEventListener('submit', e=>{
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target));
      // Accept any credentials for demo; store session
      LS.set('session', { email: data.email });
      location.href = 'dashboard.html';
    });
  }

  if (page === 'dashboard.html'){
    if (!requireLogin()) return;
    const claims = LS.get('claims', []);
    const listEl = document.getElementById('claimsList');
    const tiles = {
      Pending: document.getElementById('countPending'),
      'Work In Progress': document.getElementById('countWip'),
      'Report Pending': document.getElementById('countReportPending'),
      Generated: document.getElementById('countGenerated'),
      Overdue: document.getElementById('countOverdue')
    };

    function renderTiles(){
      const counts = { 'Pending':0, 'Work In Progress':0, 'Report Pending':0, 'Generated':0, 'Overdue':0 };
      claims.forEach(c => counts[c.status] = (counts[c.status]||0) + 1);
      Object.keys(counts).forEach(k => tiles[k].textContent = counts[k]||0);
    }

    function matchesFilters(c){
      const st = document.getElementById('fltStatus').value;
      const ins = document.getElementById('fltInsurer').value.trim().toLowerCase();
      const veh = document.getElementById('fltVeh').value.trim().toLowerCase();
      const tx = document.getElementById('fltText').value.trim().toLowerCase();
      if (st && c.status !== st) return false;
      if (ins && !(c.policy?.insurer||'').toLowerCase().includes(ins)) return false;
      if (veh && !(c.vehicle?.vehReg||'').toLowerCase().includes(veh)) return false;
      if (tx){
        const blob = [c.policy?.refNo, c.policy?.claimNo, c.policy?.policyNo].join(' ').toLowerCase();
        if (!blob.includes(tx)) return false;
      }
      return true;
    }

    function renderList(){
      const filtered = claims.filter(matchesFilters);
      listEl.innerHTML = filtered.map(c => `
        <li>
          <div>
            <strong>${c.policy?.refNo || c.id}</strong>
            <span class="muted"> | ${c.policy?.claimNo || ''} | ${c.policy?.policyNo || ''} | ${c.vehicle?.vehReg || ''}</span>
            <div class="muted">${c.policy?.insurer || ''} • ${c.createdAt}</div>
          </div>
          <div>
            <span class="muted">${c.status}</span>
            <button class="btn" onclick="openClaim('${c.id}')">Open</button>
          </div>
        </li>
      `).join('') || `<li><span class="muted">No claims yet</span></li>`;
      renderTiles();
    }

    document.getElementById('newClaimBtn').addEventListener('click', ()=>{
      const id = uid();
      claims.unshift({
        id, status:'Pending', createdAt: today(),
        policy:{}, vehicle:{}, driver:{}, loss:{},
        estimate:{ items:[] }, assessment:{ betterment:0, excess:LS.get('admin').dep.excess, salvage:0, nonAdmissible:0 },
        reinspections:[], uploads:[], comments:{}
      });
      LS.set('claims', claims);
      openClaim(id);
    });

    document.getElementById('logoutBtn').addEventListener('click', ()=>{
      LS.rm('session'); location.href = 'login.html';
    });

    document.getElementById('btnApplyFilters').addEventListener('click', renderList);
    document.getElementById('btnClearFilters').addEventListener('click', ()=>{
      ['fltStatus','fltInsurer','fltVeh','fltText'].forEach(id=> document.getElementById(id).value=''); renderList();
    });

    document.querySelectorAll('.tile').forEach(t => t.addEventListener('click', ()=>{
      document.getElementById('fltStatus').value = t.dataset.status;
      renderList();
    }));

    renderList();

    // expose
    window.openClaim = (id) => { LS.set('currentClaimId', id); location.href = 'claim.html'; };
  }

  if (page === 'claim.html'){
    if (!requireLogin()) return;
    const admin = LS.get('admin');
    const claims = LS.get('claims', []);
    const id = LS.get('currentClaimId');
    const c = claims.find(x => x.id === id);
    if (!c){ alert('Claim not found'); location.href='dashboard.html'; return; }

    document.getElementById('claimTitle').textContent = `${c.policy?.claimNo || '(no claim no)'} | ${c.vehicle?.vehReg || '(no reg)'} | ${c.status}`;

    // Tab switches
    document.querySelectorAll('.tabs button').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        document.querySelectorAll('.tabs button').forEach(b=> b.classList.remove('active'));
        document.querySelectorAll('.tab').forEach(p=> p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('tab-'+btn.dataset.tab).classList.add('active');
      });
    });

    // Populate fields (basic)
    function set(id, v){ const el = document.getElementById(id); if (el) el.value = v ?? ''; }
    function get(id){ const el = document.getElementById(id); return el ? el.value : ''; }

    // Policy
    set('refNo', c.policy.refNo); set('claimNo', c.policy.claimNo); set('policyNo', c.policy.policyNo);
    set('insurer', c.policy.insurer); set('insuredName', c.policy.insuredName);
    set('insuredEmail', c.policy.insuredEmail); set('insuredContact', c.policy.insuredContact);
    set('insuredAddress', c.policy.insuredAddress); set('estAmount', c.policy.estAmount);
    set('billAmount', c.policy.billAmount);

    // Vehicle
    set('vehReg', c.vehicle.vehReg); set('make', c.vehicle.make); set('model', c.vehicle.model);
    set('year', c.vehicle.year); set('chassisNo', c.vehicle.chassisNo); set('engineNo', c.vehicle.engineNo);
    set('odometer', c.vehicle.odometer); set('preAccidentCond', c.vehicle.preAccidentCond);

    // Driver
    set('drvName', c.driver.drvName); set('drvDlNo', c.driver.drvDlNo);
    set('drvIssue', c.driver.drvIssue); set('drvValid', c.driver.drvValid); set('drvRemarks', c.driver.drvRemarks);

    // Loss
    set('lossDate', c.loss.lossDate); set('lossTime', c.loss.lossTime);
    set('lossPlace', c.loss.lossPlace); set('lossCause', c.loss.lossCause); set('inspRemarks', c.loss.inspRemarks);

    // Estimate
    set('workshop', c.estimate.workshop); set('workshopGstin', c.estimate.workshopGstin);
    set('estimateDate', c.estimate.estimateDate); set('billDate', c.estimate.billDate);

    // Items list
    const itemsList = document.getElementById('itemsList');
    function renderItems(){
      const items = c.estimate.items || [];
      itemsList.innerHTML = items.map((it, i)=>`
        <li>
          <div>${it.type || 'part'} • ${it.desc || ''}</div>
          <div>${fmt(it.amount)} | GST ${fmt(it.tax)} | Adm ${fmt(it.admissible)}</div>
          <button class="btn" onclick="removeItem(${i})">Remove</button>
        </li>
      `).join('') || `<li><span class="muted">No items</span></li>`;
      const sumAmount = items.reduce((s,it)=> s + Number(it.amount||0), 0);
      const sumTax = items.reduce((s,it)=> s + Number(it.tax||0), 0);
      const sumAdm = items.reduce((s,it)=> s + Number(it.admissible||0), 0);
      document.getElementById('sumAmount').value = fmt(sumAmount);
      document.getElementById('sumTax').value = fmt(sumTax);
      document.getElementById('sumAdmissible').value = fmt(sumAdm);
      recomputeAssessment();
    }
    renderItems();

    document.getElementById('btnAddItem').addEventListener('click', ()=>{
      c.estimate.items = c.estimate.items || [];
      c.estimate.items.push({ type:'part', desc:'', qty:1, rate:0, taxPct:18, amount:0, tax:0, admissible:0 });
      LS.set('claims', claims); renderItems();
    });
    document.getElementById('btnClearItems').addEventListener('click', ()=>{
      c.estimate.items = []; LS.set('claims', claims); renderItems();
    });
    window.removeItem = (i)=>{
      c.estimate.items.splice(i,1); LS.set('claims', claims); renderItems();
    };

    // Assessment
    set('betterment', c.assessment.betterment);
    set('excess', c.assessment.excess ?? admin.dep.excess);
    set('salvage', c.assessment.salvage); set('nonAdmissible', c.assessment.nonAdmissible);
    document.getElementById('depMode').value = c.assessment.depMode || 'irda';

    function recomputeAssessment(){
      const items = c.estimate.items || [];
      // recompute each item basic (parts/paint/fibre/glass/labour)
      const depCfg = admin.dep;
      items.forEach(it=>{
        it.amount = Number(it.qty||0) * Number(it.rate||0);
        it.tax = it.amount * Number(it.taxPct||0) / 100;
        const depPct = ({ part:depCfg.parts, paint:depCfg.paint, fibre:depCfg.fibre, glass:depCfg.glass, labour:0, consumable:0 })[it.type] || depCfg.parts;
        const depAmt = it.amount * depPct/100;
        it.admissible = Math.max(0, it.amount - depAmt) + it.tax;
      });

      const sumAdm = items.reduce((s,it)=> s + Number(it.admissible||0), 0);
      const depTotal = items.reduce((s,it)=>{
        const depPct = ({ part:depCfg.parts, paint:depCfg.paint, fibre:depCfg.fibre, glass:depCfg.glass, labour:0, consumable:0 })[it.type] || depCfg.parts;
        return s + (Number(it.amount||0) * depPct/100);
      }, 0);

      const betterment = Number(get('betterment')||0);
      const excess = Number(get('excess')||0);
      const salvage = Number(get('salvage')||0);
      const nonAdm = Number(get('nonAdmissible')||0);
      const net = sumAdm - depTotal - betterment - excess - salvage - nonAdm;

      document.getElementById('totalAdmissible').value = fmt(sumAdm);
      document.getElementById('depreciationTotal').value = fmt(depTotal);
      document.getElementById('netAssessed').value = fmt(net);
    }

    // Save claim
    document.getElementById('saveClaimBtn').addEventListener('click', ()=>{
      c.policy = {
        refNo:get('refNo'), claimNo:get('claimNo'), policyNo:get('policyNo'),
        insurer:get('insurer'), insuredName:get('insuredName'),
        insuredEmail:get('insuredEmail'), insuredContact:get('insuredContact'),
        insuredAddress:get('insuredAddress'), estAmount:Number(get('estAmount')||0), billAmount:Number(get('billAmount')||0)
      };
      c.vehicle = {
        vehReg:get('vehReg'), make:get('make'), model:get('model'), year:Number(get('year')||0),
        chassisNo:get('chassisNo'), engineNo:get('engineNo'),
        odometer:Number(get('odometer')||0), preAccidentCond:get('preAccidentCond')
      };
      c.driver = { drvName:get('drvName'), drvDlNo:get('drvDlNo'), drvIssue:get('drvIssue'), drvValid:get('drvValid'), drvRemarks:get('drvRemarks') };
      c.loss = { lossDate:get('lossDate'), lossTime:get('lossTime'), lossPlace:get('lossPlace'), lossCause:get('lossCause'), inspRemarks:get('inspRemarks') };
      c.assessment = {
        depMode:document.getElementById('depMode').value,
        betterment:Number(get('betterment')||0), excess:Number(get('excess')||admin.dep.excess),
        salvage:Number(get('salvage')||0), nonAdmissible:Number(get('nonAdmissible')||0),
        totalAdmissible:Number(document.getElementById('totalAdmissible').value||0),
        depreciationTotal:Number(document.getElementById('depreciationTotal').value||0),
        netAssessed:Number(document.getElementById('netAssessed').value||0)
      };
      LS.set('claims', claims);
      alert('Saved');
    });

    // Generate report
    document.getElementById('generateBtn').addEventListener('click', ()=>{
      c.status = 'Generated';
      LS.set('claims', claims);
      const html = `
        <h2>Survey Report</h2>
        <p><b>Reference:</b> ${c.policy.refNo || ''} &nbsp; <b>Claim No:</b> ${c.policy.claimNo || ''} &nbsp; <b>Policy No:</b> ${c.policy.policyNo || ''}</p>
        <p><b>Insured:</b> ${c.policy.insuredName || ''} &nbsp; <b>Insurer:</b> ${c.policy.insurer || ''}</p>
        <p><b>Vehicle:</b> ${c.vehicle.make || ''} ${c.vehicle.model || ''} &nbsp; <b>Reg:</b> ${c.vehicle.vehReg || ''}</p>
        <p><b>Loss:</b> ${c.loss.lossDate || ''} ${c.loss.lossTime || ''} at ${c.loss.lossPlace || ''} &nbsp; <b>Cause:</b> ${c.loss.lossCause || ''}</p>
        <hr>
        <p><b>Total Admissible:</b> ₹${fmt(c.assessment.totalAdmissible)} &nbsp; <b>Depreciation:</b> ₹${fmt(c.assessment.depreciationTotal)}</p>
        <p><b>Betterment:</b> ₹${fmt(c.assessment.betterment)} &nbsp; <b>Excess:</b> ₹${fmt(c.assessment.excess)} &nbsp; <b>Salvage:</b> ₹${fmt(c.assessment.salvage)} &nbsp; <b>Non-admissibles:</b> ₹${fmt(c.assessment.nonAdmissible)}</p>
        <h3>Net Assessed: ₹${fmt(c.assessment.netAssessed)}</h3>
      `;
      const area = document.getElementById('reportArea');
      area.style.display = 'block';
      area.innerHTML = html;
      alert('Report marked Generated');
    });

    // Print
    document.getElementById('printBtn').addEventListener('click', ()=>{
      window.print();
    });

    // Reinspection
    const reinspectionsList = document.getElementById('reinspectionsList');
    function renderReinsp(){
      reinspectionsList.innerHTML = (c.reinspections||[]).map((r,i)=>`
        <li>
          <div>${r.date} • ${r.reason || ''}</div>
          <div>${r.findings || ''}</div>
          <button class="btn" onclick="removeReinsp(${i})">Remove</button>
        </li>
      `).join('') || `<li><span class="muted">No reinspection entries</span></li>`;
    }
    renderReinsp();
    document.getElementById('btnAddReinsp').addEventListener('click', ()=>{
      c.reinspections.push({ date: today(), reason:'', findings:'' });
      LS.set('claims', claims); renderReinsp();
    });
    document.getElementById('btnClearReinsp').addEventListener('click', ()=>{
      c.reinspections = []; LS.set('claims', claims); renderReinsp();
    });
    window.removeReinsp = (i)=>{ c.reinspections.splice(i,1); LS.set('claims', claims); renderReinsp(); };

    // Docs/comments (uploads are stubbed)
    const uploadList = document.getElementById('uploadList');
    const fileUpload = document.getElementById('fileUpload');
    function renderUploads(){ uploadList.innerHTML = (c.uploads||[]).map((f,i)=> `<li><div>${f.name}</div><button class="btn" onclick="removeUpload(${i})">Remove</button></li>`).join('') || `<li><span class="muted">No uploads</span></li>`; }
    renderUploads();
    fileUpload.addEventListener('change', (e)=>{
      const arr = Array.from(e.target.files||[]);
      c.uploads = c.uploads || [];
      arr.forEach(f => c.uploads.push({ name:f.name, size:f.size, type:f.type }));
      LS.set('claims', claims); renderUploads(); e.target.value='';
    });
    window.removeUpload = (i)=>{ c.uploads.splice(i,1); LS.set('claims', claims); renderUploads(); };
  }

  if (page === 'admin.html'){
    if (!requireLogin()) return;
    const admin = LS.get('admin'); const setAdmin = (a)=> LS.set('admin', a);

    // lists
    function renderLists(){
      document.getElementById('listInsurers').innerHTML = admin.insurers.map((n,i)=> `<li><div>${n}</div><button class="btn" onclick="delIns(${i})">Remove</button></li>`).join('') || `<li><span class="muted">None</span></li>`;
      document.getElementById('listWorkshops').innerHTML = admin.workshops.map((n,i)=> `<li><div>${n}</div><button class="btn" onclick="delWs(${i})">Remove</button></li>`).join('') || `<li><span class="muted">None</span></li>`;
      document.getElementById('listChecklist').innerHTML = admin.checklist.map((n,i)=> `<li><div>${n}</div><button class="btn" onclick="delCl(${i})">Remove</button></li>`).join('') || `<li><span class="muted">None</span></li>`;
      document.getElementById('adminDepParts').value = admin.dep.parts;
      document.getElementById('adminDepPaint').value = admin.dep.paint;
      document.getElementById('adminDepGlass').value = admin.dep.glass;
      document.getElementById('adminDepFibre').value = admin.dep.fibre;
      document.getElementById('adminExcess').value = admin.dep.excess;
    }
    renderLists();

    document.getElementById('btnAddInsurer').addEventListener('click', ()=>{
      const v = document.getElementById('newInsurer').value.trim(); if (!v) return;
      admin.insurers.push(v); setAdmin(admin); document.getElementById('newInsurer').value=''; renderLists();
    });
    document.getElementById('btnAddWorkshop').addEventListener('click', ()=>{
      const v = document.getElementById('newWorkshop').value.trim(); if (!v) return;
      admin.workshops.push(v); setAdmin(admin); document.getElementById('newWorkshop').value=''; renderLists();
    });
    document.getElementById('btnAddChecklistItem').addEventListener('click', ()=>{
      const v = document.getElementById('newChecklistItem').value.trim(); if (!v) return;
      admin.checklist.push(v); setAdmin(admin); document.getElementById('newChecklistItem').value=''; renderLists();
    });

    document.getElementById('btnSaveAdmin').addEventListener('click', ()=>{
      admin.dep.parts = Number(document.getElementById('adminDepParts').value||0);
      admin.dep.paint = Number(document.getElementById('adminDepPaint').value||0);
      admin.dep.glass = Number(document.getElementById('adminDepGlass').value||0);
      admin.dep.fibre = Number(document.getElementById('adminDepFibre').value||0);
      admin.dep.excess = Number(document.getElementById('adminExcess').value||0);
      setAdmin(admin); alert('Admin saved');
    });

    document.getElementById('btnResetAdmin').addEventListener('click', ()=>{
      LS.rm('admin'); ensureAdminDefaults(); alert('Defaults restored'); location.reload();
    });

    window.delIns = (i)=>{ admin.insurers.splice(i,1); setAdmin(admin); renderLists(); };
    window.delWs = (i)=>{ admin.workshops.splice(i,1); setAdmin(admin); renderLists(); };
    window.delCl = (i)=>{ admin.checklist.splice(i,1); setAdmin(admin); renderLists(); };
  }
});
