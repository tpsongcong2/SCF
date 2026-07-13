/* ─── Status badges ─── */
function StatusBadge({s}){
  const map={pending:['#FAEEDA','#854F0B','Chờ xếp'],assigned:['#E6F1FB','#185FA5','Đã xếp'],delivering:['#EAF3DE','#3B6D11','Đang giao'],done:['#E1F5EE','#0F6E56','Đã giao'],failed:['#FCEBEB','#A32D2D','Giao lỗi'],cancelled:['#FCEBEB','#A32D2D','Hủy'],planning:['#E6F1FB','#185FA5','Lên kế hoạch'],active:['#EAF3DE','#3B6D11','Đang giao'],completed:['#E1F5EE','#0F6E56','Hoàn thành'],draft:['#F1EFE8','#5F5E5A','Nháp'],sent:['#E6F1FB','#185FA5','Đã gửi'],approved:['#EAF3DE','#3B6D11','Đã duyệt'],expired:['#F1EFE8','#6b6b67','Hết hạn']};
  const[bg,tx,label]=map[s]||['#F1EFE8','#5F5E5A',s];
  return h('span',{className:'badge',style:{background:bg,color:tx}},label);
}

/* ─── QUOTATIONS ─── */

// Input số có định dạng dấu phẩy hàng nghìn (8,700 / 50,000)
function NumInput({value, onChange, style, placeholder}) {
  const fmt = v => (v || v===0) ? Number(v).toLocaleString('en-US') : '';
  const [disp, setDisp] = useState(fmt(value));
  useEffect(function(){ setDisp(fmt(value)); }, [value]);
  return h('input', {
    type:'text', inputMode:'numeric',
    value: disp,
    placeholder: placeholder||'0',
    style: style||{},
    onChange: function(e) {
      var raw = e.target.value.replace(/[^0-9]/g,'');
      setDisp(raw ? Number(raw).toLocaleString('en-US') : '');
      onChange(raw ? Number(raw) : 0);
    }
  });
}

