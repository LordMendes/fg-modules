"""Fantasy Grounds module compatibility reviewer."""

from __future__ import annotations

import json
import re
import shutil
import tempfile
import xml.etree.ElementTree as ET
import zipfile
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Literal

from .html_utils import _INVALID_XML_RE
from .validators.class_skills import (
    FG_SKILL_NAMES,
    parse_classskill_names,
    validate_class_skill_automation,
)
from .validators.class_spellcasting import (
    summarize_spellclass_readiness,
    validate_class_spellcasting_automation,
)

Severity = Literal["error", "warning", "info"]

VALID_BAB = frozenset({"Fast", "Medium", "Slow"})
VALID_SAVES = frozenset({"Good", "Bad"})
VALID_CLASS_TYPES = frozenset({"base", "prestige"})
TYPED_SCALAR_TAGS = frozenset(
    {
        "name",
        "school",
        "level",
        "castingtime",
        "range",
        "effect",
        "duration",
        "save",
        "sr",
        "components",
        "shortdescription",
        "summary",
        "type",
        "prerequisites",
        "flavor",
        "hitdie",
        "bab",
        "fort",
        "ref",
        "will",
        "classtype",
        "classskills",
        "aura",
        "cost",
        "cl",
        "author",
        "category",
        "ruleset",
    }
)
TYPED_NUMBER_TAGS = frozenset({"skillranks", "weight", "cl", "mult", "stack"})
TYPED_FORMATTED_TAGS = frozenset(
    {"description", "benefit", "normal", "special", "text", "requirements"}
)
MALFORMED_SKILL_ARTIFACTS = re.compile(r"(?:^|,\s*)(?:engineering\)|royalty\))(?:\s|,|$)")

REQUIRED_ROOT_ATTRS = ("version", "dataversion", "release")
EXPECTED_VERSION = "4.4"
EXPECTED_RULESET = "3.5E"


@dataclass
class ReviewIssue:
    code: str
    severity: Severity
    category: str
    record_name: str
    message: str
    remediation: str = ""

    def to_dict(self) -> dict[str, str]:
        return {
            "code": self.code,
            "severity": self.severity,
            "category": self.category,
            "record_name": self.record_name,
            "message": self.message,
            "remediation": self.remediation,
        }


@dataclass
class ReviewReport:
    module_name: str
    module_path: str
    book_slug: str = ""
    load_ready: bool = True
    record_counts: dict[str, int] = field(default_factory=dict)
    build_warnings: list[str] = field(default_factory=list)
    spellclass_readiness: dict[str, int] = field(default_factory=dict)
    issues: list[ReviewIssue] = field(default_factory=list)

    @property
    def errors(self) -> list[ReviewIssue]:
        return [i for i in self.issues if i.severity == "error"]

    @property
    def warnings(self) -> list[ReviewIssue]:
        return [i for i in self.issues if i.severity == "warning"]

    @property
    def infos(self) -> list[ReviewIssue]:
        return [i for i in self.issues if i.severity == "info"]

    def add(self, issue: ReviewIssue) -> None:
        self.issues.append(issue)
        if issue.severity == "error" and issue.category == "packaging":
            self.load_ready = False

    def to_dict(self) -> dict[str, Any]:
        return {
            "module_name": self.module_name,
            "module_path": self.module_path,
            "book_slug": self.book_slug,
            "load_ready": self.load_ready,
            "automation_ready": self.load_ready and not self.warnings,
            "record_counts": self.record_counts,
            "build_warnings": self.build_warnings,
            "spellclass_readiness": self.spellclass_readiness,
            "totals": {
                "errors": len(self.errors),
                "warnings": len(self.warnings),
                "info": len(self.infos),
            },
            "issues": [i.to_dict() for i in self.issues],
        }


def _text(elem: ET.Element | None) -> str:
    if elem is None:
        return ""
    return "".join(elem.itertext()).strip()


def _typed_value(elem: ET.Element | None) -> str:
    return _text(elem)


def _formatted_has_content(elem: ET.Element | None) -> bool:
    if elem is None:
        return False
    return bool(_text(elem))


def _iter_record_containers(section: ET.Element) -> list[ET.Element]:
    if not list(section):
        return []
    if list(section)[0].tag == "category":
        return list(section)
    return [section]


