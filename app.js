/* מסלול — Private first, offline-first personal budget. No external dependencies. */
'use strict';
const STORAGE_KEY='maslul-budget-v1';
const LEGACY_FRIEND_STORAGE_KEY='maslul-budget-friend-clean-v1';
const APP_BUILD='1.9.5';
const DEFAULT_CATEGORIES=[
 {id:'home',name:'דיור וחשבונות',icon:'⌂',items:[
  ['rent','שכר דירה',0,10000,100],['arnona','ארנונה',0,1200,25],['vaad','ועד בית',0,900,25],['electricity','חשמל',0,1500,25],['water','מים וביוב',0,550,10],['gas','גז',0,300,10]]},
 {id:'digital',name:'תקשורת ומנויים',icon:'◎',items:[
  ['internet','אינטרנט ביתי וטלוויזיה',0,500,5],['mobile','סלולר',0,250,1],['chatgpt','ChatGPT',0,500,1],['google','Google One',0,350,1],['spotify','Spotify',0,200,1],['otherapps','מנויים נוספים',0,1000,5]]},
 {id:'michal',name:'תשלומים וחסכון',icon:'♡',items:[
  ['alimony','מזונות',0,5000,50],['afternoon','תשלום עד אחר הצהריים',0,6000,50],['halves','מחציות והוצאות נוספות',0,3000,50],['michalsave','חיסכון לילדים',0,2500,50]]},
 {id:'groceries',name:'סופר ומשק בית',icon:'▤',items:[
  ['food','מזון ומצרכים לבישול בבית',0,4500,50],['household','מוצרי ניקיון והיגיינה',0,1200,25]]},
 {id:'dining',name:'אוכל בחוץ ובתי קפה',icon:'☕',items:[
  ['worklunch','ארוחות צהריים בעבודה',0,1800,50],['restaurants','מסעדות ובתי קפה',0,2000,50],['takeaway','משלוחים ואוכל מוכן',0,1400,25]]},
 {id:'car',name:'תחבורה ורכב',icon:'↝',items:[
  ['fuel','דלק',0,2500,50],['carother','שטיפות, חניה וכבישי אגרה',0,1000,25]]},
 {id:'personal',name:'בריאות והוצאות אישיות',icon:'✚',items:[
  ['maccabi','מכבי – ביטוחים ושירותי בריאות',0,1200,10],['gym','חדר כושר',0,1000,25],['medical','תרופות, טיפולי שיניים ובריאות',0,1800,25],['clothing','ביגוד והנעלה',0,2400,50],['grooming','תספורת וטיפוח',0,750,10]]},
 {id:'leisure',name:'בילויים ותרבות',icon:'♫',items:[
  ['concerts','הופעות ומוזיקה חיה',0,2000,50],['books','ספרים ותרבות',0,1000,25],['activities','בילויים ופעילויות',0,1800,50]]},
 {id:'vacation',name:'חופשות וטיולים',icon:'✈',items:[
  ['vacations','הפרשה חודשית לחופשות',0,3500,50]]},
 {id:'misc',name:'הוצאות נוספות ובלתי צפויות',icon:'◇',items:[
  ['gifts','מתנות ואירועים',0,1600,25],['equipment','ציוד לבית ותיקונים',0,2400,25],['reserve','רזרבה להוצאות בלתי צפויות',0,3000,50]]}
].map(c=>({...c,items:c.items.map(([id,name,base,max,step])=>({id,name,base,max,step}))}));
let CATEGORIES=DEFAULT_CATEGORIES.map(c=>({...c,items:c.items.map(i=>({...i}))}));
let ITEMS=[],ITEM_BY_ID={},CAT_BY_ID={};
function syncCatalog(){CATEGORIES=state.categories;ITEMS=CATEGORIES.flatMap(c=>c.items);ITEM_BY_ID=Object.fromEntries(ITEMS.map(x=>[x.id,x]));CAT_BY_ID=Object.fromEntries(CATEGORIES.map(c=>[c.id,c]));}
function normalizeCatalog(input){
 const usedCats=new Set(),usedItems=new Set();const data=Array.isArray(input)?input:DEFAULT_CATEGORIES;
 return data.slice(0,100).filter(c=>c&&typeof c==='object').map(c=>{
  const id=String(c.id||'');if(!/^[a-zA-Z0-9_-]{1,100}$/.test(id)||usedCats.has(id))return null;usedCats.add(id);
  const items=Array.isArray(c.items)?c.items.slice(0,120):[];
  // A stable category ID preserves historic budgets and transaction links.
  // The display label is universal, including when loading old personal backups.
  const publicCategoryName=id==='michal'?'תשלומים וחסכון':(String(c.name||'קטגוריה').trim().slice(0,80)||'קטגוריה');
  return {id,name:publicCategoryName,icon:String(c.icon||'◇').slice(0,3),items:items.map(i=>{
   const iid=String(i?.id||'');if(!/^[a-zA-Z0-9_-]{1,100}$/.test(iid)||usedItems.has(iid))return null;usedItems.add(iid);
   const legacyItemLabel=String(i.name||'פריט הוצאה').trim().slice(0,100)||'פריט הוצאה';
   const publicItemName=id==='michal'&&iid==='michalsave'&&legacyItemLabel.includes('\u05de\u05d9\u05db\u05dc')?'חיסכון לילדים':legacyItemLabel;
   return {id:iid,name:publicItemName,base:clamp(i.base,0,10000000,0),max:clamp(i.max,100,10000000,3000),step:clamp(i.step,1,100000,50)};
  }).filter(Boolean)};
 }).filter(Boolean);
}
// Catalog identities stay stable when labels change; existing transactions are not lost.
function createCatalogId(prefix){return prefix+'-'+uid().replace(/[^a-zA-Z0-9_-]/g,'').slice(0,80)}

const initial=()=>({schema:1,categories:normalizeCatalog(DEFAULT_CATEGORIES.map(c=>({...c,items:[]}))),bankBalance:null,bankLedger:[],openingBalances:{},creditCards:[],defaultCardId:"",itemPayments:{},itemFrequency:{},itemInstallments:{},payslips:[],importDocuments:[],income:0,incomeSources:[],itemSchedules:{},starterIncome:0,starterBudget:{},budget:{},overrides:{},transactions:[],events:[],insightHistory:[],settings:{planningStart:todayISO().slice(0,7),forecastLength:12,model:'gemini-3.5-flash-lite',geminiModelUpdated140:true,name:'התקציב שלי'}});
function safeLoad(){try{const str=localStorage.getItem(STORAGE_KEY);if(!str)return initial();return sanitize(JSON.parse(str));}catch(e){console.warn('Data load error',e);return initial()}}
function sanitize(raw){if(!raw||raw.schema!==1||typeof raw!=='object')throw Error('גיבוי לא מתאים לגרסה זו');const d=initial();d.income=clamp(raw.income,0,10000000,d.income);d.starterIncome=clamp(raw.starterIncome,0,10000000,d.starterIncome);d.categories=normalizeCatalog(raw.categories);d.bankBalance=safeBalance(raw.bankBalance);
 // Explicit opening balances are authoritative per month; a bank snapshot is a dated anchor.
 d.bankLedger=Array.isArray(raw.bankLedger)?raw.bankLedger.slice(0,10000).filter(x=>x&&validDate(x.date)&&Number.isFinite(Number(x.amount))&&Number.isFinite(Number(x.balance))).map(x=>({date:x.date,amount:Number(x.amount),balance:Number(x.balance),description:String(x.description||'').slice(0,180),key:String(x.key||'').slice(0,240)})):[];
 d.creditCards=Array.isArray(raw.creditCards)?raw.creditCards.slice(0,40).filter(x=>x&&typeof x==='object'&&String(x.id||'')).map(x=>({id:String(x.id).slice(0,100),last4:/^\d{4}$/.test(String(x.last4||''))?String(x.last4):'',name:String(x.name||'').trim().slice(0,70),day:Math.round(clamp(x.day,1,31,2))})).filter((x,i,arr)=>arr.findIndex(y=>y.id===x.id)===i):[];
 d.defaultCardId=d.creditCards.some(x=>x.id===raw.defaultCardId)?String(raw.defaultCardId):(d.creditCards[0]?.id||'');
 d.itemPayments={};for(const [id,pay] of Object.entries(raw.itemPayments||{})){if(!d.categories.some(c=>c.items.some(i=>i.id===id))||!pay||typeof pay!=='object')continue;d.itemPayments[id]=cleanPayment(pay)}
 // Expense frequency is optional in older backups: all existing items stay recurring.
 d.itemFrequency={};for(const [id,pattern] of Object.entries(raw.itemFrequency||{})){if(!d.categories.some(c=>c.items.some(i=>i.id===id))||!pattern||typeof pattern!=='object')continue;if(pattern.frequency==='once'&&validDate(pattern.date))d.itemFrequency[id]={frequency:'once',date:pattern.date};}
 d.itemInstallments={};for(const [id,plan] of Object.entries(raw.itemInstallments||{})){if(d.categories.some(c=>c.items.some(i=>i.id===id))){const p=cleanInstallmentPlan(plan);if(p)d.itemInstallments[id]=p;}}
 d.openingBalances={};for(const [month,val] of Object.entries(raw.openingBalances||{})){if(validMonth(month)&&Number.isFinite(Number(val))&&Math.abs(Number(val))<1e9)d.openingBalances[month]=Math.round(Number(val)*100)/100;}
 d.payslips=Array.isArray(raw.payslips)?raw.payslips.slice(0,300).filter(p=>p&&validMonth(p.workMonth)&&validDate(p.payDate)&&Number.isFinite(Number(p.netPay))&&Number(p.netPay)>0).map(p=>({id:String(p.id||uid()).slice(0,100),employer:String(p.employer||'מעסיק').slice(0,120),workMonth:p.workMonth,payDate:p.payDate,netPay:Math.round(clamp(p.netPay,.01,1e7,.01)*100)/100,sourceId:String(p.sourceId||'').slice(0,100),sourceName:String(p.sourceName||'').slice(0,120),breakdown:cleanPayslipBreakdown(p.breakdown)})):[];const validIds=new Set(d.categories.flatMap(c=>c.items.map(i=>i.id)));for(const item of d.categories.flatMap(c=>c.items)){d.budget[item.id]=clamp(raw.budget?.[item.id],0,10000000,item.base);d.starterBudget[item.id]=clamp(raw.starterBudget?.[item.id],0,10000000,item.base)};
 const overrides={};for(const [month,values] of Object.entries(raw.overrides||{})){if(!validMonth(month)||!values||typeof values!=='object')continue;overrides[month]={};for(const [key,n] of Object.entries(values)){if(key==='income'||validIds.has(key))overrides[month][key]=clamp(n,0,10000000,0)}}d.overrides=overrides;
 d.transactions=Array.isArray(raw.transactions)?raw.transactions.slice(0,50000).filter(t=>t&&/^\d{4}-\d\d-\d\d$/.test(t.date)&&['expense','income'].includes(t.type)&&Number.isFinite(Number(t.amount))).map(t=>({id:String(t.id||uid()),date:t.date,type:t.type,itemId:validIds.has(t.itemId)?t.itemId:'other',amount:clamp(t.amount,0,10000000,0),note:String(t.note||'').slice(0,400),sourceKind:['bank','card','current-card'].includes(t.sourceKind)?t.sourceKind:'manual',sourceName:String(t.sourceName||'').slice(0,120),sourceId:String(t.sourceId||'').slice(0,100),sourceFingerprint:String(t.sourceFingerprint||'').slice(0,400),documentId:String(t.documentId||'').slice(0,100),status:t.status==='pending'?'pending':'posted',payment:cleanPayment(t.payment||defaultPaymentFor(t.itemId,t.sourceKind)),dueDate:validDate(t.dueDate)?t.dueDate:'',installments:t.sourceKind==='manual'||!t.sourceKind?cleanInstallmentPlan(t.installments):null})):[];
 d.importDocuments=Array.isArray(raw.importDocuments)?raw.importDocuments.slice(-150).filter(d=>d&&typeof d==='object').map(d=>({id:String(d.id||uid()).slice(0,100),name:String(d.name||'תדפיס').slice(0,120),kind:['bank','card','current-card','payslip'].includes(d.kind)?d.kind:'bank',uploadedAt:String(d.uploadedAt||'').slice(0,40),cardId:String(d.cardId||'').slice(0,100),count:Math.max(0,Number(d.count)||0),added:Math.max(0,Number(d.added)||0),duplicates:Math.max(0,Number(d.duplicates)||0),skipped:Math.max(0,Number(d.skipped)||0),payslipNet:d.payslipNet!==null&&d.payslipNet!==undefined&&Number.isFinite(Number(d.payslipNet))?Number(d.payslipNet):null,payslipEmployer:String(d.payslipEmployer||'').slice(0,120),reconciliation:String(d.reconciliation||'').slice(0,220),isTruncated:!!d.isTruncated,rows:Array.isArray(d.rows)?d.rows.slice(0,3000).filter(r=>r&&validDate(r.date)&&Number.isFinite(Number(r.amount))).map(r=>({date:r.date,description:String(r.description||'').slice(0,180),amount:Math.abs(Number(r.amount)),type:r.type==='income'?'income':'expense',status:r.status==='pending'?'pending':'posted',classification:String(r.classification||'').slice(0,25),outcome:String(r.outcome||'').slice(0,25)})):[],payslip:cleanPayslipBreakdown(d.payslip)})):[];
 d.events=Array.isArray(raw.events)?raw.events.slice(0,3000).filter(e=>e&&validMonth(e.month)&&['expense','income'].includes(e.type)).map(e=>({id:String(e.id||uid()),month:e.month,type:e.type,title:String(e.title||'אירוע').slice(0,140),amount:clamp(e.amount,0,10000000,0),note:String(e.note||'').slice(0,500),recurrence:e.recurrence==='monthly'?'monthly':'once',endMonth:validMonth(e.endMonth)?e.endMonth:'',startDate:validDate(e.startDate)?e.startDate:'',endDate:validDate(e.endDate)?e.endDate:'',payment:cleanPayment(e.payment||{method:'card',lag:1,day:2}),splitMode:!!e.splitMode||(Array.isArray(e.parts)&&e.parts.length>0),installments:cleanInstallmentPlan(e.installments),parts:Array.isArray(e.parts)?e.parts.slice(0,200).filter(x=>x&&validDate(x.date)&&Number(x.amount)>0&&Number.isFinite(Number(x.amount))).map(x=>({id:String(x.id||uid()).slice(0,100),title:String(x.title||'תשלום').slice(0,140),date:x.date,amount:Math.round(clamp(x.amount,0,10000000,0)*100)/100,note:String(x.note||'').slice(0,300),installments:cleanInstallmentPlan(x.installments),payment:cleanPayment(x.payment||{method:'card',lag:1,day:2})})):[]})):[];
 
 d.incomeSources=Array.isArray(raw.incomeSources)?raw.incomeSources.slice(0,120).map(s=>({id:String(s.id||uid()),name:String(s.name||'משכורת').slice(0,100),kind:s.kind==='other'?'other':'salary',amount:clamp(s.amount,0,10000000,0),frequency:s.frequency==='once'?'once':'monthly',startDate:validDate(s.startDate)?s.startDate:'',endDate:validDate(s.endDate)?s.endDate:'',prorate:!!s.prorate,paymentLagMonths:[0,1,2].includes(Number(s.paymentLagMonths))?Number(s.paymentLagMonths):(s.kind==='other'||s.frequency==='once'?0:1),payDay:Math.round(clamp(s.payDay,1,28,5))})).filter(s=>!(s.startDate&&s.endDate&&s.startDate>s.endDate)): (raw.income>0?[{id:'legacy-primary-salary',name:'משכורת ראשית',kind:'salary',amount:d.income,frequency:'monthly',startDate:'',endDate:'',prorate:false,paymentLagMonths:1,payDay:5}]:[]);
 d.itemSchedules={};for(const [id,entries] of Object.entries(raw.itemSchedules||{})){if(!validIds.has(id)||!Array.isArray(entries))continue;d.itemSchedules[id]=entries.slice(0,100).map(e=>({id:String(e.id||uid()),amount:clamp(e.amount,0,10000000,0),startDate:validDate(e.startDate)?e.startDate:'',endDate:validDate(e.endDate)?e.endDate:'',prorate:!!e.prorate})).filter(e=>!(e.startDate&&e.endDate&&e.startDate>e.endDate));}
 // One-time backward compatibility: old settings-based rent increases become an expense period.
 // Existing rent periods always take priority. New budgets never keep a rent increase in settings.
 const legacyRentMonth=raw.settings?.rentIncreaseMonth,legacyRentAmount=Number(raw.settings?.rentIncreaseAmount);
 if(validIds.has('rent')&&!(d.itemSchedules.rent||[]).length&&validMonth(legacyRentMonth)&&Number.isFinite(legacyRentAmount)&&legacyRentAmount>0){
  const baseline=d.budget.rent||0;
  const prevDay=new Date(legacyRentMonth+'-01T12:00:00Z');prevDay.setUTCDate(0);
  d.itemSchedules.rent=[...(baseline>0?[{id:'migrated-rent-before',startDate:'',endDate:prevDay.toISOString().slice(0,10),amount:baseline,prorate:false}]:[]),{id:'migrated-rent-step',startDate:legacyRentMonth+'-01',endDate:'',amount:legacyRentAmount,prorate:false}];
 }
 d.insightHistory=Array.isArray(raw.insightHistory)?raw.insightHistory.slice(0,8).filter(e=>typeof e.text==='string').map(e=>({scope:e.scope==='all'?'all':'month',month:validMonth(e.month)?e.month:todayISO().slice(0,7),date:String(e.date||''),text:String(e.text).slice(0,15000)})):[];
 if(raw.settings&&typeof raw.settings==='object'){d.settings={...d.settings,planningStart:validMonth(raw.settings.planningStart)?raw.settings.planningStart:todayISO().slice(0,7),forecastLength:Math.round(clamp(raw.settings.forecastLength,1,24,12)),model:(()=>{const old=String(raw.settings.model||d.settings.model).replace(/[^a-zA-Z0-9._-]/g,'').slice(0,80)||d.settings.model;return !raw.settings.geminiModelUpdated140&&['gemini-2.5-flash','gemini-3.8-flash'].includes(old)?'gemini-3.5-flash-lite':old})(),geminiModelUpdated140:true,name:String(raw.settings.name||d.settings.name).slice(0,60)}}return d;
}
function cleanPayslipBreakdown(raw){
 if(!raw||typeof raw!=='object')return null;
 const amount=k=>{if(raw[k]===null||raw[k]===undefined||raw[k]==='')return null;const n=Number(raw[k]);return n>=0&&Number.isFinite(n)&&n<=1e7?Math.round(n*100)/100:null;};
 const result={gross:amount('gross'),base:amount('base'),additions:amount('additions'),deductions:amount('deductions'),tax:amount('tax'),nationalInsurance:amount('nationalInsurance'),healthInsurance:amount('healthInsurance'),pension:amount('pension'),otherDeductions:amount('otherDeductions'),vacationDays:amount('vacationDays'),creditPoints:amount('creditPoints')};
 result.notes=String(raw.notes||'').slice(0,250);
 return Object.values(result).some(v=>typeof v==='number')?result:null;
}
function safeBalance(raw){if(!raw||typeof raw!=='object')return null;const amount=Number(raw.amount),asOf=String(raw.asOf||'');if(!Number.isFinite(amount)||Math.abs(amount)>1e9||!/^(?:19|20|21)\d\d-\d\d-\d\d$/.test(asOf))return null;const dt=new Date(asOf+'T12:00:00');if(Number.isNaN(dt.getTime())||dt.toISOString().slice(0,10)!==asOf)return null;return {amount:Math.round(amount*100)/100,asOf,source:String(raw.source||'תדפיס בנק').slice(0,100),updatedAt:String(raw.updatedAt||'').slice(0,50)}}
function clamp(n,min,max,fall){const v=Number(n);return Number.isFinite(v)?Math.max(min,Math.min(max,v)):fall}
function validMonth(s){return /^\d{4}-(0[1-9]|1[0-2])$/.test(s||'')}
function validDate(s){if(!/^\d{4}-\d\d-\d\d$/.test(s||''))return false;const d=new Date(s+'T12:00:00');return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===s}
function monthDays(month){const [y,m]=month.split('-').map(Number);return new Date(y,m,0).getDate()}
function activeFraction(month,start='',end=''){const first=month+'-01',last=month+'-'+String(monthDays(month)).padStart(2,'0');const lo=start&&start>first?start:first,hi=end&&end<last?end:last;if(lo>hi)return 0;return (Number(hi.slice(-2))-Number(lo.slice(-2))+1)/monthDays(month)}
function withinMonth(month,start='',end=''){return activeFraction(month,start,end)>0}
function periodText(start,end){return (start||'ללא התחלה')+' — '+(end||'ללא סיום')}
// Work period and bank credit date are separate. By default salaries earned
// in month M reach the account in M+1, while other income uses its own month.
function sourceEarnings(source,workMonth){
 if(source.frequency==='once')return source.startDate?.slice(0,7)===workMonth?source.amount:0;
 const fraction=activeFraction(workMonth,source.startDate,source.endDate);
 return fraction>0?source.amount*(source.prorate?fraction:1):0;
}
function sourceLag(source){return [0,1,2].includes(Number(source.paymentLagMonths))?Number(source.paymentLagMonths):(source.kind==='other'||source.frequency==='once'?0:1)}
function sourceReceipt(source,bankMonth){return sourceEarnings(source,addMonths(bankMonth,-sourceLag(source)))}
function sourceReceiptDate(source,bankMonth){if(source.frequency==='once'&&validDate(source.startDate)){const datePart=Math.min(monthDays(bankMonth),Number(source.startDate.slice(-2)));return bankMonth+'-'+String(datePart).padStart(2,'0');}return bankMonth+'-'+String(Math.round(clamp(source.payDay,1,28,5))).padStart(2,'0')}
function scheduledIncome(month){return state.incomeSources.reduce((sum,source)=>sum+sourceReceipt(source,month),0)}

