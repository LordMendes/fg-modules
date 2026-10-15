-- 
-- Please see the license.html file included with this distribution for 
-- attribution and copyright information.
--

function onInit()
	WindowTabManager.registerTab("partysheet_host", { sName = "skills", sTabRes = "tab_skills", sClass = "ps_skills", sInsertBefore = "inventory" });
	WindowTabManager.registerTab("partysheet_host", { sName = "xp", sTabRes = "tab_xp", sClass = "ps_xp" });
	WindowTabManager.registerTab("partysheet_client", { sName = "skills", sTabRes = "tab_skills", sClass = "ps_skills", sOption = "PSMN", sInsertBefore = "inventory" });

	if Session.IsHost then
		DB.addHandler("charsheet.*.classes", "onChildUpdate", linkPCClasses);
		DB.addHandler("charsheet.*.skilllist", "onChildUpdate", linkPCSkills);
		DB.addHandler("charsheet.*.languagelist", "onChildUpdate", linkPCLanguages);
	end
end

function linkPCClasses(nodeClass)
	if not nodeClass then
		return;
	end
	local nodePS = PartyManager.mapChartoPS(DB.getParent(nodeClass));
	if not nodePS then
		return;
	end

	DB.setValue(nodePS, "class", "string", CharManager.getClassLevelSummary(DB.getParent(nodeClass)));
end
function linkPCLanguages(nodeLanguages)
	if not nodeLanguages then
		return;
	end
	local nodePS = PartyManager.mapChartoPS(DB.getParent(nodeLanguages));
	if not nodePS then
		return;
	end
	
	local aLanguages = {};
	
	for _,v in ipairs(DB.getChildList(nodeLanguages)) do
		local sName = DB.getValue(v, "name", "");
		if sName ~= "" then
			table.insert(aLanguages, sName);
		end
	end
	table.sort(aLanguages);
	
	local sLanguages = table.concat(aLanguages, ", ");
	DB.setValue(nodePS, "languages", "string", sLanguages);
end
function linkPCSkill(nodeSkill, nodePS, sPSField)
	PartyManager.linkRecordField(nodeSkill, nodePS, "total", "number", sPSField);
end
function linkPCSkills(nodeSkills)
	if not nodeSkills then
		return;
	end
	local nodePS = PartyManager.mapChartoPS(DB.getParent(nodeSkills));
	if not nodePS then
		return;
	end
	
	for _,v in ipairs(DB.getChildList(nodeSkills)) do
		local sLabel = DB.getValue(v, "label", ""):lower();

		if sLabel == "spot" then
			linkPCSkill(v, nodePS, "spot");
		elseif sLabel == "listen" then
			linkPCSkill(v, nodePS, "listen");
		elseif sLabel == "search" then
			linkPCSkill(v, nodePS, "search");
		elseif sLabel == "perception" then
			linkPCSkill(v, nodePS, "perception");
		elseif sLabel == "sense motive" then
			linkPCSkill(v, nodePS, "sensemotive");
		
		elseif sLabel == "knowledge" then
			local sSubLabel = DB.getValue(v, "sublabel", ""):lower();
			
			if sSubLabel == "arcana" then
				linkPCSkill(v, nodePS, "arcana");
			elseif sSubLabel == "dungeoneering" then
				linkPCSkill(v, nodePS, "dungeoneering");
			elseif sSubLabel == "local" then
				linkPCSkill(v, nodePS, "klocal");
			elseif sSubLabel == "nature" then
				linkPCSkill(v, nodePS, "nature");
			elseif sSubLabel == "planes" or sSubLabel == "the planes" then
				linkPCSkill(v, nodePS, "planes");
			elseif sSubLabel == "religion" then
				linkPCSkill(v, nodePS, "religion");
			end
		elseif sLabel:sub(1,9) == "knowledge" then
			local sSubLabel = sLabel:sub(10):match("%w[%w%s]*%w");

			if sSubLabel == "arcana" then
				linkPCSkill(v, nodePS, "arcana");
			elseif sSubLabel == "dungeoneering" then
				linkPCSkill(v, nodePS, "dungeoneering");
			elseif sSubLabel == "local" then
				linkPCSkill(v, nodePS, "klocal");
			elseif sSubLabel == "nature" then
				linkPCSkill(v, nodePS, "nature");
			elseif sSubLabel == "planes" or sSubLabel == "the planes" then
				linkPCSkill(v, nodePS, "planes");
			elseif sSubLabel == "religion" then
				linkPCSkill(v, nodePS, "religion");
			end
		
		elseif sLabel == "bluff" then
			linkPCSkill(v, nodePS, "bluff");
		elseif sLabel == "diplomacy" then
			linkPCSkill(v, nodePS, "diplomacy");
		elseif sLabel == "gather information" then
			linkPCSkill(v, nodePS, "gatherinfo");
		elseif sLabel == "intimidate" then
			linkPCSkill(v, nodePS, "intimidate");
		
		elseif sLabel == "acrobatics" then
			linkPCSkill(v, nodePS, "acrobatics");
		elseif sLabel == "climb" then
			linkPCSkill(v, nodePS, "climb");
		elseif sLabel == "heal" then
			linkPCSkill(v, nodePS, "heal");
		elseif sLabel == "jump" then
			linkPCSkill(v, nodePS, "jump");
		elseif sLabel == "survival" then
			linkPCSkill(v, nodePS, "survival");
		
		elseif sLabel == "hide" then
			linkPCSkill(v, nodePS, "hide");
		elseif sLabel == "move silently" then
			linkPCSkill(v, nodePS, "movesilent");
		elseif sLabel == "stealth" then
			linkPCSkill(v, nodePS, "stealth");
		end
	end
