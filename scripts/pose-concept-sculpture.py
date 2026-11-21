"""Offline temporary rig. Run in Blender; never ships skeletons to the browser."""
import bpy, math, os
from mathutils import Vector, Quaternion
root=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=root+'/artifacts/hoodie-study/hoodie-source.glb')
mesh=next(o for o in bpy.context.scene.objects if o.type=='MESH')
bpy.context.view_layer.objects.active=mesh
mesh.select_set(True)
bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
rest=mesh.data.attributes.new('_REST_POSITION','FLOAT_VECTOR','POINT')
for v in mesh.data.vertices:rest.data[v.index].vector=(v.co.x,v.co.z,-v.co.y)
bpy.ops.object.armature_add()
rig=bpy.context.object;rig.name='Temporary sculpture posing rig'
bpy.ops.object.mode_set(mode='EDIT');rig.data.edit_bones.remove(rig.data.edit_bones[0])
for name,head,tail,parent in [('pelvis',(0,0,-.9),(0,0,-.48),None),('torso',(0,0,-.48),(0,0,.45),'pelvis'),('head',(0,0,.46),(0,0,.85),'torso'),('right_forearm',(-.43,0,-.20),(-.44,0,-.65),'torso')]:
 b=rig.data.edit_bones.new(name);b.head=head;b.tail=tail
 if parent:b.parent=rig.data.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT')
def ramp(v,a,b):
 t=max(0,min(1,(v-a)/(b-a)));return t*t*(3-2*t)
groups={n:mesh.vertex_groups.new(name=n) for n in ['pelvis','torso','head','right_forearm']}
for v in mesh.data.vertices:
 x,y,z=v.co
 body=ramp(z,-.75,-.40)
 head=ramp(z,.40,.59)*body
 arm=ramp(-x,.29,.38)*(1-ramp(z,-.27,-.13))*body
 for name,w in [('pelvis',1-body),('torso',body-head-arm),('head',head),('right_forearm',arm)]:
  if w>0:groups[name].add([v.index],w,'REPLACE')
mod=mesh.modifiers.new('Offline pose','ARMATURE');mod.object=rig;mod.use_deform_preserve_volume=True
for name,axis,angle in [('torso',(0,0,1),8),('head',(0,0,1),-8),('right_forearm',(1,0,0),-12)]:
 b=rig.pose.bones[name];b.rotation_mode='QUATERNION';local=b.bone.matrix_local.to_3x3().inverted()@Vector(axis);b.rotation_quaternion=Quaternion(local,math.radians(angle))
b=rig.pose.bones['torso'];axis=b.bone.matrix_local.to_3x3().inverted()@Vector((0,1,0));b.rotation_quaternion=Quaternion(axis,math.radians(-3))@b.rotation_quaternion
bpy.context.view_layer.update()
bpy.ops.wm.save_as_mainfile(filepath=root+'/artifacts/hoodie-study/sculpture-pose.blend')
bpy.ops.object.select_all(action='DESELECT');mesh.select_set(True);bpy.context.view_layer.objects.active=mesh
bpy.ops.object.modifier_apply(modifier=mod.name)
bpy.ops.export_scene.gltf(filepath=root+'/artifacts/hoodie-study/hoodie-posed-source.glb',export_format='GLB',use_selection=True,export_attributes=True,export_animations=False,export_skins=False)
print('POSE_BAKED',len(mesh.data.polygons))