function uid(){return (globalThis.crypto?.randomUUID?.()||'id-'+Date.now()+'-'+Math.random().toString(16).slice(2))}
function money(n){return n===null||n===undefined||!Number.isFinite(Number(n))?'—':Math.round(n).toLocaleString('he-IL')+' ₪'}
function bankMoney(n){return n===null||n===undefined||!Number.isFinite(Number(n))?'—':Number(n).toLocaleString('he-IL',{minimumFractionDigits:2,maximumFractionDigits:2})+' ₪'}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function monthName(m){if(!validMonth(m))return m;const [y,mm]=m.split('-').map(Number);return new Intl.DateTimeFormat('he-IL',{year:'numeric',month:'long'}).format(new Date(y,mm-1,1))}
function addMonths(month,i){const [y,m]=month.split('-').map(Number);const d=new Date(y,m-1+i,1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`}
function todayISO(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function setting(id){return document.getElementById(id)}
// Migration for an older 'friend-clean' install hosted at the same origin.
// Cross-origin migration is impossible without an explicitly exported backup.
function migrateLegacyFriendDataOnSameOrigin(){
 try{
  if(localStorage.getItem(STORAGE_KEY)!==null)return false;
  const raw=localStorage.getItem(LEGACY_FRIEND_STORAGE_KEY);
  if(!raw)return false;
  const migrated=sanitize(JSON.parse(raw));
  localStorage.setItem(STORAGE_KEY,JSON.stringify(migrated));
  const previousKey=localStorage.getItem('maslul-gemini-api-key-friend-clean-v1');
  if(previousKey&&!localStorage.getItem('maslul-gemini-api-key-device-v1'))
   localStorage.setItem('maslul-gemini-api-key-device-v1',previousKey);
  return true;
 }catch(error){console.warn('Unable to migrate legacy on-device budget',error);return false;}
}
migrateLegacyFriendDataOnSameOrigin();
const HAS_PREEXISTING_BUDGET=(()=>{try{return localStorage.getItem(STORAGE_KEY)!==null}catch{return true}})();
const INTRO_KEY='maslul-first-run-walkthrough-v1';
const GEMINI_DEVICE_KEY='maslul-gemini-api-key-device-v1';
let state=safeLoad();syncCatalog();let currentPage='dashboard';let currentMonth=todayISO().slice(0,7);let forecastStart=validMonth(state.settings.planningStart)?state.settings.planningStart:currentMonth;let budgetMode='base';let expanded=new Set();let geminiKey=loadAIKey();let geminiRunning=false;let insightScope='month';let insightMonth=currentMonth;let insightPromptText='';let insightIncludeNotes=false;let toastTimer;
function loadAIKey(){try{return localStorage.getItem(GEMINI_DEVICE_KEY)||''}catch{return ''}}
function rememberAIKey(checked,entered){geminiKey=String(entered||'').trim();try{if(checked&&geminiKey)localStorage.setItem(GEMINI_DEVICE_KEY,geminiKey);else localStorage.removeItem(GEMINI_DEVICE_KEY)}catch{toast('לא ניתן לשמור את המפתח במכשיר.',true)}}
function removeAIKey(){geminiKey='';try{localStorage.removeItem(GEMINI_DEVICE_KEY)}catch{}renderInsights();toast('המפתח השמור נמחק מהמכשיר.')}
function persist(){projectedTxCache=null;if(typeof invalidateDecisionData==='function')invalidateDecisionData();try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));return true}catch(e){toast('לא ניתן לשמור במכשיר. נא לייצא גיבוי ולבדוק מקום פנוי.',true);console.error(e);return false}}
function toast(s,error=false){const e=setting('toast');e.textContent=s;e.style.background=error?'#983f4b':'';e.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>e.classList.remove('visible'),3500)}
// An installment plan describes a single principal, never an extra expense. All money is integer cents.
function addInstallmentMonths(date,offset){const m=addMonths(date.slice(0,7),offset);return m+'-'+String(Math.min(Number(date.slice(-2)),monthDays(m))).padStart(2,'0');}
function cleanInstallmentPlan(raw){
 if(!raw||raw.enabled!==true)return null;
 const count=Number(raw.count),startDate=String(raw.startDate||''),endDate=String(raw.endDate||'');
 if(!Number.isInteger(count)||count<2||count>120||!validDate(startDate)||!validDate(endDate)||endDate<startDate)return null;
 const equal=raw.equal!==false,annualInterest=equal?0:Number(raw.annualInterest||0);
 if(!Number.isFinite(annualInterest)||annualInterest<0||annualInterest>100)return null;
 const months=(Number(endDate.slice(0,4))-Number(startDate.slice(0,4)))*12+Number(endDate.slice(5,7))-Number(startDate.slice(5,7));
 if(months<count-1||months>240)return null; // one payment per month, 20 years at most
 return {enabled:true,count,startDate,endDate,equal,annualInterest};
}
function planDates(plan){
 const start=plan.startDate,end=plan.endDate,n=plan.count;
 if(n===2)return [start,end];
 const months=(Number(end.slice(0,4))-Number(start.slice(0,4)))*12+Number(end.slice(5,7))-Number(start.slice(5,7));
 const dates=[];for(let i=0;i<n;i++){
  if(i===0){dates.push(start);continue}if(i===n-1){dates.push(end);continue}
  const step=Math.round(months*i/(n-1));dates.push(addInstallmentMonths(start,step));
 }
 return dates;
}
function installmentRows(principal,plan){
 const p=cleanInstallmentPlan(plan);if(!p)return [];
 const cents=Math.round(Number(principal)*100);if(!Number.isSafeInteger(cents)||cents<0)return [];
 const dates=planDates(p),base=Math.floor(cents/p.count);let remain=cents;
 return dates.map((date,index)=>{
  const pc=index===p.count-1?remain:base;
  const interest=p.equal?0:Math.round(remain*(p.annualInterest/1200));
  remain-=pc;
  return {date,amount:(pc+interest)/100,principal:pc/100,interest:interest/100,index:index+1};
 });
}
function installmentTotal(principal,plan){return installmentRows(principal,plan).reduce((n,r)=>n+r.amount,0);}
function installmentForForm(fd){if(!fd.has('installmentEnabled'))return null;
 const plan=cleanInstallmentPlan({enabled:true,count:fd.get('installmentCount'),startDate:fd.get('installmentStart'),endDate:fd.get('installmentEnd'),equal:fd.has('installmentEqual'),annualInterest:fd.get('installmentInterest')});
 if(!plan)throw Error('פריסה לא תקינה: יש לבחור 2–120 תשלומים, חודש נפרד לכל תשלום, תאריכים תקינים וריבית שנתית 0–100%.');
 return plan;
}
function installmentFormHtml(plan=null,opts={}){
 const start=plan?.startDate||todayISO(),count=plan?.count||2,end=plan?.endDate||addInstallmentMonths(start,count-1),equal=plan?.equal!==false;
 return `<div class="installment-editor wide" data-installment-editor>
  <label class="checkline"><input type="checkbox" name="installmentEnabled" data-plan-toggle ${plan?'checked':''}> פריסה לתשלומים</label>
  <div data-installment-fields ${plan?'':'hidden'} class="installment-fields">
   <div class="form-grid"><label class="control"><span>מספר תשלומים</span><input name="installmentCount" type="number" min="2" max="120" step="1" value="${count}" data-plan-count></label>
   <label class="control"><span>תאריך התשלום הראשון</span><input name="installmentStart" type="date" value="${esc(start)}" data-plan-start></label>
   <label class="control"><span>תאריך התשלום האחרון</span><input name="installmentEnd" type="date" value="${esc(end)}" data-plan-end></label>
   <label class="checkline"><input type="checkbox" name="installmentEqual" data-plan-equal ${equal?'checked':''}> תשלומים שווים (ללא ריבית)</label>
   <label class="control" data-plan-interest-pane ${equal?'hidden':''}><span>ריבית שנתית (%) על יתרת הקרן</span><input name="installmentInterest" type="number" min="0" max="100" step="0.01" value="${plan?.annualInterest||0}"></label></div>
   <p class="tiny">בסכומים שווים הקרן מתחלקת ללא ריבית. כשמבטלים ״שווים״, הקרן מתחלקת שווה ונוספת בכל חודש ריבית על היתרה, כך שהתשלומים עשויים להיות שונים. שינוי מספר התשלומים מחשב מחדש את תאריך התשלום האחרון. ניתן לערוך ידנית תאריכים; הפריסה תוצג בחודשים שבין שני התאריכים, תשלום אחד בכל חודש.</p>
  </div></div>`;
}
function installmentsSummary(plan,amount){const rows=installmentRows(amount,plan);return rows.length?rows.map(x=>`${x.index}. ${x.date.split('-').reverse().join('/')} · ${money(x.amount)}${x.interest?' (ריבית '+money(x.interest)+')':''}`).join(' | '):'';}
let projectedTxCache=null;
function projectedTransactions(){
 if(projectedTxCache?.owner===state&&projectedTxCache.source===state.transactions)return projectedTxCache.rows;
 const rows=state.transactions.flatMap(t=>{
 const plan=t.type==='expense'&&(!t.sourceKind||t.sourceKind==='manual')?cleanInstallmentPlan(t.installments):null;
 return plan?installmentRows(t.amount,plan).map((x,i)=>({...t,id:t.id+'#'+i,date:x.date,amount:x.amount,dueDate:'',installmentIndex:i+1,installmentParentId:t.id})): [t];
 });
 projectedTxCache={owner:state,source:state.transactions,rows};return rows;
}

// The configured value (editable) is distinct from the amount applied to the selected month.
// In particular, a future start date must never zero the amount stored in a schedule.
function activeSchedule(id,month){return (state.itemSchedules[id]||[]).filter(e=>withinMonth(month,e.startDate,e.endDate)).sort((a,b)=>(b.startDate||'0000').localeCompare(a.startDate||'0000'))[0]||null;}
function editableSchedule(id,month){
 const entries=state.itemSchedules[id]||[];
 if(!entries.length)return null;
 const active=activeSchedule(id,month);if(active)return active;
 const start=month+'-01';
 const future=entries.filter(e=>!e.endDate||e.endDate>=start).sort((a,b)=>(a.startDate||'0000').localeCompare(b.startDate||'0000'));
 if(future.length)return future[0];
 return [...entries].sort((a,b)=>(b.endDate||'9999').localeCompare(a.endDate||'9999'))[0];
}
function editableItemAmount(month,id){
 if(state.itemInstallments?.[id])return Number(state.budget[id]??0);
 if(state.itemFrequency[id]?.frequency==='once')return Number(state.budget[id]??ITEM_BY_ID[id]?.base??0);
 if(budgetMode==='month'&&Object.prototype.hasOwnProperty.call(state.overrides[month]||{},id))return state.overrides[month][id];
 const schedule=editableSchedule(id,month);
 if(schedule)return Number(schedule.amount);
 return budgetMode==='base'?Number(state.budget[id]??ITEM_BY_ID[id]?.base??0):baseItem(month,id);
}
function writeBudgetAmount(month,id,amount){
 const val=clamp(amount,0,10000000,0);
 // A one-time expense has only one occurrence. Its amount is always edited directly.
 if(state.itemInstallments?.[id]||state.itemFrequency[id]?.frequency==='once'){state.budget[id]=val;return val;}
 if(budgetMode==='month'){state.overrides[month]??={};state.overrides[month][id]=val;}
 else{const schedule=state.itemFrequency[id]?.frequency==='once'?null:editableSchedule(id,month);if(schedule)schedule.amount=val;else state.budget[id]=val;}
 return val;
}
function baseItem(month,id){
 const plan=state.itemInstallments?.[id];if(plan)return installmentRows(state.budget[id]??0,plan).filter(r=>r.date.slice(0,7)===month).reduce((n,r)=>n+r.amount,0);
 // A one-time item contributes in its chosen month only, irrespective of any old periods.
 const pattern=state.itemFrequency[id];if(pattern?.frequency==='once'){
  return pattern.date.slice(0,7)===month?(state.budget[id]??0):0;
 }
 if(state.overrides[month]&&Object.prototype.hasOwnProperty.call(state.overrides[month],id))return state.overrides[month][id];
 const list=state.itemSchedules[id]||[];
 if(list.length){const e=activeSchedule(id,month);return e?(e.prorate?e.amount*activeFraction(month,e.startDate,e.endDate):e.amount):0;}
 return state.budget[id]??0;
}
// Payment settings are attached to stable item IDs; amounts and schedules remain unchanged.
const BANK_DEFAULT_IDS=new Set(['rent','vaad','arnona','water','electricity','alimony','afternoon','halves','michalsave']);
function creditCardById(cardId){return (state?.creditCards||[]).find(c=>c.id===cardId)||null;}
function defaultCardId(){return creditCardById(state?.defaultCardId)?.id||(state?.creditCards||[])[0]?.id||'';}
function resolvedCardId(payment){return creditCardById(payment?.cardId)?.id||defaultCardId();}
function cardLabel(cardId){const c=creditCardById(cardId);if(!c)return 'כרטיס אשראי (טרם הוגדר)';return (c.name||'כרטיס אשראי')+(c.last4?' · •••• '+c.last4:'');}
function creditCardOptions(selected=''){
 const cards=state.creditCards||[];if(!cards.length)return '<option value="">כרטיס ברירת מחדל (טרם הוגדר)</option>';
 const chosen=cards.some(c=>c.id===selected)?selected:defaultCardId();
 return cards.map(c=>`<option value="${esc(c.id)}" ${c.id===chosen?'selected':''}>${esc(cardLabel(c.id))}${c.id===defaultCardId()?' · ברירת מחדל':''}</option>`).join('');
}
function cleanPayment(x){const method=['card','bank','cash'].includes(x?.method)?x.method:'card';return {method,lag:method==='card'?Math.round(clamp(x?.lag,0,2,1)):0,day:Math.round(clamp(x?.day,1,31,method==='card'?2:1)),cardId:method==='card'?String(x?.cardId||'').slice(0,100):''};}
function defaultPaymentFor(id,sourceKind=''){return cleanPayment(sourceKind==='bank'||(sourceKind!=='card'&&sourceKind!=='current-card'&&BANK_DEFAULT_IDS.has(id))?{method:'bank',lag:0,day:1}:{method:'card',lag:1,day:2});}
function itemPayment(id){const pay=cleanPayment(state.itemPayments?.[id]||defaultPaymentFor(id));if(pay.method==='card')pay.cardId=resolvedCardId(pay);return pay;}
function paymentDate(date,payment){const p=cleanPayment(payment);if(p.method==='cash')return date;const m=addMonths(date.slice(0,7),p.method==='card'?1:p.lag);const c=p.method==='card'?creditCardById(resolvedCardId(p)):null;const desired=p.method==='card'?(c?.day||p.day):p.day;const day=Math.min(desired,monthDays(m));return m+'-'+String(day).padStart(2,'0');}
function paymentDescription(p){if(p.method==='card'){
 const c=creditCardById(resolvedCardId(p));return `${cardLabel(resolvedCardId(p))} · יורד ב־${c?.day||p.day} בחודש הבא`;
 }return p.method==='cash'?'מזומן · מיידי':`עו״ש / העברה · יום ${p.day} בחודש`;}
function cashExpenseEntries(month){
 const rows=[];const rowsInstallmentCash=rows;const effectiveTx=projectedTransactions();
 // Check purchase-month budgets and any unpaid card transactions. Only the due date hits the bank.
 for(let offset=0;offset<=2;offset++){
  const sourceMonth=addMonths(month,-offset);
  for(const item of ITEMS){
   const plan=state.itemInstallments?.[item.id];
   if(plan){const pay=itemPayment(item.id);
    const rows=installmentRows(state.budget[item.id]??0,plan).filter(r=>r.date.slice(0,7)===sourceMonth);
    const recorded=effectiveTx.filter(t=>t.type==='expense'&&t.itemId===item.id&&t.date.slice(0,7)===sourceMonth&&cleanPayment(t.payment||pay).method==='card').reduce((n,t)=>n+t.amount,0);
    let remainingRecorded=recorded;
    for(const x of rows){const due=pay.method==='card'?paymentDate(x.date,pay):x.date;
     const planned=Math.max(0,x.amount-Math.min(x.amount,remainingRecorded));remainingRecorded=Math.max(0,remainingRecorded-x.amount);
     if(due.slice(0,7)===month&&planned>0)rowsInstallmentCash.push({date:due,label:item.name+' · תשלום '+x.index+'/'+plan.count,amount:planned,kind:pay.method==='card'?'planned-card':'regular',itemId:item.id,category:CATEGORIES.find(c=>c.items.some(i=>i.id===item.id))?.name||'אחר',sourceMonth});
    }
    continue;
   }
   const pay=itemPayment(item.id),pattern=state.itemFrequency[item.id],purchaseDate=pattern?.frequency==='once'?pattern.date:sourceMonth+'-01',billDate=pattern?.frequency==='once'&&pay.method!=='card'?purchaseDate:paymentDate(purchaseDate,pay);
   const budgeted=baseItem(sourceMonth,item.id);
   const cardTransactions=effectiveTx.filter(t=>t.type==='expense'&&t.itemId===item.id&&t.date.slice(0,7)===sourceMonth&&['card','current-card','manual'].includes(t.sourceKind)&&cleanPayment(t.payment||pay).method==='card');
   const cardActual=cardTransactions.reduce((sum,t)=>sum+t.amount,0);
   const category=CATEGORIES.find(c=>c.items.some(i=>i.id===item.id))?.name||'אחר';
   if(pay.method==='card'){
    // Recorded charges keep their own dates; only the unobserved part of the plan remains an estimate.
    const unobserved=Math.max(0,budgeted-cardActual);
    if(unobserved>0&&billDate.slice(0,7)===month)rows.push({date:billDate,label:item.name+' · יתרת התקציב'+(sourceMonth!==month?' · '+monthName(sourceMonth):''),amount:unobserved,kind:'planned-card',itemId:item.id,category,sourceMonth});
    for(const t of cardTransactions){const due=validDate(t.dueDate)?t.dueDate:paymentDate(t.date,t.payment||pay);if(due.slice(0,7)===month)rows.push({date:due,label:item.name+' · '+cardLabel(resolvedCardId(t.payment||pay))+' · '+(t.note||'עסקה באשראי'),amount:t.amount,kind:'recorded-card',itemId:item.id,category,sourceMonth});}
   }else if(billDate.slice(0,7)===month&&budgeted>0){
    rows.push({date:billDate,label:item.name,amount:budgeted,kind:'regular',itemId:item.id,category,sourceMonth});
   }
  }
  // Uncategorised card purchases, and card purchases using a different payment rule, remain visible.
  const otherCard=effectiveTx.filter(t=>t.type==='expense'&&t.date.slice(0,7)===sourceMonth&&['card','current-card','manual'].includes(t.sourceKind)&&(!ITEM_BY_ID[t.itemId]||t.itemId==='other'||itemPayment(t.itemId).method!=='card')&&cleanPayment(t.payment||defaultPaymentFor(t.itemId,t.sourceKind)).method==='card');
  for(const t of otherCard){const due=validDate(t.dueDate)?t.dueDate:paymentDate(t.date,t.payment||defaultPaymentFor(t.itemId,t.sourceKind));if(due.slice(0,7)===month)rows.push({date:due,label:cardLabel(resolvedCardId(t.payment))+' · '+(t.note||'קנייה באשראי · לא מסווג'),amount:t.amount,kind:'actual-card'});}
  const refunds=effectiveTx.filter(t=>t.type==='income'&&t.date.slice(0,7)===sourceMonth&&['card','current-card','manual'].includes(t.sourceKind)&&cleanPayment(t.payment||{method:'card',lag:1,day:2}).method==='card');
  for(const t of refunds){const due=validDate(t.dueDate)?t.dueDate:paymentDate(t.date,t.payment||{method:'card',lag:1,day:2});if(due.slice(0,7)===month)rows.push({date:due,label:'זיכוי ב־'+cardLabel(resolvedCardId(t.payment))+' · '+(t.note||'החזר'),amount:-t.amount,kind:'card-refund'});}
  for(const event of eventsFor(sourceMonth).filter(e=>e.type==='expense')){
   const p=cleanPayment(event.payment);const date=validDate(event.date)?event.date:(validDate(event.startDate)?event.startDate:sourceMonth+'-01');const due=p.method==='card'?paymentDate(date,p):date;
   if(due.slice(0,7)===month)rows.push({date:due,label:event.title+(sourceMonth!==month?' · '+monthName(sourceMonth):''),amount:event.amount,kind:'special'});
  }
 }
 return rows.sort((a,b)=>a.date.localeCompare(b.date)||a.label.localeCompare(b.label));
}
function futureCashExpense(month,asOf){return cashExpenseEntries(month).filter(x=>x.date>asOf).reduce((sum,x)=>sum+x.amount,0)}

function incomeFor(month){const legacy=state.overrides[month]?.income;return legacy!==undefined?legacy:scheduledIncome(month)}
function isSplitEvent(e){return !!e.splitMode||(Array.isArray(e.parts)&&e.parts.length>0)}
function eventPartsTotal(e){return (e.parts||[]).reduce((sum,x)=>sum+Number(x.amount||0),0)}
function eventsFor(month){return state.events.flatMap(e=>{
 if(e.installments&&e.type==='expense')return installmentRows(e.amount,e.installments).filter(r=>r.date.slice(0,7)===month).map(r=>({...e,amount:r.amount,month,date:r.date,title:e.title+' · תשלום '+r.index+'/'+e.installments.count}));
 if(isSplitEvent(e))return (e.parts||[]).flatMap(part=>{
  const plan=part.installments;
  if(plan&&e.type==='expense')return installmentRows(part.amount,plan).filter(r=>r.date.slice(0,7)===month).map(r=>({...e,title:e.title+' · '+part.title+' · תשלום '+r.index+'/'+plan.count,amount:r.amount,month,date:r.date,payment:part.payment||e.payment,partId:part.id}));
  return part.date.slice(0,7)===month?[{...e,title:e.title+' · '+part.title,amount:part.amount,month,date:part.date,payment:part.payment||e.payment,partId:part.id}]:[];
 });
 const start=e.startDate||e.month+'-01',end=e.endDate||(e.endMonth?e.endMonth+'-'+String(monthDays(e.endMonth)).padStart(2,'0'):'');
 return (e.recurrence==='monthly'?withinMonth(month,start,end):e.month===month)?[e]:[];
})}
function sumBudget(month){return ITEMS.reduce((s,i)=>s+baseItem(month,i.id),0)}
function sumEvent(month,type){return eventsFor(month).filter(e=>e.type===type).reduce((s,e)=>s+e.amount,0)}
function payslipReceipts(month){return (state.payslips||[]).filter(p=>p.payDate.slice(0,7)===month)}
function scheduledAfterPayslips(month,kind){const receipts=payslipReceipts(month);
 const sources=state.incomeSources.filter(s=>s.kind===kind).reduce((sum,s)=>{
  const matches=receipts.filter(p=>p.sourceId===s.id);
  return sum+(matches.length?matches.reduce((v,p)=>v+p.netPay,0):sourceReceipt(s,month));
 },0);
 return sources+(kind==='salary'?receipts.filter(p=>!p.sourceId||!state.incomeSources.some(s=>s.id===p.sourceId)).reduce((v,p)=>v+p.netPay,0):0);
}
function projection(month){
 const salaries=scheduledAfterPayslips(month,'salary');
 const otherIncome=scheduledAfterPayslips(month,'other');
 const planned=state.overrides[month]?.income;
 const recurringIncome=planned!==undefined?planned:salaries+otherIncome;
 const extraIncome=sumEvent(month,'income'),regularExpenses=sumBudget(month),extraExpense=sumEvent(month,'expense');
 const income=recurringIncome+extraIncome,plannedExpenses=regularExpenses+extraExpense;
 // Approved statements contribute to actuals. Never add actual spending *on top* of the full budget:
 // the larger of the planned amount and spending seen so far is a conservative estimate.
 const recordedExpenses=projectedTransactions().filter(t=>t.date.slice(0,7)===month&&t.type==='expense').reduce((s,t)=>s+t.amount,0);
 let allocated=cashExpenseEntries(month).reduce((sum,x)=>sum+x.amount,0);
 let cashIncome=income,bankActual=false;
 const b=state.bankBalance;
 if(b?.asOf?.startsWith(month)){
  const movements=bankMonthMovements(month,b.asOf);
  if(movements){
   cashIncome=movements.reduce((sum,x)=>sum+Math.max(0,x.amount),0)+futureIncomePortion(month,b.asOf);
   allocated=movements.reduce((sum,x)=>sum+Math.max(0,-x.amount),0)+futureCashExpense(month,b.asOf);
   bankActual=true;
  }
 }
 const saving=baseItem(month,'michalsave');
 return {month,income:cashIncome,salary:salaries,extraIncome:extraIncome+otherIncome,regularExpenses,extraExpense,plannedExpenses,recordedExpenses,allocated,saving,spending:allocated,net:cashIncome-allocated,totalSaving:cashIncome-allocated,bankActual};
}
function eventEffectiveDate(event,month){return validDate(event.date)?event.date:(validDate(event.startDate)?event.startDate:'')}
// Estimate remaining cash in the month containing the most recent bank statement:
// a salary already credited before the statement date is NOT counted again.
function futureIncomePortion(month,asOf){
 const remaining=(monthDays(month)-Number(asOf.slice(-2)))/monthDays(month);
 let regular=state.overrides[month]?.income;
 if(regular!==undefined)regular*=remaining;
 else {const slips=payslipReceipts(month);regular=state.incomeSources.reduce((sum,s)=>{const matched=slips.filter(p=>p.sourceId===s.id);return sum+(matched.length?matched.filter(p=>p.payDate>asOf).reduce((v,p)=>v+p.netPay,0):(sourceReceiptDate(s,month)>asOf?sourceReceipt(s,month):0));},0)+slips.filter(p=>(!p.sourceId||!state.incomeSources.some(x=>x.id===p.sourceId))&&p.payDate>asOf).reduce((v,p)=>v+p.netPay,0);}
 const specials=eventsFor(month).filter(e=>e.type==='income').reduce((sum,e)=>{
  const date=eventEffectiveDate(e,month);
  return sum+(date?(date>asOf?e.amount:0):e.amount*remaining);
 },0);
 return regular+specials;
}
function futureExpensePortion(month,asOf){
 const remaining=(monthDays(month)-Number(asOf.slice(-2)))/monthDays(month);
 const specials=eventsFor(month).filter(e=>e.type==='expense').reduce((sum,e)=>{
  const date=eventEffectiveDate(e,month);
  return sum+(date?(date>asOf?e.amount:0):e.amount*remaining);
 },0);
 return sumBudget(month)*remaining+specials;
}
function projectedBalance(month){return monthlyBalance(month).closing;}
function statementStartBalance(month){const rows=(state.bankLedger||[]).filter(x=>x.date.startsWith(month)).slice().sort((a,b)=>a.date.localeCompare(b.date));if(!rows.length)return null;
 const firstDate=rows[0].date;
 if(!firstDate.endsWith('-01'))return null;
 // This is a recorded balance AFTER a first-of-month transaction, not necessarily midnight opening.
 return rows.find(x=>x.date===firstDate)?.balance??null;
}
function bankMonthMovements(month,asOf){
 const opening=statementStartBalance(month);
 if(opening===null)return null;
 const list=(state.bankLedger||[]).filter(x=>x.date.startsWith(month)&&x.date<=asOf).slice().sort((a,b)=>a.date.localeCompare(b.date));
 const first=list.find(x=>x.date.endsWith('-01')&&Math.abs(x.balance-opening)<.011);
 if(!first)return null;
 const rest=list.filter(x=>x!==first),ordered=[];let running=first.balance,lastDate=first.date;
 while(rest.length){const index=rest.findIndex(x=>x.date>=lastDate&&Math.abs((x.balance-x.amount)-running)<.011);
  if(index<0)break;
  const row=rest.splice(index,1)[0];ordered.push(row);running=row.balance;lastDate=row.date;
 }
 const latest=state.bankBalance?.asOf===asOf?Number(state.bankBalance.amount):null;
 if(rest.length||latest!==null&&Math.abs(running-latest)>.011)return null;
 return ordered;
}

function monthlyBalance(month){
 const p=projection(month);if(!validMonth(month))return {month,opening:null,closing:null,delta:0,source:'none'};
 const b=state.bankBalance,bMonth=b&&validDate(b.asOf)?b.asOf.slice(0,7):null;
 if(bMonth&&month>=bMonth){
  // A manually entered opening for a later month is an explicit override; never override the bank month itself.
  const laterManual=Object.entries(state.openingBalances||{}).filter(([m,v])=>validMonth(m)&&m>bMonth&&m<=month&&Number.isFinite(Number(v))).sort((a,b)=>b[0].localeCompare(a[0]));
  if(laterManual.length){let opening=Number(laterManual[0][1]);for(let m=laterManual[0][0];m<month;m=addMonths(m,1))opening+=projection(m).net;return {month,opening,closing:opening+p.net,delta:p.net,source:'manual',anchorMonth:laterManual[0][0]};}
  // The latest bank snapshot includes every movement through asOf, including card settlement debits.
  // Do not subtract any purchased items whose settlement date was on/before the statement date.
  const futureIncome=futureIncomePortion(bMonth,b.asOf);
  const futureExpenses=futureCashExpense(bMonth,b.asOf);
  let closing=b.amount+futureIncome-futureExpenses;
  const openingInStatement=statementStartBalance(bMonth);
  const bOpen=openingInStatement!==null?openingInStatement:(Object.prototype.hasOwnProperty.call(state.openingBalances,bMonth)?Number(state.openingBalances[bMonth]):null);
  if(month===bMonth)return {month,opening:bOpen,closing,delta:closing-(bOpen??b.amount),source:'bank',asOf:b.asOf,bankAmount:b.amount,bankOpeningRecorded:openingInStatement};
  let opening=closing;
  for(let m=addMonths(bMonth,1);m<=month;m=addMonths(m,1)){
   const val=projection(m).net;
   const next=opening+val;
   if(m===month)return {month,opening,closing:next,delta:val,source:'bank-forward',asOf:b.asOf,anchorMonth:bMonth};
   opening=next;
  }
 }
 const starts=Object.entries(state.openingBalances||{}).filter(([m,v])=>validMonth(m)&&m<=month&&Number.isFinite(Number(v))).sort((a,b)=>b[0].localeCompare(a[0]));
 if(!starts.length)return {month,opening:null,closing:null,delta:p.net,source:'none'};
 let opening=Number(starts[0][1]);for(let m=starts[0][0];m<month;m=addMonths(m,1))opening+=projection(m).net;
 return {month,opening,closing:opening+p.net,delta:p.net,source:'manual',anchorMonth:starts[0][0]};
}
function balanceLabel(balance){return balance.source==='manual'?'יתרת פתיחה שהוגדרה ידנית':balance.source==='bank'?'יתרה לפי תדפיס העו״ש האחרון ופעולות עתידיות':'לא הוגדרה יתרת פתיחה';}
function openingBalanceModal(month=currentMonth){const val=Object.prototype.hasOwnProperty.call(state.openingBalances||{},month)?state.openingBalances[month]:monthlyBalance(month).opening;
 openModal('יתרת פתיחה · '+monthName(month),`<p class="note">יתרת פתיחה היא הסכום שהיה בחשבון ב־1 בחודש. היתרה מהתדפיס האחרון קובעת את התחזית מהתאריך שלו והלאה. יתרת פתיחה מתדפיס עשויה להיות אחרי פעולה ב־1 בחודש ולא לפני תחילת היום. הזן סכום מדויק אם הוא ידוע לך, והתחזית מהחודש הזה ואילך תתעדכן.</p><label class="control"><span class="control-label">יתרה בתחילת ${esc(monthName(month))} ₪ (אפשר גם מינוס)</span><input type="number" name="opening" step="0.01" required value="${Number.isFinite(val)?val:''}" placeholder="יתרת החשבון ב־1 בחודש"></label>`,(fd,d)=>{const value=Number(fd.get('opening'));if(String(fd.get('opening')).trim()===''||!Number.isFinite(value)||Math.abs(value)>1e9){toast('יש להזין יתרה תקינה.',true);return;}state.openingBalances[month]=Math.round(value*100)/100;persist();d.close();render();toast('יתרת הפתיחה נשמרה.');});
}

function actual(month){const entries=projectedTransactions().filter(t=>t.date.startsWith(month));const expenses=entries.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);const income=entries.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);return {expenses,income,count:entries.length,entries};}
function setBudget(id,n){writeBudgetAmount(currentMonth,id,n);persist();render();}
function setIncome(n){const val=clamp(n,0,10000000,0);if(budgetMode==='base')state.income=val;else{state.overrides[currentMonth]??={};state.overrides[currentMonth].income=val;}persist();render()}
function resetItem(id){if(budgetMode==='base')writeBudgetAmount(currentMonth,id,state.starterBudget?.[id]??ITEM_BY_ID[id].base);else if(state.overrides[currentMonth])delete state.overrides[currentMonth][id];persist();render()}
const headings={dashboard:['בית','התמונה הכספית שלי','תוכנית מול ביצוע, חיסכון ומעקב.'],budget:['בניית התקציב','כל שקל במקום שלו','פתח קטגוריה והזן סכום לכל הוצאה.'],imports:['ייבוא מסמכים','ייבוא ועדכון נתונים','ייבוא תדפיסי עו״ש, כרטיסי אשראי ותלושי שכר.'],events:['הוצאות מיוחדות','הוצאות מיוחדות','חופשות, בונוסים, רכישות גדולות וכל מה שאינו קבוע.'],forecast:['מבט קדימה','תחזית חודשים קדימה','תחזית חודש בחודשו, כולל תשלומים ואירועים עתידיים.'],insights:['תמונה חכמה','תובנות','מה השתנה, מה חשוב ומה אפשר לשפר?'],settings:['התאמה אישית','הגדרות וגיבוי','המידע נשמר במכשיר שלך בלבד — דאג לגיבוי.']};
const pageVisitHistory=[];
let historyNavigation=false;
function goBackPage(){
 if(!pageVisitHistory.length)return;
 const previous=pageVisitHistory.pop();historyNavigation=true;
 navigate(previous);historyNavigation=false;
}
function updateBackButton(){const b=setting('headerBack');if(!b)return;b.disabled=pageVisitHistory.length===0;b.title=b.disabled?'אין עמוד קודם':'חזור לעמוד הקודם';}
function navigate(page){if(page==='statistics')page='insights';if(!headings[page])return;
 if(page!==currentPage&&!historyNavigation&&headings[currentPage]){pageVisitHistory.push(currentPage);if(pageVisitHistory.length>80)pageVisitHistory.shift();}
 updateBackButton();
 // Each visit to the budget page begins with all category drawers collapsed.
 if(page==='budget'&&currentPage!=='budget')expanded.clear();
 currentPage=page;document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.nav===page));document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id==='page'+page[0].toUpperCase()+page.slice(1)));const [eyebrow,title,desc]=headings[page];setting('pageEyebrow').textContent=eyebrow;setting('pageTitle').textContent=title;setting('pageSubtitle').textContent=desc;setting('monthWrap').hidden=page==='forecast'||page==='settings'||page==='insights';renderActivePage(page);window.scrollTo({top:0,behavior:'instant'});}
// Fast navigation: a page transition should NEVER repaint inactive screens.
function renderActivePage(page){
 switch(page){
  case 'imports':if(typeof renderImportPage==='function')renderImportPage();break;
  case 'dashboard':renderDashboard();break;
  case 'budget':renderBudget();break;
  case 'events':renderEvents();break;
  case 'forecast':renderForecast();break;
  case 'insights':renderInsights();break;
  case 'settings':renderSettings();break;
 }
}
// Data mutations refresh all dependent pages, preserving compatibility with import hooks.
function render(){renderDashboard();renderBudget();renderEvents();renderForecast();renderInsights();renderSettings();}
function cardMetric(label,value,foot,cl='',action=''){return action?`<button type="button" class="card stat ${cl} clickable-metric summary-tile" data-action="${esc(action)}" aria-label="${esc(label)} — לחץ לפירוט"><div class="stat-label">${esc(label)}</div><div class="stat-value money">${money(value)}</div><div class="stat-foot">${esc(foot)}</div></button>`:`<article class="card stat ${cl}"><div class="stat-label">${esc(label)}</div><div class="stat-value money">${money(value)}</div><div class="stat-foot">${esc(foot)}</div></article>`}
function budgetByCategory(month){return CATEGORIES.map(c=>({...c,total:c.items.reduce((s,i)=>s+baseItem(month,i.id),0)}))}
function drawBars(month){const list=budgetByCategory(month);const max=Math.max(...list.map(c=>c.total),1);return `<div class="chart-list">${list.sort((a,b)=>b.total-a.total).map(c=>`<div class="chart-item"><div class="chart-item-head"><span class="chart-item-name">${esc(c.name)}</span><span class="money">${money(c.total)}</span></div><div class="chartbar"><div style="width:${(100*c.total/max).toFixed(2)}%"></div></div></div>`).join('')}</div>`}
function eventMini(month){const list=eventsFor(month);return list.length?list.slice(0,4).map(e=>`<div class="metric-mini"><span>${esc(e.title)} <span class="tag ${e.type==='income'?'green':'amber'}">${e.type==='income'?'הכנסה':'הוצאה'}</span></span><strong class="money">${money(e.amount)}</strong></div>`).join(''):`<div class="emptyline">אין אירועים מיוחדים בחודש הזה.</div>`}
function renderDashboard(){const emptyStart=state.incomeSources.length===0&&sumBudget(currentMonth)===0;const p=projection(currentMonth),a=actual(currentMonth),percent=Math.min(100,p.spending>0?100*a.expenses/p.spending:0);const next=Array.from({length:3},(_,i)=>projection(addMonths(currentMonth,i+1)));setting('pageDashboard').innerHTML=`
 ${emptyStart?'<div class="note warning" style="margin-bottom:16px">התקציב עדיין ריק. אם קיבלת קובץ הגדרות אישי, עבור להגדרות ושחזר אותו באמצעות "שחזור מקובץ גיבוי".</div>':''}
 <div class="grid three dashboard-summary"><button type="button" class="card stat primary clickable-metric summary-tile" data-action="income-hub" aria-label="הכנסות מתוכננות — לחץ לניהול משכורות והכנסות"><div class="stat-label">הכנסות</div><div class="stat-value money">${money(p.income)}</div><div class="stat-foot">פירוט והוספה ←</div></button>${cardMetric('הוצאות',p.allocated,'פירוט וצפייה ←','','open-expenses')}${cardMetric('יתרה',monthlyBalance(currentMonth).closing,'פתיחה + הכנסות − הוצאות ←',monthlyBalance(currentMonth).closing===null?'warning':monthlyBalance(currentMonth).closing>=0?'success':'warning','balance-breakdown')}</div>
 ${state.bankBalance?`<section class="card balance-banner"><div class="row wrap"><div><div class="subtle">יתרת עו״ש לפי התדפיס האחרון · v${APP_BUILD}</div><div class="stat-value money ${state.bankBalance.amount<0?'red-text':'green-text'}" style="font-size:29px;font-weight:800">${bankMoney(state.bankBalance.amount)}</div><div class="tiny">נכון ל־${esc(state.bankBalance.asOf.split('-').reverse().join('/'))} · לא יתרה בזמן אמת</div></div><button class="btn secondary small" data-navto="imports">עדכון מהבנק</button></div></section>`:`<section class="card balance-banner"><div class="row wrap"><div><strong>יתרת עו״ש · v${APP_BUILD}</strong><div class="subtle">עדיין לא נקלטה יתרה מתדפיס הבנק. ניתן לייבא אותו כדי להציג אותה כאן.</div></div><button class="btn secondary small" data-navto="imports">ייבוא עו״ש</button></div></section>`}
 <div class="two-panels" style="margin-top:16px"><section class="card"><div class="row"><h2>מה נרשם בפועל?</h2><span class="tag blue">${esc(monthName(currentMonth))}</span></div><div class="grid two"><div><div class="subtle">הוצאות שנרשמו לפי מועד העסקה</div><div class="stat-value money" style="font-size:27px;font-weight:800">${money(a.expenses)}</div></div><div><div class="subtle">הוצאות צפויות לרדת מהעו״ש החודש</div><div class="stat-value money" style="font-size:27px;font-weight:800">${money(p.spending)}</div></div></div><div class="separator"></div><div class="progress"><span style="width:${percent.toFixed(2)}%;background:${a.expenses>p.spending?'#c45154':'#3e8aaf'}"></span></div><div class="row" style="margin:8px 0 16px"><span class="subtle">${a.count} פעולות רשומות · ${Math.round(percent)}% מהתקציב</span><span class="money ${a.expenses>p.spending?'red-text':''}">${money(p.spending-a.expenses)} נותרו</span></div><div class="note">הוצאות בפועל כוללות רק פעולות שהזנת או שנקלטו מתדפיסים. היעדר רישום אינו מעיד שלא הוצאת כסף.</div><div class="button-row" style="margin-top:13px"><button class="btn primary small" data-action="new-transaction">+ הוסף הוצאה</button><button class="btn secondary small" data-action="transactions-log">תנועות שנרשמו</button></div></section>
 <section class="card"><div class="row"><h2>הוצאות מיוחדות מתוכננות</h2><button class="btn secondary small" data-navto="events">הצג הכול</button></div>${eventMini(currentMonth)}<div class="separator"></div><div class="row"><span class="muted">הוצאות חד־פעמיות לחודש</span><strong class="money">${money(p.extraExpense)}</strong></div><div class="row" style="margin-top:8px"><span class="muted">הכנסות נוספות</span><strong class="money">${money(p.extraIncome)}</strong></div><button class="btn ghost small" style="margin-top:15px" data-action="new-event">+ הוספת הוצאה מיוחדת או הכנסה</button></section></div>
 <div class="two-panels" style="margin-top:16px"><section class="card"><div class="row"><h2>לאן הולך התקציב?</h2><button class="btn secondary small" data-navto="budget">עריכה</button></div>${drawBars(currentMonth)}</section><section class="card"><h2>שלושת החודשים הבאים</h2>${next.map(m=>`<div class="metric-mini"><div><strong>${monthName(m.month)}</strong><div class="subtle">הכנסות: ${money(m.income)} · הוצאות: ${money(m.allocated)}</div><div class="subtle">יתרת פתיחה: ${monthlyBalance(m.month).opening===null?'לא הוגדרה':money(monthlyBalance(m.month).opening)}</div></div><strong class="money ${m.net<0?'red-text':'green-text'}">${monthlyBalance(m.month).closing===null?'—':money(monthlyBalance(m.month).closing)}</strong></div>`).join('')}<div class="note" style="margin-top:15px">היתרה מתבססת על הדוח האחרון ועל מועדי חיוב עתידיים. חיוב אשראי נספר בחודש שבו הכסף יורד מהעו״ש, ולא בחודש ביצוע הקנייה. זו תחזית ולא יתרה בזמן אמת.</div><button class="btn ghost small" style="margin-top:14px" data-navto="forecast">תחזית ל־12 חודשים ←</button></section></div><p class="footer-mini">אפליקציית מסלול – תכנון תקציב · גרסה v${APP_BUILD} · הנתונים נשמרים בדפדפן המקומי שלך בלבד</p>`}
function renderBudget(){const p=projection(currentMonth);const income=incomeFor(currentMonth);setting('pageBudget').innerHTML=`<section class="card" style="margin-bottom:15px"><div class="row wrap"><div><h2 style="margin-bottom:4px">איך לערוך את התקציב?</h2><div class="subtle">שינוי בסיס קבוע משפיע על כל החודשים; שינוי חודשי משפיע רק על ${monthName(currentMonth)}.</div></div><div class="segment"><button data-budgetmode="base" class="${budgetMode==='base'?'selected':''}">תקציב קבוע</button><button data-budgetmode="month" class="${budgetMode==='month'?'selected':''}">רק החודש</button></div></div><div class="separator"></div><div class="row wrap"><div><strong>הכנסות מתוכננות לחודש:</strong> <span class="money">${money(p.income)}</span><div class="subtle">אפשר להוסיף כמה משכורות עם תאריכי התחלה וסיום, ולשנות הכנסה בסליידר או בהקלדה.</div></div><button type="button" class="btn primary" data-action="income-hub">נהל הכנסות ומשכורות</button></div></section>
 <div class="budget-controls"><div class="row"><span class="tag blue">${CATEGORIES.length} קטגוריות</span><span class="tag">${ITEMS.length} פריטי הוצאה</span></div><div class="button-row"><button class="btn ghost small" data-action="expand-all">פתח הכול</button><button class="btn ghost small" data-action="collapse-all">סגור הכול</button><button class="btn primary small" data-action="add-category">+ קטגוריה</button></div></div>
 ${CATEGORIES.map(c=>{const applied=c.items.reduce((s,i)=>s+baseItem(currentMonth,i.id),0),sum=budgetMode==='base'?c.items.reduce((s,i)=>s+editableItemAmount(currentMonth,i.id),0):applied;return `<section class="category"><button class="cat-header ${expanded.has(c.id)?'open':''}" data-togglecat="${c.id}" aria-expanded="${expanded.has(c.id)}"><span class="cat-heading"><span class="cat-symbol">${c.icon}</span><span><span class="cat-title">${esc(c.name)}</span><br><span class="cat-count">${c.items.length} פריטי הוצאה · ${expanded.has(c.id)?'סגור פירוט':'פתח פירוט'}</span><br><span class="tiny">${budgetMode==='base'&&Math.abs(sum-applied)>0.005?'בחודש הנבחר: '+money(applied)+' · מוצג הסכום שהוגדר לכל פריט':'חל בחודש הנבחר'}</span></span></span><span class="row start"><strong class="money" data-cat-total="${c.id}">${money(sum)}</strong><span aria-hidden="true">${expanded.has(c.id)?'⌃':'⌄'}</span></span></button>${expanded.has(c.id)?`<div class="cat-items"><div class="button-row catalog-toolbar"><button type="button" class="btn secondary small" data-additem="${esc(c.id)}">+ פריט הוצאה</button><button type="button" class="btn ghost small" data-editcat="${esc(c.id)}">שנה שם קטגוריה</button><button type="button" class="btn ghost small important" data-delcat="${esc(c.id)}">מחק קטגוריה</button></div>${c.items.map(i=>{const value=editableItemAmount(currentMonth,i.id),effective=baseItem(currentMonth,i.id),scheduled=editableSchedule(i.id,currentMonth),once=state.itemFrequency[i.id]?.frequency==='once',onceDate=state.itemFrequency[i.id]?.date||'',changed=budgetMode==='base'?!scheduled&&value!==i.base:Object.prototype.hasOwnProperty.call(state.overrides[currentMonth]||{},i.id);return `<div class="expense-row"><div class="expense-top"><div><div class="expense-name">${esc(i.name)}</div><div class="tiny">${once?'חד־פעמית · '+esc(onceDate.split('-').reverse().join('/')):'חוזרת'+((state.itemSchedules[i.id]||[]).length?' · '+(state.itemSchedules[i.id]||[]).length+' תקופות':' · ללא הגבלת תאריכים')}</div>${state.itemInstallments?.[i.id]?`<div class="tiny">פריסה: ${state.itemInstallments[i.id].count} תשלומים · סך כולל ריבית: ${money(installmentTotal(state.budget[i.id]||0,state.itemInstallments[i.id]))}</div>`:''}${!once&&scheduled?`<div class="tiny">${budgetMode==='month'&&Object.prototype.hasOwnProperty.call(state.overrides[currentMonth]||{},i.id)?'התאמה לחודש זה':`עורך תקופה: ${esc(periodText(scheduled.startDate,scheduled.endDate))}`}</div>`:''}${effective!==value?`<div class="tiny">חל ב־${monthName(currentMonth)}: <strong>${money(effective)}</strong> (הסכום המוגדר נשמר)</div>`:''}<div class="tiny payment-inline">${esc(paymentDescription(itemPayment(i.id)))}</div><div class="catalog-item-actions"><button type="button" class="mini-action" data-edititem="${esc(i.id)}" aria-label="עריכת פריט הוצאה ${esc(i.name)}">✎ ערוך</button>${once?'':`<button type="button" class="mini-action" data-itemperiod="${esc(i.id)}">◷ תקופות</button>`}<button type="button" class="mini-action" data-itempayment="${esc(i.id)}">◉ חיוב</button>${['rent','michalsave'].includes(i.id)?'':`<button type="button" class="mini-action important" data-delitem="${esc(i.id)}" aria-label="מחק פריט הוצאה ${esc(i.name)}">✕ מחק</button>`}</div>${changed?`<div class="tiny">${budgetMode==='base'?`ברירת מחדל: ${money(i.base)}`:'הוגדר שינוי לחודש זה'}</div>`:''}</div><div class="expense-right"><label class="tiny" for="amount-${esc(i.id)}">סכום ₪</label><input id="amount-${esc(i.id)}" class="expense-value" data-amountinput="${esc(i.id)}" type="text" inputmode="decimal" autocomplete="off" dir="ltr" value="${value}" aria-label="סכום ${esc(i.name)} בשקלים">${changed?`<button class="mini-action" data-resetitem="${esc(i.id)}" title="איפוס פריט הוצאה" aria-label="איפוס פריט הוצאה">↶</button>`:''}</div></div></div>`}).join('')}<div class="category-footer"><span>סה״כ ${esc(c.name)}</span><strong class="money" data-cat-footer="${c.id}">${money(sum)}</strong></div></div>`:''}</section>`}).join('')}
 <section class="card" style="margin-top:17px"><div class="grid two"><div><div class="subtle">חיובים צפויים בעו״ש לחודש זה</div><div data-budget-total class="money" style="font-size:20px">${money(p.allocated)}</div></div><div><div class="subtle">שינוי בתקציב החודשי</div><div data-budget-saving class="money ${p.net>=0?'green-text':'red-text'}" style="font-size:20px">${money(p.net)}</div></div></div><div class="separator"></div><div class="button-row"><button class="btn primary" data-action="export">הורד גיבוי</button>${budgetMode==='month'?'<button class="btn ghost" data-action="clear-month">נקה התאמות לחודש</button>':'<button class="btn ghost" data-action="reset-baseline">אפס את כל תקציב הבסיס</button>'}</div></section>`}
function renderEvents(){
 const items=[...state.events].sort((a,b)=>a.month.localeCompare(b.month));
 setting('pageEvents').innerHTML=`<section class="card"><div class="row wrap"><div><h2 style="margin:0 0 4px">הוצאות מיוחדות</h2><p class="subtle" style="margin:0">חופשות, רכישות מיוחדות, חופשות, בונוסים והכנסות חריגות.</p></div><button class="btn primary" data-action="new-event">+ הוצאה / הכנסה מיוחדת חדשה</button></div>
 <div class="note" style="margin:17px 0">הוצאה מיוחדת יכולה לכלול רכיבים ידניים בתאריכים שונים או פריסת תשלומים אוטומטית. בחישוב החודשי נכללים הרכיבים או התשלומים בלבד, ולא בנוסף הסכום הכולל.</div>
 ${items.length?items.map(e=>{
  const split=isSplitEvent(e),partPlan=cleanInstallmentPlan(e.installments),parts=[...(e.parts||[])].sort((a,b)=>a.date.localeCompare(b.date)),total=eventPartsTotal(e),diff=Math.round((e.amount-total)*100)/100;
  return `<div class="event-card"><div class="row event-head"><div><strong>${esc(e.title)}</strong><div class="subtle">${partPlan?'פריסה ל־'+partPlan.count+' תשלומים':split?'רכיבי הוצאה':monthName(e.month)} ${!split&&e.recurrence==='monthly'?'· חוזר בכל חודש'+(e.endMonth?' עד '+monthName(e.endMonth):''):''}</div>${e.note?`<p class="subtle" style="margin:4px 0">${esc(e.note)}</p>`:''}${e.type==='expense'&&!split?`<div class="tiny">${esc(paymentDescription(cleanPayment(e.payment)))}</div>`:''}</div><div class="event-side"><strong class="money ${e.type==='expense'?'red-text':'green-text'}">${e.type==='expense'?'−':'+'}${money(e.amount)}</strong><span class="tag ${e.type==='expense'?'amber':'green'}">${e.type==='expense'?'תקציב הוצאה':'יעד הכנסה'}</span></div></div>
  ${partPlan?`<div class="note">${esc(installmentsSummary(partPlan,e.amount))}</div>`:''}
  ${split?`<div class="event-installments"><div class="row event-totals"><span>רכיבים ששובצו</span><strong class="money">${money(total)}</strong></div><div class="row event-totals"><span>${diff>0?'טרם שובץ לתאריך':diff<0?'מעל תקציב האירוע':'כל התקציב שובץ'}</span><strong class="money ${diff<0?'red-text':''}">${money(Math.abs(diff))}</strong></div>${diff>0?'<p class="tiny">הסכום שטרם שובץ לא נכלל בתחזית החודשית עד שתגדיר לו תאריך.</p>':''}
  ${parts.length?parts.map(part=>`<div class="event-part"><div class="event-part-main"><strong>${esc(part.title)}</strong><span class="subtle">${esc(part.date.split('-').reverse().join('/'))}${part.note?' · '+esc(part.note):''} · ${esc(paymentDescription(cleanPayment(part.payment||e.payment)))}</span></div><strong class="money">${money(part.amount)}</strong><div class="button-row"><button type="button" class="btn secondary small" data-partedit="${esc(e.id)}|${esc(part.id)}">ערוך</button><button type="button" class="btn danger small" data-partdel="${esc(e.id)}|${esc(part.id)}">מחק</button></div></div>`).join(''):'<div class="subtle">אין עדיין רכיבים מתוזמנים.</div>'}</div>`:''}
  <div class="button-row" style="margin-top:12px"><button class="btn primary small" ${partPlan?'disabled title="קיימת פריסה לתשלומים; בטל אותה בעריכה כדי להגדיר רכיבים"':''} data-eventparts="${esc(e.id)}">${split?'+ הוסף / נהל רכיבים':'+ פצל לרכיבים'}</button><button class="btn secondary small" data-editevent="${esc(e.id)}">עריכת האירוע</button><button class="btn danger small" data-deleteevent="${esc(e.id)}">מחיקה</button></div></div>`;
 }).join(''):`<div class="blank"><div class="symbol">✦</div><h3>עוד לא הוגדרו הוצאות מיוחדות</h3><p>אפשר לתכנן חופשה עם תשלומי כרטיסים, טיסות ומלון בתאריכים שונים.</p><button class="btn primary" data-action="new-event">+ צור אירוע ראשון</button></div>`}</section>`;
}

function getForecast(){return Array.from({length:state.settings.forecastLength||12},(_,i)=>projection(addMonths(forecastStart,i)))}
function renderForecast(){
 const rows=getForecast();const balances=rows.map(p=>({p,b:monthlyBalance(p.month)}));
 const known=balances.filter(x=>x.b.closing!==null);const final=known.length?known[known.length-1].b.closing:null;
 setting('pageForecast').innerHTML=`<div class="row wrap" style="margin-bottom:14px"><div class="control"><label for="forecastMonth">תחילת תחזית</label><input type="month" id="forecastMonth" value="${esc(forecastStart)}"></div><div class="control"><label for="forecastCount">מספר חודשים</label><input type="number" id="forecastCount" min="1" max="24" value="${state.settings.forecastLength||12}"></div><button class="btn secondary" data-action="new-event">+ אירוע עתידי</button><button class="btn secondary" data-openmonth="${esc(forecastStart)}">הגדר יתרת פתיחה</button></div>
 <div class="grid two">${cardMetric('יתרה בסוף התחזית',final,'יתרה בסוף החודש האחרון, כולל יתרות פתיחה',final===null?'warning':final>=0?'success':'warning')}${cardMetric('שינוי חודשי ממוצע',rows.reduce((n,p)=>n+p.net,0)/rows.length,'הכנסות פחות הוצאות בחודש — לא יתרת החשבון')}</div>
 <section class="card" style="margin-top:16px"><h2>תחזית חודשית · ${rows.length} חודשים</h2><div class="note">יתרה = יתרת העו״ש האחרונה + הפקדות עתידיות − חיובים שטרם ירדו מהבנק. חיובי אשראי עוברים לחודש הגבייה (ברירת מחדל: יום 2 בחודש הבא). היתרה עוברת לחודש הבא, ואינה יתרה בזמן אמת.</div><div class="table-wrap"><table class="forecast-table"><thead><tr><th>חודש</th><th>הכנסות</th><th>הוצאות</th><th>יתרה</th><th>פעולה</th></tr></thead><tbody>${balances.map(({p,b})=>`<tr class="${b.closing!==null&&b.closing<0?'negative':''}"><td><strong>${monthName(p.month)}</strong><div class="tiny">פתיחה: ${b.opening===null?'לא הוגדרה':money(b.opening)}</div></td><td class="money">${money(p.income)}</td><td class="money">${money(p.allocated)}</td><td class="money ${b.closing!==null&&b.closing<0?'red-text':'green-text'}">${b.closing===null?'—':money(b.closing)}</td><td><button class="btn secondary small" data-foreedit="${p.month}">ערוך</button><button class="btn ghost small" data-openmonth="${p.month}">פתיחה</button></td></tr>`).join('')}</tbody></table></div></section>`;
}

function localInsights(scope=insightScope,month=insightMonth){
 const arr=[];const months=scope==='all'?getForecast().map(x=>x.month):[month];
 const summary=months.map(m=>projection(m));
 const income=summary.reduce((n,p)=>n+p.income,0),expense=summary.reduce((n,p)=>n+p.allocated,0),net=income-expense;
 const actualRows=projectedTransactions().filter(t=>months.includes(t.date.slice(0,7)));
 const actualExpenses=actualRows.filter(t=>t.type==='expense').reduce((n,t)=>n+t.amount,0);
 const categoryTotals=CATEGORIES.map(c=>({name:c.name,total:months.reduce((sum,m)=>sum+c.items.reduce((n,i)=>n+baseItem(m,i.id),0),0)})).filter(c=>c.total>0).sort((a,b)=>b.total-a.total);
 const title=scope==='all'?'לתקופת התחזית ('+months.length+' חודשים)':'ל'+monthName(month);
 arr.push({title:'תמונת מצב '+title,body:`הכנסות מתוכננות: ${money(income)}; הוצאות והפרשות: ${money(expense)}; שינוי בתקופה: ${money(net)}. אלו נתוני תכנון, לא ביצוע בפועל.`});
 if(categoryTotals[0])arr.push({title:'איפה נמצא רוב התקציב?',body:`הקטגוריה הגדולה ביותר היא ״${categoryTotals[0].name}״ עם ${money(categoryTotals[0].total)} ${scope==='month'?'לחודש':'בתקופה'}. כדאי לעבור על פריטי ההוצאה הגדולים לפני שמנסים לחסוך בקניות קטנות.`});
 if(actualRows.length)arr.push({title:'מה באמת נרשם?',body:`נרשמו ${actualRows.length} תנועות, מתוכן הוצאות בסך ${money(actualExpenses)}. כדי להשוות לתקציב בדוק שהעלית תדפיסים לכל התקופה ושהעסקאות סווגו כראוי.`});
 else arr.push({title:'אין מספיק ביצוע בפועל',body:'עדיין אין תנועות שנקלטו בתקופה שנבחרה. אפשר לקבל המלצות על התכנון, אך לא לקבוע היכן הוצאת יותר מדי בפועל.'});
 const neg=summary.filter(p=>p.net<0);
 if(neg.length)arr.push({title:'מתי כדאי להתכונן מראש?',body:`יש ${neg.length} ${neg.length===1?'חודש':'חודשים'} עם יתרה חודשית שלילית. כדאי לפתוח את מסך ההוצאות המיוחדות ולבדוק תאריכי תשלומים גדולים לפני שמתחייבים.`});
 const flexIds=['worklunch','restaurants','takeaway','concerts','clothing'];const flex=flexIds.map(id=>({item:ITEM_BY_ID[id],amount:months.reduce((n,m)=>n+(ITEM_BY_ID[id]?baseItem(m,id):0),0)})).filter(x=>x.item&&x.amount>0).sort((a,b)=>b.amount-a.amount);
 if(flex[0])arr.push({title:'שיפור קטן שאפשר לנסות',body:`פריט הוצאה ״${flex[0].item.name}״ מתוקצב ב־${money(flex[0].amount)} ${scope==='month'?'בחודש':'בתקופה'}. אפשר לבדוק אם צמצום הדרגתי של 5%–10% בפריט הוצאה הזה מתאים לך, בלי לפגוע בדברים שחשובים לך.`});
 return arr;
}
function insightHistoryLabel(entry){return entry.scope==='all'?'התקציב כולו':monthName(entry.month)}
function insightHistoryDate(value){
 const date=String(value||'');
 // New entries store an ISO timestamp; display in the user's local time.
 if(/^\d{4}-\d{2}-\d{2}T/.test(date)){
  const d=new Date(date);
  if(!Number.isNaN(d.getTime()))return new Intl.DateTimeFormat('he-IL',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(d);
 }
 // Historic entries recorded only a calendar date. Do not fabricate a clock time.
 if(/^\d{4}-\d{2}-\d{2}$/.test(date))return date.slice(8,10)+'/'+date.slice(5,7)+'/'+date.slice(0,4)+' · שעה לא נשמרה';
 return date||'ללא תאריך';
}
function renderInsights(){
 const insights=decisionData();
 const historyMarkup=state.insightHistory.length?state.insightHistory.map((entry,i)=>`<details class="insight-history" ${i===0?'open':''}>
  <summary><span class="insight-history-title"><strong>${esc(insightHistoryLabel(entry))}</strong><span class="tiny">${esc(insightHistoryDate(entry.date))}</span></span><button type="button" class="btn danger small insight-delete" data-insight-delete="${i}" aria-label="מחק ניתוח של ${esc(insightHistoryLabel(entry))}">מחק</button></summary>
  <div class="insight-ai">${esc(entry.text)}</div>
 </details>`).join(''):`<div class="note">עוד לא שמרת ניתוחי AI. כל המסקנות המקומיות למעלה פועלות גם ללא AI.</div>`;
 setting('pageInsights').innerHTML=`${decisionOverview(insights)}
 <section class="card decision-ai"><div class="row wrap"><div><h2>ניתוח מעמיק עם AI</h2><p class="subtle">הרחבה אופציונלית. סכומים מחושבים מקומית; Google AI משמש להסבר ולהצעות בלבד.</p></div><span class="tag blue">לבחירתך</span></div>
 <div class="decision-ai-bar"><label class="control"><span>ניתוח של</span><span class="decision-ai-scope">${insightScope==='month'?esc(monthName(insightMonth)):'חלון התחזית'}</span></label><button id="geminiAnalyze" type="button" class="btn primary insight-analyze" data-action="gemini" ${geminiRunning?'disabled':''}>${geminiRunning?'מנתח...':'נתח עם AI'}</button></div>
 <section class="insight-results"><h3>ניתוחים שמורים</h3>${historyMarkup}</section>
 <details class="decision-ai-config"><summary>הגדרות AI, בחירת מידע ותצוגה לפני שליחה</summary><div class="decision-ai-config-body"><p class="subtle">נתוני התקציב הרלוונטיים לשאלה יישלחו ל־Google רק לאחר שתאשר. גם בלעדיהם המסקנות המקומיות זמינות.</p>
 <label class="control"><span>מפתח API אישי מ־Google AI Studio</span><input id="geminiKey" type="password" autocomplete="off" placeholder="הדבק מפתח API" value="${esc(geminiKey)}"></label>
 <label class="checkline"><input id="rememberAIKey" type="checkbox" ${loadAIKey()?'checked':''}>שמור את המפתח במכשיר הזה</label>
 <div class="button-row"><button type="button" class="btn secondary small" data-action="google-key-help">התחברות ל-Google/יצירת מפתח</button><button type="button" class="btn ghost small" data-action="gemini-clear-key">מחק מפתח שמור</button></div>
 <label class="checkline"><input id="sendNotes" type="checkbox" ${insightIncludeNotes?'checked':''}>לכלול גם הערות חופשיות לעסקאות ולאירועים</label>
 <label class="control"><span>מה חשוב לך במיוחד? (רשות)</span><textarea id="insightPrompt" rows="3" placeholder="למשל: חשוב לי לשמור על הוצאות משפחתיות..."></textarea></label>
 <button type="button" class="btn secondary small" data-action="ai-preview">הצג במדויק מה יישלח ל־Google</button>
 <p class="tiny">מודל: ${esc(state.settings.model)} · ניתן לשנות בהגדרות. ייתכן חיוב על שימוש ב־API; המפתח אינו נכלל בגיבוי.</p></div></details>
 </section>`;
 const promptField=setting('insightPrompt');if(promptField)promptField.value=insightPromptText;
}
function showAIPreview(){
 const notes=!!setting('sendNotes')?.checked,personal=(setting('insightPrompt')?.value||'').slice(0,2000);
 const prompt=safeAIPrompt(notes,personal,insightScope,insightMonth);
 openModal('מה יישלח ל־Google AI?',`<p class="note">תצוגה מקומית בלבד. זו אינה שליחה. סגירת החלון מחזירה לתובנות.</p><pre class="decision-preview" dir="auto">${esc(prompt)}</pre>`,(_,d)=>d.close(),'סגור תצוגה');
}

function creditCardSettingsHtml(){
 const cards=state.creditCards||[];
 return `<section class="card credit-card-settings" style="margin-bottom:16px"><div class="row wrap"><div><h2 style="margin-bottom:4px">כרטיסי אשראי</h2><p class="subtle" style="margin:0">כרטיסים לחיוב הוצאות. נשמרות רק ארבע הספרות האחרונות, אם בחרת להזין אותן.</p></div><button class="btn primary" type="button" data-action="new-card">+ הוסף כרטיס</button></div>
 <div class="settings-list" style="margin-top:16px">${cards.length?cards.map(card=>`<div class="credit-card-row"><div><strong>${esc(cardLabel(card.id))}</strong><div class="subtle">חיוב ב־${card.day} בחודש הבא ${card.id===defaultCardId()?' · כרטיס ברירת מחדל':''}</div></div><div class="button-row"><button type="button" class="btn secondary small" data-cardedit="${esc(card.id)}">ערוך</button>${card.id===defaultCardId()?'':`<button type="button" class="btn ghost small" data-carddefault="${esc(card.id)}">קבע כברירת מחדל</button>`}<button type="button" class="btn danger small" data-carddelete="${esc(card.id)}">מחק</button></div></div>`).join(''):'<div class="note">עדיין לא הוגדר כרטיס. חיובי אשראי יחושבו כברירת מחדל ב־2 בחודש הבא.</div>'}
 </div><p class="tiny">כל שינוי ביום החיוב מעדכן גם את תחזית החיובים המשויכים לכרטיס זה. חיובים עם תאריך גבייה מדויק שהוזן ידנית נשארים בתאריך שהוגדר להם.</p></section>`;
}
function creditCardModal(id=null){const old=creditCardById(id);
 openModal(old?'עריכת כרטיס אשראי':'כרטיס אשראי חדש',`<div class="form-grid"><label class="control"><span>ארבע ספרות אחרונות (רשות)</span><input class="select-amount" type="text" name="last4" maxlength="4" inputmode="numeric" pattern="[0-9]{4}" placeholder="למשל 8290" value="${esc(old?.last4||'')}"></label><label class="control"><span>שם הכרטיס (רשות)</span><input type="text" name="name" maxlength="70" value="${esc(old?.name||'')}" placeholder="למשל כרטיס ראשי"></label><label class="control"><span>יום חיוב בחודש (רשות; ברירת מחדל 2)</span><input class="select-amount" type="number" name="day" min="1" max="31" step="1" value="${old?.day??2}"></label></div><p class="note">חיובי האשראי של חודש קניות אחד ירדו בחודש שאחריו, ביום החיוב של הכרטיס. במקרים של חודש קצר היום מותאם ליום האחרון בחודש.</p>`,(fd,d)=>{
 const last4=String(fd.get('last4')||'').trim(),name=String(fd.get('name')||'').trim(),day=String(fd.get('day')||'').trim()===''?2:Number(fd.get('day'));
 if((last4&&!/^\d{4}$/.test(last4))||!Number.isInteger(day)||day<1||day>31){toast('יש להזין ארבע ספרות בלבד או להשאיר ריק, ויום חיוב בין 1 ל־31.',true);return;}
 if(old){old.name=name.slice(0,70);old.last4=last4;old.day=day;}else{const card={id:'card-'+uid(),name:name.slice(0,70),last4,day};state.creditCards.push(card);if(state.creditCards.length===1)state.defaultCardId=card.id;}
 persist();d.close();render();toast('הכרטיס נשמר. חיובים עתידיים יחושבו לפי יום החיוב שלו.');
 });
}
async function removeCreditCard(id){const card=creditCardById(id);if(!card)return;
 const linked=Object.values(state.itemPayments).filter(p=>p.cardId===id).length+state.transactions.filter(t=>t.payment?.cardId===id).length+state.events.reduce((n,e)=>n+(e.payment?.cardId===id?1:0)+(e.parts||[]).filter(p=>p.payment?.cardId===id).length,0);
 if(!await appConfirm('למחוק את '+cardLabel(id)+'?'+(linked?' '+linked+' חיובים משויכים יחזרו לכרטיס ברירת המחדל.':'')))return;
 state.creditCards=state.creditCards.filter(c=>c.id!==id);if(state.defaultCardId===id)state.defaultCardId=state.creditCards[0]?.id||'';
 const unlink=p=>{if(p?.cardId===id)p.cardId='';};Object.values(state.itemPayments).forEach(unlink);state.transactions.forEach(t=>unlink(t.payment));state.events.forEach(e=>{unlink(e.payment);(e.parts||[]).forEach(p=>unlink(p.payment));});
 persist();render();toast('הכרטיס נמחק והשיוכים עודכנו.');
}
function renderSettings(){setting('pageSettings').innerHTML=`${creditCardSettingsHtml()}<div class="two-panels"><section class="card"><h2>הגדרות התכנון</h2><div class="settings-list"><div class="control"><label for="startMonth">תחילת תחזית ברירת מחדל</label><input id="startMonth" type="month" value="${esc(state.settings.planningStart)}"></div><div class="control"><label for="settingsForecastCount">מספר חודשי תחזית (1–24)</label><input id="settingsForecastCount" type="number" min="1" max="24" value="${state.settings.forecastLength||12}"></div><div class="note">שינויים בשכר הדירה ובכל הוצאה אחרת מוגדרים במסך <strong>תקציב ← פריט הוצאה ההוצאה ← תאריכים</strong>, ולא בהגדרות.</div><div class="control"><label for="geminiModel">מודל AI</label><select id="geminiModel"><option value="gemini-3.5-flash-lite" ${state.settings.model==='gemini-3.5-flash-lite'?'selected':''}>AI חסכוני — מומלץ</option><option value="gemini-3.1-flash-lite" ${state.settings.model==='gemini-3.1-flash-lite'?'selected':''}>AI חסכוני חלופי</option><option value="gemini-3.8-flash" ${state.settings.model==='gemini-3.8-flash'?'selected':''}>AI מתקדם — עשוי לעלות יותר</option>${!['gemini-3.5-flash-lite','gemini-3.1-flash-lite','gemini-3.8-flash'].includes(state.settings.model)?`<option value="${esc(state.settings.model)}" selected>דגם מותאם: ${esc(state.settings.model)}</option>`:''}</select></div><button class="btn primary" data-action="save-settings">שמור הגדרות</button></div></section><section class="card"><h2>המידע שלך, בשליטתך</h2><div class="note warning">הנתונים נשמרים בדפדפן במכשיר בלבד, כולל משכורות ותקופות תוקף. יש לבצע גיבוי לפני עדכון גרסה ולאחר שינויים משמעותיים.</div><div class="settings-list" style="margin-top:14px"><button class="btn secondary" data-action="show-onboarding">מדריך התחלה מהירה</button><button class="btn secondary" data-action="refresh-code">בדוק וטען גרסה חדשה</button><button class="btn primary" data-action="export">הורד גיבוי JSON</button><label class="control"><span class="control-label">שחזור מגיבוי (מחליף נתונים קיימים)</span><input type="file" id="importFile" accept=".json,application/json"></label><button class="btn danger" data-action="clear-data">מחק את כל המידע במכשיר</button></div></section></div>`;}
function closeAppModal(){
 const dialog=setting('modal');
 const mode=dialog.dataset.mode;
 dialog.dataset.mode='';
 setting('modalCancel').onclick=null;
 if(dialog.open)dialog.close();
 if(mode==='onboarding')markIntroSeen();
}
function openModal(title,content,onSave,submitText='שמירה'){const d=setting('modal');setting('modalCancel').onclick=null;setting('modalCancel').textContent='ביטול';setting('modalHeading').textContent=title;setting('modalBody').innerHTML=content;setting('modalSave').textContent=submitText;d.dataset.mode='';setting('modalForm').onsubmit=e=>{e.preventDefault();onSave(new FormData(setting('modalForm')),d)};d.showModal();}
function transactionsLogModal(){
 const rows=state.transactions.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,60);
 const content=`<p class="subtle">תנועות שבוצעו ונקלטו מתדפיסים או הוזנו ידנית. מוצגות עד 60 התנועות האחרונות; שאר התנועות נשמרות וייכללו בחישובים.</p>
 <div class="button-row" style="margin:14px 0"><button class="btn primary small" type="button" data-action="new-transaction">+ תנועה ידנית</button><button class="btn secondary small" type="button" data-action="transactions-to-import">ייבוא תדפיס חדש</button></div>
 ${rows.length?`<div class="import-list">${rows.map(t=>`<div class="metric-mini"><div><strong>${esc(ITEM_BY_ID[t.itemId]?.name||t.note||'תנועה')}</strong><div class="subtle">${esc(t.date)} · ${t.type==='income'?'הכנסה':'הוצאה'} · ${esc(t.note||'')}${cleanPayment(t.payment).method==='card'?' · '+esc(paymentDescription(cleanPayment(t.payment))):''}</div></div><div><strong class="money">${t.type==='income'?'+':'−'}${money(t.amount)}</strong><div class="button-row"><button class="btn secondary small" type="button" data-edittrans="${esc(t.id)}">ערוך</button><button class="btn danger small" type="button" data-deletetrans="${esc(t.id)}">מחק</button></div></div></div>`).join('')}</div>`:'<p class="note">אין עדיין תנועות רשומות. ניתן לייבא תדפיסי עו״ש ואשראי או להוסיף תנועה ידנית.</p>'}`;
 openModal('תנועות שנקלטו · '+monthName(currentMonth),content,(_,d)=>d.close(),'סגור');
}
function appConfirm(message,{title='אישור פעולה',accept='אישור',danger=false}={}){
 const dialog=setting('maslulConfirm');
 const btnOk=setting('maslulConfirmAccept'),btnCancel=setting('maslulConfirmCancel');
 setting('maslulConfirmHeading').textContent=title;
 setting('maslulConfirmMessage').textContent=String(message);
 btnOk.textContent=accept;
 btnOk.className='btn '+(danger?'danger':'primary');
 return new Promise(resolve=>{
  let finished=false;
  function finish(value){if(finished)return;finished=true;cleanup();if(dialog.open)dialog.close();resolve(value);}
  function cancel(){finish(false)}
  function ok(){finish(true)}
  function onCancel(e){e.preventDefault();cancel()}
  function cleanup(){btnOk.removeEventListener('click',ok);btnCancel.removeEventListener('click',cancel);dialog.removeEventListener('cancel',onCancel);dialog.removeEventListener('close',cancel)}
  btnOk.addEventListener('click',ok);
  btnCancel.addEventListener('click',cancel);
  dialog.addEventListener('cancel',onCancel);
  dialog.addEventListener('close',cancel);
  dialog.showModal();
 });
}
function transactionModal(id=null){const old=state.transactions.find(t=>t.id===id);const date=old?.date||(currentMonth===todayISO().slice(0,7)?todayISO():currentMonth+'-01');openModal(old?'עריכת פעולה':'פעולה חדשה',`<div class="form-grid"><div class="control"><label for="txType">סוג פעולה</label><select name="type" id="txType"><option value="expense" ${old?.type==='expense'||!old?'selected':''}>הוצאה</option><option value="income" ${old?.type==='income'?'selected':''}>הכנסה</option></select></div><div class="control"><label for="txDate">תאריך</label><input id="txDate" name="date" type="date" required value="${date}"></div><div class="control"><label for="txItem">פריט הוצאה בתקציב</label><select id="txItem" name="itemId"><option value="other" ${!old||old.itemId==='other'?'selected':''}>אחר / הכנסה</option>${CATEGORIES.map(c=>`<optgroup label="${esc(c.name)}">${c.items.map(i=>`<option value="${i.id}" ${old?.itemId===i.id?'selected':''}>${esc(i.name)}</option>`).join('')}</optgroup>`).join('')}</select></div><div class="control"><label for="txAmount">סכום בשקלים</label><input id="txAmount" name="amount" type="number" min="0.01" max="10000000" step="0.01" required value="${old?.amount||''}" placeholder="0"></div><div class="control wide"><label for="txNote">תיאור / הערה</label><textarea id="txNote" name="note" maxlength="400" placeholder="למשל קנייה בסופר">${esc(old?.note||'')}</textarea></div><label class="control"><span>אמצעי תשלום</span><select name="paymentMethod"><option value="card" ${cleanPayment(old?.payment||defaultPaymentFor(old?.itemId,old?.sourceKind)).method==='card'?'selected':''}>כרטיס אשראי</option><option value="bank" ${cleanPayment(old?.payment||defaultPaymentFor(old?.itemId,old?.sourceKind)).method==='bank'?'selected':''}>חיוב בעו״ש / העברה</option><option value="cash" ${cleanPayment(old?.payment||defaultPaymentFor(old?.itemId,old?.sourceKind)).method==='cash'?'selected':''}>מזומן</option></select></label><label class="control" data-card-picker ${cleanPayment(old?.payment||defaultPaymentFor(old?.itemId,old?.sourceKind)).method==='card'?'':'hidden'}><span>כרטיס אשראי לחיוב</span><select name="cardId">${creditCardOptions(old?.payment?.cardId||'')}</select></label><label class="control"><span>מועד גבייה מדויק (רשות)</span><input name="dueDate" type="date" value="${esc(old?.dueDate||'')}"></label>${old&&old.sourceKind!=='manual'?'<p class="note wide">עסקאות שיובאו מתדפיס נשמרות כמו במקור לצורכי התאמה. פריסה לתשלומים זמינה בעת יצירת הוצאה ידנית; אין לשנות בדיעבד שורת תדפיס.</p>':installmentFormHtml(old?.installments||null)}<p class="note wide">ברירת מחדל לאשראי: החיוב ב־2 בחודש שלאחר ביצוע הקנייה. ניתן לשנות את יום החיוב לפי פריט הוצאה בתקציב.</p></div>`,(fd,d)=>{const date=String(fd.get('date'));const type=String(fd.get('type'));const amount=Number(fd.get('amount'));if(!/^\d{4}-\d\d-\d\d$/.test(date)||!['expense','income'].includes(type)||!Number.isFinite(amount)||amount<=0){toast('נא למלא תאריך וסכום תקינים.',true);return;}let installmentPlan;try{installmentPlan=type==='expense'&&(old?.sourceKind||'manual')==='manual'?installmentForForm(fd):null}catch(err){toast(err.message,true);return;}const tx={id:id||uid(),date,type,sourceKind:old?.sourceKind||'manual',installments:installmentPlan,itemId:ITEM_BY_ID[fd.get('itemId')]?String(fd.get('itemId')):'other',amount:Math.round(amount*100)/100,note:String(fd.get('note')||'').slice(0,400),payment:cleanPayment({method:String(fd.get('paymentMethod')),lag:1,day:2,cardId:String(fd.get('cardId')||'')}),dueDate:validDate(String(fd.get('dueDate')||''))?String(fd.get('dueDate')):'',...(old?{sourceKind:old.sourceKind,sourceName:old.sourceName,sourceId:old.sourceId,sourceFingerprint:old.sourceFingerprint,documentId:old.documentId,status:old.status}:{})};if(id)state.transactions=state.transactions.map(t=>t.id===id?tx:t);else state.transactions.push(tx);persist();d.close();currentMonth=date.slice(0,7);setting('activeMonth').value=currentMonth;render();toast('הפעולה נשמרה במכשיר.');});}
function eventModal(id=null){const old=state.events.find(e=>e.id===id);const month=old?.month||currentMonth;openModal(old?'עריכת הוצאה / הכנסה מיוחדת':'הוצאה / הכנסה מיוחדת חדשה',`<div class="form-grid"><div class="control wide"><label for="evTitle">שם האירוע</label><input id="evTitle" name="title" required maxlength="140" value="${esc(old?.title||'')}" placeholder="לדוגמה: חופשה משפחתית"></div><div class="control"><label for="evType">הוצאה או הכנסה?</label><select id="evType" name="type"><option value="expense" ${old?.type==='income'?'':'selected'}>הוצאה מיוחדת</option><option value="income" ${old?.type==='income'?'selected':''}>הכנסה מיוחדת</option></select></div><div class="control"><label for="evAmount">סכום בשקלים</label><input id="evAmount" name="amount" type="number" min="0.01" step="0.01" max="10000000" required value="${old?.amount||''}" placeholder="0"></div><div class="control"><label for="evMonth">חודש האירוע הראשון</label><input id="evMonth" name="month" type="month" required value="${esc(month)}"></div><div class="control"><label for="evRecurrence">תדירות</label><select id="evRecurrence" name="recurrence"><option value="once">חד־פעמי</option><option value="monthly" ${old?.recurrence==='monthly'?'selected':''}>חודשי חוזר</option></select></div><div class="control"><label for="evEnd">חודש סיום (לא חובה לחוזר)</label><input id="evEnd" name="endMonth" type="month" value="${esc(old?.endMonth||'')}"></div><div class="control"><label for="evStartDate">תאריך התחלה מדויק (לא חובה)</label><input id="evStartDate" name="startDate" type="date" value="${esc(old?.startDate||'')}"></div><div class="control"><label for="evEndDate">תאריך סיום מדויק (לא חובה)</label><input id="evEndDate" name="endDate" type="date" value="${esc(old?.endDate||'')}"></div><div class="control"><label>אמצעי חיוב ההוצאה</label><select name="paymentMethod"><option value="card" ${cleanPayment(old?.payment).method==='card'?'selected':''}>אשראי · 2 בחודש הבא</option><option value="bank" ${old?.payment?.method==='bank'?'selected':''}>עו״ש · בחודש האירוע</option><option value="cash" ${old?.payment?.method==='cash'?'selected':''}>מזומן · ביום האירוע</option></select></div><div class="control" data-card-picker ${cleanPayment(old?.payment).method==='card'?'':'hidden'}><label>כרטיס אשראי</label><select name="cardId">${creditCardOptions(old?.payment?.cardId||'')}</select></div><div class="control wide"><label for="evNote">פרטים חשובים לתובנות</label><textarea name="note" id="evNote" maxlength="500" placeholder="פרטים שיכולים להשפיע על התכנון">${esc(old?.note||'')}</textarea></div>${installmentFormHtml(old?.installments||null)}</div>`,(fd,d)=>{const amount=Number(fd.get('amount')),month=String(fd.get('month')),endMonth=String(fd.get('endMonth')||''),type=String(fd.get('type')),recurrence=String(fd.get('recurrence'));if(!validMonth(month)||!['income','expense'].includes(type)||!Number.isFinite(amount)||amount<=0||(endMonth&&(!validMonth(endMonth)||endMonth<month))){toast('נא למלא את האירוע בצורה תקינה.',true);return;}const startDate=String(fd.get('startDate')||''),endDate=String(fd.get('endDate')||'');if((startDate&&!validDate(startDate))||(endDate&&!validDate(endDate))||(startDate&&endDate&&startDate>endDate)){toast('תאריכי האירוע אינם תקינים.',true);return;}let installmentPlan;try{installmentPlan=type==='expense'?installmentForForm(fd):null}catch(err){toast(err.message,true);return;}if(installmentPlan&&(recurrence==='monthly'||(old&&isSplitEvent(old)))){toast('פריסת תשלומים זמינה להוצאה חד־פעמית בלבד, ללא רכיבי הוצאה ידניים קיימים.',true);return;}if(old&&isSplitEvent(old)&&recurrence==='monthly'){toast('לא ניתן להפוך אירוע מפוצל לאירוע חודשי. קודם יש לבטל את הפיצול.',true);return;}const eventMonth=installmentPlan?.startDate.slice(0,7)||(startDate?startDate.slice(0,7):month);const ev={splitMode:!!old?.splitMode,parts:old?.parts||[],installments:installmentPlan,payment:cleanPayment({method:String(fd.get('paymentMethod')),lag:1,day:2,cardId:String(fd.get('cardId')||'')}),startDate,endDate,id:id||uid(),title:String(fd.get('title')||'').slice(0,140),type,amount:Math.round(amount*100)/100,month:eventMonth,recurrence:recurrence==='monthly'?'monthly':'once',endMonth,note:String(fd.get('note')||'').slice(0,500)};if(!ev.title){toast('נא לתת שם לאירוע.',true);return;}if(id)state.events=state.events.map(e=>e.id===id?ev:e);else state.events.push(ev);persist();d.close();render();toast('האירוע נוסף לתכנון.');});}

function modalSwitch(fn){const m=setting('modal');m.dataset.mode='';if(m.open)m.close();fn();}
// Full audit trail from opening balance, through every planned income and expense,
// to the closing balance. Uses the same prorating method as projectedBalance().
function cashflowDetails(month){
 const p=projection(month),balance=monthlyBalance(month),bank=state.bankBalance;
 const isBank=balance.source==='bank'&&bank?.asOf.slice(0,7)===month;
 const opening=balance.opening??(isBank?bank.amount:null);
 let running=Number(opening||0);
 function line(label,delta){running+=delta;const x={label,delta,running};timeline.push(x);return x;}
 const incomes=[],expenses=[],special=[],timeline=[];
 let note='';
 if(isBank){
  const ledger=(state.bankLedger||[]).filter(x=>x.date.startsWith(month)&&x.date<=bank.asOf).slice().sort((a,b)=>a.date.localeCompare(b.date));
  if(ledger.length&&balance.bankOpeningRecorded!==null&&balance.bankOpeningRecorded!==undefined){
   // Determine order within same date via the sequence of recorded bank balances.
   const first=ledger.find(x=>x.date.endsWith('-01')&&Math.abs(x.balance-balance.bankOpeningRecorded)<.01);
   let ordered=[];
   if(first){let rest=ledger.slice();let idx=rest.indexOf(first);if(idx>=0)rest.splice(idx,1);let v=first.balance;while(rest.length){let at=rest.findIndex(x=>Math.abs(x.balance-x.amount-v)<.011);if(at<0)break;const x=rest.splice(at,1)[0];ordered.push(x);v=x.balance;}ordered.push(...rest.sort((a,b)=>a.date.localeCompare(b.date)));}
   else ordered=ledger;
   for(const row of ordered){const target=row.amount>=0?incomes:special;target.push(line('עו״ש בפועל · '+row.date+' · '+row.description,row.amount));}
   note='היתרה בתחילת החודש מוצגת לאחר התנועה הראשונה שבוצעה ב־1 בחודש. התנועות בהמשך החודש כוללות גם חיובי אשראי מרוכזים שנוכו בבנק.';
  }else{note='נקודת המוצא היא יתרת העו״ש האחרונה שנקלטה בתדפיס. כדי לראות את תנועות החודש מיתרת ההתחלה, ייבא שוב את דוח העו״ש המלא.';}
  // Safeguard: bank snapshot always remains the source of truth for recorded movements.
  if(Math.abs(running-bank.amount)>.011)special.push(line('התאמה ליתרה המאומתת בתדפיס מ־'+bank.asOf,bank.amount-running));
  const futureIncome=futureIncomePortion(month,bank.asOf);
  if(futureIncome>0)incomes.push(line('הפקדות צפויות לאחר '+bank.asOf,futureIncome));
  const after=cashExpenseEntries(month).filter(x=>x.date>bank.asOf);
  for(const row of after)expenses.push({name:row.label,total:-row.amount,after:running-row.amount,entries:[line(row.date+' · '+row.label,-row.amount)]});
 }else{
  if(state.overrides[month]?.income!==undefined)incomes.push(line('הכנסות מתוכננות',p.income));
  else{
   const slips=payslipReceipts(month);let listed=0;
   for(const source of state.incomeSources){const matched=slips.filter(x=>x.sourceId===source.id);const v=matched.length?matched.reduce((n,x)=>n+x.netPay,0):sourceReceipt(source,month);if(v){incomes.push(line(source.name,v));listed+=v;}}
   const rest=p.income-listed;
   if(Math.abs(rest)>.009)incomes.push(line('הכנסות נוספות ותלושים',rest));
  }
  for(const row of cashExpenseEntries(month))expenses.push({name:row.label,total:-row.amount,after:running-row.amount,entries:[line(row.date+' · '+row.label,-row.amount)]});
 }
 return {p,opening,ending:balance.closing,hasBank:isBank,bank,balance,incomes,expenses,special,monthlyNet:p.net,note,timeline};
}

function ledgerLineHtml(line){return `<div class="running-row"><span class="running-name">${esc(line.label)}</span><span class="money ${line.delta>=0?'green-text':'red-text'}">${line.delta>=0?'+':'−'} ${money(Math.abs(line.delta))}</span><strong class="running-after money">יתרה: ${money(line.running)}</strong></div>`;}
function cashflowBreakdownHtml(month){
 const d=cashflowDetails(month);
 return `<p class="subtle">יתרת פתיחה ידועה או צילום מצב מהבנק, תנועות שנרשמו בפועל, והתחייבויות שטרם חויבו. החישוב תואם את התחזית ומבדיל בין רכישה באשראי לבין יום הגבייה בעו״ש.</p>
 <div class="button-row" style="margin-bottom:12px"><button type="button" class="btn secondary small" data-openmonth="${esc(month)}">✎ עדכן יתרת פתיחה</button></div>
 <div class="running-book"><div class="running-opening"><span>${d.hasBank&&d.balance.bankOpeningRecorded===null?'יתרה אחרונה מהבנק · ':'יתרה בתחילת החודש · '}${esc(monthName(month))}</span><strong class="money">${d.opening===null?'לא הוגדרה':money(d.opening)}</strong></div>
 ${d.note?`<p class="note">${esc(d.note)}</p>`:''}
 ${d.opening===null?'<p class="note warning">אין יתרת פתיחה. הזן יתרה כדי להציג את היתרה הסופית ולא רק את ההפרש החודשי.</p>':''}
 ${d.hasBank?`<div class="running-heading">תנועות שבוצעו ומועדי חיוב עתידיים</div>${d.timeline.map(ledgerLineHtml).join('')||'<p class="subtle">לא נמצאו תנועות נוספות.</p>'}`:`<div class="running-heading">הכנסות</div>${d.incomes.map(ledgerLineHtml).join('')||'<p class="subtle">לא הוגדרו הכנסות.</p>'}
 <div class="running-heading">חיובים צפויים בעו״ש</div>${d.expenses.map(c=>`<details class="running-group" open><summary><span>${esc(c.name)}</span><span class="running-group-values"><span class="money red-text">− ${money(Math.abs(c.total))}</span><strong class="money">${d.opening===null?'—':money(c.after)}</strong></span></summary><div>${c.entries.map(ledgerLineHtml).join('')}</div></details>`).join('')}
 ${d.special.length?`<details class="running-group" open><summary>אירועים והתאמות</summary><div>${d.special.map(ledgerLineHtml).join('')}</div></details>`:''}`}
 <div class="running-final"><span>יתרה בסוף החודש</span><strong class="money ${d.ending!==null&&d.ending<0?'red-text':'green-text'}">${d.ending===null?'—':money(d.ending)}</strong></div></div>
 <div class="note" style="margin-top:12px">הכנסות: ${money(d.p.income)} · הוצאות: ${money(d.p.allocated)} · שינוי חודשי: ${money(d.p.net)}.</div>`;
}

function expensesOverviewModal(){
 const p=projection(currentMonth);
 openModal('מבט על ההוצאות והיתרה · '+monthName(currentMonth),`
 <div class="balance-calc-row total"><strong>סך הוצאות צפויות</strong><strong class="money">${money(p.allocated)}</strong></div>
 ${cashflowBreakdownHtml(currentMonth)}
 <div class="button-row" style="margin-top:17px"><button type="button" class="btn primary" data-action="expenses-to-budget">✎ ערוך הוצאות</button></div>`,(_,d)=>d.close(),'סגור וחזור לבית');
}
function eventPartsModal(id){
 const e=state.events.find(ev=>ev.id===id);if(!e)return;
 if(e.recurrence==='monthly'){toast('הגדרת רכיבי הוצאה זמינה להוצאה מיוחדת חד־פעמית. ניתן לשנות את תדירות האירוע בעריכה.',true);return}
 const parts=[...(e.parts||[])].sort((a,b)=>a.date.localeCompare(b.date)),sum=eventPartsTotal(e);
 openModal('רכיבי ההוצאה המיוחדת · '+e.title,`
 <div class="note">תקציב כולל: <strong class="money">${money(e.amount)}</strong> · שובץ לרכיבים: <strong class="money">${money(sum)}</strong>. בעת פיצול, הסכום המקורי אינו מתווסף לתחזית. רק התשלומים שמופיעים כאן ייכנסו לחודשים המתאימים.</div>
 <div style="margin-top:12px">${parts.map(part=>`<div class="metric-mini"><div><strong>${esc(part.title)}</strong><div class="subtle">${esc(part.date.split('-').reverse().join('/'))}</div></div><strong class="money">${money(part.amount)}</strong><div class="button-row"><button type="button" class="btn secondary small" data-partedit="${esc(id)}|${esc(part.id)}">ערוך</button><button type="button" class="btn danger small" data-partdel="${esc(id)}|${esc(part.id)}">מחק</button></div></div>`).join('')||'<p class="subtle">עדיין אין רכיבים מתוזמנים.</p>'}</div>
 <div class="button-row" style="margin-top:16px"><button type="button" class="btn primary" data-partadd="${esc(id)}">+ הוסף רכיב</button>${isSplitEvent(e)?`<button type="button" class="btn ghost" data-partrevert="${esc(id)}">חזור לסכום יחיד</button>`:''}</div>`,(_,d)=>d.close(),'סגור');
}
function eventPartModal(eventId,partId=null){
 const e=state.events.find(ev=>ev.id===eventId);if(!e||e.recurrence==='monthly')return;
 const old=(e.parts||[]).find(x=>x.id===partId);
 openModal((old?'עריכת':'הוספת')+' רכיב הוצאה · '+e.title,`
 <div class="form-grid"><label class="control wide"><span class="control-label">שם הרכיב</span><input name="title" maxlength="140" required value="${esc(old?.title||'')}" placeholder="למשל כרטיסים להופעה"></label>
 <label class="control"><span class="control-label">תאריך הרכיב</span><input name="date" type="date" required value="${esc(old?.date||currentMonth+'-01')}"></label>
 <label class="control"><span class="control-label">סכום ₪</span><input name="amount" type="number" step="0.01" min="0.01" max="10000000" required value="${old?.amount??''}"></label>
 <label class="control"><span class="control-label">אמצעי תשלום</span><select name="paymentMethod"><option value="card" ${cleanPayment(old?.payment||e.payment).method==='card'?'selected':''}>אשראי · 2 בחודש הבא</option><option value="bank" ${cleanPayment(old?.payment||e.payment).method==='bank'?'selected':''}>עו״ש · בחודש זה</option><option value="cash" ${cleanPayment(old?.payment||e.payment).method==='cash'?'selected':''}>מזומן · מיידי</option></select></label><label class="control" data-card-picker ${cleanPayment(old?.payment||e.payment).method==='card'?'':'hidden'}><span class="control-label">כרטיס אשראי</span><select name="cardId">${creditCardOptions(old?.payment?.cardId||e.payment?.cardId||'')}</select></label><label class="control wide"><span class="control-label">הערות (רשות)</span><input name="note" maxlength="300" value="${esc(old?.note||'')}" placeholder="כרטיסים / טיסות / מלון / הוצאות בחופשה"></label></div>
 ${installmentFormHtml(old?.installments||null)}<p class="note" style="margin-top:12px">הרכיב ישפיע על התחזית בחודש של התאריך שבחרת. אין ספירה כפולה של סכום האירוע המקורי.</p>
 `,(fd,d)=>{
 const title=String(fd.get('title')||'').trim(),date=String(fd.get('date')||''),amount=Number(fd.get('amount'));
 if(!title||!validDate(date)||!Number.isFinite(amount)||amount<=0||amount>10000000){toast('יש להזין תיאור, תאריך וסכום תקינים.',true);return;}
 let installmentPlan;try{installmentPlan=installmentForForm(fd)}catch(err){toast(err.message,true);return;}
 const row={id:partId||uid(),title:title.slice(0,140),date,installments:installmentPlan,amount:Math.round(amount*100)/100,note:String(fd.get('note')||'').slice(0,300),payment:cleanPayment({method:String(fd.get('paymentMethod')),lag:1,day:2,cardId:String(fd.get('cardId')||'')})};
 e.parts??=[];if(old)e.parts=e.parts.map(x=>x.id===partId?row:x);else e.parts.push(row);
 e.splitMode=true;persist();d.close();render();eventPartsModal(eventId);toast('הרכיב נשמר בחודש '+monthName(date.slice(0,7)));
 });
}
function balanceBreakdownModal(){
 openModal('איך הגענו ליתרה? · '+monthName(currentMonth),`
 ${cashflowBreakdownHtml(currentMonth)}
 <div class="button-row" style="margin-top:14px"><button type="button" class="btn secondary" data-action="balance-to-budget">פתח את התקציב</button></div>
 `,(_,d)=>d.close(),'סגור');
}
function incomeHubModal(){const p=projection(currentMonth);const rows=state.incomeSources.map(s=>`<div class="metric-mini"><div><strong>${esc(s.name)}</strong><div class="subtle">${s.kind==='salary'?'משכורת':'הכנסה נוספת'} · ${s.frequency==='monthly'?'חודשית':'חד־פעמית'} · ${esc(periodText(s.startDate,s.endDate))}${s.prorate?' · חישוב יחסי':''}${s.kind==='salary'||s.frequency==='monthly'?' · כניסה לחשבון: '+(sourceLag(s)===0?'אותו חודש':sourceLag(s)===1?'חודש אחרי':'חודשיים אחרי')+' · יום '+String(Math.round(clamp(s.payDay,1,28,5))):''}}</div></div><div><strong class="money">${money(s.amount)}</strong><div class="button-row"><button type="button" class="btn secondary small" data-incomeedit="${esc(s.id)}">ערוך</button><button type="button" class="btn danger small" data-incomedel="${esc(s.id)}">מחק</button></div></div></div>`).join('');openModal('ניהול הכנסות · '+monthName(currentMonth),`<p class="subtle">סך הפקדות צפויות לחשבון בחודש: <strong class="money">${money(p.income)}</strong>. תאריכי ההתחלה והסיום הם ימי העבודה/הזכאות; חודש ההפקדה בבנק מוגדר בנפרד. לדוגמה, שכר נובמבר נכנס בדצמבר.</p><div>${rows||'<p class="note">עדיין אין משכורות מוגדרות.</p>'}</div><div class="button-row" style="margin-top:16px"><button type="button" class="btn primary" data-action="add-salary">+ הוסף משכורת</button><button type="button" class="btn secondary" data-action="add-other-income">+ הכנסה נוספת</button><button type="button" class="btn secondary" data-action="income-event">+ בונוס / זיכוי מיוחד</button></div>`,(_,d)=>{d.close();navigate('dashboard')},'סגור וחזור לבית');setting('modal').dataset.mode='incomeHub';}
function incomeSourceModal(id=null,kind='salary'){
 const old=state.incomeSources.find(s=>s.id===id),k=old?.kind||kind,amount=old?.amount??0;
 openModal(old?'עריכת הכנסה':'הוספת '+(k==='salary'?'משכורת':'הכנסה נוספת'),`<div class="form-grid"><label class="control wide"><span class="control-label">שם מקור ההכנסה</span><input name="name" required maxlength="100" value="${esc(old?.name|| (k==='salary'?'משכורת חדשה':'הכנסה נוספת'))}"></label><label class="control"><span class="control-label">סוג מקור</span><select name="kind"><option value="salary" ${k==='salary'?'selected':''}>משכורת</option><option value="other" ${k==='other'?'selected':''}>הכנסה אחרת</option></select></label><label class="control"><span class="control-label">תדירות</span><select name="frequency"><option value="monthly" ${old?.frequency!=='once'?'selected':''}>כל חודש בתקופה</option><option value="once" ${old?.frequency==='once'?'selected':''}>חד־פעמי בתאריך ההתחלה</option></select></label><label class="control"><span class="control-label">סכום ₪ (הקלדה)</span><input name="amount" id="sourceAmount" type="number" min="0.01" max="10000000" step="0.01" required value="${amount}"></label><label class="control"><span class="control-label">סכום בסליידר</span><input type="range" id="sourceSlider" min="0" max="${Math.max(40000,Math.ceil(amount/10000)*10000)}" step="250" value="${amount}"></label><label class="control"><span class="control-label">תחילת תקופת עבודה / זכאות</span><input name="startDate" type="date" value="${esc(old?.startDate||'')}"></label><label class="control"><span class="control-label">סיום תקופת עבודה / זכאות (רשות)</span><input name="endDate" type="date" value="${esc(old?.endDate||'')}"></label><label class="control"><span class="control-label">מתי ההכנסה נכנסת לחשבון?</span><select name="paymentLagMonths"><option value="0" ${(old?sourceLag(old):(k==='salary'?1:0))===0?'selected':''}>באותו חודש (הכנסה/זיכוי מיידי)</option><option value="1" ${(old?sourceLag(old):(k==='salary'?1:0))===1?'selected':''}>בחודש שלאחר תקופת הזכאות (ברירת מחדל למשכורת)</option><option value="2" ${(old?sourceLag(old):(k==='salary'?1:0))===2?'selected':''}>חודשיים אחרי</option></select></label><label class="control"><span class="control-label">יום בחודש שבו מתקבל הכסף (משוער)</span><input name="payDay" type="number" min="1" max="28" step="1" value="${Math.round(clamp(old?.payDay,1,28,5))}"></label><label class="checkline wide"><input type="checkbox" name="prorate" ${old?.prorate?'checked':''}>לחשב יחסית לפי ימי הפעילות בחודש (למשל בתחילת עבודה באמצע החודש)</label><p class="note wide">תאריכי ההתחלה והסיום קובעים מתי נצברת הזכאות להכנסה. התשלום בבנק יופיע לפי השהיית התשלום ויום ההפקדה שהגדרת. לדוגמה, משכורת על נובמבר תיכנס בדצמבר. ללא חישוב יחסי הסכום מלא בכל חודש זכאות. להכנסה חד־פעמית נדרש תאריך התחלה.</p></div>`,(fd,d)=>{const name=String(fd.get('name')||'').trim(),amount=Number(fd.get('amount')),startDate=String(fd.get('startDate')||''),endDate=String(fd.get('endDate')||''),frequency=String(fd.get('frequency')),paymentLagMonths=Number(fd.get('paymentLagMonths')),payDay=Number(fd.get('payDay'));
 if(!name||!Number.isFinite(amount)||amount<=0||amount>10000000||(startDate&&!validDate(startDate))||(endDate&&!validDate(endDate))||(startDate&&endDate&&startDate>endDate)||(frequency==='once'&&!startDate)||![0,1,2].includes(paymentLagMonths)||!Number.isInteger(payDay)||payDay<1||payDay>28){toast('יש להזין סכום הכנסה גדול מאפס ותאריכים תקינים.',true);return;}
 const row={id:id||uid(),name,kind:String(fd.get('kind'))==='other'?'other':'salary',amount,frequency:frequency==='once'?'once':'monthly',startDate,endDate,prorate:fd.has('prorate'),paymentLagMonths,payDay};if(old)state.incomeSources=state.incomeSources.map(s=>s.id===id?row:s);else state.incomeSources.push(row);persist();d.close();render();navigate('dashboard');toast('ההכנסה נשמרה והתחזית עודכנה.');});}
function periodHubModal(id){const item=ITEM_BY_ID[id];if(!item)return;const list=state.itemSchedules[id]||[];const rows=list.map(e=>`<div class="metric-mini"><div><strong>${money(e.amount)}</strong><div class="subtle">${esc(periodText(e.startDate,e.endDate))}${e.prorate?' · יחסי':''}</div></div><div class="button-row"><button type="button" class="btn secondary small" data-periodedit="${esc(id)}|${esc(e.id)}">ערוך</button><button type="button" class="btn danger small" data-perioddel="${esc(id)}|${esc(e.id)}">מחק</button></div></div>`).join('');openModal('תקופות: '+item.name,`<p class="note">כל תקופה מגדירה סכום חודשי. כשקיימות תקופות, הסכום יהיה 0 מחוץ לטווחים. במקרה של חפיפה גוברת התקופה עם תאריך ההתחלה המאוחר יותר. ניתן לבטל את התקופות כדי לחזור לסכום הבסיס.</p>${rows||'<p class="subtle">עדיין אין תקופות; חל סכום הבסיס.</p>'}<div class="button-row"><button type="button" class="btn primary" data-periodadd="${esc(id)}">+ הוסף תקופה</button></div>`,(_,d)=>d.close(),'סגור');}
function itemPaymentModal(id){const item=ITEM_BY_ID[id];if(!item)return;const pay=itemPayment(id);
 openModal('אמצעי תשלום · '+item.name,`<p class="note">שינוי כרטיס אינו משנה את סכום ההוצאה. תאריך החיוב של כרטיס נלקח מהגדרות הכרטיס ונשמר בנפרד מתאריך הקנייה.</p><div class="form-grid"><label class="control"><span>סוג תשלום</span><select name="method" data-payment-method><option value="card" ${pay.method==='card'?'selected':''}>כרטיס אשראי</option><option value="bank" ${pay.method==='bank'?'selected':''}>העברה / הוראת קבע / עו״ש</option><option value="cash" ${pay.method==='cash'?'selected':''}>מזומן</option></select></label><label class="control" data-card-picker ${pay.method==='card'?'':'hidden'}><span>כרטיס לחיוב</span><select name="cardId">${creditCardOptions(pay.cardId)}</select></label><label class="control" data-noncard-settings ${pay.method==='card'?'hidden':''}><span>יום החיוב בעו״ש</span><input class="select-amount" type="number" name="day" min="1" max="31" value="${pay.day}"></label></div><div class="note">חיובי אשראי נזקפים ליום החיוב של הכרטיס בחודש הבא. ניתן להוסיף כרטיסים בלשונית הגדרות.</div>`,(fd,d)=>{
 const method=String(fd.get('method')),day=Number(fd.get('day')),cardId=String(fd.get('cardId')||'');
 if(!['card','bank','cash'].includes(method)||(method!=='card'&&(!Number.isInteger(day)||day<1||day>31))||(method==='card'&&cardId&&!creditCardById(cardId))){toast('נא לבחור אמצעי חיוב תקין.',true);return;}
 state.itemPayments[id]=cleanPayment({method,day:method==='card'?2:day,lag:method==='card'?1:0,cardId});persist();d.close();render();toast('אמצעי החיוב נשמר והתחזית עודכנה.');
 });}
function itemPeriodModal(itemId,periodId=null){const item=ITEM_BY_ID[itemId];if(!item)return;const old=(state.itemSchedules[itemId]||[]).find(e=>e.id===periodId);openModal('תקופת תוקף · '+item.name,`<div class="form-grid"><label class="control"><span class="control-label">סכום חודשי ₪</span><input name="amount" type="number" step="0.01" min="0" required value="${old?.amount??editableItemAmount(currentMonth,itemId)}"></label><label class="control"><span class="control-label">תחילת תקופת עבודה / זכאות</span><input name="startDate" type="date" value="${esc(old?.startDate||currentMonth+'-01')}"></label><label class="control"><span class="control-label">סיום תקופת עבודה / זכאות (רשות)</span><input name="endDate" type="date" value="${esc(old?.endDate||'')}"></label><label class="checkline wide"><input type="checkbox" name="prorate" ${old?.prorate?'checked':''}>סכום יחסי לפי ימי התקופה בחודש</label><p class="note wide">אם ידוע לך סכום מדויק לתקופה חלקית, השאר חישוב יחסי לא מסומן והזן את הסכום הרצוי.</p></div>`,(fd,d)=>{const amount=Number(fd.get('amount')),startDate=String(fd.get('startDate')||''),endDate=String(fd.get('endDate')||'');if(!Number.isFinite(amount)||amount<0||amount>10000000||(startDate&&!validDate(startDate))||(endDate&&!validDate(endDate))||(startDate&&endDate&&startDate>endDate)){toast('תאריכים או סכום שגויים.',true);return;}state.itemSchedules[itemId]??=[];const row={id:periodId||uid(),amount,startDate,endDate,prorate:fd.has('prorate')};if(old)state.itemSchedules[itemId]=state.itemSchedules[itemId].map(e=>e.id===periodId?row:e);else state.itemSchedules[itemId].push(row);persist();d.close();render();toast('תקופת התוקף נשמרה.');});}

function categoryModal(id=null){const old=CAT_BY_ID[id];openModal(old?'שינוי שם קטגוריה':'קטגוריה חדשה',`<div class="control"><label for="categoryLabel">שם הקטגוריה</label><input id="categoryLabel" name="name" required maxlength="80" value="${esc(old?.name||'')}" placeholder="למשל ביטוחים"></div>`,(fd,d)=>{const name=String(fd.get('name')||'').trim();if(!name){toast('יש להזין שם קטגוריה',true);return;}if(!old){state.categories.push({id:createCatalogId('cat'),name,icon:'◇',items:[]});}else{old.name=name;}syncCatalog();persist();d.close();render();toast('הקטגוריה נשמרה.');});}
function itemModal(id=null,categoryId=null){
 const item=ITEM_BY_ID[id],cat=item?CATEGORIES.find(c=>c.items.some(i=>i.id===id)):CAT_BY_ID[categoryId];if(!cat)return;
 const installment=item?state.itemInstallments?.[item.id]:null;const once=!!item&&(state.itemFrequency[item.id]?.frequency==='once'||!!installment);
 const periods=item?(state.itemSchedules[item.id]||[]):[];
 const editable=periods.length===1?periods[0]:null;
 const startDate=editable?.startDate||'',endDate=editable?.endDate||'';
 openModal(item?'עריכת פריט הוצאה':'פריט הוצאה חדש',`<div class="form-grid">
 <label class="control wide"><span class="control-label">שם פריט ההוצאה</span><input name="name" required maxlength="100" value="${esc(item?.name||'')}" placeholder="שם ההוצאה"></label>
 ${!item?`<label class="control wide"><span class="control-label">סכום ההוצאה ₪</span><input name="amount" type="text" inputmode="decimal" class="select-amount" value="0" required></label>`:''}
 <label class="control wide"><span class="control-label">סוג ההוצאה</span><select name="frequency" data-expense-frequency><option value="monthly" ${!once?'selected':''}>הוצאה חוזרת</option><option value="once" ${once?'selected':''}>הוצאה חד־פעמית</option></select></label>
 <div class="expense-frequency-pane wide" data-frequency-pane="monthly" ${once?'hidden':''}><div class="form-grid"><label class="control"><span class="control-label">תאריך התחלה (לא חובה)</span><input name="startDate" type="date" value="${esc(startDate)}"></label><label class="control"><span class="control-label">תאריך סיום (לא חובה)</span><input name="endDate" type="date" value="${esc(endDate)}"></label></div><p class="tiny">ללא תאריכים — ההוצאה תחזור בכל חודש. ניתן גם להגדיר תקופות שונות בהמשך.</p>${periods.length>1?'<p class="note">לפריט הוצאה זה קיימות כמה תקופות. תאריכים שלהן מנוהלים בכפתור ״תקופות״, ולא ישתנו כאן.</p>':''}</div>
 <div class="expense-frequency-pane wide" data-frequency-pane="once" ${once?'':'hidden'}><div data-once-date-pane ${installment?'hidden':''}><label class="control"><span class="control-label">תאריך ההוצאה החד־פעמית</span><input name="onceDate" type="date" value="${esc(once?(state.itemFrequency[item.id]?.date||installment?.startDate||currentMonth+'-01'):currentMonth+'-01')}"></label></div><p class="tiny">ללא פריסה, ההוצאה נרשמת פעם אחת בתאריך שבחרת. עם פריסה, ממלאים למטה את מועד התשלום הראשון והאחרון, ורק החלק המתאים נכלל בכל חודש. באשראי, החיוב בבנק לפי יום החיוב של הכרטיס.</p></div>
 ${installmentFormHtml(installment)}
 </div>`,(fd,d)=>{
  const name=String(fd.get('name')||'').trim(),frequency=String(fd.get('frequency')||'monthly');
  const amount=item?null:parseExpenseAmount(fd.get('amount'));
  const onceDate=String(fd.get('onceDate')||''),start=String(fd.get('startDate')||''),end=String(fd.get('endDate')||'');
  let installmentPlan;try{installmentPlan=installmentForForm(fd)}catch(err){toast(err.message,true);return;}
  // Recurrence dates apply only to monthly expenses. Installment dates are a separate payment schedule.
  if(!name||!['monthly','once'].includes(frequency)||(!item&&amount===null)||(frequency==='once'&&!installmentPlan&&!validDate(onceDate))||(frequency==='monthly'&&((start&&!validDate(start))||(end&&!validDate(end))||(start&&end&&start>end)))){toast('יש להזין שם, סכום ותאריכים תקינים.',true);return;}
  if(installmentPlan&&frequency!=='once'){toast('יש לבחור הוצאה חד־פעמית לצורך פריסה לתשלומים.',true);return;}
  const previousConfiguredAmount=item?editableItemAmount(currentMonth,item.id):amount;
  const targetId=item?.id||createCatalogId('item');
  if(item)item.name=name;else{cat.items.push({id:targetId,name,base:amount,max:Math.max(1000,Math.ceil(amount/500)*500),step:50});state.budget[targetId]=amount;state.starterBudget[targetId]=amount;}
  if(installmentPlan){state.itemInstallments[targetId]=installmentPlan;delete state.itemSchedules[targetId];for(const v of Object.values(state.overrides))delete v[targetId];}else delete state.itemInstallments[targetId];
  if(frequency==='once'){
   // No legacy schedules are removed: restoring monthly later remains possible.
   if(item&&state.itemFrequency[targetId]?.frequency!=='once')state.budget[targetId]=previousConfiguredAmount;
   state.itemFrequency[targetId]={frequency:'once',date:installmentPlan?.startDate||onceDate};
  }else{
   delete state.itemFrequency[targetId];
   const existing=state.itemSchedules[targetId]||[];
   if(existing.length<=1){
    if(start||end){const prior=existing[0];state.itemSchedules[targetId]=[{id:prior?.id||uid(),amount:prior?.amount??state.budget[targetId]??0,startDate:start,endDate:end,prorate:prior?.prorate||false}];}
    else if(existing.length===1){state.budget[targetId]=existing[0].amount;delete state.itemSchedules[targetId];}
   }
  }
  syncCatalog();persist();d.close();render();toast('פריט ההוצאה נשמר.');
 });
}
function parseExpenseAmount(raw){
 let text=String(raw??'').trim().replace(/[₪\s]/g,'');
 if(/^\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(text))text=text.replace(/,/g,'');
 else text=text.replace(',', '.');
 if(!/^\d+(?:\.\d{1,2})?$/.test(text))return null;
 const n=Number(text);return Number.isFinite(n)&&n>=0&&n<=10000000?n:null;
}
async function deleteItem(id){const item=ITEM_BY_ID[id];if(!item||['rent','michalsave'].includes(id))return;const count=state.transactions.filter(t=>t.itemId===id).length;if(!await appConfirm(`למחוק את פריט ההוצאה "${item.name}"?${count?'\n'+count+' עסקאות משויכות יישמרו ויועברו ל"אחר".':''}\nסכומי התכנון של פריט ההוצאה יוסרו. מומלץ לבצע גיבוי קודם.`))return;for(const c of CATEGORIES)c.items=c.items.filter(i=>i.id!==id);delete state.budget[id];delete state.starterBudget[id];delete state.itemSchedules[id];delete state.itemFrequency[id];delete state.itemInstallments[id];delete state.itemPayments[id];for(const month of Object.values(state.overrides))delete month[id];for(const t of state.transactions)if(t.itemId===id)t.itemId='other';syncCatalog();persist();render();toast('פריט ההוצאה הוסר; עסקאות קיימות נשמרו.');}
async function deleteCategory(id){const c=CAT_BY_ID[id];if(!c)return;if(c.items.some(i=>['rent','michalsave'].includes(i.id))){toast('קטגוריה זו מכילה פריט הוצאה מוגן. אפשר לשנות את שמה, אך לא למחוק אותה.',true);return;}const count=state.transactions.filter(t=>c.items.some(i=>i.id===t.itemId)).length;if(!await appConfirm(`למחוק את הקטגוריה "${c.name}" ואת ${c.items.length} פריטי ההוצאה שלה?${count?'\n'+count+' עסקאות היסטוריות יישמרו ויסווגו כ"אחר".':''}\nהפעולה מוחקת גם את תקציבי פריטי ההוצאה. מומלץ לבצע גיבוי קודם.`))return;const ids=new Set(c.items.map(i=>i.id));state.categories=state.categories.filter(x=>x.id!==id);for(const item of c.items){delete state.budget[item.id];delete state.starterBudget[item.id];delete state.itemSchedules[item.id];delete state.itemFrequency[item.id];delete state.itemInstallments[item.id];delete state.itemPayments[item.id];}for(const month of Object.values(state.overrides))for(const id of ids)delete month[id];for(const t of state.transactions)if(ids.has(t.itemId))t.itemId='other';expanded.delete(id);syncCatalog();persist();render();toast('הקטגוריה הוסרה; עסקאות קיימות נשמרו.');}
function exportBackup(){const payload=JSON.stringify({...state,exportedAt:new Date().toISOString()},null,2);const blob=new Blob([payload],{type:'application/json;charset=utf-8'});const href=URL.createObjectURL(blob);const a=document.createElement('a');a.href=href;a.download='maslul-budget-backup-'+todayISO()+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(href),1000);toast('קובץ הגיבוי נוצר. שמור אותו במקום בטוח.');}
async function importBackup(input){const file=input?.files?.[0];if(!file)return;if(file.size>12e6){toast('קובץ גדול מדי.',true);return;}if(!await appConfirm('השחזור יחליף את כל התקציב והפעולות הנוכחיים. להמשיך?')){input.value='';return;}try{const obj=JSON.parse(await file.text());const imported=sanitize(obj);state=imported;syncCatalog();persist();currentMonth=todayISO().slice(0,7);forecastStart=state.settings.planningStart;setting('activeMonth').value=currentMonth;render();toast('הגיבוי שוחזר בהצלחה.')}catch(e){console.error(e);toast('השחזור נכשל: קובץ JSON אינו תקין או שאינו תואם.',true)}input.value='';}
function safeAIPrompt(sendNotes,personal,scope=insightScope,month=insightMonth){
 const months=scope==='all'?getForecast().map(f=>f.month):[month];
 const forecasts=months.map(m=>projection(m));
 const scopedTransactions=projectedTransactions().filter(t=>months.includes(t.date.slice(0,7)));
 const transactionsSummary=Object.values(scopedTransactions.reduce((obj,t)=>{
  const category=ITEM_BY_ID[t.itemId]?.name||'אחר',kind=t.sourceKind||'manual',status=t.status||'posted',k=t.date.slice(0,7)+'|'+t.type+'|'+category+'|'+kind+'|'+status;
  if(!obj[k])obj[k]={month:t.date.slice(0,7),type:t.type,category,sourceKind:kind,status,amount:0,count:0};
  obj[k].amount+=t.amount;obj[k].count++;return obj;
 },{}));
 const monthsBudget=months.map(m=>({month:m,plannedIncome:projection(m).income,plannedExpenses:projection(m).allocated,monthlyFreeCash:projection(m).net,unreconciledRecordedExpenses:actual(m).expenses,unverifiedTransactionCount:actual(m).count,expenseCategories:CATEGORIES.map(c=>({name:c.name,total:c.items.reduce((sum,i)=>sum+baseItem(m,i.id),0)})).filter(x=>x.total>0)}));
 const scopeEvents=state.events.filter(e=>scope==='all'||eventsFor(month).some(x=>x.id===e.id));
 const payload={analysisScope:scope==='all'?'all-budget':'selected-month',analysisMonth:scope==='month'?month:null,forecastStart:forecastStart,forecastLength:state.settings.forecastLength,monthlySnapshots:monthsBudget,incomeSources:state.incomeSources.map(s=>({kind:s.kind,monthlyAmount:s.amount,frequency:s.frequency,startDate:s.startDate,endDate:s.endDate,paymentLagMonths:sourceLag(s)})),regularExpenses:CATEGORIES.map(c=>({category:c.name,items:c.items.map(i=>({id:i.id,name:i.name,monthlyBudget:state.itemFrequency[i.id]?.frequency==='once'?0:(state.budget[i.id]??0),frequency:state.itemFrequency[i.id]?.frequency||'monthly',oneTimeDate:state.itemFrequency[i.id]?.date||'',oneTimeAmount:state.itemFrequency[i.id]?.frequency==='once'?(state.budget[i.id]??0):0,payment:itemPayment(i.id),schedules:state.itemSchedules[i.id]||[]}))})),specialEvents:scopeEvents.map(e=>({type:e.type,amount:scope==='month'&&isSplitEvent(e)?e.parts.filter(p=>p.date.slice(0,7)===month).reduce((n,p)=>n+p.amount,0):e.amount,month:scope==='month'?month:e.month,recurrence:e.recurrence,parts:isSplitEvent(e)?e.parts.filter(p=>scope==='all'||p.date.slice(0,7)===month).map(p=>({date:p.date,amount:p.amount,...(sendNotes?{note:p.note}:{})})):[],...(sendNotes?{note:e.note}:{})})),unverifiedRecordedTransactionsByCategory:transactionsSummary,...(sendNotes?{transactionNotes:scopedTransactions.slice(-100).filter(t=>t.note).map(t=>({month:t.date.slice(0,7),type:t.type,amount:t.amount,note:t.note}))}:{})};
 return `אתה מסייע לתכנון תקציב אישי. כתוב בעברית פשוטה, ידידותית, ברורה ומדויקת, בלי ז'רגון פיננסי ובלי הטפות לחסכנות. ${scope==='month'?'נתח אך ורק את חודש '+monthName(month)+'; חודשי עבודה אחרים אינם מוקד הניתוח.':'נתח את התקציב הכולל ואת החודשים בחלון התחזית, כולל שינויים לאורך הזמן.'}
 החזר תשובה קצרה ומובנית בטקסט רגיל עם פריטי ההוצאה הבאים, בסדר הזה:
 1. "בשורה התחתונה" — מה מתוכנן להיכנס, לצאת ולהישאר (לכל התקציב: סה״כ וטווח חודשי), במשפטים פשוטים.
 2. "איפה כדאי לשים לב" — 2–4 נקודות משמעותיות ומבוססות נתונים, כולל חודשים חריגים והוצאות מיוחדות מתוכננות אם יש.
 3. "מה אפשר לעשות" — 3–5 הצעות מעשיות ומדורגות, כל אחת עם פעולה מדויקת והשפעה כספית משוערת והסבר למה; אם אין מספיק נתונים לאמוד חיסכון, ציין זאת במקום להמציא סכום.
 4. "מה כדאי לבדוק בחודש הבא" — עד שתי בדיקות קצרות.
 הפרד בבירור בין סכומים מתוכננים לבין תנועות שנקלטו. כל שדה unverified או unreconciled הוא מידע חלקי, שעשוי להכיל עסקאות כפולות בין כרטיס לאשראי בבנק או להיות חסר: אל תחשב ממנו חריגה, חיסכון בפועל או מסקנה על ביצוע מלא. אין הוכחה שכל ההוצאות נקלטו, ואל תנסה להסיק התאמות חסרות בעצמך. אל תציע למחוק הוצאות הכרחיות או הפרשות לילדים. התחשב בתקופות תוקף, שכר שנכנס בחודש שאחרי העבודה, הוצאות חופשה מפוצלות לחודשים, ובשינויי תכנון. אל תיתן ייעוץ השקעות אישי. אל תמציא עובדות או סכומים. השתמש במספרים עם ₪, ובשמות הקטגוריות הקיימות. אל תחזור על מידע מזהה או הערות אישיות שלא לצורך.
 הנחיות נוספות מהמשתמש: ${personal||'אין'}
 נתוני האפליקציה: ${JSON.stringify(payload)}`;
}
function waitAI(ms){return new Promise(resolve=>setTimeout(resolve,ms))}
async function requestAI(key,contents,generationConfig,model=state.settings.model){
 const safeModel=/^[a-zA-Z0-9._-]{2,80}$/.test(model)?model:'gemini-3.5-flash-lite';
 const endpoint=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(safeModel)}:generateContent`;
 for(let attempt=0;attempt<3;attempt++){
  let response,data;
  try{
   const ctl=new AbortController(),timeout=setTimeout(()=>ctl.abort(),45000);
   try{response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},signal:ctl.signal,body:JSON.stringify({contents,generationConfig})})}finally{clearTimeout(timeout)}
   try{data=await response.json()}catch{throw Error('AI החזיר תשובה שאינה JSON. נסה שוב מאוחר יותר.')}
  }catch(err){if(err.name==='AbortError')throw Error('הבקשה ל־AI נמשכה זמן רב מדי. אפשר לנסות שוב.');throw err}
  if(response.ok)return data;
  const status=response.status;const details=String(data?.error?.message||'').slice(0,200);
  // Transient overload: bounded exponential backoff, no automatic upgrade to a paid/heavier model.
  if((status===503||status===500||status===502||status===504||status===429)&&attempt<2){await waitAI(1200*Math.pow(2,attempt));continue;}
  if(status===503||status===500||status===502||status===504)throw Error('שירות AI עמוס כרגע ('+status+'). נסה שוב מאוחר יותר או בחר מודל אחר בהגדרות.');
  if(status===429)throw Error('חרגת ממגבלת הבקשות או מכסת השימוש ב־AI (429). בדוק את המכסה ב־Google AI Studio.');
  if(status===401||status===403)throw Error('מפתח ה־API אינו מורשה (שגיאה '+status+'). בדוק את ההרשאות והמפתח ב־AI Studio.');
  if(status===404)throw Error('המודל '+safeModel+' אינו זמין לפרויקט שלך (404). בחר מודל אחר בהגדרות.');
  throw Error('שגיאת AI '+status+': '+details);
 }
}
async function runAI(){
 if(geminiRunning)return;
 const key=setting('geminiKey')?.value.trim()||geminiKey;
 if(!key){googleAccountHelpModal();toast('נדרש מפתח AI אישי כדי להריץ ניתוח.',true);return;}
 const remember=!!setting('rememberAIKey')?.checked;
 const notes=!!setting('sendNotes')?.checked;
 const personal=setting('insightPrompt')?.value.trim().slice(0,2000)||'';insightPromptText=personal;insightIncludeNotes=notes;
 const scope=insightScope,month=insightMonth;
 const textPrompt=safeAIPrompt(notes,personal,scope,month);
 if(!await appConfirm('לשלוח ל־Google AI נתונים לצורך ניתוח '+(scope==='month'?monthName(month):'חלון התחזית')+'? יישלח סיכום תקציב, סכומים וקטגוריות. שמות מקורות ההכנסה ושמות האירועים אינם כלולים.'+(notes?' הערות חופשיות ייכללו.':' הערות חופשיות לא ייכללו.')))return;
 rememberAIKey(remember,key);
 geminiRunning=true;
 renderInsights();
 const btn=setting('geminiAnalyze');if(btn)btn.textContent='AI מנתח את הנתונים...';
 try{
  const data=await requestAI(key,[{role:'user',parts:[{text:textPrompt}]}],{temperature:.45,maxOutputTokens:2600});
  const answer=data?.candidates?.flatMap(c=>c.content?.parts||[]).map(p=>p.text||'').filter(Boolean).join('\n').trim();
  if(!answer)throw Error('לא התקבלה תשובת טקסט. אפשר לבחור מודל אחר בהגדרות.');
  if(data?.candidates?.[0]?.finishReason==='MAX_TOKENS')throw Error('ניתוח AI נקטע לפני סיומו; הוא לא נשמר כניתוח מלא.');
  state.insightHistory.unshift({scope,month,date:new Date().toISOString(),text:answer.slice(0,15000)});
  state.insightHistory=state.insightHistory.slice(0,8);persist();toast('הניתוח הסתיים ונשמר במכשיר.');
 }catch(err){console.error(err);toast('לא ניתן לקבל ניתוח: '+String(err.message||err).slice(0,200),true);}
 finally{geminiRunning=false;renderInsights();}
}