function QuoteLineRow({line,products,onChange,onRemove}){
  const prod=products.find(p=>p.id===line.productId)||{};
  return h('div',{style:{display:'grid',gridTemplateColumns:'2fr 1fr 1fr auto',gap:6,marginBottom:6,alignItems:'center'}},
    h('select',{value:line.productId,onChange:e=>{const p=products.find(x=>x.id===e.target.value)||{};onChange({...line,productId:e.target.value,productName:p.name||'',unit:p.unit||''});},style:{fontSize:13}},
      h('option',{value:''},'— Chọn sản phẩm —'),
      products.map(p=>h('option',{key:p.id,value:p.id},p.name))
    ),
    h('input',{value:line.unit,readOnly:true,style:{fontSize:13,background:'var(--bg2)',cursor:'default'}}),
    h(NumInput,{value:line.price,onChange:v=>onChange({...line,price:v}),placeholder:'Đơn giá',style:{fontSize:13}}),
    h('button',{className:'bi',onClick:onRemove,style:{color:'#A32D2D'}},h('i',{className:'ti ti-trash',style:{fontSize:14}}))
  );
}
function PointMultiSelect({custPoints,pointIds,areaNames,togglePoint,toggleArea,toggleAll}){
  const[open,setOpen]=useState(false);
  const areaList=[...new Set(custPoints.map(p=>p.area).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'vi'));
  const selectedByArea=custPoints.filter(p=>p.area&&areaNames.includes(p.area)).map(p=>p.id);
  const effectivePointIds=[...new Set([...(pointIds||[]),...selectedByArea])];
  const allChecked=custPoints.length>0&&effectivePointIds.length===custPoints.length;
  const someChecked=effectivePointIds.length>0&&effectivePointIds.length<custPoints.length;
  const label=effectivePointIds.length===0?'— Chọn khu vực / địa điểm áp dụng —':
    allChecked?'Tất cả '+custPoints.length+' địa điểm':
    (areaNames.length?areaNames.length+' khu vực, ':'')+effectivePointIds.length+' địa điểm áp dụng';
  if(custPoints.length===0) return h(F,{label:'Địa điểm áp dụng *'},
    h('div',{style:{padding:'8px 10px',fontSize:12,color:'#A32D2D',background:'#FFF0F0',borderRadius:'var(--r)',border:'1px solid #f0a0a0'}},
      '⚠ Khách hàng này chưa có địa điểm giao hàng.'
    )
  );
  return h(F,{label:'Khu vực / địa điểm áp dụng *'+(effectivePointIds.length?' ('+effectivePointIds.length+')':'')},
    h('div',{style:{position:'relative'}},
      // Dropdown trigger
      h('div',{
        onClick:()=>setOpen(o=>!o),
        style:{display:'flex',alignItems:'center',justifyContent:'space-between',
          padding:'8px 10px',border:'1px solid '+(open?'var(--pri)':'var(--bd)'),
          borderRadius:open?'var(--r) var(--r) 0 0':'var(--r)',
          background:'#fff',cursor:'pointer',fontSize:13,userSelect:'none',
          boxShadow:open?'0 0 0 2px rgba(45,106,79,.15)':'none',transition:'all .15s'}
      },
        h('span',{style:{color:effectivePointIds.length?'var(--tx)':'var(--tx2)',flex:1}},label),
        h('i',{className:'ti ti-chevron-'+(open?'up':'down'),style:{fontSize:14,color:'var(--tx2)'}})
      ),
      // Dropdown panel
      open&&h('div',{style:{position:'absolute',zIndex:200,left:0,right:0,
        border:'1px solid var(--pri)',borderTop:'none',borderRadius:'0 0 var(--r) var(--r)',
        background:'#fff',boxShadow:'0 4px 12px rgba(0,0,0,.1)',overflow:'hidden'}},
        // Chọn tất cả
        h('div',{
          style:{display:'flex',alignItems:'center',gap:10,padding:'7px 12px',
            background:'var(--bg2)',borderBottom:'1px solid var(--bd)',cursor:'pointer'},
          onClick:toggleAll
        },
          h('input',{type:'checkbox',checked:allChecked,
            ref:el=>{if(el)el.indeterminate=someChecked;},
            onChange:toggleAll,
            style:{cursor:'pointer',accentColor:'var(--pri)',width:15,height:15}
          }),
          h('span',{style:{fontSize:12,fontWeight:600,color:'var(--pri)'}},
            allChecked?'Bỏ chọn tất cả':'Chọn tất cả ('+custPoints.length+')')
        ),
        // List địa điểm nhóm theo khu vực
        h('div',{style:{maxHeight:240,overflowY:'auto'}},
          (()=>{
            const rows=[];
            let lastArea=null;
            custPoints.forEach(pt=>{
              if((pt.area||'')!==lastArea){
                lastArea=pt.area||'';
                if(lastArea){
                  const areaName=lastArea;
                  const areaPts=custPoints.filter(x=>x.area===areaName);
                  const areaChecked=areaNames.includes(areaName);
                  rows.push(h('div',{key:'a'+areaName,onClick:()=>toggleArea(areaName),
                    style:{display:'grid',gridTemplateColumns:'auto 1fr auto',alignItems:'center',gap:10,
                      padding:'7px 12px',fontSize:12,fontWeight:700,
                      color:'var(--pri3)',background:areaChecked?'#EAF3DE':'#f5fbf5',
                      borderBottom:'1px solid var(--bd)',letterSpacing:.3,cursor:'pointer'}
                  },
                    h('input',{type:'checkbox',checked:areaChecked,onClick:e=>e.stopPropagation(),onChange:e=>{e.stopPropagation();toggleArea(areaName);},
                      style:{cursor:'pointer',accentColor:'var(--pri)',width:15,height:15}
                    }),
                    h('span',null,(areaChecked?'✓ ':'')+'Khu vực '+areaName),
                    h('span',{style:{fontSize:11,color:'var(--tx2)',fontWeight:500}},areaPts.length+' điểm')
                  ));
                }
              }
              const checked=effectivePointIds.includes(pt.id);
              const disabled=pt.area&&areaNames.includes(pt.area);
              rows.push(h('div',{key:pt.id,onClick:disabled?undefined:()=>togglePoint(pt.id),
                style:{display:'grid',gridTemplateColumns:'auto 1fr auto',
                  alignItems:'center',gap:10,
                  padding:'7px 12px 7px '+(lastArea?'22px':'12px'),
                  background:checked?'#f0faf0':'#fff',
                  borderBottom:'1px solid var(--bd)',
                  transition:'background .12s',cursor:disabled?'default':'pointer'}
              },
                h('input',{type:'checkbox',checked,disabled,onClick:e=>e.stopPropagation(),onChange:e=>{e.stopPropagation();togglePoint(pt.id);},
                  style:{cursor:disabled?'not-allowed':'pointer',accentColor:'var(--pri)',width:15,height:15,flexShrink:0}
                }),
                h('span',{style:{fontSize:13,color:'var(--tx)'}},(checked?'✓ ':'')+pt.name),
                pt.area&&h('span',{style:{fontSize:11,color:'var(--tx2)',background:'var(--bg2)',
                  padding:'1px 7px',borderRadius:10,whiteSpace:'nowrap'}},pt.area)
              ));
            });
            return rows;
          })()
        ),
        // Footer đóng
        h('div',{style:{padding:'6px 12px',background:'var(--bg2)',borderTop:'1px solid var(--bd)',
          display:'flex',justifyContent:'space-between',alignItems:'center'}},
          h('span',{style:{fontSize:12,color:'var(--tx2)'}},
            effectivePointIds.length?effectivePointIds.length+'/'+custPoints.length+' điểm áp dụng':'Chưa chọn khu vực / địa điểm nào'
          ),
          h('button',{onClick:()=>setOpen(false),
            style:{fontSize:12,padding:'3px 12px',background:'var(--pri)',color:'#fff',
              border:'none',borderRadius:'var(--r)',cursor:'pointer'}
          },'Xong')
        )
      )
    )
  );
}

