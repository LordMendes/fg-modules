-- 
-- Please see the license.html file included with this distribution for 
-- attribution and copyright information.
--

local rsname = "3.5E";
local rsmajorversion = 18;

function onInit()
	if Session.IsHost then
		updateCampaign();
	end

	DB.addEventHandler("onAuxCharLoad", onCharImport);
	DB.addEventHandler("onImport", onImport);
	Module.addEventHandler("onModuleLoad", onModuleLoad);
end

function onCharImport(nodePC)
	local _, _, aMajor, _ = DB.getImportRulesetVersion();
	updateChar(nodePC, aMajor[rsname]);
end

function onImport(node)
	local aPath = StringManager.split(DB.getPath(node), ".");
	if #aPath == 2 and aPath[1] == "charsheet" then
		local _, _, aMajor, _ = DB.getImportRulesetVersion();
		updateChar(node, aMajor[rsname]);
	end
end

function onModuleLoad(sModule)
	local _, _, aMajor, _ = DB.getRulesetVersion(sModule);
	updateModule(sModule, aMajor[rsname]);
end

function updateChar(nodePC, nVersion)
	if not nVersion then
		nVersion = 0;
	end
	
	if nVersion < rsmajorversion then
		if nVersion < 8 then
			migrateChar8(nodePC);
		end
		if nVersion < 9 then
			migrateChar9(nodePC);
		end
		if nVersion < 11 then
			migrateChar11(nodePC);
		end
		if nVersion < 12 then
			migrateChar12(nodePC);
		end
		if nVersion < 17 then
			migrateChar17(nodePC);
		end
	end
end

function updateCampaign()
	local _, _, aMajor, aMinor = DB.getRulesetVersion();
	local major = aMajor[rsname];
	if not major then
		return;
	end
	
	if major > 0 and major < rsmajorversion then
		ChatManager.SystemMessage("Migrating campaign database to latest data version.");
		DB.backup();
		
		if major < 8 then
			convertCharacters();
			convertCT();
			convertEncounters();
			convertOptions();
		end
		if major < 9 then
			convertCharacters9();
			convertEncounters9();
			convertOptions9();
		end
		if major < 10 then
			convertLog10();
		end
		if major < 11 then
			convertChar11();
			convertParty11();
			convertParcel11();
			convertCombat11();
			convertSystem11();
			convertRegistry11();
		end
		if major < 12 then
			convertChar12();
		end
		if major < 14 then
			convertNPC14();
		end
		if major < 15 then
			convertPSEnc15();
		end
		if major < 16 then
			convertNotes16();
			-- convertImage16(); // Can't fix image links, because no setValue function
			convertTables16();
			convertStories16();
			convertQuests16();
			convertEncounters16();
		end
		if major < 17 then
			convertChar17();
		end
		if major < 18 then
			convertRegistry18();
		end
	end
end

function updateModule(sModule, nVersion)
	if not nVersion then
		nVersion = 0;
	end
	
	if nVersion < rsmajorversion then
		local nodeRoot = DB.getRoot(sModule);
		
		if nVersion < 12 then
			convertModuleParcels12(nodeRoot);
		end
		if nVersion < 13 then
			convertModuleNPCs13(nodeRoot);
		end
		if nVersion < 16 then
			convertModuleTables16(nodeRoot);
			convertModuleStories16(nodeRoot);
			convertModuleQuests16(nodeRoot);
			convertModuleEncounters16(nodeRoot);
		end
	end
end

function convertRegistry18()
	CampaignSetupManager.disableAutoLoad();
end

function migrateCharFeat17(nodeAbility)
	if DB.getValue(nodeAbility, "name") then
		return;
	end
	local sName = DB.getValue(nodeAbility, "value", "");
	local sDescription = DB.getValue(nodeAbility, "description", "");
	local sClass, sRecord = DB.getValue(nodeAbility, "shortcut", "", "");

	DB.deleteChild(nodeAbility, "value");
	DB.deleteChild(nodeAbility, "description");
	DB.deleteChild(nodeAbility, "shortcut");
	
	local bWriteDesc = true;
	if sRecord ~= "" then
		local nodeSource = DB.findNode(sRecord);
		if nodeSource then
			DB.copyNode(nodeSource, nodeAbility);
			bWriteDesc = false;
		end
	end
	
	DB.setValue(nodeAbility, "name", "string", sName);
	if bWriteDesc then
		sDescription = "<p>" .. sDescription:gsub("\n", "</p><p>") .. "</p>";
		DB.setValue(nodeAbility, "benefit", "formattedtext", sDescription);
	end
end

