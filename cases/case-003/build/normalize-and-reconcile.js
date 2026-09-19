// CASE-003 G2 pure normalization/reconciliation functions.
// Designed for n8n Code nodes or a future shared package; no network or DB dependency.
const text=v=>v===null||v===undefined||v===''?null:String(v).trim();
const num=v=>{ if(v===null||v===undefined||v==='') return null; const n=Number(v); if(!Number.isFinite(n)) throw new Error('INVALID_NUMBER'); return n; };
const iso=v=>{ if(v===null||v===undefined||v==='') return null; if(typeof v==='number'){ const d=new Date(Date.UTC(1899,11,30)+v*86400000); return d.toISOString().slice(0,10); } const d=new Date(v); if(Number.isNaN(d.valueOf())) throw new Error('INVALID_DATE'); return d.toISOString().slice(0,10); };
const year=d=>Number(iso(d).slice(0,4));

function normalizeQQVA(r){
 return {kind:'supplier',companyCode:text(r['CoCd']),sapVendorId:text(r['Vendor']),displayName:text(r['Name']),taxId:text(r['Tax code 1']),trustedContactEmail:text(r["Clerk's internet address"]),sourceVersionRaw:text(r['Version'])};
}
function normalizeSCIV(r){
 return {kind:'invoice',companyCode:text(r['Company Code']),sapVendorId:text(r['Supplier']),invoiceReference:text(r['Reference Document No.']),invoiceUniqueId:text(r['Invoice Unique ID']),fiDocumentNumber:text(r['FI Document No.']),fiscalYear:num(r['Fiscal Year']),documentDate:iso(r['Document Date']),receiptDate:iso(r['Receipt Date']),currency:text(r['Currency']),grossAmount:num(r['Gross inv. amnt']),scivDueDate:iso(r['Due Date for Net Payment']),technicalStatusRaw:text(r['Technical Status']),invoiceStatusRaw:text(r['Invoice Status']),paymentBlockRaw:text(r['Log. payt block'])};
}
function normalizeFBL1N(r){
 const postingDate=iso(r['Posting Date']);
 return {kind:'financial_item',companyCode:text(r['Company Code']),documentNumber:text(r['Document Number']),fiscalYear:year(postingDate),documentTypeRaw:text(r['Document Type']),invoiceReference:text(r['Reference']),documentDate:iso(r['Document Date']),postingDate,paymentDateRaw:iso(r['Payment date']),netDueDate:iso(r['Net due date']),documentAmount:num(r['Amount in doc. curr.']),currency:text(r['Document currency']),clearingDate:iso(r['Clearing date']),clearingDocumentNumber:text(r['Clearing Document']),paymentMethodRaw:text(r['Payment Method']),paymentBlockRaw:text(r['Payment Block'])};
}
const key=(...xs)=>xs.map(x=>x??'').join('|');
function reconcile(suppliers,invoices,financialItems){
 const warnings=[]; const supplierMap=new Map(suppliers.map(x=>[key(x.companyCode,x.sapVendorId),x]));
 const fiMap=new Map(financialItems.map(x=>[key(x.companyCode,x.documentNumber,x.fiscalYear),x]));
 const links=[];
 for(const i of invoices){
   if(!supplierMap.has(key(i.companyCode,i.sapVendorId))) throw new Error('UNRESOLVED_SUPPLIER:'+i.companyCode+':'+i.sapVendorId);
   if(!i.fiDocumentNumber){ warnings.push({code:'SCIV_NO_FI',invoiceReference:i.invoiceReference}); continue; }
   const f=fiMap.get(key(i.companyCode,i.fiDocumentNumber,i.fiscalYear));
   if(!f){ warnings.push({code:'SCIV_FI_UNMATCHED',invoiceReference:i.invoiceReference}); continue; }
   links.push({invoice:i,financialItem:f,matchType:'fi_key',isPrimary:true,amountMismatch:Math.abs(Math.abs(f.documentAmount)-Math.abs(i.grossAmount))>0.01});
   if(Math.abs(Math.abs(f.documentAmount)-Math.abs(i.grossAmount))>0.01) warnings.push({code:'AMOUNT_MISMATCH',invoiceReference:i.invoiceReference});
 }
 return {links,warnings};
}
function project(invoice,financialItem,today){
 const due=(financialItem&&financialItem.netDueDate)||invoice.scivDueDate||null;
 const source=financialItem&&financialItem.netDueDate?'FBL1N':invoice.scivDueDate?'SCIV':'NONE';
 const conflict=!!(financialItem&&financialItem.netDueDate&&invoice.scivDueDate&&financialItem.netDueDate!==invoice.scivDueDate);
 const days=due?Math.round((new Date(due+'T00:00:00Z')-new Date(today+'T00:00:00Z'))/86400000):null;
 return {...invoice,fbl1nNetDueDate:financialItem?.netDueDate||null,canonicalDueDate:due,dueDateSource:source,dueDateConflict:conflict,isOverdue:days!==null&&days<0,daysToDue:days,overdueDays:days!==null?Math.max(-days,0):null,paymentStatusEvidence:financialItem?.clearingDate||financialItem?.clearingDocumentNumber?'SETTLEMENT_EVIDENCE':financialItem?.paymentDateRaw?'PAYMENT_DATE_EVIDENCE':'UNKNOWN'};
}
module.exports={normalizeQQVA,normalizeSCIV,normalizeFBL1N,reconcile,project};
