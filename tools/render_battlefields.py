"""Build the three original, top-down battlefield ground textures.

Run from any directory with Python, Pillow and NumPy. The renderer maps
columns to world X and rows to world Z, from -3.5 to 12.5 in both axes.
"""
from pathlib import Path
from random import Random
from math import sin, cos, tau, hypot

import numpy as np
from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parents[1] / "dist" / "assets"
UNIT = 96
SIZE = 16 * UNIT
START = -3.5
AXIS = np.arange(SIZE, dtype=np.float32) / UNIT + START
X, Z = np.meshgrid(AXIS, AXIS)
FONT = ImageFont.load_default(size=34)


def noise(rng, frequency):
    grid = rng.integers(0, 255, (frequency, frequency), dtype=np.uint8)
    up = Image.fromarray(grid).resize((SIZE, SIZE), Image.Resampling.BICUBIC)
    return np.asarray(up, dtype=np.float32) / 127.5 - 1


def scene(seed, colors, terrain):
    rng = np.random.default_rng(seed)
    broad, ground, gravel = (noise(rng, f) for f in (17, 61, 440))
    grain = rng.normal(0, 1.35, (SIZE, SIZE)).astype(np.float32)
    # Light and shadow along the edges of small raised forms.
    relief = (np.roll(ground, 5, 0) - ground) * 18 + (np.roll(ground, 3, 1) - ground) * 12
    variation = broad * 13 + ground * 9 + gravel * 5 + grain + relief
    colors = np.array(colors, dtype=np.float32)
    image = colors[0] + variation[:, :, None]
    for weight, color in terrain(broad, ground):
        weight = np.clip(weight, 0, 1)[:, :, None]
        image = image * (1-weight) + (colors[color] + variation[:, :, None] * .63) * weight
    return Image.fromarray(np.clip(image, 0, 255).astype(np.uint8))


def xy(x, z):
    return round((x-START) * UNIT), round((z-START) * UNIT)


def line(draw, points, ink, width=.02):
    draw.line([xy(x, z) for x, z in points], fill=ink, width=max(1, round(width * UNIT)), joint="curve")


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


def stencilled_grid(draw, seed, opacity):
    rng = Random(seed)
    for _ in range(80):
        x, z = rng.randint(-2, 11)+.5, rng.randint(-2, 11)+.5
        width = rng.uniform(.12, .31)
        line(draw, [(x-width, z), (x, z), (x, z+width)], (207, 211, 185, opacity))
    for x, z, sx, sz in [(-.5,-.5,1,1),(9.5,-.5,-1,1),(-.5,9.5,1,-1),(9.5,9.5,-1,-1)]:
        line(draw, [(x+sx*.48, z), (x, z), (x, z+sz*.48)], (216,211,181,120), .036)


def scatter(draw, seed, colors, amount, active=lambda x,z: True):
    rng = Random(seed)
    for _ in range(amount):
        x, z = rng.uniform(-3.5, 12.5), rng.uniform(-3.5, 12.5)
        if not active(x,z):
            continue
        length = rng.uniform(.018, .115)
        rise = rng.uniform(.015, length*.6+.015)
        shadow, light = rng.choice(colors)
        poly(draw, [(x-length,z+rise*.2),(x-length*.18,z-rise*.5),
                    (x+length*.65,z-rise*.12),(x+length,z+rise*.77),(x,z+rise)], shadow)
        line(draw, [(x-length*.7,z+rise*.02),(x-length*.18,z-rise*.5),
                    (x+length*.45,z-rise*.14)], light, .013)


def relay():
    def terrain(broad, detail):
        lane = np.abs(Z-7.75+0.52*np.sin(X*.43))
        pad = np.hypot(X-3.7, Z-1.7)
        gully = np.abs(Z-3.6+0.85*np.sin(X*.48))
        return [(broad*.58+.36, 1), ((.31-gully+detail*.22)*3, 2),
                (np.maximum((.52-lane+detail*.16)*8, (1.48-pad+detail*.10)*8), 3)]
    image = scene(52, [(83,78,64),(85,89,69),(54,62,61),(100,100,87)], terrain)
    d = ImageDraw.Draw(image, "RGBA")
    scatter(d, 4, [((30,31,27,100),(174,161,127,105)),((39,47,39,95),(135,140,105,96))],
            2800, lambda x,z: abs(z-7.75+.52*sin(x*.43))>.42 and hypot(x-3.7,z-1.7)>1.23)
    track = [(x,7.75-.52*sin(x*.43)) for x in np.arange(-3.4,12.5,.1)]
    for side in (-1,1):
        line(d, [(x,z+side*.29) for x,z in track], (30,36,35,71), .055)
        line(d, [(x,z+side*.46) for x,z in track], (206,194,150,68), .016)
    center = (3.7,1.7)
    circle(d,*center,1.29,outline=(215,204,163,110),width=.038)
    circle(d,*center,1.17,outline=(40,46,42,135))
    for i in range(12):
        a=i*tau/12
        line(d, [(center[0]+r*cos(a),center[1]+r*sin(a)) for r in (1.12,1.26)],
             (226,219,180,133),.044)
    d.text(xy(3.7,1.7),"K-07",font=FONT,anchor="mm",fill=(214,205,164,141))
    for x,z in [(1.0,5.1),(9.3,5.4),(-1.0,2.1),(8.7,1.4)]:
        circle(d,x,z,.28,outline=(31,40,41,105),width=.062)
        circle(d,x+.06,z-.02,.17,fill=(53,65,62,125),outline=(135,143,114,100))
    stencilled_grid(d,34,45)
    return image


