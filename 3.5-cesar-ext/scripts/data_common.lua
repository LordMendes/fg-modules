-- 
-- Please see the license.html file included with this distribution for 
-- attribution and copyright information.
--

function isPFRPG()
	return false;
end

resttypes = { "long", "short", };

-- Abilities (database names)
abilities = {
	"strength",
	"dexterity",
	"constitution",
	"intelligence",
	"wisdom",
	"charisma"
};

ability_ltos = {
	["strength"] = "STR",
	["dexterity"] = "DEX",
	["constitution"] = "CON",
	["intelligence"] = "INT",
	["wisdom"] = "WIS",
	["charisma"] = "CHA"
};

ability_stol = {
	["STR"] = "strength",
	["DEX"] = "dexterity",
	["CON"] = "constitution",
	["INT"] = "intelligence",
	["WIS"] = "wisdom",
	["CHA"] = "charisma"
};

-- Saves
save_ltos = {
	["fortitude"] = "FORT",
	["reflex"] = "REF",
	["will"] = "WILL"
};

save_stol = {
	["FORT"] = "fortitude",
	["REF"] = "reflex",
	["WILL"] = "will"
};

-- Values for alignment comparison
alignment_lawchaos = {
	["lawful"] = 1,
	["chaotic"] = 3,
	["l"] = 1,
	["c"] = 3,
	["lg"] = 1,
	["ln"] = 1,
	["le"] = 1,
	["cg"] = 3,
	["cn"] = 3,
	["ce"] = 3,
};
alignment_goodevil = {
	["good"] = 1,
	["evil"] = 3,
	["g"] = 1,
	["e"] = 3,
	["lg"] = 1,
	["le"] = 3,
	["ng"] = 1,
	["ne"] = 3,
	["cg"] = 1,
	["ce"] = 3,
};
alignment_neutral = "n";

-- Values for size comparison
creaturesize = {
	["fine"] = -4,
	["diminutive"] = -3,
	["tiny"] = -2,
	["small"] = -1,
	["medium"] = 0,
	["large"] = 1,
	["huge"] = 2,
	["gargantuan"] = 3,
	["colossal"] = 4,
	["epic"] = 5,
	["f"] = -4,
	["d"] = -3,
	["t"] = -2,
	["s"] = -1,
	["m"] = 0,
	["l"] = 1,
	["h"] = 2,
	["g"] = 3,
	["c"] = 4,
};
sizeCombatMod = {
	[-4] = 8,
	[-3] = 4,
	[-2] = 2,
	[-1] = 1,
	[0] = 0,
	[1] = -1,
	[2] = -2,
	[3] = -4,
	[4] = -8,
};

-- Values for creature type comparison
creaturehalftype = "half-";
-- NOTE: Multi-word types must come before single word types
creaturetype = { 
	"magical beast",
	"monstrous humanoid",
	"aberration",
	"animal",
	"construct",
	"dragon",
	"elemental",
	"fey",
	"giant",
	"humanoid",
	"ooze",
	"outsider",
	"plant",
	"undead",
	"vermin",
};
-- NOTE: Multi-word types must come before single word types
creaturesubtype = {
	"living construct", -- Monster subtypes
	"air",
	"angel",
	"aquatic",
	"archon",
	"augmented",
	"chaotic",
	"cold",
	"demon",
	"devil",
	"earth",
	"evil",
	"extraplanar",
	"fire",
	"good",
	"incorporeal",
	"lawful",
	"native",
	"psionic",
	"shapechanger",
	"swarm",
	"water",
	"aquatic", -- Humanoid subtypes
	"dwarf",
	"elf", 
	"gnoll",
	"gnome", 
	"goblinoid",
	"gnoll",
	"halfling",
	"human",
	"orc",
	"reptilian",
};

