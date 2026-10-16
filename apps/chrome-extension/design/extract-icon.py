"""Render final icons and store artwork from the editable SVG master.
The legacy raster extraction is archived in archive/extract-icon-raster.py.
Requires Node.js and sharp; ISNIPS_SHARP_MODULE may specify the sharp entry file.
"""
from pathlib import Path
import os
import subprocess

renderer = Path(__file__).resolve().with_name('render-assets.cjs')
subprocess.run([os.environ.get('ISNIPS_NODE', 'node'), str(renderer)], check=True)