function migrateCharAbility17(nodeAbility)
	if DB.getValue(nodeAbility, "name") then
		return;
	end
	local sName = DB.getValue(nodeAbility, "value", "");
	local sDescription = DB.getValue(nodeAbility, "description", "");
	local sClass, sRecord = DB.getValue(nodeAbility, "shortcut", "", "");

	DB.deleteChild(nodeAbility, "value");
	DB.deleteChild(nodeAbility, "description");
	DB.deleteChild(nodeAbility, "shortcut");
	
	local bWriteDesc = true;
	if sRecord ~= "" then
		local nodeSource = DB.findNode(sRecord);
		if nodeSource then
			DB.copyNode(nodeSource, nodeAbility);
			bWriteDesc = false;
		end
	end

	DB.setValue(nodeAbility, "name", "string", sName);
	if bWriteDesc then
		sDescription = "<p>" .. sDescription:gsub("\n", "</p><p>") .. "</p>";
		DB.setValue(nodeAbility, "text", "formattedtext", sDescription);
	end
end

function migrateCharProf17(nodePC, nodeAbility, sPrefix)
	local nodeProfList = DB.createChild(nodePC, "proficiencylist");
	if nodeProfList then
		local nodeProf = DB.createChild(nodeProfList);
		if nodeProf then
			DB.setValue(nodeProf, "name", "string", sPrefix .. DB.getValue(nodeAbility, "value", ""));
		end
	end
end

function migrateChar17(nodePC)
	for _,nodeRecord in ipairs(DB.getChildList(nodePC, "featlist")) do
		migrateCharFeat17(nodeRecord);
	end
	for _,nodeRecord in ipairs(DB.getChildList(nodePC, "specialabilitylist")) do
		migrateCharAbility17(nodeRecord);
	end
	
	for _,nodeRecord in ipairs(DB.getChildList(nodePC, "proficiencyarmor")) do
		migrateCharProf17(nodePC, nodeRecord, "Armor: ");
	end
	DB.deleteChild(nodePC, "proficiencyarmor");
	for _,nodeRecord in ipairs(DB.getChildList(nodePC, "proficiencyweapon")) do
		migrateCharProf17(nodePC, nodeRecord, "Weapon: ");
	end
	DB.deleteChild(nodePC, "proficiencyweapon");
end

function convertChar17()
	for _,nodePC in ipairs(DB.getChildList("charsheet")) do
		migrateChar17(nodePC);
	end
end

function convertNotes16()
	for _,vNote in ipairs(DB.getChildList("notes")) do
		convertFTEntry16(vNote, "text");
	end
end

function convertStories16()
	for _,vStory in ipairs(DB.getChildList("encounter")) do
		convertFTEntry16(vStory, "text");
	end
end

function convertModuleStories16(nodeRoot)
	for _,vStory in ipairs(DB.getChildList(nodeRoot, "encounter")) do
		convertFTEntry16(vStory, "text");
	end
end

function convertQuests16()
	for _,vQuest in ipairs(DB.getChildList("quest")) do
		convertFTEntry16(vQuest, "description");
	end
end

function convertModuleQuests16(nodeRoot)
	for _,vQuest in ipairs(DB.getChildList(nodeRoot, "quest")) do
		convertFTEntry16(vQuest, "description");
	end
end

function convertFTEntry16(vNode, sField)
	local vText = DB.getChild(vNode, sField);
	if vText then
		local sFT = DB.getValue(vText);
		sFT = sFT:gsub("recordname=\"library\.d20monsters\.entries\.", "recordname=\"reference\.npcdata\.");
		sFT = sFT:gsub("recordname=\"library\.PFBestiary\.entries\.", "recordname=\"reference\.npcdata\.");
		DB.setValue(vText, ".", "formattedtext", sFT);
	end
end

function convertTables16()
	for _,vTable in ipairs(DB.getChildList("tables")) do
		convertTable16(vTable);
	end
end

function convertModuleTables16(nodeRoot)
	for _,vTable in ipairs(DB.getChildList(nodeRoot, "tables")) do
		convertTable16(vTable);
	end
end

function convertTable16(vTable)
	local vRows = DB.getChild(vTable, "tablerows");
	if vRows then
		for _,vRow in ipairs(DB.getChildList(vRows)) do
			local vResults = DB.getChild(vRow, "results");
			if vResults then
				for _,vResult in ipairs(DB.getChildList(vResults)) do
					local sClass, sRecord = DB.getValue(vResult, "resultlink", "", "");
					sRecord = sRecord:gsub("library\.d20monsters\.entries\.", "reference\.npcdata\.");
					sRecord = sRecord:gsub("library\.PFBestiary\.entries\.", "reference\.npcdata\.");
					DB.setValue(vResult, "resultlink", "windowreference", sClass, sRecord);
				end
			end
		end
	end
end

function convertEncounters16()
	for _,vEncounter in ipairs(DB.getChildList("battle")) do
		convertEncounter16(vEncounter);
	end
