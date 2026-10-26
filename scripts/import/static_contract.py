#!/usr/bin/env python3
"""Read the website's hand-curated slug contract (apps/web/src/lib/data/banks.ts).

The static records own a set of already-published URLs. Database imports must
never assign one of those slugs to a *different* institution: the website
resolves detail pages with `institutions.find(slug)`, so a colliding row either
shadows a static page or becomes unreachable itself.

Imports use `website_static_slugs()` to suffix the colliding candidates with
"-<id>" (the V17 rule), while export_snapshot.py uses it to warn when a row
still collides (the two intended folds - AU/CN by slug equality and the GB
barclays / lloyds-bank records - are exempted by the caller).
"""

from __future__ import annotations

import re
from pathlib import Path

BANKS_TS = (
    Path(__file__).resolve().parents[2]
    / "apps/web/src/lib/data/banks.ts"
)

_SLUG_RE = re.compile(r'^\s*slug: "([^"]+)"', re.MULTILINE)


def website_static_slugs() -> set[str]:
    """Every slug published by the static dataset; empty when banks.ts is absent."""
    if not BANKS_TS.exists():
        return set()
    return set(_SLUG_RE.findall(BANKS_TS.read_text(encoding="utf-8")))
