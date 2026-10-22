"""WoW weapons must use the 3.5E item weapon fields."""

import json
from pathlib import Path

from scraper.dndtools_adapter import convert_item
from scraper.fg.converters.items import convert_items
from scraper.fg.loader import BuildReport
from scraper.fg.xml_builder import IdAllocator

EQUIPMENT = (
    Path(__file__).resolve().parents[3]
    / "dndtools-reference"
    / "data"
    / "dndtools"
    / "supplemental"
    / "wowrpg_core_equipment.json"
)


def _weapon(name: str, **extra: object) -> dict:
    record = {
        "slug": "sample-wow",
        "name": name,
        "kind": "weapon",
        "category": "simple",
        "cost": "1 gp",
        "weight": "1 lb.",
        "damage_m": "1d8",
        "damage_s": "1d6",
        "critical": "x2",
        "range_increment": "-",
        "damage_type": "S",
        "handed": "1H",
    }
    record.update(extra)
    return record


def test_longsword_uses_martial_melee_fields():
    item = convert_item(_weapon("Longsword", critical="19-20/x2"), "wow", mundane=True)
    detail = item["detail"]
    assert detail["item_type"] == "Weapon"
    assert detail["subtype"] == "Martial One-Handed Melee"
    assert detail["damage"] == "1d8"
    assert detail["damagetype"] == "Slashing"
    assert detail["critical"] == "19-20/x2"
    assert detail["range"] == 0
    assert detail["properties"] == ""


def test_dagger_is_thrown_light_melee():
    item = convert_item(
        _weapon("Dagger", damage_m="1d4", damage_s="1d3", critical="19-20/x2", range_increment="10 ft.", damage_type="P"),
        "wow",
        mundane=True,
    )
    detail = item["detail"]
    assert detail["subtype"] == "Simple Light Melee"
    assert detail["range"] == 10
    assert detail["damagetype"] == "Piercing"
    assert detail["properties"] == ""


def test_quarterstaff_is_double_and_two_handed():
    item = convert_item(
        _weapon("Quarterstaff", damage_m="1d6/1d6", damage_s="1d4/1d4", damage_type="B", handed="2H"),
        "wow",
        mundane=True,
    )
    detail = item["detail"]
    assert detail["subtype"] == "Simple Two-Handed Melee"
    assert detail["damage"] == "1d6/1d6"
    assert detail["properties"] == "Double"


def test_firearm_subtype_excludes_strength():
    item = convert_item(
        _weapon("Flintlock pistol", damage_m="3d6", critical="x3", range_increment="20 ft.", damage_type="P", handed="ranged"),
        "wow",
        mundane=True,
    )
    detail = item["detail"]
    assert "firearm" in detail["subtype"].lower()
    assert "melee" not in detail["subtype"].lower()
    assert detail["range"] == 20
    assert detail["mr"] == 1
    assert detail["mrtable"] == "Malfunction Effects"
    assert "malfunction" not in detail


def test_firearm_mr_writes_to_item_xml():
    item = convert_item(
        _weapon("Long rifle", damage_m="3d6", critical="x3", range_increment="200 ft.", damage_type="P", handed="ranged"),
        "wow",
        mundane=True,
    )
    section = convert_items([item], "WoW", BuildReport(), IdAllocator())
    node = section.find(".//id-00001")
    assert node.find("mr").text == "1"
    assert node.find("mrtable").text == "Malfunction Effects"
    assert node.find("range").text == "200"


def test_tech_device_mr_from_description():
    item = convert_item(
        {
            "name": "Basic Boomstick",
            "kind": "good",
            "category": "technological device",
            "cost": "2,900 gp",
            "weight": "25 lb.",
            "description_text": "Hardness 3; 5 hp; Size Tiny; Weight 25 lb.; MR 2; TS 15, Craft DC 35; Price 2,900 gp.",
        },
        "wow",
        mundane=True,
    )
    assert item["detail"]["mr"] == 2
    assert item["detail"]["mrtable"] == "Malfunction Effects"
    section = convert_items([item], "WoW", BuildReport(), IdAllocator())
    node = section.find(".//id-00001")
    assert node.find("type").text == "Goods and Services"
    assert node.find("mr").text == "2"
    assert node.find("mrtable").text == "Malfunction Effects"


