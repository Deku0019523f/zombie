#!/usr/bin/env python3
"""Convertit un OBJ+MTL (couleurs unies, sans texture) en GLB. Usage: obj2glb.py in.obj out.glb"""
import sys, struct, json, os
def parse_mtl(p):
    mats, cur = {}, None
    if not os.path.exists(p): return mats
    for l in open(p):
        t = l.split()
        if not t: continue
        if t[0]=='newmtl': cur=t[1]; mats[cur]={'kd':[0.8,0.8,0.8],'d':1.0}
        elif cur and t[0]=='Kd': mats[cur]['kd']=[float(x) for x in t[1:4]]
        elif cur and t[0]=='d': mats[cur]['d']=float(t[1])
    return mats
def convert(src, dst):
    mats = parse_mtl(src[:-4]+'.mtl')
    V,N=[],[]; groups={}; cur='default'
    for l in open(src):
        t=l.split()
        if not t: continue
        if t[0]=='v': V.append([float(x) for x in t[1:4]])
        elif t[0]=='vn': N.append([float(x) for x in t[1:4]])
        elif t[0]=='usemtl': cur=t[1]
        elif t[0]=='f':
            idx=[]
            for c in t[1:]:
                p=c.split('/'); idx.append((int(p[0])-1, int(p[2])-1 if len(p)>2 and p[2] else -1))
            for i in range(1,len(idx)-1): groups.setdefault(cur,[]).extend([idx[0],idx[i],idx[i+1]])
    binb=bytearray(); views=[]; accs=[]; prims=[]; materials=[]
    def add(data, fmt, target, ctype, count, typ, mn=None, mx=None):
        off=len(binb); binb.extend(data)
        while len(binb)%4: binb.append(0)
        views.append({'buffer':0,'byteOffset':off,'byteLength':len(data),'target':target})
        a={'bufferView':len(views)-1,'componentType':ctype,'count':count,'type':typ}
        if mn: a['min']=mn; a['max']=mx
        accs.append(a); return len(accs)-1
    for mi,(name,tris) in enumerate(groups.items()):
        pos=[];nor=[]
        for vi,ni in tris:
            pos.append(V[vi]); nor.append(N[ni] if ni>=0 and N else [0,1,0])
        flat=[c for p in pos for c in p]; fn=[c for p in nor for c in p]
        mn=[min(p[k] for p in pos) for k in range(3)]; mx=[max(p[k] for p in pos) for k in range(3)]
        ap=add(struct.pack('<%df'%len(flat),*flat),'f',34962,5126,len(pos),'VEC3',mn,mx)
        an=add(struct.pack('<%df'%len(fn),*fn),'f',34962,5126,len(nor),'VEC3')
        m=mats.get(name,{'kd':[0.8,0.8,0.8],'d':1.0})
        # Kd Blender est linéaire déjà ; on le prend tel quel comme baseColorFactor
        materials.append({'name':name,'pbrMetallicRoughness':{'baseColorFactor':m['kd']+[1.0],'metallicFactor':0.1,'roughnessFactor':0.7}})
        prims.append({'attributes':{'POSITION':ap,'NORMAL':an},'material':len(materials)-1,'mode':4})
    g={'asset':{'version':'2.0','generator':'obj2glb'},'scene':0,'scenes':[{'nodes':[0]}],'nodes':[{'mesh':0,'name':os.path.basename(src)[:-4]}],
       'meshes':[{'primitives':prims}],'materials':materials,'accessors':accs,'bufferViews':views,'buffers':[{'byteLength':len(binb)}]}
    js=json.dumps(g,separators=(',',':')).encode()
    while len(js)%4: js+=b' '
    out=b'glTF'+struct.pack('<II',2,12+8+len(js)+8+len(binb))+struct.pack('<I',len(js))+b'JSON'+js+struct.pack('<I',len(binb))+b'BIN\0'+bytes(binb)
    open(dst,'wb').write(out); return len(out)
if __name__=='__main__': print(convert(sys.argv[1],sys.argv[2]))