-- Conditions supported in effect conditionals and for token widgets
-- NOTE: From rules, missing dying, staggered and disabled
conditions = {
	"blinded", 
	"climbing",
	"confused",
	"cowering",
	"dazed",
	"dazzled",
	"deafened", 
	"entangled", 
	"ethereal",
	"exhausted",
	"fascinated",
	"fatigued",
	"flat-footed",
	"frightened", 
	"grappled", 
	"helpless",
	"incorporeal", 
	"invisible", 
	"kneeling",
	"nauseated",
	"panicked", 
	"paralyzed",
	"petrified",
	"pinned", 
	"prone", 
	"rebuked",
	"running",
	"shaken", 
	"sickened", 
	"sitting",
	"slowed", 
	"squeezing", 
	"stable", 
	"stunned",
	"turned",
	"unconscious",
};

-- Bonus/penalty effect types for token widgets
bonuscomps = {
	"INIT",
	"ABIL",
	"AC",
	"ATK",
	"CMB",
	"CMD",
	"DMG",
	"HEAL",
	"SAVE",
	"SKILL",
	"STR",
	"CON",
	"DEX",
	"INT",
	"WIS",
	"CHA",
	"FORT",
	"REF",
	"WILL"
};

-- Condition effect types for token widgets
condcomps = {
	["blinded"] = "cond_blinded",
	["confused"] = "cond_confused",
	["cowering"] = "cond_frightened",
	["dazed"] = "cond_dazed",
	["dazzled"] = "cond_dazed",
	["deafened"] = "cond_deafened",
	["entangled"] = "cond_restrained",
	["exhausted"] = "cond_weakened",
	["fascinated"] = "cond_charmed",
	["fatigued"] = "cond_weakened",
	["flat-footed"] = "cond_surprised",
	["flatfooted"] = "cond_surprised",
	["frightened"] = "cond_frightened",
	["grappled"] = "cond_grappled",
	["helpless"] = "cond_helpless",
	["incorporeal"] = "cond_incorporeal",
	["invisible"] = "cond_invisible",
	["nauseated"] = "cond_sickened",
	["panicked"] = "cond_frightened",
	["paralyzed"] = "cond_paralyzed",
	["petrified"] = "cond_paralyzed",
	["pinned"] = "cond_pinned",
	["prone"] = "cond_prone",
	["rebuked"] = "cond_turned",
	["shaken"] = "cond_frightened",
	["sickened"] = "cond_sickened",
	["slowed"] = "cond_slowed",
	["stunned"] = "cond_stunned",
	["turned"] = "cond_turned",
	["unconscious"] = "cond_unconscious",
	-- Similar to conditions
	["ca"] = "cond_advantage",
	["grantca"] = "cond_disadvantage",
	["conc"] = "cond_conceal",
	["tconc"] = "cond_conceal",
	["cover"] = "cond_cover",
	["scover"] = "cond_cover",
};

-- Other visible effect types for token widgets
othercomps = {
	["CONC"] = "cond_conceal",
	["TCONC"] = "cond_conceal",
	["COVER"] = "cond_cover",
	["SCOVER"] = "cond_cover",
	["NLVL"] = "cond_penalty",
	["IMMUNE"] = "cond_immune",
	["RESIST"] = "cond_resistance",
	["VULN"] = "cond_vulnerable",
	["REGEN"] = "cond_regeneration",
	["FHEAL"] = "cond_regeneration",
	["DMGO"] = "cond_bleed",
};

-- Attack types supported
atktypes = {
	"spell",
	"weapon"
};

-- Range types supported
rangetypes = {
	"melee",
	"ranged"
};

-- Damage types supported
energytypes = {
	"acid",  		-- ENERGY DAMAGE TYPES
	"cold",
	"electricity",
	"fire",
	"sonic",
	"force",  		-- OTHER SPELL DAMAGE TYPES
	"positive",
	"negative"
};

immunetypes = {
	"acid",  		-- ENERGY DAMAGE TYPES
	"cold",
	"electricity",
	"fire",
	"sonic",
	"nonlethal",	-- SPECIAL DAMAGE TYPES
	"critical",
	"poison",		-- OTHER IMMUNITY TYPES
	"sleep",
	"paralysis",
	"petrification",
	"charm",
	"sleep",
	"fear",
	"disease",
	"mind-affecting",
};

