(function(H,T) {
  function material(name,hex,roughness,metalness) {
    const mat=new T.MeshStandardMaterial({color:new T.Color(hex).convertSRGBToLinear(), roughness, metalness,flatShading:true});
    mat.name=name;return mat;
  }
  // Bake soft contact shading against nearby castings. This remains attached to
  // each rigid part in the GLB and costs no per-frame work on the battlefield.
  function bakeContacts(root,optic) {
    root.updateMatrixWorld(true);
    const pieces=[];
    root.traverse(mesh=>{
      if(!mesh.isMesh)return;
      mesh.geometry.computeBoundingBox();
      const box=mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld);
      pieces.push({mesh,center:box.getCenter(new T.Vector3()),size:box.getSize(new T.Vector3())});
    });
    const p=new T.Vector3(),n=new T.Vector3(),d=new T.Vector3();
    for(const part of pieces) {
      const {mesh,center,size}=part;
      if(mesh.material===optic)continue;
      const nearby=pieces.filter(other=>other!==part && other.size.length()>.085 &&
        other.center.distanceTo(center)<.27+(size.length()+other.size.length())*.5);
      const g=mesh.geometry,pos=g.attributes.position,norm=g.attributes.normal,colors=[];
      const normalMatrix=new T.Matrix3().getNormalMatrix(mesh.matrixWorld);
      for(let i=0;i<pos.count;i++) {
        p.fromBufferAttribute(pos,i).applyMatrix4(mesh.matrixWorld);
        n.fromBufferAttribute(norm,i).applyMatrix3(normalMatrix).normalize();
        let shade=0;
        for(const other of nearby) {
          d.copy(other.center).sub(p);
          const distance=d.length();if(distance<.001)continue;
          d.divideScalar(distance);
          const facing=n.dot(d);if(facing<=0)continue;
          const width=other.size, area=(width.x*width.y+width.y*width.z+width.z*width.x)/12;
          shade+=facing*area/(area+distance*distance)*Math.exp(-distance*4);
        }
        const painted=mesh.material.name==='paint_primary'||mesh.material.name==='paint_accent';
        const finish=painted?.85:1;
        const v=finish*(.98-.61*(1-Math.exp(-shade*1.7)));
        colors.push(v,v,v);
      }
      g.setAttribute('color',new T.Float32BufferAttribute(colors,3));mesh.material.vertexColors=true;
    }
  }
  H.buildTrueMech=function({pistol=true}={}) {
    const root=new T.Group(), joints={};
    root.name='root';
    const armor=material('paint_primary',0xc9beaa,.56,.08), red=material('paint_accent',0x9e4230,.52,.14);
    const frame=material('paint_secondary',0x2c3035,.42,.75), dark=material('graphite',0x191b1e,.55,.6);
    const steel=material('piston steel',0x7f8484,.29,.8), stack=material('stack',0x392e26,.62,.45);
    const eye=material('visor',0xf59e0b,.2,.08);eye.emissive.setHex(0xff8c00).convertSRGBToLinear();eye.emissiveIntensity=3;
    function joint(key,name,parent,x,y,z) {
      const g=new T.Group();g.name=name;g.position.set(x,y,z);parent.add(g);joints[key]=g;return g;
    }
    function mesh(parent,name,geo,mat) {
      const m=new T.Mesh(geo,mat);m.name=name;m.castShadow=m.receiveShadow=true;parent.add(m);return m;
    }
    const hex=H.HEX_ARMOR_PROFILE, wedge=H.WEDGE_PROFILE;
    const chamfer=[[-.50,.28],[-.34,.50],[.28,.50],[.50,.26],[.50,-.29],[.28,-.50],[-.31,-.50],[-.50,-.28]];
    // Stations list center, full section width/depth and optional pitch/yaw/roll.
    function shell(parent,name,mat,rows,profile=hex) {
      return mesh(parent,name,H.createLoftGeometry(profile,rows.map(([x,y,z,a,b,rx=0,ry=0,rz=0])=>({pos:[x,y,z],scale:[a,b],rot:[rx,ry,rz]}))),mat);
    }
    function rod(parent,name,mat,a,b,r,s=r,sides=12) {
      const start=new T.Vector3(...a),stop=new T.Vector3(...b),dir=stop.clone().sub(start);
      const m=mesh(parent,name,new T.CylinderGeometry(s,r,dir.length(),sides),mat);
      m.position.copy(start).lerp(stop,.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),dir.normalize());return m;
    }
    function block(parent,name,mat,pos,size) {
      const m=mesh(parent,name,new T.BoxGeometry(...size),mat);m.position.set(...pos);return m;
    }
    function axle(p,label,x,y,z,r,w) {
      rod(p,label+' drum',dark,[x-w/2,y,z],[x+w/2,y,z],r,r,16);
      for(const sign of [-1,1]) {
        const end=x+sign*w/2;
        rod(p,label+' bearing '+sign,frame,[end,y,z],[end+sign*.009,y,z],r*.82,r*.82,14);
        rod(p,label+' hub '+sign,steel,[end+sign*.009,y,z],[end+sign*.012,y,z],r*.35,r*.35,8);
      }
    }
    // Seat each fastener flush on the actual sloping facet.
    function rivets(plate, locations) {
      plate.updateWorldMatrix(true,false);
      const inverse=plate.matrixWorld.clone().invert(),ray=new T.Raycaster();
      for(const [index,[x,y,r]] of locations.entries()) {
        const origin=plate.localToWorld(new T.Vector3(x,y,1));
        const forward=new T.Vector3(0,0,-1).transformDirection(plate.matrixWorld);
        ray.set(origin,forward);const hit=ray.intersectObject(plate)[0];if(!hit)continue;
        const at=hit.point.applyMatrix4(inverse);
        const n=hit.face.normal.clone().applyQuaternion(plate.quaternion);
        at.applyMatrix4(plate.matrix);
        rod(plate.parent,plate.name+' captive screw '+index,dark,at.toArray(),at.clone().addScaledVector(n,.0018).toArray(),r,r,8);
      }
    }
    const pelvis=joint('pelvis','pelvis',root,0,1.56,0);
    axle(pelvis,'Hip axle',0,0,0,.087,.43);
    shell(pelvis,'Central pelvic wedge',armor,[[0,.10,.068,.19,.21],[0,.078,.10,.205,.22],[0,-.10,.14,.15,.15],[0,-.145,.134,.085,.09]],wedge);
    const waist=joint('waist','waist',pelvis,0,.10,0);
    shell(waist,'Waist casting',dark,[[0,-.055,0,.21,.22],[0,.10,-.018,.24,.25],[0,.19,-.022,.29,.26]]);
    const torso=joint('torso','spine',waist,0,.14,.02);
    shell(torso,'Ribcage casting',frame,[[0,-.018,0,.25,.22],[0,.14,0,.43,.36],[0,.31,-.02,.56,.36],[0,.38,-.055,.44,.32]]);
    for(const s of [-1,1]) {
      for(let i=0;i<3;i++) {
        const vane=block(torso,'Rib louver '+s+' '+i,dark,[s*(.126+i*.012),.014+i*.047,.104+i*.012],[.09,.023,.096]);
        vane.rotation.z=s*.32;vane.rotation.x=-.27;
      }
      // The inner edges follow the centerline from clavicle to keel.
      const breast=[[.0,.38],[.08,.52],[.64,.39],[1,.06],[.91,-.32],[.47,-.46],[0,-.28]].map(([x,z])=>[s*x,z]);
      const chest=shell(torso,'Chevron breastplate '+s,armor,[
        [s*.004,.026,.219,.062,.132],[s*.005,.080,.246,.131,.218],[s*.005,.224,.187,.265,.273],
        [s*.005,.345,.073,.316,.246],[s*.006,.395,-.006,.285,.210],[s*.005,.405,-.024,.240,.157]],breast);
      rivets(chest,[[s*.220,.290,.005],[s*.076,.117,.004]]);
      shell(pelvis,'Hip clevis cap '+s,armor,[[s*.095,.066,.015,.074,.12],[s*.138,.087,.005,.084,.118],[s*.194,.063,-.016,.067,.093]],wedge);
      shell(torso,'Dorsal flank '+s,armor,[[s*.173,.14,-.10,.115,.20],[s*.204,.32,-.118,.13,.24],[s*.204,.394,-.135,.10,.17]]);
    }
    shell(torso,'Dorsal thruster housing',armor,[[.175,.27,-.16,.18,.18],[.185,.50,-.17,.21,.23],[.19,.62,-.17,.17,.18],[.19,.635,-.17,.14,.15]],wedge);
    block(torso,'Dorsal exhaust',stack,[.185,.53,-.265],[.101,.13,.026]);
    for(let i=0;i<4;i++) block(torso,'Dorsal exhaust vane '+i,frame,[.185,.48+i*.031,-.281],[.102,.012,.019]);
    const head=joint('head','neck',torso,0,.373,.149);
    shell(head,'Sloping dorsal brow',armor,[[0,.062,-.246,.21,.156],[0,.068,-.055,.21,.15],[0,.026,.072,.155,.103],[0,-.001,.155,.102,.062]],wedge);
    block(head,'Optic recess',dark,[0,-.026,.126],[.109,.046,.058]);
    block(head,'Amber optical glass',eye,[0,-.027,.157],[.034,.023,.009]);
    for(const s of [-1,1]) block(head,'Micro vent '+s,frame,[s*.037,-.027,.156],[.011,.026,.01]);
    for(const side of ['R','L']) {
      const s=side==='L'?1:-1,k=side.toLowerCase(),heavy=s>0;
      const sh=joint(k+'Shoulder','shoulder.'+side,torso,s*(heavy?.40:.38),heavy?.38:.36,.02);
      axle(sh,side+' shoulder',0,0,0,heavy?.103:.078,heavy?.194:.14);
      if(heavy) {
        shell(sh,'Pauldron isolator',dark,[[.044,-.102,-.012,.125,.19],[.062,.055,-.028,.204,.245],[.073,.129,-.042,.167,.190]]);
        const shield=shell(sh,'Rust shoulder shield',red,[[.079,-.106,.04,.157,.27],[.099,-.025,.036,.253,.385],[.099,.107,.005,.324,.40],[.084,.193,-.018,.251,.306],[.08,.206,-.018,.213,.244]],chamfer);shield.userData.detach=true;
        rivets(shield,[[-.012,.116,.009],[.104,.178,.008],[.171,.148,.006],[.067,-.057,.008]]);
        axle(sh,'Shield underside',.047,-.075,-.022,.053,.132);
        for(const [i,p] of [[0,[.235,.076,.046]],[1,[.168,-.023,.126]]]) rod(sh,'Shield fastener '+i,dark,p,[p[0]+.006,p[1],p[2]],.009,.009,8);
      } else {
        shell(sh,'Wedge undercut',dark,[[.026,.008,-.006,.204,.106],[-.136,.012,.001,.259,.070],[-.312,-.011,.041,.125,.033]],wedge);
        shell(sh,'Horizontal aero pauldron',armor,[[.043,.061,-.005,.255,.139],[-.08,.066,.013,.355,.158],[-.277,.027,.045,.27,.093],[-.366,.008,.061,.135,.04]],wedge).userData.detach=true;
      }
      rod(sh,side+' humerus',dark,[s*.014,-.045,-.012],[s*.06,-.415,-.013],.046,.037);
      shell(sh,side+' bicep skin',armor,[[s*.026,-.092,.02,.113,.127],[s*.048,-.185,.025,.137,.145],[s*.056,-.323,.019,.102,.116],[s*.059,-.348,.012,.075,.085]]);
      const el=joint(k+'Elbow','elbow.'+side,sh,s*.06,-.46,0);
      axle(el,side+' elbow',0,0,0,heavy?.066:.052,heavy?.15:.112);
      const len=heavy?.62:.42;
      rod(el,side+' forearm spar',dark,[0,-.025,-.012],[0,-len,-.01],heavy?.067:.045,heavy?.048:.032);
      shell(el,heavy?'Swept shield gauntlet':'Pistol vambrace',armor,heavy?[
        [.017,-.022,-.007,.122,.19],[.084,-.14,.025,.213,.269],[.136,-.315,.054,.237,.303],[.105,-.425,.071,.207,.257],[.084,-.479,.072,.193,.234],[.075,-.490,.068,.171,.214]
      ]:[[0,-.034,.02,.10,.127],[.013,-.123,.038,.151,.17],[.016,-.278,.042,.119,.138],[.014,-.397,.028,.075,.103]]);
      if(heavy) shell(el,'Gauntlet return lip',frame,[[.078,-.25,-.074,.097,.057],[.093,-.402,-.042,.084,.070],[.013,-.594,-.018,.057,.053]]);
      if(heavy) {
        const cuff=shell(el,'Gauntlet wrist cuff',armor,[[.070,-.495,.070,.178,.218],[.065,-.512,.076,.184,.220],[.004,-.594,.076,.147,.183],[-.01,-.638,.063,.109,.142]]);rivets(cuff,[[.11,-.522,.006],[.004,-.585,.005]]);
      }
      const wr=joint(k+'Wrist','wrist.'+side,el,heavy?-.016:.014,-len-.02,.045);
      block(wr,side+' palm',frame,[0,-.042,0],[heavy?.144:.081,heavy?.112:.093,heavy?.115:.082]);
      for(let i=0;i<4;i++) {
        const z=(i-1.5)*(heavy?.018:.023);
        const kn=joint(k+'Finger'+i,'digit'+i+'.'+side,wr,heavy?(i-1.5)*.034:-s*.011,heavy?-.091:-.076,z);
        const length=heavy?.092-Math.abs(i-1)*.009:.039;
        rod(kn,side+' proximal '+i,frame,[0,0,0],[-s*.012,-length,0],heavy?.022:.012,heavy?.020:.011,6);
        const tip=joint(k+'Tip'+i,'tip'+i+'.'+side,kn,-s*.012,-length,0);
        rod(tip,side+' fingertip '+i,dark,[0,0,0],[-s*(heavy?.039:.026),-length*.64,.012],heavy?.020:.011,.009,6);
      }
      const thumb=joint(k+'Thumb','thumb.'+side,wr,-s*(heavy?.073:.048),-.024,.033);
      rod(thumb,side+' thumb link',frame,[0,0,0],[-s*(heavy?.063:.043),-.067,.018],.021,.015,7);
      rod(thumb,side+' thumb pad',dark,[-s*(heavy?.063:.043),-.067,.018],[-s*(heavy?.056:.033),heavy?-.127:-.103,.028],.015,.011,7);
      const socket=joint(k+'Socket','socket.'+side,wr,0,-.076,.032);
      if(!heavy&&pistol) {
        const gun=new T.Group();gun.name='Studio sidearm';socket.add(gun);gun.rotation.x=.98;
        block(gun,'Pistol grip',dark,[0,-.012,.012],[.038,.11,.053]);
        shell(gun,'Slide',frame,[[0,.024,-.047,.064,.085],[0,.024,.145,.066,.091],[0,.022,.222,.049,.057]],wedge);
        block(gun,'Muzzle recess',dark,[0,.024,.221],[.029,.029,.012]);
      }
      const hip=joint(k+'Hip','hip.'+side,pelvis,s*.2,-.03,0);
      axle(hip,side+' hip',0,0,0,.076,.143);
      rod(hip,side+' femur',frame,[0,-.032,0],[0,-.552,.008],.056,.049);
      shell(hip,side+' thigh ridge',armor,[[s*.012,-.061,.006,.143,.176],[s*.017,-.109,.028,.225,.230],[s*.024,-.317,.037,.245,.252],[s*.008,-.479,.028,.163,.172],[0,-.538,.005,.105,.14]],hex).rotation.y=s*.15;
      shell(hip,side+' rear thigh plate',frame,[[0,-.096,-.072,.128,.089],[0,-.268,-.084,.149,.095],[0,-.44,-.062,.099,.071]]);
      const kn=joint(k+'Knee','knee.'+side,hip,0,-.60,.01);
      axle(kn,side+' upper knee',0,.012,0,.064,.155);
      axle(kn,side+' lower knee',0,-.06,-.011,.047,.115);
      rod(kn,side+' calf cylinder',frame,[0,-.085,-.034],[0,-.40,-.077],.05,.043);
      rod(kn,side+' calf piston',steel,[0,-.36,-.073],[0,-.675,-.02],.024,.024);
      const shin=shell(kn,side+' shin kite',armor,[[0,-.069,.02,.105,.117],[s*.018,-.125,.043,.190,.194,0,s*.12,.05*s],[s*.028,-.216,.048,.238,.239,0,s*.14,.08*s],[s*.006,-.372,.04,.147,.157,0,s*.08,.10*s],[0,-.559,.035,.083,.104],[0,-.613,.042,.092,.108]]);rivets(shin,[[s*.069,-.173,.006],[s*.057,-.249,.004]]);
      shell(kn,side+' knee cheek',armor,[[s*.063,-.024,-.01,.045,.078],[s*.087,-.133,-.005,.068,.16],[s*.077,-.236,-.002,.044,.114]]);
      shell(kn,side+' calf return plate',armor,[[s*.034,-.158,-.058,.108,.092],[s*.041,-.237,-.088,.127,.134],[s*.027,-.384,-.084,.092,.102],[0,-.471,-.060,.053,.068]]);
      shell(kn,side+' ankle spat',armor,[[0,-.619,.042,.096,.112],[0,-.632,.046,.104,.119],[s*.002,-.694,.058,.109,.139],[s*.003,-.708,.062,.094,.118]]);
      const an=joint(k+'Ankle','ankle.'+side,kn,0,-.74,0);
      axle(an,side+' ankle',0,0,0,.059,.142);
      for(const t of [-1,1]) {
        const x=t*.05;
        shell(an,side+' toe upper '+t,armor,[[x*.64,-.038,-.005,.069,.098],[x,-.054,.097,.090,.099],[x*1.08,-.082,.192,.064,.061]],wedge);
        shell(an,side+' toe cap '+t,dark,[[x*1.08,-.082,.181,.065,.06],[x*1.12,-.099,.237,.062,.049],[x*1.13,-.115,.274,.046,.023]],wedge);
      }
      shell(an,side+' heel spur',dark,[[0,-.065,-.016,.091,.076],[0,-.093,-.10,.103,.073],[0,-.106,-.171,.08,.044]],wedge);
      shell(an,side+' swept heel fin',armor,[[0,-.018,-.055,.056,.091],[0,.053,-.145,.046,.102],[0,.122,-.229,.018,.025]],wedge);
    }
    bakeContacts(root,eye);
    return {root,joints,materials:{armor,rustRed:red,frame,frameDark:dark,optic:eye,steel,stack}};
  };
})(globalThis.HarrierRig,globalThis.THREE);