function saveSettings(){
 const start=setting('startMonth').value,model=setting('geminiModel').value.trim(),length=Number(setting('settingsForecastCount').value);
 if(!validMonth(start)||!Number.isInteger(length)||length<1||length>24||!(/^[a-zA-Z0-9._-]{2,80}$/.test(model))){toast('נא לבדוק תחילת תחזית, מספר חודשים ושם מודל AI.',true);return;}
 state.settings.planningStart=start;state.settings.forecastLength=length;state.settings.model=model;forecastStart=start;
 persist();toast('ההגדרות נשמרו.');render();
}
function monthEdit(month){currentMonth=month;setting('activeMonth').value=month;budgetMode='month';navigate('budget');toast('עורכים כעת התאמות עבור '+monthName(month));}

// A dedicated Google guide can be shown on top of a search-answer dialog.
// Closing it leaves the underlying answer (including scroll position) intact.
function googleAccountHelpModal(){
 const guide=setting('googleGuideModal');
 if(guide.open)return;
 const key=geminiKey||loadAIKey();
 setting('googleGuideKey').value=key;
 setting('googleGuideRemember').checked=!!loadAIKey();
 guide.showModal();
}
function closeGoogleAccountGuide(){
 const guide=setting('googleGuideModal');
 if(guide.open)guide.close();
}
function saveGoogleGuideKey(){
 const value=setting('googleGuideKey').value.trim();
 if(!value){toast('יש להדביק מפתח API לפני השמירה.',true);setting('googleGuideKey').focus();return;}
 // Same key/storage behavior as the insights settings. Never export the secret.
 rememberAIKey(setting('googleGuideRemember').checked,value);
 closeGoogleAccountGuide();
 if(currentPage==='insights')renderInsights();
 toast(setting('googleGuideRemember').checked?'מפתח AI נשמר במכשיר הזה.':'מפתח AI הוגדר להפעלה הנוכחית.');
}
function markIntroSeen(){try{localStorage.setItem(INTRO_KEY,'1')}catch{}}
function onboardingModal(step=0){
 const steps=[
  {title:'ברוכים הבאים למסלול',body:`<p>מסלול עוזר לך לתכנן הכנסות והוצאות, לראות תחזית חודשים קדימה ולבדוק כמה כסף נשאר.</p><div class="note">הנתונים נשמרים במכשיר הזה בלבד. לא צריך ליצור משתמש ולא נדרשת התחברות לבנק.</div><p>מומלץ להתחיל בייבוא תדפיסי עו״ש וכרטיסי אשראי, או ליצור תקציב ידנית.</p>`},
  {title:'מכניסים נתונים ובודקים אותם',body:`<ol class="setup-steps"><li>עוברים ללשונית <strong>ייבוא</strong> ובוחרים עו״ש, אשראי של חודשים קודמים או פעולות האשראי של החודש הנוכחי.</li><li>מעלים קובץ CSV / TSV. קובצי PDF וצילומי מסך דורשים מפתח AI ואישור לשלוח אותם ל־Google.</li><li>בודקים את סקירת המסמך ומאשרים קליטה אחת. אין צורך באישור ידני לכל תנועה. בייבוא חוזר תנועות שכבר נקלטו אינן אמורות להיקלט שוב.</li><li>בלשונית <strong>תקציב</strong> עורכים סכומים, מוסיפים משכורות, פריטי הוצאה וקטגוריות.</li></ol>`},
  {title:'מחברים תובנות ושומרים גיבוי',body:`<ol class="setup-steps"><li>פותחים <strong>תובנות</strong> ולוחצים על חיבור Google / יצירת מפתח AI.</li><li>בוחרים את חשבון Google הרצוי ויוצרים מפתח באתר הרשמי של Google AI Studio.</li><li>מעתיקים את המפתח למסלול ומאשרים כל ניתוח לפני שליחת הנתונים ל־Google.</li><li>פותחים <strong>הגדרות</strong> ומורידים גיבוי JSON כדי לא לאבד נתונים אם הדפדפן יימחק או המכשיר יוחלף.</li></ol>`}
 ];
 const s=steps[Math.max(0,Math.min(step,steps.length-1))];
 openModal(s.title,`<div class="walkthrough"><div class="walkthrough-progress" aria-label="שלב ${step+1} מתוך ${steps.length}">${steps.map((_,i)=>`<span class="${i===step?'active':''}" aria-hidden="true"></span>`).join('')}<span class="tiny">${step+1} / ${steps.length}</span></div>${s.body}</div>`,(_,dialog)=>{
  if(step<steps.length-1){modalSwitch(()=>onboardingModal(step+1));return;}
  dialog.close();markIntroSeen();
  navigate('imports');
  toast('אפשר להתחיל בייבוא תדפיס, או לערוך תקציב ידנית.');
 },step===steps.length-1?'סיום · עבור לייבוא':'המשך');
 setting('modal').dataset.mode='onboarding';
 const cancel=setting('modalCancel');cancel.textContent=step===0?'דלג על ההסבר':'הקודם';
 cancel.onclick=(e)=>{e.preventDefault();if(step>0){modalSwitch(()=>onboardingModal(step-1))}else{closeAppModal();}};
}