def _iter_records(section: ET.Element) -> list[ET.Element]:
    records: list[ET.Element] = []
    for container in _iter_record_containers(section):
        for child in container:
            if child.tag.startswith("id-"):
                records.append(child)
    return records


def _check_id_sequence(
    report: ReviewReport,
    container: ET.Element,
    section_name: str,
) -> None:
    ids = [c.tag for c in container if c.tag.startswith("id-")]
    if not ids:
        return
    expected = 1
    for rec_id in ids:
        match = re.fullmatch(r"id-(\d+)", rec_id)
        if not match:
            report.add(
                ReviewIssue(
                    code="invalid_record_id",
                    severity="warning",
                    category=section_name,
                    record_name=rec_id,
                    message=f"Non-sequential record key: {rec_id}",
                    remediation="Use id-##### keys only.",
                )
            )
            continue
        num = int(match.group(1))
        if num != expected:
            report.add(
                ReviewIssue(
                    code="id_gap",
                    severity="warning",
                    category=section_name,
                    record_name=rec_id,
                    message=f"Expected id-{expected:05d}, found {rec_id}",
                    remediation="Preserve sequential id-##### keys within each section.",
                )
            )
            expected = num + 1
        else:
            expected += 1


def _check_typed_nodes(
    report: ReviewReport,
    node: ET.Element,
    section_name: str,
    record_name: str,
) -> None:
    for child in node:
        if child.tag in TYPED_SCALAR_TAGS:
            if child.get("type") != "string":
                report.add(
                    ReviewIssue(
                        code="missing_type_attr",
                        severity="warning",
                        category=section_name,
                        record_name=record_name,
                        message=f"Field '{child.tag}' should have type=\"string\"",
                        remediation="Add type attributes per FG export conventions.",
                    )
                )
        elif child.tag in TYPED_NUMBER_TAGS:
            if child.get("type") not in ("number", "string"):
                report.add(
                    ReviewIssue(
                        code="missing_type_attr",
                        severity="info",
                        category=section_name,
                        record_name=record_name,
                        message=f"Field '{child.tag}' should have type=\"number\" or type=\"string\"",
                        remediation="Add type attributes per FG export conventions.",
                    )
                )
        elif child.tag in TYPED_FORMATTED_TAGS:
            if child.get("type") != "formattedtext":
                report.add(
                    ReviewIssue(
                        code="missing_type_attr",
                        severity="warning",
                        category=section_name,
                        record_name=record_name,
                        message=f"Field '{child.tag}' should have type=\"formattedtext\"",
                        remediation="Add type attributes per FG export conventions.",
                    )
                )