dmgtypes = {
	"acid",  		-- ENERGY DAMAGE TYPES
	"cold",
	"electricity",
	"fire",
	"sonic",
	"force",  		-- OTHER SPELL DAMAGE TYPES
	"positive",
	"negative",
	"adamantine", 	-- WEAPON PROPERTY DAMAGE TYPES
	"bludgeoning",
	"cold iron",
	"epic",
	"magic",
	"piercing",
	"silver",
	"slashing",
	"chaotic",		-- ALIGNMENT DAMAGE TYPES
	"evil",
	"good",
	"lawful",
	"nonlethal",	-- SPECIAL DAMAGE TYPES
	"spell",
	"critical",
	"precision",
};

basicdmgtypes = {
	"acid",  		-- ENERGY DAMAGE TYPES
	"cold",
	"electricity",
	"fire",
	"sonic",
	"force",  		-- OTHER SPELL DAMAGE TYPES
	"positive",
	"negative",
	"bludgeoning", 	-- WEAPON PROPERTY DAMAGE TYPES
	"piercing",
	"slashing",
};

specialdmgtypes = {
	"adamantine", 	-- WEAPON PROPERTY DAMAGE TYPES
	"cold iron",
	"epic",
	"magic",
	"silver",
	"chaotic",		-- ALIGNMENT DAMAGE TYPES
	"evil",
	"good",
	"lawful",
	"nonlethal",	-- SPECIAL DAMAGE TYPES
	"spell",
	"critical",
	"precision",
};

-- Bonus types supported in power descriptions
bonustypes = {
	"alchemical",
	"armor",
	"circumstance",
	"competence",
	"deflection",
	"dodge",
	"enhancement",
	"insight",
	"luck",
	"morale",
	"natural",
	"profane",
	"racial",
	"resistance",
	"sacred",
	"shield",
	"size",
	"trait",
};
stackablebonustypes = {
	"circumstance",
	"dodge"
};

-- Armor class bonus types
-- (Map text types to internal types)
actypes = {
	["dex"] = "dex",
	["armor"] = "armor",
	["shield"] = "shield",
	["natural"] = "natural",
	["dodge"] = "dodge",
	["deflection"] = "deflection",
	["size"] = "size",
};
acarmormatch = {
	"padded",
	"padded armor",
	"padded barding",
	"leather",
	"leather armor",
	"leather barding",
	"studded leather",
	"studded leather armor",
	"studded leather barding",
	"chain shirt",
	"chain shirt barding",
	"hide",
	"hide armor",
	"hide barding",
	"scale mail",
	"scale mail barding",
	"chainmail",
	"chainmail barding",
	"breastplate",
	"breastplate barding",
	"splint mail",
	"splint mail barding",
	"banded mail",
	"banded mail barding",
	"half-plate",
	"half-plate armor",
	"half-plate barding",
	"full plate",
	"full plate armor",
	"full plate barding",
	"plate barding",
	"bracers of armor",
	"mithral chain shirt",
};
acshieldmatch = {
	"buckler",
	"light shield",
	"light wooden shield",
	"light steel shield",
	"heavy shield",
	"heavy wooden shield",
	"heavy steel shield",
	"tower shield",
};
acdeflectionmatch = {
	"ring of protection"
};

-- Spell effects supported in spell descriptions
spelleffects = {
	"blinded",
	"confused",
	"cowering",
	"dazed",
	"dazzled",
	"deafened",
	"entangled",
	"exhausted",
	"fascinated",
	"frightened",
	"helpless",
	"invisible",
	"panicked",
	"paralyzed",
	"shaken",
	"sickened",
	"slowed",
	"stunned",
	"unconscious"
};