function helpModal(){
 const html=HELP_ARTICLES.map(a=>`<details class="help-topic"><summary>${esc(a.title)}</summary><div class="help-answer">${esc(a.body)}</div></details>`).join('');
 openModal('איך משתמשים במסלול?',`<div class="settings-list">${html}</div>`,(_,d)=>d.close(),'הבנתי');
}

async function onClick(e){
 const question=e.target.closest('[data-decision-question]');
 if(question){decisionQuestion=question.dataset.decisionQuestion;renderInsights();setting('decisionDetails')?.scrollIntoView({block:'start',behavior:'instant'});return;}
 const closeQuestion=e.target.closest('[data-decision-close]');
 if(closeQuestion){decisionQuestion='';renderInsights();return;}
 const deleteAnalysis=e.target.closest('[data-insight-delete]');
 if(deleteAnalysis){
  // Buttons inside <summary> must not toggle their parent drawer.
  e.preventDefault();e.stopPropagation();
  const index=Number(deleteAnalysis.dataset.insightDelete);
  if(!Number.isInteger(index)||index<0||index>=state.insightHistory.length)return;
  if(await appConfirm('למחוק את הניתוח השמור? הפעולה לא משנה את התקציב או העסקאות.')){
   state.insightHistory.splice(index,1);persist();renderInsights();toast('הניתוח נמחק.');
  }
  return;
 }
 const b=e.target.closest('[data-navto], [data-action], [data-togglecat], [data-budgetmode], [data-resetitem], [data-edittrans], [data-deletetrans], [data-editevent], [data-deleteevent], [data-foreedit], [data-additem], [data-edititem], [data-delitem], [data-editcat], [data-delcat], [data-incomeedit], [data-incomedel], [data-periodadd], [data-periodedit], [data-perioddel], [data-itemperiod], [data-eventparts], [data-partadd], [data-partedit], [data-partdel], [data-partrevert], [data-cardedit], [data-carddefault], [data-carddelete], [data-itempayment]');if(!b)return;
 if(b.dataset.eventparts){eventPartsModal(b.dataset.eventparts);return;}
 if(b.dataset.partadd){modalSwitch(()=>eventPartModal(b.dataset.partadd));return;}
 if(b.dataset.partedit){const [eid,pid]=b.dataset.partedit.split('|');modalSwitch(()=>eventPartModal(eid,pid));return;}
 if(b.dataset.partdel){const [eid,pid]=b.dataset.partdel.split('|');const ev=state.events.find(e=>e.id===eid);if(!ev)return;if(!await appConfirm('למחוק רכיב זה מההוצאה המיוחדת? התשלום יוסר מהתחזית, אך תקציב האירוע הכולל יישאר.'))return;ev.parts=(ev.parts||[]).filter(x=>x.id!==pid);ev.splitMode=true;persist();render();if(setting('modal').open)modalSwitch(()=>eventPartsModal(eid));toast('הרכיב הוסר מהתחזית.');return;}
 if(b.dataset.partrevert){const eid=b.dataset.partrevert,ev=state.events.find(x=>x.id===eid);if(!ev)return;if(!await appConfirm('לחזור לאירוע בסכום יחיד? כל הרכיבים המפורטים יימחקו, וכל הסכום יחול בחודש המקורי של האירוע.'))return;ev.parts=[];ev.splitMode=false;persist();render();if(setting('modal').open)modalSwitch(()=>eventPartsModal(eid));toast('ההוצאה חזרה לסכום יחיד.');return;}
 if(b.dataset.incomeedit){modalSwitch(()=>incomeSourceModal(b.dataset.incomeedit));return;}
 if(b.dataset.incomedel){if(await appConfirm('למחוק את מקור ההכנסה?')){state.incomeSources=state.incomeSources.filter(s=>s.id!==b.dataset.incomedel);persist();render();modalSwitch(incomeHubModal);}return;}
 if(b.dataset.itemperiod){periodHubModal(b.dataset.itemperiod);return;}
 if(b.dataset.cardedit){creditCardModal(b.dataset.cardedit);return;}
 if(b.dataset.carddefault){if(creditCardById(b.dataset.carddefault)){state.defaultCardId=b.dataset.carddefault;persist();render();toast('כרטיס ברירת המחדל עודכן.');}return;}
 if(b.dataset.carddelete){await removeCreditCard(b.dataset.carddelete);return;}
 if(b.dataset.itempayment){itemPaymentModal(b.dataset.itempayment);return;}
 if(b.dataset.periodadd){modalSwitch(()=>itemPeriodModal(b.dataset.periodadd));return;}
 if(b.dataset.periodedit){const [id,pid]=b.dataset.periodedit.split('|');modalSwitch(()=>itemPeriodModal(id,pid));return;}
 if(b.dataset.perioddel){const [id,pid]=b.dataset.perioddel.split('|');if(await appConfirm('למחוק את התקופה?')){state.itemSchedules[id]=(state.itemSchedules[id]||[]).filter(e=>e.id!==pid);persist();render();modalSwitch(()=>periodHubModal(id));}return;}
 if(b.dataset.navto){navigate(b.dataset.navto);if(b.dataset.openarchive!==undefined)requestAnimationFrame(()=>setting('importedStatements')?.scrollIntoView({block:'start',behavior:'smooth'}));return;}
 if(b.dataset.togglecat){expanded.has(b.dataset.togglecat)?expanded.delete(b.dataset.togglecat):expanded.add(b.dataset.togglecat);renderBudget();return;}
 if(b.dataset.budgetmode){budgetMode=b.dataset.budgetmode;renderBudget();return;}
 if(b.dataset.resetitem){resetItem(b.dataset.resetitem);return;}
 
 if(b.dataset.edittrans){modalSwitch(()=>transactionModal(b.dataset.edittrans));return;}
 if(b.dataset.deletetrans){if(await appConfirm('למחוק את הפעולה?')){state.transactions=state.transactions.filter(t=>t.id!==b.dataset.deletetrans);persist();render();if(setting('modal').open)modalSwitch(transactionsLogModal);toast('התנועה נמחקה.')}return;}
 if(b.dataset.editevent){eventModal(b.dataset.editevent);return;}
 if(b.dataset.deleteevent){if(await appConfirm('למחוק את האירוע?')){state.events=state.events.filter(t=>t.id!==b.dataset.deleteevent);persist();render();toast('האירוע נמחק.')}return;}
 if(b.dataset.foreedit){monthEdit(b.dataset.foreedit);return;}
 if(b.dataset.additem){itemModal(null,b.dataset.additem);return;}
 if(b.dataset.edititem){itemModal(b.dataset.edititem);return;}
 if(b.dataset.delitem){await deleteItem(b.dataset.delitem);return;}
 if(b.dataset.editcat){categoryModal(b.dataset.editcat);return;}
 if(b.dataset.delcat){await deleteCategory(b.dataset.delcat);return;}
 switch(b.dataset.action){case 'new-card':creditCardModal();break;case 'income-hub':incomeHubModal();break;case 'open-expenses':expensesOverviewModal();break;case 'expenses-to-budget':setting('modal').close();navigate('budget');break;case 'balance-breakdown':balanceBreakdownModal();break;case 'edit-opening':openingBalanceModal();break;case 'balance-to-budget':setting('modal').close();navigate('budget');break;case 'google-key-help':googleAccountHelpModal();break;case 'show-onboarding':onboardingModal(0);break;case 'gemini-clear-key':removeAIKey();break;case 'add-salary':modalSwitch(()=>incomeSourceModal(null,'salary'));break;case 'add-other-income':modalSwitch(()=>incomeSourceModal(null,'other'));break;case 'income-event':modalSwitch(()=>{eventModal();setting('evType').value='income';});break;case 'add-category':categoryModal();break;case 'new-transaction':if(setting('modal').open)modalSwitch(()=>transactionModal());else transactionModal();break;case 'transactions-log':transactionsLogModal();break;case 'transactions-to-import':setting('modal').close();navigate('imports');break;case 'new-event':eventModal();break;case 'expand-all':CATEGORIES.forEach(c=>expanded.add(c.id));renderBudget();break;case 'collapse-all':expanded.clear();renderBudget();break;case 'refresh-code':refreshMaslulCode();break;case 'export':exportBackup();break;case 'apply-income':setIncome(setting('budgetIncome').value);toast('המשכורת עודכנה.');break;case 'extra-income':eventModal();setting('evType').value='income';setting('evTitle').focus();break;case 'clear-month':if(await appConfirm('למחוק את כל התאמות התקציב לחודש הזה?')){delete state.overrides[currentMonth];persist();render();}break;case 'reset-baseline':if(await appConfirm('לאפס את כל סכומי התקציב הקבועים לברירות המחדל המקוריות?')){state.budget=Object.fromEntries(ITEMS.map(i=>[i.id,state.starterBudget?.[i.id]??i.base]));state.income=state.starterIncome??0;persist();render();}break;case 'save-settings':saveSettings();break;case 'ai-preview':showAIPreview();break;case 'gemini':runAI();break;case 'clear-data':if(await appConfirm('פעולה בלתי הפיכה במכשיר הזה. כל הנתונים יימחקו. האם ברצונך להמשיך?')&&await appConfirm('אישור אחרון: האם מחקת או גיבית את כל הנתונים שאתה צריך?')){state=initial();syncCatalog();persist();currentMonth=todayISO().slice(0,7);forecastStart=currentMonth;setting('activeMonth').value=currentMonth;render();toast('הנתונים אופסו.')}break;}}
