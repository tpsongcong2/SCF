/* ─── DELIVERY TRIPS ─── */
function TripForm({trip,orders,employees,shifts,customers,products,currentUser,onSave,onClose}){
  const drivers=employees.filter(e=>e.role==='driver'||e.dept==='Lái xe');
  const[f,sf]=useState(trip?{driverWork:0,weightRate:0,tripAllowance:0,attendanceStatus:'pending',...trip}:{driverName:'',driverId:'',shiftId:'',shiftName:'',deliveryDate:fmtDate(),deliveryTime:'07:00',orderIds:[],note:'',status:'planning',driverWork:0,weightRate:0,tripAllowance:0,attendanceStatus:'pending'});
  const s=(k,v)=>sf(p=>({...p,[k]:v}));
  // Bộ lọc đơn hàng
  const[fArea,setFArea]=useState('');
  const[fDate,setFDate]=useState('');
  const[fCust,setFCust]=useState('');
  const[fTimeFrom,setFTimeFrom]=useState('');
  const[fTimeTo,setFTimeTo]=useState('');
  // Lấy khu vực của đơn
  const getOArea=o=>{
    const c=customers?.find(x=>x.id===o.customerId);
    const pt=(c?.points||[]).find(p=>p.id===o.pointId||p.name===o.pointName);
    return o.area||pt?.area||'';
  };
  const availOrders=orders.filter(o=>o.status==='pending'||(trip&&(trip.orderIds||[]).includes(o.id)));
  // Áp dụng bộ lọc
  const filteredOrders=availOrders.filter(o=>{
    if(fDate&&o.deliveryDate!==fDate.split('-').reverse().join('/'))return false;
    if(fArea&&getOArea(o)!==fArea)return false;
    if(fCust&&o.customerId!==fCust)return false;
    if(fTimeFrom&&o.deliveryTime&&o.deliveryTime<fTimeFrom)return false;
    if(fTimeTo&&o.deliveryTime&&o.deliveryTime>fTimeTo)return false;
    return true;
  });
  const toggle=id=>sf(p=>({...p,orderIds:(p.orderIds||[]).includes(id)?p.orderIds.filter(x=>x!==id):[...p.orderIds,id]}));
  const toggleAll=()=>{
    const ids=filteredOrders.map(o=>o.id);
    const allChecked=ids.every(id=>(f.orderIds||[]).includes(id));
    sf(p=>({...p,orderIds:allChecked?p.orderIds.filter(id=>!ids.includes(id)):[...new Set([...p.orderIds,...ids])]}));
  };
  const lineQty=l=>numFmt(l.qtyInvoice)||numFmt(l.qtyProd)||numFmt(l.qty)||numFmt(l.quantity)||0;
  const lineWeight=l=>{const prod=products?.find(p=>p.id===l.productId);const unit=String(l.unit||prod?.unit||'').trim().toLowerCase().replace(/[^a-z]/g,'');const qty=lineQty(l);if(unit==='kg'||unit==='kgs'||unit==='kilogram'||unit==='kilograms')return qty;const wpu=prod?.weightPerUnit||numFmt(l.weightPerUnit)||0;return wpu*qty;};
  const orderWeight=o=>(o.lines||[]).reduce((s,l)=>s+lineWeight(l),0);
  const totalW=(f.orderIds||[]).reduce((sum,oid)=>{const o=orders.find(x=>x.id===oid);return sum+(o?orderWeight(o):0);},0);
  const submit=()=>{
    if(!f.driverName){window.showToast('Vui lòng chọn hoặc nhập tên lái xe!','warn');return;}
    if(f.orderIds.length===0){window.showToast('Vui lòng chọn ít nhất 1 đơn hàng!','warn');return;}
    onSave({...f,totalWeight:totalW,updatedBy:currentUser.name,updatedAt:fmtDT()});
  };
  // Danh sách khu vực và KH để lọc
  const allAreas=[...new Set(availOrders.map(o=>getOArea(o)).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'vi'));
  const allCusts=[...new Set(availOrders.map(o=>o.customerId).filter(Boolean))].map(id=>customers?.find(c=>c.id===id)).filter(Boolean);
  const allFilteredChecked=filteredOrders.length>0&&filteredOrders.every(o=>(f.orderIds||[]).includes(o.id));
  const someFilteredChecked=filteredOrders.some(o=>(f.orderIds||[]).includes(o.id))&&!allFilteredChecked;
  const isCompleted=f.status==='completed';

  return h(Modal,{title:trip?'Sửa chuyến '+trip.id:'Tạo chuyến giao hàng',onClose,lg:true},
    h('div',{className:'g2'},
      h(F,{label:'Lái xe *'},h('select',{value:f.driverId,onChange:e=>{const emp=employees.find(x=>x.id===e.target.value);sf(p=>({...p,driverId:e.target.value,driverName:emp?emp.name:p.driverName}));},style:{marginBottom:0}},
        h('option',{value:''},'— Chọn từ danh sách —'),drivers.map(e=>h('option',{key:e.id,value:e.id},e.name))
      )),
      h(F,{label:'Hoặc nhập tên lái xe'},h('input',{value:f.driverName,onChange:e=>s('driverName',e.target.value),placeholder:'Tên lái xe...'})),
    ),
    h('div',{className:'g3'},
      h(F,{label:'Ngày giao'},h('input',{value:f.deliveryDate,onChange:e=>s('deliveryDate',e.target.value),placeholder:'DD/MM/YYYY'})),
      h(F,{label:'Ca giao'},h('select',{value:f.shiftId,onChange:e=>{const sh=(shifts||[]).find(x=>x.id===e.target.value);sf(p=>({...p,shiftId:e.target.value,shiftName:sh?sh.name:'',deliveryTime:sh&&sh.startTime?sh.startTime:p.deliveryTime}));}},
        h('option',{value:''},'— Chọn ca —'),
        (shifts||[]).map(sh=>h('option',{key:sh.id,value:sh.id},sh.name||sh.id))
      )),
      h(F,{label:'Công lái xe'},h('input',{type:'number',step:'0.5',min:'0',value:f.driverWork,onChange:e=>s('driverWork',parseFloat(e.target.value)||0),placeholder:'0'})),
      h(F,{label:'Đơn giá/kg'},h('input',{type:'number',min:'0',value:f.weightRate||0,onChange:e=>s('weightRate',parseFloat(e.target.value)||0),placeholder:'0'})),
      h(F,{label:'Phụ cấp chuyến'},h('input',{type:'number',min:'0',value:f.tripAllowance||0,onChange:e=>s('tripAllowance',parseFloat(e.target.value)||0),placeholder:'0'})),
      h(F,{label:'Trạng thái'},h('select',{value:f.status,onChange:e=>s('status',e.target.value)},
        [['planning','Lên kế hoạch'],['assigned','Đã giao lái xe'],['active','Đang giao'],['completed','Hoàn thành']].map(([v,l])=>h('option',{key:v,value:v},l))
      )),
    ),
    h(F,{label:'Ghi chú'},h('textarea',{value:f.note,onChange:e=>s('note',e.target.value),rows:2})),
    h('div',{className:'divider'}),
    // ── PHẦN 1: ĐÃ TRONG CHUYẾN (luôn hiện trên cùng) ──
    (()=>{
      const inTripAll=availOrders.filter(o=>(f.orderIds||[]).includes(o.id));
      if(inTripAll.length===0)return null;
      return h('div',{style:{marginBottom:8}},
        h('div',{style:{padding:'5px 10px',background:'#2d6a4f',color:'#fff',fontSize:12,fontWeight:700,
          borderRadius:'var(--r) var(--r) 0 0',display:'flex',justifyContent:'space-between',alignItems:'center'}},
          h('span',null,'✓ ĐÃ TRONG CHUYẾN ('+inTripAll.length+' đơn · '+totalW.toFixed(1)+' kg)'),
          !isCompleted&&h('button',{onClick:()=>sf(p=>({...p,orderIds:[]})),
            style:{fontSize:11,padding:'1px 8px',background:'rgba(255,255,255,.2)',border:'1px solid rgba(255,255,255,.4)',color:'#fff',borderRadius:4,cursor:'pointer'}
          },'Bỏ tất cả')
        ),
        h('div',{style:{maxHeight:180,overflowY:'auto',border:'1px solid #2d6a4f',borderTop:'none',
          borderRadius:'0 0 var(--r) var(--r)',padding:4,background:'#f5fbf5'}},
          inTripAll.map(o=>{
            const w=orderWeight(o);
            const oCust=customers?.find(c=>c.id===o.customerId)||null;
            const oPt=oCust?(oCust.points||[]).find(p=>p.id===o.pointId||p.name===o.pointName):null;
            const oArea=o.area||oPt?.area||'';
            return h('label',{key:o.id,style:{display:'flex',alignItems:'center',gap:10,padding:'6px 8px',
              borderRadius:'var(--r)',cursor:'pointer',marginBottom:2,
              background:'#f0faf0',border:'1px solid var(--pri)'}},
              h('input',{type:'checkbox',checked:true,disabled:isCompleted,onChange:()=>toggle(o.id),
                style:{width:'auto',flexShrink:0,accentColor:'var(--pri)'}}),
              h('div',{style:{flex:1,minWidth:0}},
                h('div',{style:{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}},
                  h('span',{style:{fontWeight:600,fontSize:13,color:'var(--pri)'}},o.pointName||o.customer||o.id),
                  oArea&&h('span',{style:{fontSize:11,background:'#e8f5e9',color:'#2d6a4f',padding:'1px 7px',borderRadius:10,fontWeight:600}},oArea),
                  o.deliveryTime&&h('span',{style:{fontSize:12,background:'var(--bg2)',padding:'1px 6px',borderRadius:8,color:'var(--tx2)'}},
                    h('i',{className:'ti ti-clock',style:{fontSize:10,marginRight:2}}),o.deliveryTime)
                ),
                h('div',{style:{fontSize:11,color:'var(--tx2)',marginTop:2,display:'flex',gap:8}},
                  h('span',null,o.id),
                  o.customer&&o.customer!==o.pointName&&h('span',null,'KH: '+o.customer),
                  w>0&&h('span',{style:{color:'#2d6a4f',fontWeight:500}},w.toFixed(1)+' kg'),
                  (o.lines||[]).length>0&&h('span',null,(o.lines||[]).length+' SP')
                )
              )
            );
          })
        )
      );
    })(),
    // ── PHẦN 2: BỘ LỌC + THÊM ĐƠN ──
    !isCompleted&&h('div',{style:{marginBottom:6}},
      h('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}},
        h('div',{style:{fontWeight:600,fontSize:13,color:'var(--tx2)'}},'+ Thêm đơn hàng vào chuyến'),
        filteredOrders.filter(o=>!(f.orderIds||[]).includes(o.id)).length>0&&h('button',{
          onClick:()=>sf(p=>({...p,orderIds:[...new Set([...p.orderIds,...filteredOrders.map(o=>o.id)])]})),
          style:{fontSize:12,padding:'3px 10px',border:'1px solid var(--pri)',color:'var(--pri)',background:'transparent',borderRadius:'var(--r)',cursor:'pointer'}
        },'Chọn tất cả ('+filteredOrders.filter(o=>!(f.orderIds||[]).includes(o.id)).length+')')
      ),
      h('div',{style:{display:'flex',gap:6,flexWrap:'wrap',marginBottom:6}},
        h('input',{type:'date',value:fDate,onChange:e=>setFDate(e.target.value),
          style:{padding:'4px 8px',fontSize:12,border:'1px solid var(--bd)',borderRadius:'var(--r)'}
        }),
        h('select',{value:fArea,onChange:e=>setFArea(e.target.value),
          style:{padding:'4px 8px',fontSize:12,border:'1px solid var(--bd)',borderRadius:'var(--r)',flex:'1 1 90px'}
        },h('option',{value:''},'Tất cả khu vực'),allAreas.map(a=>h('option',{key:a,value:a},a))),
        h('select',{value:fCust,onChange:e=>setFCust(e.target.value),
          style:{padding:'4px 8px',fontSize:12,border:'1px solid var(--bd)',borderRadius:'var(--r)',flex:'1 1 110px'}
        },h('option',{value:''},'Tất cả KH'),allCusts.map(c=>h('option',{key:c.id,value:c.id},c.name))),
        h('div',{style:{display:'flex',alignItems:'center',gap:4}},
          h('input',{type:'time',value:fTimeFrom,onChange:e=>setFTimeFrom(e.target.value),
            title:'Giờ từ',style:{padding:'4px 6px',fontSize:12,border:'1px solid var(--bd)',borderRadius:'var(--r)',width:90}
          }),
          h('span',{style:{fontSize:12,color:'var(--tx2)'}},'→'),
          h('input',{type:'time',value:fTimeTo,onChange:e=>setFTimeTo(e.target.value),
            title:'Giờ đến',style:{padding:'4px 6px',fontSize:12,border:'1px solid var(--bd)',borderRadius:'var(--r)',width:90}
          })
        ),
        (fDate||fArea||fCust||fTimeFrom||fTimeTo)&&h('button',{
          onClick:()=>{setFDate('');setFArea('');setFCust('');setFTimeFrom('');setFTimeTo('');},
          style:{padding:'4px 8px',fontSize:12,color:'#A32D2D',border:'1px solid #f0a0a0',borderRadius:'var(--r)',background:'transparent',cursor:'pointer'}
        },'✕ Xóa lọc')
      )
    ),
    !isCompleted&&(()=>{
      // Render 1 order item
      const renderOrder=(o,checked,highlight)=>{
        const w=orderWeight(o);
        const oCust=customers?.find(c=>c.id===o.customerId)||null;
        const oPt=oCust?(oCust.points||[]).find(p=>p.id===o.pointId||p.name===o.pointName):null;
        const oArea=o.area||oPt?.area||'';
        return h('label',{key:o.id,style:{display:'flex',alignItems:'center',gap:10,padding:'7px 8px',
          borderRadius:'var(--r)',cursor:'pointer',marginBottom:2,
          background:highlight?'#f0faf0':checked?'#EEF5FF':'#fff',
          border:'1px solid '+(highlight?'var(--pri)':checked?'#93c5fd':'var(--bd)')}},
          h('input',{type:'checkbox',checked,onChange:()=>toggle(o.id),style:{width:'auto',flexShrink:0,accentColor:'var(--pri)'}}),
          h('div',{style:{flex:1,minWidth:0}},
            h('div',{style:{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}},
              h('span',{style:{fontWeight:600,fontSize:13,color:'var(--pri)'}},o.pointName||o.customer||o.id),
              oArea&&h('span',{style:{fontSize:11,background:'#e8f5e9',color:'#2d6a4f',padding:'1px 7px',borderRadius:10,fontWeight:600}},oArea),
              o.deliveryTime&&h('span',{style:{fontSize:12,background:'var(--bg2)',padding:'1px 6px',borderRadius:8,color:'var(--tx2)'}},
                h('i',{className:'ti ti-clock',style:{fontSize:10,marginRight:2}}),o.deliveryTime
              )
            ),
            h('div',{style:{fontSize:11,color:'var(--tx2)',marginTop:2,display:'flex',gap:8}},
              h('span',null,o.id),
              o.customer&&o.customer!==o.pointName&&h('span',null,'KH: '+o.customer),
              w>0&&h('span',{style:{color:'#2d6a4f',fontWeight:500}},w.toFixed(1)+' kg'),
              (o.lines||[]).length>0&&h('span',null,(o.lines||[]).length+' SP')
            )
          )
        );
      };
      // Đã trong chuyến: lấy từ TẤT CẢ đơn (không qua filter) để luôn hiện đủ
      // Có thể thêm: qua filter, chưa trong chuyến
      const notInTrip=filteredOrders.filter(o=>!(f.orderIds||[]).includes(o.id));
      return h('div',{style:{border:'.5px solid var(--bd)',borderRadius:'var(--r)',overflow:'hidden'}},
        // Phần ĐÃ CÓ trong chuyến
        // Phần CÓ THỂ THÊM
        h('div',null,
          h('div',{style:{padding:'5px 10px',background:'var(--bg2)',fontSize:11,fontWeight:700,color:'var(--tx2)',letterSpacing:.5,borderTop:'none',display:'flex',justifyContent:'space-between',alignItems:'center'}},
            h('span',null,notInTrip.length>0?'+ CÓ THỂ THÊM ('+notInTrip.length+' đơn)':'Không có đơn hàng nào thêm'),
            notInTrip.length>0&&h('button',{onClick:()=>sf(p=>({...p,orderIds:[...new Set([...p.orderIds,...notInTrip.map(o=>o.id)])]})),
              style:{fontSize:11,padding:'1px 8px',border:'1px solid var(--pri)',color:'var(--pri)',background:'transparent',borderRadius:4,cursor:'pointer'}
            },'Thêm tất cả')
          ),
          notInTrip.length>0&&h('div',{style:{maxHeight:220,overflowY:'auto',padding:6}},
            notInTrip.map(o=>renderOrder(o,false,false))
          ),
          notInTrip.length===0&&h('div',{style:{textAlign:'center',padding:'1rem',color:'var(--tx2)',fontSize:13}},
            fDate||fArea||fCust?'Không có đơn hàng khớp bộ lọc.':'Không có đơn hàng chờ giao.'
          )
        )
      );
    })(),
    h(Row,null,h('button',{onClick:onClose},'Hủy'),h('button',{className:'bp',onClick:submit,style:{padding:'8px 20px'}},h('i',{className:'ti ti-device-floppy',style:{fontSize:14}}),'Lưu chuyến'))
  );
}
function BulkTripModal({orders,employees,shifts,customers,products,trips,currentUser,initialDate,initialShift,onSave,onClose}){
  const today=new Date().toISOString().slice(0,10);
  const [date,setDate]=useState(initialDate||today);
  const [selShifts,setSelShifts]=useState(initialShift?[initialShift]:[]); // shift ids
  const [selAreas,setSelAreas]=useState([]);   // areas
  const [driver,setDriver]=useState('');
  const [driverName,setDriverName]=useState('');
  const drivers=employees.filter(e=>e.role==='driver'||e.dept==='Lái xe');

  // Lấy khu vực của đơn
  const getOArea=o=>{
    const c=customers?.find(x=>x.id===o.customerId);
    const pt=(c?.points||[]).find(p=>p.id===o.pointId||p.name===o.pointName);
    return o.area||pt?.area||'';
  };
  const fmtDate2=s=>{if(!s)return'';const[y,m,d]=s.split('-');return d+'/'+m+'/'+y;};
  const dateVN=fmtDate2(date);

  // Đơn hàng chờ theo ngày
  const pendingOrders=orders.filter(o=>{
    if(o.tripId||o.status==='done'||o.status==='cancelled')return false;
    return !dateVN||o.deliveryDate===dateVN;
  });
  const allAreas=[...new Set(pendingOrders.map(o=>getOArea(o)).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'vi'));
  const allShifts=shifts||[];

  const toggleShift=id=>setSelShifts(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);
  const toggleArea=a=>setSelAreas(p=>p.includes(a)?p.filter(x=>x!==a):[...p,a]);
  const lineQty=l=>numFmt(l.qtyInvoice)||numFmt(l.qtyProd)||numFmt(l.qty)||numFmt(l.quantity)||0;
  const lineWeight=l=>{const prod=products?.find(p=>p.id===l.productId);const unit=String(l.unit||prod?.unit||'').trim().toLowerCase().replace(/[^a-z]/g,'');const qty=lineQty(l);if(unit==='kg'||unit==='kgs'||unit==='kilogram'||unit==='kilograms')return qty;const wpu=prod?.weightPerUnit||numFmt(l.weightPerUnit)||0;return wpu*qty;};
  const orderWeight=o=>(o.lines||[]).reduce((s,l)=>s+lineWeight(l),0);
  const ordersWeight=rows=>(rows||[]).reduce((s,o)=>s+orderWeight(o),0);

  // Preview: logic đúng
  // - Chọn ca + khu vực → mỗi combo (ca × khu vực) = 1 chuyến, đơn thuộc khu vực đó
  // - Chỉ chọn ca (không chọn khu vực) → mỗi ca = 1 chuyến, gộp tất cả đơn
  // - Chỉ chọn khu vực (không chọn ca) → mỗi khu vực = 1 chuyến
  // - Không chọn gì → mỗi khu vực = 1 chuyến (gộp tất cả)
  const preview=React.useMemo(()=>{
    const combos=[];
    const useShifts=selShifts.length>0?allShifts.filter(s=>selShifts.includes(s.id)):[];
    const useAreas=selAreas.length>0?selAreas:allAreas;
    if(useShifts.length>0&&useAreas.length>0){
      // Ca × Khu vực
      useShifts.forEach(sh=>{
        useAreas.forEach(area=>{
          const matchOrders=pendingOrders.filter(o=>getOArea(o)===area);
          if(matchOrders.length===0)return;
          combos.push({shiftId:sh.id,shiftName:sh.name||sh.id,area,orders:matchOrders});
        });
      });
    } else if(useShifts.length>0){
      // Chỉ theo ca — gộp tất cả khu vực vào mỗi ca
      useShifts.forEach(sh=>{
        if(pendingOrders.length===0)return;
        combos.push({shiftId:sh.id,shiftName:sh.name||sh.id,area:'Tất cả',orders:pendingOrders});
      });
    } else {
      // Theo khu vực (mặc định)
      useAreas.forEach(area=>{
        const matchOrders=pendingOrders.filter(o=>getOArea(o)===area);
        if(matchOrders.length===0)return;
        combos.push({shiftId:'',shiftName:'',area,orders:matchOrders});
      });
    }
    return combos;
  },[selShifts.join(','),selAreas.join(','),date,pendingOrders.length]);

  const submit=()=>{
    if(preview.length===0){window.showToast('Không có đơn hàng phù hợp để tạo chuyến!','warn');return;}
    const drName=driverName||(drivers.find(d=>d.id===driver)?.name||'');
    // Tạo ID trước để check trùng trong batch
    const usedIds=new Set(trips.map(t=>t.id));
    const newTrips=[];
    const dupWarnings=[];
    const dupCombos=preview.filter(combo=>combo.shiftId&&trips.some(t=>t.deliveryDate===dateVN&&t.shiftId===combo.shiftId));
    if(dupCombos.length>0){
      window.showToast('Ngày '+dateVN+' đã có chuyến giao hàng trùng ca: '+dupCombos.map(c=>c.shiftName||c.shiftId).join(', ')+'. Không tạo thêm.','warn');
      return;
    }
    preview.forEach(combo=>{
      const [dd,mm,yy]=(dateVN||fmtDate()).split('/');
      const datePart=(dd||'')+(mm||'')+(yy||'').slice(-2);
      const shiftAbbr=(combo.shiftName||'').toUpperCase()
        .replace(/CA\s*/,'')
        .replace(/SÁNG|SANG/,'S').replace(/TRƯA|TRUA/,'T')
        .replace(/CHIỀU|CHIEU/,'C').replace(/ĐÊM|DEM/,'D')
        .replace(/[^A-Z0-9]/g,'').slice(0,3)||(combo.area||'XX').replace(/[^A-Z0-9]/gi,'').slice(0,2).toUpperCase();
      const driverAbbr=drName.trim().split(/\s+/).map(w=>w[0]).join('').toUpperCase().slice(0,3);
      const areaCode=(combo.area||'').replace(/[^A-Z0-9]/gi,'').slice(0,3).toUpperCase();
      let baseId='CH'+datePart+shiftAbbr+'_'+areaCode+'_'+(driverAbbr||'XX');
      let id=baseId; let seq=2;
      while(usedIds.has(id)){id=baseId+'_'+seq;seq++;}
      // Kiểm tra trùng: chuyến cùng ngày + khu vực khi không chọn ca
      const dupTrip=trips.find(t=>
        t.deliveryDate===dateVN&&
        !combo.shiftId&&
        t.id.includes(areaCode)
      );
      if(dupTrip) dupWarnings.push('⚠ Khu vực '+combo.area+(combo.shiftName?' / '+combo.shiftName:'')+' đã có chuyến: '+dupTrip.id);
      usedIds.add(id);
      const w=ordersWeight(combo.orders);
      newTrips.push({
        id,driverName:drName,driverId:driver||'',
        shiftId:combo.shiftId,shiftName:combo.shiftName,
        deliveryDate:dateVN,deliveryTime:'',
        orderIds:combo.orders.map(o=>o.id),
        status:drName?'assigned':'planning',note:'',driverWork:0,weightRate:0,tripAllowance:0,attendanceStatus:'pending',totalWeight:w,
        createdAt:fmtDate(),updatedBy:currentUser.name,updatedAt:fmtDT()
      });
    });
    // Cảnh báo trùng khu vực khi tạo không theo ca
    if(dupWarnings.length>0){
      const msg=dupWarnings.join('\n')+'\n\nVẫn tiếp tục tạo '+newTrips.length+' chuyến mới?';
      if(!confirm(msg))return;
    }
    onSave(newTrips);
  };

  return h(Modal,{title:'Tạo nhiều chuyến cùng lúc',onClose,lg:true},
    h('div',{className:'g2',style:{marginBottom:12}},
      h(F,{label:'Ngày giao'},h('input',{type:'date',value:date,onChange:e=>setDate(e.target.value)})),
      h('div',{style:{display:'flex',flexDirection:'column',gap:6}},
        h(F,{label:'Lái xe'},h('select',{value:driver,onChange:e=>{setDriver(e.target.value);const emp=drivers.find(x=>x.id===e.target.value);if(emp)setDriverName(emp.name);}},
          h('option',{value:''},'— Chọn từ danh sách —'),
          drivers.map(e=>h('option',{key:e.id,value:e.id},e.name))
        )),
        h(F,{label:'Hoặc nhập tên'},h('input',{value:driverName,onChange:e=>setDriverName(e.target.value),placeholder:'Tên lái xe...'}))
      )
    ),
    // Chọn ca
    allShifts.length>0&&h('div',{style:{marginBottom:12}},
      h('div',{style:{fontSize:12,fontWeight:600,color:'var(--tx2)',marginBottom:6}},
        'Ca giao hàng (không chọn = tạo theo khu vực, không phân ca)'
      ),
      h('div',{style:{display:'flex',gap:8,flexWrap:'wrap'}},
        allShifts.map(sh=>h('label',{key:sh.id,
          style:{display:'flex',alignItems:'center',gap:6,padding:'5px 12px',
            borderRadius:'var(--r)',border:'1px solid '+(selShifts.includes(sh.id)?'var(--pri)':'var(--bd)'),
            cursor:'pointer',background:selShifts.includes(sh.id)?'#f0faf0':'#fff',fontSize:13}
        },
          h('input',{type:'checkbox',checked:selShifts.includes(sh.id),onChange:()=>toggleShift(sh.id),style:{cursor:'pointer'}}),
          sh.name||sh.id
        ))
      )
    ),
    // Chọn khu vực
    allAreas.length>0&&h('div',{style:{marginBottom:12}},
      h('div',{style:{fontSize:12,fontWeight:600,color:'var(--tx2)',marginBottom:6}},
        'Khu vực (không chọn = tất cả khu vực)'
      ),
      h('div',{style:{display:'flex',gap:8,flexWrap:'wrap'}},
        allAreas.map(a=>h('label',{key:a,
          style:{display:'flex',alignItems:'center',gap:6,padding:'5px 12px',
            borderRadius:'var(--r)',border:'1px solid '+(selAreas.includes(a)?'var(--pri)':'var(--bd)'),
            cursor:'pointer',background:selAreas.includes(a)?'#f0faf0':'#fff',fontSize:13}
        },
          h('input',{type:'checkbox',checked:selAreas.includes(a),onChange:()=>toggleArea(a),style:{cursor:'pointer'}}),
          a
        ))
      )
    ),
    // Preview chuyến sẽ tạo
    preview.length>0&&h('div',{style:{marginBottom:12}},
      h('div',{style:{fontWeight:600,fontSize:13,color:'var(--pri3)',marginBottom:8}},
        '📋 Sẽ tạo '+preview.length+' chuyến:'
      ),
      h('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:8}},
        preview.map((combo,i)=>h('div',{key:i,style:{border:'1px solid var(--bd)',borderRadius:'var(--r)',
          padding:'8px 10px',background:'#f5fbf5'}},
          h('div',{style:{fontWeight:600,fontSize:13,color:'var(--pri)'}},combo.area),
          combo.shiftName&&h('div',{style:{fontSize:12,color:'var(--tx2)'}},combo.shiftName),
          h('div',{style:{fontSize:12,marginTop:4}},combo.orders.length+' đơn · '+
            ordersWeight(combo.orders).toFixed(1)+' kg'
          )
        ))
      )
    ),
    preview.length===0&&date&&h('div',{style:{textAlign:'center',padding:'1rem',color:'var(--tx2)',fontSize:13}},
      'Không có đơn hàng chờ giao vào ngày '+fmtDate2(date)
    ),
    h(Row,null,
      h('button',{onClick:onClose},'Hủy'),
      h('button',{className:'bp',onClick:submit,style:{padding:'8px 20px'},disabled:preview.length===0},
        h('i',{className:'ti ti-stack-2',style:{fontSize:14}}),
        ' Tạo '+preview.length+' chuyến'
      )
    )
  );
}