end

function convertModuleEncounters16(nodeRoot)
	for _,vEncounter in ipairs(DB.getChildList(nodeRoot, "battle")) do
		convertEncounter16(vEncounter);
	end
end

function convertEncounter16(vEncounter)
	local vNPCs = DB.getChild(vEncounter, "npclist");
	if vNPCs then
		for _,vNPC in ipairs(DB.getChildList(vNPCs)) do
			local sClass, sRecord = DB.getValue(vNPC, "link", "", "");
			sRecord = sRecord:gsub("library\.d20monsters\.entries\.", "reference\.npcdata\.");
			sRecord = sRecord:gsub("library\.PFBestiary\.entries\.", "reference\.npcdata\.");
			DB.setValue(vNPC, "link", "windowreference", sClass, sRecord);
		end
	end
end

function convertPSEnc15()
	for _,vEnc in ipairs(DB.getChildList("partysheet.encounters")) do
		DB.setValue(vEnc, "exp", "number", DB.getValue(vEnc, "xp", "number"));
	end
end

function convertNPC14()
	for _,vNPC in ipairs(DB.getChildList("npc")) do
		migrateSpells12(vNPC);
	end
end

function migrateModuleParcel12(nodeRecord)
	for _,vItem in ipairs(DB.getChildList(nodeRecord, "itemlist")) do
		if DB.getType(DB.getPath(vItem, "description")) == "string" then
			convertItemInList11(vItem);
		end
	end
end

function convertModuleParcels12(nodeRoot)
	for _,vParcel in ipairs(DB.getChildList(nodeRoot, "treasureparcels")) do
		migrateModuleParcel12(vParcel);
	end
end

function convertModuleNPCs13(nodeRoot)
	for _,vNPC in ipairs(DB.getChildList(nodeRoot, "npc")) do
		migrateSpells12(vNPC);
	end
end

function migrateSpells12(nodeCreature)
	for _,vClass in ipairs(DB.getChildList(nodeCreature, "spellset")) do
		for _,vLevel in ipairs(DB.getChildList(vClass, "levels")) do
			for _,vSpell in ipairs(DB.getChildList(vLevel, "spells")) do
				for _,vAction in ipairs(DB.getChildList(vSpell, "actions")) do
					local bCleanup = false;
					if DB.isNode(DB.getPath(vAction, "dmgmeta")) or DB.isNode(DB.getPath(vAction, "healmeta")) then
						local sType = DB.getValue(vAction, "type", "");
						if sType == "damage" then
							DB.setValue(vAction, "meta", "string", DB.getValue(vAction, "dmgmeta", ""));
							
							local nodeDmgList = DB.createChild(vAction, "damagelist");
							if nodeDmgList then
								local nodeDmg = DB.createChild(nodeDmgList);
								if nodeDmg then
									DB.setValue(nodeDmg, "dice", "dice", DB.getValue(vAction, "dmgdice", {}));
									DB.setValue(nodeDmg, "dicestat", "string", DB.getValue(vAction, "dmgdicemult", ""));
									DB.setValue(nodeDmg, "dicestatmax", "number", DB.getValue(vAction, "dmgdicemultmax", 0));
									local nStatMult = DB.getValue(vAction, "dmgstatmult", 0);
									if nStatMult > 0 then
										DB.setValue(nodeDmg, "statmult", "number", nStatMult);
										DB.setValue(nodeDmg, "stat", "string", DB.getValue(vAction, "dmgstat", ""));
									end
									DB.setValue(nodeDmg, "statmax", "number", DB.getValue(vAction, "dmgmaxstat", 0));
									DB.setValue(nodeDmg, "bonus", "number", DB.getValue(vAction, "dmgmod", 0));
									DB.setValue(nodeDmg, "type", "string", DB.getValue(vAction, "dmgtype", ""));
									
									bCleanup = true;
								end
							end
							
						elseif sType == "heal" then
							DB.setValue(vAction, "meta", "string", DB.getValue(vAction, "healmeta", ""));
							
							local nodeHealList = DB.createChild(vAction, "heallist");
							if nodeHealList then
								local nodeHeal = DB.createChild(nodeHealList);
								if nodeHeal then
									DB.setValue(nodeHeal, "dice", "dice", DB.getValue(vAction, "hdice", {}));
									DB.setValue(nodeHeal, "dicestat", "string", DB.getValue(vAction, "hdicemult", ""));
									DB.setValue(nodeHeal, "dicestatmax", "number", DB.getValue(vAction, "hdicemultmax", 0));
									local nStatMult = DB.getValue(vAction, "hstatmult", 0);
									if nStatMult > 0 then
										DB.setValue(nodeHeal, "statmult", "number", nStatMult);
										DB.setValue(nodeHeal, "stat", "string", DB.getValue(vAction, "hstat", ""));
									end
									DB.setValue(nodeHeal, "statmax", "number", DB.getValue(vAction, "hmaxstat", 0));
									DB.setValue(nodeHeal, "bonus", "number", DB.getValue(vAction, "hmod", 0));
									
									bCleanup = true;
								end
							end

						else
							bCleanup = true;
						end
					end
					
					if bCleanup then
						if sType ~= "cast" then
							DB.deleteChild(vAction, "atktype");
							DB.deleteChild(vAction, "atkmod");
							DB.deleteChild(vAction, "clcmod");
							DB.deleteChild(vAction, "srnotallowed");
							DB.deleteChild(vAction, "savetype");
							DB.deleteChild(vAction, "savedcmod");
						end
						DB.deleteChild(vAction, "clcbase");
						DB.deleteChild(vAction, "savedcbase");
						
						if sType ~= "damage" then
							DB.deleteChild(vAction, "dmgnotspell");
						end
						DB.deleteChild(vAction, "dmgmeta");
						DB.deleteChild(vAction, "dmgdice");
						DB.deleteChild(vAction, "dmgdicemult");
						DB.deleteChild(vAction, "dmgdicemultmax");
						DB.deleteChild(vAction, "dmgstatmult");
						DB.deleteChild(vAction, "dmgstat");
						DB.deleteChild(vAction, "dmgmaxstat");
						DB.deleteChild(vAction, "dmgmod");
						DB.deleteChild(vAction, "dmgtype");
						
						if sType ~= "heal" then
							DB.deleteChild(vAction, "healtype");
						end
						DB.deleteChild(vAction, "healmeta");
						DB.deleteChild(vAction, "hdice");
						DB.deleteChild(vAction, "hdicemult");
						DB.deleteChild(vAction, "hdicemultmax");
						DB.deleteChild(vAction, "hstatmult");
						DB.deleteChild(vAction, "hstat");
						DB.deleteChild(vAction, "hmaxstat");
						DB.deleteChild(vAction, "hmod");

						if sType ~= "effect" then
							DB.deleteChild(vAction, "targeting");
							DB.deleteChild(vAction, "apply");
							DB.deleteChild(vAction, "label");
							DB.deleteChild(vAction, "durmult");
							DB.deleteChild(vAction, "durstat");
							DB.deleteChild(vAction, "dmaxstat");
							DB.deleteChild(vAction, "durdice");
							DB.deleteChild(vAction, "durmod");
							DB.deleteChild(vAction, "durunit");
						end
					end
				end
			end
		end
	end
