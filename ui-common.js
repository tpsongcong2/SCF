/* ─── UI base ─── */
function F({label,children}){return h('div',{className:'fl'},h('label',null,label),children)}
function Row({children}){return h('div',{className:'form-actions'},children)}
function Modal({title,lg,className='',onClose,children}){
  return h('div',{className:'overlay',onClick:e=>{if(e.target===e.currentTarget)onClose()}},
    h('div',{className:'modal'+(lg==='xl'?' xl':lg?' wide':'')+(className?' '+className:''),style:{},onClick:e=>e.stopPropagation()},
      h('div',{className:'mh'},h('h2',null,title),h('button',{className:'mclose',type:'button',onClick:onClose},h('i',{className:'ti ti-x'}))),
      children
    )
  );
}
function SearchBar({value,onChange,placeholder}){
  return h('div',{className:'search-wrap'},
    h('i',{className:'ti ti-search'}),
    h('input',{value,onChange:e=>onChange(e.target.value),placeholder:placeholder||'Tìm kiếm...'})
  );
}
function AddBtn({onClick,label}){
  return h('button',{className:'bp',onClick,'data-scf-action':'write',style:{padding:'7px 14px'}},h('i',{className:'ti ti-plus',style:{fontSize:14}}),label||'Thêm mới');
}
function TableWrap({cols,rows,empty}){
  return h('div',{className:'tw'},
    h('table',null,
      h('thead',null,h('tr',null,...cols.map(c=>h('th',{key:c},c)))),
      h('tbody',null,rows.length?rows:h('tr',null,h('td',{colSpan:cols.length,className:'empty-st'},empty||'Chưa có dữ liệu.')))
    )
  );
}

/* ─── EXCEL helpers ─── */
function xlsxExport(rows,cols,filename){
  const header=cols.map(([,label])=>label);
  const body=rows.map(r=>cols.map(([key])=>r[key]??''));
  const ws=XLSX.utils.aoa_to_sheet([header,...body]);const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Data');
  XLSX.writeFile(wb,filename+'_'+fmtDate().replace(/\//g,'-')+'.xlsx');
}
function xlsxImport(file,cb){
  const r=new FileReader();
  r.onload=e=>{
    const wb=XLSX.read(e.target.result,{type:'binary',cellDates:true});
    const ws=wb.Sheets[wb.SheetNames[0]];
    cb(XLSX.utils.sheet_to_json(ws,{defval:null,raw:false,cellDates:true}));
  };
  r.readAsBinaryString(file);
}
function ExportBtn({onClick}){return h('button',{onClick,style:{fontSize:12,padding:'6px 12px'}},h('i',{className:'ti ti-file-spreadsheet',style:{fontSize:14}}),'Xuất Excel');}
function ImportBtn({onFile}){
  const ref=useRef();
  return h('span',null,
    h('input',{type:'file',accept:'.xlsx,.xls',ref,style:{display:'none'},onChange:e=>{if(e.target.files[0]){xlsxImport(e.target.files[0],onFile);e.target.value='';}}}),
    h('button',{onClick:()=>ref.current.click(),'data-scf-action':'write',style:{fontSize:12,padding:'6px 12px'}},h('i',{className:'ti ti-upload',style:{fontSize:14}}),'Nhập Excel')
  );
}

function InvoiceImageSizeSelect({value,onChange}){
  return h('label',{className:'invoice-image-size-control'},
    h('span',null,'Cỡ ảnh'),
    h('select',{'aria-label':'Cỡ ảnh hóa đơn','data-scf-action':'view',value,onChange:event=>onChange(event.target.value)},
      h('option',{value:'small'},'Nhỏ'),h('option',{value:'medium'},'Vừa'),h('option',{value:'large'},'Lớn')
    )
  );
}
function TripInvoicePreview({src,label,size='medium'}){
  const safeSize=['small','medium','large'].includes(size)?size:'medium';
  const[url,setUrl]=useState(src);
  const[phase,setPhase]=useState('ready');
  const[reload,setReload]=useState(0);
  const attempt=React.useRef(false),generation=React.useRef(0);
  useEffect(()=>()=>{generation.current++;},[]);
  const refresh=async()=>{
    if(attempt.current){setPhase('failed');return;}
    attempt.current=true;
    const path=storagePhotoPathFromUrl(url);
    if(!path){setPhase('failed');return;}
    const version=generation.current;
    let timer;
    setPhase('refreshing');
    try{
      const next=await Promise.race([createPrivatePhotoUrl(path),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Photo timeout')),15000);})]);
      if(version!==generation.current)return;
      if(!next)throw new Error('Photo URL unavailable');
      setUrl(next);setReload(value=>value+1);
    }catch(error){if(version===generation.current)setPhase('failed');}
    finally{clearTimeout(timer);}
  };
  return h('figure',{className:'trip-invoice-preview invoice-size-'+safeSize},
    h('figcaption',null,label),
    h('button',{type:'button',className:'trip-invoice-image-button','data-scf-action':'view','aria-label':'Mở ảnh '+label,onClick:()=>window.open(url,'_blank','noopener'),style:phase==='failed'?{display:'none'}:undefined},
      // This component renews expired URLs once; skip the document-wide image retry.
      h('img',{key:reload,src:url,alt:label,loading:'lazy',decoding:'async','data-scf-photo-refreshing':'1',onLoad:()=>setPhase('ready'),onError:refresh})
    ),
    phase==='refreshing'&&h('small',{role:'status'},'Đang tải lại ảnh…'),
    phase==='failed'&&h('div',{className:'trip-invoice-preview-error',role:'status'},'Chưa tải được ảnh.',
      h('button',{type:'button',className:'bs','data-scf-action':'view',onClick:()=>{attempt.current=false;setPhase('ready');setReload(value=>value+1);}},'Thử lại')
    )
  );
}
