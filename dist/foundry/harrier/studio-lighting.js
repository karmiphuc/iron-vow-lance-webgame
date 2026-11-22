(function(H,T) {
  H.lightStudio=function(scene,scale=1) {
    const lights=new T.Group(),floor=new T.Mesh(new T.PlaneGeometry(200,200),new T.ShadowMaterial({opacity:.35}));
    floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;
    const key=new T.DirectionalLight(0xfff8ee,2.4);
    key.position.set(-3,6,4).multiplyScalar(scale);key.castShadow=true;
    Object.assign(key.shadow.camera,{left:-2*scale,right:2*scale,top:3*scale,bottom:-2*scale,near:.25*scale,far:14*scale});
    key.shadow.camera.updateProjectionMatrix();key.shadow.mapSize.set(2048,2048);
    key.shadow.radius=4;key.shadow.bias=-.0004;key.shadow.normalBias=.012*scale;
    const rim=new T.DirectionalLight(0xcbd5e1,1.3);rim.position.set(4,4,-4).multiplyScalar(scale);
    lights.add(key,key.target,rim,rim.target,floor,new T.HemisphereLight(0xdbeafe,0x475569,.85));
    scene.add(lights);scene.background=new T.Color(0x8a8e94).convertSRGBToLinear();
    return {lights,floor,dispose(){scene.remove(lights);floor.geometry.dispose();floor.material.dispose();key.shadow.dispose();}};
  };
})(globalThis.HarrierRig ??= {},globalThis.THREE);
