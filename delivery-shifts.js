/* ─── CA GIAO HÀNG ─── */
const D_SHIFTS = [
  {id:'CA01',name:'Ca sáng',area:'Khu vực 1',timeStart:'06:00',timeEnd:'12:00',note:''},
  {id:'CA02',name:'Ca chiều',area:'Khu vực 1',timeStart:'12:00',timeEnd:'18:00',note:''},
  {id:'CA03',name:'Ca tối',area:'Khu vực 2',timeStart:'18:00',timeEnd:'22:00',note:''},
];
function ShiftsTab({shifts,setShifts}) {
  const [modal,sm]=useState(null); const [edit,se]=useState(null); const [q,sq]=useState('');
  function ShiftForm({s,allShifts,onSave,onClose}) {
    const [f,sf]=useState(s?{...s}:{id:'',name:'',area:'',timeStart:'',timeEnd:'',note:''});
    const dupId = f.id && allShifts.some(x=>x.id===f.id && x.id!==(s&&s.id));
    return h(Modal,{title:s?'Sửa ca giao hàng':'Thêm ca giao hàng',onClose},
      h('div',{className:'g2'},
        h(F,{label:'Mã ca'+(s?' (có thể sửa)':' (để trống = tự tạo)')},
          h('div',null,
            h('input',{value:f.id||'',onChange:e=>sf(p=>({...p,id:e.target.value.toUpperCase()})),placeholder:'CA01, SS-T1...',style:{borderColor:dupId?'#A32D2D':''}}),
            dupId&&h('div',{style:{fontSize:11,color:'#A32D2D',marginTop:3}},h('i',{className:'ti ti-alert-triangle',style:{marginRight:4}}),'Mã này đã tồn tại!')
          )
        ),
        h(F,{label:'Tên ca *'},h('input',{value:f.name,onChange:e=>sf(p=>({...p,name:e.target.value})),placeholder:'Ca sáng, Ca chiều...'}))
      ),
      h(F,{label:'Khu vực'},h('input',{value:f.area||'',onChange:e=>sf(p=>({...p,area:e.target.value})),placeholder:'Khu vực 1, Nội thành...'})),
      h('div',{className:'g2'},
        h(F,{label:'Giờ bắt đầu'},h('input',{value:f.timeStart,onChange:e=>sf(p=>({...p,timeStart:e.target.value})),placeholder:'06:00'})),
        h(F,{label:'Giờ kết thúc'},h('input',{value:f.timeEnd,onChange:e=>sf(p=>({...p,timeEnd:e.target.value})),placeholder:'12:00'}))
      ),
      h(F,{label:'Ghi chú'},h('input',{value:f.note,onChange:e=>sf(p=>({...p,note:e.target.value}))})),
      h(Row,null,
        h('button',{onClick:onClose},'Hủy'),
        h('button',{className:'bp',onClick:()=>{
          if(!f.name){window.showToast('Nhập tên ca!','warn');return;}
          if(dupId){window.showToast('Mã ca đã tồn tại! Vui lòng dùng mã khác.','error');return;}
          const id=(f.id||'').trim().toUpperCase()||'CA'+uid();
          onSave({...f,id});
        },style:{padding:'8px 20px'}},
          h('i',{className:'ti ti-device-floppy',style:{fontSize:14}}),'Lưu ca')
      )
    );
  }
  const save=d=>{if(edit)setShifts(p=>p.map(x=>x.id===edit.id?{...d}:x));else setShifts(p=>[...p,d]);sm(null);se(null);};
  const del=id=>{if(confirm('Xóa ca giao hàng?'))setShifts(p=>p.filter(x=>x.id!==id));};
  const list=shifts.filter(x=>!q||x.name.toLowerCase().includes(q.toLowerCase()));
  return h('div',null,
    h('div',{className:'ptitle'},h('i',{className:'ti ti-clock',style:{fontSize:20}}),'Ca giao hàng'),
    h('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem',flexWrap:'wrap',gap:8}},
      h(SearchBar,{value:q,onChange:sq,placeholder:'Tìm ca giao hàng...'}),
      h(AddBtn,{onClick:()=>{se(null);sm('f')},label:'Thêm ca'})
    ),
    h('div',null,
      (()=>{
        if(!list.length) return h('div',{className:'empty-st'},'Chưa có ca giao hàng nào.');
        const areas=[...new Set(list.map(x=>x.area||'Chưa phân khu vực'))];
        return areas.map(area=>h('div',{key:area,style:{marginBottom:'1.25rem'}},
          h('div',{style:{fontWeight:600,fontSize:13,color:'var(--pri3)',padding:'8px 12px',background:'var(--bg2)',borderRadius:'var(--r) var(--r) 0 0',border:'.5px solid var(--bd)',borderBottom:'none',display:'flex',alignItems:'center',gap:6}},
            h('i',{className:'ti ti-map-pin',style:{fontSize:14,color:'var(--pri)'}}),
            area,
            h('span',{className:'badge',style:{background:'var(--pri)',color:'#fff',marginLeft:4}},list.filter(x=>(x.area||'Chưa phân khu vực')===area).length+' ca')
          ),
          h('div',{className:'tw',style:{borderRadius:'0 0 var(--rl) var(--rl)'}},h('table',null,
            h('thead',null,h('tr',null,...['Mã ca','Tên ca','Giờ bắt đầu','Giờ kết thúc','Ghi chú',''].map(c=>h('th',{key:c},c)))),
            h('tbody',null,list.filter(x=>(x.area||'Chưa phân khu vực')===area).map(x=>h('tr',{key:x.id},
              h('td',null,h('span',{style:{color:'var(--pri)',fontWeight:500}},x.id)),
              h('td',null,h('div',{style:{fontWeight:500}},x.name)),
              h('td',null,x.timeStart?h('span',{className:'badge',style:{background:'#FFF9C4',color:'#854F0B'}},x.timeStart):'—'),
              h('td',null,x.timeEnd?h('span',{className:'badge',style:{background:'#EDE9FE',color:'#5B21B6'}},x.timeEnd):'—'),
              h('td',null,x.note||'—'),
              h('td',null,h('div',{style:{display:'flex',gap:2}},
                h('button',{className:'bi',onClick:()=>{se(x);sm('f')}},h('i',{className:'ti ti-edit',style:{fontSize:15}})),
                h('button',{className:'bi',onClick:()=>del(x.id),style:{color:'#A32D2D'}},h('i',{className:'ti ti-trash',style:{fontSize:15}}))
              ))
            )))
          ))
        ));
      })()
    ),
    modal==='f'&&h(ShiftForm,{s:edit,allShifts:shifts,onSave:save,onClose:()=>{sm(null);se(null);}})
  );
}

