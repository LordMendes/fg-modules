--
-- 3.5 Cesar house rules. Loaded by the 3.5-cesar ruleset.
--

function getPcHealth(nodeChar)
	local nHP = DB.getValue(nodeChar, "hp.total", 0);
	local nWounds = DB.getValue(nodeChar, "hp.wounds", 0);
	return nHP, nWounds;
end

function getWoundTotals(rActor)
	if not rActor then
		return 0, 0;
	end
	if ActorManager.isPC(rActor) then
		local nodeChar = ActorManager.getCreatureNode(rActor);
		if nodeChar then
			return getPcHealth(nodeChar);
		end
	end
	local nHP = GameManager.getRecordFieldValueLinked(rActor, "hptotal", 0);
	local nWounds = GameManager.getRecordFieldValueLinked(rActor, "wounds", 0);
	return nHP, nWounds;
end

function getRemainingRatio(nodeChar)
	if not nodeChar then
		return nil;
	end
	local nHP, nWounds = getPcHealth(nodeChar);
	if nHP <= 0 then
		return nil;
	end
	return (nHP - nWounds) / nHP;
end

function woundsEnabled()
	return OptionsManager.isOption("HRWD", "on");
end

function isWoundOverridden(vActor)
	local nodeChar = vActor;
	if type(vActor) == "table" then
		if not ActorManager.isPC(vActor) then
			return false;
		end
		nodeChar = ActorManager.getCreatureNode(vActor);
	end
	if not nodeChar then
		return false;
	end
	return DB.getValue(nodeChar, "woundoverride", 0) ~= 0;
end

function shouldHalfMovement(nodeChar)
	if not woundsEnabled() or isWoundOverridden(nodeChar) then
		return false;
	end
	local nRemaining = getRemainingRatio(nodeChar);
	return (nRemaining ~= nil) and (nRemaining <= 0.10);
end

function getWoundPenalty(rActor)
	if not woundsEnabled() or isWoundOverridden(rActor) then
		return 0;
	end
	local nHP, nWounds = getWoundTotals(rActor);
	if nHP <= 0 then
		return 0;
	end
	local nRemaining = (nHP - nWounds) / nHP;
	if nRemaining <= 0.10 then
		return -4;
	end
	if nRemaining <= 0.25 then
		return -2;
	end
	if nRemaining <= 0.50 then
		return -1;
	end
	return 0;
end

function getTotalLevel(nodeChar)
	if not nodeChar then
		return 0;
	end
	local nLevel = DB.getValue(nodeChar, "level", 0);
	if nLevel > 0 then
		return nLevel;
	end
	local nSum = 0;
	for _, nodeClass in ipairs(DB.getChildList(nodeChar, "classes")) do
		nSum = nSum + DB.getValue(nodeClass, "level", 0);
	end
	return nSum;
end

function recoverAlignmentUse(nodeChar)
	if not nodeChar then
		return;
	end
	local nLevel = getTotalLevel(nodeChar);
	local nUses = DB.getValue(nodeChar, "alignmentuses", 0);
	if nUses < nLevel then
		DB.setValue(nodeChar, "alignmentuses", "number", nUses + 1);
	end
end

function spendAlignment(nodeChar)
	if not nodeChar then
		return;
	end
	local nUses = DB.getValue(nodeChar, "alignmentuses", 0);
	if nUses <= 0 then
		ChatManager.SystemMessage(Interface.getString("cesar_message_alignment_empty"));
		return;
	end
	DB.setValue(nodeChar, "alignmentuses", "number", nUses - 1);
	if ModifierStack and ModifierStack.addSlot then
		ModifierStack.addSlot(Interface.getString("cesar_label_alignment"), 1);
	end
	ChatManager.SystemMessage(Interface.getString("cesar_message_alignment_spent"));
end

function toggleEffect(nodeChar, sPrefix, sText)
	if not nodeChar then
		return;
	end
	local rActor = ActorManager.resolveActor(nodeChar);
	local nodeCT = ActorManager.getCTNode(rActor);
	if not nodeCT then
		ChatManager.SystemMessage(Interface.getString("cesar_message_need_ct"));
		return;
	end
	local sPrefixLower = sPrefix:lower();
	for _, nodeEffect in ipairs(DB.getChildList(nodeCT, "effects")) do
		local sLabel = DB.getValue(nodeEffect, "label", "");
		if sLabel:lower():find("^" .. sPrefixLower) then
			DB.deleteNode(nodeEffect);
			return;
		end
	end
	EffectManager.addEffectByText(rActor, sText);
