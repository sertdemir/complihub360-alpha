#!/usr/bin/env python3
"""Grade the marketing photos with the CompliHub look and export them for the web.

For every entry in apps/vs1-demo/ui/assets/photos/manifest.json:
  original -> crop (if set) -> look LUT (.cube) -> resize -> AVIF + WebP
into apps/vs1-demo/ui/public/img/photos/<slug>-<width>.{avif,webp}.

The originals stay untouched; the LUT is the only place the look lives.
Metadata (EXIF, ICC) is not carried over. Widths larger than the cropped
original are skipped, never upscaled.

Usage:
  python3 scripts/photos/grade-photos.py            # all photos
  python3 scripts/photos/grade-photos.py port-aerial  # selected slugs

Needs Pillow >= 11.3 (AVIF) and numpy.
"""
import json
import os
import sys

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ASSETS = os.path.join(ROOT, 'apps/vs1-demo/ui/assets/photos')
OUT = os.path.join(ROOT, 'apps/vs1-demo/ui/public/img/photos')
WIDTHS = (640, 1280, 1920)
AVIF_QUALITY = 55
WEBP_QUALITY = 78


def read_cube(path):
    size, rows = None, []
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#') or line.startswith('TITLE'):
                continue
            if line.startswith('LUT_3D_SIZE'):
                size = int(line.split()[1])
            elif line[0].isdigit() or line[0] in '.-':
                rows.append([float(v) for v in line.split()])
    if size is None or len(rows) != size ** 3:
        raise ValueError(f'{path}: expected {size}^3 rows, got {len(rows)}')
    return np.array(rows).reshape(size, size, size, 3)  # indexed [b, g, r]


def apply_lut(rgb, lut):
    """Trilinear lookup of float RGB (…, 3) in a [b, g, r]-indexed LUT."""
    n = lut.shape[0]
    p = np.clip(rgb, 0, 1) * (n - 1)
    i0 = np.minimum(np.floor(p).astype(int), n - 2)
    f = p - i0
    r0, g0, b0 = i0[..., 0], i0[..., 1], i0[..., 2]
    fr, fg, fb = f[..., 0:1], f[..., 1:2], f[..., 2:3]
    out = 0
    for db, wb in ((0, 1 - fb), (1, fb)):
        for dg, wg in ((0, 1 - fg), (1, fg)):
            for dr, wr in ((0, 1 - fr), (1, fr)):
                out = out + lut[b0 + db, g0 + dg, r0 + dr] * (wb * wg * wr)
    return out


def grade(entry, lut):
    src = os.path.join(ASSETS, 'originals', entry['file'])
    im = Image.open(src).convert('RGB')
    if entry.get('crop'):
        im = im.crop(tuple(entry['crop']))
    arr = np.asarray(im, dtype=np.float64) / 255
    graded = Image.fromarray((apply_lut(arr, lut) * 255 + 0.5).astype(np.uint8))
    written = []
    for w in WIDTHS:
        if w > graded.width:
            continue
        h = round(graded.height * w / graded.width)
        frame = graded.resize((w, h), Image.LANCZOS)
        base = os.path.join(OUT, f"{entry['slug']}-{w}")
        frame.save(base + '.avif', quality=AVIF_QUALITY)
        frame.save(base + '.webp', quality=WEBP_QUALITY, method=6)
        written.append(f'{w}x{h}')
    return written


def main(slugs):
    with open(os.path.join(ASSETS, 'manifest.json')) as f:
        manifest = json.load(f)
    lut = read_cube(os.path.join(ASSETS, manifest['lut']))
    os.makedirs(OUT, exist_ok=True)
    entries = [e for e in manifest['photos'] if not slugs or e['slug'] in slugs]
    unknown = set(slugs) - {e['slug'] for e in entries}
    if unknown:
        sys.exit(f'unknown slug(s): {", ".join(sorted(unknown))}')
    for e in entries:
        print(e['slug'], ' '.join(grade(e, lut)))


if __name__ == '__main__':
    main(sys.argv[1:])
