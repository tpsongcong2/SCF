/* ─── QUẢN LÝ DÒNG TIỀN & CÔNG NỢ ─── */
const FIN_IN_CATS=['Doanh thu bán hàng','Thu công nợ khách hàng','Vốn góp','Vay nhận về','Thu khác'];
const FIN_OUT_CATS=['Mua nguyên vật liệu','Mua hàng hóa','Lương và nhân sự','Xăng dầu','Sửa chữa, bảo dưỡng','Thuế và phí','Trả công nợ nhà cung cấp','Trả nợ vay','Chi khác'];
const finMoney=v=>(Number(v)||0).toLocaleString('vi-VN')+'đ';
const finStatusLabel=s=>s==='paid'?'Đã thanh toán':s==='partial'?'Thanh toán một phần':'Chưa thanh toán';
const finDefaultPnl=(direction,category)=>direction==='in'?(category==='Doanh thu bán hàng'||category==='Thu khác'?'revenue':'none'):(category==='Trả công nợ nhà cung cấp'||category==='Trả nợ vay'?'none':'expense');

function FinanceEntryForm({entry,direction,customers,nccs,currentUser,onSave,onClose}){
  const initialDirection=entry?.direction||direction||'in';
  const[f,sf]=useState(entry?{...entry}:{date:isoDate(),direction:initialDirection,category:initialDirection==='in'?FIN_IN_CATS[0]:FIN_OUT_CATS[0],partnerType:'other',partnerId:'',partnerName:'',amount:0,method:'bank',pnlType:initialDirection==='in'?'revenue':'expense',reference:'',note:''});
  const set=(k,v)=>sf(p=>({...p,[k]:v}));
  const changeDirection=v=>{const category=v==='in'?FIN_IN_CATS[0]:FIN_OUT_CATS[0];sf(p=>({...p,direction:v,category,pnlType:finDefaultPnl(v,category)}));};
  const changeCategory=category=>sf(p=>({...p,category,pnlType:finDefaultPnl(p.direction,category)}));
  const partners=f.partnerType==='customer'?customers:f.partnerType==='supplier'?nccs:[];
  const submit=()=>{
    if(!f.date){window.showToast('Chọn ngày thu/chi.','warn');return;}
    if((Number(f.amount)||0)<=0){window.showToast('Nhập số tiền lớn hơn 0.','warn');return;}
    const partner=partners.find(x=>x.id===f.partnerId);
    onSave({...f,amount:Number(f.amount)||0,partnerName:f.partnerType==='other'?f.partnerName:(partner?.name||f.partnerName||''),updatedBy:currentUser.name,updatedAt:fmtDT(),createdBy:entry?.createdBy||currentUser.name,createdAt:entry?.createdAt||fmtDT()});
  };
  return h(Modal,{title:entry?'Sửa khoản thu/chi':(initialDirection==='in'?'Nhập tiền vào':'Nhập tiền ra'),onClose,lg:true},
    h('div',{className:'g3'},
      h(F,{label:'Ngày *'},h('input',{type:'date',value:f.date,onChange:e=>set('date',e.target.value)})),
      h(F,{label:'Dòng tiền *'},h('select',{value:f.direction,onChange:e=>changeDirection(e.target.value)},h('option',{value:'in'},'Tiền vào'),h('option',{value:'out'},'Tiền ra'))),
      h(F,{label:'Phương thức'},h('select',{value:f.method,onChange:e=>set('method',e.target.value)},h('option',{value:'cash'},'Tiền mặt'),h('option',{value:'bank'},'Ngân hàng')))
    ),
    h('div',{className:'g2'},
      h(F,{label:'Nhóm thu/chi'},h('select',{value:f.category,onChange:e=>changeCategory(e.target.value)},(f.direction==='in'?FIN_IN_CATS:FIN_OUT_CATS).map(x=>h('option',{key:x,value:x},x)))),
      h(F,{label:'Tính kết quả kinh doanh'},h('select',{value:f.pnlType,onChange:e=>set('pnlType',e.target.value)},h('option',{value:'revenue'},'Tính vào doanh thu'),h('option',{value:'expense'},'Tính vào chi phí'),h('option',{value:'none'},'Không tính lợi nhuận')))
    ),
    h('div',{className:'g2'},
      h(F,{label:'Đối tượng'},h('select',{value:f.partnerType,onChange:e=>sf(p=>({...p,partnerType:e.target.value,partnerId:'',partnerName:''}))},h('option',{value:'other'},'Khác'),h('option',{value:'customer'},'Khách hàng'),h('option',{value:'supplier'},'Nhà cung cấp'))),
      f.partnerType==='other'?h(F,{label:'Tên đối tượng'},h('input',{value:f.partnerName,onChange:e=>set('partnerName',e.target.value),placeholder:'Người nộp / người nhận...'})):h(F,{label:f.partnerType==='customer'?'Khách hàng':'Nhà cung cấp'},h('select',{value:f.partnerId,onChange:e=>set('partnerId',e.target.value)},h('option',{value:''},'— Chọn —'),partners.map(x=>h('option',{key:x.id,value:x.id},x.name||x.id))))
    ),
    h('div',{className:'g2'},
      h(F,{label:'Số tiền *'},h('input',{type:'number',min:0,value:f.amount,onChange:e=>set('amount',e.target.value)})),
      h(F,{label:'Số chứng từ'},h('input',{value:f.reference,onChange:e=>set('reference',e.target.value),placeholder:'Phiếu thu, phiếu chi, hóa đơn...'}))
    ),
    h(F,{label:'Ghi chú'},h('textarea',{rows:2,value:f.note,onChange:e=>set('note',e.target.value)})),
    h(Row,null,h('button',{onClick:onClose},'Hủy'),h('button',{className:'bp',onClick:submit},h('i',{className:'ti ti-device-floppy'}),' Lưu khoản '+(f.direction==='in'?'thu':'chi')))
  );
}

