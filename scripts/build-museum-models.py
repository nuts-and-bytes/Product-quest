"""Build the museum miniatures with Blender 5.3 (-b -P scripts/build-museum-models.py).
Optional MUSEUM_REVIEW_DIR retains editable .blend files; BLENDER_QA_DIR runs qa_check.
Coordinates below use (right, toward visitor, height); sizes are full widths for boxes
and radii for ellipsoids. Geometry colours travel in one shared vertex-colour material.
"""
from pathlib import Path
from math import pi, sin, cos, radians
import os
import sys
import bpy
from mathutils import Vector

OUT = Path(__file__).resolve().parents[1] / "museum" / "models"
REVIEW = os.getenv("MUSEUM_REVIEW_DIR")
parts = []
ink, deep, jade = "243f41", "244d4b", "497e72"
brass, honey, cream = "bb884f", "edbc79", "eee1c0"
wood, walnut = "b47950", "764838"
skin, blush, hair, silver = "f4c29c", "e69a84", "54625e", "98a59b"


def begin():
    global surface
    bpy.ops.wm.read_factory_settings(use_empty=True)
    surface = bpy.data.materials.new("Painted_ceramic")
    surface.use_backface_culling = True
    shader = next(n for n in surface.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    shader.inputs["Roughness"].default_value = .71
    pigment = surface.node_tree.nodes.new("ShaderNodeVertexColor")
    pigment.layer_name = "Pigment"
    surface.node_tree.links.new(pigment.outputs["Color"], shader.inputs["Base Color"])


def at(x, f, z):
    return Vector((x, -f, z))


def paint(obj, color):
    mesh = obj.data
    attr = mesh.color_attributes.new(name="Pigment", type="BYTE_COLOR", domain="CORNER")
    rgb = [int(color[i:i+2], 16)/255 for i in (0, 2, 4)] + [1.]
    for entry in attr.data:
        entry.color_srgb = rgb
    mesh.materials.append(surface)
    parts.append(obj)
    return obj


def box(x, f, z, w, d, h, color, bevel=.018):
    bpy.ops.mesh.primitive_cube_add(size=1, location=at(x, f, z))
    obj = bpy.context.object
    obj.dimensions = (w, d, h)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel and min(w,d,h) > .021:
        edge = obj.modifiers.new("Soft corners", "BEVEL")
        edge.width = min(bevel, min(w, d, h)*.42)
        edge.segments = 2 if bevel > .045 else 1
        bpy.ops.object.modifier_apply(modifier=edge.name)
    return paint(obj, color)


def oval(x, f, z, rx, rf, rz, color, lean=0):
    large = max(rx,rf,rz) > .14
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20 if large else 12, ring_count=12 if large else 7, location=at(x,f,z))
    obj = bpy.context.object
    obj.scale = (rx,rf,rz)
    obj.rotation_euler.y = radians(lean)
    for face in obj.data.polygons:
        face.use_smooth = True
    return paint(obj,color)


def rod(start,end,r,color,r2=None,n=12):
    a,b = at(*start),at(*end)
    bpy.ops.mesh.primitive_cone_add(vertices=n,radius1=r,radius2=r if r2 is None else r2,
                                    depth=(a-b).length,location=(a+b)/2)
    obj = bpy.context.object
    obj.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler()
    return paint(obj,color)


def ring(x,f,z,r,t,color,face=True):
    bpy.ops.mesh.primitive_torus_add(major_segments=28,minor_segments=6,major_radius=r,
                                     minor_radius=t,location=at(x,f,z))
    obj=bpy.context.object
    if face:
        obj.rotation_euler.x=pi/2
    for poly in obj.data.polygons:
        poly.use_smooth=True
    return paint(obj,color)


def join(name,pivot=(0,0,0)):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in parts:
        obj.select_set(True)
    bpy.context.view_layer.objects.active=parts[0]
    bpy.ops.object.join()
    obj=bpy.context.object
    bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
    bpy.context.scene.cursor.location=at(*pivot)
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    obj.name=name
    parts.clear()
    return obj


def attach(child,parent):
    world = child.matrix_world.copy()
    child.parent=parent
    child.matrix_world=world


