"""Orange-filled scissors and paperclip with a medium-weight sage outline and transparent exterior.
Requires Pillow and NumPy. Original artwork is retained in icon-original.png.
"""
from pathlib import Path
from collections import deque
import numpy as np
from PIL import Image, ImageFilter, ImageDraw

root = Path(__file__).resolve().parent.parent
pixels = np.asarray(Image.open(root / 'design/icon-original.png').convert('RGB'), dtype=float)
h, w, _ = pixels.shape
y, x = np.mgrid[0:h, 0:w]
x, y = x / (w - 1), y / (h - 1)
features = np.stack([np.ones_like(x), x, y, x*x, x*y, y*y], axis=-1)
border = ((x < .1) | (x > .9) | (y < .1) | (y > .9)) & (x > .015) & (x < .985) & (y > .015) & (y < .985)
background = np.clip(features @ np.linalg.lstsq(features[border], pixels[border], rcond=None)[0], 0, 255)
white = 255 - background
contrast = np.clip(np.sum((pixels - background) * white, axis=-1) / np.maximum(np.sum(white**2, axis=-1), 1), 0, 1)
# Background variation and the original image border are not part of the artwork.
candidates = (contrast > .065) & (x > .09) & (x < .92) & (y > .09) & (y < .92)
seen = np.zeros((h, w), dtype=bool)
mask = np.zeros((h, w), dtype=bool)
for row, col in np.argwhere(candidates):
    if seen[row, col]:
        continue
    points = []
    queue = deque([(row, col)])
    seen[row, col] = True
    while queue:
        r, c = queue.popleft()
        points.append((r, c))
        for rr, cc in ((r-1,c),(r+1,c),(r,c-1),(r,c+1)):
            if 0 <= rr < h and 0 <= cc < w and candidates[rr,cc] and not seen[rr,cc]:
                seen[rr,cc] = True
                queue.append((rr,cc))
    if len(points) >= 12:
        for r, c in points:
            mask[r,c] = True
# Close one-pixel breaks caused by the source's soft/shaded edges, then fill the
# original silhouette. This keeps the paperclip loop and scissor holes opaque.
outline = np.asarray(Image.fromarray(mask.astype('uint8') * 255)
    .filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(3))) > 0
# Flood only the background connected to the canvas border. Interior gaps stay opaque.
exterior = np.zeros((h, w), dtype=bool)
queue = deque([(0, 0)])
exterior[0, 0] = True
while queue:
    r, c = queue.popleft()
    for rr, cc in ((r-1,c),(r+1,c),(r,c-1),(r,c+1)):
        if 0 <= rr < h and 0 <= cc < w and not outline[rr,cc] and not exterior[rr,cc]:
            exterior[rr,cc] = True
            queue.append((rr,cc))
# Keep the accepted silhouette and enclosed gaps. Orange fills the artwork;
# the #e9eeea outline retains about 75% of the original linework coverage.
alpha = np.clip((contrast - .065) / .19, 0, 1)
alpha = alpha * alpha * (3 - 2 * alpha) * mask
interior_gaps = ~exterior & ~mask
alpha[interior_gaps] = 1
line_mask = Image.fromarray(mask.astype('uint8') * 255)
original_weight = float(mask.sum())
target_weight = original_weight * .75
previous = mask.astype(float)
previous_weight = original_weight
for radius in range(1, 6):
    eroded = np.asarray(line_mask.filter(ImageFilter.MinFilter(2 * radius + 1)), dtype=float) / 255
    remaining_weight = float(eroded.sum())
    if remaining_weight <= target_weight:
        mix = (previous_weight - target_weight) / max(previous_weight - remaining_weight, 1)
        core = previous * (1-mix) + eroded * mix
        break
    previous, previous_weight = eroded, remaining_weight
else:
    core = eroded
stroke = np.clip(core, 0, 1)[...,None]
top = np.array([249, 146, 40])
bottom = np.array([230, 91, 22])
orange_fill = top[None,None,:] * (1-y[...,None]) + bottom[None,None,:] * y[...,None]
brand = np.array([233, 238, 234])
foreground = orange_fill * (1-stroke) + brand * stroke
print(f'Outline coverage: {float(stroke.sum()) / original_weight:.1%} of the previous linework.')
rgba = np.dstack([foreground, alpha * 255]).round().astype('uint8')
rgba[rgba[:,:,3] == 0, :3] = 0
artwork = Image.fromarray(rgba, 'RGBA')
# Fit the actual artwork to 99% of the canvas. Supersampling permits subpixel
# margins at small toolbar sizes while keeping the outline centered and complete.
cropped = artwork.crop(artwork.getchannel('A').getbbox())
def fit_icon(size):
    factor = 8
    canvas_size = size * factor
    scale = canvas_size * .99 / max(cropped.size)
    dimensions = tuple(max(1, round(edge * scale)) for edge in cropped.size)
    fitted = cropped.resize(dimensions, Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))
    canvas.alpha_composite(fitted, ((canvas_size - dimensions[0]) // 2, (canvas_size - dimensions[1]) // 2))
    rendered = np.array(canvas.resize((size, size), Image.Resampling.LANCZOS))
    # Lanczos RGB interpolation may overshoot into white. Keep all colors within
    # the selected palette, then pin the outline's solid body to exact #e9eeea.
    rgb = np.minimum(rendered[:,:,:3], np.maximum(top, brand).astype('uint8'))
    outline_pixels = (rgb[:,:,1] >= 210) & (rgb[:,:,2] >= 190) & (rendered[:,:,3] > 0)
    rgb[outline_pixels] = brand.astype('uint8')
    rgb[rendered[:,:,3] == 0] = 0
    rendered[:,:,:3] = rgb
    return Image.fromarray(rendered, 'RGBA')
for size in [16, 32, 48, 128]:
    fit_icon(size).save(root / f'icons/icon-{size}.png')
result = fit_icon(128)
result.save(root / 'design/icon-transparent.png')
result.save(root / 'design/icon-orange-brand-99.png')
# Checkerboard is a preview only, never part of the actual icon.
preview = Image.new('RGBA', (512, 288), '#f4f4f1')
for yy in range(0, 288, 16):
    for xx in range(0, 256, 16):
        if (xx//16 + yy//16) % 2:
            preview.paste('#d9ddd9', (xx, yy, xx+16, yy+16))
preview.paste('#202421', (256, 0, 512, 288))
for xx in [64, 320]:
    preview.alpha_composite(result, (xx, 24))
    offset = xx - 16
    for size in [16, 32, 48]:
        preview.alpha_composite(Image.open(root / f'icons/icon-{size}.png').convert('RGBA'), (offset, 196))
        offset += size + 20
draw = ImageDraw.Draw(preview)
draw.rectangle((16, 260, 64, 280), fill=tuple(int(channel) for channel in brand), outline='#a8b5ac')
draw.text((74, 263), '#e9eeea', fill='#304b39')
preview.convert('RGB').save(root / 'design/icon-preview.png')
preview.convert('RGB').save(root / 'design/icon-orange-brand-99-preview.png')
print('Transparent PNGs generated at 16, 32, 48 and 128 px.')