end

function migrateChar12(nodePC)
	for _,nodeWeapon in ipairs(DB.getChildList(nodePC, "weaponlist")) do
		if not DB.getChild(nodeWeapon, "damagelist") then
			local nodeDmgList = DB.createChild(nodeWeapon, "damagelist");
			if nodeDmgList then
				local nodeDmg = DB.createChild(nodeDmgList);
				if nodeDmg then
					local sDmgType = DB.getValue(nodeWeapon, "damagetype", "");
					local sDmgStat = DB.getValue(nodeWeapon, "damagestat1", "");
					if sDmgStat == "" then
						sDmgStat = "strength";
					end
					local nDmgMult = DB.getValue(nodeWeapon, "critdmgmult", 2);
					
					DB.setValue(nodeDmg, "dice", "dice", DB.getValue(nodeWeapon, "damagedice", {}));
					DB.setValue(nodeDmg, "bonus", "number", DB.getValue(nodeWeapon, "damagebonus", 0));
					DB.setValue(nodeDmg, "type", "string", sDmgType);
					DB.setValue(nodeDmg, "critmult", "number", nDmgMult);
					
					local nDmgStatMult = 1;
					local nDmgStatMax = 0;
					if DB.getValue(nodeWeapon, "type", 0) == 1 then
						local sRangedStatAdj = DB.getValue(nodeWeapon, "damagerangedstatadj", "");
						if sRangedStatAdj == "bow" then
							nDmgStatMax = DB.getValue(nodeWeapon, "damagemaxstat", 0);
							if nDmgStatMax == 0 then
								sDmgStat = "";
							end
						elseif sRangedStatAdj == "thrown" then
							nDmgStatMult = 1;
						elseif sRangedStatAdj == "thrownoh" then
							nDmgStatMult = 0.5;
						else
							sDmgStat = "";
						end
					else
						local sMeleeStatAdj = DB.getValue(nodeWeapon, "damagemeleestatadj", "");
						if sMeleeStatAdj == "2h" then
							nDmgStatMult = 1.5;
						elseif sMeleeStatAdj == "oh" then
							nDmgStatMult = 0.5;
						end
					end
					DB.setValue(nodeDmg, "stat", "string", sDmgStat);
					DB.setValue(nodeDmg, "statmult", "number", nDmgStatMult);
					DB.setValue(nodeDmg, "statmax", "number", nDmgStatMax);
					
					local sDmgStat2 = DB.getValue(nodeWeapon, "damagestat2", "");
					if sDmgStat2 ~= "" then
						local nodeDmg2 = DB.createChild(nodeDmgList);
						DB.setValue(nodeDmg2, "stat", "string", sDmgStat2);
						DB.setValue(nodeDmg2, "type", "string", sDmgType);
						DB.setValue(nodeDmg2, "critmult", "number", nDmgMult);
					end
					
					DB.deleteChild(nodeWeapon, "critdmgmult");
					DB.deleteChild(nodeWeapon, "damagedice");
					DB.deleteChild(nodeWeapon, "damagestat1");
					DB.deleteChild(nodeWeapon, "damagestat2");
					DB.deleteChild(nodeWeapon, "damagebonus");
					DB.deleteChild(nodeWeapon, "damagetype");
					DB.deleteChild(nodeWeapon, "damagemeleestatadj");
					DB.deleteChild(nodeWeapon, "damagerangedstatadj");
					DB.deleteChild(nodeWeapon, "damagemaxstat");
					DB.deleteChild(nodeWeapon, "damagetotalbonus");
				end
			end
		end
	end

	migrateSpells12(nodePC);
