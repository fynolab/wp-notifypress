#!/usr/bin/env python3
"""
Render the animated WordPress.org plugin icon from the NotifyPress "Signal"
mark (notifypress-marketing/brand/logo-mark.svg).

    python3 bin/make-icon.py

Writes .wordpress-org/icon-256x256.gif and icon-128x128.gif. Requires Pillow.

The mark is a dot with two broadcast arcs sharing its centre, drawn white on
brand blue like brand/profile-picture-blue.png. The first frame is the full
logo, so anywhere that shows a still frame still shows the real mark. The loop
fades the arcs out, pulses the dot, sweeps the arcs back out and holds.
"""

import math
import os

from PIL import Image, ImageDraw

BLUE = (37, 99, 235)  # #2563eb
WHITE = (255, 255, 255)
OUTER_ARC_OPACITY = 0.45

# Geometry in logo-mark.svg's 48-unit viewBox. Both arcs are centred on the dot.
CENTER = (17.0, 31.0)
DOT_RADIUS = 8.5
STROKE = 5.0
ARCS = (
    {'radius': 16.5, 'start': -75.0, 'end': -15.0, 'opacity': 1.0},
    {'radius': 26.0, 'start': -70.0, 'end': -20.0, 'opacity': OUTER_ARC_OPACITY},
)

MARK_SCALE = 0.645  # Share of the canvas the 48-unit viewBox spans, as in the profile picture.
SUPERSAMPLE = 4
FPS = 25
DURATION = 2.8  # Seconds per loop.

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '.wordpress-org')


def clamp(value):
    return max(0.0, min(1.0, value))


def ease_out(t):
    return 1 - (1 - t) ** 3


def ease_in_out(t):
    return 3 * t * t - 2 * t * t * t


def phase(t, start, end):
    """Progress 0..1 of t through the window [start, end]."""
    return clamp((t - start) / (end - start))


def state_at(t):
    """Arc sweep/opacity and dot scale at time t seconds into the loop."""
    # 0.0-0.9 hold full logo; 0.9-1.15 arcs fade; 1.15-1.55 dot pulse;
    # 1.35-1.85 inner arc sweeps in; 1.6-2.1 outer arc sweeps in; then hold.
    fade = 1 - ease_in_out(phase(t, 0.9, 1.15))
    pulse = math.sin(math.pi * phase(t, 1.15, 1.55))
    inner = ease_out(phase(t, 1.35, 1.85))
    outer = ease_out(phase(t, 1.6, 2.1))

    if t < 1.15:
        sweeps = (1.0, 1.0)
        alphas = (fade, fade)
    else:
        sweeps = (inner, outer)
        alphas = (clamp(inner * 1.6), clamp(outer * 1.6))

    return {
        'dot_scale': 1 + 0.1 * pulse,
        'sweeps': sweeps,
        'alphas': alphas,
    }


def render(size, state):
    canvas = size * SUPERSAMPLE
    unit = canvas * MARK_SCALE / 48
    offset = (canvas - 48 * unit) / 2

    def point(x, y):
        return (offset + x * unit, offset + y * unit)

    image = Image.new('RGB', (canvas, canvas), BLUE)
    cx, cy = point(*CENTER)
    half_stroke = STROKE * unit / 2

    for arc, sweep, alpha in zip(ARCS, state['sweeps'], state['alphas']):
        opacity = arc['opacity'] * alpha

        if sweep <= 0 or opacity <= 0:
            continue

        mid = (arc['start'] + arc['end']) / 2
        half = (arc['end'] - arc['start']) / 2 * sweep
        start, end = mid - half, mid + half
        radius = arc['radius'] * unit

        mask = Image.new('L', (canvas, canvas), 0)
        draw = ImageDraw.Draw(mask)
        box = (cx - radius - half_stroke, cy - radius - half_stroke, cx + radius + half_stroke, cy + radius + half_stroke)
        draw.arc(box, start, end, fill=255, width=round(STROKE * unit))

        # Round caps, as stroke-linecap="round" in the SVG.
        for angle in (start, end):
            ex = cx + radius * math.cos(math.radians(angle))
            ey = cy + radius * math.sin(math.radians(angle))
            draw.ellipse((ex - half_stroke, ey - half_stroke, ex + half_stroke, ey + half_stroke), fill=255)

        mask = mask.point(lambda value: round(value * opacity))
        image.paste(WHITE, (0, 0), mask)

    dot = DOT_RADIUS * unit * state['dot_scale']
    ImageDraw.Draw(image).ellipse((cx - dot, cy - dot, cx + dot, cy + dot), fill=WHITE)

    return image.resize((size, size), Image.LANCZOS)


RAMP_STEPS = 64


def to_palette(frame):
    """
    Every pixel is a blend of brand blue and white, so a blue-to-white ramp is
    an exact palette. Each pixel's blend is read straight from its red channel
    rather than through Pillow's approximate nearest-colour lookup, so both
    brand colours come out exact.
    """
    colours = []

    for index in range(RAMP_STEPS):
        t = index / (RAMP_STEPS - 1)
        colours.extend(round(b + (w - b) * t) for b, w in zip(BLUE, WHITE))

    span = WHITE[0] - BLUE[0]
    indexed = frame.getchannel('R').point(
        lambda red: round(clamp((red - BLUE[0]) / span) * (RAMP_STEPS - 1))
    )
    indexed = indexed.convert('P')
    indexed.putpalette(colours + [0] * (768 - len(colours)))

    return indexed


def write_gif(size):
    count = round(DURATION * FPS)
    frames = [render(size, state_at(index / FPS)) for index in range(count)]

    frames = [to_palette(frame) for frame in frames]

    path = os.path.join(OUT_DIR, f'icon-{size}x{size}.gif')
    frames[0].save(
        path,
        save_all=True,
        append_images=frames[1:],
        duration=round(1000 / FPS),
        loop=0,
        optimize=True,
        disposal=1,
    )

    return path


if __name__ == '__main__':
    os.makedirs(OUT_DIR, exist_ok=True)

    for icon_size in (256, 128):
        written = write_gif(icon_size)
        print(f'{written} ({os.path.getsize(written) // 1024} KB)')
