/* מסלול 1.9.1 — decisions before charts. No network, no extra persistent user state. */
'use strict';
let decisionQuestion = '';
let decisionRevision=0,decisionCache=null;
function invalidateDecisionData(){decisionRevision++;decisionCache=null;}
const DECISION_QUESTIONS=[
 {id:'over',title:'איפה נרשמו יותר הוצאות מהתכנון?'},
 {id:'change',title:'מה השתנה בתכנון?'},
 {id:'distribution',title:'לאן מיועד הכסף?'},
 {id:'improve',title:'איפה כדאי לבדוק התאמות?'}
];
function decisionPlannedCategories(month){return CATEGORIES.map(c=>({id:c.id,name:c.name,amount:c.items.reduce((n,i)=>n+Number(baseItem(month,i.id)||0),0)})).filter(x=>x.amount>0).sort((a,b)=>b.amount-a.amount)}
function decisionExpenses(month){return state.transactions.filter(t=>t.date?.slice(0,7)===month&&t.type==='expense'&&t.status!=='pending'&&Number(t.amount)>0)}
function decisionData(){
 const cacheKey=insightScope+'|'+insightMonth+'|'+currentMonth+'|'+forecastStart+'|'+state.settings.forecastLength;
 if(decisionCache&&decisionCache.key===cacheKey&&decisionCache.state===state&&decisionCache.revision===decisionRevision)return decisionCache.value;
 const months=insightScope==='all'?Array.from({length:Math.min(24,Math.max(1,Number(state.settings.forecastLength)||12))},(_,i)=>addMonths(forecastStart,i)):[insightMonth];
 const monthsLimited=months.slice(0,24),ref=insightScope==='month'?insightMonth:currentMonth;
 const expenses=monthsLimited.flatMap(m=>decisionExpenses(m));
 const pending=state.transactions.filter(t=>monthsLimited.includes(t.date?.slice(0,7))&&t.status==='pending').length;
 const planned=monthsLimited.reduce((n,m)=>n+sumBudget(m),0),events=monthsLimited.reduce((n,m)=>n+sumEvent(m,'expense'),0);
 const hasPlanned=planned>0||events>0||monthsLimited.some(m=>projection(m).income>0);
 const categories=CATEGORIES.map(c=>({id:c.id,name:c.name,amount:monthsLimited.reduce((n,m)=>n+c.items.reduce((a,i)=>a+Number(baseItem(m,i.id)||0),0),0)})).filter(c=>c.amount>0).sort((a,b)=>b.amount-a.amount);
 const overall={months:monthsLimited,ref,expenses,pending,planned,events,hasPlanned,categories};
 const findings=[];
 const cashMonths=monthsLimited.map(m=>projection(m)).filter(p=>p.net < -.005).sort((a,b)=>a.net-b.net);
 if(cashMonths.length){const lowest=cashMonths[0];findings.push({level:'attention',title:'צפויה ירידה חודשית ביתרה',headline:money(lowest.net),body:`לפי מועדי ההפקדה והחיוב, השינוי המשוער ב${monthName(lowest.month)} שלילי. זו אינה תחזית לשפל יומי או הוכחה ליתרה שלילית בבנק.`,action:'בדוק בתחזית',page:'forecast'});}
 const special=monthsLimited.map(m=>({m,n:sumEvent(m,'expense')})).sort((a,b)=>b.n-a.n)[0];
 if(special?.n>0)findings.push({level:'notice',title:'הוצאה מיוחדת בתכנון',headline:money(special.n),body:`ב${monthName(special.m)} מתוכננות הוצאות אירועים. הן מוצגות בנפרד מהסעיפים הקבועים; חודש יקר אינו בהכרח חריגה לא מתוכננת.`,action:'פתח אירועים',page:'events'});
 const curPlan=sumBudget(ref),prev=addMonths(ref,-1),prevPlan=sumBudget(prev);
 if(curPlan>0&&prevPlan>0&&curPlan-prevPlan>=Math.max(200,prevPlan*.10))findings.push({level:'notice',title:'התקציב החודשי גדל',headline:money(curPlan-prevPlan),body:`סעיפי התקציב ב${monthName(ref)} גבוהים בהשוואה ל${monthName(prev)}. זהו שינוי בתכנון, לא עלייה שהוכחה בהוצאה בפועל.`,action:'בדוק את התקציב',page:'budget'});
 if(categories.length){const c=categories[0],share=planned?Math.round(100*c.amount/planned):0;findings.push({level:'info',title:'הסעיף המרכזי בתוכנית',headline:c.name,body:`${money(c.amount)} מתוך סעיפי התקציב בתקופה שנבחרה (${share}%). נתון תכנוני בלבד, ללא אירועים מיוחדים.`,action:'פתח תקציב',page:'budget'});}
 if(!findings.length)findings.push({level:'info',title:'מתחילים מהתקציב',headline:'אין עדיין תוכנית מספקת',body:'הוסף הכנסה וסעיפי הוצאות כדי לקבל מסקנות מבוססות תכנון. אין כאן הנחה שההוצאות שלך אפס. ',action:'ערוך תקציב',page:'budget'});
 overall.findings=findings.slice(0,3);
 decisionCache={key:cacheKey,state,revision:decisionRevision,value:overall};
 return overall;
}
function decisionStatus(data){
 const transactionNote=data.expenses.length?`נקלטו ${data.expenses.length} תנועות הוצאה שאינן מסומנות כממתינות בתקופה שנבחרה.`:'אין תנועות הוצאה שנקלטו לתקופה שנבחרה.';
 return `<section class="decision-quality" aria-label="מהימנות המידע"><span class="decision-quality-icon" aria-hidden="true">ⓘ</span><div><strong>שלמות נתוני הביצוע לא אומתה</strong><p>${esc(transactionNote)} ${data.pending?`נמצאו גם ${data.pending} תנועות ממתינות שלא נכללו בפירוט.`:''} אין באפליקציה עדיין אימות מלא של כיסוי תדפיסים והתאמת חיובי בנק וכרטיס. לכן לא נציג ״אין חריגה״ או חיסכון בפועל כמסקנה ודאית.</p><button type="button" class="decision-link" data-navto="imports" data-openarchive="1">השלם או בדוק תדפיסים ←</button></div></section>`;
}
function decisionFindings(data){return `<section class="decision-top"><h2>מה חשוב לדעת?</h2><div class="decision-finding-list">${data.findings.map((f,i)=>`<article class="decision-finding ${f.level}"><div class="decision-finding-top"><span class="decision-index">${i+1}</span><strong>${esc(f.title)}</strong></div><div class="decision-number">${esc(f.headline)}</div><p>${esc(f.body)}</p><button type="button" class="decision-link" data-navto="${esc(f.page)}">${esc(f.action)} ←</button></article>`).join('')}</div></section>`}
function decisionBars(rows,limit=8){const v=rows.slice(0,limit),max=Math.max(1,...v.map(r=>r.amount));return `<div class="decision-bars" role="list">${v.map(r=>`<div class="decision-bar" role="listitem"><div class="decision-bar-head"><span>${esc(r.name)}</span><strong class="money">${money(r.amount)}</strong></div><div class="decision-bar-track"><div style="width:${(100*r.amount/max).toFixed(2)}%"></div></div></div>`).join('')}</div>`}
function decisionReport(data){const month=data.ref;let title='',body='';
 if(decisionQuestion==='over'){
  title='מה נרשם מול התקציב?';
  const recorded=decisionExpenses(month),rows=CATEGORIES.map(c=>({name:c.name,amount:recorded.filter(t=>c.items.some(i=>i.id===t.itemId)).reduce((n,t)=>n+Number(t.amount),0),budget:c.items.reduce((n,i)=>n+Number(baseItem(month,i.id)||0),0)})).filter(x=>x.amount>0).sort((a,b)=>(b.amount-b.budget)-(a.amount-a.budget));
  body=`<p class="decision-caution">אלה תנועות שנקלטו, לא הוכחה לביצוע מלא. ייתכנו חוסרים או חפיפות בין מקורות; תנועות ממתינות אינן נכללות. אין להסיק שבקטגוריה חסרת תנועות לא היו הוצאות.</p>${rows.length?`<div class="decision-list">${rows.slice(0,8).map(r=>`<div class="decision-list-row"><span><strong>${esc(r.name)}</strong><small>רשום: ${money(r.amount)} · מתוכנן: ${money(r.budget)}</small></span><b class="${r.amount>r.budget?'red-text':''}">${r.amount>r.budget?`פער רשום: ${money(r.amount-r.budget)}`:'לא ניתן לקבוע חריגה'}</b></div>`).join('')}</div>`:'<div class="note">אין הוצאות שנקלטו בחודש זה. אפשר לייבא תדפיסים ולבדוק שוב.</div>'}<div class="button-row"><button type="button" class="btn secondary" data-navto="imports" data-openarchive="1">בדוק תנועות בתדפיסים</button></div>`;
 }else if(decisionQuestion==='change'){
  title='מה השתנה בתוכנית החודשית?';const previous=addMonths(month,-1),before=Object.fromEntries(decisionPlannedCategories(previous).map(c=>[c.id,c.amount]));
  const rows=CATEGORIES.map(c=>{const now=c.items.reduce((n,i)=>n+Number(baseItem(month,i.id)||0),0);return {name:c.name,amount:now-(before[c.id]||0),now,old:before[c.id]||0}}).filter(x=>Math.abs(x.amount)>.01).sort((a,b)=>Math.abs(b.amount)-Math.abs(a.amount));
  body=`<p class="decision-caution">השוואת סכומי התקציב של ${esc(monthName(month))} ל${esc(monthName(previous))}; לא מדובר בשינוי ההוצאות בפועל. אירועים מוצגים בנפרד.</p>${rows.length?`<div class="decision-list">${rows.slice(0,8).map(r=>`<div class="decision-list-row"><span><strong>${esc(r.name)}</strong><small>${money(r.old)} → ${money(r.now)}</small></span><b class="${r.amount>0?'red-text':'green-text'}">${r.amount>0?'+':'−'}${money(Math.abs(r.amount))}</b></div>`).join('')}</div>`:'<div class="note">לא נמצא שינוי בסעיפי התכנון בין החודשים הללו.</div>'}<p class="subtle">אירועים מתוכננים החודש: ${money(sumEvent(month,'expense'))}.</p><button class="btn secondary" data-navto="budget">ערוך את התוכנית</button>`;
 }else if(decisionQuestion==='distribution'){
  title='לאן מיועדים סכומי התקציב?';
  body=`<p class="decision-caution">חלוקת סעיפי התקציב בתקופה שנבחרה, ללא אירועים מיוחדים בסך ${money(data.events)}. אין להסיק שאלה סכומים ששולמו בפועל.</p>${data.categories.length?decisionBars(data.categories):'<div class="note">עדיין אין סעיפי הוצאה עם סכום מתוכנן.</div>'}<button class="btn secondary" data-navto="budget">לסעיפי התקציב</button>`;
 }else if(decisionQuestion==='improve'){
  title='אילו התאמות כדאי לשקול?';const candidates=['restaurants','takeaway','worklunch','concerts','activities','clothing','otherapps'].map(id=>({item:ITEM_BY_ID[id],amount:Number(ITEM_BY_ID[id]?baseItem(month,id):0)})).filter(x=>x.item&&x.amount>0).sort((a,b)=>b.amount-a.amount).slice(0,4);
  body=`<p class="decision-caution">אלה דוגמאות לבדיקת התוכנית בלבד, לא הנחיה לוותר על הוצאה ולא חיסכון שהושג. בחר בעצמך אילו הוצאות חשובות לך. השפעה על יתרת הבנק תלויה גם במועד החיוב.</p>${candidates.length?`<div class="decision-list">${candidates.map(r=>`<div class="decision-list-row"><span><strong>${esc(r.item.name)}</strong><small>תקציב חודשי: ${money(r.amount)}</small></span><b>5% מהתכנון: ${money(r.amount*.05)}</b></div>`).join('')}</div>`:'<div class="note">לא נמצאו סעיפים מתאימים לבדיקה אוטומטית. אפשר לבדוק את התקציב ידנית.</div>'}<button class="btn secondary" data-navto="budget">בדוק ושנה סעיף בתקציב</button>`;
 }
 if(!title)return '';
 return `<section class="card decision-report" id="decisionDetails" aria-live="polite"><div class="row wrap"><h2>${title}</h2><button type="button" class="btn ghost small" data-decision-close="1">סגור פירוט ✕</button></div>${body}</section>`;
}
function decisionOverview(data){return `<section class="card decision-intro"><h2>מה השתנה ומה כדאי לבדוק?</h2><p>מסקנות מתוך הנתונים שמסלול יכולה לחשב. אפשר לפתוח כל נושא לפירוט ולפעולה.</p><div class="insight-toolbar decision-period"><label class="control"><span>תקופת בדיקה</span><select id="insightScope"><option value="month" ${insightScope==='month'?'selected':''}>חודש נבחר</option><option value="all" ${insightScope==='all'?'selected':''}>חלון התחזית</option></select></label>${insightScope==='month'?`<label class="control"><span>בחירת חודש</span><input type="month" id="insightMonth" value="${esc(insightMonth)}"></label>`:''}</div><p class="subtle">${insightScope==='month'?`הניתוח מתייחס ל${esc(monthName(insightMonth))}.`:`ניתוח תכנוני ל־${data.months.length} חודשים החל מ${esc(monthName(data.months[0]))}.`}</p></section>${decisionStatus(data)}${decisionFindings(data)}<section class="card decision-questions"><h2>מה תרצה לבדוק לעומק?</h2><div class="decision-question-grid">${DECISION_QUESTIONS.map(q=>`<button type="button" class="decision-question ${decisionQuestion===q.id?'chosen':''}" data-decision-question="${q.id}" aria-pressed="${decisionQuestion===q.id}">${esc(q.title)} ←</button>`).join('')}</div></section>${decisionReport(data)}`;}