end

function getEnhancementFromClauses(aClauses)
	local nEnhancement = 0;
	local bMagic = false;
	for _, tClause in ipairs(aClauses or {}) do
		local sType = (tClause.dmgtype or ""):lower();
		if sType:find("magic", 1, true) then
			bMagic = true;
		end
		local nPlus = tonumber(sType:match("%+(%d+)"));
		if nPlus and nPlus > nEnhancement then
			nEnhancement = nPlus;
		end
	end
	if bMagic and nEnhancement < 1 then
		nEnhancement = 1;
	end
	return nEnhancement;
end

function getWeaponEnhancement(nodeWeapon, aClauses)
	local nEnhancement = getEnhancementFromClauses(aClauses);
	local bMagic = false;
	for _, tClause in ipairs(aClauses or {}) do
		if ((tClause.dmgtype or ""):lower()):find("magic", 1, true) then
			bMagic = true;
			break;
		end
	end
	if bMagic and nodeWeapon then
		local nBonus = DB.getValue(nodeWeapon, "bonus", 0);
		if nBonus > nEnhancement then
			nEnhancement = nBonus;
		end
		if nEnhancement < 1 then
			nEnhancement = 1;
		end
	end
	return nEnhancement;
end

function getRollEnhancement(rRoll)
	if not rRoll then
		return 0;
	end
	local nEnhancement = tonumber((rRoll.sDesc or ""):match("%[ENH %+(%d+)%]")) or 0;
	local nClause = getEnhancementFromClauses(rRoll.clauses);
	if nClause > nEnhancement then
		nEnhancement = nClause;
	end
	return nEnhancement;
end

function applyMagicDRThreshold(rRoll, tApplyData)
	if not tApplyData or not tApplyData.tCompsData then
		return;
	end
	local aDR = tApplyData.tCompsData["DR"];
	if not aDR then
		return;
	end
	local nEnhancement = getRollEnhancement(rRoll);
	for _, tComp in pairs(aDR) do
		local sRemainder = tComp.sRemainder;
		if type(sRemainder) == "string" then
			local s = sRemainder:lower():gsub("%s+", " ");
			s = s:match("^%s*(.-)%s*$");
			local nLevel = nil;
			if s == "magic" then
				nLevel = 1;
			else
				nLevel = tonumber(s:match("^magic (%d+)$"));
			end
			if nLevel then
				if nEnhancement >= nLevel then
					tComp.mod = 0;
				else
					tComp.sRemainder = "all";
				end
			end
		end
	end
end

local function listPathForKind(sKind)
	if sKind == "resist" then
		return "damagereduction.resistlist";
	end
	return "damagereduction.drlist";
end

local function writeDamageReductionNode(node, tEntry, nAmount)
	DB.setValue(node, "kind", "string", tEntry.kind or "dr");
	DB.setValue(node, "amount", "number", nAmount);
	DB.setValue(node, "bypass", "string", tEntry.bypass or "");
	DB.setValue(node, "energy", "string", tEntry.energy or "");
	DB.setValue(node, "label", "string", tEntry.label or "");
end

function migrateDamageReductionLists(nodeChar)
	if not nodeChar then
		return;
	end
	local nodeOld = DB.getChild(nodeChar, "damagereduction.list");
	if not nodeOld then
		return;
	end
	local aOld = DB.getChildList(nodeOld);
	if #aOld == 0 then
		return;
	end
	for _, node in ipairs(aOld) do
		local sKind = DB.getValue(node, "kind", "dr");
		local nodeList = DB.createChild(nodeChar, listPathForKind(sKind));
		if nodeList then
			local nodeNew = DB.createChild(nodeList);
			writeDamageReductionNode(nodeNew, {
				kind = sKind,
				bypass = DB.getValue(node, "bypass", ""),
				energy = DB.getValue(node, "energy", ""),
				label = DB.getValue(node, "label", ""),
			}, DB.getValue(node, "amount", 0));
			DB.deleteNode(node);
		end
	end
end