end

function convertChar12()
	for _,nodePC in ipairs(DB.getChildList("charsheet")) do
		migrateChar12(nodePC);
	end
end

function migrateChar11(nodePC)
	DB.setValue(nodePC, "token", "token", DB.getValue(nodePC, "combattoken"));
	DB.deleteChild(nodePC, "combattoken");
end

function convertChar11()
	for _,nodePC in ipairs(DB.getChildList("charsheet")) do
		migrateChar11(nodePC);
	end
end

function convertCombat11()
	if DB.findNode("combattracker.list") then
		return;
	end
	
	local aCombatants = DB.getChildren("combattracker");
	local nodeList = DB.createNode("combattracker.list");
	
	for _,vNPC in pairs(aCombatants) do
		local nodeNew = DB.createChild(nodeList);

		-- Get rid of type field
		DB.deleteChild(vNPC, "type");
		
		-- Migrate show_npc to tokenvis
		DB.setValue(vNPC, "tokenvis", "number", DB.getValue(vNPC, "show_npc", 0));
		DB.deleteChild(vNPC, "show_npc");
		
		-- Copy node over to new location
		-- And convert partial to full records
		local sClass, sRecord = DB.getValue(vNPC, "link", "", "");
		if sRecord == "" or sClass == "charsheet" then
			DB.copyNode(vNPC, nodeNew);
			if sClass ~= "charsheet" then
				DB.setValue(nodeNew, "link", "windowreference", "npc", "");
			end
		else
			local nodeRecord = DB.findNode(sRecord);
			if nodeRecord then
				DB.copyNode(nodeRecord, nodeNew);
			end
			DB.copyNode(vNPC, nodeNew);
			DB.setValue(nodeNew, "link", "windowreference", "npc", "");
		end
		
		-- Delete the old record
		DB.deleteNode(vNPC);
	end
	
	-- Migrate round counter to new location
	DB.setValue("combattracker.round", "number", DB.getValue("combattracker_props.round", 0));
	DB.deleteNode("combattracker_props");
end

function convertItemInList11(vItem)
	local nCount = DB.getValue(vItem, "amount", 0);

	local nodeNew = nil;
	local sClass, sRecord = DB.getValue(vItem, "shortcut");
	if sClass and sRecord and sRecord ~= "" then
		nodeNew = ItemManager.addItemToList(DB.getParent(vItem), sClass, sRecord);
		if nodeNew then
			DB.setValue(nodeNew, "count", "number", nCount);
			DB.deleteNode(vItem);
		end
	end
	if not nodeNew then
		local sName = DB.getValue(vItem, "description", "");
		
		if nCount == 0 and sName == "" then
			DB.deleteNode(vItem);
		else
			DB.deleteChild(vItem, "description");
			DB.setValue(vItem, "name", "string", sName);
			DB.setValue(vItem, "count", "number", nCount);
		end
	end
end

function convertParty11()
	for _,vItem in ipairs(DB.getChildList("partysheet.treasureparcelitemlist")) do
		convertItemInList11(vItem);
	end
end

function convertParcel11()
	for _,vParcel in ipairs(DB.getChildList("treasureparcels")) do
		for _,vItem in ipairs(DB.getChildList(vParcel, "itemlist")) do
			convertItemInList11(vItem);
		end
	end
end

