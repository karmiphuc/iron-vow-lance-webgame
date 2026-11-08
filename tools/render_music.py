"""Render original Iron Vow scores. Requires numpy, scipy and ffmpeg."""

import subprocess
from pathlib import Path
import numpy as np
from scipy.signal import butter, sosfilt

RATE = 32000
OUT = Path(__file__).resolve().parents[1] / "dist/assets/audio"


def score(combat):
    rng = np.random.default_rng(507 if combat else 133)
    beat = 60 / (128 if combat else 76)
    bars = 16
    bus = np.zeros((round(bars * 4 * beat * RATE), 2))

    def add(at, samples, pan=0):
        index = (round(at * RATE) + np.arange(len(samples))) % len(bus)
        bus[index] += samples[:, None] * np.sqrt([(1-pan)/2, (1+pan)/2])

    def voice(at, note, duration, volume, attack, release, texture, pan=0, echo=False):
        t = np.arange(round(duration * RATE)) / RATE
        phase = 2*np.pi * (440*2**((note-69)/12))*t
        env = np.minimum(t/attack, 1) * np.minimum((duration-t)/release, 1)
        if texture == "pad":
            wave = .53*np.sin(phase)+.23*np.sin(phase*1.003)+.19*np.sin(phase*2+.3*np.sin(t*4))
            wave *= .8+.2*np.sin(t*2.8+note)
        elif texture == "pluck":
            wave = np.sin(phase+.85*np.exp(-t*6)*np.sin(phase*2.01)) * np.exp(-t*2.8)
        else:
            wave = np.tanh(.85*np.sin(phase)+.44*np.sin(phase*2)+.19*np.sin(phase*3))
        add(at, wave*env*volume, pan)
        if echo:
            add(at+beat*.75, wave*env*volume*.28, -.55)
            add(at+beat*1.5, wave*env*volume*.13, .55)

    def drum(at, kind, level):
        t = np.arange(round((.23 if kind != "hat" else .085)*RATE)) / RATE
        noise = rng.standard_normal(len(t))
        if kind == "kick":
            wave = np.sin(2*np.pi*(44*t+105*.024*(1-np.exp(-t/.024))))*np.exp(-t*18)
            wave += .15*noise*np.exp(-t*130)
        else:
            band = (900, 6400) if kind == "snare" else (4400, 11500)
            wave = sosfilt(butter(2, band, fs=RATE, btype="bandpass", output="sos"), noise)
            wave *= np.exp(-t*(22 if kind=="snare" else 64))
        add(at, wave*np.minimum(t/.0015,1)*level, .17 if kind=="hat" else 0)

    progression = [(38,53,57,64), (34,53,57,60), (41,52,55,60), (36,52,55,62)]
    for bar in range(bars):
        chord = progression[(bar//2)%4]
        at = bar*4*beat
        if bar%2==0:
            for i,note in enumerate(chord):
                voice(at,note+12,beat*8.7,.065 if combat else .09,beat*1.3,beat*1.6,"pad",(-.4,.3,-.2,.55)[i])
        if combat:
            for step in range(16):
                note = chord[0] + (12 if step in (6,14) else 0)
                if step not in (3,7,11,15):
                    voice(at+beat*step/4,note,beat*.22,.17 if step%4==0 else .12,.007,.055,"bass")
            for offset in ((0,1.5,2.5,3.25) if bar%2 else (0,1.5,2,3.5)):
                drum(at+offset*beat,"kick",.32)
            for offset in (1,3):
                drum(at+offset*beat,"snare",.21)
            for step in range(8):
                drum(at+step*beat/2,"hat",.07 if step%2 else .04)
            motif = (1,3,2,1) if bar%2 else (1,2,3,2)
            for i,index in enumerate(motif):
                voice(at+(i+.25)*beat,chord[index]+12,beat*.82,.10,.008,.16,"pluck",.28,True)
            if bar%4==3:
                for i in range(3):
                    drum(at+(3.25+i*.25)*beat,"snare",.11+i*.025)
        else:
            for i,offset in enumerate((.5,2.75) if bar%2==0 else (1.25,3.5)):
                voice(at+offset*beat,chord[1+(bar+i)%3]+12,beat*1.9,.095,.028,.32,"pluck",.32,True)
            if bar%2==0:
                voice(at,chord[0],beat*7.9,.10,beat*.8,beat*2,"bass")
    bus = np.tanh(bus * (1.9 if combat else 1.7))
    return (np.clip(bus,-1,1)*32767).astype("<i2")


if __name__ == "__main__":
    OUT.mkdir(parents=True,exist_ok=True)
    for name,combat in [("hangar-score",False),("mission-score",True)]:
        subprocess.run(["ffmpeg","-v","error","-y","-f","s16le","-ar",str(RATE),"-ac","2","-i","pipe:0",
                        "-codec:a","libmp3lame","-b:a","80k",str(OUT/f"{name}.mp3")],
                       input=score(combat).tobytes(),check=True)
