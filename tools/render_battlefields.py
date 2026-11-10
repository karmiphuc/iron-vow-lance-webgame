"""Render the three original 18x20 battlefield ground textures.

Python, Pillow and NumPy. Columns map to world X in [-3.5,20.5], rows
map to world Z in [-3.5,22.5]. The 3-unit apron fades outside the board.
Cover foundations read dist/theater-layouts.js, the same layout used by runtime.
"""
from pathlib import Path
from random import Random
from math import sin, cos, tau, hypot
import json

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'dist' / 'assets'
UNIT = 96
BOARD_W, BOARD_H = 18, 20
WORLD_W, WORLD_H = 24, 26
WIDTH, HEIGHT = WORLD_W * UNIT, WORLD_H * UNIT
START = -3.5
END_X, END_Z = START + WORLD_W, START + WORLD_H
X, Z = np.meshgrid(np.arange(WIDTH, dtype=np.float32) / UNIT + START,
                   np.arange(HEIGHT, dtype=np.float32) / UNIT + START)
FONT = ImageFont.load_default(size=38)
SMALL_FONT = ImageFont.load_default(size=22)
LAYOUTS = json.loads((ROOT / 'dist' / 'theater-layouts.js').read_text().split('window.IRON_VOW_THEATERS =', 1)[1].strip().rstrip(';'))


def noise(rng, frequency):
    grid = rng.integers(0, 255, (round(frequency * WORLD_H / WORLD_W), frequency), dtype=np.uint8)
    up = Image.fromarray(grid).resize((WIDTH, HEIGHT), Image.Resampling.BICUBIC)
    return np.asarray(up, dtype=np.float32) / 127.5 - 1


def scene(seed, colors, terrain):
    rng = np.random.default_rng(seed)
    broad, ground, gravel = (noise(rng, f) for f in (25, 91, 660))
    grain = rng.normal(0, 1.25, (HEIGHT, WIDTH)).astype(np.float32)
    relief = (np.roll(ground, 5, 0) - ground) * 16 + (np.roll(ground, 3, 1) - ground) * 11
    variation = broad * 13 + ground * 8 + gravel * 4 + grain + relief
    colors = np.array(colors, dtype=np.float32)
    image = colors[0] + variation[:, :, None]
    for weight, color in terrain(broad, ground):
        weight = np.clip(weight, 0, 1)[:, :, None]
        image = image * (1-weight) + (colors[color] + variation[:, :, None] * .63) * weight
    return Image.fromarray(np.clip(image, 0, 255).astype(np.uint8))


def xy(x, z):
    return round((x-START) * UNIT), round((z-START) * UNIT)


def line(draw, points, ink, width=.02):
    draw.line([xy(x, z) for x, z in points], fill=ink, width=max(1, round(width * UNIT)), joint='curve')


def poly(draw, points, ink):
    draw.polygon([xy(x, z) for x, z in points], fill=ink)


def rect(draw, x, z, w, h, ink, outline=None):
    draw.rectangle([xy(x, z), xy(x+w, z+h)], fill=ink, outline=outline)


def circle(draw, x, z, radius, fill=None, outline=None, width=.02):
    draw.ellipse([xy(x-radius, z-radius), xy(x+radius, z+radius)], fill=fill,
                 outline=outline, width=max(1, round(width*UNIT)))


def dash(draw, a, b, ink, width=.025, length=.26, gap=.28):
    dx, dz = b[0]-a[0], b[1]-a[1]
    distance = hypot(dx, dz)
    for offset in np.arange(0, distance, length+gap):
        end = min(distance, offset+length)
        line(draw, [(a[0]+dx*offset/distance, a[1]+dz*offset/distance),
                    (a[0]+dx*end/distance, a[1]+dz*end/distance)], ink, width)


def label(draw, x, z, text, ink=(216,211,181,125), small=False):
    draw.text(xy(x,z), text, font=SMALL_FONT if small else FONT, anchor='mm', fill=ink)