function convertSystem11()
	if DB.getValue("options.SYSTEM", "") == "pf" then
		DB.convertCampaign("PFRPG");
	end
	DB.deleteNode("options.SYSTEM");
end

function convertRegistry11()
	CampaignRegistry.windowpositions = nil;
end

function convertLog10()
	local nodeLog = DB.findNode("partysheet.adventurelog");
	if nodeLog then
		local nodeNewLog = DB.createNode("calendar.log");
		if nodeNewLog then
			DB.copyNode(nodeLog, nodeNewLog);
			DB.deleteNode(nodeLog);
		end
	end
end

function migrateChar9(nodeChar)
	local nACMisc = DB.getValue(nodeChar, "ac.sources.misc", 0);
	if nACMisc ~= 0 then
		DB.setValue(nodeChar, "ac.sources.ffmisc", "number", nACMisc);
		DB.setValue(nodeChar, "ac.sources.touchmisc", "number", nACMisc);

		local nCMDMisc = DB.getValue(nodeChar, "ac.sources.cmdmisc", 0) + nACMisc;
		DB.setValue(nodeChar, "ac.sources.cmdmisc", "number", nCMDMisc);
	end
end

function convertCharacters9()
	for _,nodeChar in ipairs(DB.getChildList("charsheet")) do
		migrateChar9(nodeChar);
	end
end

function migrateEncounter9(nodeRecord)
	for _,nodeNPC in ipairs(DB.getChildList(nodeRecord, "npclist")) do
		for _,nodeMapLink in ipairs(DB.getChildList(nodeNPC, "maplink")) do
			local nodeImageLink = DB.getChild(nodeMapLink, "imagelink");
			if nodeImageLink then
				DB.setValue(nodeMapLink, "imageref", "windowreference", "imagewindow", DB.getValue(nodeImageLink));
				DB.deleteNode(nodeImageLink);
			end
		end
	end
end

function convertEncounters9()
	for _,nodeEnc in ipairs(DB.getChildList("battle")) do
		migrateEncounter9(nodeEnc);
	end
end

function convertOptions9()
	local nodeOptions = DB.findNode("options");
	if not nodeOptions then
		return;
	end
	
	local sOptionHRNH = "off";
	local nodeOptionRHPS = DB.getChild(nodeOptions, "RHPS");
	if nodeOptionRHPS then
		if DB.getValue(nodeOptionRHPS) == "on" then
			sOptionHRNH = "random";
		end
		DB.deleteNode(nodeOptionRHPS);
	end
	DB.setValue(nodeOptions, "HRNH", "string", sOptionHRNH);
end

