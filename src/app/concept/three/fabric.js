import * as THREE from 'three';

// Close-up jersey: each row has two sloping legs and a short connecting crown.
// Form the loops on the garment, so a rotating camera never moves the grain.
const knitFunctions = /* glsl */ `
  varying vec3 vKnitPosition;
  varying vec2 vKnitUV;
  varying float vClothOcclusion;
  varying float vHoodInside;

  // Both interlocking rows already exist in the scan's colour and normal
  // maps. The chart runs from the hem towards the collar along atlas U.
  vec2 zipperFinish(vec2 uv, float tone) {
    float u=uv.x;
    float centre=.0206+.229*clamp(u-.079,0.,.050)+.096*clamp(u-.129,0.,.032)
      -.079*clamp(u-.167,0.,.057)-.043*clamp(u-.224,0.,.034)
      -.100*clamp(u-.258,0.,.108)-.039*clamp(u-.366,0.,.021)
      +.045*clamp(u-.387,0.,.038);
    float across=abs(uv.y-centre);
    float lengthMask=smoothstep(.079,.084,u)*(1.-smoothstep(.419,.425,u));
    float tape=lengthMask*(1.-smoothstep(.0054,.0085,across));
    // Use the highlights on the original tooth faces. Dark gaps retain the
    // tape finish; mipmapped albedo softens the small facets at a distance.
    float teeth=lengthMask*(1.-smoothstep(.0021,.0039,across))
      *smoothstep(.017,.062,tone);
    return vec2(tape,teeth);
  }

  // The badge-side front is packed a quarter turn from the opposite front.
  // In (across, up) atlas coordinates each visible raglan seam is nearly
  // straight, even where its projection curves around the shoulder.
  vec4 shoulderPanel(vec3 p, vec2 uv, float badgeSide) {
    vec2 panel=mix(uv,uv.yx,badgeSide);
    float slope=mix(.90,.66,badgeSide);
    float seam=panel.y+slope*panel.x-mix(1.115,.519,badgeSide);
    panel.y+=.34*max(seam,0.);
    float rowSlope=-.34*slope/1.34*step(0.,seam);
    float side=abs(p.x+.016);
    float weight=smoothstep(.23,.34,p.y)*(1.-smoothstep(.54,.58,p.y))
      *smoothstep(-.19,-.075,p.z+.14*p.x)
      *smoothstep(.022,.065,side)*(1.-smoothstep(.345,.40,side));
    return vec4(panel,weight,rowSlope);
  }

  float yarnHash(vec2 cell) {
    vec3 h=fract(vec3(cell.xyx)*vec3(.1031,.11369,.13787));
    h+=dot(h,h.yzx+19.19);
    return fract((h.x+h.y)*h.z);
  }

  // Slow differences in yarn tension and twist are shared by neighbouring
  // loops. Interpolate across the row so there are no steps in the bump.
  float yarnVariation(vec2 coord) {
    vec2 cell=floor(coord),t=fract(coord);
    t=t*t*(3.-2.*t);
    return mix(mix(yarnHash(cell),yarnHash(cell+vec2(1,0)),t.x),
               mix(yarnHash(cell+vec2(0,1)),yarnHash(cell+1.),t.x),t.y)-.5;
  }

  // A dragged staple bundle is longer in the direction of the yarn. Average
  // its contrast towards zero once the short axis falls under a screen pixel.
  float fiberTufts(vec2 chart) {
    vec2 width=fwidth(chart);
    float resolved=1.-smoothstep(.26,.78,max(width.x,width.y));
    return yarnVariation(chart)*resolved;
  }

  float jerseyLoops(vec2 course, float fade) {
    // Two rounded legs sit either side of the knitted wale. They separate
    // at the top of the loop and one tucks underneath its neighbour.
    float row=cos(6.2831853*course.y);
    float spread=.21+.09*row;
    float left=.5+.5*cos(6.2831853*(course.x+spread));
    float right=.5+.5*cos(6.2831853*(course.x-spread));
    left*=left;right*=right;
    float crossing=.5+.5*sin(6.2831853*course.y);
    return (left*left*(.50+.50*crossing)+right*right*(1.-.50*crossing)-.40)*1.65*fade;
  }

  float wristBinding(vec3 p, vec2 uv) {
    float right=step(.30,p.x)*step(.88,uv.x)*step(.72,uv.y);
    float left=step(p.x,-.30)*step(.10,uv.x)*step(uv.x,.31)*step(.86,uv.y);
    // The rear of each cuff sits lower on the bent arm. The wider UV island
    // includes plain sleeve cloth above this sloping join.
    float join=-.461+.27*(p.z-mix(.196,.066,right));
    return max(left,right)*smoothstep(-.65,-.60,p.y)*(1.-smoothstep(join-.008,join+.010,p.y));
  }

  // Fit the two elbow-to-wrist centrelines from the section measurements
  // in finish-concept-sleeves. Count a whole number of wales around the arm.
  vec2 forearmCourses(vec3 p) {
    float right=step(0.,p.x);
    float h=clamp(p.y+.055,-.46,0.);
    vec2 bend=mix(vec2(-.115,.395),vec2(.127,.566),right);
    vec2 lean=mix(vec2(-.029,-.210),vec2(.004,-.039),right);
    vec2 centre=mix(vec2(.416,-.033),vec2(.400,-.131),right)+(lean+bend*h)*h;
    vec2 slope=lean+2.*bend*h;
    vec2 radius=vec2(abs(p.x),p.z)-centre;
    float angle=atan(radius.x,.76*radius.y);
    float along=p.y+dot(radius,slope)*inversesqrt(1.+dot(slope,slope));
    return vec2(angle*(124./6.2831853)+.12*sin(34.*along+2.*angle),
                along*216.+.16*sin(5.*angle-11.*along));
  }

  float forearmYarn(vec2 course) {
    float waleWidth=fwidth(course.x);
    float leg=sqrt(.018+.5-.5*cos(6.2831853*course.x));
    float phase=course.y-.61*leg;
    // The loop has a higher frequency across its sloping legs. Retire it
    // before the simpler vertical wale, especially in the grazing view.
    float loopFade=1.-smoothstep(.18,.46,max(fwidth(phase),1.25*waleWidth));
    float waleFade=1.-smoothstep(.20,.45,waleWidth);
    return .66*cos(6.2831853*phase)*loopFade+.18*cos(6.2831853*course.x)*waleFade;
  }

  // One continuous coordinate system across the cut charts at the front waist.
  vec2 hemPanel(vec3 p) {
    float angle=atan(p.x+.01,p.z+.025);
    float front=smoothstep(.024,.042,abs(p.x-.016))*(1.-smoothstep(1.48,1.70,abs(angle)))
      *(1.-smoothstep(.300,.314,abs(p.x)))*smoothstep(-.554,-.538,p.y);
    return vec2(front,angle);
  }

  // Return loop relief and the slower variation in yarn thickness. Filter
  // them separately: on a small screen the latter survives the fine loops.
  vec4 knitSurface(vec3 p, vec4 panel, float hood, float bodyBias, float lining, out float fibers) {
    float across = atan(p.x + .016, p.z + .018) * .205;
    float side=abs(p.x+.016);
    float sleeve=smoothstep(.287,.345,side);
    // Around the sleeve the torso cylinder runs almost parallel to the
    // panel normal. Use the sleeve's own axis and a finer, quieter gauge.
    float armCentre=.369-.067*clamp(p.y,-.65,.35);
    float aroundArm=atan(side-armCentre,p.z+.022)*.104;
    across=mix(across,aroundArm,sleeve);
    // The raised hood crown climbs towards the rear and the bent forearm
    // climbs towards the front. Follow the cut instead of running flat rows
    // round the entire silhouette.
    float armBend=sleeve*(1.-smoothstep(-.30,.04,p.y));
    float courseHeight=p.y+(.095+.31*hood-.25*armBend)*p.z+bodyBias*(abs(p.x)-.18);
    vec2 course=vec2(across*314.,courseHeight*356.)*(1.+.24*sleeve);
    float slub = sin(p.y*126. + 1.5*sin(across*23.)) *
                 sin(across*37. - p.y*46.);
    course.x += .14*sin(p.y*43. + across*29.);
    course.y += .25*sin(across*32. + p.y*13.) + slub*.075;
    float tension=yarnVariation(course*vec2(.19,.085));
    float twist=yarnVariation(course*vec2(.62,.14)+vec2(13.2,8.1));
    course+=vec2(.38*tension,.49*twist);
    // Use a lower frequency for the longer brushed fibers. Smaller staples
    // cross the dominant direction slightly; each footprint filters separately.
    vec2 longYarn=vec2(across,courseHeight+.16*across);
    longYarn.x+=.0008*sin(courseHeight*51.)+.0009*tension;
    fibers=.65*fiberTufts(longYarn*vec2(287.,86.))
           +.35*fiberTufts(vec2(longYarn.x-.21*longYarn.y,longYarn.y)*vec2(661.,174.));
    vec2 footprint = fwidth(course);
    float fade = 1. - smoothstep(.125,.305,max(footprint.x, footprint.y));
    float yarn=jerseyLoops(course,fade)*(1.+.31*twist)*(1.-.60*sleeve);
    // Cuffs occupy their own charts. The front body, pocket welts and the
    // upper sleeve keep the existing projection and yarn response.
    float shellChart=1.-step(mix(.86,.72,step(0.,p.x)),vKnitUV.y);
    float forearm=smoothstep(.31,.35,abs(p.x))*smoothstep(-.54,-.46,p.y)
      *(1.-smoothstep(-.16,-.035,p.y))*shellChart;
    yarn=mix(yarn,forearmYarn(forearmCourses(p)),forearm);
    // Evaluate the second knit only at the shoulder. Cross-fade the two
    // reliefs at their edge; interpolating unrelated UVs would stretch rows.
    vec2 panelCourse=panel.xy*vec2(707.,796.);
    panelCourse+=vec2(.30*tension,.19*sin(panelCourse.x*.032)+.32*twist);
    vec2 panelFootprint=fwidth(panelCourse);
    float panelFade=1.-smoothstep(.125,.305,max(panelFootprint.x,panelFootprint.y));
    // Where the packed chart is too compressed to resolve individual loops,
    // retain the filtered body knit instead of washing the fold smooth.
    float panelMix=.60*panel.z*panelFade;
    if(panelMix>0.) yarn=mix(yarn,jerseyLoops(panelCourse,1.),panelMix);
    // The rib binding is recessed below the front panel edge. These limits
    // follow the seam ray-sampled on the upright sculpture, not a horizontal
    // band through the sleeves, zipper or trousers.
    vec2 hem=hemPanel(p);
    float seam=-.423-.006*(sin(hem.y)*sin(hem.y))+.004*sin(4.*hem.y);
    float binding=hem.x*(1.-smoothstep(seam-.010,seam+.002,p.y));
    // Each wrist has a separate packed chart, turned 90 degrees between
    // the two arms. Select it by both atlas region and anatomical side.
    vec2 uv=vKnitUV;
    float rightWrist=step(.30,p.x)*step(.88,uv.x)*step(.72,uv.y);
    float leftWrist=step(p.x,-.30)*step(.10,uv.x)*step(uv.x,.31)*step(.86,uv.y);
    float cuff=wristBinding(p,uv);
    float cuffAcross=mix(uv.x,uv.y,rightWrist);
    float ribCoord=mix(across*143.,cuffAcross*275.,max(leftWrist,rightWrist))+.08*sin(p.y*57.);
    ribCoord=mix(ribCoord,hem.y*38.+.15*sin(p.y*42.+3.*hem.y),binding);
    float ribWidth=fwidth(ribCoord);
    float ribFade=1.-smoothstep(.12,.28,ribWidth);
    float phase=6.28318*ribCoord;
    // Round the crown of each wale. Drop the finer harmonic first as the
    // cuff recedes, so the broad ribs survive motion without shimmering.
    float rib=.86*cos(phase)*ribFade-.14*cos(2.*phase)*(1.-smoothstep(.10,.25,2.*ribWidth));
    // Each raised rib carries two columns of knit stitches. Their legs meet
    // in a V on the crown and pull back through the softer purl channel.
    float cuffAlong=mix(-uv.y,uv.x,rightWrist);
    vec2 stitch=vec2(ribCoord*2.,cuffAlong*1030.);
    vec2 stitchWidth=fwidth(stitch);
    float resolved=1.-smoothstep(.20,.49,max(stitchWidth.x,stitchWidth.y));
    if (cuff*resolved>0.) {
      float crown=.5+.5*cos(phase);
      rib+=cuff*(.16+.54*crown)*jerseyLoops(stitch,resolved);
    }
    vec2 hemLoop=vec2(ribCoord*2.,p.y*330.);
    float hemFilter=1.-smoothstep(.20,.48,max(fwidth(hemLoop.x),fwidth(hemLoop.y)));
    if(binding*hemFilter>0.)rib+=.38*binding*jerseyLoops(hemLoop,hemFilter);
    binding=max(binding,cuff);
    float slubFade=1.-smoothstep(.026,.07,fwidth(p.y)+fwidth(across));
    // The facing exposes short crosswise purl crowns. Lay them around the
    // turning collar with a coarser pitch than the lengthwise outer wales.
    vec2 turn=vec2(atan(p.x-.002,p.z+.048)*.20,p.y+.30*p.z-.47*length(p.xz-vec2(.002,-.048)));
    vec2 purl=turn*vec2(138.,164.);
    purl+=vec2(.39*yarnVariation(purl*vec2(.26,.45)),.46*yarnVariation(purl*vec2(.54,.23)));
    float arch=cos(6.2831853*purl.x),phaseY=purl.y+.18*arch;
    float purlFade=1.-smoothstep(.16,.44,max(fwidth(purl.x),fwidth(phaseY)));
    float crown=.5+.5*cos(6.2831853*phaseY);
    float purlRelief=(crown*crown*(.70+.26*arch)-.26)*purlFade;
    yarn=mix(yarn,.38*yarn+1.25*purlRelief,lining);
    return vec4(mix(yarn,rib+.22*yarn,binding),(.30*slub+.95*tension)*slubFade,binding,armBend);
  }
`;

