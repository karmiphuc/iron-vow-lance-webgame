// Keep the chosen contract beside its consequences and single preparation action.
window.IronVowMenus=(()=>{
 const selectedByPort=new Map();
 let hudObserver=null;
 function combatLayout(root){
  hudObserver?.disconnect();
  const hud=root.querySelector('.battle-bottom');
  if(!hud)return;
  const measure=()=>{
   if(!hud.isConnected)return;
   const bottom=parseFloat(getComputedStyle(hud).bottom);
   document.body.style.setProperty('--combat-hud-height',hud.getBoundingClientRect().height+'px');
   document.body.style.setProperty('--combat-hud-bottom',(Number.isFinite(bottom)?bottom:16)+'px');
  };
  measure();
  if(window.ResizeObserver){hudObserver=new ResizeObserver(measure);hudObserver.observe(hud);}
 }
 function contracts(root){
  const grid=root.querySelector('#ui .contract-grid');
  if(!grid||grid.dataset.decisionUi)return;
  const cards=[...grid.querySelectorAll('.offer-card')];
  if(!cards.length)return;
  const entries=cards.map(card=>{
   const action=card.querySelector('[data-world-offer]');
   return {card,id:action.dataset.worldOffer,template:action.dataset.deploy};
  });
  const port=entries[0].id.split(':')[1],chosen=selectedByPort.get(port);
  const selected=entries.find(e=>e.id===chosen)??entries[0];
  const layout=document.createElement('div');layout.className='contract-workspace';
  const choices=document.createElement('div');choices.className='contract-choice-list';
  choices.setAttribute('role','tablist');choices.setAttribute('aria-label','Contract offers');
  grid.before(layout);layout.append(choices,grid);grid.dataset.decisionUi='true';
  for(const entry of entries){
   const button=document.createElement('button');button.type='button';button.className='contract-choice';
   button.dataset.contractSelect=entry.id;button.dataset.contractTemplate=entry.template;
   button.id='choose-'+entry.id;entry.card.id='detail-'+entry.id;
   button.setAttribute('role','tab');button.setAttribute('aria-controls',entry.card.id);
   entry.card.setAttribute('role','tabpanel');entry.card.setAttribute('aria-labelledby',button.id);
   const title=document.createElement('strong');title.textContent=entry.card.querySelector('h2').textContent;
   const terms=document.createElement('small');
   const values=[...entry.card.querySelectorAll('.offer-terms .stat')];
   const term=label=>values.find(v=>v.querySelector('span')?.textContent===label)?.querySelector('b')?.textContent;
   terms.textContent=[term('PAYMENT'),term('LANCE'),'Expires '+term('EXPIRES')].filter(Boolean).join(' · ');
   button.append(title,terms);choices.append(button);entry.button=button;
  }
  const choose=(id,focus=false)=>{
   selectedByPort.set(port,id);
   for(const entry of entries){
    const active=entry.id===id;entry.card.hidden=!active;
    entry.button.setAttribute('aria-selected',String(active));entry.button.tabIndex=active?0:-1;
    if(active&&focus){entry.button.focus({preventScroll:true});entry.button.scrollIntoView({block:'nearest',inline:'nearest'});}
   }
  };
  entries.forEach((entry,index)=>{
   entry.button.onclick=()=>choose(entry.id);
   entry.button.onkeydown=event=>{
    const keys=['ArrowDown','ArrowRight','ArrowUp','ArrowLeft','Home','End'];
    if(!keys.includes(event.key))return;
    event.preventDefault();
    const offset=['ArrowUp','ArrowLeft'].includes(event.key)?-1:1;
    const next=event.key==='Home'?0:event.key==='End'?entries.length-1:(index+offset+entries.length)%entries.length;
    choose(entries[next].id,true);
   };
  });
  choose(selected.id);
 }
 return {combatLayout,enhance(root=document){hudObserver?.disconnect();if(document.body.dataset.view==='contracts')contracts(root);}};
})();