function TripsTab({trips,setTrips,orders,setOrders,employees,shifts,customers,products,currentUser}){
  const[modal,sm]=useState(null);const[edit,se]=useState(null);const[open,so]=useState(null);
  const _td1=fmtDate();const _ti1=_td1.split('/').reverse().join('-');const[fDate,sfDate]=useState(_ti1);const[fShift,sfShift]=useState('');const[fDriver,sfDriver]=useState('');
  const isDriver=currentUser?.role==='driver';
  const canManageTrips=currentUser?.role==='admin'||currentUser?.role==='manager';
  const deptKey=String(currentUser?.dept||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const canEditDeliveryOrder=canManageTrips||deptKey.includes('ke toan');
  const cleanName=s=>String(s||'').trim().toLowerCase().replace(/\s+/g,' ');
  const isOwnTrip=t=>!isDriver||t.driverId===currentUser.id||cleanName(t.driverName)===cleanName(currentUser.name);
  const visibleTrips=trips.filter(isOwnTrip);
  const canUploadProof=canManageTrips||isDriver;
  let tSeq=trips.length+1;
  const orderStatusForTrip=s=>s==='active'?'delivering':s==='completed'?'done':'assigned';
  const save=d=>{
    if(edit){
      const old=trips.find(t=>t.id===edit.id);
      const tripId=edit.id;
      if(old){setOrders(p=>p.map(o=>{
        if((old.orderIds||[]).includes(o.id)&&!(d.orderIds||[]).includes(o.id))return {...o,tripId:null,status:'pending'};
        if((d.orderIds||[]).includes(o.id))return {...o,tripId,status:orderStatusForTrip(d.status)};
        return o;
      }));}
      setTrips(p=>p.map(t=>t.id===edit.id?{...edit,...d,id:tripId}:t));
    } else {
      const [dd2,mm2,yy2]=(d.deliveryDate||fmtDate()).split('/');
      const datePart=(dd2||'00')+(mm2||'00')+(yy2||'0000').slice(-2);
      // Ca: lấy chữ viết tắt (CA SANG→S, CA TRUA→T, CA CHIEU→C, CA DEM→D)
      const shiftAbbr=(d.shiftName||'').toUpperCase()
        .replace(/CA\s*/,'')
        .replace(/SÁNG|SANG/,'S').replace(/TRƯA|TRUA/,'T')
        .replace(/CHIỀU|CHIEU/,'C').replace(/ĐÊM|DEM/,'D')
        .replace(/[^A-Z0-9]/g,'').slice(0,3)||'CA';
      // Lái xe: 2-3 chữ cái đầu họ tên
      const driverAbbr=d.driverName?(d.driverName.trim().split(/\s+/).map(w=>w[0]).join('').toUpperCase().slice(0,3)):'';
      const baseId='CH'+datePart+shiftAbbr+(driverAbbr?'_'+driverAbbr:'');
      // Tránh trùng: thêm số thứ tự nếu cần
      let id=baseId;
      let seq=2;
      while(trips.find(t=>t.id===id)){id=baseId+'_'+seq;seq++;}
      setTrips(p=>[...p,{...d,id,createdAt:fmtDate()}]);
      setOrders(p=>p.map(o=>(d.orderIds||[]).includes(o.id)?{...o,tripId:id,status:orderStatusForTrip(d.status)}:o));
    }
    sm(null);se(null);
  };
  const del=id=>{
    const t=trips.find(x=>x.id===id);
    if(t)setOrders(p=>p.map(o=>(t.orderIds||[]).includes(o.id)?{...o,tripId:null,status:'pending'}:o));
    if(confirm('Xóa chuyến giao?'))setTrips(p=>p.filter(x=>x.id!==id));
  };
  const updStatus=(id,status)=>{
    const t=trips.find(x=>x.id===id);
    const stamp=fmtDT();
    setTrips(p=>p.map(x=>x.id===id?{
      ...x,
      status,
      ...(status==='assigned'?{assignedAt:x.assignedAt||stamp}:{}),
      ...(status==='active'?{startTime:x.startTime||stamp}:{}),
      ...(status==='completed'?{endTime:x.endTime||stamp,completedAt:x.completedAt||stamp,attendanceStatus:x.attendanceStatus||'pending'}:{})
    }:x));
    if(t){
      if(status==='assigned')setOrders(p=>p.map(o=>(t.orderIds||[]).includes(o.id)?{...o,status:'assigned'}:o));
      if(status==='active')setOrders(p=>p.map(o=>(t.orderIds||[]).includes(o.id)?{...o,status:'delivering'}:o));
      if(status==='completed')setOrders(p=>p.map(o=>(t.orderIds||[]).includes(o.id)?{...o,status:'done'}:o));
    }
  };
  const lineQty=l=>numFmt(l.qtyInvoice)||numFmt(l.qtyProd)||numFmt(l.qty)||numFmt(l.quantity)||0;
  const lineWeight=l=>{const prod=products?.find(p=>p.id===l.productId);const unit=String(l.unit||prod?.unit||'').trim().toLowerCase().replace(/[^a-z]/g,'');const qty=lineQty(l);if(unit==='kg'||unit==='kgs'||unit==='kilogram'||unit==='kilograms')return qty;const wpu=prod?.weightPerUnit||numFmt(l.weightPerUnit)||0;return wpu*qty;};
  const orderWeight=o=>(o.lines||[]).reduce((s,l)=>s+lineWeight(l),0);
  const deliveryOrderValue=o=>numFmt(o.deliveryOrder??o.deliverySeq??o.deliveryIndex);
  const sortedTripOrders=trip=>orders.filter(o=>(trip.orderIds||[]).includes(o.id)).sort((a,b)=>{
    const av=deliveryOrderValue(a),bv=deliveryOrderValue(b);
    const ao=av>0?av:999999,bo=bv>0?bv:999999;
    return ao-bo||(a.deliveryTime||'').localeCompare(b.deliveryTime||'')||(a.pointName||a.customer||'').localeCompare(b.pointName||b.customer||'','vi');
  });
  const updateDeliveryOrder=(orderId,value)=>{
    const v=numFmt(value);
    setOrders(prev=>prev.map(o=>o.id===orderId?{...o,deliveryOrder:v||'',deliverySeq:v||'',updatedBy:currentUser?.name||'',updatedAt:fmtDT()}:o));
  };
  const calcTripWeight=t=>{
    const tripOrders=sortedTripOrders(t);
    return tripOrders.reduce((s,o)=>s+orderWeight(o),0)||numFmt(t.totalWeight);
  };
  const filteredTrips=visibleTrips.filter(t=>((!fDate||(t.deliveryDate===(fDate.split('-').reverse().join('/'))))||!fDate)&&(!fShift||t.shiftId===fShift)&&(!fDriver||t.driverName===fDriver));
  const attendanceRows=filteredTrips.filter(t=>t.status==='completed').map(t=>{
    const tripOrders=sortedTripOrders(t);
    const weight=calcTripWeight(t);
    const kgPay=weight*numFmt(t.weightRate);
    const allowance=numFmt(t.tripAllowance);
    return {...t,tripOrders,weight,kgPay,allowance,totalPay:kgPay+allowance};
  });
  const attendanceTotal=attendanceRows.reduce((a,t)=>({
    trips:a.trips+1,
    orders:a.orders+t.tripOrders.length,
    weight:a.weight+t.weight,
    work:a.work+numFmt(t.driverWork),
    pay:a.pay+t.totalPay
  }),{trips:0,orders:0,weight:0,work:0,pay:0});
  const confirmAttendance=id=>{
    setTrips(p=>p.map(t=>t.id===id?{...t,attendanceStatus:'confirmed',confirmedBy:currentUser.name,confirmedAt:fmtDT()}:t));
  };
  const saveOrderInvoiceImage=async(order,file)=>{
    if(!file)return;
    try{
      const url=await uploadPhoto(file,'order-invoices/'+(order.id||'order'));
      setOrders(prev=>prev.map(x=>x.id===order.id?{...x,invoiceImage:url,invoiceImageName:file.name||'hoa-don.jpg',invoiceUploadedAt:fmtDT(),invoiceUploadedBy:currentUser?.name||''}:x));
    }catch(e){window.showToast('Không đọc được ảnh hóa đơn: '+(e.message||e),'error');}
  };
  const pickOrderInvoiceImage=order=>{
    const inp=document.createElement('input');
    inp.type='file';inp.accept='image/*';inp.capture='environment';
    inp.onchange=e=>saveOrderInvoiceImage(order,e.target.files&&e.target.files[0]);
    inp.click();
  };
  const removeOrderInvoiceImage=order=>{
    if(!order?.invoiceImage)return;
    if(!window.confirm('Xóa ảnh hóa đơn của đơn '+(order.id||'')+'?\nĐơn hàng vẫn được giữ nguyên.'))return;
    setOrders(prev=>prev.map(x=>x.id===order.id?{
      ...x,
      invoiceImage:'',
      invoiceImageName:'',
      invoiceUploadedAt:'',
      invoiceUploadedBy:'',
      invoiceImageRemovedAt:fmtDT(),
      invoiceImageRemovedBy:currentUser?.name||''
    }:x));
    window.showToast('Đã xóa ảnh hóa đơn của đơn '+(order.id||'')+'.','success');
  };
  const updateDeliveredQty=(orderId,lineId,value)=>{
    const qty=numFmt(value);
    setOrders(prev=>prev.map(o=>o.id===orderId?{...o,lines:(o.lines||[]).map(l=>l.id===lineId?{...l,qtyDelivered:qty,deliveredAt:fmtDT(),deliveredBy:currentUser?.name||''}:l)}:o));
  };
  const createTripForSelection=()=>{
    if(!canManageTrips){window.showToast('Tài khoản lái xe chỉ xem chuyến được giao.','info');return;}
    if(!fDate){window.showToast('Vui lòng chọn ngày giao trước khi tạo chuyến!','warn');return;}
    if(!fShift){window.showToast('Vui lòng chọn ca giao hàng!','warn');return;}
    const sh=(shifts||[]).find(x=>x.id===fShift);
    if(!sh){window.showToast('Ca giao hàng không hợp lệ!','error');return;}
    const dateVN=fDate.split('-').reverse().join('/');
    const existed=trips.find(t=>t.deliveryDate===dateVN&&t.shiftId===sh.id);
    if(existed){window.showToast('Ngày '+dateVN+' đã có chuyến của ca này rồi: '+existed.id+'. Không tạo thêm.','warn');return;}
    const [dd2,mm2,yy2]=dateVN.split('/');
    const datePart=(dd2||'00')+(mm2||'00')+(yy2||'0000').slice(-2);
    const shiftAbbr=(sh.name||sh.id||'').toUpperCase()
      .replace(/CA\s*/,'')
      .replace(/SÁNG|SANG/,'S').replace(/TRƯA|TRUA/,'T')
      .replace(/CHIỀU|CHIEU/,'C').replace(/ĐÊM|DEM/,'D')
      .replace(/[^A-Z0-9]/g,'').slice(0,3)||'CA';
    const baseId='CH'+datePart+shiftAbbr;
    let id=baseId;let seq=2;
    while(trips.find(t=>t.id===id)){id=baseId+'_'+seq;seq++;}
    const stamp=fmtDT();
    setTrips(p=>[...p,{
      id,deliveryDate:dateVN,deliveryTime:sh.timeStart||sh.startTime||'',
      shiftId:sh.id,shiftName:sh.name||sh.id,area:sh.area||'',
      driverName:'',driverId:'',orderIds:[],totalWeight:0,
      status:'planning',note:'',driverWork:0,weightRate:0,tripAllowance:0,
      attendanceStatus:'pending',createdAt:stamp,updatedBy:currentUser.name,updatedAt:stamp
    }]);
    so(id);
  };
  const printTrip=trip=>{
    const tripOrders=sortedTripOrders(trip);
    const totalW=calcTripWeight(trip);
    const w=window.open('','_blank','width=900,height=700');
    if(!w){window.showToast('Trình duyệt đang chặn popup in. Hãy cho phép popup.','warn');return;}
    const rows=tripOrders.map(o=>{
      const ow=orderWeight(o);
      const items=(o.lines||[]).reduce((s,l)=>s+(l.productName?'• '+l.productName+' '+lineQty(l)+(l.unit?' '+l.unit:'')+'<br>':''),'');
      return '<tr><td style="text-align:center">'+(deliveryOrderValue(o)||'')+'</td><td>'+(o.pointName||o.customer||'')+'</td><td>'+(o.deliveryTime||'')+'</td><td>'+items+'</td><td style="font-weight:700">'+ow.toFixed(2)+'</td></tr>';
    }).join('');
    w.document.write('<html><head><title>Chuyến '+trip.id+'</title><style>body{font-family:Arial;padding:16px;font-size:13px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #333;padding:5px 8px}th{background:#d9e8d9}h2{color:#2d6a4f}.total{font-weight:700;text-align:right;padding:8px;background:#f5fbf5}@media print{@page{margin:8mm}}<\/style><\/head><body><h2>Chuyến: '+trip.id+'</h2><p>Ngày: <b>'+trip.deliveryDate+'</b> &nbsp;|&nbsp; Ca: <b>'+(trip.shiftName||'—')+'</b> &nbsp;|&nbsp; Lái xe: <b>'+(trip.driverName||'—')+'</b> &nbsp;|&nbsp; Tổng KL: <b>'+totalW.toFixed(2)+' kg</b></p><table><thead><tr><th>Thứ tự giao</th><th>Địa điểm</th><th>Giờ</th><th>Hàng hóa</th><th>KL (kg)</th></tr></thead><tbody>'+rows+'<\/tbody><\/table><div class="total">Tổng: '+tripOrders.length+' đơn — '+totalW.toFixed(2)+' kg</div><br><div style="display:flex;justify-content:space-between;margin-top:24px"><div style="text-align:center;width:40%"><div>Lái xe</div><div style="height:50px"></div><small>(Ký tên)</small></div><div style="text-align:center;width:40%"><div>Người nhận</div><div style="height:50px"></div><small>(Ký tên)</small></div></div><\/body><\/html>');
    w.document.close();setTimeout(()=>w.print(),400);
  };
  return h('div',null,
    h('div',{className:'ptitle'},h('i',{className:'ti ti-steering-wheel',style:{fontSize:20}}),'Chuyến giao hàng'),
    h('div',{style:{display:'flex',justifyContent:'flex-end',gap:8,marginBottom:'1rem'}},
      canManageTrips&&h('button',{
        onClick:()=>sm('bulk'),
        style:{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',fontSize:13,
          border:'1px solid var(--pri)',color:'var(--pri)',background:'transparent',
          borderRadius:'var(--r)',cursor:'pointer',fontWeight:500}
      },h('i',{className:'ti ti-stack-2',style:{fontSize:15}}),'Tạo nhiều chuyến'),
      canManageTrips&&h(AddBtn,{onClick:createTripForSelection,label:'Tạo chuyến mới'})
    ),
    h('div',{style:{display:'flex',gap:8,marginBottom:'1rem',flexWrap:'wrap'}},
      h('input',{type:'date',value:fDate,onChange:e=>sfDate(e.target.value),style:{padding:'6px 10px',borderRadius:'var(--r)',border:'1px solid var(--bd)',fontSize:13}}),
      h('select',{value:fShift,onChange:e=>sfShift(e.target.value),style:{padding:'6px 10px',borderRadius:'var(--r)',border:'1px solid var(--bd)',fontSize:13}},
        h('option',{value:''},'Tất cả ca'),
        (shifts||[]).map(sh=>h('option',{key:sh.id,value:sh.id},sh.name||sh.id))
      ),
      !isDriver&&h('select',{value:fDriver,onChange:e=>sfDriver(e.target.value),style:{padding:'6px 10px',borderRadius:'var(--r)',border:'1px solid var(--bd)',fontSize:13}},
        h('option',{value:''},'Tất cả lái xe'),
        [...new Set(visibleTrips.map(t=>t.driverName).filter(Boolean))].map(d=>h('option',{key:d,value:d},d))
      ),
      (fDate||fShift||fDriver)&&h('button',{onClick:()=>{sfDate('');sfShift('');sfDriver('');},style:{padding:'6px 10px',fontSize:12,borderRadius:'var(--r)',border:'1px solid var(--bd)',cursor:'pointer',color:'var(--tx2)'}},'✕ Xóa lọc')
    ),
    h('div',{className:'card',style:{marginBottom:'1rem'}},
      h('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,marginBottom:10,flexWrap:'wrap'}},
        h('div',{style:{fontWeight:600,color:'var(--pri3)'}},h('i',{className:'ti ti-clipboard-check',style:{fontSize:16,marginRight:6}}),'Chấm công lái xe theo chuyến'),
        h('div',{style:{display:'flex',gap:12,fontSize:12,color:'var(--tx2)',flexWrap:'wrap'}},
          h('span',null,'Chuyến: ',h('b',null,attendanceTotal.trips)),
          h('span',null,'Đơn: ',h('b',null,attendanceTotal.orders)),
          h('span',null,'Kg: ',h('b',null,attendanceTotal.weight.toFixed(1))),
          h('span',null,'Công: ',h('b',null,attendanceTotal.work)),
          h('span',null,'Tổng tiền: ',h('b',null,attendanceTotal.pay.toLocaleString('vi-VN')))
        )
      ),
      attendanceRows.length?h('div',{className:'tw'},
        h('table',null,
          h('thead',null,h('tr',null,...['Ngày','Lái xe','Chuyến','Đơn','Kg chuyến','Công','Tiền kg','Phụ cấp','Tổng','Xác nhận'].map(c=>h('th',{key:c},c)))),
          h('tbody',null,attendanceRows.map(t=>h('tr',{key:'att'+t.id},
            h('td',null,t.deliveryDate),
            h('td',null,t.driverName||'—'),
            h('td',null,h('span',{style:{color:'var(--pri)',fontWeight:500}},t.id)),
            h('td',null,t.tripOrders.length),
            h('td',null,t.weight.toFixed(2)+' kg'),
            h('td',null,numFmt(t.driverWork)),
            h('td',null,t.kgPay?t.kgPay.toLocaleString('vi-VN'):'—'),
            h('td',null,t.allowance?t.allowance.toLocaleString('vi-VN'):'—'),
            h('td',null,h('b',null,t.totalPay?t.totalPay.toLocaleString('vi-VN'):'—')),
            h('td',null,t.attendanceStatus==='confirmed'
              ?h('span',{className:'badge',style:{background:'#E1F5EE',color:'#0F6E56'}},'Đã xác nhận')
              :canManageTrips?h('button',{onClick:()=>confirmAttendance(t.id),style:{fontSize:11,padding:'4px 8px'}},'Xác nhận'):h('span',{style:{fontSize:12,color:'var(--tx2)'}},'Chờ xác nhận')
            )
          )))
        )
      ):h('div',{style:{fontSize:13,color:'var(--tx2)',padding:'8px 0'}},'Chưa có chuyến hoàn thành để chấm công theo bộ lọc hiện tại.')
    ),
    filteredTrips.length?h('div',{style:{display:'flex',flexDirection:'column',gap:'1rem'}},
      filteredTrips.map(trip=>{
        const tripOrders=sortedTripOrders(trip);
        const isOpen=open===trip.id;
        const totalW=calcTripWeight(trip);
        return h('div',{key:trip.id,className:'card',style:{padding:0,overflow:'hidden'}},
          h('div',{style:{display:'flex',alignItems:'center',gap:12,padding:'1rem 1.25rem',cursor:'pointer'},onClick:()=>so(isOpen?null:trip.id)},
            h('i',{className:'ti ti-chevron-'+(isOpen?'up':'down'),style:{fontSize:16,color:'var(--tx2)',flexShrink:0}}),
            h('div',{style:{flex:1}},
              h('div',{style:{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',marginBottom:4}},
                h('span',{style:{fontWeight:500}},trip.deliveryDate&&trip.shiftName?trip.deliveryDate+' — '+trip.shiftName:trip.id),
                h('span',{style:{color:'var(--tx2)'}},trip.driverName||'—'),
                h(StatusBadge,{s:trip.status})
              ),
              h('div',{style:{display:'flex',gap:16,fontSize:12,color:'var(--tx2)',flexWrap:'wrap'}},
                h('span',null,h('i',{className:'ti ti-calendar',style:{fontSize:12,marginRight:3}}),trip.deliveryDate+(trip.shiftName?' — '+trip.shiftName:trip.deliveryTime?' '+trip.deliveryTime:'')),
                trip.driverWork?h('span',null,h('i',{className:'ti ti-tools',style:{fontSize:12,marginRight:3}}),'Công: '+trip.driverWork):null,
                h('span',null,h('i',{className:'ti ti-package',style:{fontSize:12,marginRight:3}}),tripOrders.length+' đơn'),
                totalW>0&&h('span',{style:{color:'var(--pri)',fontWeight:500}},h('i',{className:'ti ti-weight',style:{fontSize:12,marginRight:3}}),totalW.toFixed(2)+' kg')
              )
            ),
            h('div',{style:{display:'flex',gap:4},onClick:e=>e.stopPropagation()},
              canManageTrips&&trip.status==='planning'&&h('button',{onClick:()=>updStatus(trip.id,'assigned'),style:{fontSize:11,padding:'4px 10px',background:'#E6F1FB',color:'#185FA5',border:'none',borderRadius:4}},'Giao lái xe'),
              canManageTrips&&(trip.status==='planning'||trip.status==='assigned')&&h('button',{onClick:()=>updStatus(trip.id,'active'),style:{fontSize:11,padding:'4px 10px',background:'#EAF3DE',color:'#3B6D11',border:'none',borderRadius:4}},'Bắt đầu giao'),
              canManageTrips&&trip.status==='active'&&h('button',{onClick:()=>updStatus(trip.id,'completed'),style:{fontSize:11,padding:'4px 10px',background:'#E1F5EE',color:'#0F6E56',border:'none',borderRadius:4}},'Hoàn thành'),
              h('button',{className:'bi',title:'In chuyến',onClick:()=>printTrip(trip)},h('i',{className:'ti ti-printer',style:{fontSize:15}})),
              canManageTrips&&h('button',{className:'bi',onClick:()=>{se(trip);sm('f')}},h('i',{className:'ti ti-edit',style:{fontSize:15}})),
              canManageTrips&&h('button',{className:'bi',onClick:()=>del(trip.id),style:{color:'#A32D2D'}},h('i',{className:'ti ti-trash',style:{fontSize:15}}))
            )
          ),
          isOpen&&h('div',{style:{borderTop:'.5px solid var(--bd)',padding:'1rem 1.25rem'}},
            // Tổng KL chuyến
            h('div',{style:{display:'flex',gap:16,marginBottom:10,flexWrap:'wrap',alignItems:'center'}},
              h('span',{style:{fontSize:13,fontWeight:600,color:'var(--pri)'}},
                h('i',{className:'ti ti-weight',style:{marginRight:4}}),
                'Tổng KL: '+(totalW>0?totalW.toFixed(2)+' kg':'—')
              ),
              h('span',{style:{fontSize:13,color:'var(--tx2)'}},tripOrders.length+' đơn hàng'),
              // Nút in
              h('button',{
                onClick:()=>printTrip(trip),
                style:{padding:'4px 12px',fontSize:12,display:'flex',alignItems:'center',gap:4,
                  border:'1px solid var(--pri)',color:'var(--pri)',background:'transparent',
                  borderRadius:'var(--r)',cursor:'pointer'}
              },h('i',{className:'ti ti-printer',style:{fontSize:13}}),'In chuyến')
            ),
            trip.note&&h('div',{style:{fontSize:13,color:'var(--tx2)',marginBottom:8,padding:'6px 10px',background:'var(--bg2)',borderRadius:'var(--r)'}},
              h('i',{className:'ti ti-notes',style:{marginRight:4}}),'Ghi chú: '+trip.note
            ),
            // Bảng đơn hàng
            h('div',{style:{fontWeight:500,fontSize:12,color:'var(--tx2)',marginBottom:6}},'Chi tiết đơn hàng:'),
            tripOrders.length?h('div',{className:'tw'},
              h('table',null,
                h('thead',null,h('tr',null,...['Thứ tự giao','Địa điểm','Giờ','Hàng hóa','SL đã giao','KL (kg)','Ảnh HĐ','Trạng thái'].map(c=>h('th',{key:c},c)))),
                h('tbody',null,tripOrders.map(o=>{
                  const w=orderWeight(o);
                  return h('tr',{key:o.id},
                    h('td',null,canEditDeliveryOrder
                      ?h('input',{type:'number',min:1,step:1,value:deliveryOrderValue(o)||'',placeholder:'...',onChange:e=>updateDeliveryOrder(o.id,e.target.value),style:{fontSize:12,padding:'4px 6px',width:64,textAlign:'center'}})
                      :h('span',{style:{fontWeight:600,color:'var(--pri)'}},deliveryOrderValue(o)||'—')
                    ),
                    h('td',null,h('span',{style:{fontWeight:600}},o.pointName||o.customer||'—')),
                    h('td',null,o.deliveryTime||'—'),
                    h('td',null,h('div',{style:{fontSize:11}},(o.lines||[]).map((l,i)=>h('div',{key:i,style:{minHeight:30,display:'flex',alignItems:'center'}},l.productName+' · '+lineQty(l)+(l.unit?' '+l.unit:''))))),
                    h('td',null,h('div',{style:{display:'grid',gap:4,minWidth:92}},(o.lines||[]).map(l=>h('input',{key:l.id,type:'number',min:0,step:'0.01',value:l.qtyDelivered??'',placeholder:String(lineQty(l)||0),onChange:e=>updateDeliveredQty(o.id,l.id,e.target.value),style:{fontSize:12,padding:'4px 6px',width:86,borderColor:(l.qtyDelivered!==undefined&&numFmt(l.qtyDelivered)!==lineQty(l))?'#E0A800':'var(--bd)'}})))),
                    h('td',null,w>0?h('span',{style:{fontWeight:600,color:'var(--pri)'}},w.toFixed(2)+' kg'):'—'),
                    h('td',null,
                      o.invoiceImage
                        ?h('div',{style:{display:'flex',gap:4}},
                          h('button',{className:'bi',title:'Xem ảnh hóa đơn',onClick:()=>window.open(o.invoiceImage,'_blank')},h('i',{className:'ti ti-photo-check',style:{fontSize:15,color:'var(--pri)'}})),
                          canUploadProof&&h('button',{className:'bi',title:'Chụp lại hóa đơn',onClick:()=>pickOrderInvoiceImage(o)},h('i',{className:'ti ti-camera-up',style:{fontSize:15}})),
                          canUploadProof&&h('button',{className:'bi',title:'Xóa ảnh hóa đơn',onClick:()=>removeOrderInvoiceImage(o),style:{color:'#A32D2D'}},h('i',{className:'ti ti-trash',style:{fontSize:15}}))
                        )
                        :canUploadProof?h('button',{className:'bi',title:'Chụp hóa đơn đơn hàng',onClick:()=>pickOrderInvoiceImage(o)},h('i',{className:'ti ti-camera-plus',style:{fontSize:15}})):'—'
                    ),
                    h('td',null,h(StatusBadge,{s:o.status}))
                  );
                }))
              )
            ):h('p',{style:{fontSize:13,color:'var(--tx2)'}},'Chưa có đơn hàng.'),
            // Phần chụp ảnh sau giao
            h('div',{style:{marginTop:12,padding:'10px 12px',background:'#f8f9fa',border:'1px solid var(--bd)',borderRadius:'var(--r)'}},
              h('div',{style:{fontWeight:600,fontSize:12,color:'var(--tx2)',marginBottom:8,display:'flex',alignItems:'center',gap:6}},
                h('i',{className:'ti ti-camera',style:{fontSize:14}}),'Ảnh xác nhận giao hàng'
              ),
              // Hiện ảnh đã upload
              (trip.photos||[]).length>0&&h('div',{style:{display:'flex',gap:8,flexWrap:'wrap',marginBottom:8}},
                (trip.photos||[]).map((ph,i)=>h('div',{key:i,style:{position:'relative'}},
                  h('img',{src:ph,alt:'Ảnh '+i,
                    style:{width:100,height:100,objectFit:'cover',borderRadius:'var(--r)',border:'1px solid var(--bd)',cursor:'pointer'},
                    onClick:()=>window.open(ph,'_blank')
                  }),
                  canManageTrips&&h('button',{
                    onClick:()=>setTrips(prev=>prev.map(t=>t.id===trip.id?{...t,photos:(t.photos||[]).filter((_,j)=>j!==i)}:t)),
                    style:{position:'absolute',top:2,right:2,background:'rgba(163,45,45,.8)',color:'#fff',
                      border:'none',borderRadius:'50%',width:18,height:18,fontSize:11,cursor:'pointer',
                      display:'flex',alignItems:'center',justifyContent:'center',lineHeight:1}
                  },'×')
                ))
              ),
              // Nút upload ảnh
              canUploadProof&&h('label',{style:{display:'inline-flex',alignItems:'center',gap:6,padding:'6px 14px',
                border:'1px dashed var(--pri)',color:'var(--pri)',borderRadius:'var(--r)',
                cursor:'pointer',fontSize:12,fontWeight:500}},
                h('i',{className:'ti ti-upload',style:{fontSize:14}}),
                (trip.photos||[]).length>0?'Thêm ảnh':'Chụp / tải ảnh lên',
                h('input',{type:'file',accept:'image/*',capture:'environment',multiple:true,
                  style:{display:'none'},
                  onChange:async e=>{
                    const files=Array.from(e.target.files);
                    for(const file of files){
                      try{
                        const url=await uploadPhoto(file,'trip-proofs/'+(trip.id||'trip'));
                        setTrips(prev=>prev.map(t=>t.id===trip.id?{...t,photos:[...(t.photos||[]),url]}:t));
                      }catch(err){window.showToast('Không đọc được ảnh: '+(err.message||err),'error');}
                    }
                    e.target.value='';
                  }
                })
              ),
              (trip.photos||[]).length>0&&h('span',{style:{fontSize:11,color:'var(--tx2)',marginLeft:8}},
                (trip.photos||[]).length+' ảnh'
              )
            )
          )
        );
      })
    ):h('div',{style:{textAlign:'center',padding:'3rem',color:'var(--tx2)',background:'#fff',borderRadius:'var(--rl)',border:'.5px solid var(--bd)'}},
      h('i',{className:'ti ti-steering-wheel',style:{fontSize:56,display:'block',marginBottom:'1rem',color:'var(--pri2)'}}),
      'Chưa có chuyến giao hàng nào.'
    ),
    canManageTrips&&modal==='f'&&h(TripForm,{trip:edit,orders,employees,shifts,customers,products,currentUser,onSave:save,onClose:()=>{sm(null);se(null);}}),
    canManageTrips&&modal==='bulk'&&h(BulkTripModal,{orders,employees,shifts,customers,products,trips,currentUser,initialDate:fDate,initialShift:fShift,
      onSave:(newTrips)=>{
        setTrips(p=>[...p,...newTrips]);
        // Cập nhật tripId cho đơn hàng
        newTrips.forEach(t=>{
          setOrders(p=>p.map(o=>(t.orderIds||[]).includes(o.id)?{...o,tripId:t.id,status:t.status==='assigned'?'assigned':'pending'}:o));
        });
        sm(null);
      },
      onClose:()=>sm(null)
    })
  );
}

/* ═══════════ GIAI ĐOẠN 4: SẢN XUẤT ═══════════ */
