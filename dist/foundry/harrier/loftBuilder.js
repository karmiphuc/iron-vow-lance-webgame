/* Profiles have normalized coordinates. The section plane is perpendicular to the
   principal travel axis so a vertical shin retains real front-to-back depth. */
(function (H, T) {
  H.HEX_ARMOR_PROFILE = [[0, .56], [.44,.34], [.5,-.18], [.3,-.47], [-.30,-.47], [-.5,-.18], [-.44,.34]];
  H.WEDGE_PROFILE = [[-.47,.11], [-.2,.47], [.2,.47], [.5,.08], [.34,-.44], [-.32,-.44]];
  H.createLoftGeometry = function(profile, stations, capStart=true, capEnd=true, smoothAlong=false) {
    const centers = stations.map(st => new T.Vector3(...st.pos));
    const span = centers.at(-1).clone().sub(centers[0]);
    const axis = ['x','y','z'].sort((a,b) => Math.abs(span[b])-Math.abs(span[a]))[0];
    const rings = stations.map(({ring,scale:[a,b]=[1,1],rot=[0,0,0]}, i) => ring ? ring.map(p=>new T.Vector3(...p)) : profile.map(([u,v]) => {
      const p = axis==='y' ? new T.Vector3(u*a,0,v*b) : axis==='x' ? new T.Vector3(0,v*b,u*a) : new T.Vector3(u*a,v*b,0);
      return p.applyEuler(new T.Euler(...rot,'YXZ')).add(centers[i]);
    }));
    const interiors=rings.map(ring=>ring.reduce((sum,p)=>sum.add(p),new T.Vector3()).divideScalar(ring.length));
    const vertices=[], uv=[], normals=[];
    function tri(a,b,c,out,tex,shading) {
      if(b.clone().sub(a).cross(c.clone().sub(a)).dot(out)<0) {
        [b,c]=[c,b]; tex=[tex[0],tex[2],tex[1]];
        if(shading)shading=[shading[0],shading[2],shading[1]];
      }
      for(const p of [a,b,c]) vertices.push(p.x,p.y,p.z);
      if(smoothAlong){
        const face=b.clone().sub(a).cross(c.clone().sub(a)).normalize();
        for(const n of shading||[face,face,face])normals.push(n.x,n.y,n.z);
      }
      uv.push(...tex.flat());
    }
    const n=rings[0].length, last=rings.length-1;
    // Average only along a curved sheet. Adjacent longitudinal facets keep a crease.
    function stripNormal(i,j) {
      const k=(j+1)%n,lo=Math.max(0,i-1),hi=Math.min(last,i+1);
      const across=rings[i][k].clone().sub(rings[i][j]);
      const tangent=rings[hi][j].clone().add(rings[hi][k]).sub(rings[lo][j]).sub(rings[lo][k]);
      const normal=across.cross(tangent).normalize();
      const outward=rings[i][j].clone().lerp(rings[i][k],.5).sub(interiors[i]);
      return normal.dot(outward)<0?normal.negate():normal;
    }
    for(let i=0;i<last;i++) for(let j=0;j<n;j++) {
      const k=(j+1)%n, a=rings[i][j], b=rings[i][k], c=rings[i+1][k], d=rings[i+1][j];
      const out=a.clone().add(b).add(c).add(d).multiplyScalar(.25).sub(interiors[i].clone().lerp(interiors[i+1],.5));
      const s=j/n,t=(j+1)/n,v=i/last,w=(i+1)/last;
      const start=smoothAlong&&stripNormal(i,j),end=smoothAlong&&stripNormal(i+1,j);
      tri(a,b,c,out,[[s,v],[t,v],[t,w]],smoothAlong&&[start,start,end]);
      tri(a,c,d,out,[[s,v],[t,w],[s,w]],smoothAlong&&[start,end,end]);
    }
    for(const [i,enabled] of [[0,capStart],[last,capEnd]]) if(enabled) {
      const out=centers[i].clone().sub(centers[i===0?1:last-1]);
      for(let j=0;j<n;j++) {
        const k=(j+1)%n;
        tri(interiors[i],rings[i][j],rings[i][k],out,[[.5,.5],[.5+.5*Math.cos(j/n*2*Math.PI),.5+.5*Math.sin(j/n*2*Math.PI)],[.5+.5*Math.cos(k/n*2*Math.PI),.5+.5*Math.sin(k/n*2*Math.PI)]]);
      }
    }
    const g=new T.BufferGeometry();
    g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
    g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
    if(smoothAlong)g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));
    else g.computeVertexNormals();
    return g;
  };
})(globalThis.HarrierRig ??= {}, globalThis.THREE);
