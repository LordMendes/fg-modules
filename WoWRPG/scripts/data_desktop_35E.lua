-- 
-- Please see the license.html file included with this distribution for 
-- attribution and copyright information.
--

function onInit()
	CampaignSetupManager.addAutoLoadRules(_tAutoLoadRules);
	CampaignSetupManager.addModuleSetsByMode(_tDataModuleSets);

	ModifierManager.addModWindowPresets(_tModifierWindowPresets);
	ModifierManager.addKeyExclusionSets(_tModifierExclusionSets);
end

_tAutoLoadRules = {
	{ key = "PHB", load = { "3.5E Basic Rules", "3.5E Spells", }, playerload = { "3.5E Basic Rules", "3.5E Spells", }, },
	{ key = "DMG", load = { "3.5E Magic Items", "3.5E Magic Items", }, },
	{ key = "MM", load = { "3.5E Monsters", }, },
};
_tDataModuleSets = 
{
	["client"] =
	{
		{
			name = "3.5E - SRD",
			modules =
			{
				{ name = "3.5E Basic Rules" },
				{ name = "3.5E Spells" },
			},
		},
	},
	["host"] =
	{
		{
			name = "3.5E - SRD",
			modules =
			{
				{ name = "3.5E Basic Rules" },
				{ name = "3.5E Magic Items" },
				{ name = "3.5E Monsters" },
				{ name = "3.5E Spells" },
			},
		},
	},
};

-- Shown in Modifiers window
-- NOTE: Set strings for "modifier_category_*" and "modifier_label_*"
_tModifierWindowPresets =
{
	{ 
		sCategory = "attack",
		tPresets = 
		{
			"ATT_TCH",
			"DEF_PCOVER",
			"ATT_FF",
			"DEF_COVER",
			"ATT_OPP",
			"DEF_SCOVER",
			"ATT_CA",
			"DEF_CONC",
			"",
			"DEF_TCONC",
		},
	},
	{ 
		sCategory = "damage",
		tPresets = { 
			"DMG_CRIT",
			"DMG_HALF",
		}
	},
};
_tModifierExclusionSets =
{
	{ "DEF_PCOVER", "DEF_COVER", "DEF_SCOVER" },
	{ "DEF_CONC", "DEF_TCONC" },
};