function migrateChar8(nodeChar)
	local nodeSpecial = DB.getChild(nodeChar, "special");
	if nodeSpecial then
		local nodeSR = DB.getChild(nodeSpecial, "spellresistance");
		if nodeSR then
			DB.setValue(nodeChar, "defenses.sr.base", "number", DB.getValue(nodeSR));
		end
	
		local nodeDR = DB.getChild(nodeSpecial, "damagereduction");
		if nodeDR then
			local nDR = DB.getValue(nodeDR);
			if nDR ~= 0 then
				DB.setValue(nodeChar, "defenses.damagereduction", "string", nDR);
			end
		end
		
		local nodeSF = DB.getChild(nodeSpecial, "spellfailure");
		if nodeSF then
			DB.setValue(nodeChar, "encumbrance.spellfailure", "number", DB.getValue(nodeSF));
		end

		DB.deleteNode(nodeSpecial);
	end
	
	local nodeEnc = DB.getChild(nodeChar, "encumbrance");
	if nodeEnc then
		local nodeEncMaxBonus = DB.getChild(nodeEnc, "armormaxdexbonus");
		if nodeEncMaxBonus then
			DB.setValue(nodeEnc, "armormaxstatbonus", "number", DB.getValue(nodeEncMaxBonus));
			DB.deleteNode(nodeEncMaxBonus);
		end
		
		local nodeEncMaxBonusActive = DB.getChild(nodeEnc, "armormaxdexbonusactive");
		if nodeEncMaxBonusActive then
			DB.setValue(nodeEnc, "armormaxstatbonusactive", "number", DB.getValue(nodeEncMaxBonusActive));
			DB.deleteNode(nodeEncMaxBonusActive);
		end
	end
	
	local nodeSpeed = DB.getChild(nodeChar, "speed");
	if nodeSpeed then
		local nSpeed = DB.getValue(nodeSpeed);
		DB.deleteNode(nodeSpeed);
		DB.setValue(nodeChar, "speed.base", "number", nSpeed);
	end
	
	local aClasses = {};
	local nodeClassList = DB.getChild(nodeChar, "classes");
	if nodeClassList then
		local nodeOldClass, nodeNewClass, sClass, nLevel;
		
		for i = 1, 3 do
			nodeOldClass = DB.getChild(nodeClassList, "slot" .. i);
			if nodeOldClass then
				sClass = DB.getValue(nodeOldClass, "name", "");
				nLevel = DB.getValue(nodeOldClass, "level", 0);
				
				table.insert(aClasses, sClass);
				
				if (sClass ~= "") or (nLevel ~= 0) then
					local nodeNewClass = DB.createChild(nodeClassList);
					if nodeNewClass then
						DB.setValue(nodeNewClass, "name", "string", sClass);
						DB.setValue(nodeNewClass, "level", "number", nLevel);
					end
				end

				DB.deleteNode(nodeOldClass);
			end
		end
	end
	
	for _,nodeSkill in ipairs(DB.getChildList(nodeChar, "skilllist")) do
		local aLabelWords = StringManager.parseWords(DB.getValue(nodeSkill, "label", ""));
		for i = 1, #aLabelWords do
			if aLabelWords[i] ~= "" and aLabelWords[i] ~= "of" then
				aLabelWords[i] = StringManager.capitalize(aLabelWords[i]);
			end
		end
		DB.setValue(nodeSkill, "label", "string", table.concat(aLabelWords, " "));
	end
	
	for _,nodeWeapon in ipairs(DB.getChildList(nodeChar, "weaponlist")) do
		local nodeCritRng = DB.getChild(nodeWeapon, "critrange");
		if nodeCritRng then
			local sCritRng = DB.getValue(nodeCritRng);
			
			local nDash = string.find(sCritRng, "-");
			if nDash then
				sCritRng = string.sub(sCritRng, 1, nDash - 1);
			end
			local nCritThreshold = tonumber(sCritRng) or 20;
			
			DB.setValue(nodeWeapon, "critatkrange", "number", nCritThreshold);
			
			DB.deleteNode(nodeCritRng);
		end
		
		local nodeCritMult = DB.getChild(nodeWeapon, "critmultiplier");
		if nodeCritMult then
			local sCritMult = DB.getValue(nodeCritMult);
			
			local nCritMult = 2;
			local sCritMultNum = string.match(sCritMult, "%d+");
			if sCritMultNum then
				nCritMult = tonumber(sCritMultNum) or 0;
				if nCritMult < 2 then
					nCritMult = 2;
				end
			end
			
			DB.setValue(nodeWeapon, "critdmgmult", "number", nCritMult);
		
			DB.deleteNode(nodeCritMult);
		end
	end
	
	local nodeSpellClassList = DB.getChild(nodeChar, "spellset");
	if nodeSpellClassList then
		local nodeSpellClass, nodeNewSpellClass;
		
		for i = 1, 3 do
			nodeSpellClass = DB.getChild(nodeSpellClassList, "set" .. i);
			if nodeSpellClass then
				nodeNewSpellClass = DB.createChild(nodeSpellClassList);
				if nodeNewSpellClass then
					DB.copyNode(nodeSpellClass, nodeNewSpellClass);
					
					local sCasterType = "";
					local nodeSpontaneous = DB.getChild(nodeNewSpellClass, "spontaneous");
					if nodeSpontaneous then
						local nSpontaneous = DB.getValue(nodeSpontaneous);
						if nSpontaneous == 1 then
							sCasterType = "spontaneous";
						end
						
						DB.deleteNode(nodeSpontaneous);
					end
					DB.setValue(nodeNewSpellClass, "castertype", "string", sCasterType);
					
					if aClasses[i] then
						DB.setValue(nodeNewSpellClass, "label", "string", aClasses[i]);
					end

					DB.deleteNode(nodeSpellClass);
				end
			end
		end
	end
end

function convertCharacters()
	for _,nodeChar in ipairs(DB.getChildList("charsheet")) do
		migrateChar8(nodeChar);
	end
end

