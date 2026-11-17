/* Refit selection is presentation state. Original equipment buttons keep their handlers. */
(()=>{
 const selected=new Map();
 function enhance(root=document){
  const workshop=root.querySelector('.workshop-page');
  if(!workshop)return;
  const meta=workshop.querySelector('.workshop-meta');
  if(meta)for(const detail of workshop.querySelectorAll('.workshop-wide-detail'))meta.append(detail);
  for(const armory of workshop.querySelectorAll('.workshop-armory')){
   if(armory.dataset.refitEnhanced)continue;
   const grids=[...armory.querySelectorAll('.armory-grid')];
   const records=grids.flatMap(grid=>[...grid.children].map(host=>{
    const card=host.matches('.armory-card')?host:host.querySelector('.armory-card');
    const action=card?.querySelector('[data-equip]');
    return card&&action?{host,card,action,id:action.dataset.equip}:null;
   }).filter(Boolean));
   if(!records.length)continue;
   armory.dataset.refitEnhanced='true';
   const key=armory.querySelector('[data-armory-class][aria-pressed="true"]')?.dataset.armoryClass??'factory-kits';
   const equipped=records.find(r=>r.action.getAttribute('aria-pressed')==='true');
   const initial=records.find(r=>r.id===selected.get(key))??equipped??records[0];
   const browser=document.createElement('div');browser.className='refit-browser';
   const choices=document.createElement('div');choices.className='refit-choices';choices.setAttribute('aria-label','Choose equipment to inspect');
   const detail=document.createElement('div');detail.className='refit-detail';
   const comparison=document.createElement('p');comparison.className='refit-comparison';comparison.setAttribute('aria-live','polite');
   detail.append(comparison);browser.append(choices,detail);grids[0].before(browser);
   const buttons=[];
   const show=(record,focus=false)=>{
    selected.set(key,record.id);
    records.forEach((entry,index)=>{
     entry.host.hidden=entry!==record;
     buttons[index].setAttribute('aria-pressed',String(entry===record));
    });
    const base=records.find(r=>r.action.getAttribute('aria-pressed')==='true');
    const deltas=[];
    const mounted=armory.querySelectorAll('.armory-mounted>div')[key==='melee'?1:0];
    const mountedStats=key!=='shields'&&mounted?.querySelector('small')?.textContent.match(/^(\d+)(?: MAX)? DMG · (\d+ tiles|Adjacent) · (\d+) AP$/);
    if(base!==record&&(base||mountedStats)){
     const old=base?[...base.card.querySelectorAll('dl>div')]:[];
     [...record.card.querySelectorAll('dl>div')].forEach((stat,index)=>{
      const label=stat.querySelector('dt')?.textContent;
      if(base&&label!==old[index]?.querySelector('dt')?.textContent)return;
      const value=stat.querySelector('dd')?.textContent.match(/^(\d+(?:\.\d+)?)(.*)$/);
      const prior=(base?old[index]?.querySelector('dd')?.textContent:mountedStats[index+1])?.match(/^(\d+(?:\.\d+)?)(.*)$/);
      if(!value||!prior||value[2]!==prior[2])return;
      const delta=Number(value[1])-Number(prior[1]);
      deltas.push(`${label} ${delta>0?'+':''}${delta}`);
     });
    }
    const baseName=base?.card.querySelector('h3').textContent??(mountedStats?mounted.querySelector('b').textContent:null);
    comparison.textContent=base===record?'Currently equipped':baseName?`Compared with ${baseName}${deltas.length?' · '+deltas.join(' · '):''}`:'Select a refit; price and availability below.';
    if(focus)buttons[records.indexOf(record)].focus({preventScroll:true});
   };
   for(const [index,record] of records.entries()){
    const button=document.createElement('button');button.type='button';button.dataset.refitChoice=record.id;
    const name=document.createElement('strong');name.textContent=record.card.querySelector('h3').textContent;
    const status=document.createElement('small');status.textContent=record.action.textContent.trim();
    button.append(name,status);button.setAttribute('aria-controls',`refit-${key}-${index}`);
    record.host.id=`refit-${key}-${index}`;record.host.classList.add('refit-option');
    button.onclick=()=>show(record);
    button.onkeydown=event=>{
     const offset=event.key==='ArrowDown'||event.key==='ArrowRight'?1:event.key==='ArrowUp'||event.key==='ArrowLeft'?-1:0;
     const next=event.key==='Home'?0:event.key==='End'?records.length-1:offset?(index+offset+records.length)%records.length:null;
     if(next!==null){event.preventDefault();show(records[next],true);}
    };
    buttons.push(button);choices.append(button);detail.append(record.host);
   }
   // Empty grids have no controls after their original nodes move into the detail pane.
   grids.forEach(grid=>grid.remove());
   show(initial);
  }
 }
 window.IronVowArmoryUI={enhance};
})();