local function eachDamageReductionEntry(nodeChar, fn)
	migrateDamageReductionLists(nodeChar);
	for _, sPath in ipairs({ "damagereduction.drlist", "damagereduction.resistlist" }) do
		for _, node in ipairs(DB.getChildList(nodeChar, sPath)) do
			fn(node);
		end
	end
end

function addDamageReduction(nodeChar, tEntry)
	if not nodeChar or not tEntry then
		return false;
	end
	local nAmount = tEntry.amount or 0;
	if nAmount < 1 then
		return false;
	end
	migrateDamageReductionLists(nodeChar);
	local nodeList = DB.createChild(nodeChar, listPathForKind(tEntry.kind));
	if not nodeList then
		return false;
	end
	local node = DB.createChild(nodeList);
	writeDamageReductionNode(node, tEntry, nAmount);
	refreshDamageReductionSummary(nodeChar);
	return true;
end

function updateDamageReduction(nodeEntry, tEntry)
	if not nodeEntry or not tEntry then
		return false;
	end
	local nAmount = tEntry.amount or 0;
	if nAmount < 1 then
		return false;
	end
	local nodeChar = DB.getChild(nodeEntry, "....");
	local nodeParent = DB.getParent(nodeEntry);
	local sParent = nodeParent and DB.getName(nodeParent) or "";
	local sWant = (tEntry.kind == "resist") and "resistlist" or "drlist";
	if nodeChar and sParent ~= sWant then
		local nodeList = DB.createChild(nodeChar, "damagereduction." .. sWant);
		if not nodeList then
			return false;
		end
		local nodeNew = DB.createChild(nodeList);
		writeDamageReductionNode(nodeNew, tEntry, nAmount);
		DB.deleteNode(nodeEntry);
	else
		writeDamageReductionNode(nodeEntry, tEntry, nAmount);
	end
	refreshDamageReductionSummary(nodeChar);
	return true;
end

function refreshDamageReductionSummary(nodeChar)
	if not nodeChar then
		return;
	end
	local aLabels = {};
	eachDamageReductionEntry(nodeChar, function(node)
		local sLabel = DB.getValue(node, "label", "");
		if sLabel ~= "" then
			table.insert(aLabels, sLabel);
		end
	end);
	DB.setValue(nodeChar, "defenses.damagereduction", "string", table.concat(aLabels, ", "));
end

local function splitJoin(s, sJoin)
	local a = {};
	local sPattern = "%s+" .. sJoin .. "%s+";
	local n = 1;
	while n <= #s do
		local i, j = s:find(sPattern, n);
		if not i then
			table.insert(a, StringManager.trim(s:sub(n)));
			break;
		end
		table.insert(a, StringManager.trim(s:sub(n, i - 1)));
		n = j + 1;
	end
	return a;
end

local function rewriteBypass(sRemainder, nEnhancement)
	local aKept = {};
	for _, sOr in ipairs(splitJoin(sRemainder, "or")) do
		if sOr ~= "" then
			local aOut = {};
			local bFail = false;
			for _, sAnd in ipairs(splitJoin(sOr, "and")) do
				local nMagic = nil;
				if sAnd == "magic" then
					nMagic = 1;
				else
					nMagic = tonumber(sAnd:match("^magic (%d+)$"));
				end
				if nMagic then
					if nEnhancement < nMagic then
						bFail = true;
						break;
					end
				elseif sAnd ~= "" then
					table.insert(aOut, sAnd);
				end
			end
			if not bFail then
				if #aOut == 0 then
					return nil;
				end
				table.insert(aKept, table.concat(aOut, " and "));
			end
		end
	end
	if #aKept == 0 then
		return "all";
	end
	return table.concat(aKept, " or ");
end

local function normalizeDRMagic(rRoll, aDR)
	local nEnhancement = getRollEnhancement(rRoll);
	for _, tComp in pairs(aDR or {}) do
		local s = tComp.sRemainder;
		if type(s) == "string" then
			s = s:lower():gsub("%s+", " ");
			s = s:match("^%s*(.-)%s*$") or "";
			if s ~= "" and s ~= "-" and s ~= "all" then
				local sNew = rewriteBypass(s, nEnhancement);
				if not sNew then
					tComp.mod = 0;
					tComp.sRemainder = "all";
				else
					tComp.sRemainder = sNew;
				end
			elseif s == "" then
				tComp.sRemainder = "-";
			end
		end
	end