def _check_class_record(report: ReviewReport, node: ET.Element) -> None:
    name = _typed_value(node.find("name")) or node.tag
    section = "class"

    required = {
        "name": "string",
        "hitdie": "string",
        "bab": "string",
        "fort": "string",
        "ref": "string",
        "will": "string",
        "classtype": "string",
    }
    for tag, _ in required.items():
        elem = node.find(tag)
        if elem is None or not _typed_value(elem):
            report.add(
                ReviewIssue(
                    code="class_missing_field",
                    severity="warning",
                    category=section,
                    record_name=name,
                    message=f"Missing required field: {tag}",
                    remediation="Rebuild class with complete identity fields.",
                )
            )

    bab = _typed_value(node.find("bab"))
    if bab and bab not in VALID_BAB:
        report.add(
            ReviewIssue(
                code="class_invalid_bab",
                severity="warning",
                category=section,
                record_name=name,
                message=f"Invalid BAB progression: {bab!r}",
                remediation="Use Fast, Medium, or Slow.",
            )
        )

    for save_tag in ("fort", "ref", "will"):
        val = _typed_value(node.find(save_tag))
        if val and val not in VALID_SAVES:
            report.add(
                ReviewIssue(
                    code="class_invalid_save",
                    severity="warning",
                    category=section,
                    record_name=name,
                    message=f"Invalid {save_tag} save: {val!r}",
                    remediation="Use Good or Bad.",
                )
            )

    classtype = _typed_value(node.find("classtype"))
    if classtype and classtype not in VALID_CLASS_TYPES:
        report.add(
            ReviewIssue(
                code="class_invalid_type",
                severity="warning",
                category=section,
                record_name=name,
                message=f"Invalid classtype: {classtype!r}",
                remediation="Use base or prestige.",
            )
        )

    if classtype == "prestige":
        req = node.find("requirements")
        if not _formatted_has_content(req):
            report.add(
                ReviewIssue(
                    code="class_missing_requirements",
                    severity="warning",
                    category=section,
                    record_name=name,
                    message="Prestige class missing requirements formattedtext",
                    remediation="Add requirements block for prestige classes.",
                )
            )

    features = node.find("classfeatures")
    if features is None or not list(features):
        report.add(
            ReviewIssue(
                code="class_no_features",
                severity="warning",
                category=section,
                record_name=name,
                message="No classfeatures defined",
                remediation="Add at least one class feature with level, name, and text.",
            )
        )
    else:
        for feat in features:
            if feat.find("level") is None or feat.find("name") is None:
                report.add(
                    ReviewIssue(
                        code="class_feature_incomplete",
                        severity="warning",
                        category=section,
                        record_name=name,
                        message=f"Class feature {feat.tag} missing level or name",
                        remediation="Each class feature needs level and name fields.",
                    )
                )

    skillranks_elem = node.find("skillranks")
    skillranks: int | None = None
    if skillranks_elem is not None and skillranks_elem.get("type") == "number":
        try:
            skillranks = int(_typed_value(skillranks_elem))
        except ValueError:
            skillranks = None

    classskills = _typed_value(node.find("classskills"))

    for warning in validate_class_skill_automation(
        name,
        {},
        classskills=classskills,
        skill_ranks=skillranks,
    ):
        code = "class_automation_gap"
        remediation = "Add missing class automation fields and rebuild."
        if "missing skillranks" in warning:
            code = "class_missing_skillranks"
            remediation = 'Add skillranks as type="number".'
        elif "skillranks is" in warning:
            code = "class_invalid_skillranks"
            remediation = "Set skillranks to a positive integer."
        elif "missing classskills" in warning:
            code = "class_missing_classskills"
            remediation = "Add comma-separated classskills string."
        elif "unknown class skill" in warning:
            code = "class_unknown_skill"
            remediation = (
                "Verify skill exists in 3.5E ruleset or optional supplement module."
            )
            if any(
                s in warning
                for s in ("Autohypnosis", "Psicraft", "Use Psionic Device")
            ):
                remediation = (
                    "Psionic skills require Expanded Psionics Handbook module loaded."
                )

        report.add(
            ReviewIssue(
                code=code,
                severity="warning",
                category=section,
                record_name=name,
                message=warning.split(": ", 1)[-1],
                remediation=remediation,
            )
        )

    if classskills and MALFORMED_SKILL_ARTIFACTS.search(classskills):
        report.add(
            ReviewIssue(
                code="class_malformed_classskills",
                severity="warning",
                category=section,
                record_name=name,
                message="Malformed classskills tokens (engineering), royalty)) from Knowledge sub-skill parse bug",
                remediation="Fix classskills parser in classes.py and rebuild module.",
            )
        )

    if classskills:
        unknown = [
            s
            for s in parse_classskill_names(classskills)
            if s not in FG_SKILL_NAMES and not MALFORMED_SKILL_ARTIFACTS.search(s)
        ]
        for skill in unknown:
            if skill in ("Scry", "Innuendo", "Control Shape"):
                report.add(
                    ReviewIssue(
                        code="class_legacy_skill",
                        severity="info",
                        category=section,
                        record_name=name,
                        message=f"Legacy/optional 3.5E skill: {skill}",
                        remediation="Manually select class skills in FG if using optional rules.",
                    )
                )

    for code, severity, message in validate_class_spellcasting_automation(
        name,
        {},
        features=[
            {
                "level": int(_typed_value(feat.find("level")) or 0),
                "name": _typed_value(feat.find("name")),
                "text": _text(feat.find("text")),
            }
            for feat in (features or [])
        ],
    ):
        remediation = "Normalize Spells feature text and rebuild module."
        if code == "class_missing_spells_feature":
            remediation = (
                "Rename primary caster Spellcasting feature to Spells and include "
                "'score equal to' ability text."
            )
        elif code == "class_missing_spells_per_day":
            remediation = (
                "Emit Spells per Day classfeatures for prestige spellcasting advancement rows."
            )
        elif code == "class_spell_variant_reference_only":
            remediation = "Expected for variant classes that modify an existing caster."

        report.add(
            ReviewIssue(
                code=code,
                severity=severity,
                category=section,
                record_name=name,
                message=message,
                remediation=remediation,
            )
        )

    _check_typed_nodes(report, node, section, name)