def stencilled_grid(draw, seed, opacity):
    rng = Random(seed)
    for _ in range(190):
        x, z = rng.randint(-2, BOARD_W+1)+.5, rng.randint(-2, BOARD_H+1)+.5
        width = rng.uniform(.12, .31)
        line(draw, [(x-width,z),(x,z),(x,z+width)], (207,211,185,opacity))
    for x,z,sx,sz in [(-.5,-.5,1,1),(17.5,-.5,-1,1),(-.5,19.5,1,-1),(17.5,19.5,-1,-1)]:
        line(draw,[(x+sx*.48,z),(x,z),(x,z+sz*.48)],(216,211,181,120),.036)


def scatter(draw, seed, colors, amount, active=lambda x,z: True):
    rng = Random(seed)
    for _ in range(amount):
        x, z = rng.uniform(START,END_X), rng.uniform(START,END_Z)
        if not active(x,z):
            continue
        length = rng.uniform(.018,.115)
        rise = rng.uniform(.015,length*.6+.015)
        shadow, light = rng.choice(colors)
        poly(draw,[(x-length,z+rise*.2),(x-length*.18,z-rise*.5),
                   (x+length*.65,z-rise*.12),(x+length,z+rise*.77),(x,z+rise)],shadow)
        line(draw,[(x-length*.7,z+rise*.02),(x-length*.18,z-rise*.5),
                   (x+length*.45,z-rise*.14)],light,.013)


def foundations(draw, index):
    """Flat ground treatment aligned with the 24 real runtime cover props."""
    for key, kind in LAYOUTS[index]['cover'].items():
        x,z = map(int,key.split(','))
        if kind in ('relay-shield','cargo','transformer','bunker'):
            tones = {'relay-shield':(100,102,85,95),'cargo':(117,108,86,85),
                     'transformer':(68,76,77,120),'bunker':(113,133,132,108)}
            rect(draw,x-.47,z-.43,.94,.86,tones[kind],(180,176,145,66))
            for dx,dz in [(-.41,-.37),(.41,-.37),(-.41,.37),(.41,.37)]:
                circle(draw,x+dx,z+dz,.035,fill=(31,40,42,130))
        else:
            circle(draw,x,z,.43,fill=(42,50,43,42) if kind=='conifer' else (57,61,52,49))
            rng = Random(x*611+z*43+index)
            for _ in range(8):
                a=rng.random()*tau;r=rng.uniform(.25,.52)
                circle(draw,x+r*cos(a),z+r*sin(a),rng.uniform(.018,.05),fill=(145,146,118,67))


def relay_pad(draw,x,z,radius,code):
    circle(draw,x,z,radius,fill=(116,116,97,75),outline=(211,201,162,116),width=.040)
    circle(draw,x,z,radius-.12,outline=(39,48,44,138),width=.030)
    for i in range(16):
        a=i*tau/16
        line(draw,[(x+r*cos(a),z+r*sin(a)) for r in (radius-.24,radius-.04)],(221,211,174,132),.040)
    line(draw,[(x-radius+.22,z),(x+radius-.22,z)],(38,47,43,50),.025)
    line(draw,[(x,z-radius+.22),(x,z+radius-.22)],(38,47,43,50),.025)
    label(draw,x,z,code)


