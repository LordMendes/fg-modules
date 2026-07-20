"""Category converters registry."""

from __future__ import annotations

from typing import Callable

import xml.etree.ElementTree as ET

from ..loader import BuildReport
from .classes import convert_classes
from .feats import convert_feats
from .items import convert_items
from .races import convert_races
from .skills import convert_skills
from .spells import convert_spells

ConverterFn = Callable[..., ET.Element | None]

CONVERTERS: dict[str, ConverterFn] = {
    "spells": convert_spells,
    "feats": convert_feats,
    "classes": convert_classes,
    "skills": convert_skills,
    "items": convert_items,
    "races": convert_races,
}
