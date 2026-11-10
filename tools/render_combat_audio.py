"""Render original Iron Vow combat cues. Requires numpy and scipy."""

from pathlib import Path

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

RATE = 24_000
OUT = Path(__file__).resolve().parents[1] / "dist/assets/audio"
rng = np.random.default_rng(71804)


def time(seconds):
    return np.arange(round(seconds * RATE)) / RATE


def band_noise(t, low, high):
    noise = sosfilt(butter(2, [low, high], fs=RATE, btype="bandpass", output="sos"),
                    rng.standard_normal(len(t)))
    return noise / max(np.std(noise), 1e-6)


def envelope(t, attack, decay):
    return (1 - np.exp(-t / attack)) * np.exp(-t / decay)


def sweep(t, start, end, speed):
    phase = end * t + (start - end) * speed * (1 - np.exp(-t / speed))
    return np.sin(2 * np.pi * phase)


def place(mix, offset, layer):
    start = round(offset * RATE)
    mix[start:start + len(layer)] += layer


def ring(t, pitch, decay):
    return sum(weight * np.sin(2 * np.pi * pitch * partial * t) *
               envelope(t, .0008, decay / partial)
               for partial, weight in [(1, .63), (1.47, .25), (2.16, .12)])


def arm():
    mix = np.zeros(len(time(.29)))
    t = time(.235)
    pulse = .64 + .36 * np.sin(2 * np.pi * (18 * t + 30 * t ** 2))
    place(mix, .005, (.44 * sweep(t, 87, 237, .09) + .22 * band_noise(t, 300, 1600)) *
          envelope(t, .035, .14) * pulse)
    for offset, pitch in [(.012, 1040), (.082, 805), (.193, 520)]:
        t = time(.069)
        place(mix, offset, .43 * ring(t, pitch, .031) + .12 * band_noise(t, 1600, 6100) * envelope(t, .0005, .011))
    return mix


def launch():
    mix = np.zeros(len(time(.68)))
    t = time(.057)
    place(mix, 0, .94 * band_noise(t, 1150, 9600) * envelope(t, .0004, .012) + .40 * ring(t, 675, .037))
    t = time(.20)
    place(mix, .011, 1.1 * sweep(t, 225, 70, .033) * envelope(t, .0014, .069)
          + .56 * band_noise(t, 260, 3500) * envelope(t, .002, .045))

    # Combustion begins after the launch tube cracks. Irregular pulses keep the
    # rocket motor from sounding like a steady tone or a single wash of noise.
    t = time(.57)
    turbulence = np.clip(1 + .26 * band_noise(t, 8, 52), .28, 1.65)
    motor = (.68 * band_noise(t, 95, 340) + .57 * band_noise(t, 340, 1350) +
             .30 * band_noise(t, 1500, 5200) + .29 * sweep(t, 195, 67, .13))
    combustion = np.tanh(motor * turbulence * 1.9) * envelope(t, .014, .17)
    place(mix, .038, combustion * 1.38)
    for offset, gain in [(.065, .54), (.106, .44), (.164, .31), (.218, .22)]:
        t = time(.13)
        place(mix, offset, band_noise(t, 300, 4500) * envelope(t, .002, .045) * gain)

    # As the rocket departs, high frequencies drop first and the motor
    # collapses into an airy tail. Two quiet reflections give the tube depth.
    t = time(.41)
    place(mix, .223, .33 * band_noise(t, 420, 2700) * envelope(t, .027, .11))
    for offset, gain in [(.083, .22), (.172, .11)]:
        place(mix, offset, mix[:round(.14 * RATE)].copy() * gain)
    return mix


def impact(style):
    size = {"armor-hit": .49, "heavy-hit": .81, "missile-hit": 1.18}[style]
    blast = style == "missile-hit"
    light = style == "armor-hit"
    mix = np.zeros(len(time(size)))

    t = time(.075)
    place(mix, 0, .91 * band_noise(t, 1750, 8900) * envelope(t, .0004, .014)
          + .41 * ring(t, 1360 if light else 610, .040))
    t = time(size - .04)
    body = (.89 * sweep(t, 193 if light else 152, 59 if light else 39, .056) +
            .53 * sweep(t, 280, 118, .047) +
            .59 * band_noise(t, 150, 790))
    place(mix, .006, body * envelope(t, .003, .08 if light else .17))
    if blast:
        t = time(.92)
        turbulent = .63 * band_noise(t, 68, 260) + .42 * band_noise(t, 270, 1700)
        pulse = np.clip(1 + .24 * band_noise(t, 10, 35), .45, 1.65)
        place(mix, .034, np.tanh(turbulent * pulse * 1.4) * envelope(t, .016, .29) * 1.3)
        place(mix, .107, .58 * sweep(t, 75, 33, .23) * envelope(t, .026, .30))
    debris = [(.058, 2330), (.111, 1320), (.162, 3100), (.237, 1560)]
    if not light:
        debris += [(.325, 960), (.436, 2080), (.555, 840)]
    for index, (offset, pitch) in enumerate(debris):
        t = time(.12)
        grit = .32 * band_noise(t, 670, 5600) * envelope(t, .001, .021)
        place(mix, offset, (grit + .43 * ring(t, pitch, .052)) * .81 ** index)
    for offset, gain in [(.085, .18), (.201, .11), (.318, .055)]:
        length = min(.16, size - offset)
        place(mix, offset, mix[:round(length * RATE)].copy() * gain)
    return mix


def master(mix, peak):
    mix = sosfilt(butter(2, 32, fs=RATE, btype="highpass", output="sos"), mix)
    mix = np.tanh(mix * .88)
    mix[-480:] *= np.linspace(1, 0, 480)
    return mix * (peak / np.max(np.abs(mix)))


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    cues = {"pod-arm": (arm(), .49), "rocket-launch": (launch(), .94),
            "armor-hit": (impact("armor-hit"), .70), "heavy-hit": (impact("heavy-hit"), .87),
            "missile-hit": (impact("missile-hit"), .97)}
    for name, (mix, peak) in cues.items():
        wavfile.write(OUT / f"{name}.wav", RATE, np.int16(master(mix, peak) * 32767))


if __name__ == "__main__":
    main()