function QuoteForm({quote,quotes,customers,products,currentUser,onSave,onClose}){
  const today=new Date().toISOString().slice(0,10);
  const toInput=s=>{if(!s)return'';const[d,m,y]=s.split('/');return y+'-'+m+'-'+d;};
  const fromInput=s=>{if(!s)return'';const[y,m,d]=s.split('-');return d+'/'+m+'/'+y;};
  // pointIds: mảng id các địa điểm được chọn, areaNames: khu vực áp dụng tự động cho điểm mới
  const initPointIds=quote?(quote.pointIds||(quote.pointId?[quote.pointId]:[])):[];
  const[f,sf]=useState(quote?{...quote,dateFromI:toInput(quote.dateFrom),dateToI:toInput(quote.dateTo),pointIds:initPointIds,areaNames:quote.areaNames||[]}:{customerId:'',customer:'',dateFromI:today,dateToI:'',status:'draft',note:'',lines:[],pointIds:[],areaNames:[]});
  const s=(k,v)=>sf(p=>({...p,[k]:v}));
  const setCust=cid=>{const c=customers.find(x=>x.id===cid);sf(p=>({...p,customerId:cid,customer:c?c.name:'',pointIds:[]}));};
  const selCust=customers.find(x=>x.id===f.customerId);
  const custPoints=(selCust?.points||[]).sort((a,b)=>(a.area||'').localeCompare(b.area||'','vi')||(a.name||'').localeCompare(b.name||'','vi'));
  const sampleQuotes=(quotes||[]).filter(q=>!quote||q.id!==quote.id);
  const applySample=id=>{
    const q=(quotes||[]).find(x=>x.id===id);
    if(!q)return;
    sf(p=>{
      const hasCustomer=!!p.customerId;
      return {...p,
        customerId:hasCustomer?p.customerId:(q.customerId||''),
        customer:hasCustomer?p.customer:(q.customer||''),
        pointIds:hasCustomer?p.pointIds:[...(q.pointIds||(q.pointId?[q.pointId]:[]))],
        areaNames:hasCustomer?(p.areaNames||[]):[...(q.areaNames||[])],
        note:q.note||p.note||'',
        lines:(q.lines||[]).map(l=>({...l,id:uid()}))
      };
    });
  };
  const togglePoint=id=>sf(p=>({...p,pointIds:p.pointIds.includes(id)?p.pointIds.filter(x=>x!==id):[...p.pointIds,id]}));
  const toggleArea=area=>sf(p=>({...p,areaNames:(p.areaNames||[]).includes(area)?(p.areaNames||[]).filter(x=>x!==area):[...(p.areaNames||[]),area]}));
  const effectivePointIds=()=>[...new Set([...f.pointIds,...custPoints.filter(p=>p.area&&(f.areaNames||[]).includes(p.area)).map(p=>p.id)])];
  const toggleAll=()=>sf(p=>({...p,pointIds:effectivePointIds().length===custPoints.length?[]:custPoints.map(x=>x.id),areaNames:effectivePointIds().length===custPoints.length?[]:(p.areaNames||[])}));
  const addLine=()=>sf(p=>({...p,lines:[...p.lines,{id:uid(),productId:'',productName:'',unit:'',price:0}]}));
  const updLine=(id,data)=>sf(p=>({...p,lines:p.lines.map(l=>l.id===id?data:l)}));
  const delLine=id=>sf(p=>({...p,lines:p.lines.filter(l=>l.id!==id)}));
  const submit=()=>{
    if(!f.customerId){window.showToast('Vui lòng chọn khách hàng!','warn');return;}
    if(effectivePointIds().length===0){window.showToast('Chọn ít nhất 1 khu vực hoặc địa điểm áp dụng!','warn');return;}
    if(f.lines.length===0){window.showToast('Vui lòng thêm ít nhất 1 sản phẩm!','warn');return;}
    // Tương thích ngược: lưu cả pointId (điểm đầu tiên) lẫn pointIds
    const effIds=effectivePointIds();
    const firstPt=custPoints.find(p=>effIds.includes(p.id));
    onSave({...f,
      pointId:firstPt?.id||'',pointName:firstPt?.name||'',
      pointIds:f.pointIds,
      areaNames:f.areaNames||[],
      pointNames:custPoints.filter(p=>effIds.includes(p.id)).map(p=>p.name),
      dateFrom:fromInput(f.dateFromI),dateTo:fromInput(f.dateToI),
      createdBy:quote?quote.createdBy:currentUser.name,
      createdAt:quote?quote.createdAt:fmtDate(),
      updatedBy:currentUser.name,updatedAt:fmtDT()
    });
  };
  return h(Modal,{title:quote?'Sửa báo giá '+quote.id:'Tạo báo giá mới',onClose,lg:true},
    sampleQuotes.length>0&&h(F,{label:'Chọn báo giá mẫu'},h('select',{value:'',onChange:e=>applySample(e.target.value)},
      h('option',{value:''},'— Chọn báo giá cũ để lấy mẫu —'),
      sampleQuotes.map(q=>h('option',{key:q.id,value:q.id},q.id+' - '+(q.customer||'')+' - '+(q.dateFrom||'')+(q.dateTo?' đến '+q.dateTo:'')))
    )),
    h('div',{className:'g2'},
      h(F,{label:'Khách hàng *'},h('select',{value:f.customerId,onChange:e=>setCust(e.target.value)},
        h('option',{value:''},'— Chọn khách hàng —'),customers.map(c=>h('option',{key:c.id,value:c.id},c.name))
      )),
      h(F,{label:'Trạng thái'},h('select',{value:f.status,onChange:e=>s('status',e.target.value)},
        [['draft','Nháp'],['sent','Đã gửi'],['approved','Đã duyệt'],['expired','Hết hạn'],['cancelled','Hủy']].map(([v,l])=>h('option',{key:v,value:v},l))
      )),
    ),
    f.customerId&&h(PointMultiSelect,{custPoints,pointIds:f.pointIds,areaNames:f.areaNames||[],togglePoint,toggleArea,toggleAll}),
    h('div',{className:'g2'},
      h(F,{label:'Ngày bắt đầu'},h('input',{type:'date',value:f.dateFromI,onChange:e=>s('dateFromI',e.target.value)})),
      h(F,{label:'Ngày kết thúc'},h('input',{type:'date',value:f.dateToI,onChange:e=>s('dateToI',e.target.value)})),
    ),
    h('div',{className:'divider'}),
    h('div',{style:{fontWeight:500,fontSize:13,marginBottom:8,color:'var(--pri3)'}},'Bảng giá sản phẩm'),
    h('div',{style:{display:'grid',gridTemplateColumns:'2fr 1fr 1fr auto',gap:6,marginBottom:4}},
      h('span',{style:{fontSize:11,color:'var(--tx2)',fontWeight:500}},'Sản phẩm'),
      h('span',{style:{fontSize:11,color:'var(--tx2)',fontWeight:500}},'Đơn vị'),
      h('span',{style:{fontSize:11,color:'var(--tx2)',fontWeight:500}},'Đơn giá (đ)'),
      h('span',null,'')
    ),
    f.lines.map(l=>h(QuoteLineRow,{key:l.id,line:l,products,onChange:data=>updLine(l.id,data),onRemove:()=>delLine(l.id)})),
    h('button',{onClick:addLine,style:{fontSize:12,padding:'5px 12px',marginBottom:8}},h('i',{className:'ti ti-plus',style:{fontSize:13,marginRight:4}}),'Thêm sản phẩm'),
    h(F,{label:'Ghi chú'},h('textarea',{value:f.note,onChange:e=>s('note',e.target.value),rows:2})),
    h(Row,null,h('button',{onClick:onClose},'Hủy'),h('button',{className:'bp',onClick:submit,style:{padding:'8px 20px'}},h('i',{className:'ti ti-device-floppy',style:{fontSize:14}}),'Lưu báo giá'))
  );
}
function QuotesTab({quotes,setQuotes,customers,products,currentUser}){
  const[modal,sm]=useState(null);const[edit,se]=useState(null);const[q,sq]=useState('');const[filter,sf]=useState('all');
  let qSeq=quotes.length+1;
  const save=d=>{if(edit)setQuotes(p=>p.map(x=>x.id===edit.id?d:x));else{const id='BG'+String(qSeq++).toString().padStart(3,'0');setQuotes(p=>[...p,{...d,id}]);}sm(null);se(null);};
  const del=id=>{if(confirm('Xóa báo giá?'))setQuotes(p=>p.filter(x=>x.id!==id));};
  const sts=[['all','Tất cả'],['draft','Nháp'],['sent','Đã gửi'],['approved','Đã duyệt'],['expired','Hết hạn']];
  const list=quotes.filter(x=>(filter==='all'||x.status===filter)&&(!q||x.customer.toLowerCase().includes(q.toLowerCase())||x.id.toLowerCase().includes(q.toLowerCase())));
  return h('div',null,
    h('div',{className:'ptitle'},h('i',{className:'ti ti-file-invoice',style:{fontSize:20}}),'Báo giá'),
    h('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem',flexWrap:'wrap',gap:8}},
      h('div',{style:{display:'flex',gap:5,flexWrap:'wrap'}},sts.map(([v,l])=>h('button',{key:v,className:'pill'+(filter===v?' on':''),onClick:()=>sf(v)},l+' ('+( v==='all'?quotes.length:quotes.filter(x=>x.status===v).length)+')'))),
      h('div',{style:{display:'flex',gap:6}},
        h(SearchBar,{value:q,onChange:sq,placeholder:'Tìm báo giá...'}),
        h(AddBtn,{onClick:()=>{se(null);sm('f')},label:'Tạo báo giá'})
      )
    ),
    h(TableWrap,{cols:['Mã BG','Khách hàng','Bắt đầu','Kết thúc','Số SP','Ghi chú','Người tạo','Trạng thái',''],empty:'Chưa có báo giá nào.',
      rows:list.map(x=>h('tr',{key:x.id},
        h('td',null,h('span',{style:{color:'var(--pri)',fontWeight:500}},x.id)),
        h('td',null,h('div',{style:{fontWeight:500}},x.customer)),
        h('td',null,x.dateFrom||'—'),h('td',null,x.dateTo||'—'),
        h('td',null,x.lines?x.lines.length:0),
        h('td',null,x.note||'—'),
        h('td',null,h('div',null,x.createdBy),h('div',{style:{fontSize:11,color:'var(--tx2)'}},x.createdAt)),
        h('td',null,h(StatusBadge,{s:x.status})),
        h('td',null,h('div',{style:{display:'flex',gap:2}},
          h('button',{className:'bi',onClick:()=>{se(x);sm('f')}},h('i',{className:'ti ti-edit',style:{fontSize:15}})),
          h('button',{className:'bi',onClick:()=>del(x.id),style:{color:'#A32D2D'}},h('i',{className:'ti ti-trash',style:{fontSize:15}}))
        ))
      ))
    }),
    modal==='f'&&h(QuoteForm,{quote:edit,quotes,customers,products,currentUser,onSave:save,onClose:()=>{sm(null);se(null);}})
  );
}