def relay():
    def terrain(broad, detail):
        cross_lane=np.abs(Z-14.6+.62*np.sin(X*.28))
        approach=np.abs(X-(2.1+(18-Z)*.68)) / 1.21
        pad=np.hypot(X-10,Z-6)
        gully=np.abs(Z-9.0-.85*np.sin(X*.38))
        branch=np.abs(Z-2.8+.48*np.sin(X*.57))
        dry=np.maximum((.62-cross_lane+detail*.10)*6,(.65-approach+detail*.10)*6)
        dry=np.maximum(dry,(2.08-pad+detail*.09)*7)
        return [(broad*.58+.34,1),((.29-gully+detail*.13)*4,2),
                ((.17-branch+detail*.10)*3,2),(dry,3)]
    image=scene(52,[(80,77,63),(84,89,68),(51,62,60),(102,102,88)],terrain)
    d=ImageDraw.Draw(image,'RGBA')
    scatter(d,4,[((30,31,27,100),(174,161,127,105)),((39,47,39,95),(135,140,105,96))],
            6500,lambda x,z:abs(z-14.6+.62*sin(x*.28))>.52 and abs(x-(2.1+(18-z)*.68))>.73 and hypot(x-10,z-6)>2)
    cross=[(x,14.6-.62*sin(x*.28)) for x in np.arange(START,END_X,.10)]
    approach=[(2.1+(18-z)*.68,z) for z in np.arange(START,END_Z,.10)]
    for path,axis in [(cross,'z'),(approach,'x')]:
        for side in [-1,1]:
            line(d,[(x+side*.31*(axis=='x'),z+side*.31*(axis=='z')) for x,z in path],(29,38,34,64),.055)
            line(d,[(x+side*.50*(axis=='x'),z+side*.50*(axis=='z')) for x,z in path],(197,188,143,58),.016)
    relay_pad(d,10,6,1.90,'K-07')
    relay_pad(d,15,14,1.09,'AUX / 2')
    relay_pad(d,3,9.7,.92,'LINK')
    # Buried power-conduit maintenance strip connects the two remote installations.
    conduit=[(11.45,7.4),(13.1,9.7),(14.9,11.2),(15,12.8)]
    line(d,conduit,(43,52,47,91),.12)
    for dx in [-.13,.13]:line(d,[(x+dx,z) for x,z in conduit],(161,159,117,65),.025)
    # Dry basalt shelves are low relief, not new movement blockers.
    for cx,cz in [(3.4,2.0),(2.7,6.7),(7.5,11),(11.5,14),(16,10.5),(14,17)]:
        for k in range(3):
            line(d,[(cx-1.1,cz-.18+k*.14),(cx-.4,cz-.35+k*.12),(cx+.45,cz-.15+k*.12),(cx+1.0,cz+.08+k*.15)],(33,43,39,42),.045)
    for x,z in [(1.2,4.1),(6,8.0),(14.1,1.3),(16.8,17.6),(10.1,18.2),(-1.1,11.5)]:
        circle(d,x,z,.34,outline=(31,40,41,102),width=.055)
        circle(d,x+.06,z-.03,.22,fill=(53,65,62,100),outline=(135,143,114,80))
    foundations(d,0);stencilled_grid(d,34,40)
    label(d,6.0,18.6,'RELAY APPROACH',small=True,ink=(205,199,159,90))
    return image


def loading_bay(draw,x,z,w,h,code):
    rect(draw,x,z,w,h,(120,109,87,30),(174,161,118,77))
    for side in [-1,1]:
        xx=x if side<0 else x+w
        dash(draw,(xx,z+.1),(xx,z+h-.1),(218,174,88,139),.034,.28,.18)
    label(draw,x+w*.5,z+h-.28,code,small=True,ink=(213,200,155,117))