-- NPC damage properties
weapondmgtypes = {
	["axe"] = "slashing",
	["battleaxe"] = "slashing",
	["bolas"] = "bludgeoning,nonlethal",
	["chain"] = "piercing",
	["club"] = "bludgeoning",
	["crossbow"] = "piercing",
	["dagger"] = "piercing,slashing",
	["dart"] = "piercing",
	["falchion"] = "slashing",
	["flail"] = "bludgeoning",
	["glaive"] = "slashing",
	["greataxe"] = "slashing",
	["greatclub"] = "bludgeoning",
	["greatsword"] = "slashing",
	["guisarme"] = "slashing",
	["halberd"] = "piercing,slashing",
	["hammer"] = "bludgeoning",
	["handaxe"] = "slashing",
	["javelin"] = "piercing",
	["kama"] = "slashing",
	["kukri"] = "slashing",
	["lance"] = "piercing",
	["longbow"] = "piercing",
	["longspear"] = "piercing",
	["longsword"] = "slashing",
	["mace"] = "bludgeoning",
	["morningstar"] = "bludgeoning,piercing",
	["nunchaku"] = "bludgeoning",
	["pick"] = "piercing",
	["quarterstaff"] = "bludgeoning",
	["ranseur"] = "piercing",
	["rapier"] = "piercing",
	["sai"] = "bludgeoning",
	["sap"] = "bludgeoning,nonlethal",
	["scimitar"] = "slashing",
	["scythe"] = "piercing,slashing",
	["shortbow"] = "piercing",
	["shortspear"] = "piercing",
	["shuriken"] = "piercing",
	["siangham"] = "piercing",
	["sickle"] = "slashing",
	["sling"] = "bludgeoning",
	["spear"] = "piercing",
	["sword"] = {["short"] = "piercing", ["*"] = "slashing"},
	["trident"] = "piercing",
	["urgrosh"] = "piercing,slashing",
	["waraxe"] = "slashing",
	["warhammer"] = "bludgeoning",
	["whip"] = "slashing"
}

naturaldmgtypes = {
	["arm"] = "bludgeoning",
	["bite"] = "piercing,slashing,bludgeoning",
	["butt"] = "bludgeoning",
	["claw"] =  "piercing,slashing",
	["foreclaw"] =  "piercing,slashing",
	["gore"] = "piercing",
	["hoof"] = "bludgeoning",
	["hoove"] = "bludgeoning",
	["horn"] = "piercing",
	["pincer"] = "bludgeoning",
	["quill"] = "piercing",
	["ram"] = "bludgeoning",
	["rock"] = "bludgeoning",
	["slam"] = "bludgeoning",
	["snake"] = "piercing,slashing,bludgeoning",
	["spike"] = "piercing",
	["stamp"] = "bludgeoning",
	["sting"] = "piercing",
	["swarm"] = "piercing,slashing,bludgeoning",
	["tail"] = "bludgeoning",
	["talon"] =  "piercing,slashing",
	["tendril"] = "bludgeoning",
	["tentacle"] = "bludgeoning",
	["wing"] = "bludgeoning",
}

-- Skill properties
sensesdata = {
	["Perception"] = {
			stat = "wisdom"
		},
}

-- Old skill names from 3.5 modules still grant the merged skill.
skillalias = {
	["Spot"] = "Perception",
	["Listen"] = "Perception",
	["Hide"] = "Stealth",
	["Move Silently"] = "Stealth",
	["Balance"] = "Acrobatics",
	["Tumble"] = "Acrobatics",
	["Decipher Script"] = "Linguistics",
	["Speak Language"] = "Linguistics",
}