export function cottonMaterial(source) {
  const material = new THREE.MeshPhysicalMaterial();
  THREE.MeshStandardMaterial.prototype.copy.call(material, source);
  material.metalness=0; material.metalnessMap=null;
  material.roughness=1; // Existing ORM retains the different finish of each panel.
  material.normalScale.set(.31,.31);
  material.clearcoat=0; material.specularIntensity=.78;
  material.sheen=.47; material.sheenRoughness=.60; material.sheenColor.set('#858680');
  material.anisotropy=.34;
  material.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
      attribute float _cloth_ao;
      varying vec3 vKnitPosition;
      varying vec2 vKnitUV;
      varying float vClothOcclusion;
      varying float vHoodInside;
    `).replace('#include <begin_vertex>',`#include <begin_vertex>
      vKnitPosition=position;
      vKnitUV=uv;
      vClothOcclusion=_cloth_ao;
      vec2 radial=position.xz-vec2(.002,-.048);
      // The visible lining turns towards the neck inside the collar roll.
      float inner=-dot(normal.xz,radial)/max(.06,length(radial));
      vHoodInside=smoothstep(-.12,.61,inner)*smoothstep(.395,.47,position.y)
        *(1.-smoothstep(.57,.605,position.y))*smoothstep(.09,.13,length(radial));
    `);
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\n'+knitFunctions)
      .replace('#include <map_fragment>',`#include <map_fragment>
        float tone=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));
        float waist=hemPanel(vKnitPosition).x*(1.-smoothstep(-.402,-.363,vKnitPosition.y));
        vec2 zipper=zipperFinish(vKnitUV,tone)*(1.-waist);
        float cottonMask=1.-smoothstep(.22,.48,max(max(diffuseColor.r,diffuseColor.g),diffuseColor.b));
        cottonMask=max(cottonMask,waist)*(1.-zipper.x);
        float badgeSide=1.-step(.45,vKnitUV.y);
        vec4 panel=shoulderPanel(vKnitPosition,vKnitUV,badgeSide);
        float facing=max(1.-smoothstep(-.09,.015,vKnitPosition.x),1.-smoothstep(-.15,-.08,vKnitPosition.z));
        float hood=facing*smoothstep(.39,.48,vKnitPosition.y)*(1.-smoothstep(.57,.60,vKnitPosition.y));
        // Lower front cloth pulls towards each pocket mouth. Fade the small
        // bias out before the binding, armhole and chest label.
        float flank=abs(vKnitPosition.x);
        float bodyBias=.24*smoothstep(.07,.17,flank)*(1.-smoothstep(.26,.32,flank))
          *smoothstep(-.43,-.29,vKnitPosition.y)*(1.-smoothstep(.01,.16,vKnitPosition.y))
          *smoothstep(.03,.11,vKnitPosition.z);
        float fibers;
        float lining=vHoodInside*cottonMask;
        vec4 knit=knitSurface(vKnitPosition,panel,hood,bodyBias,lining,fibers);
        float clothFiber=cottonMask*(1.-smoothstep(.565,.605,vKnitPosition.y));
        // The sleeve shell ends at two separate cuff charts. Leave the
        // ribbing and the adjacent pocket panels on their own finishes.
        float cuffChart=max(step(.32,vKnitPosition.x)*step(.82,vKnitUV.x)*step(.77,vKnitUV.y),
          step(vKnitPosition.x,-.32)*step(.86,vKnitUV.y)*step(vKnitUV.x,.31)*step(.10,vKnitUV.x));
        float sleeveShell=smoothstep(.31,.355,flank)*smoothstep(-.54,-.47,vKnitPosition.y)
          *(1.-smoothstep(.18,.31,vKnitPosition.y))*(1.-cuffChart)*cottonMask;
        float wrist=wristBinding(vKnitPosition,vKnitUV)*cottonMask;
        // Suppress the baked-in lit patches a little; the large folds should
        // acquire their light from the shape as the orbit moves.
        float shellTone=mix(tone,.024,.24*sleeveShell);
        shellTone=mix(shellTone,.021,.98*waist);
        // A cool charcoal dye balances the warm studio reflection on the
        // jacket. Taper it out below the ribbed hem where the trousers begin.
        vec3 graphiteDye=mix(vec3(1.),vec3(.80,1.015,1.32),smoothstep(-.57,-.536,vKnitPosition.y));
        vec3 cottonColor=graphiteDye*vec3(.84,.85,.83)*mix(shellTone,.043,.14);
        diffuseColor.rgb=mix(diffuseColor.rgb,cottonColor*(1.+mix(.078,.14,knit.z)*knit.x+.047*knit.y),cottonMask);
        diffuseColor.rgb*=1.+fibers*(.060*clothFiber+.11*lining);
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.003)+.83*diffuseColor.rgb,zipper.x);
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.032)+1.24*diffuseColor.rgb,zipper.y);
      `)
      .replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
        float reliefGloss=(.038+.050*knit.z)*knit.x+.037*knit.y;
        // The brushed hood facing has a softer reflection than the outer
        // shell. Rib tops catch the rake, with a wider lobe in their valleys.
        roughnessFactor=clamp(mix(.28,.59,roughnessFactor)+(.037*hood+.018*knit.z-reliefGloss)*cottonMask,.28,.64);
        roughnessFactor=mix(roughnessFactor,.61-.036*knit.x,.70*sleeveShell);
        roughnessFactor=mix(roughnessFactor,.57-.074*knit.x,.74*wrist);
        roughnessFactor=mix(roughnessFactor,.54-.047*knit.x,waist);
        roughnessFactor=mix(roughnessFactor,.61,.52*lining);
        roughnessFactor=clamp(roughnessFactor-(.034*clothFiber+.054*lining)*fibers,.25,1.);
        roughnessFactor=mix(roughnessFactor,.67,zipper.x);
        roughnessFactor=mix(roughnessFactor,.32,zipper.y);
      `)
      .replace('#include <metalnessmap_fragment>',`#include <metalnessmap_fragment>
        metalnessFactor=mix(metalnessFactor,.63,zipper.y);
      `)
      .replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
        normal=normalize(normal+(normal-nonPerturbedNormal)*(.80*zipper.y-.40*sleeveShell));
        normal=normalize(mix(normal,nonPerturbedNormal,.98*waist));
        // Differentiate the yarn height over the view-space surface area.
        // Its physical relief stays consistent during the close approach.
        vec3 sx=dFdx(-vViewPosition), sy=dFdy(-vViewPosition);
        vec3 rx=cross(sy,normal), ry=cross(normal,sx);
        float determinant=dot(sx,rx)*faceDirection;
        float height=knit.x*(mix(.00019,.00023,knit.z)+.00016*lining)+fibers*(.00012+.00034*lining);
        vec3 grad=sign(determinant)*(dFdx(height)*rx+dFdy(height)*ry);
        normal=normalize(normal-grad*(cottonMask/max(abs(determinant),1.e-9)));
      `)
      .replace('#include <lights_physical_fragment>',`#include <lights_physical_fragment>
        #ifdef USE_SHEEN
          float fiberCrown=clamp(.48+.35*knit.x+.66*fibers,0.,1.);
          material.sheenColor*=mix(vec3(1.),graphiteDye,clothFiber);
          material.sheenColor*=1.+clothFiber*(-.15+.52*fiberCrown)+.64*lining;
          material.sheenColor*=1.-.70*zipper.x;
          material.sheenRoughness=mix(material.sheenRoughness,.52+.18*lining-.10*fibers,clothFiber);
        #endif
        #ifdef USE_ANISOTROPY
          // The atlas rotates its islands to pack them. Align the elongated
          // reflection to the courses on the sculpture instead of atlas U.
          vec3 garmentUp=viewMatrix[1].xyz+(.40*hood-.25*knit.w)*viewMatrix[2].xyz
            +bodyBias*sign(vKnitPosition.x)*viewMatrix[0].xyz;
          vec3 courseAxis=cross(garmentUp,normal);
          if(panel.z>0.) {
            vec3 acrossPanel=mix(tbn[0],tbn[1],badgeSide);
            vec3 upPanel=mix(tbn[1],tbn[0],badgeSide);
            vec3 row=acrossPanel+panel.w*upPanel;
            row-=normal*dot(row,normal);
            if(dot(row,courseAxis)<0.) row=-row;
            // Atlas distortion on tight fold triangles can swing the highlight.
            // Blend with the broader course direction to keep the lobe continuous.
            courseAxis=mix(courseAxis,row,.52*panel.z);
          }
          // Raised loops have more aligned specular scatter. The brushed
          // lining breaks it up across directions through the folded collar.
          float aligned=.40+.12*knit.x+.16*fibers;
          material.anisotropy=mix(material.anisotropy,mix(aligned,.17,lining),clothFiber);
          material.alphaT=mix(pow2(material.roughness),1.,pow2(material.anisotropy));
          float axisLength=dot(courseAxis,courseAxis);
          if(axisLength>.015) {
            material.anisotropyT=courseAxis*inversesqrt(axisLength);
            material.anisotropyB=cross(normal,material.anisotropyT);
          }
        #endif
      `)
      .replace('#include <aomap_fragment>',`#include <aomap_fragment>
        // Zero is exposed (also the WebGL default for an absent attribute).
        reflectedLight.indirectDiffuse*=1.-.33*vClothOcclusion;
        reflectedLight.indirectSpecular*=1.-.15*vClothOcclusion;
        #ifdef USE_SHEEN
          sheenSpecularIndirect*=1.-.15*vClothOcclusion;
        #endif
      `);
  };
  material.customProgramCacheKey=()=> 'ikikae-jersey-pile-v18';
  return material;
}