function FinanceDebtForm({debt,kind,customers,nccs,currentUser,onSave,onClose}){
  const initialKind=debt?.kind||kind||'receivable';
  const[f,sf]=useState(debt?{...debt}:{kind:initialKind,date:isoDate(),dueDate:'',partnerId:'',partnerName:'',invoiceNo:'',amount:0,paidAmount:0,note:''});
  const set=(k,v)=>sf(p=>({...p,[k]:v}));
  const partners=f.kind==='receivable'?customers:nccs;
  const submit=()=>{
    const partner=partners.find(x=>x.id===f.partnerId);
    if(!partner){window.showToast('Chọn '+(f.kind==='receivable'?'khách hàng.':'nhà cung cấp.'),'warn');return;}
    const amount=Number(f.amount)||0,paid=Math.min(amount,Math.max(0,Number(f.paidAmount)||0));
    if(amount<=0){window.showToast('Nhập giá trị công nợ.','warn');return;}
    onSave({...f,amount,paidAmount:paid,partnerName:partner.name||partner.id,status:paid>=amount?'paid':paid>0?'partial':'unpaid',updatedBy:currentUser.name,updatedAt:fmtDT(),createdBy:debt?.createdBy||currentUser.name,createdAt:debt?.createdAt||fmtDT()});
  };
  return h(Modal,{title:debt?'Sửa công nợ':(initialKind==='receivable'?'Thêm công nợ khách hàng':'Thêm công nợ nhà cung cấp'),onClose,lg:true},
    h('div',{className:'g3'},
      h(F,{label:'Loại công nợ'},h('select',{value:f.kind,onChange:e=>sf(p=>({...p,kind:e.target.value,partnerId:'',partnerName:''}))},h('option',{value:'receivable'},'Phải thu khách hàng'),h('option',{value:'payable'},'Phải trả nhà cung cấp'))),
      h(F,{label:'Ngày ghi nhận'},h('input',{type:'date',value:f.date,onChange:e=>set('date',e.target.value)})),
      h(F,{label:'Hạn thanh toán'},h('input',{type:'date',value:f.dueDate,onChange:e=>set('dueDate',e.target.value)}))
    ),
    h('div',{className:'g2'},
      h(F,{label:f.kind==='receivable'?'Khách hàng *':'Nhà cung cấp *'},h('select',{value:f.partnerId,onChange:e=>set('partnerId',e.target.value)},h('option',{value:''},'— Chọn —'),partners.map(x=>h('option',{key:x.id,value:x.id},x.name||x.id)))),
      h(F,{label:'Hóa đơn / chứng từ'},h('input',{value:f.invoiceNo,onChange:e=>set('invoiceNo',e.target.value)}))
    ),
    h('div',{className:'g2'},
      h(F,{label:'Giá trị công nợ *'},h('input',{type:'number',min:0,value:f.amount,onChange:e=>set('amount',e.target.value)})),
      h(F,{label:'Đã thanh toán'},h('input',{type:'number',min:0,max:Number(f.amount)||0,value:f.paidAmount,onChange:e=>set('paidAmount',e.target.value)}))
    ),
    h(F,{label:'Ghi chú'},h('textarea',{rows:2,value:f.note,onChange:e=>set('note',e.target.value)})),
    h(Row,null,h('button',{onClick:onClose},'Hủy'),h('button',{className:'bp',onClick:submit},h('i',{className:'ti ti-device-floppy'}),' Lưu công nợ'))
  );
}