skilldata = {
	["Appraise"] = {
			stat = "intelligence"
		},
	["Acrobatics"] = {
			stat = "dexterity",
			armorcheckmultiplier = 1
		},
	["Bluff"] = {
			stat = "charisma"
		},
	["Climb"] = {
			stat = "strength",
			armorcheckmultiplier = 1
		},
	["Concentration"] = {
			stat = "constitution"
		},
	["Craft"] = {
			sublabeling = true,
			stat = "intelligence"
		},
	["Diplomacy"] = {
			stat = "charisma"
		},
	["Disable Device"] = {
			stat = "intelligence",
			trainedonly = 1
		},
	["Disguise"] = {
			stat = "charisma"
		},
	["Escape Artist"] = {
			stat = "dexterity",
			armorcheckmultiplier = 1
		},
	["Forgery"] = {
			stat = "intelligence"
		},
	["Gather Information"] = {
			stat = "charisma"
		},
	["Fly"] = {
			stat = "dexterity"
		},
	["Handle Animal"] = {
			stat = "charisma",
			trainedonly = 1
		},
	["Heal"] = {
			stat = "wisdom"
		},
	["Intimidate"] = {
			stat = "charisma"
		},
	["Jump"] = {
			stat = "strength",
			armorcheckmultiplier = 1
		},
	["Linguistics"] = {
			stat = "intelligence",
			trainedonly = 1
		},
	["Might"] = {
			stat = "strength",
			armorcheckmultiplier = 1
		},
	["Knowledge"] = {
			sublabeling = true,
			stat = "intelligence",
			trainedonly = 1
		},
	["Perception"] = {
			stat = "wisdom"
		},
	["Open Lock"] = {
			stat = "dexterity",
			trainedonly = 1
		},
	["Perform"] = {
			sublabeling = true,
			stat = "charisma"
		},
	["Profession"] = {
			sublabeling = true,
			stat = "wisdom",
			trainedonly = 1
		},
	["Ride"] = {
			stat = "dexterity"
		},
	["Search"] = {
			stat = "intelligence"
		},
	["Sense Motive"] = {
			stat = "wisdom"
		},
	["Sleight of Hand"] = {
			stat = "dexterity",
			armorcheckmultiplier = 1,
			trainedonly = 1
		},
	["Spellcraft"] = {
			stat = "intelligence",
			trainedonly = 1
		},
	["Stealth"] = {
			stat = "dexterity",
			armorcheckmultiplier = 1
		},
	["Survival"] = {
			stat = "wisdom"
		},
	["Swim"] = {
			stat = "strength",
			armorcheckmultiplier = 2
		},
	["Use Magic Device"] = {
			stat = "charisma",
			trainedonly = 1
		},
	["Use Rope"] = {
			stat = "dexterity"
		},
	["Warfare"] = {
			stat = "intelligence"
		}
}

-- Coin labels
currency = { "PP", "GP", "SP", "CP" };

-- Party sheet drop down list data
psabilitydata = {
	"Strength",
	"Dexterity",
	"Constitution",
	"Intelligence",
	"Wisdom",
	"Charisma"
};

pssavedata = {
	"Fortitude",
	"Reflex",
	"Will"
};

psskilldata = {
	"Acrobatics",
	"Bluff",
	"Climb",
	"Diplomacy",
	"Fly",
	"Gather Information",
	"Heal",
	"Intimidate",
	"Jump",
	"Knowledge (Arcana)",
	"Knowledge (Dungeoneering)",
	"Knowledge (Local)",
	"Knowledge (Nature)",
	"Knowledge (Planes)",
	"Knowledge (Religion)",
	"Linguistics",
	"Might",
	"Perception",
	"Search",
	"Stealth",
	"Survival",
	"Warfare"
};

-- PC/NPC Class properties

class_stol = {
	["brb"] = "barbarian",
	["brd"] = "bard",
	["clr"] = "cleric",
	["drd"] = "druid",
	["ftr"] = "fighter",
	["mnk"] = "monk",
	["pal"] = "paladin",
	["rgr"] = "ranger",
	["rog"] = "rogue",
	["sor"] = "sorcerer",
	["wiz"] = "wizard",
};

