// Drafts contain no live mutations. The page commits a reviewed batch against latest orders.
function scfFastEntryRows(text){
  const rows=[];let cells=[],cell='',quoted=false;const source=String(text||'').replace(/^\uFEFF/,'');
  for(let i=0;i<source.length;i++){
    const c=source[i];
    if(c==='"'&&(quoted||cell==='')){if(quoted&&source[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
    else if(c==='\t'&&!quoted){cells.push(cell);cell='';}
    else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&source[i+1]==='\n')i++;cells.push(cell);if(cells.some(value=>value.trim()))rows.push(cells);cells=[];cell='';}
    else cell+=c;
  }
  if(quoted)throw Error('Ô Excel có dấu nháy chưa đóng. Hãy sao chép lại đầy đủ các ô.');
  cells.push(cell);if(cells.some(value=>value.trim()))rows.push(cells);
  if(rows[0]&&/ngày|ngay/i.test(rows[0][0])&&/bếp|bep|địa|dia/i.test(rows[0][1]||''))rows.shift();
  return rows.map(cells=>({date:cells[0]?.trim()||'',point:cells[1]?.trim()||'',product:cells[2]?.trim()||'',ordered:cells[3]?.trim()||'',invoice:cells[4]?.trim()||'',time:cells[5]?.trim()||'',note:cells.slice(6).join('\t').trim()}));
}
function scfFastEntryProductLabel(product){return [product.code||product.id,product.name].filter(Boolean).join(' - ');}
// Image tables are drafts only. Never silently select an ambiguous catalog item.
function scfFastEntryImageRows(source,point,products){
  const norm=value=>normalizeLookupText(String(value||'')).replace(/[^a-z0-9]+/g,' ').trim();
  const rows=[];
  for(const original of String(source||'').split(/\r?\n/)){
    const date=original.match(/\b\d{1,2}[\/.\-]\d{1,2}[\/.\-](?:20)?\d{2}\b/),time=original.match(/\b\d{1,2}:\d{2}\b/);
    if(!date||!time)continue;
    const prefix=original.slice(0,Math.min(date.index,time.index)).replace(/[|]/g,' ').trim();
    const amount=prefix.match(/\s(\d+(?:[.,]\d+)?)\s*$/);if(!amount)continue;
    const name=prefix.slice(0,amount.index).replace(/(?:[,\s]+(?:kg|gói|goi|pac|túi|tui))+\s*$/i,'').trim();
    const matches=(products||[]).filter(product=>norm(product.name)===norm(name)||norm(product.code)===norm(name));
    rows.push({date:date[0].replace(/[.\-]/g,'/'),point:point||'',product:matches.length===1?scfFastEntryProductLabel(matches[0]):name,ordered:amount[1],invoice:amount[1],time:time[0],note:''});
  }
  return rows;
}
function scfFastEntryEncodeRows(rows){
  const encode=value=>/[\t\n\r"]/.test(String(value||''))?'"'+String(value).replace(/"/g,'""')+'"':String(value||'');
  return rows.map(row=>['date','point','product','ordered','invoice','time','note'].map(key=>encode(row[key])).join('\t')).join('\n');
}
function scfFastEntryResolve(row,customers,products){
  const norm=value=>normalizeLookupText(String(value||'')).trim();
  let date=row.date;
  if(/^\d{4}-\d{2}-\d{2}$/.test(date))date=vnDateFromISO(date);
  if(/^\d{1,2}\/\d{1,2}\/\d{2}$/.test(date))date=date.replace(/\/(\d{2})$/,'/20$1');
  if(!isValidCustomerImportDate(date)||!isPlausibleCustomerImportYear(date))throw Error('Ngày không hợp lệ (dd/mm/yyyy).');
  const [d,m,y]=date.split('/');date=d.padStart(2,'0')+'/'+m.padStart(2,'0')+'/'+y;
  const points=(customers||[]).flatMap(customer=>(customer.points||[]).map(point=>({point,customer}))).filter(({point,customer})=>norm(point.name)===norm(row.point)||norm(customer.name+' / '+point.name)===norm(row.point));
  if(points.length!==1)throw Error(points.length?'Trùng tên địa điểm: nhập Khách hàng / Địa điểm.':'Địa điểm chưa có trong danh mục.');
  if(!String(row.product||'').trim())throw Error('Hãy nhập tên hoặc mã sản phẩm.');
  const input=norm(row.product),byCode=(products||[]).filter(product=>norm(product.id)===input||norm(product.code)===input);
  const byLabel=(products||[]).filter(product=>norm(scfFastEntryProductLabel(product))===input);
  const matches=byCode.length?byCode:byLabel.length?byLabel:(products||[]).filter(product=>norm(product.name)===input);
  if(matches.length!==1)throw Error(matches.length?'Tên sản phẩm chưa duy nhất, dùng mã sản phẩm.':'Sản phẩm chưa có trong danh mục.');
  const qty=value=>{const raw=String(value).replace(',','.');if(!/^\d+(?:\.\d+)?$/.test(raw)||!Number.isFinite(Number(raw)))throw Error('Nhập riêng SL đặt và SL HĐ, không để trống.');return Number(raw);};
  const time=mobileDeliveryTime(row.time);if(!time)throw Error('Giờ giao phải có dạng hh:mm.');
  const {point,customer}=points[0],product=matches[0];
  return {deliveryDate:date,deliveryTime:time,pointId:point.id,pointName:point.name,customerId:customer.id,customer:customer.name,address:point.address||'',area:point.area||'',status:'pending',tripAssignMode:'auto',prodShiftAssignMode:'auto',note:'',
    lines:[{id:uid(),productId:product.id,productName:product.name,unit:product.unit||'',weightPerUnit:product.weightPerUnit||0,qtyProd:qty(row.ordered),qtyInvoice:qty(row.invoice),note:row.note||''}]};
}
function scfFastEntryMatches(orders,draft){
  // Warehouse parents have several original identities. They must use the PAC importer.
  return orders.filter(order=>!order.warehouseMerged&&order.status!=='cancelled'&&
    String(order.customerId)===String(draft.customerId)&&(draft.pointId?String(order.pointId)===String(draft.pointId):normalizeLookupText(order.pointName||'')===normalizeLookupText(draft.pointName||''))&&
    toIsoDate(order.deliveryDate)===toIsoDate(draft.deliveryDate)&&mobileDeliveryTime(order.deliveryTime)===draft.deliveryTime);
}
function scfFastEntryInheritSchedule(order,lines){
  const source=order.lines?.[0]||{},fields=['prodShiftId','prodDate','prodTime','prodWorkShiftId','labelDate','labelTime','productionScheduleCopiedFromTripId'];
  return lines.map(line=>({...line,...Object.fromEntries(fields.filter(key=>source[key]!==undefined||order[key]!==undefined).map(key=>[key,source[key]??order[key]])),shiftOverride:!!source.shiftOverride}));
}
function DeliveryFastEntryModal({customers,products,prodCats=[],orders,currentUser,onCommit,onWarehouse,onClose}){
  const storageKey='scf_fast_entry_draft_'+String(currentUser?.id||'');
  const discarded=useRef(false);
  const imageJob=useRef(0),imageInput=useRef(null);
  const [imageBusy,setImageBusy]=useState(false),[imageText,setImageText]=useState(''),[imageNotice,setImageNotice]=useState('');
  useEffect(()=>()=>{imageJob.current++;},[]);
  const [text,setText]=useState(()=>{try{return localStorage.getItem(storageKey)||'';}catch(_){return '';}}),[preview,setPreview]=useState(null),[error,setError]=useState(''),[saving,setSaving]=useState(false);
  const [manual,setManual]=useState(()=>{try{const saved=JSON.parse(localStorage.getItem(storageKey+'_row')||'null');if(saved&&typeof saved==='object')return saved;}catch(_){}return {date:fmtDate(),point:'',product:'',ordered:'',invoice:'',time:'',note:''};});
  const pointArea=manual._pointArea||'',customerFilter=manual._customerFilter||'',productType=manual._productType||'TP';
  const areas=[...new Set(customers.flatMap(customer=>(customer.points||[]).map(point=>String(point.area||'').trim())).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'vi'));
  const pointCustomers=customers.filter(customer=>!pointArea||(customer.points||[]).some(point=>String(point.area||'').trim()===pointArea));
  const pointChoices=pointCustomers.filter(customer=>!customerFilter||String(customer.id)===customerFilter).flatMap(customer=>(customer.points||[]).filter(point=>!pointArea||String(point.area||'').trim()===pointArea).map(point=>({point,customer,label:customer.name+' / '+point.name})));
  const productChoices=products.filter(product=>(isGoodsProduct(product,prodCats)?'HH':'TP')===productType);
  const readImage=async file=>{
    if(!file||saving||imageBusy)return;
    if(!/^image\/(png|jpeg|webp|bmp)$/i.test(file.type)||file.size>15*1024*1024){setError('Chọn ảnh PNG, JPG, WebP hoặc BMP tối đa 15 MB.');return;}
    const job=++imageJob.current,url=URL.createObjectURL(file),point=manual.point;
    setImageBusy(true);setError('');setImageNotice('Đang đọc ảnh trên thiết bị…');
    try{
      const result=await window.scfReadOrderTableText(url,{isActive:()=>imageJob.current===job});
      if(imageJob.current!==job)return;
      if(result.status!=='ready'||!result.text?.trim())throw Error('Chưa đọc được chữ. Hãy thử ảnh rõ hơn hoặc dán dữ liệu Excel.');
      setImageText(result.text);
      const rows=scfFastEntryImageRows(result.text,point,products);
      if(!rows.length){setImageNotice('Chưa tách được bảng. Chữ đã đọc ở bên dưới; anh có thể sao chép và chỉnh vào bản nháp.');return;}
      setText(previous=>{const next=(previous.trim()?previous.trim()+'\n':'')+scfFastEntryEncodeRows(rows);try{localStorage.setItem(storageKey,next);}catch(_){}return next;});
      setPreview(null);setImageNotice('Đã thêm '+rows.length+' dòng nháp từ ảnh. Một cột số lượng được dùng cho cả SL đặt và SL HĐ. Kiểm tra ngày, giờ, sản phẩm và địa điểm trước khi lưu.');
    }catch(error){if(imageJob.current===job){setError(error.message||'Chưa đọc được ảnh.');setImageNotice('');}}
    finally{URL.revokeObjectURL(url);if(imageJob.current===job)setImageBusy(false);}
  };
  const pasteImage=event=>{const item=[...(event.clipboardData?.items||[])].find(item=>item.type.startsWith('image/'));if(item){event.preventDefault();event.stopPropagation();readImage(item.getAsFile());}};
  useEffect(()=>{if(discarded.current)return;try{localStorage.setItem(storageKey+'_row',JSON.stringify(manual));}catch(_){}},[manual]);
  useEffect(()=>{if(discarded.current)return;try{if(text)localStorage.setItem(storageKey,text);else localStorage.removeItem(storageKey);}catch(_){}},[text]);
  const addDraftLine=()=>{
    if(saving)return false;
    try{
      const matchingPoints=pointChoices.filter(({point,label})=>normalizeLookupText(point.name)===normalizeLookupText(manual.point)||normalizeLookupText(label)===normalizeLookupText(manual.point));
      if(matchingPoints.length!==1)throw Error(matchingPoints.length?'Chọn rõ khách hàng và địa điểm.':'Hãy chọn địa điểm thuộc khu vực/khách hàng đang lọc.');
      const row={...manual,point:matchingPoints[0].label};
      const resolved=scfFastEntryResolve(row,customers,products);
      if(!productChoices.some(product=>String(product.id)===String(resolved.lines[0].productId)))throw Error('Sản phẩm không thuộc loại TP/HH đang chọn. Hãy đổi loại hoặc chọn lại sản phẩm.');
      const encode=value=>/[\t\n\r"]/.test(String(value||''))?'"'+String(value).replace(/"/g,'""')+'"':String(value||'');
      const line=['date','point','product','ordered','invoice','time','note'].map(key=>encode(row[key])).join('\t');
      const nextText=(text.trim()?text.trim()+'\n':'')+line,nextManual={...manual,product:'',ordered:'',invoice:'',note:''};
      // Persist immediately so Enter followed by closing the app keeps the line.
      try{localStorage.setItem(storageKey,nextText);localStorage.setItem(storageKey+'_row',JSON.stringify(nextManual));}catch(_){}
      setText(nextText);setManual(nextManual);setPreview(null);setError('');return true;
    }catch(error){setError(error.message);return false;}
  };
  const closeAndDiscard=()=>{if(saving)return;discarded.current=true;try{localStorage.removeItem(storageKey);localStorage.removeItem(storageKey+'_row');}catch(_){}onClose();};
  const review=()=>{
    let rows;try{rows=scfFastEntryRows(text);}catch(error){setError(error.message);return;}if(!rows.length){setError('Hãy nhập hoặc dán ít nhất một dòng.');return;}
    if(rows.length>1000){setError('Mỗi lần tối đa 1.000 dòng để kiểm tra dễ hơn.');return;}
    const seen=new Set();
    setPreview(rows.map((row,index)=>{try{const draft=scfFastEntryResolve(row,customers,products),matches=scfFastEntryMatches(orders,draft),identity=JSON.stringify([draft.customerId,draft.pointId,draft.deliveryDate,draft.deliveryTime,draft.lines[0].productId]);const repeated=seen.has(identity);seen.add(identity);return {row,index,draft,matches,repeated,target:matches.length===1?String(matches[0].id):'',separate:false};}catch(error){return {row,index,error:error.message};}}));setError('');
  };
  const change=(index,values)=>setPreview(previous=>previous.map((item,i)=>i===index?{...item,...values}:item));
  const submit=async()=>{
    if(saving||imageBusy)return;
    if(preview.some(item=>item.error||item.matches.length>1&&!item.target)){setError('Hãy sửa dòng lỗi và chọn đúng đơn đích trước khi lưu.');return;}
    const pac=preview.some(item=>typeof scfWarehouseOrders!=='undefined'&&item.draft.lines.some(line=>scfWarehouseOrders.pac(line,products)));
    if(pac){onWarehouse(preview.map(item=>item.draft));return;}
    const newCount=preview.filter(item=>!item.target).length;
    if(!await window.scfConfirm('Lưu '+preview.length+' dòng sản phẩm'+(newCount?' (có '+newCount+' dòng thuộc đơn mới)':'')+'? Kiểm tra ngày, địa điểm và giờ trong bảng xem trước.','Xác nhận nhập đơn'))return;
    setSaving(true);setError('');
    try{await onCommit(preview);setText('');try{localStorage.removeItem(storageKey);}catch(_){}onClose();}catch(error){setError(error.message||'Chưa lưu được.');}finally{setSaving(false);}
  };
  return h(Modal,{title:'Tạo đơn',lg:true,className:'delivery-fast-entry-modal',onClose:()=>{if(!saving)onClose();}},
    h('p',null,'Mỗi dòng: Ngày → Địa điểm → Sản phẩm → SL đặt → SL HĐ → Giờ → Chú ý. Dán ô Excel hoặc ảnh bảng bằng Ctrl+V vào vùng bản nháp. Ảnh thiếu địa điểm sẽ dùng địa điểm đang chọn.'),
    h('div',{onPaste:pasteImage,tabIndex:0,'aria-label':'Dán ảnh tạo đơn',style:{padding:'8px',border:'1px dashed #789c91',marginBottom:'8px'}},
      h('button',{type:'button',disabled:saving||imageBusy,onClick:()=>imageInput.current?.click()},imageBusy?'Đang đọc ảnh…':'Chọn ảnh bảng đơn'),
      h('span',null,' hoặc bấm vào đây rồi Ctrl+V để dán ảnh'),
      h('input',{ref:imageInput,type:'file',accept:'image/png,image/jpeg,image/webp,image/bmp',hidden:true,onChange:event=>{readImage(event.target.files?.[0]);event.target.value='';}})),
    imageNotice&&h('p',{role:'status'},imageNotice),
    imageText&&h('details',null,h('summary',null,'Chữ đã đọc từ ảnh — dùng để đối chiếu'),h('pre',{style:{whiteSpace:'pre-wrap',maxHeight:'180px',overflow:'auto'}},imageText)),
    h('div',{className:'delivery-fast-filters'},
      h('label',null,'Khu vực',h('select',{'aria-label':'Khu vực nhập nhanh',value:pointArea,disabled:saving,onChange:event=>setManual(previous=>({...previous,_pointArea:event.target.value,_customerFilter:'',point:''}))},h('option',{value:''},'Tất cả khu vực'),areas.map(area=>h('option',{key:area,value:area},area)))),
      h('label',null,'Khách hàng',h('select',{'aria-label':'Khách hàng nhập nhanh',value:customerFilter,disabled:saving,onChange:event=>setManual(previous=>({...previous,_customerFilter:event.target.value,point:''}))},h('option',{value:''},'Tất cả khách hàng'),pointCustomers.map(customer=>h('option',{key:customer.id,value:String(customer.id)},customer.name)))),
      h('label',null,'Loại sản phẩm',h('select',{'aria-label':'Loại sản phẩm nhập nhanh',value:productType,disabled:saving,onChange:event=>setManual(previous=>({...previous,_productType:event.target.value,product:''}))},h('option',{value:'TP'},'TP · Thành phẩm'),h('option',{value:'HH'},'HH · Hàng hóa')))),
    h('div',{className:'tw delivery-fast-manual'},h('table',null,h('thead',null,h('tr',null,['Ngày','Địa điểm','Sản phẩm (mã - tên)','SL đặt','SL HĐ','Giờ','Chú ý'].map(label=>h('th',{key:label},label)))),h('tbody',null,h('tr',null,...['date','point','product','ordered','invoice','time','note'].map(key=>h('td',{key},h('input',{'aria-label':'Nhập nhanh '+key,value:manual[key],disabled:saving,list:key==='point'?'scf-fast-points':key==='product'?'scf-fast-products':undefined,inputMode:['ordered','invoice'].includes(key)?'decimal':undefined,onChange:event=>setManual(previous=>({...previous,[key]:event.target.value})),onKeyDown:event=>{if(event.key==='Enter'&&!event.isComposing&&!event.nativeEvent?.isComposing){event.preventDefault();const inputs=[...event.currentTarget.closest('tr').querySelectorAll('input')];if(key==='note'){if(addDraftLine())inputs[2]?.focus();}else inputs[inputs.indexOf(event.currentTarget)+1]?.focus();}}}))))))),
    h('datalist',{id:'scf-fast-points'},pointChoices.map(({point,customer,label})=>h('option',{key:String(customer.id)+'|'+point.id,value:label}))),
    h('datalist',{id:'scf-fast-products'},productChoices.map(product=>h('option',{key:product.id,value:scfFastEntryProductLabel(product)},product.unit||''))),
    h('button',{type:'button',disabled:saving,onClick:addDraftLine},'+ Thêm dòng vào bản nháp'),
    h('textarea',{'aria-label':'Dữ liệu dán từ Excel',value:text,disabled:saving,rows:7,spellCheck:false,onPaste:pasteImage,placeholder:'30/10/2026\tSEVT1\tBÚN TƯƠI\t30\t30\t02:00\tChú ý',onChange:event=>{setText(event.target.value);setPreview(null);}}),
    h('button',{type:'button',disabled:saving||imageBusy,onClick:review},'Xem trước'),
    preview&&h('div',{className:'tw delivery-fast-preview'},h('table',null,h('thead',null,h('tr',null,['Dòng','Ngày','Địa điểm','Sản phẩm','SL đặt','SL HĐ','Giờ','Chú ý','Xử lý'].map(label=>h('th',{key:label},label)))),h('tbody',null,preview.map((item,index)=>{
      const duplicate=item.repeated||item.target&&item.matches.find(order=>String(order.id)===item.target)?.lines?.some(line=>String(line.productId)===String(item.draft?.lines[0].productId));
      return h('tr',{key:index},h('td',null,index+1),...['date','point','product','ordered','invoice','time','note'].map(key=>h('td',{key},item.row[key])),h('td',null,item.error?h('span',{role:'alert'},item.error):h(React.Fragment,null,
        item.matches.length?h('select',{'aria-label':'Đơn đích dòng '+(index+1),value:item.target,disabled:saving,onChange:event=>change(index,{target:event.target.value,separate:false})},item.matches.length>1&&h('option',{value:''},'Chọn đơn đích…'),item.matches.map(order=>h('option',{key:order.id,value:String(order.id)},'Thêm vào '+order.id))):h('strong',null,'Tạo đơn mới — cần xác nhận'),
        duplicate&&h('label',null,h('input',{type:'checkbox',checked:item.separate,disabled:saving,onChange:event=>change(index,{separate:event.target.checked})}),'Trùng sản phẩm: xác nhận thêm dòng riêng'),
        duplicate&&h('small',null,'Muốn sửa số cũ: đóng cửa sổ và sửa ô tại đơn đích; không cộng dồn tự động.'))));
    })))),
    error&&h('p',{role:'alert',className:'delivery-editor-error'},error),
    h('div',{className:'form-actions'},h('button',{type:'button',disabled:saving,onClick:onClose},'Đóng, giữ bản nháp'),h('button',{type:'button',disabled:saving,onClick:closeAndDiscard},'Đóng, xóa bản nháp'),preview&&h('button',{type:'button',className:'bp',disabled:saving||imageBusy||preview.some(item=>item.error),onClick:submit},saving?'Đang lưu trên máy…':'Xác nhận lưu')));
}