function FinanceReportTab({entries,setEntries,debts,setDebts,openings,setOpenings,customers,nccs,currentUser}){
  const currentMonth=isoDate().slice(0,7);
  const[month,setMonth]=useState(currentMonth);const[tab,setTab]=useState('overview');const[entryModal,setEntryModal]=useState(null);const[debtModal,setDebtModal]=useState(null);
  const[editEntry,setEditEntry]=useState(null);const[editDebt,setEditDebt]=useState(null);
  const calcOpening=targetMonth=>{
    const exact=openings.find(x=>x.month===targetMonth);
    if(exact)return{...exact,auto:false};
    const base=[...openings].filter(x=>x.month<targetMonth).sort((a,b)=>String(b.month).localeCompare(String(a.month)))[0]||{month:'0000-00',cash:0,bank:0};
    const prior=entries.filter(x=>{const ym=String(x.date||'').slice(0,7);return ym>=base.month&&ym<targetMonth;});
    const delta=(method,direction)=>prior.reduce((total,x)=>total+(((method==='cash'?x.method==='cash':x.method!=='cash')&&x.direction===direction)?(Number(x.amount)||0):0),0);
    return{month:targetMonth,cash:(Number(base.cash)||0)+delta('cash','in')-delta('cash','out'),bank:(Number(base.bank)||0)+delta('bank','in')-delta('bank','out'),auto:true};
  };
  const opening=calcOpening(month);
  const[openingEdit,setOpeningEdit]=useState(opening);
  useEffect(()=>setOpeningEdit(calcOpening(month)),[month,openings,entries]);
  const monthEntries=entries.filter(x=>String(x.date||'').startsWith(month)).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
  const sum=(rows,fn)=>rows.reduce((total,row)=>total+(Number(fn(row))||0),0);
  const inflow=sum(monthEntries,x=>x.direction==='in'?x.amount:0),outflow=sum(monthEntries,x=>x.direction==='out'?x.amount:0);
  const cashIn=sum(monthEntries,x=>x.direction==='in'&&x.method==='cash'?x.amount:0),cashOut=sum(monthEntries,x=>x.direction==='out'&&x.method==='cash'?x.amount:0);
  const bankIn=sum(monthEntries,x=>x.direction==='in'&&x.method!=='cash'?x.amount:0),bankOut=sum(monthEntries,x=>x.direction==='out'&&x.method!=='cash'?x.amount:0);
  const openingTotal=(Number(opening.cash)||0)+(Number(opening.bank)||0),endingCash=(Number(opening.cash)||0)+cashIn-cashOut,endingBank=(Number(opening.bank)||0)+bankIn-bankOut,endingTotal=endingCash+endingBank;
  const revenue=sum(monthEntries,x=>x.pnlType==='revenue'?x.amount:0),expense=sum(monthEntries,x=>x.pnlType==='expense'?x.amount:0),profit=revenue-expense;
  const monthEnd=month+'-31';
  const debtRows=debts.filter(x=>!x.date||x.date<=monthEnd);
  const outstanding=x=>Math.max(0,(Number(x.amount)||0)-(Number(x.paidAmount)||0));
  const receivable=sum(debtRows,x=>x.kind==='receivable'?outstanding(x):0),payable=sum(debtRows,x=>x.kind==='payable'?outstanding(x):0);
  const saveEntry=data=>{const item={...data,id:editEntry?.id||'TC'+uid()};setEntries(p=>editEntry?p.map(x=>x.id===editEntry.id?item:x):[item,...p]);setEntryModal(null);setEditEntry(null);};
  const saveDebt=data=>{const item={...data,id:editDebt?.id||'CN'+uid()};setDebts(p=>editDebt?p.map(x=>x.id===editDebt.id?item:x):[item,...p]);setDebtModal(null);setEditDebt(null);};
  const saveOpening=()=>{const item={month,cash:Number(openingEdit.cash)||0,bank:Number(openingEdit.bank)||0,updatedBy:currentUser.name,updatedAt:fmtDT()};setOpenings(p=>{const i=p.findIndex(x=>x.month===month);return i>=0?p.map((x,j)=>j===i?item:x):[...p,item];});window.showToast('Đã lưu tiền đầu tháng.','success');};
  const delEntry=id=>window.scfConfirm('Xóa khoản thu/chi này?','Xóa dữ liệu',true).then(ok=>ok&&setEntries(p=>p.filter(x=>x.id!==id)));
  const delDebt=id=>window.scfConfirm('Xóa khoản công nợ này?','Xóa dữ liệu',true).then(ok=>ok&&setDebts(p=>p.filter(x=>x.id!==id)));
  const exportEntries=monthEntries.map(x=>({date:x.date,direction:x.direction==='in'?'Tiền vào':'Tiền ra',category:x.category,partner:x.partnerName,method:x.method==='cash'?'Tiền mặt':'Ngân hàng',amount:x.amount,pnl:x.pnlType==='revenue'?'Doanh thu':x.pnlType==='expense'?'Chi phí':'Không tính',reference:x.reference,note:x.note}));
  const year=month.slice(0,4);
  const yearRows=Array.from({length:12},(_,i)=>{
    const ym=year+'-'+String(i+1).padStart(2,'0'),rows=entries.filter(x=>String(x.date||'').startsWith(ym)),op=calcOpening(ym);
    const inc=sum(rows,x=>x.direction==='in'?x.amount:0),out=sum(rows,x=>x.direction==='out'?x.amount:0),rev=sum(rows,x=>x.pnlType==='revenue'?x.amount:0),exp=sum(rows,x=>x.pnlType==='expense'?x.amount:0);
    return{month:ym,opening:(Number(op.cash)||0)+(Number(op.bank)||0),inflow:inc,outflow:out,ending:(Number(op.cash)||0)+(Number(op.bank)||0)+inc-out,revenue:rev,expense:exp,profit:rev-exp};
  });
  const debtStatus=x=>outstanding(x)<=0?'paid':Number(x.paidAmount)>0?'partial':'unpaid';
  const exportDebts=debtRows.map(x=>({kind:x.kind==='receivable'?'Phải thu khách hàng':'Phải trả nhà cung cấp',partner:x.partnerName,date:x.date,dueDate:x.dueDate,invoiceNo:x.invoiceNo,amount:x.amount,paidAmount:x.paidAmount,remaining:outstanding(x),status:finStatusLabel(debtStatus(x)),note:x.note}));
  const exportCurrent=()=>{
    if(tab==='debt')return xlsxExport(exportDebts,[['kind','Loại công nợ'],['partner','Đối tượng'],['date','Ngày ghi nhận'],['dueDate','Hạn thanh toán'],['invoiceNo','Chứng từ'],['amount','Giá trị'],['paidAmount','Đã thanh toán'],['remaining','Còn lại'],['status','Trạng thái'],['note','Ghi chú']],'Cong_no_'+month);
    if(tab==='year')return xlsxExport(yearRows,[['month','Tháng'],['opening','Tiền đầu kỳ'],['inflow','Tiền vào'],['outflow','Tiền ra'],['ending','Tiền cuối kỳ'],['revenue','Doanh thu'],['expense','Chi phí'],['profit','Lợi nhuận']],'Tong_hop_tai_chinh_'+year);
    return xlsxExport(exportEntries,[['date','Ngày'],['direction','Dòng tiền'],['category','Nhóm thu/chi'],['partner','Đối tượng'],['method','Phương thức'],['amount','Số tiền'],['pnl','KQ kinh doanh'],['reference','Chứng từ'],['note','Ghi chú']],'So_thu_chi_'+month);
  };
  return h('div',{className:'finance-page'},
    h('div',{className:'ptitle'},h('i',{className:'ti ti-cash-banknote'}),'Báo cáo dòng tiền'),
    h('div',{className:'finance-toolbar'},
      h('div',{className:'finance-tabs'},[['overview','Tổng quan'],['cash','Sổ thu / chi'],['debt','Công nợ'],['year','Tổng hợp năm']].map(([v,l])=>h('button',{key:v,className:tab===v?'on':'',onClick:()=>setTab(v)},l))),
      h('div',{className:'finance-actions'},h('input',{type:'month',value:month,onChange:e=>setMonth(e.target.value||currentMonth)}),h(ExportBtn,{onClick:exportCurrent}),h('button',{className:'bp',onClick:()=>{setEditEntry(null);setEntryModal('in');}},'+ Tiền vào'),h('button',{onClick:()=>{setEditEntry(null);setEntryModal('out');}},'− Tiền ra'))
    ),
    h('div',{className:'finance-kpis'},[
      ['Tiền đầu tháng',openingTotal,'ti-wallet'],['Tiền vào',inflow,'ti-arrow-down-left'],['Tiền ra',outflow,'ti-arrow-up-right'],['Tiền cuối tháng',endingTotal,'ti-cash'],['Doanh thu',revenue,'ti-chart-line'],['Chi phí',expense,'ti-receipt'],['Lợi nhuận',profit,'ti-report-money'],['Phải thu KH',receivable,'ti-user-dollar'],['Phải trả NCC',payable,'ti-building-bank']
    ].map(([label,value,icon])=>h('div',{className:'finance-kpi',key:label},h('i',{className:'ti '+icon}),h('span',null,label),h('b',{style:value<0?{color:'#A32D2D'}:null},finMoney(value))))),
    tab==='overview'&&h('div',{className:'finance-overview-grid'},
      h('div',{className:'card'},h('div',{className:'finance-card-title'},'Số dư tiền tháng '+month),opening.auto&&h('div',{className:'finance-auto-opening'},h('i',{className:'ti ti-refresh'}),' Tự chuyển từ số dư cuối tháng trước'),h('div',{className:'g2'},h(F,{label:'Tiền mặt đầu tháng'},h('input',{type:'number',value:openingEdit.cash,onChange:e=>setOpeningEdit(p=>({...p,cash:e.target.value}))})),h(F,{label:'Ngân hàng đầu tháng'},h('input',{type:'number',value:openingEdit.bank,onChange:e=>setOpeningEdit(p=>({...p,bank:e.target.value}))}))),h('button',{className:'bp',onClick:saveOpening},'Lưu tiền đầu tháng'),h('div',{className:'finance-balance-lines'},h('div',null,'Tiền mặt cuối tháng',h('b',null,finMoney(endingCash))),h('div',null,'Ngân hàng cuối tháng',h('b',null,finMoney(endingBank))),h('div',null,'Tổng tiền cuối tháng',h('b',null,finMoney(endingTotal))))),
      h('div',{className:'card'},h('div',{className:'finance-card-title'},'Kết quả kinh doanh'),h('div',{className:'finance-result'},h('div',null,'Doanh thu',h('b',null,finMoney(revenue))),h('div',null,'Chi phí',h('b',null,finMoney(expense))),h('div',{className:'profit'},'Lợi nhuận',h('b',{style:profit<0?{color:'#A32D2D'}:null},finMoney(profit)))),h('div',{className:'finance-note'},'Lợi nhuận = Doanh thu − Chi phí. Các khoản vay, vốn góp hoặc thu/trả công nợ có thể chọn “Không tính lợi nhuận”.'))
    ),
    tab==='cash'&&h('div',{className:'card'},h('div',{className:'finance-card-title'},'Sổ thu / chi tháng '+month),h('div',{className:'tw'},h('table',null,h('thead',null,h('tr',null,...['Ngày','Dòng tiền','Nhóm','Đối tượng','Phương thức','Số tiền','KQKD','Chứng từ','Ghi chú',''].map(x=>h('th',{key:x},x)))),h('tbody',null,monthEntries.length?monthEntries.map(x=>h('tr',{key:x.id},h('td',null,vnDateFromISO(x.date)),h('td',null,h('span',{className:'badge',style:{background:x.direction==='in'?'#EAF3DE':'#FCEBEB',color:x.direction==='in'?'#3B6D11':'#A32D2D'}},x.direction==='in'?'Tiền vào':'Tiền ra')),h('td',null,x.category),h('td',null,x.partnerName||'—'),h('td',null,x.method==='cash'?'Tiền mặt':'Ngân hàng'),h('td',null,h('b',null,finMoney(x.amount))),h('td',null,x.pnlType==='revenue'?'Doanh thu':x.pnlType==='expense'?'Chi phí':'Không tính'),h('td',null,x.reference||'—'),h('td',null,x.note||'—'),h('td',null,h('button',{className:'bi',onClick:()=>{setEditEntry(x);setEntryModal(x.direction);}},h('i',{className:'ti ti-edit'})),currentUser.role==='admin'&&h('button',{className:'bi bdel',onClick:()=>delEntry(x.id)},h('i',{className:'ti ti-trash'}))))):h('tr',null,h('td',{colSpan:10,className:'empty-st'},'Tháng này chưa có khoản thu/chi')))))),
    tab==='debt'&&h('div',null,
      h('div',{className:'finance-debt-actions'},h('button',{className:'bp',onClick:()=>{setEditDebt(null);setDebtModal('receivable');}},'+ Công nợ khách hàng'),h('button',{onClick:()=>{setEditDebt(null);setDebtModal('payable');}},'+ Công nợ nhà cung cấp')),
      h('div',{className:'card'},h('div',{className:'finance-card-title'},'Theo dõi công nợ'),h('div',{className:'tw'},h('table',null,h('thead',null,h('tr',null,...['Loại','Đối tượng','Ngày','Hạn trả','Chứng từ','Giá trị','Đã trả','Còn lại','Trạng thái',''].map(x=>h('th',{key:x},x)))),h('tbody',null,debtRows.length?debtRows.map(x=>{const status=debtStatus(x),overdue=status!=='paid'&&x.dueDate&&x.dueDate<isoDate();return h('tr',{key:x.id,style:overdue?{background:'#FFF5F5'}:null},h('td',null,x.kind==='receivable'?'Phải thu KH':'Phải trả NCC'),h('td',null,h('b',null,x.partnerName)),h('td',null,vnDateFromISO(x.date)),h('td',null,x.dueDate?vnDateFromISO(x.dueDate):'—'),h('td',null,x.invoiceNo||'—'),h('td',null,finMoney(x.amount)),h('td',null,finMoney(x.paidAmount)),h('td',null,h('b',null,finMoney(outstanding(x)))),h('td',null,h('span',{className:'badge',style:{background:status==='paid'?'#EAF3DE':overdue?'#FCEBEB':'#FAEEDA',color:status==='paid'?'#3B6D11':overdue?'#A32D2D':'#854F0B'}},overdue?'Quá hạn':finStatusLabel(status))),h('td',null,h('button',{className:'bi',onClick:()=>{setEditDebt(x);setDebtModal(x.kind);}},h('i',{className:'ti ti-edit'})),currentUser.role==='admin'&&h('button',{className:'bi bdel',onClick:()=>delDebt(x.id)},h('i',{className:'ti ti-trash'}))))}):h('tr',null,h('td',{colSpan:10,className:'empty-st'},'Chưa có công nợ'))))))
    ),
    tab==='year'&&h('div',{className:'card'},h('div',{className:'finance-card-title'},'Tổng hợp doanh thu, chi phí và lợi nhuận năm '+year),h('div',{className:'tw'},h('table',null,h('thead',null,h('tr',null,...['Tháng','Đầu kỳ','Tiền vào','Tiền ra','Cuối kỳ','Doanh thu','Chi phí','Lợi nhuận'].map(x=>h('th',{key:x},x)))),h('tbody',null,yearRows.map(x=>h('tr',{key:x.month},h('td',null,x.month),h('td',null,finMoney(x.opening)),h('td',null,finMoney(x.inflow)),h('td',null,finMoney(x.outflow)),h('td',null,h('b',null,finMoney(x.ending))),h('td',null,finMoney(x.revenue)),h('td',null,finMoney(x.expense)),h('td',null,h('b',{style:x.profit<0?{color:'#A32D2D'}:null},finMoney(x.profit))))))))),
    entryModal&&h(FinanceEntryForm,{entry:editEntry,direction:entryModal,customers,nccs,currentUser,onSave:saveEntry,onClose:()=>{setEntryModal(null);setEditEntry(null);}}),
    debtModal&&h(FinanceDebtForm,{debt:editDebt,kind:debtModal,customers,nccs,currentUser,onSave:saveDebt,onClose:()=>{setDebtModal(null);setEditDebt(null);}})
  );
}