def corridor():
    def terrain(broad, detail):
        haul=np.minimum(np.abs(X-2.1),np.abs(X-9.0))
        crossing=np.minimum(np.abs(Z-5.0),np.abs(Z-14.5))
        channel=np.abs(X-13.9)
        return [((1.12-haul)*5,1),((.72-crossing)*6,1),
                ((.47-channel)*8,2),(np.clip(broad-.20,0,.6)*.65,3)]
    image=scene(93,[(87,85,78),(105,101,87),(45,51,54),(121,87,60)],terrain)
    d=ImageDraw.Draw(image,'RGBA')
    for x in np.arange(-2.5,END_X,2):
        line(d,[(x,START),(x,END_Z)],(25,31,32,126),.030)
        line(d,[(x+.035,START),(x+.035,END_Z)],(184,177,151,55),.014)
    for z in np.arange(-2.5,END_Z,2):line(d,[(START,z),(END_X,z)],(32,34,34,109),.025)
    for center in [2.1,9.0]:
        for side in [-1,1]:dash(d,(center+side*1.02,START),(center+side*1.02,END_Z),(220,175,92,159),.038,.40,.23)
        dash(d,(center,START),(center,END_Z),(218,201,153,66),.025,.40,1.05)
    for zz in [5.0,14.5]:
        for side in [-1,1]:dash(d,(START,zz+side*.64),(END_X,zz+side*.64),(216,181,112,131),.030,.34,.25)
    # Long exposed cable trench with four flush vehicle crossings.
    for xx in [13.43,14.37]:
        line(d,[(xx,START),(xx,END_Z)],(17,23,27,165),.075)
        line(d,[(xx+.045,START),(xx+.045,END_Z)],(174,141,104,102),.034)
    for zz in np.arange(START,END_Z,.18):line(d,[(13.53,zz),(14.25,zz)],(22,28,31,160),.034)
    for zz in [5.0,10.0,14.5,18.0]:
        rect(d,13.39,zz-.40,1.02,.80,(86,86,78,247),(150,139,110,190))
        for j in range(5):line(d,[(13.47+j*.19,zz-.31),(13.63+j*.19,zz+.31)],(218,164,72,158),.065)
    for bay in [(3.4,2.35,2.3,1.4,'C / 04'),(11.3,3.35,2.1,1.5,'C / 12'),
                (14.6,7.3,2.4,1.4,'C / 18'),(6.5,11.4,1.3,2.3,'F / 07'),
                (11.3,15.35,2.5,1.4,'C / 22'),(5.5,15.4,1.2,1.4,'C / 21')]:loading_bay(d,*bay)
    for x,z,code in [(2.1,8.5,'04'),(9,2.0,'VANTA / 12'),(9,11,'08'),(9,18.0,'DEPOT')]:label(d,x,z,code,ink=(219,204,155,104))
    # Apron-only service slabs give the industrial perimeter a visible scale.
    for z in [1.6,7.2,13.0,18.4]:
        rect(d,18.4,z,1.2,2.8,(53,61,62,113),(147,137,108,100))
        for k in range(7):rect(d,18.55,z+.2+k*.34,.88,.12,(22,30,33,126))
    rng=Random(13)
    for _ in range(105):
        x,z=rng.uniform(START+.4,END_X-.4),rng.uniform(START+.4,END_Z-.4)
        end=(x+rng.uniform(-.16,.16),z+rng.uniform(.27,.78))
        for width,ink in [(.18,(42,37,32,54)),(.08,(26,27,29,76))]:line(d,[(x,z),end],ink,width)
    scatter(d,22,[((31,34,35,95),(159,153,126,92)),((41,33,26,109),(168,122,77,88))],
            2500,lambda x,z:min(abs(x-2.1),abs(x-9.0))>1.1)
    foundations(d,1);stencilled_grid(d,42,40)
    return image


def stream_x(z):
    return 9.1+np.sin((z+1.3)*.36)*1.05


def frontier_yard(draw,x,z,w,h,code):
    rect(draw,x-w/2,z-h/2,w,h,(89,108,111,72),(172,195,188,70))
    for xx in [x-w/2,x+w/2]:dash(draw,(xx,z-h/2),(xx,z+h/2),(180,200,189,105),.032,.28,.20)
    label(draw,x,z,code,ink=(184,205,196,132))
    for zz in [z-h/2+.18,z+h/2-.18]:line(draw,[(x-w/2+.18,zz),(x+w/2-.18,zz)],(40,62,69,87),.026)