def stone():
    for side in (-1,1):
        x=side*.165
        oval(x,0,.38,.131,.14,.29,"344b50",side*3)
        oval(x,.063,.142,.148,.197,.137,"774f3e")
        box(x,.061,.056,.295,.382,.087,"cfac80",.038)
        oval(x,.106,.205,.108,.09,.045,"865e49")
    legs=join("Stone")
    oval(0,0,.93,.347,.235,.444,jade)
    oval(0,-.095,1.21,.31,.225,.173,deep)
    oval(0,.017,.665,.285,.19,.086,"375e56")
    oval(0,.209,.832,.189,.03,.115,"3e705f")
    for side in (-1,1):
        oval(side*.306,.005,1.015,.119,.136,.258,jade,-side*16)
    oval(-.347,.06,.803,.091,.09,.106,skin)
    oval(.299,.152,.901,.116,.172,.125,"487567")
    oval(.265,.269,.926,.086,.078,.098,skin)
    # Stoneware cup nestled in his palm, with a glazed lip and dark tea.
    rod((.265,.318,.922),(.265,.318,1.065),.072,cream,.095,24)
    ring(.265,.318,1.068,.088,.011,honey,False)
    oval(.265,.318,1.067,.078,.078,.006,"875933")
    ring(.35,.324,1.002,.044,.012,cream)
    for side in (-1,1):
        rod((side*.056,.166,1.22),(side*.083,.226,1.023+side*.014),.009,cream)
    body=join("Breath",(0,0,.62))
    attach(body,legs)
    oval(0,.004,1.284,.15,.141,.159,skin)
    oval(0,0,1.635,.382,.327,.416,skin)
    for side in (-1,1):
        oval(side*.36,.004,1.603,.087,.069,.115,skin)
        oval(side*.404,.048,1.605,.034,.024,.064,blush)
    # Swept salt-and-pepper pompadour, cut high around the temples.
    oval(0,-.093,1.788,.396,.284,.31,hair)
    for side in (-1,1):
        oval(side*.313,.007,1.736,.078,.178,.201,hair,side*7)
        oval(side*.34,.094,1.698,.036,.074,.099,"839086",side*9)
    for x,f,z,rx,rz,angle,col in [
        (-.21,.135,1.906,.168,.105,-38,"727f74"),
        (-.069,.157,1.979,.217,.117,-23,silver),
        (.128,.108,1.991,.206,.113,-17,"859386"),
        (.255,.045,1.928,.124,.097,24,"748377"),
        (-.105,.232,1.991,.139,.027,-24,"bac0ac"),
    ]:
        oval(x,f,z,rx,.144 if rz>.04 else .067,rz,col,angle)
    for side in (-1,1):
        x=side*.151
        oval(x,.285,1.657,.080,.027,.067,"f5ead6")
        oval(x+.008,.311,1.654,.042,.019,.052,"403f36")
        oval(x-.003,.33,1.679,.014,.009,.015,"fff2cf")
        oval(x,.259,1.798,.086,.032,.023,hair,side*9)
        oval(side*.233,.236,1.554,.059,.014,.022,"dc987f",side*12)
        ring(x,.32,1.658,.123,.012,"b28048")
        rod((side*.265,.315,1.681),(side*.367,.016,1.704),.011,brass)
    rod((-.036,.323,1.688),(.036,.323,1.688),.012,brass)
    oval(0,.32,1.596,.057,.06,.057,"dca17c")
    for side in (-1,1):
        rod((0,.307,1.481),(side*.039,.309,1.487),.010,"955843",.009)
        rod((side*.038,.309,1.487),(side*.074,.304,1.507),.009,"955843",.006)
    head=join("Listening",(0,0,1.265))
    attach(head,body)
    scene=bpy.context.scene
    scene.render.fps=24
    scene.frame_end=97
    for frame,breath,nod,turn in [(1,0,0,-2),(25,.009,-1.3,0),(49,.016,-2,3),
                                  (73,.007,-.7,1),(97,0,0,-2)]:
        body.location.z=.62+breath
        body.keyframe_insert(data_path="location",frame=frame)
        head.rotation_euler.x=radians(nod)
        head.rotation_euler.z=radians(turn)
        head.keyframe_insert(data_path="rotation_euler",frame=frame)
    scene.frame_set(1)


