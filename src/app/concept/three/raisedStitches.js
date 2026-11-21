// Trace across the ink rather than applying a striped pattern across a word.
// Only runs when the submitted text changes. Coordinates are in atlas pixels.
import * as THREE from 'three';

export function planStitches(alpha,width,height) {
  const count=width*height, distance=new Float32Array(count);
  for(let i=0;i<count;i++) distance[i]=alpha[i*4+3]>96?1000:0;
  for(let y=1;y<height;y++)for(let x=1;x<width;x++){
    const i=y*width+x;
    distance[i]=Math.min(distance[i],distance[i-1]+1,distance[i-width]+1,distance[i-width-1]+1.414);
  }
  for(let y=height-2;y>=0;y--)for(let x=width-2;x>=0;x--){
    const i=y*width+x;
    distance[i]=Math.min(distance[i],distance[i+1]+1,distance[i+width]+1,distance[i+width+1]+1.414);
  }
  const candidates=[];
  for(let y=2;y<height-2;y+=3)for(let x=2;x<width-2;x+=3){
    const depth=distance[y*width+x];if(depth>1.5)candidates.push([x,y,depth]);
  }
  candidates.sort((a,b)=>b[2]-a[2]);
  const sewn=new Uint8Array(count),paths=[];
  const index=(x,y)=>Math.round(y)*width+Math.round(x);
  for(const [x,y,depth] of candidates){
    if(sewn[index(x,y)])continue;
    // The shortest cross-section through a local ridge follows the width of
    // its pen stroke. Use a small bias on ambiguous, nearly circular serifs.
    let best=null,score=Infinity;
    const reach=(dx,dy)=>{
      let t=1;
      while(t<52 && distance[index(x+dx*t,y+dy*t)]>0)t+=1;
      return t-.55;
    };
    for(let turn=0;turn<16;turn++){
      const angle=(turn+.32)*Math.PI/16,dx=Math.cos(angle),dy=Math.sin(angle);
      const left=reach(-dx,-dy),right=reach(dx,dy);
      const cost=(left+right)*(1+.11*Math.abs(Math.sin(angle-.43)))+.72*Math.abs(left-right);
      if(cost<score){score=cost;best={dx,dy,left,right};}
    }
    const {dx,dy,left,right}=best;
    if(left+right<3)continue;
    const spacing=Math.min(10.3,Math.max(6.5,depth*.15+7.4));
    let taken=0,total=0;
    for(let step=-left;step<=right;step+=1){taken+=sewn[index(x+dx*step,y+dy*step)]||0;total++;}
    if(taken>total*.34)continue;
    const start=[x-dx*left,y-dy*left],end=[x+dx*right,y+dy*right];
    paths.push({start,end,radius:spacing*.47});
    for(let step=-left-.5;step<=right+.5;step+=.8){
      for(let offset=-spacing+.6;offset<spacing;offset+=.9){
        sewn[index(x+dx*step-dy*offset,y+dy*step+dx*offset)]=1;
      }
    }
  }
  return paths;
}

// One merged mesh. Use the projector's clipped triangles as a UV → surface
// lookup: every needle follows the garment, even on the sloping side panel.
export function raisedThreadGeometry(decal,paths,normal) {
  const pos=decal.getAttribute('position'),uv=decal.getAttribute('uv'),norm=decal.getAttribute('normal');
  const triangles=[];
  for(let i=0;i<pos.count;i+=3){
    const u=uv.getX(i),v=uv.getY(i),a=uv.getX(i+1)-u,b=uv.getY(i+1)-v,c=uv.getX(i+2)-u,d=uv.getY(i+2)-v,det=a*d-b*c;
    if(Math.abs(det)>1e-9)triangles.push({i,u,v,a,b,c,d,det});
  }
  function surface(x,y){
    let best=null,highest=-Infinity;
    for(const {i,u,v,a,b,c,d,det} of triangles){
      const U=x/1024-u,V=1-y/256-v,s=(U*d-V*c)/det,t=(V*a-U*b)/det;
      if(s<-.0001 || t<-.0001 || s+t>1.0001)continue;
      const interp=att=>new THREE.Vector3().fromBufferAttribute(att,i).multiplyScalar(1-s-t)
        .addScaledVector(new THREE.Vector3().fromBufferAttribute(att,i+1),s)
        .addScaledVector(new THREE.Vector3().fromBufferAttribute(att,i+2),t);
      const point=interp(pos),z=point.dot(normal);
      if(z>highest){highest=z;best={point,normal:interp(norm).normalize()};}
    }
    return best;
  }
  const positions=[],normals=[],indices=[];
  // Equally distribute geometry across the line(s) when dense writing exceeds
  // the budget. All stitches, including the remainder, still have height maps.
  const limit=Math.min(paths.length,230);
  for(let j=0;j<limit;j++){
    const {start,end,radius}=paths[Math.floor(j*paths.length/limit)];
    const pts=[0,.32,.68,1].map(t=>surface(start[0]+(end[0]-start[0])*t,start[1]+(end[1]-start[1])*t));
    if(pts.some(p=>!p))continue;
    const axis=pts[3].point.clone().sub(pts[0].point).normalize();
    const base=positions.length/3;
    for(let k=0;k<4;k++){
      const belly=k===0||k===3?.24:1, {point,normal:up}=pts[k];
      const sideways=new THREE.Vector3().crossVectors(up,axis).normalize();
      for(const side of [-1,0,1]){
        const p=point.clone().addScaledVector(sideways,side*radius*.00074*belly)
          .addScaledVector(up,.00028+belly*(side===0?.0040:.0015));
        const n=up.clone().addScaledVector(sideways,side*1.25).addScaledVector(axis,k===0?-.42:k===3?.42:0).normalize();
        positions.push(...p.toArray());normals.push(...n.toArray());
      }
    }
    for(let k=0;k<3;k++)for(let s=0;s<2;s++){
      const i=base+3*k+s;indices.push(i,i+3,i+1,i+1,i+3,i+4);
    }
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geo.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
  geo.setIndex(indices);geo.computeBoundingSphere();
  return geo;
}
