"""Monster speed lines keep every movement mode."""

from scraper.monster_speed import (
    format_monster_speed,
    speed_adds_modes,
    speed_mode_names,
)
from scraper.repair_monster_speeds import (
    apply_speed_candidate,
    parse_srd_speed_entries,
    select_monster_records,
    index_monsters_by_name,
)


def test_eagle_srd_speed_includes_fly() -> None:
    formatted = format_monster_speed("10 ft. (2 squares), fly 80 ft. (average)")
    assert formatted == "Land 10 ft., Fly 80 ft. (average)"
    assert speed_mode_names(formatted) == {"land", "fly"}


def test_eagle_land_only_stays_land() -> None:
    assert format_monster_speed("Land 10 ft") == "Land 10 ft."


def test_gargoyle_classic_speed_includes_fly() -> None:
    formatted = format_monster_speed("40 ft. , Fly 60 ft. (Average)")
    assert formatted == "Land 40 ft., Fly 60 ft. (average)"


def test_aarakocra_drops_duplicated_land_prefix() -> None:
    formatted = format_monster_speed("land 20 ft, 20 ft., fly 90 ft. (average)")
    assert formatted == "Land 20 ft., Fly 90 ft. (average)"


def test_baboon_land_only() -> None:
    assert format_monster_speed("Land 40 ft") == "Land 40 ft."
    assert speed_mode_names("Land 40 ft") == {"land"}


def test_swim_climb_burrow_and_perfect_fly() -> None:
    assert format_monster_speed("Swim 60 ft, Swim 60 ft.") == "Swim 60 ft."
    assert format_monster_speed("40 ft, 40 ft., climb 20 ft.") == "Land 40 ft., Climb 20 ft."
    assert (
        format_monster_speed("30 ft. (6 squares), burrow 10 ft.")
        == "Land 30 ft., Burrow 10 ft."
    )
    assert format_monster_speed("Fly (Perfect) 100 ft") == "Fly 100 ft. (perfect)"


def test_armored_land_speed_keeps_base() -> None:
    formatted = format_monster_speed("Land 20 ft, in scale mail; base 30 ft.")
    assert formatted == "Land 20 ft. (in scale mail), Land 30 ft. (base)"


def test_srd_eagle_block_parses_fly_speed() -> None:
    html = """
    <h3><a id="eagle" name="eagle"></a>EAGLE</h3>
    <span class="stat-block"><b>Hit Dice</b>: 1d8+1 (5 hp)</span>
    <span class="stat-block"><b>Speed</b>: 10 ft. (2 squares), fly 80 ft. (average)</span>
    <h3><a id="elephant"></a>ELEPHANT</h3>
    <span class="stat-block"><b>Hit Dice</b>: 11d8+55 (104 hp)</span>
    <span class="stat-block"><b>Speed</b>: 40 ft. (8 squares)</span>
    """
    entries = parse_srd_speed_entries(html)
    assert entries[0] == ("EAGLE", "1d8+1 (5 hp)", "10 ft. (2 squares), fly 80 ft. (average)")
    nested = """
    <h3><a id="angel"></a>ANGEL</h3>
    <h5><a id="solar-angel"></a>ANGEL, SOLAR</h5>
    <span class="stat-block"><b>Hit Dice</b>: 22d8+110 (209 hp)</span>
    <span class="stat-block"><b>Speed</b>: 50 ft. (10 squares), fly 150 ft. (good)</span>
    """
    solar = parse_srd_speed_entries(nested)
    assert solar == [("ANGEL, SOLAR", "22d8+110 (209 hp)", "50 ft. (10 squares), fly 150 ft. (good)")]
    dragon = """
    <h5>BLACK DRAGON</h5>
    <table>
      <tr><td>Wyrmling</td><td>60 ft., fly 100 ft. (average), swim 60 ft.</td></tr>
      <tr><td>Adult</td><td>60 ft., fly 150 ft. (poor), swim 60 ft.</td></tr>
    </table>
    """
    ages = parse_srd_speed_entries(dragon)
    assert ("Black Dragon, Wyrmling", "", "60 ft., fly 100 ft. (average), swim 60 ft.") in ages
    assert ("Black Dragon, Adult", "", "60 ft., fly 150 ft. (poor), swim 60 ft.") in ages
    eagle = {"slug": "eagle-550", "name": "Eagle", "hit_dice": "1d8+1 (5 hp)", "speed": "Land 10 ft"}
    baboon = {"slug": "baboon-532", "name": "Baboon", "hit_dice": "1d8+1 (5 hp)", "speed": "Land 40 ft"}
    by_name = index_monsters_by_name([eagle, baboon])
    matched = select_monster_records(by_name, "EAGLE", "1d8+1 (5 hp)")
    assert [record["slug"] for record in matched] == ["eagle-550"]
    assert apply_speed_candidate(eagle, entries[0][2]) == "Land 10 ft., Fly 80 ft. (average)"
    assert apply_speed_candidate(baboon, "40 ft. (8 squares)") is None


def test_candidate_adds_fly() -> None:
    assert speed_adds_modes("Land 10 ft", "10 ft. (2 squares), fly 80 ft. (average)")
    assert not speed_adds_modes(
        "land 20 ft, 20 ft., fly 90 ft. (average)",
        "20 ft., fly 90 ft. (average)",
    )
    assert not speed_adds_modes("Land 40 ft", "40 ft.")