def frontier():
    stream=stream_x(Z)
    def terrain(broad, detail):
        channel=np.abs(X-stream)
        frost=broad*.64+detail*.24+.33+.15*np.cos(Z*.48)
        trail=np.abs(X-(2.0+(18-Z)*.43)) / 1.09
        east_yard=(np.abs(X-14.4)<1.9)&(np.abs(Z-8.0)<1.45)
        west_yard=(np.abs(X-4.6)<1.45)&(np.abs(Z-16.2)<1.20)
        return [(frost,1),((.80-channel+detail*.08)*8,2),
                ((.49-channel+detail*.05)*9,3),((.48-trail+detail*.08)*3,4),
                ((east_yard|west_yard)*.73,4)]
    image=scene(127,[(68,78,77),(132,145,146),(104,127,131),(51,78,92),(84,99,101)],terrain)
    d=ImageDraw.Draw(image,'RGBA')
    for side in [-1,1]:
        edge=[(float(stream_x(z))+side*.59,z) for z in np.arange(START,END_Z,.1)]
        line(d,edge,(182,211,206,82),.033)
    # The runoff is frozen and traversable. Cracks make the icy route legible.
    rng=Random(141)
    for zz in np.arange(-2.5,21.5,.64):
        xx=float(stream_x(zz));side=rng.choice([-1,1])
        line(d,[(xx-side*.45,zz),(xx+.05,zz+.14),(xx+side*.35,zz-.06),(xx+side*.56,zz+.18)],(154,192,200,78),.015)
    scatter(d,66,[((36,49,49,105),(143,156,148,95)),((62,82,86,113),(188,207,209,121))],
            4700,lambda x,z:abs(x-float(stream_x(z)))>.53)
    for zz in [3.5,8.0,13.0,17.5]:
        xx=float(stream_x(zz))
        rect(d,xx-1.17,zz-.37,2.34,.74,(63,76,82,245),(180,193,180,166))
        for j in range(15):
            k=xx-1.07+j*.15;line(d,[(k,zz-.34),(k,zz+.34)],(34,44,51,167),.024)
        for side in [-1,1]:line(d,[(xx-1.17,zz+.36*side),(xx+1.17,zz+.36*side)],(198,183,124,145),.034)
    frontier_yard(d,14.4,8.0,3.7,2.8,'HALCYON / 19')
    frontier_yard(d,4.6,16.2,2.8,2.3,'H-19')
    frontier_yard(d,5.0,2.0,2.0,1.5,'NORTH RELAY')
    # Scattered weather station anchors and old concrete landing circles across both banks.
    for x,z,r in [(14.0,2.0,.85),(3.4,6.5,.54),(15.4,18.1,.70),(11.7,12.7,.46)]:
        circle(d,x,z,r,outline=(179,198,192,91),width=.027)
        circle(d,x,z,r-.12,outline=(45,65,71,83),width=.025)
        for side in [-1,1]:line(d,[(x+side*(r-.10),z-.10),(x+side*(r-.10),z+.10)],(192,211,200,101),.035)
    foundations(d,2);stencilled_grid(d,67,43)
    return image


def soften_apron(image):
    outside=np.maximum.reduce((-X-.5,X-(BOARD_W-.5),-Z-.5,Z-(BOARD_H-.5),np.zeros_like(X)))
    edge=np.minimum.reduce((X-START,Z-START,END_X-X,END_Z-Z))
    density=np.clip(edge/2.35,0,1)
    pixels=np.asarray(image,dtype=np.float32)
    dim=np.clip(outside/2.1,0,1)[:,:,None]*.31
    rgb=pixels*(1-dim)+np.array([18,26,32],dtype=np.float32)*dim
    alpha=density*density*(3-2*density)*255
    return Image.fromarray(np.dstack((rgb,alpha)).astype(np.uint8))


def validate_layouts():
    allowed=[{'ridge-rock','relay-shield'},{'cargo','transformer'},{'conifer','bunker'}]
    for index,layout in enumerate(LAYOUTS):
        cover=layout['cover'];assert 18<=len(cover)<=25
        for key,kind in cover.items():
            x,z=map(int,key.split(','));assert 0<=x<BOARD_W and 0<=z<BOARD_H
            assert kind in allowed[index]
            assert not (x<=4 and z>=14), 'Deployment approach must remain open'
        # Every free square remains reachable from the allied deployment area.
        seen={(1,16)};queue=[(1,16)]
        for x,z in queue:
            for dx,dz in [(1,0),(-1,0),(0,1),(0,-1)]:
                a,b=x+dx,z+dz
                if 0<=a<BOARD_W and 0<=b<BOARD_H and f'{a},{b}' not in cover and (a,b) not in seen:
                    seen.add((a,b));queue.append((a,b))
        assert len(seen)==BOARD_W*BOARD_H-len(cover)


if __name__=='__main__':
    validate_layouts()
    for key,generate in [('relay',relay),('corridor',corridor),('frontier',frontier)]:
        image=soften_apron(generate())
        path=OUT/f'ground-{key}.webp';image.save(path,quality=85,method=6)
        print(f'{key}: {WIDTH}x{HEIGHT}, {path.stat().st_size:,} bytes',flush=True)
