from PIL import Image, ImageDraw, ImageEnhance
from random import Random

# Material strips are bedrock, high ground, and a road or frozen runoff.
regions = {
    'relay': [[(45,45),(93,52),(265,78),(63,283)],[(26,109),(122,93),(291,160),(195,297)],[(58,213),(130,228),(252,256),(285,239)]],
    'corridor': [[(48,66),(114,77),(277,67),(282,261)],[(27,274),(128,275),(199,277),(269,304)],[(70,74),(74,255),(158,105),(147,256)]],
    'frontier': [[(49,39),(125,84),(245,123),(261,262)],[(96,37),(48,95),(264,27),(71,276)],[(160,51),(163,95),(188,170),(195,262)]],
}

def build_atlas():
    rng = Random(8152)
    atlas = Image.new('RGB',(12*128,3*128))
    for row,(name,materials) in enumerate(regions.items()):
        ground = Image.open(f'dist/assets/ground-{name}.webp').convert('RGB')
        sx,sy = ground.width/320,ground.height/350
        for material,swatches in enumerate(materials):
            for variant,(x,y) in enumerate(swatches):
                radius = 7 if material == 2 else 15
                patch = ground.crop(tuple(round(v) for v in ((x-radius)*sx,(y-radius)*sy,(x+radius)*sx,(y+radius)*sy)))
                patch = patch.resize((128,128),Image.Resampling.LANCZOS)
                patch = ImageEnhance.Brightness(patch).enhance(1.14 if name=='corridor' else 1.04)
                draw = ImageDraw.Draw(patch,'RGBA')
                if name == 'corridor':
                    draw.rectangle((3,3,124,124),outline=(22,25,24,105),width=2)
                    draw.line(((5,123),(5,5),(123,5)),fill=(194,177,136,65),width=2)
                    for bx,by in ((9,9),(118,9),(9,118),(118,118)):
                        draw.rectangle((bx-2,by-2,bx+2,by+2),fill=(35,37,34,132))
                        draw.point((bx-1,by-1),fill=(208,188,148,140))
                for _ in range(65):
                    x,y = rng.randrange(128),rng.randrange(128)
                    shade = 221 if rng.randrange(3)==0 else 17
                    draw.line(((x,y),(x+rng.randrange(2,5),y)),fill=(shade,shade,shade,rng.randrange(15,64)))
                atlas.paste(patch,((material*4+variant)*128,row*128))
    atlas.save('dist/assets/theater-tiles.webp',quality=86,method=6)

if __name__=='__main__':
    build_atlas()