def test_named_malfunction_is_a_message_not_a_table_roll():
    item = convert_item(
        {
            "name": "Pulley Gun",
            "kind": "good",
            "category": "technological device",
            "cost": "160 gp",
            "weight": "6 lb.",
            "description_text": "Malfunction: Balky. Hardness 3; 5 hp; Weight 6 lb.; MR 1; TS 4, Craft DC 14; Price 160 gp.",
        },
        "wow",
        mundane=True,
    )
    assert item["detail"]["mr"] == 1
    assert item["detail"]["malfunction"].startswith("Balky:")
    assert "mrtable" not in item["detail"]


def test_glued_price_is_split_out_of_the_name():
    item = convert_item(
        _weapon("Sword, two-bladed 100 gp", cost="-", damage_m="1d8/1d8", critical="19-20/x2", handed="2H"),
        "wow",
        mundane=True,
    )
    assert item["name"] == "Sword, two-bladed"
    assert item["detail"]["price"] == "100 gp"
    assert item["detail"]["properties"] == "Double"
    assert item["detail"]["subtype"] == "Exotic Two-Handed Melee"


def test_wrpg_flintlock_uses_weapon_fields_not_the_description():
    item = convert_item(
        _weapon(
            "Flintlock Pistol",
            damage_m="3d6",
            damage_s="2d6",
            critical="\u00d7" + "3",
            range_increment="5 ft.",
            damage_type="P",
            handed="1H",
            category="exotic",
        ),
        "wrpg",
        mundane=True,
    )
    detail = item["detail"]
    assert detail["damage"] == "3d6"
    assert detail["damagetype"] == "Piercing"
    assert detail["critical"] == "x3"
    assert detail["subtype"] == "Exotic Firearm"
    assert "Damage:" not in (detail.get("description_html") or "")


def test_wrpg_gun_with_special_damage_stays_a_firearm():
    item = convert_item(
        _weapon(
            "Blunderbuss",
            damage_m="Special",
            critical="\u00d7" + "3",
            range_increment="10 ft.",
            damage_type="P",
            handed="2H",
            category="exotic",
        ),
        "wrpg",
        mundane=True,
    )
    detail = item["detail"]
    assert detail["subtype"] == "Exotic Firearm"
    assert detail["damage"] == "Special"
    assert "melee" not in detail["subtype"].lower()


def test_times_sign_critical_becomes_ascii_x():
    item = convert_item(_weapon("Warblade", critical="\u00d7" + "2", category="martial"), "wrpg", mundane=True)
    assert item["detail"]["critical"] == "x2"


def test_every_wow_weapon_has_ruleset_fields():
    records = json.loads(EQUIPMENT.read_text(encoding="utf-8"))
    weapons = [record for record in records if record.get("kind") == "weapon"]
    assert len(weapons) == 60
    for record in weapons:
        item = convert_item(record, "wow", mundane=True)
        detail = item["detail"]
        subtype = detail["subtype"].lower()
        assert any(token in subtype for token in ("melee", "ranged", "firearm")), item["name"]
        assert detail["damage"]
        assert detail["damagetype"]
        assert detail["critical"].startswith("x") or "/x" in detail["critical"]
        assert " gp" not in item["name"]


def test_ammunition_is_not_an_attack():
    item = convert_item(
        {
            "slug": "arrows-20-wow",
            "name": "Arrows (20)",
            "kind": "good",
            "category": "ammunition",
            "cost": "1 gp",
            "weight": "3 lb.",
            "description_html": "<p>Quiver of 20 arrows.</p>",
        },
        "wow",
        mundane=True,
    )
    assert item["detail"]["item_type"] == "Goods and Services"
    assert item["detail"]["subtype"] == "Ammunition"
    assert "damage" not in item["detail"]


