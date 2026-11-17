/* Production lifecycle for the shared hangar and its caller-owned overlays. */
(function(root){
'use strict';
const renderer=root.IronVowRenderer;
let stage,catalog,projected,rosterKey,configured,selected;
function mount(){
 catalog=root.IronVowHangarCatalog.create();
 stage=root.IronVowHangar.create({catalog,onSelect(id){configured.onSelect(Number(id.slice(5)));},onReserve(_id,frame){configured.onReserve(frame);}});
}
function clear(){
 if(!stage)return;
 projected?.();projected=null;
 stage.dispose();catalog.dispose();
 stage=catalog=null;rosterKey=selected=undefined;
}
function sync(config){
 configured=config;
 if(!config){clear();return;}
 if(renderer.lost)return;
 if(!stage)mount();
 const {career,mechBay,model}=config;
 const roster=root.IronVowHangarRoster.fromCareer(career,{catalog,model});
 const displayed=mechBay?roster:{active:[],reserve:[],seatCount:roster.seatCount};
 const key=JSON.stringify(displayed);
 if(key!==rosterKey){
  rosterKey=key;stage.setRoster(displayed);catalog.load([...displayed.active,...displayed.reserve]);
 }
 if(mechBay&&config.selected!==selected)stage.select('seat:'+config.selected,false,selected!==undefined);
 else if(!mechBay)stage.overview();
 selected=mechBay?config.selected:undefined;
 projected?.();
 projected=config.project(stage,stage.destinations);
}
renderer.subscribe(({type})=>{
 if(type!=='restored'||!configured)return;
 const camera=stage?.cameraState();
 clear();sync(configured);stage.restoreCamera(camera);
});
root.IronVowHangarRuntime={
 sync,overview:()=>stage?.overview(),
 render(t,dt,rect,reducedMotion){
  if(!stage||!rect.width||!rect.height)return false;
  stage.render(t,dt,rect.width,rect.height,reducedMotion);
  stage.placeHotspots(rect);return true;
 },
 pick(x,y,rect){return configured?.mechBay?stage?.pick(x,y,rect):null;},
 get scene(){return stage;}
};
})(window);
