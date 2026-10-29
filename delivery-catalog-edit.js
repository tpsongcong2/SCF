// Catalog edits update orders only. They never rename the shared catalog or re-plan a trip.
function scfDeliveryPointChoices(customers){
  return (customers||[]).flatMap(customer=>(customer.points||[]).filter(point=>point.name).map(point=>({key:JSON.stringify([String(customer.id),String(point.id||point.name)]),label:customer.name+' / '+point.name,point,customer})));
}
function scfDeliveryCatalogSnapshot(order){
  return JSON.stringify([order?.id,...['customerId','customer','pointId','pointName','address','area','deliveryDate','deliveryTime','tripId','tripAssignMode','prodShiftAssignMode','prodShiftId','prodDate','prodTime','labelDate','labelTime','status','warehouseMerged'].map(key=>order?.[key]),order?.lines,order?.warehouseSourceOrders]);
}
function scfDeliveryCatalogLineIndex(order,lineId,index){
  if(lineId){const matches=(order.lines||[]).map((line,i)=>String(line.id)===String(lineId)?i:-1).filter(i=>i>=0);if(matches.length!==1)throw Error('Dòng sản phẩm đã thay đổi. Hãy mở lại ô.');return matches[0];}
  if(!order.lines?.[index]||order.lines[index].id)throw Error('Không tìm thấy dòng sản phẩm.');return index;
}
function scfDeliveryEffectiveLine(order,line){
  const source=order.warehouseMerged?(order.warehouseSourceOrders||[]).find(item=>String(item.id)===String(line.warehouseSourceOrderId)):null;
  const base=source||order;
  return {customerId:line.warehouseSourceCustomerId??base.customerId??'',customer:line.warehouseSourceCustomer??base.customer??'',pointId:line.warehouseSourcePointId??base.pointId??'',pointName:line.warehouseSourcePointName||base.pointName||'',area:line.warehouseSourceArea??base.area??'',address:line.warehouseSourceAddress??base.address??'',deliveryDate:line.warehouseSourceDeliveryDate||base.deliveryDate,deliveryTime:line.warehouseSourceDeliveryTime||base.deliveryTime};
}
function scfDeliveryCatalogIdentity(order,line){
  const row=scfDeliveryEffectiveLine(order,line),norm=value=>normalizeLookupText(String(value||''));
  return JSON.stringify([String(row.customerId||norm(row.customer)),String(row.pointId||norm(row.pointName)),toIsoDate(row.deliveryDate),mobileDeliveryTime(row.deliveryTime)]);
}
function scfDeliveryCatalogChange({live,base,kind,lineId,lineIndex,selection,customers,products,orders}){
  if(!live||String(live.id)!==String(base.id))throw Error('Đơn không còn tồn tại.');
  if(scfDeliveryCatalogSnapshot(live)!==scfDeliveryCatalogSnapshot(base))throw Error('Đơn đã được sửa ở nơi khác. Hãy mở lại ô để kiểm tra.');
  const index=scfDeliveryCatalogLineIndex(live,lineId,lineIndex),oldLine=live.lines[index];let next=live;
  const priceKeys=['price','purchasePrice','salePrice','sellPrice','unitPrice','priceSale'];
  const clearPrice=line=>{const result={...line};priceKeys.forEach(key=>{if(Object.hasOwn(result,key))delete result[key];});return result;};
  if(kind==='point'){
    const options=scfDeliveryPointChoices(customers).filter(item=>item.key===selection);if(options.length!==1)throw Error('Địa điểm không còn duy nhất trong danh mục. Hãy kiểm tra lại.');const option=options[0];
    const {point,customer}=option;
    const old=scfDeliveryEffectiveLine(live,oldLine);
    if(String(old.pointId)===String(point.id||'')&&old.pointName===point.name&&String(old.customerId)===String(customer.id)&&old.customer===customer.name&&old.address===(point.address||'')&&old.area===(point.area||''))return {order:live,index,before:old.pointName,after:old.pointName};
    if(live.warehouseMerged){
      const changed={...clearPrice(oldLine),warehouseSourcePointId:point.id||'',warehouseSourcePointName:point.name,warehouseSourceCustomerId:customer.id,warehouseSourceCustomer:customer.name,warehouseSourceAddress:point.address||'',warehouseSourceArea:point.area||''};
      next={...live,lines:live.lines.map((line,i)=>i===index?changed:line)};
    }else next={...live,pointId:point.id||'',pointName:point.name,customerId:customer.id,customer:customer.name,address:point.address||'',area:point.area||'',lines:live.lines.map(clearPrice)};
  }else if(kind==='product'){
    const matches=(products||[]).filter(item=>String(item.id)===String(selection));if(matches.length!==1)throw Error('Hãy chọn sản phẩm có mã duy nhất trong danh mục.');const product=matches[0];
    if(String(oldLine.productId)===String(product.id)&&oldLine.productName===product.name&&oldLine.unit===(product.unit||'')&&Number(oldLine.weightPerUnit||0)===Number(product.weightPerUnit||0))return {order:live,index,before:oldLine.productName,after:oldLine.productName};
    const changed={...clearPrice(oldLine),productId:product.id,productCode:product.code||'',productName:product.name,unit:product.unit||'',weightPerUnit:product.weightPerUnit||0};
    if(live.warehouseMerged&&typeof scfWarehouseOrders!=='undefined'&&!scfWarehouseOrders.pac(changed,products))throw Error('Đơn kho vận gộp cần sản phẩm PAC. Hãy tách dòng trước khi đổi sang sản phẩm giao lẻ.');
    next={...live,lines:live.lines.map((line,i)=>i===index?changed:line)};
  }else throw Error('Cột không hỗ trợ sửa danh mục.');
  const affected=kind==='point'&&!live.warehouseMerged?next.lines.map((line,i)=>i):[index];
  for(const i of affected){
    const candidate=next.lines[i],identity=scfDeliveryCatalogIdentity(next,candidate),old=live.lines[i];
    const changedKey=identity!==scfDeliveryCatalogIdentity(live,old)||String(candidate.productId)!==String(old.productId);
    if(!changedKey)continue;
    for(const order of orders||[]){if(order.status==='cancelled')continue;
      const rows=String(order.id)===String(live.id)?next.lines:order.lines||[];
      for(let j=0;j<rows.length;j++){
        if(String(order.id)===String(live.id)&&j===i)continue;
        const other=rows[j],otherOrder=String(order.id)===String(live.id)?next:order;
        if(identity!==scfDeliveryCatalogIdentity(otherOrder,other))continue;
        if(kind==='point'&&!live.warehouseMerged&&String(order.id)!==String(live.id)||String(candidate.productId)===String(other.productId))throw Error('Trùng đơn/dòng tại '+scfDeliveryEffectiveLine(next,candidate).pointName+' · '+candidate.productName+' (đơn '+order.id+'). Hãy sửa hoặc gộp tại đơn đã có.');
      }
    }
  }
  return {order:next,index,before:kind==='point'?scfDeliveryEffectiveLine(live,oldLine).pointName:oldLine.productName,after:kind==='point'?scfDeliveryEffectiveLine(next,next.lines[index]).pointName:next.lines[index].productName};
}
function DeliveryCatalogCell({order,lineIndex,kind,label,choices,canEdit,onSave}){
  const [editing,setEditing]=useState(false),[query,setQuery]=useState(''),[error,setError]=useState(''),[saving,setSaving]=useState(false);
  const base=useRef(null),busy=useRef(false),active=useRef(true);
  useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
  const begin=()=>{if(!canEdit)return;base.current={...order,lines:(order.lines||[]).map(line=>({...line}))};setQuery('');setError('');setEditing(true);};
  const close=()=>{if(!busy.current){base.current=null;setEditing(false);setError('');}};
  const select=async option=>{if(busy.current||!canEdit)return;busy.current=true;setSaving(true);setError('');
    try{if(await onSave(base.current,lineIndex,kind,option.key)!==false&&active.current){setEditing(false);base.current=null;}}
    catch(error){if(active.current)setError(error.message||'Chưa lưu được.');}finally{busy.current=false;if(active.current)setSaving(false);}
  };
  const normalized=normalizeLookupText(query),matches=editing?choices.filter(option=>normalizeLookupText(option.label).includes(normalized)).slice(0,40):[];
  return h('div',{className:'delivery-catalog-cell'},!editing?h('button',{type:'button',className:'delivery-catalog-value',disabled:!canEdit,'data-scf-action':canEdit?'write':'view','aria-label':'Sửa '+(kind==='point'?'địa điểm ':'sản phẩm ')+label,title:label,onClick:begin},label):h('div',{className:'delivery-catalog-editor'},
    h('input',{autoFocus:true,value:query,disabled:saving,'aria-label':kind==='point'?'Tìm địa điểm trong danh mục':'Tìm sản phẩm theo mã hoặc tên',placeholder:label,role:'combobox','aria-expanded':true,onChange:event=>setQuery(event.target.value),onKeyDown:event=>{if(event.isComposing||event.nativeEvent?.isComposing)return;if(event.key==='Escape'){event.preventDefault();close();}if(event.key==='Enter'){event.preventDefault();const exact=choices.filter(option=>normalizeLookupText(option.label)===normalized||normalizeLookupText(option.key)===normalized);if(exact.length===1)select(exact[0]);else if(matches.length===1)select(matches[0]);else setError('Hãy chọn đúng một mục trong danh sách.');}}}),
    !saving&&h('div',{className:'delivery-catalog-options',role:'listbox'},matches.map(option=>h('button',{key:option.key,type:'button',role:'option','aria-selected':false,onClick:()=>select(option)},option.label)),!matches.length&&h('span',null,'Không có mục phù hợp.')),
    h('button',{type:'button',disabled:saving,onClick:close},saving?'Đang lưu…':'Hủy'),error&&h('div',{className:'delivery-editor-error',role:'alert'},error)));
}