function syncExpenseFrequencyUI(form){
 if(!form)return;
 const freq=form.querySelector('[data-expense-frequency]');
 if(!freq)return;
 const type=freq.value;
 const installmentToggle=form.querySelector('[data-plan-toggle]');
 // A monthly recurring expense cannot carry a one-off installment plan.
 if(type==='monthly'&&installmentToggle?.checked){installmentToggle.checked=false;}
 const installment=!!installmentToggle?.checked;
 for(const pane of form.querySelectorAll('[data-frequency-pane]'))pane.hidden=pane.dataset.frequencyPane!==type;
 const onceDate=form.querySelector('[data-once-date-pane]');
 if(onceDate)onceDate.hidden=type!=='once'||installment;
 const installmentFields=form.querySelector('[data-installment-fields]');
 if(installmentFields)installmentFields.hidden=!installment;
}
function onChange(e){const b=e.target;if(b.matches('[data-payment-method],select[name="paymentMethod"]')){const form=b.closest('form');if(form){form.querySelectorAll('[data-card-picker]').forEach(x=>x.hidden=b.value!=='card');form.querySelectorAll('[data-noncard-settings]').forEach(x=>x.hidden=b.value==='card');}return;}else if(b.id==='activeMonth'&&validMonth(b.value)){currentMonth=b.value;render();}else if(b.id==='forecastMonth'&&validMonth(b.value)){forecastStart=b.value;state.settings.planningStart=b.value;persist();renderForecast();}else if(b.id==='forecastCount'){const n=Number(b.value);if(Number.isInteger(n)&&n>=1&&n<=24){state.settings.forecastLength=n;persist();renderForecast();}}else if(b.id==='insightScope'){insightScope=b.value==='all'?'all':'month';const typedKey=setting('geminiKey')?.value.trim();if(typedKey)geminiKey=typedKey;insightPromptText=setting('insightPrompt')?.value||insightPromptText;insightIncludeNotes=!!setting('sendNotes')?.checked;renderInsights();}else if(b.id==='insightMonth'&&validMonth(b.value)){insightMonth=b.value;const typedKey=setting('geminiKey')?.value.trim();if(typedKey)geminiKey=typedKey;insightPromptText=setting('insightPrompt')?.value||insightPromptText;insightIncludeNotes=!!setting('sendNotes')?.checked;renderInsights();}else if(b.id==='sendNotes'){insightIncludeNotes=b.checked;}else if(b.id==='importFile'){importBackup(b);}else if(b.id==='sourceAmount'){const slider=setting('sourceSlider');if(slider){slider.max=Math.max(40000,Math.ceil(Number(b.value)/10000)*10000);slider.value=b.value;}}else if(b.id==='budgetIncome'){setIncome(b.value);}else if(b.id==='incomeRange'){setIncome(b.value);}else if(b.matches('[data-plan-toggle], [data-plan-equal]')){const container=b.closest('[data-installment-editor]');if(container){container.querySelector('[data-installment-fields]').hidden=!container.querySelector('[data-plan-toggle]').checked;container.querySelector('[data-plan-interest-pane]').hidden=container.querySelector('[data-plan-equal]').checked;if(b.matches('[data-plan-toggle]')){const form=container.closest('form');const freq=form?.querySelector('[data-expense-frequency]');if(b.checked&&freq)freq.value='once';if(!b.checked&&freq?.value==='once'){const date=form.querySelector('[name="onceDate"]'),first=form.querySelector('[data-plan-start]');if(date&&first&&validDate(first.value))date.value=first.value;}syncExpenseFrequencyUI(form);}}return;}else if(b.matches('[data-expense-frequency]')){syncExpenseFrequencyUI(b.closest('form'));}else if(b.matches('[data-plan-count], [data-plan-start]')){const root=b.closest('[data-installment-editor]');const n=Number(root?.querySelector('[data-plan-count]')?.value),start=root?.querySelector('[data-plan-start]')?.value;if(Number.isInteger(n)&&n>=2&&n<=120&&validDate(start))root.querySelector('[data-plan-end]').value=addInstallmentMonths(start,n-1);return;}else if(b.matches('[data-amountinput]')){const n=parseExpenseAmount(b.value);if(n===null){toast('הזן סכום תקין בין 0 ל־10 מיליון ₪.',true);b.value=String(editableItemAmount(currentMonth,b.dataset.amountinput));return;}setBudget(b.dataset.amountinput,n);}}
function onInput(e){const b=e.target;if(b.id==='insightPrompt'){insightPromptText=b.value.slice(0,2000);return;}if(b.id==='sourceSlider'){const n=setting('sourceAmount');if(n)n.value=b.value;return;}if(b.id==='incomeRange'){const n=setting('budgetIncome');if(n)n.value=b.value;const display=setting('incomeValue');if(display)display.textContent=money(b.value);return;}}
function refreshBudgetLive(){for(const c of CATEGORIES){const v=c.items.reduce((s,i)=>s+(budgetMode==='base'?editableItemAmount(currentMonth,i.id):baseItem(currentMonth,i.id)),0);for(const e of document.querySelectorAll(`[data-cat-total="${c.id}"],[data-cat-footer="${c.id}"]`))e.textContent=money(v);}const p=projection(currentMonth);const output=setting('pageBudget');const a=output.querySelector('[data-budget-total]'),b=output.querySelector('[data-budget-child]'),c=output.querySelector('[data-budget-saving]');if(a)a.textContent=money(p.allocated);if(b)b.textContent=money(p.saving);if(c){c.textContent=money(p.net);c.classList.toggle('green-text',p.net>=0);c.classList.toggle('red-text',p.net<0)}}
async function refreshMaslulCode(){
  toast('בודק גרסה עדכנית של האפליקציה...');
  try{if('serviceWorker' in navigator){const reg=await navigator.serviceWorker.getRegistration();if(reg)await reg.update();}}
  catch(err){console.warn('SW update check failed',err)}
  const url=new URL(location.href);url.searchParams.set('maslul_build',APP_BUILD);
  location.replace(url.toString());
}