end

local function addResistValue(tApplyData, sEnergy, nAmount)
	sEnergy = (sEnergy or ""):lower();
	if sEnergy == "" or nAmount <= 0 or not tApplyData then
		return;
	end
	tApplyData.tResolver = tApplyData.tResolver or {};
	local tRes = tApplyData.tResolver["RESIST"];
	if not tRes then
		tRes = {};
		tApplyData.tResolver["RESIST"] = tRes;
	end
	tRes[sEnergy] = tRes[sEnergy] or {};
	tRes[sEnergy].tNumeric = tRes[sEnergy].tNumeric or {};
	table.insert(tRes[sEnergy].tNumeric, { nMod = nAmount, tNegatives = {} });
end

function applyCharacterDefenses(rTarget, rRoll, tApplyData)
	if not rTarget or not tApplyData or not ActorManager.isPC(rTarget) then
		return;
	end
	local nodeChar = ActorManager.getCreatureNode(rTarget);
	if not nodeChar then
		return;
	end
	tApplyData.tCompsData = tApplyData.tCompsData or {};
	local aDR = tApplyData.tCompsData["DR"];
	if not aDR then
		aDR = {};
		tApplyData.tCompsData["DR"] = aDR;
	end
	local bSpell = rRoll and rRoll.bSpell;
	local aEntries = {};
	eachDamageReductionEntry(nodeChar, function(node)
		table.insert(aEntries, node);
	end);
	for _, node in ipairs(aEntries) do
		local nAmount = DB.getValue(node, "amount", 0);
		local sKind = DB.getValue(node, "kind", "");
		if nAmount > 0 and sKind == "dr" and not bSpell then
			local sBypass = DB.getValue(node, "bypass", "-");
			if sBypass == "" then
				sBypass = "-";
			end
			table.insert(aDR, {
				mod = nAmount,
				dice = {},
				sRemainder = sBypass,
				remainder = { sBypass },
			});
		elseif nAmount > 0 and sKind == "resist" then
			addResistValue(tApplyData, DB.getValue(node, "energy", ""), nAmount);
		end
	end
	if bSpell then
		for _, tComp in pairs(aDR) do
			tComp.mod = 0;
		end
	else
		normalizeDRMagic(rRoll, aDR);
	end
end

local _tLastRoll = {};
local _tHeroRoll = { attack = true, save = true, skill = true, grapple = true, critconfirm = true, };

function getHeroPointMax(nodeChar)
	return 20;
end

function getHeroPointGrant(nodeChar)
	return math.max(getTotalLevel(nodeChar) + 1, 1);
end

function announce(nodeChar, sText, bSecret)
	local rActor = nil;
	if nodeChar then
		rActor = ActorManager.resolveActor(nodeChar);
	end
	ChatManager.sendMessage(sText, { bSecret = bSecret, rActor = rActor });
end

function spendHeroPoint(nodeChar)
	local nCurrent = DB.getValue(nodeChar, "heropoints", 0);
	if nCurrent <= 0 then
		announce(nodeChar, Interface.getString("cesar_message_heropoint_empty"));
		return false;
	end
	DB.setValue(nodeChar, "heropoints", "number", nCurrent - 1);
	return true;
end

function grantHeroPoint(nodeChar)
	if not nodeChar then
		return;
	end
	local nMax = getHeroPointMax(nodeChar);
	local nCurrent = DB.getValue(nodeChar, "heropoints", 0);
	if nCurrent >= nMax then
		announce(nodeChar, Interface.getString("cesar_message_heropoint_full"));
		return;
	end
	local nGrant = math.min(getHeroPointGrant(nodeChar), nMax - nCurrent);
	nCurrent = nCurrent + nGrant;
	DB.setValue(nodeChar, "heropoints", "number", nCurrent);
	announce(nodeChar, string.format(Interface.getString("cesar_message_heropoint_gained"), nGrant, nCurrent, nMax));
end

function readFirstDie(rRoll)
	local vDie = rRoll and rRoll.aDice and rRoll.aDice[1];
	if type(vDie) == "table" then
		return vDie.result or 0;
	end
	return 0;
end