def test_weapon_xml_writes_ruleset_nodes():
    item = convert_item(_weapon("Greatsword", damage_m="2d6", critical="19-20/x2", handed="2H"), "wow", mundane=True)
    section = convert_items([item], "WoW", BuildReport(), IdAllocator())
    node = section.find(".//id-00001")
    assert node is not None
    assert node.find("type").text == "Weapon"
    assert node.find("subtype").text == "Martial Two-Handed Melee"
    assert node.find("damage").text == "2d6"
    assert node.find("damagetype").text == "Slashing"
    assert node.find("critical").text == "19-20/x2"
    assert node.find("range").text == "0"
    assert node.find("range").get("type") == "number"
    assert node.find("properties") is not None
    assert (node.find("properties").text or "") == ""
    tags = [child.tag for child in list(node) if child.tag != "effectlist"]
    assert tags[:10] == [
        "name",
        "cost",
        "weight",
        "damage",
        "critical",
        "range",
        "damagetype",
        "properties",
        "type",
        "subtype",
    ]


def test_longspear_reach_matches_basic_rules_properties():
    item = convert_item(
        _weapon("Longspear", damage_m="1d8", critical="x3", handed="2H", damage_type="P"),
        "wow",
        mundane=True,
    )
    assert item["detail"]["properties"] == "Reach"
    assert item["detail"]["subtype"] == "Simple Two-Handed Melee"
    assert item["detail"]["damagetype"] == "Piercing"


def test_padded_armor_writes_basic_rules_numbers():
    item = convert_item(
        {
            "name": "Padded",
            "kind": "armor",
            "category": "light",
            "cost": "5 gp",
            "weight": "10 lb.",
            "ac_bonus": "1",
            "max_dex": "8",
            "armor_check_penalty": "0",
            "arcane_spell_failure": "5%",
            "speed_30": "30",
            "speed_20": "20",
        },
        "wow",
        mundane=True,
    )
    section = convert_items([item], "WoW", BuildReport(), IdAllocator())
    node = section.find(".//id-00001")
    assert node.find("type").text == "Armor"
    assert node.find("subtype").text == "Light"
    assert node.find("ac").text == "1"
    assert node.find("maxstatbonus").text == "8"
    assert node.find("checkpenalty").text == "0"
    assert node.find("spellfailure").text == "5"
    assert node.find("speed30").text == "30"
    assert node.find("speed20").text == "20"


def test_buckler_is_armor_subtype_shield():
    item = convert_item(
        {
            "name": "Buckler",
            "kind": "shield",
            "category": "light",
            "cost": "15 gp",
            "weight": "5 lb.",
            "ac_bonus": "1",
            "armor_check_penalty": "-1",
            "arcane_spell_failure": "5%",
        },
        "wow",
        mundane=True,
    )
    detail = item["detail"]
    assert detail["item_type"] == "Armor"
    assert detail["subtype"] == "Shield"
    assert detail["checkpenalty"] == -1


def test_magic_weapon_copies_base_weapon_fields():
    item = convert_item(
        {
            "name": "Storm Hammer",
            "price": "8,500 gp",
            "weight": "8 lb.",
            "description_html": "<p>+1 shock warhammer dealing +1d6 electricity on a hit.</p>",
            "index": {"type": "Magic Weapon"},
        },
        "wrpg",
        mundane=False,
    )
    detail = item["detail"]
    assert detail["item_type"] == "Weapon"
    assert detail["damage"] == "1d8"
    assert detail["critical"] == "x3"
    assert detail["damagetype"] == "Bludgeoning"
    assert detail["subtype"] == "Martial One-Handed Melee"
    assert detail["bonus"] == 1