end
function linkPCFields(nodePS)
	local sClass, sRecord = DB.getValue(nodePS, "link", "", "");
	if sRecord == "" then
		return;
	end
	local nodeChar = DB.findNode(sRecord);
	if not nodeChar then
		return;
	end
	
	PartyManager.linkRecordField(nodeChar, nodePS, "name", "string");
	PartyManager.linkRecordField(nodeChar, nodePS, "token", "token", "token");

	PartyManager.linkRecordField(nodeChar, nodePS, "race", "string");
	PartyManager.linkRecordField(nodeChar, nodePS, "level", "number");
	PartyManager.linkRecordField(nodeChar, nodePS, "exp", "number");
	PartyManager.linkRecordField(nodeChar, nodePS, "expneeded", "number");

	PartyManager.linkRecordField(nodeChar, nodePS, "senses", "string");
	
	PartyManager.linkRecordField(nodeChar, nodePS, "hp.total", "number", "hptotal");
	PartyManager.linkRecordField(nodeChar, nodePS, "hp.temporary", "number", "hptemp");
	PartyManager.linkRecordField(nodeChar, nodePS, "hp.wounds", "number", "wounds");
	PartyManager.linkRecordField(nodeChar, nodePS, "hp.nonlethal", "number", "nonlethal");
	
	PartyManager.linkRecordField(nodeChar, nodePS, "abilities.strength.score", "number", "strength");
	PartyManager.linkRecordField(nodeChar, nodePS, "abilities.constitution.score", "number", "constitution");
	PartyManager.linkRecordField(nodeChar, nodePS, "abilities.dexterity.score", "number", "dexterity");
	PartyManager.linkRecordField(nodeChar, nodePS, "abilities.intelligence.score", "number", "intelligence");
	PartyManager.linkRecordField(nodeChar, nodePS, "abilities.wisdom.score", "number", "wisdom");
	PartyManager.linkRecordField(nodeChar, nodePS, "abilities.charisma.score", "number", "charisma");

	PartyManager.linkRecordField(nodeChar, nodePS, "abilities.strength.bonus", "number", "strcheck");
	PartyManager.linkRecordField(nodeChar, nodePS, "abilities.constitution.bonus", "number", "concheck");
	PartyManager.linkRecordField(nodeChar, nodePS, "abilities.dexterity.bonus", "number", "dexcheck");
	PartyManager.linkRecordField(nodeChar, nodePS, "abilities.intelligence.bonus", "number", "intcheck");
	PartyManager.linkRecordField(nodeChar, nodePS, "abilities.wisdom.bonus", "number", "wischeck");
	PartyManager.linkRecordField(nodeChar, nodePS, "abilities.charisma.bonus", "number", "chacheck");

	PartyManager.linkRecordField(nodeChar, nodePS, "ac.totals.general", "number", "ac");
	PartyManager.linkRecordField(nodeChar, nodePS, "ac.totals.flatfooted", "number", "flatfootedac");
	PartyManager.linkRecordField(nodeChar, nodePS, "ac.totals.touch", "number", "touchac");
	PartyManager.linkRecordField(nodeChar, nodePS, "ac.totals.cmd", "number", "cmd");
	
	PartyManager.linkRecordField(nodeChar, nodePS, "saves.fortitude.total", "number", "fortitude");
	PartyManager.linkRecordField(nodeChar, nodePS, "saves.reflex.total", "number", "reflex");
	PartyManager.linkRecordField(nodeChar, nodePS, "saves.will.total", "number", "will");
	
	PartyManager.linkRecordField(nodeChar, nodePS, "defenses.damagereduction", "string", "dr");
	PartyManager.linkRecordField(nodeChar, nodePS, "defenses.sr.total", "number", "sr");

	linkPCClasses(DB.getChild(nodeChar, "classes"));
	linkPCSkills(DB.getChild(nodeChar, "skilllist"));
	linkPCLanguages(DB.getChild(nodeChar, "languagelist"));
end
