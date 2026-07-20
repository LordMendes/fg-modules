from .base import parse_pagination_total, parse_table_rows
from .classes import parse_class_detail, parse_classes_index
from .feats import parse_feat_detail, parse_feats_index
from .items import parse_item_detail, parse_items_index
from .races import parse_race_detail, parse_races_index
from .skills import parse_skill_detail, parse_skills_index
from .spells import parse_spell_detail, parse_spells_index

INDEX_PARSERS = {
    "spells": parse_spells_index,
    "feats": parse_feats_index,
    "classes": parse_classes_index,
    "skills": parse_skills_index,
    "items": parse_items_index,
    "races": parse_races_index,
}

DETAIL_PARSERS = {
    "spells": parse_spell_detail,
    "feats": parse_feat_detail,
    "classes": parse_class_detail,
    "skills": parse_skill_detail,
    "items": parse_item_detail,
    "races": parse_race_detail,
}