classdata = {
	-- Core
	["barbarian"] = {
		hd = "d12", bab = "fast", fort = "good", ref = "bad", will = "bad", skillranks = 4,
		skills = "Climb (Str), Craft (Int), Handle Animal (Cha), Intimidate (Cha), Jump (Str), Perception (Wis), Ride (Dex), Survival (Wis), Swim (Str), and Warfare (Int)",
	},
	["bard"] = {
		hd = "d6", bab = "medium", fort = "bad", ref = "good", will = "good", skillranks = 6,
		skills = "Appraise (Int), Acrobatics (Dex), Bluff (Cha), Climb (Str), Concentration (Con), Craft (Int), Linguistics (Int), Diplomacy (Cha), Disguise (Cha), Escape Artist (Dex), Gather Information (Cha), Stealth (Dex), Jump (Str), Knowledge (all skills, taken individually) (Int), Perception (Wis), Perform (Cha), Profession (Wis), Sense Motive (Wis), Sleight of Hand (Dex), Spellcraft (Int), Swim (Str), Use Magic Device (Cha), and Fly (Dex)",
	},
	["cleric"] = {
		hd = "d8", bab = "medium", fort = "good", ref = "bad", will = "good", skillranks = 2,
		skills = "Concentration (Con), Craft (Int), Diplomacy (Cha), Heal (Wis), Knowledge (arcana) (Int), Knowledge (history) (Int), Knowledge (religion) (Int), Knowledge (the planes) (Int), Profession (Wis), Spellcraft (Int), and Fly (Dex)",
	},
	["druid"] = {
		hd = "d8", bab = "medium", fort = "good", ref = "bad", will = "good", skillranks = 4,
		skills = "Concentration (Con), Craft (Int), Diplomacy (Cha), Handle Animal (Cha), Heal (Wis), Knowledge (nature) (Int), Perception (Wis), Profession (Wis), Ride (Dex), Spellcraft (Int), Survival (Wis), Swim (Str), and Fly (Dex)",
	},
	["fighter"] = {
		hd = "d10", bab = "fast", fort = "good", ref = "bad", will = "bad", skillranks = 2,
		skills = "Climb (Str), Craft (Int), Handle Animal (Cha), Intimidate (Cha), Jump (Str), Ride (Dex), Swim (Str), and Warfare (Int)",
	},
	["monk"] = {
		hd = "d8", bab = "medium", fort = "good", ref = "good", will = "good", skillranks = 4,
		skills = "Acrobatics (Dex), Climb (Str), Concentration (Con), Craft (Int), Diplomacy (Cha), Escape Artist (Dex), Stealth (Dex), Jump (Str), Knowledge (arcana) (Int), Knowledge (religion) (Int), Perception (Wis), Perform (Cha), Profession (Wis), Sense Motive (Wis), and Swim (Str)",
	},
	["paladin"] = {
		hd = "d10", bab = "fast", fort = "good", ref = "bad", will = "bad", skillranks = 2,
		skills = "Concentration (Con), Craft (Int), Diplomacy (Cha), Handle Animal (Cha), Heal (Wis), Knowledge (nobility and royalty) (Int), Knowledge (religion) (Int), Profession (Wis), Ride (Dex), and Sense Motive (Wis)",
	},
	["ranger"] = {
		hd = "d8", bab = "fast", fort = "good", ref = "good", will = "bad", skillranks = 6,
		skills = "Climb (Str), Concentration (Con), Craft (Int), Handle Animal (Cha), Heal (Wis), Stealth (Dex), Jump (Str), Knowledge (dungeoneering) (Int), Knowledge (geography) (Int), Knowledge (nature) (Int), Perception (Wis), Profession (Wis), Ride (Dex), Search (Int), Survival (Wis), Swim (Str), and Use Rope (Dex)",
	},
	["rogue"] = {
		hd = "d6", bab = "medium", fort = "bad", ref = "good", will = "bad", skillranks = 8,
		skills = "Appraise (Int), Acrobatics (Dex), Bluff (Cha), Climb (Str), Craft (Int), Linguistics (Int), Diplomacy (Cha), Disable Device (Int), Disguise (Cha), Escape Artist (Dex), Forgery (Int), Gather Information (Cha), Stealth (Dex), Intimidate (Cha), Jump (Str), Knowledge (local) (Int), Perception (Wis), Open Lock (Dex), Perform (Cha), Profession (Wis), Search (Int), Sense Motive (Wis), Sleight of Hand (Dex), Swim (Str), Use Magic Device (Cha), and Use Rope (Dex)",
	},
	["sorcerer"] = {
		hd = "d4", bab = "slow", fort = "bad", ref = "bad", will = "good", skillranks = 2,
		skills = "Bluff (Cha), Concentration (Con), Craft (Int), Knowledge (arcana) (Int), Profession (Wis), Spellcraft (Int), and Fly (Dex)",
	},
	["wizard"] = {
		hd = "d4", bab = "slow", fort = "bad", ref = "bad", will = "good", skillranks = 2,
		skills = "Concentration (Con), Craft (Int), Linguistics (Int), Knowledge (all skills, taken individually) (Int), Profession (Wis), Spellcraft (Int), and Fly (Dex)",
	},
	-- NPC
	["adept"] = {
		hd = "d6", bab = "slow", fort = "bad", ref = "bad", will = "good", skillranks = 2,
		skills = "Concentration (Con), Craft (Int), Handle Animal (Cha), Heal (Wis), Knowledge (all skills taken individually) (Int), Profession (Wis), Spellcraft (Int), and Survival (Wis)",
	},
	["aristocrat"] = {
		hd = "d8", bab = "medium", fort = "bad", ref = "bad", will = "good", skillranks = 4,
		skills = "Appraise (Int), Bluff (Cha), Diplomacy (Cha), Disguise (Cha), Forgery (Int), Gather Information (Cha), Handle Animal (Cha), Intimidate (Cha), Knowledge (all skills taken individually) (Int), Perception (Wis), Perform (Cha), Ride (Dex), Sense Motive (Wis), Linguistics (Int), Swim (Str), and Survival (Wis)",
	},
	["commoner"] = {
		hd = "d4", bab = "slow", fort = "bad", ref = "bad", will = "bad", skillranks = 2,
		skills = "Climb (Str), Craft (Int), Handle Animal (Cha), Jump (Str), Perception (Wis), Profession (Wis), Ride (Dex), Swim (Str), and Use Rope (Dex)",
	},
	["expert"] = {
		hd = "d6", bab = "medium", fort = "bad", ref = "bad", will = "good", skillranks = 6,
		skills = "Any 10",
	},
	["warrior"] = {
		hd = "d8", bab = "fast", fort = "good", ref = "bad", will = "bad", skillranks = 2,
		skills = "Climb (Str), Handle Animal (Cha), Intimidate (Cha), Jump (Str), Ride (Dex), Swim (Str), and Warfare (Int)",
	},
	-- Prestige
	["arcane archer"] = {
		bPrestige = true, hd = "d8", bab = "fast", fort = "good", ref = "good", will = "bad", skillranks = 4,
		skills = "Craft (Int), Stealth (Dex), Perception (Wis), Ride (Dex), Survival (Wis), and Use Rope (Dex)",
	},
	["arcane trickster"] = {
		bPrestige = true, hd = "d4", bab = "slow", fort = "bad", ref = "good", will = "good", skillranks = 4,
		skills = "Appraise (Int), Acrobatics (Dex), Bluff (Cha), Climb (Str), Concentration (Con), Craft (Int), Linguistics (Int), Diplomacy (Cha), Disable Device (Int), Disguise (Cha), Escape Artist (Dex), Gather Information (Cha), Stealth (Dex), Jump (Str), Knowledge (all skills taken individually) (Int), Perception (Wis), Open Lock (Dex), Profession (Wis), Search (Int), Sense Motive (Wis), Sleight of Hand (Dex), Spellcraft (Int), Swim (Str), and Use Rope (Dex)",
	},
	["archmage"] = {
		bPrestige = true, hd = "d4", bab = "slow", fort = "bad", ref = "bad", will = "good", skillranks = 2,
		skills = "Concentration (Con), Craft (alchemy) (Int), Knowledge (all skills taken individually) (Int), Profession (Wis), Search (Int), and Spellcraft (Int)",
	},
	["assassin"] = {
		bPrestige = true, hd = "d6", bab = "medium", fort = "bad", ref = "good", will = "bad", skillranks = 4,
		skills = "Acrobatics (Dex), Bluff (Cha), Climb (Str), Craft (Int), Linguistics (Int), Diplomacy (Cha), Disable Device (Int), Disguise (Cha), Escape Artist (Dex), Forgery (Int), Gather Information (Cha), Stealth (Dex), Intimidate (Cha), Jump (Str), Perception (Wis), Open Lock (Dex), Search (Int), Sense Motive (Wis), Sleight of Hand (Dex), Swim (Str), Use Magic Device (Cha), and Use Rope (Dex)",
	},
	["blackguard"] = {
		bPrestige = true, hd = "d10", bab = "fast", fort = "good", ref = "bad", will = "bad", skillranks = 2,
		skills = "Concentration (Con), Craft (Int), Diplomacy (Cha), Handle Animal (Cha), Heal (Wis), Stealth (Dex), Intimidate (Cha), Knowledge (religion) (Int), Profession (Wis), and Ride (Dex)",
	},
	["dragon disciple"] = {
		bPrestige = true, hd = "d12", bab = "medium", fort = "good", ref = "bad", will = "good", skillranks = 2,
		skills = "Concentration (Con), Craft (Int), Diplomacy (Cha), Escape Artist (Dex), Gather Information (Cha), Knowledge (all skills, taken individually) (Int), Perception (Wis), Profession (Wis), Search (Int), Linguistics (Int), and Spellcraft (Int)",
	},
	["duelist"] = {
		bPrestige = true, hd = "d10", bab = "fast", fort = "bad", ref = "good", will = "bad", skillranks = 4,
		skills = "Acrobatics (Dex), Bluff (Cha), Escape Artist (Dex), Jump (Str), Perception (Wis), Perform (Cha), and Sense Motive (Wis)",
	},
	["dwarven defender"] = {
		bPrestige = true, hd = "d12", bab = "fast", fort = "good", ref = "bad", will = "good", skillranks = 2,
		skills = "Craft (Int), Perception (Wis), and Sense Motive (Wis)",
	},
	["eldritch knight"] = {
		bPrestige = true, hd = "d6", bab = "fast", fort = "good", ref = "bad", will = "bad", skillranks = 2,
		skills = "Concentration (Con), Craft (Int), Linguistics (Int), Jump (Str), Knowledge (arcana) (Int), Knowledge (nobility and royalty) (Int), Ride (Dex), Sense Motive (Wis), Spellcraft (Int), and Swim (Str)",
	},
	["hierophant"] = {
		bPrestige = true, hd = "d8", bab = "slow", fort = "good", ref = "bad", will = "good", skillranks = 2,
		skills = "Concentration (Con), Craft (Int), Diplomacy (Cha), Heal (Wis), Knowledge (arcana) (Int), Knowledge (religion) (Int), Profession (Wis), and Spellcraft (Int)",
	},
	["horizon walker"] = {
		bPrestige = true, hd = "d8", bab = "fast", fort = "good", ref = "bad", will = "bad", skillranks = 4,
		skills = "Acrobatics (Dex), Climb (Str), Diplomacy (Cha), Handle Animal (Cha), Stealth (Dex), Knowledge (geography) (Int), Perception (Wis), Profession (Wis), Ride (Dex), Linguistics (Int), and Survival (Wis)",
	},
	["loremaster"] = {
		bPrestige = true, hd = "d4", bab = "slow", fort = "bad", ref = "bad", will = "good", skillranks = 4,
		skills = "Appraise (Int), Concentration (Con), Craft (alchemy) (Int), Linguistics (Int), Gather Information (Cha), Handle Animal (Cha), Heal (Wis), Knowledge (all skills taken individually) (Int), Perform (Cha), Profession (Wis), Spellcraft (Int), and Use Magic Device (Cha)",
	},
	["mystic theurge"] = {
		bPrestige = true, hd = "d4", bab = "slow", fort = "bad", ref = "bad", will = "good", skillranks = 2,
		skills = "Concentration (Con), Craft (Int), Linguistics (Int), Knowledge (arcana) (Int), Knowledge (religion) (Int), Profession (Wis), Sense Motive (Wis), and Spellcraft (Int)",
	},
	["shadowdancer"] = {
		bPrestige = true, hd = "d8", bab = "medium", fort = "bad", ref = "good", will = "bad", skillranks = 6,
		skills = "Acrobatics (Dex), Bluff (Cha), Linguistics (Int), Diplomacy (Cha), Disguise (Cha), Escape Artist (Dex), Stealth (Dex), Jump (Str), Perception (Wis), Perform (Cha), Profession (Wis), Search (Int), Sleight of Hand (Dex), and Use Rope (Dex)",
	},
	["thaumaturgist"] = {
		bPrestige = true, hd = "d4", bab = "slow", fort = "bad", ref = "bad", will = "good", skillranks = 2,
		skills = "Concentration (Con), Craft (Int), Diplomacy (Cha), Knowledge (religion) (Int), Knowledge (the planes) (Int), Profession (Wis), Sense Motive (Wis), Linguistics (Int), and Spellcraft (Int)",
	},
};