function convertCT()
	local nodeCT = DB.findNode("combattracker");
	if not nodeCT then
		return;
	end
	
	-- REMOVE OLD GROUPS
	for _,nodeGroup in ipairs(DB.getChildList(nodeCT)) do
		if DB.getChild(nodeGroup, "entries") then
			-- EXISTENCE OF ENTRIES LIST INDICATES OLD GROUP FORMAT
			for _,nodeEntry in ipairs(DB.getChildList(nodeGroup, "entries")) do
				local nodeNewEntry = DB.createChild(nodeCT);
				if nodeNewEntry then
					DB.copyNode(nodeEntry, nodeNewEntry);
				end
			end
			
			DB.deleteNode(nodeGroup);
		end
	end
	
	-- TRANSLATE INDIVIDUAL ENTRIES
	for _,nodeEntry in ipairs(DB.getChildList(nodeCT)) do
		-- TYPE
		local nodeType = DB.getChild(nodeEntry, "type");
		if not nodeType then
			local sType = "npc";
			
			local nodeLink = DB.getChild(nodeEntry, "link");
			if nodeLink then
				local sClass, sRecord = DB.getValue(nodeLink);
				if sRecord and string.match(sRecord, "^charsheet%.") then
					sType = "pc";
				end
			end
			
			DB.setValue(nodeEntry, "type", "string", sType);
			
			if sType == "npc" then
				DB.setValue(nodeEntry, "show_npc", "number", 1);
			end
		end
		
		-- AC (BOTH)
		local nodeAC = DB.getChild(nodeEntry, "ac");
		if nodeAC then
			local sAC = DB.getValue(nodeAC);
			DB.setValue(nodeEntry, "ac_final", "number", tonumber(string.match(sAC, "^(%d+)")) or 10);
			DB.setValue(nodeEntry, "ac_touch", "number", tonumber(string.match(sAC, "touch (%d+)")) or 10);
			local sFlatFooted = string.match(sAC, "flat[%-–]footed (%d+)");
			if not sFlatFooted then
				sFlatFooted = string.match(sAC, "flatfooted (%d+)");
			end
			DB.setValue(nodeEntry, "ac_flatfooted", "number", tonumber(sFlatFooted) or 10);
			
			DB.deleteNode(nodeAC);
		end
		
		-- ATTACK / FULL ATTACK (BOTH)
		local nodeAttacks = DB.createChild(nodeEntry, "attacks");
		if nodeAttacks then
			local nodeAtk = DB.getChild(nodeEntry, "atk");
			if nodeAtk then
				local nodeNewAtk = DB.createChild(nodeAttacks);
				if nodeNewAtk then
					DB.setValue(nodeNewAtk, "value", "string", DB.getValue(nodeAtk));
					
					DB.deleteNode(nodeAtk);
				end
			end
			local nodeFullAtk = DB.getChild(nodeEntry, "fullatk");
			if nodeFullAtk then
				local nodeNewAtk = DB.createChild(nodeAttacks);
				if nodeNewAtk then
					DB.setValue(nodeNewAtk, "value", "string", DB.getValue(nodeFullAtk));
					
					DB.deleteNode(nodeFullAtk);
				end
			end
		end
		
		-- TOKEN
		local nodeOldTokenRefId = DB.getChild(nodeEntry, "token_refid");
		if nodeOldTokenRefId then
			DB.setValue(nodeEntry, "tokenrefid", "string", DB.getValue(nodeOldTokenRefId));
			DB.deleteNode(nodeOldTokenRefId);
		end
		local nodeOldTokenRefNode = DB.getChild(nodeEntry, "token_refnode");
		if nodeOldTokenRefNode then
			DB.setValue(nodeEntry, "tokenrefnode", "string", DB.getValue(nodeOldTokenRefNode));
			DB.deleteNode(nodeOldTokenRefNode);
		end
		local nodeOldTokenRefScale = DB.getChild(nodeEntry, "token_scale");
		if nodeOldTokenRefScale then
			DB.setValue(nodeEntry, "tokenscale", "number", DB.getValue(nodeOldTokenRefScale));
			DB.deleteNode(nodeOldTokenRefScale);
		end
	end
end

function convertEncounters()
	local nodeCombat = DB.findNode("combat");
	local nodeBattle = DB.createNode("battle");
	if not nodeCombat or not nodeBattle then
		return;
	end
	
	for _,nodeOldEnc in ipairs(DB.getChildList(nodeCombat)) do
		local nodeNewEnc = DB.createChild(nodeBattle);
		if nodeNewEnc then
			DB.setValue(nodeNewEnc, "name", "string", DB.getValue(nodeOldEnc, "name", ""));
		
			local nodeNewActors = DB.createChild(nodeNewEnc, "npclist");
			if nodeNewActors then
				for _,nodeOldActor in ipairs(DB.getChildList(nodeOldEnc, "actors")) do
					local nodeNewActor = DB.createChild(nodeNewActors);
					if nodeNewActor then
						DB.setValue(nodeNewActor, "name", "string", DB.getValue(nodeOldActor, "name", ""));
						DB.setValue(nodeNewActor, "token", "token", DB.getValue(nodeOldActor, "token", ""));
					end
				end
			end
		end
	end
	
	DB.deleteNode(nodeCombat);
end

function convertOptions()
	local nodeOptions = DB.findNode("options");
	if not nodeOptions then
		return;
	end
	
	local sOptionINIT = DB.getValue(nodeOptions, "INIT", "");
	if DB.getValue(nodeOptions, "INIT", "") == "all" then
		DB.setValue(nodeOptions, "INIT", "string", "on");
	end
end