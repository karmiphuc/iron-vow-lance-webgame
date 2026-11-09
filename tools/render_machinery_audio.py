"""Build Iron Vow's machinery cues from CC0 Freesound previews using FFmpeg."""

from array import array
from pathlib import Path
import subprocess
import sys
import wave


RATE = 24000
OUT = Path(__file__).resolve().parents[1] / "dist/assets/audio"
def decode(source, offset, duration, tone):
    data = subprocess.check_output([
        "ffmpeg", "-nostdin", "-v", "error", "-ss", str(offset), "-i", str(source),
        "-t", str(duration), "-af", tone, "-ac", "1", "-ar", str(RATE), "-f", "f32le", "-",
    ])
    return array("f", data)


def write_cue(name, samples, peak, fade=None):
    if fade is not None:
        attack, release = (int(seconds * RATE) for seconds in fade)
        for i in range(attack):
            samples[i] *= i / attack
        for i in range(release):
            samples[-1-i] *= i / release
    gain = peak / max(map(abs, samples))
    with wave.open(str(OUT / f"mech-{name}.wav"), "wb") as wav:
        wav.setparams((1, 2, RATE, 0, "NONE", "not compressed"))
        wav.writeframes(array("h", (round(sample * gain * 32767) for sample in samples)).tobytes())


def main():
    inputs = Path(sys.argv[1])
    cues = [
        ("servo", "servo", .183, .32, "pan=mono|c0=c0,highpass=f=380,lowpass=f=11000", .78, (.006, .095)),
        ("arm", "arm", .355, .43, "highpass=f=230,lowpass=f=8600", .80, (.009, .14)),
        ("foot-a", "steps", .88, .45, "highpass=f=42,lowpass=f=6700", .91, (.002, .18)),
        ("foot-b", "steps", 2.16, .44, "highpass=f=45,lowpass=f=6900", .89, (.002, .17)),
        ("foot-heavy", "heavy", .884, .53, "highpass=f=36,lowpass=f=5100", .94, (.003, .24)),
        ("vent", "hiss", .145, .245, "pan=mono|c0=c0,highpass=f=1300,lowpass=f=10200", .77, (.022, .12)),
        ("boot", "startup", 10.58, 2.90, "highpass=f=55,lowpass=f=5400", .85, (.19, .91)),
    ]
    for name, recording, offset, duration, tone, peak, fade in cues:
        write_cue(name, decode(inputs / f"{recording}.mp3", offset, duration, tone), peak, fade)

    idle = decode(inputs / "idle.mp3", 12, 6.25, "highpass=f=70,lowpass=f=760")
    overlap = RATE
    tail = idle[-overlap:]
    for i, value in enumerate(tail):
        ratio = i / overlap
        tail[i] = value * (1 - ratio) + idle[i] * ratio
    write_cue("idle", idle[overlap:-overlap] + tail, .76)


if __name__ == "__main__":
    main()