def _check_spell_record(report: ReviewReport, node: ET.Element) -> None:
    name = _typed_value(node.find("name")) or node.tag
    section = "spell"

    required = (
        "name",
        "school",
        "level",
        "castingtime",
        "range",
        "duration",
        "save",
        "sr",
    )
    for tag in required:
        elem = node.find(tag)
        if elem is None or not _typed_value(elem):
            report.add(
                ReviewIssue(
                    code="spell_missing_field",
                    severity="warning",
                    category=section,
                    record_name=name,
                    message=f"Missing required field: {tag}",
                    remediation="Rebuild spell with complete reference fields.",
                )
            )

    desc = node.find("description")
    short = node.find("shortdescription")
    has_desc = _formatted_has_content(desc)
    has_short = bool(_typed_value(short))
    if not has_desc and not has_short:
        report.add(
            ReviewIssue(
                code="spell_missing_description",
                severity="warning",
                category=section,
                record_name=name,
                message="Missing description and shortdescription",
                remediation="Add description formattedtext or shortdescription string.",
            )
        )

    actions = node.find("actions")
    if actions is None:
        report.add(
            ReviewIssue(
                code="spell_missing_actions",
                severity="warning",
                category=section,
                record_name=name,
                message="Missing <actions> block with cast action",
                remediation="Enable spell_actions in builder for FG spell power automation.",
            )
        )
    else:
        cast_found = False
        for action in actions:
            type_elem = action.find("type")
            if type_elem is not None and _typed_value(type_elem) == "cast":
                cast_found = True
                break
        if not cast_found:
            report.add(
                ReviewIssue(
                    code="spell_missing_cast_action",
                    severity="warning",
                    category=section,
                    record_name=name,
                    message="Actions block present but no cast action found",
                    remediation="Add cast action per fg-35e-spell-action-mapping.",
                )
            )

    _check_typed_nodes(report, node, section, name)


def _check_feat_record(report: ReviewReport, node: ET.Element) -> None:
    name = _typed_value(node.find("name")) or node.tag
    section = "feat"

    for tag in ("name", "type"):
        elem = node.find(tag)
        if elem is None or not _typed_value(elem):
            report.add(
                ReviewIssue(
                    code="feat_missing_field",
                    severity="warning",
                    category=section,
                    record_name=name,
                    message=f"Missing required field: {tag}",
                    remediation="Add feat identity fields.",
                )
            )

    benefit = node.find("benefit")
    if not _formatted_has_content(benefit):
        report.add(
            ReviewIssue(
                code="feat_missing_benefit",
                severity="warning",
                category=section,
                record_name=name,
                message="Missing benefit formattedtext",
                remediation="Add benefit paragraph per feat-fg-wiki-json conventions.",
            )
        )

    summary = node.find("summary")
    if summary is None or not _typed_value(summary):
        report.add(
            ReviewIssue(
                code="feat_missing_summary",
                severity="info",
                category=section,
                record_name=name,
                message="Missing summary string (recommended for FG feat list)",
                remediation="Add one-line summary string.",
            )
        )

    _check_typed_nodes(report, node, section, name)


def _check_item_record(report: ReviewReport, node: ET.Element) -> None:
    name = _typed_value(node.find("name")) or node.tag
    section = "item"

    if node.find("name") is None or not _typed_value(node.find("name")):
        report.add(
            ReviewIssue(
                code="item_missing_name",
                severity="warning",
                category=section,
                record_name=name,
                message="Missing item name",
                remediation="Add name type=\"string\".",
            )
        )

    cost = node.find("cost")
    if cost is None or not _typed_value(cost):
        report.add(
            ReviewIssue(
                code="item_missing_cost",
                severity="warning",
                category=section,
                record_name=name,
                message="Missing cost field",
                remediation="Add cost string from scraped price.",
            )
        )

    desc = node.find("description")
    if not _formatted_has_content(desc):
        report.add(
            ReviewIssue(
                code="item_missing_description",
                severity="warning",
                category=section,
                record_name=name,
                message="Missing item description",
                remediation="Add description formattedtext.",
            )
        )

    _check_typed_nodes(report, node, section, name)


