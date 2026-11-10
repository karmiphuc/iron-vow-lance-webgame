"""Build the ballistic cues from three CC0 recordings. Requires FFmpeg."""

import subprocess
import sys
from pathlib import Path


OUT = Path(__file__).resolve().parents[1] / "dist/assets/audio"
SOURCES = {
    "rifle": "https://cdn.freesound.org/previews/427/427596_3094998-hq.mp3",
    "shotgun": "https://cdn.freesound.org/previews/427/427595_3094998-hq.mp3",
    "metal": "https://cdn.freesound.org/previews/50/50674_71257-hq.mp3",
}


def render(name, source, start, duration, tone, fade, layer=None):
    inputs = ["-ss", str(start), "-i", source]
    filters = (f"[0:a]atrim=duration={duration},asetpts=PTS-STARTPTS,"
               f"aformat=sample_rates=24000:channel_layouts=mono,{tone},"
               f"afade=t=in:d=0.001,afade=t=out:st={fade}:d={duration-fade}")
    if layer:
        sample, level = layer
        inputs += ["-i", str(OUT / f"{sample}.wav")]
        filters += (f"[recording];[1:a]volume={level},atrim=duration={duration},"
                    f"afade=t=out:st={fade}:d={duration-fade}[weight];"
                    "[recording][weight]amix=duration=first:normalize=0")
    filters += ",alimiter=limit=0.92:attack=1:release=25:level=false:latency=true[out]"
    subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", *inputs,
                    "-filter_complex", filters, "-map", "[out]", "-ar", "24000",
                    "-ac", "1", "-c:a", "pcm_s16le", str(OUT / f"{name}.wav")], check=True)


def main():
    sources = {key: str(Path(sys.argv[1]) / f"{key}.mp3") if len(sys.argv) > 1 else url
               for key, url in SOURCES.items()}
    render("rifle-report", sources["rifle"], .073, .21,
           "highpass=f=85,lowpass=f=8500,volume=0.76", .085)
    render("rotary-report", sources["rifle"], .073, .20,
           "asetrate=20160,aresample=24000,highpass=f=55,lowpass=f=6600,volume=0.74", .082,
           ("armor-hit", .21))
    render("shotgun-report", sources["shotgun"], .052, .39,
           "highpass=f=55,lowpass=f=9200,volume=0.86", .18)
    render("cannon-report", sources["shotgun"], .052, .46,
           "asetrate=18480,aresample=24000,highpass=f=42,lowpass=f=7400,volume=0.71", .19,
           ("heavy-hit", .32))
    render("rail-report", sources["rifle"], .073, .38,
           "highpass=f=105,lowpass=f=7300,aecho=0.82:0.82:19|37:0.23|0.16,volume=0.73", .18,
           ("heavy-hit", .35))
    render("plate-strike", sources["metal"], 9.187, .19,
           "asetrate=19200,aresample=24000,highpass=f=120,lowpass=f=6400,volume=1.12", .079,
           ("armor-hit", .86))
    render("shield-strike", sources["metal"], 1.548, .25,
           "highpass=f=180,lowpass=f=8000,volume=1.23", .091, ("armor-hit", .52))


if __name__ == "__main__":
    main()
