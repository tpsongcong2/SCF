/* ─── ĐƠN HÀNG CHI TIẾT ─── */
function OrderDetailListTab({orders, setOrders, products, customers, shifts, currentUser, prodShifts}) {
  const _td3=fmtDate();const _ti3=_td3.split('/').reverse().join('-');
  const [dateF, sdf] = useState(_ti3);
  const [dateT, sdt] = useState(_ti3);
  const [shiftF, ssf] = useState('all');
  const [areaF, saf] = useState('all');
  const [customerF, scf] = useState('all');

  // Flatten all order lines
  const rows = [];
  const cleanShiftName=name=>{
    const n=String(name||'').trim();
    return n.toLowerCase().includes('ngày')?'Ca sáng':n;
  };
  orders.forEach(o => {
    if (o.status === 'cancelled') return;
    const plan = prodShiftPlan(o,prodShifts||[]);
    const linePlans = prodShiftPlansForOrder(o,prodShifts||[]);
    (o.lines || []).forEach(l => {
      if (!l.productId) return;
      const linePlan=linePlans.find(p=>p.line===l||p.line?.id===l.id)||plan;
      const lineShiftName=cleanShiftName(linePlan?.shift?.name||'');
      rows.push({
        orderId: o.id,
        lineId: l.id,
        date: o.deliveryDate || '',
        point: o.pointName || '',
        customer: o.customer || '',
        product: l.productName || '',
        unit: l.unit || '',
        qtyProd: numFmt(l.qtyProd) || 0,
        qtyInvoice: numFmt(l.qtyInvoice) || 0,
        qtyDelivered: l.qtyDelivered,
        shift: l.shift || (lineShiftName.toLowerCase().includes('đêm')||lineShiftName.toLowerCase().includes('dem')?'night':'day'),
        shiftName: lineShiftName,
        time: o.deliveryTime || '',
        prodDate: linePlan?.prodDate || '',
        labelDate: linePlan?.labelDate || '',
        note: l.note || o.note || '',
        status: o.status,
        prodColor: (products.find(p=>p.id===l.productId)||{}).color||'',
        area: (()=>{
          if(o.area) return o.area;
          // Look up from customer delivery point
          let a='';
          (customers||[]).forEach(c=>(c.points||[]).forEach(pt=>{if(pt.id===o.pointId||pt.name===o.pointName)a=pt.area||'';}) );
          if(a) return a;
          // Look up from shifts
          const sh=(shifts||[]).find(s=>s.id===o.shiftId);
          return sh?sh.area||'':'';
        })(),
      });
    });
  });

  // Filters
  const parseD = s => { if(!s) return null; if(s.includes('-')){const[y,m,d]=s.split('-');return new Date(y,m-1,d);} const[d,m,y]=s.split('/'); return new Date(y,m-1,d); };
  const filtered = rows.filter(r => {
    if (shiftF !== 'all' && r.shiftName !== shiftF) return false;
    if (areaF !== 'all' && r.area !== areaF) return false;
    if (customerF !== 'all' && r.customer !== customerF) return false;
    if (dateF) { const d=parseD(r.date),f=parseD(dateF); if(d&&f&&d<f) return false; }
    if (dateT) { const d=parseD(r.date),t=parseD(dateT); if(d&&t&&d>t) return false; }
    return true;
  });

  const customerOptions = [...new Set(rows.map(r=>r.customer).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'vi'));
  const shiftOrder=name=>{
    const n=String(name||'').toLowerCase();
    if(n.includes('sáng')||n.includes('sang'))return 1;
    if(n.includes('chiều')||n.includes('chieu'))return 2;
    if(n.includes('đêm')||n.includes('dem'))return 3;
    return 9;
  };
  const shiftOptions=[
    ...new Set([
      ...(prodShifts||[]).filter(s=>s.active!==false).map(s=>cleanShiftName(s.name)).filter(Boolean),
      ...rows.map(r=>r.shiftName).filter(Boolean)
    ])
  ].sort((a,b)=>shiftOrder(a)-shiftOrder(b)||a.localeCompare(b,'vi'));
  const statusColor = {pending:'#FAEEDA',delivering:'#EAF3DE',done:'#E1F5EE'};
  const canEditDelivered=currentUser&&(currentUser.role==='admin'||currentUser.role==='manager'||currentUser.role==='driver'||currentUser.dept==='Kế toán');
  const updateDeliveredQty=(orderId,lineId,value)=>{
    const qty=numFmt(value);
    setOrders&&setOrders(prev=>prev.map(o=>o.id===orderId?{...o,lines:(o.lines||[]).map(l=>l.id===lineId?{...l,qtyDelivered:qty,deliveredAt:fmtDT(),deliveredBy:currentUser?.name||''}:l)}:o));
  };

  // Sort theo khu vực → địa điểm → giờ
  const sorted=[...filtered].sort((a,b)=>{
    const ac=(a.area||'zzz').localeCompare(b.area||'zzz','vi');
    if(ac!==0)return ac;
    const pc=(a.point||'').localeCompare(b.point||'','vi');
    if(pc!==0)return pc;
    return (a.time||'').localeCompare(b.time||'');
  });
  // Build rows với dòng header khu vực + dòng tổng
  const tableRows=[];
  let curArea=null,areaSX=0,areaHD=0,areaDG=0;
  sorted.forEach((r,i)=>{
    if(r.area!==curArea){
      if(curArea!==null) tableRows.push({_sub:true,area:curArea,sx:areaSX,hd:areaHD,dg:areaDG});
      curArea=r.area;areaSX=0;areaHD=0;areaDG=0;
      tableRows.push({_hdr:true,area:r.area||'Chưa phân khu vực'});
    }
    areaSX+=Number(r.qtyProd||0);areaHD+=Number(r.qtyInvoice||0);
    areaDG+=Number(r.qtyDelivered||0);
    tableRows.push(r);
    if(i===sorted.length-1) tableRows.push({_sub:true,area:curArea,sx:areaSX,hd:areaHD,dg:areaDG});
  });

  return h('div', null,
    h('div', {className:'card detail-filter-card', style:{marginBottom:'1rem'}},
      h('div', {className:'detail-filter-grid'},
        h(F, {label:'Từ ngày'}, h('input',{type:'date',value:dateF,onChange:e=>sdf(e.target.value)})),
        h(F, {label:'Đến ngày'}, h('input',{type:'date',value:dateT,onChange:e=>sdt(e.target.value)})),
        h(F, {label:'Khách hàng'}, h('select',{value:customerF,onChange:e=>scf(e.target.value)},
          h('option',{value:'all'},'Tất cả khách hàng'),
          customerOptions.map(c=>h('option',{key:c,value:c},c))
        )),
        h(F, {label:'Ca SX'}, h('select',{value:shiftF,onChange:e=>ssf(e.target.value)},
          h('option',{value:'all'},'Tất cả ca'),
          shiftOptions.map(name=>h('option',{key:name,value:name},name))
        )),
        h(F, {label:'Khu vực'}, h('select',{value:areaF,onChange:e=>saf(e.target.value)},
          h('option',{value:'all'},'Tất cả khu vực'),
          (()=>{
              const areas=new Set();
              (orders||[]).forEach(o=>{
                if(o.area) areas.add(o.area);
                (customers||[]).forEach(c=>(c.points||[]).forEach(pt=>{if((pt.id===o.pointId||pt.name===o.pointName)&&pt.area)areas.add(pt.area);}));
              });
              (shifts||[]).forEach(s=>s.area&&areas.add(s.area));
              return [...areas].sort().map(a=>h('option',{key:a,value:a},a));
            })()
        )),
        h('span',{className:'detail-count-badge'},filtered.length + ' dòng')
      )
    ),
    filtered.length>0&&h('div',{className:'detail-summary-row'},
      h('div',{style:{background:'#EAF3DE',border:'.5px solid #52b788',borderRadius:'var(--r)',padding:'10px 18px'}},
        h('div',{style:{fontSize:11,color:'#3B6D11',fontWeight:500,marginBottom:3}},'∑ TỔNG SL ĐẶT'),
        h('div',{style:{fontSize:22,fontWeight:700,color:'#2D5A0E'}},filtered.reduce((s,r)=>s+Number(r.qtyProd||0),0).toLocaleString())
      ),
      h('div',{style:{background:'#E6F1FB',border:'.5px solid #5B9BD5',borderRadius:'var(--r)',padding:'10px 18px'}},
        h('div',{style:{fontSize:11,color:'#185FA5',fontWeight:500,marginBottom:3}},'∑ TỔNG SL HĐ'),
        h('div',{style:{fontSize:22,fontWeight:700,color:'#185FA5'}},filtered.reduce((s,r)=>s+Number(r.qtyInvoice||0),0).toLocaleString())
      ),
      h('div',{style:{background:'#FFF7E6',border:'.5px solid #E0A800',borderRadius:'var(--r)',padding:'10px 18px'}},
        h('div',{style:{fontSize:11,color:'#8A5A00',fontWeight:500,marginBottom:3}},'∑ TỔNG SL ĐÃ GIAO'),
        h('div',{style:{fontSize:22,fontWeight:700,color:'#8A5A00'}},filtered.reduce((s,r)=>s+Number(r.qtyDelivered||0),0).toLocaleString())
      ),
      (()=>{const diff=filtered.reduce((s,r)=>s+Number(r.qtyProd||0),0)-filtered.reduce((s,r)=>s+Number(r.qtyInvoice||0),0);return h('div',{style:{background:diff===0?'#EAF3DE':'#FCEBEB',border:'.5px solid '+(diff===0?'#52b788':'#E06060'),borderRadius:'var(--r)',padding:'10px 18px'}},
        h('div',{style:{fontSize:11,color:diff===0?'#3B6D11':'#A32D2D',fontWeight:500,marginBottom:3}},diff===0?'✓ KHỚP':'⚠ CHÊNH LỆCH SX-HĐ'),
        h('div',{style:{fontSize:22,fontWeight:700,color:diff===0?'#2D5A0E':'#A32D2D'}},(diff>0?'+':'')+diff.toLocaleString())
      );})()
    ),
    h('div', {className:'tw detail-orders-wrap'},
      h('table', {style:{minWidth:1080}},
        h('thead', null, h('tr', null,
          ...['Ngày giao','Địa điểm','Sản phẩm','SL ĐẶT','SL HĐ','SL đã giao','Giờ','Ngày SX','Ngày in tem','Chú ý'].map(c=>h('th',{key:c},c))
        )),
        h('tbody', null,
          sorted.length ? tableRows.map((r,i)=>{
            if(r._hdr) return h('tr',{key:'h'+i,className:'area-sticky'},h('td',{colSpan:10,style:{background:'#2d6a4f',color:'#fff',fontWeight:700,fontSize:13,padding:'5px 12px'}},'📍 Khu vực: '+(r.area)));
            if(r._sub) return h('tr',{key:'s'+i},
              h('td',{colSpan:3,style:{background:'#e8f5e9',fontWeight:600,fontSize:12,padding:'4px 12px',color:'#2d6a4f',textAlign:'right'}},'Tổng '+r.area+':'),
              h('td',{style:{background:'#e8f5e9',fontWeight:700,color:'var(--pri)',fontSize:14,padding:'4px 8px'}},r.sx.toLocaleString()),
              h('td',{style:{background:'#e8f5e9',fontWeight:700,fontSize:14,padding:'4px 8px'}},r.hd.toLocaleString()),
              h('td',{style:{background:'#e8f5e9',fontWeight:700,color:'#8A5A00',fontSize:14,padding:'4px 8px'}},r.dg.toLocaleString()),
              h('td',{colSpan:4,style:{background:'#e8f5e9'}})
            );
            const canInput=canEditDelivered&&(r.status==='done'||r.status==='completed');
            return h('tr',{key:i,style:{background:r.prodColor||(r.shift==='night'?'rgba(83,52,131,.04)':'')}},
              h('td',null,h('span',{style:{fontWeight:500}},r.date)),
              h('td',null,h('div',{style:{fontWeight:600}},r.point||'—')),
              h('td',null,h('div',{style:{fontWeight:500}},r.product)),
              h('td',null,h('span',{style:{fontWeight:600,color:'var(--pri)',fontSize:15}},r.qtyProd.toLocaleString())),
              h('td',null,h('span',{style:{fontWeight:600,fontSize:15}},r.qtyInvoice.toLocaleString())),
              h('td',null,canInput
                ?h('input',{type:'number',min:0,step:'0.01',value:r.qtyDelivered??'',placeholder:String(r.qtyInvoice||0),onChange:e=>updateDeliveredQty(r.orderId,r.lineId,e.target.value),style:{fontSize:13,padding:'4px 6px',width:86,borderColor:(r.qtyDelivered!==undefined&&numFmt(r.qtyDelivered)!==numFmt(r.qtyInvoice))?'#E0A800':'var(--bd)'}})
                :h('span',{style:{fontWeight:600,color:r.qtyDelivered!==undefined?'#8A5A00':'var(--tx2)',fontSize:15}},r.qtyDelivered!==undefined?numFmt(r.qtyDelivered).toLocaleString():'—')
              ),
              h('td',null,r.time||'—'),
              h('td',null,h('span',{style:{fontSize:12,fontWeight:600,color:'var(--pri3)',whiteSpace:'nowrap'}},r.prodDate||'—')),
              h('td',null,h('span',{style:{fontSize:12,fontWeight:600,color:'#8A5A00',whiteSpace:'nowrap'}},r.labelDate||'—')),
              h('td',null,h('span',{style:{fontSize:12,color:'var(--tx2)'}},r.note||'—'))
            );
          }) : h('tr',null,h('td',{colSpan:10,className:'empty-st'},'Không có dữ liệu.'))
        )
      )
    )
  );
}