def _validate_definition(report: ReviewReport, def_path: Path) -> ET.Element | None:
    try:
        root = ET.parse(def_path).getroot()
    except ET.ParseError as exc:
        report.add(
            ReviewIssue(
                code="definition_parse_error",
                severity="error",
                category="packaging",
                record_name="definition.xml",
                message=str(exc),
                remediation="Fix malformed definition.xml.",
            )
        )
        return None

    for attr in REQUIRED_ROOT_ATTRS:
        if not root.get(attr):
            report.add(
                ReviewIssue(
                    code="definition_missing_attr",
                    severity="error",
                    category="packaging",
                    record_name="definition.xml",
                    message=f"Missing root attribute: {attr}",
                    remediation="Preserve version, dataversion, and release from FG builder.",
                )
            )

    if root.get("version") and root.get("version") != EXPECTED_VERSION:
        report.add(
            ReviewIssue(
                code="definition_version_mismatch",
                severity="warning",
                category="packaging",
                record_name="definition.xml",
                message=f"Unexpected version: {root.get('version')}",
                remediation=f"Expected version={EXPECTED_VERSION}.",
            )
        )

    ruleset = root.find("ruleset")
    if ruleset is None or _typed_value(ruleset) != EXPECTED_RULESET:
        report.add(
            ReviewIssue(
                code="definition_wrong_ruleset",
                severity="error",
                category="packaging",
                record_name="definition.xml",
                message=f"ruleset must be {EXPECTED_RULESET}",
                remediation="Set ruleset to 3.5E in definition.xml.",
            )
        )

    name_elem = root.find("name")
    if name_elem is not None and _typed_value(name_elem):
        report.module_name = _typed_value(name_elem)

    return root


def _validate_db_xml(report: ReviewReport, db_path: Path) -> ET.Element | None:
    raw = db_path.read_bytes()
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError as exc:
        report.add(
            ReviewIssue(
                code="db_encoding_error",
                severity="error",
                category="packaging",
                record_name="db.xml",
                message=str(exc),
                remediation="Use UTF-8 encoding.",
            )
        )
        return None

    if _INVALID_XML_RE.search(text):
        report.add(
            ReviewIssue(
                code="db_invalid_control_chars",
                severity="error",
                category="packaging",
                record_name="db.xml",
                message="Contains illegal XML control characters",
                remediation="Run sanitize_xml_text during build.",
            )
        )

    try:
        root = ET.fromstring(text)
    except ET.ParseError as exc:
        report.add(
            ReviewIssue(
                code="db_parse_error",
                severity="error",
                category="packaging",
                record_name="db.xml",
                message=str(exc),
                remediation="Fix malformed db.xml.",
            )
        )
        return None

    for attr in REQUIRED_ROOT_ATTRS:
        if not root.get(attr):
            report.add(
                ReviewIssue(
                    code="db_missing_attr",
                    severity="warning",
                    category="packaging",
                    record_name="db.xml",
                    message=f"Missing root attribute: {attr}",
                    remediation="Preserve FG root attributes on db.xml.",
                )
            )

    section_handlers = {
        "class": _check_class_record,
        "spell": _check_spell_record,
        "feat": _check_feat_record,
        "item": _check_item_record,
    }

    spellclass_records: list[tuple[str, list[tuple[str, str]]]] = []

    for section in root:
        handler = section_handlers.get(section.tag)
        if handler is None:
            continue

        report.record_counts[section.tag] = len(_iter_records(section))

        for container in _iter_record_containers(section):
            _check_id_sequence(report, container, section.tag)

        for record in _iter_records(section):
            handler(report, record)
            if section.tag == "class":
                class_name = _typed_value(record.find("name")) or record.tag
                feat_nodes = record.find("classfeatures")
                feature_pairs = []
                if feat_nodes is not None:
                    for feat in feat_nodes:
                        feat_name = _typed_value(feat.find("name"))
                        feat_text = _text(feat.find("text"))
                        feature_pairs.append((feat_name, feat_text))
                spellclass_records.append((class_name, feature_pairs))

    if spellclass_records:
        report.spellclass_readiness = summarize_spellclass_readiness(
            spellclass_records
        )

    if not report.record_counts:
        report.add(
            ReviewIssue(
                code="db_empty",
                severity="error",
                category="packaging",
                record_name="db.xml",
                message="No class/feat/spell/item records found",
                remediation="Rebuild module from scraped JSON.",
            )
        )

    return root


