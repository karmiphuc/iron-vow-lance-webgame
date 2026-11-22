(function(H) {
  class MechAnimator {
    constructor(joints) { this.j=joints; this.phase=0; }
    // Gameplay supplies its contact phase and keeps terrain IK in charge of soles.
    update(dt,speed=0,strafe=0,{groundIK=false,phase=null,units=1}={}) {
      const j=this.j, w=Math.min(1,Math.hypot(speed,strafe));
      const direction=(Math.abs(speed)>.001?Math.sign(speed):Math.sign(strafe))||1;
      this.phase=phase??(this.phase+Math.max(0,dt)*(1.8+5.7*w)*direction);
      const s=Math.sin(this.phase),c=Math.cos(this.phase);
      if(!groundIK) {
        j.pelvis.position.x=(-.047*(1-w)-s*.035*w+.022*strafe)*units;
        j.pelvis.position.y=(1.56+Math.abs(c)*.036*w+s*.003*(1-w))*units;
        j.pelvis.rotation.set(0,-.14*(1-w),-.039*(1-w)+s*.04*w);
      }
      j.torso.rotation.set(.16+w*.13+Math.sin(this.phase*2)*.007,.12*(1-w)-s*.09*w,.164*(1-w));
      j.head.rotation.set(-.05-w*.06,.04+s*.025*w,0);
      j.lShoulder.rotation.set(-.06+s*.34*w,-.04,.26+.016*c*w);
      j.rShoulder.rotation.set(.08-s*.14*w-w*.25,.04,-.39);
      j.lElbow.rotation.set(-.16-Math.max(0,-s)*.25*w,0,-.04);
      j.rElbow.rotation.set(-.22-w*.35,0,0);
      if(!groundIK) {
        j.rHip.rotation.set(-.015+s*.42*w,.08,-.112-strafe*.12);
        j.lHip.rotation.set(-.22-s*.42*w,-.1,.204-strafe*.12);
        j.rKnee.rotation.x=.18+Math.max(0,-c)*.48*w;
        j.lKnee.rotation.x=.24+Math.max(0,c)*.48*w;
        for(const k of ['r','l']) {
          const hip=j[k+'Hip'],knee=j[k+'Knee'];
          j[k+'Ankle'].rotation.set(-(hip.rotation.x+knee.rotation.x),0,-hip.rotation.z-j.pelvis.rotation.z);
        }
      }
    }
  }
  H.MechAnimator=MechAnimator;
})(globalThis.HarrierRig ??= {});
