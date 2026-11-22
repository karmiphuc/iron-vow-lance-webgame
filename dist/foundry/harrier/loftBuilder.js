/* Profiles have normalized coordinates. The section plane is perpendicular to the
   principal travel axis so a vertical shin retains real front-to-back depth. */
(function (H, T) {
  H.HEX_ARMOR_PROFILE = [[0, .56], [.44,.34], [.5,-.18], [.3,-.47], [-.30,-.47], [-.5,-.18], [-.44,.34]];
  H.WEDGE_PROFILE = [[-.47,.11], [-.2,.47], [.2,.47], [.5,.08], [.34,-.44], [-.32,-.44]];
  H.createLoftGeometry = function(profile, stations, capStart=true, capEnd=true) {
    const centers = stations.map(st => new T.Vector3(...st.pos));
    const span = centers.at(-1).clone().sub(centers[0]);
    const axis = ['x','y','z'].sort((a,b) => Math.abs(span[b])-Math.abs(span[a]))[0];
    const rings = stations.map(({scale:[a,b]=[1,1],rot=[0,0,0]}, i) => profile.map(([u,v]) => {
      const p = axis==='y' ? new T.Vector3(u*a,0,v*b) : axis==='x' ? new T.Vector3(0,v*b,u*a) : new T.Vector3(u*a,v*b,0);
      return p.applyEuler(new T.Euler(...rot,'YXZ')).add(centers[i]);
    }));
    const interiors=rings.map(ring=>ring.reduce((sum,p)=>sum.add(p),new T.Vector3()).divideScalar(ring.length));
    const vertices=[], uv=[];
    function tri(a,b,c,out,tex) {
      if(b.clone().sub(a).cross(c.clone().sub(a)).dot(out)<0) {
        [b,c]=[c,b]; tex=[tex[0],tex[2],tex[1]];
      }
      for(const p of [a,b,c]) vertices.push(p.x,p.y,p.z);
      uv.push(...tex.flat());
    }
    const n=profile.length, last=rings.length-1;
    for(let i=0;i<last;i++) for(let j=0;j<n;j++) {
      const k=(j+1)%n, a=rings[i][j], b=rings[i][k], c=rings[i+1][k], d=rings[i+1][j];
      const out=a.clone().add(b).add(c).add(d).multiplyScalar(.25).sub(interiors[i].clone().lerp(interiors[i+1],.5));
      const s=j/n,t=(j+1)/n,v=i/last,w=(i+1)/last;
      tri(a,b,c,out,[[s,v],[t,v],[t,w]]);
      tri(a,c,d,out,[[s,v],[t,w],[s,w]]);
    }
    for(const [i,enabled] of [[0,capStart],[last,capEnd]]) if(enabled) {
      const out=centers[i].clone().sub(centers[i===0?1:last-1]);
      for(let j=0;j<n;j++) {
        const k=(j+1)%n;
        tri(interiors[i],rings[i][j],rings[i][k],out,[[.5,.5],profile[j].map(v=>v+.5),profile[k].map(v=>v+.5)]);
      }
    }
    const g=new T.BufferGeometry();
    g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
    g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
    g.computeVertexNormals(); return g;
  };
})(globalThis.HarrierRig ??= {}, globalThis.THREE);