function rememberRoll(rSource, rRoll)
	if not rSource or not rRoll or not ActorManager.isPC(rSource) then
		return;
	end
	local nodeChar = ActorManager.getCreatureNode(rSource);
	if not nodeChar then
		return;
	end
	local sType = rRoll.sType or "";
	if not _tHeroRoll[sType] and sType ~= "stabilization" then
		return;
	end
	_tLastRoll[DB.getPath(nodeChar)] = {
		sType = sType,
		nDie = readFirstDie(rRoll),
		nTotal = ActionsManager.total(rRoll),
		bSecret = rRoll.bSecret,
		bSuccess = rRoll.bCesarSuccess,
		bAutoFail = (sType == "save" and readFirstDie(rRoll) == 1),
	};
end

function getLastRoll(nodeChar)
	if not nodeChar then
		return nil;
	end
	return _tLastRoll[DB.getPath(nodeChar)];
end

function applyHeroBonus(nodeChar)
	local tRoll = getLastRoll(nodeChar);
	if not tRoll or not _tHeroRoll[tRoll.sType] then
		announce(nodeChar, Interface.getString("cesar_message_heropoint_noroll"));
		return;
	end
	if not spendHeroPoint(nodeChar) then
		return;
	end
	local nOld = tRoll.nTotal;
	tRoll.nTotal = nOld + 5;
	announce(nodeChar, string.format(Interface.getString("cesar_message_heropoint_bonus"), tRoll.nTotal, nOld), tRoll.bSecret);
end

function rerollHero(nodeChar)
	local tRoll = getLastRoll(nodeChar);
	if not tRoll or not _tHeroRoll[tRoll.sType] then
		announce(nodeChar, Interface.getString("cesar_message_heropoint_noroll"));
		return;
	end
	if not spendHeroPoint(nodeChar) then
		return;
	end
	local nOldDie = tRoll.nDie;
	local nOldTotal = tRoll.nTotal;
	local nNew = math.random(20);
	local nKept = nOldDie;
	if nNew > nOldDie then
		nKept = nNew;
	end
	tRoll.nDie = nKept;
	tRoll.nTotal = nOldTotal + (nKept - nOldDie);
	if tRoll.sType == "save" then
		tRoll.bAutoFail = (nKept == 1);
	end
	announce(nodeChar, string.format(Interface.getString("cesar_message_heropoint_reroll"), nOldDie, nNew, nKept, tRoll.nTotal, nOldTotal), tRoll.bSecret);
end

function cheatDeath(nodeChar)
	if not nodeChar then
		return;
	end
	local rActor = ActorManager.resolveActor(nodeChar);
	local nHP, nWounds = getPcHealth(nodeChar);
	local nThreshold = 10;
	if GameSystem and GameSystem.getDeathThreshold and rActor then
		nThreshold = GameSystem.getDeathThreshold(rActor) or 10;
	end
	local bDead = (nHP > 0) and ((nWounds - nHP) >= nThreshold);
	local bDying = (nHP > 0) and (nWounds > nHP) and not bDead;
	local bStable = rActor and EffectManager.hasCondition(rActor, "Stable");
	local tRoll = getLastRoll(nodeChar);
	local bAutoFail = tRoll and tRoll.bAutoFail;
	local bStabFail = tRoll and (tRoll.sType == "stabilization") and (tRoll.bSuccess == false);
	local bNeedBody = bDead or (bDying and not bStable) or bStabFail;
	if not bNeedBody and not bAutoFail then
		announce(nodeChar, Interface.getString("cesar_message_heropoint_death_none"));
		return;
	end
	if not spendHeroPoint(nodeChar) then
		return;
	end
	local aNotes = {};
	if bNeedBody then
		if bDead or ((nWounds - nHP) >= nThreshold) then
			DB.setValue(nodeChar, "hp.wounds", "number", nHP + nThreshold - 1);
		end
		local nodeCT = rActor and ActorManager.getCTNode(rActor);
		if nodeCT then
			EffectManager.addCondition(rActor, "Stable");
			table.insert(aNotes, Interface.getString("cesar_message_heropoint_death_stable"));
		else
			table.insert(aNotes, Interface.getString("cesar_message_heropoint_death_stable_noct"));
		end
		if tRoll and tRoll.sType == "stabilization" then
			tRoll.bSuccess = true;
		end
	end
	if bAutoFail then
		tRoll.bAutoFail = false;
		table.insert(aNotes, Interface.getString("cesar_message_heropoint_death_save"));
	end
	announce(nodeChar, table.concat(aNotes, " "), tRoll and tRoll.bSecret);