def cabinet():
    # Plinth, framed walnut case, hand-painted panels, bullnose counter.
    box(.48,.02,.082,2.01,.70,.16,walnut,.046)
    box(.48,.018,.505,2.14,.79,.84,wood,.057)
    box(.48,.022,.94,2.23,.87,.084,brass,.026)
    box(.48,.034,1.014,2.27,.95,.098,"dec297",.038)
    for x in (-.239,.48,1.199):
        box(x,.414,.50,.665,.045,.66,walnut,.021)
        box(x,.443,.51,.602,.033,.582,deep,.024)
        box(x,.465,.718,.151,.035,.028,honey,.009)
    for side in (-1,1):
        box(.48+side*1.023,.41,.512,.045,.06,.79,brass)


def lamp():
    x=-.391
    rod((x,-.204,1.048),(x,-.204,1.112),.117,deep,.089)
    rod((x,-.204,1.095),(x,-.204,1.769),.024,brass)
    rod((x,-.204,1.754),(x,.028,1.838),.025,brass)
    rod((x,.027,1.673),(x,.027,1.836),.155,jade,.045,24)
    rod((x,.027,1.655),(x,.027,1.689),.146,"ffe0a0",.151,24)


def workbench():
    cabinet()
    lamp()
    box(.32,-.025,1.122,.77,.31,.141,deep,.05)
    box(.30,-.052,1.475,1.10,.294,.713,"cb9868",.093)
    box(.30,.071,1.451,.923,.073,.562,ink,.038)
    for i in range(5):
        box(.755,.098,1.314+i*.053,.10,.031,.018,walnut,.007)
    box(.264,.291,1.093,.749,.223,.059,deep,.026)
    for row in range(3):
        for i in range(9):
            box(-.026+i*.071,.223+row*.067,1.127,.055,.047,.019,cream if i<8 else honey,.007)
    box(.986,.307,1.084,.67,.21,.051,walnut,.018)
    box(1.154,-.021,1.219,.55,.291,.304,deep,.036)
    for x in (1.012,1.285):
        rod((x,.12,1.233),(x,.161,1.233),.081,brass,n=20)
        rod((x,.157,1.233),(x,.17,1.233),.064,cream,n=20)
        rod((x,.175,1.229),(x+.032,.175,1.259),.006,ink)
    join("Workbench")


def projection():
    cabinet()
    box(.47,-.043,1.187,1.86,.34,.25,walnut,.045)
    box(.46,-.047,1.474,1.882,.343,.918,deep,.065)
    box(.46,.116,1.471,1.66,.052,.71,brass,.033)
    box(.46,.144,1.469,1.59,.028,.641,ink,.021)
    for x in (.0,.91):
        rod((x,-.117,1.83),(x,-.117,2.126),.036,brass)
        rod((x,-.14,2.111),(x,.006,2.111),.226,walnut,n=32)
        ring(x,.011,2.111,.204,.019,honey)
        for j in range(5):
            a=j*2*pi/5
            oval(x+.119*cos(a),.015,2.111+.119*sin(a),.048,.012,.048,ink)
        rod((x,.005,2.111),(x,.044,2.111),.047,brass,n=18)
    for x in (-.375,1.304):
        for i in range(6):
            box(x,.132,1.30+i*.062,.081,.023,.015,honey,.006)
    join("Projection")


for name,builder in (("stone",stone),("workbench",workbench),("projection",projection)):
    begin()
    builder()
    bpy.context.view_layer.update()
    if REVIEW:
        folder=Path(REVIEW).resolve()
        folder.mkdir(parents=True,exist_ok=True)
        bpy.context.preferences.filepaths.save_version=0
        bpy.ops.wm.save_as_mainfile(filepath=str(folder/(name+".blend")))
    if os.getenv("BLENDER_QA_DIR"):
        import json
        sys.path.insert(0,os.environ["BLENDER_QA_DIR"])
        import qa_check
        report=qa_check.run(objects=[o.name for o in bpy.context.scene.objects],profile="game",uv=False,eps=.00015,tol=.007)
        print("MESH REVIEW",name,report["errors"],report["warnings"])
        if REVIEW:
            (folder/(name+".qa.json")).write_text(json.dumps(report,indent=2))
        if not report["pass"]:
            raise RuntimeError(f"{name} failed geometry review: {report['errors']}")
    OUT.mkdir(parents=True,exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=str(OUT/(name+".glb")),export_format="GLB",
                              export_texcoords=False,export_animations=name=="stone",
                              export_animation_mode="SCENE",export_frame_range=True)
