const assert=require('assert'); const m=require('./normalize-and-reconcile'); const f=require('./synthetic-fixtures.json');
const suppliers=f.suppliers.map(m.normalizeQQVA), invoices=f.sciv.map(m.normalizeSCIV), items=f.fbl1n.map(m.normalizeFBL1N);
const r=m.reconcile(suppliers,invoices,items);
assert.equal(r.links.length,1); assert(r.warnings.some(x=>x.code==='SCIV_NO_FI'));
const p=m.project(r.links[0].invoice,r.links[0].financialItem,'2026-09-21');
assert.equal(p.canonicalDueDate,'2026-09-24'); assert.equal(p.dueDateSource,'FBL1N'); assert.equal(p.dueDateConflict,true); assert.equal(p.daysToDue,3); assert.equal(p.isOverdue,false);
const pre=m.project(invoices[1],null,'2026-09-26'); assert.equal(pre.dueDateSource,'SCIV'); assert.equal(pre.isOverdue,true); assert.equal(pre.overdueDays,1);
assert.equal(p.paymentStatusEvidence,'UNKNOWN');
console.log('PASS G2: canonical normalization, FI join, due-date precedence/conflict, dynamic due metrics, pre-FI fallback');
