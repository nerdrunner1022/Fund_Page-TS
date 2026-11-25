"""Extract the hero photograph embedded in the reference HTML into a static asset."""

import base64
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "Zahira College Trincomalee – Land Fund.html"
TARGET = ROOT / "apps" / "web" / "public" / "hero.jpg"

html = SOURCE.read_text(encoding="utf-8")
match = re.search(r"url\(data:image/jpeg;base64,([A-Za-z0-9+/=]+)\)", html)
if not match:
    raise SystemExit("No embedded JPEG found in the prototype.")

TARGET.parent.mkdir(parents=True, exist_ok=True)
TARGET.write_bytes(base64.b64decode(match.group(1)))
print(f"Wrote {TARGET} ({TARGET.stat().st_size} bytes)")