def corridor():
    def terrain(broad, detail):
        channel = np.abs(X-6.8)
        haul = np.abs(X-3.3)
        loading = np.abs(Z-2.05)
        return [((1.17-haul)*4,1),((.70-loading)*6,1),
                ((.51-channel)*8,2),(np.clip(broad-.22,0,.6)*.66,3)]
    image = scene(93, [(88,86,79),(106,101,87),(48,52,53),(122,88,61)], terrain)
    d = ImageDraw.Draw(image,"RGBA")
    for x in [-2.5,-.5,1.5,4.55,5.55,7.5,9.5,11.5]:
        line(d, [(x,-3.5),(x,12.5)], (25,31,32,145), .035)
        line(d, [(x+.037,-3.5),(x+.037,12.5)], (184,177,151,62), .015)
    for z in [-2.5,-.5,1.5,3.5,5.5,7.5,9.5,11.5]:
        line(d, [(-3.5,z),(12.5,z)], (32,34,34,125), .027)
    for x in [2.24,4.37]:
        dash(d,(x,-3.5),(x,12.5),(220,175,92,172),.039,.37,.21)
    for z in [1.45,2.68]:
        dash(d,(-3.5,z),(12.5,z),(216,181,112,142),.032,.32,.24)
    for x in [6.29,7.28]:
        line(d, [(x,-3.5),(x,12.5)], (19,23,27,165), .085)
        line(d, [(x+.05,-3.5),(x+.05,12.5)], (174,141,104,106), .038)
    for z in np.arange(-3.5,12.5,.16):
        line(d, [(6.4,z),(7.16,z)], (23,28,31,160), .038)
    for z in [2.05,5.08,8.8]:
        rect(d,6.27,z-.30,1.06,.60,(84,83,74,244),(129,124,104,200))
        for i in range(5):
            x=6.35+i*.19
            line(d,[(x,z-.24),(x+.18,z+.24)],(221,169,75,157),.064)
    for x,z,code in [(3.28,3.85,"04"),(3.28,7.9,"02"),(8.4,2.08,"VANTA")]:
        d.text(xy(x,z),code,font=FONT,anchor="mm",fill=(216,205,161,109))
    rng=Random(13)
    for _ in range(43):
        x,z=rng.uniform(-3,12),rng.uniform(-3,12)
        for w,ink in [(.18,(42,37,32,65)),(.09,(26,27,29,87))]:
            line(d,[(x,z),(x+rng.uniform(-.16,.16),z+rng.uniform(.27,.78))],ink,w)
    scatter(d,22,[((31,34,35,95),(159,153,126,92)),((41,33,26,109),(168,122,77,88))],
            1100,lambda x,z:abs(x-3.3)>1.1)
    stencilled_grid(d,42,46)
    return image


def frontier():
    stream = 5.84 + np.sin((Z+1.7)*.59)*.86
    def terrain(broad, detail):
        channel = np.abs(X-stream)
        frost = broad*.65+detail*.24 + .31 + .17*np.cos(Z*.8)
        yard = (np.abs(X-2.1)<1.23) & (np.abs(Z-7.85)<1.31)
        return [(frost,1),((.77-channel+detail*.09)*8,2),
                ((.50-channel+detail*.05)*9,3),(yard*.74,4)]
    image = scene(127, [(69,79,77),(130,143,144),(105,126,129),(52,78,91),(82,94,95)], terrain)
    d = ImageDraw.Draw(image,"RGBA")
    for side in (-1,1):
        edge=[(5.84+sin((z+1.7)*.59)*.86+side*.57,z) for z in np.arange(-3.5,12.5,.11)]
        line(d,edge,(180,208,204,80),.033)
    scatter(d,66,[((36,49,49,105),(143,156,148,95)),((62,82,86,113),(188,207,209,121))],
            1960,lambda x,z:abs(x-(5.84+sin((z+1.7)*.59)*.86))>.53)
    for z in [2.58,7.38]:
        x=5.84+sin((z+1.7)*.59)*.86
        rect(d,x-1.08,z-.31,2.16,.62,(63,73,78,245),(179,190,175,170))
        for j in range(13):
            k=x-.96+j*.16
            line(d,[(k,z-.28),(k,z+.28)],(36,43,48,168),.026)
        for side in (-1,1):
            line(d,[(x-1.08,z+.3*side),(x+1.08,z+.3*side)],(197,179,116,147),.036)
    for x in [1.0,3.2]:
        dash(d,(x,6.65),(x,9.05),(180,200,189,115),.035,.25,.17)
    for z in [6.65,9.05]:
        line(d,[(1,z),(3.2,z)],(180,200,189,120),.036)
    d.text(xy(2.1,7.84),"H-19",font=FONT,anchor="mm",fill=(185,202,194,132))
    stencilled_grid(d,67,51)
    return image


def soften_apron(image):
    # Outside the combat grid the ground recedes into the contract backdrop.
    outside = np.maximum.reduce((-X-.5, X-9.5, -Z-.5, Z-9.5, np.zeros_like(X)))
    edge = np.minimum.reduce((X-START, Z-START, START+16-X, START+16-Z))
    density = np.clip(edge / 2.35, 0, 1)
    pixels = np.asarray(image, dtype=np.float32)
    dim = np.clip(outside / 2.1, 0, 1)[:, :, None] * .31
    rgb = pixels * (1-dim) + np.array([18,26,32], dtype=np.float32)*dim
    alpha = density*density*(3-2*density)*255
    return Image.fromarray(np.dstack((rgb, alpha)).astype(np.uint8))


for key, generate in [("relay", relay), ("corridor", corridor), ("frontier", frontier)]:
    image = soften_apron(generate())
    image.save(OUT / f"ground-{key}.webp", quality=85, method=6)