// v1.8.4: consistent navigation and app-only help. No personal budget is sent to AI.
const NAV_ORDER=['dashboard','budget','imports','events','forecast','insights','settings'];
function returnToHome(){
 if(setting('modal').open)closeAppModal();
 navigate('dashboard');
}
function setupPageSwipe(){
 const main=document.querySelector('.main');
 let start=null;
 let swiped=false;
 let suppressUntil=0;
 // Content that can be edited, selected or scrolled sideways must keep its own gestures.
 const ignore=target=>!(target instanceof Element)||!!target.closest('input,textarea,select,[contenteditable="true"],.table-wrap,.import-list,[data-no-swipe],.insight-ai');
 function modalVisible(){return [...document.querySelectorAll('dialog')].some(d=>d.open);}
 function begin(x,y,target,kind){
  start=null;
  if(modalVisible()||ignore(target))return;
  // Keep system edge-back gestures available on Android and iOS.
  if(x<22||x>window.innerWidth-22)return;
  start={x,y,t:Date.now(),kind};
 }
 function finish(x,y,kind){
  if(!start||start.kind!==kind)return;
  const dx=x-start.x,dy=y-start.y,elapsed=Date.now()-start.t;
  start=null;
  if(modalVisible()||Math.abs(dx)<62||Math.abs(dx)<1.35*Math.abs(dy)||elapsed>1800)return;
  const idx=NAV_ORDER.indexOf(currentPage);
  if(idx===-1)return;
  // Hebrew RTL navigation: RIGHT = next tab, LEFT = previous tab.
  const next=idx+(dx>0?1:-1);
  if(next<0||next>=NAV_ORDER.length)return;
  swiped=true;suppressUntil=Date.now()+350;
  navigate(NAV_ORDER[next]);
 }
 main.addEventListener('touchstart',e=>{if(e.touches.length===1){const t=e.touches[0];begin(t.clientX,t.clientY,e.target,'touch');}else start=null;},{passive:true});
 main.addEventListener('touchend',e=>{if(e.changedTouches.length===1){const t=e.changedTouches[0];finish(t.clientX,t.clientY,'touch');}},{passive:true});
 main.addEventListener('touchcancel',()=>{start=null;},{passive:true});
 // Some Android PWA shells use Pointer Events; mouse dragging is intentionally excluded.
 main.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'&&!('ontouchstart'in window)&&e.isPrimary)begin(e.clientX,e.clientY,e.target,'pointer');},{passive:true});
 main.addEventListener('pointerup',e=>{if(e.pointerType==='touch'&&!('ontouchstart'in window))finish(e.clientX,e.clientY,'pointer');},{passive:true});
 // A NEW touch/pointer interaction must not be suppressed by the previous swipe.
 const clearSwipeClick=()=>{swiped=false;suppressUntil=0;};
 document.addEventListener('pointerdown',clearSwipeClick,true);
 document.addEventListener('touchstart',clearSwipeClick,true);
 // Prevent the synthetic click belonging to the completed swipe.
 document.addEventListener('click',e=>{
  if(swiped&&Date.now()<suppressUntil){e.preventDefault();e.stopImmediatePropagation();swiped=false;}
 },true);
}
// A single maintained help catalog powers BOTH header search and the full in-app guide.
// Keep terminology synchronized with the functional UI; see test_help_193.cjs.
const HELP_ARTICLES=[
 {id:'installments',terms:['פריסה לתשלומים','תשלומים','תשלום','תשלומי','בתשלומים','לפרוס','פורסים','פריסה','פריסת','לפריסה','ריבית בתשלומים','תשלום ראשון','תשלום אחרון','תשלומים שווים'],title:'פריסה לתשלומים',body:'פריסה לתשלומים היא חלוקה אוטומטית של הוצאה אחת לחודשים שונים — לא הפיצול הידני של רכיבי הוצאה מיוחדת.\nפתח תקציב ← קטגוריה ← פריט הוצאה ← ערוך, או הוצאות מיוחדות ← עריכת ההוצאה, או רישום הוצאה ידנית. בחר הוצאה חד־פעמית וסמן ״פריסה לתשלומים״. הזן מספר תשלומים (2–120). תאריך התשלום הראשון מתחיל מהיום, ותאריך התשלום האחרון מתעדכן לפי מספר התשלומים; אפשר לשנות את שניהם.\n״תשלומים שווים״ מסומן כברירת מחדל, והקרן מתחלקת ללא ריבית. אם תבטל את הסימון, יופיע שדה ריבית שנתית באחוזים על יתרת הקרן. בכל חודש ייכלל רק התשלום הרלוונטי, כולל ריבית אם הוגדרה. אם אמצעי החיוב הוא כרטיס אשראי, הירידה מהבנק תהיה לפי יום החיוב של הכרטיס בחודש הבא.\nחשוב: פריסה מיועדת להוצאה חד־פעמית. עסקאות שכבר יובאו מתדפיס אינן נפרסות מחדש אוטומטית כדי למנוע כפילות.'},
 {id:'special',terms:['הוצאות מיוחדות','הוצאה מיוחדת','אירוע מיוחד','אירועים','אירוע','רכיבי הוצאה','רכיב הוצאה','לרכיבים','פיצול ידני','חופשה'],title:'הוצאות מיוחדות ורכיבי הוצאה',body:'פתח את עמוד ״הוצאות מיוחדות״ כדי להוסיף חופשה, קנייה גדולה או הכנסה חריגה. אפשר להגדיר הוצאה כוללת ולבחור אחת משתי דרכים: ״רכיבי הוצאה״ — פירוט ידני של חלקי האירוע עם סכומים ותאריכים שונים; או ״פריסה לתשלומים״ — חלוקה אוטומטית של הוצאה חד־פעמית למספר חודשים.\nבפיצול לרכיבי הוצאה כל רכיב נרשם במועד שלו, והסכום הכולל של האירוע לא נספר בנוסף. אם מטרתך לחלק סכום אחד לכמה תשלומים, השתמש בפריסה לתשלומים ולא ברכיבי הוצאה.'},
 {id:'recurring',terms:['הוצאה חוזרת','הוצאות חוזרות','חוזרת','תקופות','תוקף','תאריך התחלה של הוצאה','תאריך סיום של הוצאה','חד פעמית','חד־פעמית'],title:'הוצאה חוזרת לעומת הוצאה חד־פעמית',body:'פתח תקציב ← קטגוריה ← ערוך את פריט ההוצאה. ב״סוג ההוצאה״ בחר הוצאה חוזרת או חד־פעמית.\nבהוצאה חוזרת בלבד יוצגו תאריכי התחלה וסיום אופציונליים לתקופת התוקף. בלי תאריכים, ההוצאה חוזרת ללא הגבלה. בהוצאה חד־פעמית רגילה מציינים תאריך הוצאה אחד בלבד, ולא תקופת תוקף. אם בחרת פריסה לתשלומים, מגדירים בנפרד מתי ישולם התשלום הראשון והאחרון.'},
 {id:'cards',terms:['כרטיסי אשראי','כרטיס אשראי','כרטיסים','אשראי','credit','ויזה','max','יום חיוב'],title:'כרטיסי אשראי',body:'כדי להגדיר כרטיס פתח הגדרות ← כרטיסי אשראי ← הוסף כרטיס. אפשר להזין שם וארבע ספרות אחרונות (רשות), ולבחור יום חיוב בחודש (ברירת מחדל: 2). הכרטיס הראשון נהפך לברירת המחדל, ואפשר לשנות זאת.\nלשיוך כרטיס לפריט הוצאה: תקציב ← הקטגוריה ← פריט ההוצאה ← חיוב. גם בייבוא תדפיס אשראי אפשר לבחור כרטיס. עסקה בכרטיס תחויב בבנק ביום החיוב שלו בחודש הבא, אלא אם נקבע תאריך חיוב מדויק.'},
 {id:'salary',terms:['משכורת','משכורות','הכנסה','הכנסות','שכר','בונוס','תלוש שכר'],title:'משכורות והכנסות',body:'פתח תקציב ← נהל הכנסות ומשכורות, או לחץ על כרטיס ההכנסה במסך הבית. אפשר להוסיף כמה משכורות, הכנסות נוספות ובונוס חד־פעמי. לכל משכורת יש תאריכי זכאות ותאריך הפקדה נפרדים. כברירת מחדל, שכר עבור חודש עבודה יופקד בחודש הבא.\nבייבוא תלוש השכר ניתן לראות ברוטו, תוספות, ניכויים, מיסים, נטו, ימי חופשה ונקודות זיכוי אם המידע פוענח מהמסמך.'},
 {id:'insights',terms:['סטטיסטיקות','סטטיסטיקה','גרף','תרשים','מגמה','התפלגות','תובנות'],title:'תובנות וניתוחים',body:'פתח תובנות כדי לראות מסקנות מקומיות מתוך המידע הקיים ולפתוח שאלות להעמקה כגון מה השתנה בתכנון. כדי להשוות לביצוע אמיתי דרושים תדפיסים מלאים והתאמות בנק ואשראי; חוסר נתונים לא נחשב לאפס. בהמשך העמוד ניתן לבקש ניתוח AI לאחר אישור המידע שיועבר ל־Google. ניתוחים קודמים נשמרים במגירות.'},
 {id:'budget',terms:['תקציב','פריט הוצאה','קטגוריה','קטגוריות','מגירה','עריכה','הוצאות'],title:'עריכת תקציב ופריטי הוצאה',body:'פתח תקציב ובחר קטגוריה כדי להרחיב את פריטי ההוצאה. לחיצה על שדה הסכום מסמנת אותו להחלפה. ניתן ליצור, לערוך ולמחוק קטגוריות ופריטי הוצאה.\n״תקציב קבוע״ מציג את הסכומים שהוגדרו; ״רק החודש״ מציג את סכומי ההוצאות החלים בחודש שבחרת. הוצאה חוזרת מציגה תאריכי תוקף אופציונליים; הוצאה חד־פעמית מציגה תאריך אחד, או תאריכי תשלומים אם נבחרה פריסה.'},
 {id:'imports',terms:['תדפיסים','תדפיס','ייבוא','יבוא','עובר ושב','עו״ש','csv','pdf','העלאה','בנק'],title:'ייבוא וארכיון תדפיסים',body:'פתח ייבוא ובחר את סוג הקובץ: עו״ש, אשראי קודם, אשראי נוכחי או תלוש שכר. בחר קובץ וסקור את המידע שזוהה לפני שמירת המסמך. אחרי השמירה, באזור ״תדפיסים שהועלו״ ניתן לפתוח מגירה לפי זמן ההעלאה ולראות את השורות שנקלטו.\nבהעלאות חופפות המערכת מוסיפה לחישוב רק תנועות חדשות, ומציגה כפילויות בארכיון. כשקיים פירוט יתרות בנק, מתבצעת בדיקת התאמה. PDF ותמונות עשויים לדרוש מפתח Google AI ואישור לשליחת המסמך.'},
 {id:'forecast',terms:['תחזית','יתרה','יתרות','תזרים','חודשים קדימה'],title:'תחזית ויתרה',body:'במסך תחזית בוחרים חודש התחלה ומספר חודשים. היתרה המחושבת מתבססת על יתרת בנק ידועה או יתרת פתיחה שהוגדרה, הכנסות צפויות ומועדי גבייה. חיוב כרטיס אשראי נכלל במועד הגבייה, ולא במועד הקנייה. הנתונים העתידיים הם אומדן, לא יתרה בנקאית מאומתת.'},
 {id:'ai',terms:['מפתח','גוגל','google','gemini','api key','ניתוח ai','ai studio'],title:'חיבור Google AI',body:'פתח הגדרות או לחץ על ״התחברות ל-Google/יצירת מפתח״ בחיפוש העזרה. בחר חשבון Google וצור API Key ב־Google AI Studio. חזור למסלול, הדבק את המפתח ושמור אותו רק במכשיר פרטי. ב״תובנות״ ניתן לבקש ניתוח AI. לפני השליחה יוצג איזה מידע יישלח ל־Google לאישור.'},
 {id:'backup',terms:['גיבוי','שחזור','שמירה','עדכון גרסה','מכשיר חדש','איפוס'],title:'גיבוי ושמירת מידע',body:'הנתונים נשמרים בדפדפן במכשיר זה בלבד. בהגדרות אפשר להוריד גיבוי JSON ולשמור אותו בנפרד, וכן לשחזר אותו בהמשך. לפני עדכון Netlify או איפוס מידע מומלץ להוריד גיבוי. מפתח Google AI אינו נכלל בגיבוי.'}
];
function localHelpAnswer(query){
 const normalized=String(query||'').normalize('NFKC').toLocaleLowerCase('he-IL').replace(/[\u0591-\u05c7]/g,'').replace(/[״“”']/g,'').replace(/[-־]/g,' ').replace(/\s+/g,' ').trim();
 let best=null,bestScore=0;
 for(const article of HELP_ARTICLES){
  let score=0;
  for(const term of article.terms){
   const needle=term.toLocaleLowerCase('he-IL').replace(/[״“”']/g,'').replace(/[-־]/g,' ').replace(/\s+/g,' ').trim();
   if(normalized.includes(needle))score+=2+needle.length/5+(normalized===needle?12:0);
  }
  if(score>bestScore){best=article;bestScore=score;}
 }
 return bestScore?best:{title:'עזרה במסלול',body:'אפשר לשאול על פריסה לתשלומים, הוצאה חוזרת, כרטיסי אשראי, הוצאות מיוחדות ורכיבי הוצאה, משכורות, ייבוא תדפיסים, תחזית, תובנות או גיבויים. נסה לנסח מה ברצונך לבצע באפליקציה.'};
}
function openHelpSearch(raw){
 const query=String(raw||'').trim().slice(0,220);
 if(!query){setting('headerSearchInput').focus();toast('מה תרצה לדעת על השימוש באפליקציה?',true);return;}
 const answer=localHelpAnswer(query);
 openModal('עזרה · '+answer.title,`<p class="subtle">השאלה שלך: <strong>${esc(query)}</strong></p><div class="help-answer">${esc(answer.body)}</div><div class="button-row" style="margin-top:16px"><button type="button" class="btn secondary" data-action="google-key-help">התחברות ל-Google/יצירת מפתח</button></div>`,(_,d)=>d.close(),'סגור');
 // One clear answer only; no second response, expansion button or automatic AI request.
}

function bind(){setting('headerBack')?.addEventListener('click',goBackPage);document.querySelectorAll('[data-nav]').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.nav)));setting('activeMonth').value=currentMonth;setting('activeMonth').addEventListener('change',onChange);document.addEventListener('click',onClick);document.addEventListener('change',onChange);document.addEventListener('input',onInput);document.addEventListener('focusin',e=>{const el=e.target;if(el.matches('[data-amountinput],.select-amount')){try{el.select()}catch{}}});document.addEventListener('click',e=>{const el=e.target;if(el.matches('[data-amountinput],.select-amount')&&document.activeElement===el){try{el.select()}catch{}}});setting('modalCancel').addEventListener('click',e=>{if(setting('modalCancel').onclick)return;closeAppModal();});
 setting('modalClose').addEventListener('click',e=>{e.preventDefault();closeAppModal();});
 setting('modal').addEventListener('cancel',e=>{const d=setting('modal');if(d.dataset.mode==='onboarding')markIntroSeen();d.dataset.mode='';});
 setting('helpBtn').addEventListener('click',()=>onboardingModal(0));
 setting('brandHome').addEventListener('click',()=>returnToHome());
 setting('headerHome').addEventListener('click',()=>returnToHome());
 setting('headerSearchForm').addEventListener('submit',e=>{e.preventDefault();openHelpSearch(setting('headerSearchInput').value);});
 setting('googleGuideClose').addEventListener('click',closeGoogleAccountGuide);
 setting('googleGuideCancel').addEventListener('click',closeGoogleAccountGuide);
 setting('googleGuideForm').addEventListener('submit',e=>{e.preventDefault();saveGoogleGuideKey();});
 setupPageSwipe();document.addEventListener('keydown',e=>{if(e.key==='Escape')return;});window.addEventListener('storage',e=>{if(e.key===STORAGE_KEY){try{state=safeLoad();syncCatalog();render();toast('הנתונים עודכנו בלשונית אחרת.')}catch{}}});}
function init(){bind();navigate('dashboard');if('serviceWorker'in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('./sw.js?v=1.9.5',{updateViaCache:'none'}).catch(err=>console.warn('SW registration failed',err));if(!HAS_PREEXISTING_BUDGET&&!localStorage.getItem(INTRO_KEY)){onboardingModal(0);}}
init();

// Monthly opening-balance control on dashboard and forecast; no new login or data store.
document.addEventListener('click',event=>{const b=event.target.closest('[data-openmonth]');if(!b)return;const month=b.dataset.openmonth;if(validMonth(month))openingBalanceModal(month);});