_CATEGORY_ALIASES = {
    "classes": "class",
    "feats": "feat",
    "spells": "spell",
    "items": "item",
    "skills": "skill",
    "races": "race",
}


def _load_build_report(module_dir: Path, report: ReviewReport) -> None:
    path = module_dir / "build_report.json"
    if not path.exists():
        return
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        report.add(
            ReviewIssue(
                code="build_report_invalid",
                severity="info",
                category="packaging",
                record_name="build_report.json",
                message="Could not parse build_report.json",
                remediation="Regenerate module to embed build report.",
            )
        )
        return

    report.book_slug = data.get("book_slug", "")
    written = data.get("written") or {}
    for key, count in written.items():
        normalized = _CATEGORY_ALIASES.get(key, key)
        if normalized not in report.record_counts:
            report.record_counts[normalized] = count

    for warning in data.get("warnings") or []:
        report.build_warnings.append(warning)


def _validate_packaging(report: ReviewReport, module_dir: Path) -> bool:
    def_xml = module_dir / "definition.xml"
    db_xml = module_dir / "db.xml"

    if not def_xml.exists():
        report.add(
            ReviewIssue(
                code="missing_definition",
                severity="error",
                category="packaging",
                record_name="definition.xml",
                message="definition.xml not found at module root",
                remediation="Package definition.xml at archive root.",
            )
        )
        return False

    if not db_xml.exists():
        report.add(
            ReviewIssue(
                code="missing_db",
                severity="error",
                category="packaging",
                record_name="db.xml",
                message="db.xml not found at module root",
                remediation="Package db.xml at archive root.",
            )
        )
        return False

    _validate_definition(report, def_xml)
    _validate_db_xml(report, db_xml)
    _load_build_report(module_dir, report)
    return True


def review_module_path(module_path: Path) -> ReviewReport:
    """Review an unpacked module folder or a packaged .mod/.zip archive."""
    module_path = Path(module_path).resolve()
    report = ReviewReport(
        module_name=module_path.stem,
        module_path=str(module_path),
    )

    if module_path.is_dir():
        _validate_packaging(report, module_path)
        return report

    if module_path.suffix.lower() not in (".mod", ".zip"):
        report.add(
            ReviewIssue(
                code="unsupported_format",
                severity="error",
                category="packaging",
                record_name=str(module_path),
                message="Expected .mod, .zip, or unpacked folder",
                remediation="Point to a valid FG module archive.",
            )
        )
        return report

    try:
        with zipfile.ZipFile(module_path, "r") as zf:
            names = zf.namelist()
            if "definition.xml" not in names or "db.xml" not in names:
                report.add(
                    ReviewIssue(
                        code="archive_missing_files",
                        severity="error",
                        category="packaging",
                        record_name=module_path.name,
                        message="Archive missing definition.xml or db.xml at root",
                        remediation="Repackage with definition.xml and db.xml at archive root.",
                    )
                )
                return report
    except zipfile.BadZipFile as exc:
        report.add(
            ReviewIssue(
                code="bad_zip",
                severity="error",
                category="packaging",
                record_name=module_path.name,
                message=str(exc),
                remediation="Rebuild .mod as a valid ZIP archive.",
            )
        )
        return report

    with tempfile.TemporaryDirectory(prefix="fg-review-") as tmp:
        tmp_dir = Path(tmp)
        with zipfile.ZipFile(module_path, "r") as zf:
            zf.extractall(tmp_dir)
        _validate_packaging(report, tmp_dir)

    return report
