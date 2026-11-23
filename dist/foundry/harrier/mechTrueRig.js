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
    armor.flatShading=false; // Individual lofts supply their hard or curved normals.
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
    // Stations list center, full section width/depth and optional pitch/yaw/roll.
    function shell(parent,name,mat,rows,profile=hex) {
      return mesh(parent,name,H.createLoftGeometry(profile,rows.map(([x,y,z,a,b,rx=0,ry=0,rz=0])=>({pos:[x,y,z],scale:[a,b],rot:[rx,ry,rz]}))),mat);
    }
    // Surveyed panel sections can have a raked opening or a clipped corner.
    // Each loop runs around the whole shell, including its return against the frame.
    function folded(parent,name,mat,rings,smoothAlong=false) {
      const stations=rings.map(ring=>({ring,pos:[0,1,2].map(axis=>ring.reduce((sum,p)=>sum+p[axis],0)/ring.length)}));
      return mesh(parent,name,H.createLoftGeometry(null,stations,true,true,smoothAlong),mat);
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
      // The two rails meet at a deep central prow. The upper stations split
      // around a recessed optic bay; their outer edges run back to the shoulders.
      const rails=[
        [[.004,-.035,.354],[.024,-.032,.363],[.049,-.014,.354],[.061,-.015,.308],[.031,-.038,.287],[.004,-.043,.305]],
        [[.004,.067,.411],[.036,.083,.415],[.094,.114,.351],[.097,.055,.276],[.052,.012,.259],[.004,.013,.274]],
        [[.006,.181,.347],[.070,.198,.339],[.219,.232,.184],[.208,.174,.112],[.097,.090,.175],[.006,.099,.216]],
        [[.057,.279,.204],[.136,.309,.170],[.310,.330,.001],[.289,.254,-.076],[.148,.192,-.001],[.056,.193,.088]],
        [[.120,.351,.048],[.194,.388,.008],[.309,.386,-.128],[.282,.311,-.168],[.166,.270,-.112],[.105,.279,-.027]]
      ].map(row=>row.map(([x,y,z])=>[s*x,y,z]));
      const chest=folded(torso,'Chevron breastplate '+s,armor,rails);
      rivets(chest,[[s*.182,.261,.005],[s*.063,.120,.003]]);
      folded(torso,'Keel return '+s,frame,[
        [[s*.004,-.039,.351],[s*.030,-.041,.347],[s*.034,-.043,.290],[s*.004,-.044,.288]],
        [[s*.004,.045,.387],[s*.033,.051,.377],[s*.043,.037,.294],[s*.004,.028,.289]]]);
      // The collar straddles the sensor, leaving a dark notch over the keel.
      shell(torso,'Raised collar rail '+s,armor,[
        [s*.145,.404,-.148,.116,.140],[s*.127,.408,-.067,.124,.143],
        [s*.089,.365,.092,.096,.092],[s*.072,.320,.177,.057,.058]],wedge);
      shell(torso,'Floating rib cover '+s,armor,[
        [s*.207,.235,-.019,.088,.154],[s*.227,.196,.003,.095,.167],
        [s*.206,.131,.031,.076,.124],[s*.177,.112,.039,.038,.079]]);
      shell(pelvis,'Hip clevis cap '+s,armor,[[s*.095,.066,.015,.074,.12],[s*.138,.087,.005,.084,.118],[s*.194,.063,-.016,.067,.093]],wedge);
      shell(torso,'Dorsal flank '+s,armor,[[s*.173,.14,-.10,.115,.20],[s*.204,.32,-.118,.13,.24],[s*.204,.394,-.135,.10,.17]]);
    }
    shell(torso,'Dorsal thruster housing',armor,[[.175,.27,-.16,.18,.18],[.185,.50,-.17,.21,.23],[.19,.62,-.17,.17,.18],[.19,.635,-.17,.14,.15]],wedge);
    block(torso,'Dorsal exhaust',stack,[.185,.53,-.265],[.101,.13,.026]);
    for(let i=0;i<4;i++) block(torso,'Dorsal exhaust vane '+i,frame,[.185,.48+i*.031,-.281],[.102,.012,.019]);
    const head=joint('head','neck',torso,0,.329,.121);
    shell(head,'Sloping dorsal brow',armor,[[0,.089,-.230,.190,.105],[0,.084,-.056,.196,.120],[0,.035,.088,.150,.091],[0,-.002,.164,.105,.055]],wedge);
    block(head,'Optic recess',dark,[0,-.023,.139],[.109,.046,.058]);
    block(head,'Amber optical glass',eye,[0,-.024,.169],[.034,.023,.009]);
    for(const s of [-1,1]) block(head,'Micro vent '+s,frame,[s*.037,-.024,.168],[.011,.026,.01]);
    for(const side of ['R','L']) {
      const s=side==='L'?1:-1,k=side.toLowerCase(),heavy=s>0;
      const sh=joint(k+'Shoulder','shoulder.'+side,torso,s*(heavy?.40:.38),heavy?.38:.36,.02);
      axle(sh,side+' shoulder',0,0,0,heavy?.103:.078,heavy?.194:.14);
      if(heavy) {
        shell(sh,'Pauldron isolator',dark,[[.044,-.096,-.012,.119,.17],[.062,.055,-.028,.204,.245],[.073,.129,-.042,.167,.190]]);
        // A folded shell wraps the front, crown and rear of the rotary drum.
        // The front is one plane and the lower outside corner stays open.
        const front=[[-.077,-.016],[-.061,.128],[.078,.205],[.118,.197],[.213,.093],[.099,-.057],[.014,-.113],[-.043,-.098]];
        const face=front.map(([x,y])=>[x,y,.172-.18*x-.33*y]);
        const back=face.map(([x,y,z])=>[x*.98,y*.98,z-.029]);
        const shield=folded(sh,'Rust shoulder shield',red,[face,back]);
        shield.userData.detach=true;
        const crownFront=[face[1],face[2],face[3],face[4]];
        const crownRear=[[-.057,.158,-.144],[.084,.207,-.162],[.127,.199,-.164],[.215,.089,-.145]];
        const hem=row=>[...row,...row.slice().reverse().map(([x,y,z])=>[x-.003,y-.027,z])];
        folded(sh,'Pauldron crown',red,[hem(crownFront),hem(crownRear)]).userData.detach=true;
        const outerFace=[face[4],face[5],face[6]];
        const outerRear=[[.214,.090,-.145],[.183,.031,-.087],[.103,-.049,.003]];
        const rolled=row=>[...row,...row.slice().reverse().map(([x,y,z])=>[x-.017,y+.001,z-.004])];
        folded(sh,'Pauldron outer return',red,[rolled(outerFace),rolled(outerRear)]).userData.detach=true;
        folded(sh,'Pauldron trailing lip',red,[
          [[.125,.194,-.156],[.214,.091,-.141],[.215,.087,-.166],[.127,.188,-.179]],
          [[.154,-.065,-.140],[.203,-.138,-.122],[.207,-.136,-.149],[.159,-.063,-.165]]
        ]).userData.detach=true;
        shell(sh,'Pauldron bridge',armor,[[.025,.158,-.118,.103,.146],[.021,.234,-.120,.109,.150],[.016,.249,-.119,.088,.123]],wedge);
        rivets(shield,[[-.039,.105,.006],[.071,.178,.006],[.019,-.082,.006]]);
        axle(sh,'Shield underside',.047,-.075,-.022,.053,.132);
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
      if(heavy) {
        // One continuous arc runs past the elbow and ends in a raked wrist opening.
        const arcProfile=[[-.47,.13],[-.27,.46],[.30,.44],[.50,.12],[.45,-.30],[.05,-.47],[-.36,-.39],[-.49,-.12]];
        const sections=Array.from({length:25},(_,i)=>{
          const t=i/24,bow=4*t*(1-t),width=.146+.078*Math.sin(t*Math.PI)-.052*t;
          const cx=.010+.100*bow-.002*t,z=.020+.053*t;
          return arcProfile.map(([u,v])=>{
            const crest=Math.max(0,u+.12)*.205*(1-t)**5;
            const wristCut=.128*(u+.12)*t**5;
            return [cx+u*width,-.034-.592*t+crest-wristCut,z+v*(.178+.084*bow-.041*t)];
          });
        });
        folded(el,'Swept gauntlet guard',armor,sections,true);
        shell(el,'Gauntlet return lip',frame,[[.045,-.16,-.064,.083,.058],[.079,-.36,-.061,.093,.092],[.022,-.58,-.032,.067,.075]]);
      } else {
        shell(el,'Pistol vambrace',armor,[[0,-.034,.02,.090,.120],[.013,-.123,.038,.136,.158],[.016,-.278,.042,.098,.118],[.014,-.375,.028,.064,.088]]);
      }
      const wr=joint(k+'Wrist','wrist.'+side,el,heavy?-.016:.014,-len-.02,.045);
      if(heavy) {
        shell(wr,'Claw metacarpals',frame,[[0,.017,-.006,.089,.10],[.006,-.031,0,.127,.125],[-.013,-.080,.005,.156,.108],[-.019,-.100,.006,.126,.080]]);
        axle(wr,'Claw wrist',0,0,-.004,.035,.099);
      } else block(wr,side+' palm',frame,[0,-.042,0],[.081,.093,.082]);
      for(let i=0;i<4;i++) {
        const z=(i-1.5)*(heavy?.018:.023);
        const kn=joint(k+'Finger'+i,'digit'+i+'.'+side,wr,heavy?-.017+(i-1.5)*.038:-s*.011,heavy?-.091:-.076,z);
        if(heavy)kn.rotation.set(-.28+i*.077,-.17+i*.09,-.17+i*.080);
        const length=heavy?.092-Math.abs(i-1)*.009:.039;
        rod(kn,side+' proximal '+i,frame,[0,0,0],[-s*.012,-length,0],heavy?.022:.012,heavy?.020:.011,6);
        const tip=joint(k+'Tip'+i,'tip'+i+'.'+side,kn,-s*.012,-length,0);
        if(heavy){
          tip.rotation.set(-.38+i*.06,-.13,-.10);
          shell(kn,side+' knuckle plate '+i,frame,[[0,-.004,.004,.043,.043],[-.007,-.020,.006,.040,.046],[-.012,-length+.004,.004,.029,.033]]);
          rod(kn,side+' knuckle pin '+i,steel,[-.020,-.007,0],[.020,-.007,0],.008,.008,10);
        }
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
      const thighProfile=[[-.48,.18],[-.27,.5],[.22,.42],[.50,.20],[.36,-.34],[-.05,-.48],[-.40,-.28]];
      const thigh=[
        [s*.011,-.066,.027,.164,.166],[s*.020,-.112,.029,.199,.204],
        [s*.025,-.347,.038,.190,.195],[s*.007,-.466,.027,.137,.151],[0,-.534,.014,.100,.123]
      ].map(([x,y,z,w,d],i)=>thighProfile.map(([u,v])=>[x+s*u*w,y+s*(s*u)*[.112,.063,.011,-.025,-.054][i],z+v*d]));
      folded(hip,side+' thigh ridge',armor,thigh);
      shell(hip,side+' outer thigh cap',armor,[[s*.083,-.032,-.011,.067,.138],[s*.106,-.093,-.011,.066,.150],[s*.114,-.193,-.028,.044,.090],[s*.11,-.231,-.026,.019,.059]]);
      shell(hip,side+' rear thigh plate',frame,[[0,-.096,-.072,.128,.089],[0,-.268,-.084,.149,.095],[0,-.44,-.062,.099,.071]]);
      const kn=joint(k+'Knee','knee.'+side,hip,0,-.60,.01);
      axle(kn,side+' upper knee',0,.012,0,.064,.155);
      axle(kn,side+' lower knee',0,-.06,-.011,.047,.115);
      rod(kn,side+' calf cylinder',frame,[0,-.085,-.034],[0,-.40,-.063],.05,.043);
      rod(kn,side+' calf piston',steel,[0,-.36,-.073],[0,-.675,-.02],.024,.024);
      const greave=[[-.46,.18],[-.20,.55],[.25,.39],[.50,.10],[.35,-.42],[-.25,-.38]];
      const shinRings=[
        [s*.012,-.089,.038,.144,.135,.11],[s*.019,-.176,.045,.202,.188,.10],
        [s*.020,-.266,.040,.186,.174,.075],[0,-.427,.043,.106,.124,.045],
        [0,-.609,.043,.075,.094,.028]
      ].map(([x,y,z,w,d,cut],i)=>greave.map(([u,v])=>[x+s*u*w,y+(i===0?cut*Math.abs(u)*2:cut*u),z+v*d]));
      const shin=folded(kn,side+' shin blade',armor,shinRings);
      rivets(shin,[[s*.048,-.160,.005],[s*.039,-.218,.004]]);
      shell(kn,side+' calf return plate',armor,[[s*.034,-.158,-.058,.108,.092],[s*.031,-.237,-.068,.115,.113],[s*.027,-.384,-.084,.092,.102],[0,-.471,-.060,.053,.068]]);
      shell(kn,side+' ankle spat',armor,[[0,-.609,.043,.077,.095],[0,-.632,.046,.085,.106],[s*.002,-.694,.058,.109,.139],[s*.003,-.708,.062,.094,.118]]);
      const an=joint(k+'Ankle','ankle.'+side,kn,0,-.74,0);
      axle(an,side+' ankle',0,0,0,.059,.142);
      for(const t of [-1,1]) {
        const x=t*.054;
        shell(an,side+' toe upper '+t,armor,[[x*.64,-.033,-.013,.078,.122],[x*.90,-.046,.072,.103,.128],[x,-.060,.125,.095,.105],[x*1.08,-.082,.196,.074,.070]],wedge);
        shell(an,side+' toe cap '+t,dark,[[x*1.08,-.082,.181,.065,.06],[x*1.12,-.099,.249,.069,.052],[x*1.13,-.115,.294,.051,.025]],wedge);
      }
      shell(an,side+' heel spur',dark,[[0,-.065,-.016,.091,.076],[0,-.093,-.10,.103,.073],[0,-.106,-.171,.08,.044]],wedge);
      shell(an,side+' swept heel fin',frame,[[0,-.018,-.055,.056,.091],[0,.061,-.154,.044,.087],[0,.145,-.245,.017,.022]],wedge);
    }
    bakeContacts(root,eye);
    return {root,joints,materials:{armor,rustRed:red,frame,frameDark:dark,optic:eye,steel,stack}};
  };
})(globalThis.HarrierRig,globalThis.THREE);