end

local _tSkillDescriptions = {
	perception = {
		sName = "Perception",
		sAbility = "Wis",
		nTrained = 0,
		nArmor = 0,
		sText = "<p><b>Perception (Wis).</b> Use your senses to notice detail and danger. Source: https://www.epicpath.org/index.php?title=Perception</p>"
			.. "<p><b>Passive.</b> Free action. You are already taking 10, and allies cannot help. You notice an ordinary stimulus, or you notice nothing. You cannot passively catch a creature using Stealth, an invisible creature, a hidden trap, or a generic disguise. Those need a Spot check. Distance adds +1 to the DC per 10 feet. A closed door adds +5. Each foot of wall adds +10. Distraction adds +5. Sleep adds +10.</p>"
			.. "<p><b>Spot.</b> Move action (a swift action adds +10 to the DC). One roll covers the path. Oppose Stealth, Sleight of Hand, or Disguise. A non-stealthed invisible creature is an average DC for its CR. A hidden trap is usually a challenging DC for the campaign. You can take 10 out of combat.</p>"
			.. "<p><b>Search.</b> Standard action for each 5-foot square, and you must be adjacent to it. This finds concealed doors and the way to open them, and it can identify a potion by taste (DC 10 + twice the potion's caster level). Allies can help. You can take 10 or 20.</p>",
	},
	might = {
		sName = "Might",
		sAbility = "Str",
		nTrained = 0,
		nArmor = 1,
		sText = "<p><b>Might (Str).</b> Armor check penalty applies. The notes below start at Feat of Strength. Source: https://www.epicpath.org/index.php?title=Might</p>"
			.. "<p><b>Feat of Strength.</b> Standard action. Do not use this to copy a combat maneuver. You cannot affect a creature this way, and you cannot move an object heavier than your heavy load. The DC is usually challenging for the owner's level, or the campaign level. A truly absurd attempt is an impossible DC. Allies who can reach the object can help, up to five. Success does the feat. Missing by less than 5 can be a partial success. A showy success can earn a free Intimidate check. The attempt is obvious either way.</p>"
			.. "<p><b>Halt a fall.</b> Immediate action. You need a free hand. DC 10, plus 10 for each 10 feet already fallen (minimum 20). Both hands free reduces the DC by 5. Success stops the fall with no falling damage. Failure lets the fall finish, and the damage is totaled before defenses. You cannot retry that fall.</p>"
			.. "<p><b>Heavier loads.</b> Each rank raises carrying capacity. The bonus replaces the previous rank. It never stacks, and it cannot more than double your base loads. It does not change armor or shield encumbrance. At 1 rank: light +1 lb, medium +2, heavy +3, max drag +15. At 5: +5 / +10 / +15 / +75. At 10: +20 / +40 / +60 / +300. At 15: +45 / +90 / +135 / +675. At 20: +80 / +160 / +240 / +1200. The full rank table is on the source page.</p>"
			.. "<p><b>Delay a condition (epic).</b> Needs 21 ranks. Immediate action, once per condition. An average check delays a weak condition, a hard check delays a moderate one, and an impossible check delays a strong one, until the end of your next turn. The duration does not tick during the delay.</p>",
	},
	warfare = {
		sName = "Warfare",
		sAbility = "Int",
		nTrained = 0,
		nArmor = 0,
		sText = "<p><b>Warfare (Int).</b> Practical knowledge of conflict, not book learning. Source: https://www.epicpath.org/index.php?title=Warfare</p>"
			.. "<p><b>Identify an extraordinary ability</b> as you watch it used.</p>"
			.. "<p><b>Size up an enemy</b> you can see, judging its challenge from how it moves and how it carries its gear.</p>"
			.. "<p><b>Identify the enemy leader,</b> the captain or the dominant creature. Mindless groups may have none.</p>"
			.. "<p><b>Suggest tactics:</b> which foe to strike, which flank to press, and where allies should stand.</p>"
			.. "<p><b>Craft a magic item</b> when you also have the Creator feat and the item's listed components.</p>"
			.. "<p><b>Besiege</b> a fixed position, on attack or defense. The GM sets how that changes the day's damage to the works.</p>"
			.. "<p><b>Generalship:</b> a speech or a steady presence that steadies NPC troops you lead.</p>"
			.. "<p><b>Identify a magic item</b> you are holding, including its command word.</p>"
			.. "<p><b>Hardened supply lines (epic):</b> troops who can see you may hustle for up to two hours without fatigue. Check at the end of such an hour.</p>"
			.. "<p><b>Break an ambush (epic):</b> immediately after the Perception check that would notice the ambush, and before the surprise round, try to negate surprise.</p>",
	},
	acrobatics = {
		sName = "Acrobatics",
		sAbility = "Dex",
		nTrained = 0,
		nArmor = 1,
		sText = "<p><b>Acrobatics (Dex).</b> Armor check penalty applies. Balance, tumbling, and jumping. With 5 ranks, fighting defensively grants +3 dodge AC instead of +2, and total defense grants +6 instead of +4. Source: https://www.epicpath.org/index.php?title=Acrobatics</p>"
			.. "<p><b>Tumble.</b> Move action at half speed. DC is the highest Maneuver Defense of any creature who could take an attack of opportunity along the path. Success lets you leave threatened squares without that attack. Failure lets those creatures attack, but you still finish the move if you survive. You can combine it with Bull Rush, Charge, Clamber, or Overrun (not Withdraw). The other maneuver then costs a move action at half speed, and its DC rises by +2 for each attack of opportunity after the first.</p>"
			.. "<p><b>Narrow surfaces.</b> Move action at half speed. Full speed adds +10 to the DC. A narrow surface is less than half your space. Failure usually means a fall or falling prone.</p>"
			.. "<p><b>Long jump.</b> Part of a move. DC 5 at 5 feet, and +5 DC per extra 5 feet. You cannot jump farther than your movement unless you have the epic leap.</p>"
			.. "<p><b>High jump.</b> Part of a move. DC 4 per foot. Pulling yourself up afterward is another move action and an easy Movement or Might check.</p>"
			.. "<p><b>Soften a fall.</b> Free action on your turn, only if you know you might fall. DC 15. Success removes the second 10 feet of falling damage.</p>"
			.. "<p><b>Hop up.</b> Costs 10 feet of movement. DC 10. The object can be as tall as half your space.</p>"
			.. "<p><b>Dive.</b> Move action. DC 15 if the water is at least 10 feet deep per 30 feet fallen. The DC rises by 5 per 50 feet of the dive.</p>"
			.. "<p><b>Epic, 21 ranks.</b> Astounding Leap jumps past your speed (long-jump DC, +10 per extra 5 feet) in one move. Light Step, DC 40, crosses a surface too thin to hold you. Walk on Water, DC 50, at half speed, and you must move at least 20 feet or you sink. Walk on a gaseous surface, DC 60, at half speed.</p>",
	},
	linguistics = {
		sName = "Linguistics",
		sAbility = "Int",
		nTrained = 1,
		nArmor = 0,
		sText = "<p><b>Linguistics (Int).</b> Trained only. This works like Speak Language, not like a normal skill.</p>"
			.. "<p>One rank grants you the knowledge to speak one language. You do not make a Linguistics check. You either know the language or you do not.</p>"
			.. "<p>You start at 1st level knowing the languages from your race, plus one language per point of your starting Intelligence bonus. A literate character can read and write any language they speak.</p>"
			.. "<p><b>Action:</b> not applicable. <b>Try again:</b> not applicable. There is no check to fail.</p>",
	},
};

function ensureSkillDescriptions()
	local nodeList = DB.createNode("cesar.skills");
	if not nodeList then
		return;
	end
	for sKey, tSkill in pairs(_tSkillDescriptions) do
		local nodeSkill = DB.getChild(nodeList, sKey);
		if not nodeSkill then
			nodeSkill = DB.createChild(nodeList, sKey);
		end
		if nodeSkill then
			DB.setValue(nodeSkill, "name", "string", tSkill.sName);
			DB.setValue(nodeSkill, "ability", "string", tSkill.sAbility);
			DB.setValue(nodeSkill, "trained", "number", tSkill.nTrained);
			DB.setValue(nodeSkill, "armorcheckpenalty", "number", tSkill.nArmor);
			DB.setValue(nodeSkill, "text", "formattedtext", tSkill.sText);
		end
	end
end

function onTabletopInit()
	ensureSkillDescriptions();
end
