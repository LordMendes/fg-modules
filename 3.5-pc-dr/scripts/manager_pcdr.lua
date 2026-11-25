--
-- Please see the license.html file included with this distribution for
-- attribution and copyright information.
--

local function highestPlus(sText)
	local nBest = 0;
	for sPlus in (sText or ""):gmatch("%+(%d+)") do
		local nPlus = tonumber(sPlus) or 0;
		if nPlus > nBest then
			nBest = nPlus;
		end
	end
	return nBest;
end

local function textHasMagic(sText)
	return (sText or ""):lower():find("magic", 1, true) ~= nil;
end

local function linkedItem(nodeWeapon)
	if not nodeWeapon then
		return nil;
	end
	local _, sRecord = DB.getValue(nodeWeapon, "shortcut", "", "");
	if (sRecord or "") == "" then
		return nil;
	end
	return DB.findNode(sRecord);
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
	local nEnhancement = 0;
	local bMagic = false;
	for _, tClause in ipairs(aClauses or {}) do
		local sType = (tClause.dmgtype or ""):lower();
		if textHasMagic(sType) then
			bMagic = true;
		end
		local nPlus = highestPlus(sType);
		if nPlus > nEnhancement then
			nEnhancement = nPlus;
		end
	end
	if nodeWeapon then
		local nNamed = highestPlus(DB.getValue(nodeWeapon, "name", ""));
		if nNamed > nEnhancement then
			nEnhancement = nNamed;
		end
		if textHasMagic(DB.getValue(nodeWeapon, "properties", "")) then
			bMagic = true;
		end
		local nodeItem = linkedItem(nodeWeapon);
		if nodeItem then
			if textHasMagic(DB.getValue(nodeItem, "properties", "")) or textHasMagic(DB.getValue(nodeItem, "damagetype", "")) then
				bMagic = true;
			end
			if bMagic then
				local nItem = DB.getValue(nodeItem, "bonus", 0);
				if nItem > nEnhancement then
					nEnhancement = nItem;
				end
			end
		end
	end
	if bMagic and nEnhancement < 1 then
		nEnhancement = 1;
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

local function findWeaponByName(rActor, sName)
	sName = sName or "";
	if sName == "" or not rActor or not ActorManager.getCreatureNode then
		return nil;
	end
	local nodeChar = ActorManager.getCreatureNode(rActor);
	if not nodeChar then
		return nil;
	end
	local nodeLoose = nil;
	local sLower = sName:lower();
	for _, nodeWeapon in ipairs(DB.getChildList(nodeChar, "weaponlist") or {}) do
		local sWeapon = DB.getValue(nodeWeapon, "name", "");
		if sWeapon == sName then
			return nodeWeapon;
		end
		if sWeapon:lower() == sLower then
			nodeLoose = nodeWeapon;
		end
	end
	return nodeLoose;
end

function tagRollEnhancement(rActor, rAction, rRoll)
	if not rRoll then
		return;
	end
	local nEnhancement = (rAction and rAction.nEnhancement) or 0;
	local nClause = getEnhancementFromClauses(rRoll.clauses);
	if nClause > nEnhancement then
		nEnhancement = nClause;
	end
	local nodeWeapon = findWeaponByName(rActor, rAction and rAction.label);
	if nodeWeapon then
		local nWeapon = getWeaponEnhancement(nodeWeapon, rRoll.clauses);
		if nWeapon > nEnhancement then
			nEnhancement = nWeapon;
		end
	else
		local sLabel = (rAction and rAction.label) or "";
		local nNamed = highestPlus(sLabel);
		if nNamed > nEnhancement then
			nEnhancement = nNamed;
		end
		if textHasMagic(sLabel) and nEnhancement < 1 then
			nEnhancement = 1;
		end
	end
	if nEnhancement > 0 and not (rRoll.sDesc or ""):match("%[ENH %+%d+%]") then
		rRoll.sDesc = (rRoll.sDesc or "") .. string.format(" [ENH +%d]", nEnhancement);
	end
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
