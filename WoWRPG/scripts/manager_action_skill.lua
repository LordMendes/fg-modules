-- 
-- Please see the license.html file included with this distribution for 
-- attribution and copyright information.
--

function onInit()
	ActionsManager.registerModHandler("skill", modSkill);
	ActionsManager.registerResultHandler("skill", onRoll);
end

function performPartySheetRoll(draginfo, rActor, sSkillName, nSkillMod)
	local rRoll = getRoll(rActor, sSkillName, nSkillMod);
					
	local nTargetDC = DB.getValue("partysheet.skilldc", 0);
	if nTargetDC == 0 then
		nTargetDC = nil;
	end
	rRoll.nTarget = nTargetDC;
	if DB.getValue("partysheet.hiderollresults", 0) == 1 then
		rRoll.bSecret = true;
		rRoll.bTower = true;
	end
	
	ActionsManager.performAction(draginfo, rActor, rRoll);
end
function performPCRoll(draginfo, rActor, nodeSkill)
	local sSkillName = DB.getValue(nodeSkill, "label", "");
	local sSubskillName = DB.getValue(nodeSkill, "sublabel", "");
	if sSubskillName ~= "" then
		sSkillName = sSkillName .. " (" .. sSubskillName .. ")";
	end

	local nSkillMod = DB.getValue(nodeSkill, "total", 0);
	local sSkillStat = DB.getValue(nodeSkill, "statname", "");
	
	performRoll(draginfo, rActor, sSkillName, nSkillMod, sSkillStat);
end
function performRoll(draginfo, rActor, sSkillName, nSkillMod, sSkillStat, sExtra)
	local rRoll = getRoll(rActor, sSkillName, nSkillMod, sSkillStat, sExtra);
	ActionsManager.performAction(draginfo, rActor, rRoll);
end
function getRoll(rActor, sSkillName, nSkillMod, sSkillStat, sExtra)
	local rRoll = {};
	rRoll.sType = "skill";
	rRoll.aDice = DiceRollManager.getActorDice({ "d20" }, rActor);
	rRoll.nMod = nSkillMod or 0;
	rRoll.sDesc = ActionCore.encodeActionText({ label = sSkillName, }, "action_skill_tag");
	if sExtra then
		rRoll.sDesc = rRoll.sDesc .. " " .. sExtra;
	end
	
	local sAbilityEffect = DataCommon.ability_ltos[sSkillStat];
	if sAbilityEffect then
		rRoll.sDesc = rRoll.sDesc .. " [MOD:" .. sAbilityEffect .. "]";
	end
	
	if ActorManager.isPC(rActor) then
		local sSkillLookup;
		local sSubSkill = nil;
		if sSkillName:match("^Knowledge") then
			sSubSkill = sSkillName:sub(12, -2);
			sSkillLookup = "Knowledge";
		else
			sSkillLookup = sSkillName;
		end
		_,bUntrained = CharManager.getSkillValue(rActor, sSkillLookup, sSubSkill);
		if bUntrained then
			rRoll.sDesc = rRoll.sDesc .. " [UNTRAINED]";
		end
	end
	
	return rRoll;
end

function modSkill(rSource, rTarget, rRoll)
	local bEffects = false;
	local aAddDice = {};
	local nAddMod = 0;

	local bAssist = Input.isShiftPressed();
	if bAssist then
		rRoll.sDesc = rRoll.sDesc .. " [ASSIST]";
	end

	if rSource then
		-- Determine skill used
		local sSkillLower = ActionCore.decodeLabelText(rRoll.sDesc, "action_skill_tag"):lower();

		-- Determine ability used with this skill
		local sActionStat = nil;
		local sModStat = string.match(rRoll.sDesc, "%[MOD:(%w+)%]");
		if sModStat then
			sActionStat = DataCommon.ability_stol[sModStat];
		else
			for k, v in pairs(DataCommon.skilldata) do
				if string.lower(k) == sSkillLower then
					sActionStat = v.stat;
				end
			end
		end

		-- Build effect filter for this skill
		local aSkillFilter = {};
		if sActionStat then
			table.insert(aSkillFilter, sActionStat);
		end
		local aSkillNameFilter = {};
		local aSkillWordsLower = StringManager.parseWords(sSkillLower);
		if #aSkillWordsLower > 0 then
			if #aSkillWordsLower == 1 then
				table.insert(aSkillFilter, aSkillWordsLower[1]);
			else
				table.insert(aSkillFilter, table.concat(aSkillWordsLower, " "));
				if aSkillWordsLower[1] == "knowledge" or aSkillWordsLower[1] == "perform" or aSkillWordsLower[1] == "craft" then
					table.insert(aSkillFilter, aSkillWordsLower[1]);
				end
			end
		end
		
		-- Get effects
		local nEffectCount;
		aAddDice, nAddMod, nEffectCount = EffectManager.getBonusDiceMod(rSource, "SKILL", { tFilter = aSkillFilter, });
		if (nEffectCount > 0) then
			bEffects = true;
		end
		
		-- Get condition modifiers
		if EffectManager.hasCondition(rSource, "Frightened") or 
				EffectManager.hasCondition(rSource, "Panicked") or
				EffectManager.hasCondition(rSource, "Shaken") then
			bEffects = true;
			nAddMod = nAddMod - 2;
		end
		if EffectManager.hasCondition(rSource, "Sickened") then
			bEffects = true;
			nAddMod = nAddMod - 2;
		end
		if EffectManager.hasCondition(rSource, "Blinded") then
			if sActionStat == "strength" or sActionStat == "dexterity" then
				bEffects = true;
				nAddMod = nAddMod - 4;
			elseif sSkillLower == "search" or sSkillLower == "perception" then
				bEffects = true;
				nAddMod = nAddMod - 4;
			end
		elseif EffectManager.hasCondition(rSource, "Dazzled") then
			if sSkillLower == "spot" or sSkillLower == "search" or sSkillLower == "perception" then
				bEffects = true;
				nAddMod = nAddMod - 1;
			end
		end
		if EffectManager.hasCondition(rSource, "Fascinated") then
			if sSkillLower == "spot" or sSkillLower == "listen" or sSkillLower == "perception" then
				bEffects = true;
				nAddMod = nAddMod - 4;
			end
		end
		-- Exhausted and Fatigued are handled by the effect checks for general ability modifiers

		-- Get ability modifiers
		local nBonusStat, nBonusEffects = ActorManagerD20.getAbilityEffectsBonus(rSource, sActionStat);
		if nBonusEffects > 0 then
			bEffects = true;
			nAddMod = nAddMod + nBonusStat;
		end
		
		-- Get negative levels
		local nNegLevelMod, nNegLevelCount = EffectManager.getBonusMod(rSource, "NLVL");
		if nNegLevelCount > 0 then
			bEffects = true;
			nAddMod = nAddMod - nNegLevelMod;
		end
	end

	if bEffects then
		DiceRollManager.addRollEffectDiceMod(rSource, rRoll, aAddDice, nAddMod);
		rRoll.sDesc = StringManager.appendLine(rRoll.sDesc, EffectManager.buildEffectDiceModOutput(aAddDice, nAddMod));
	end

	applySizeEffectsToModRoll(rSource, rTarget, rRoll);
end
function applySizeEffectsToModRoll(rSource, _, rRoll)
	if not rSource then
		return;
	end

	ActionCore.decodeRollData(rRoll, "action_skill_tag");
	local sSkillLower = rRoll.sLabel:lower();
	if not StringManager.contains({ "fly", "hide", "stealth", }, sSkillLower) then
		return;
	end

	local nActorSize, nBaseSize = ActorCommonManager.getSize(rSource);
	if nActorSize == nBaseSize then
		return;
	end

	-- Smaller grants bonus; Larger grants penalty
	local nEffectBonus = nBaseSize - nActorSize;
	if StringManager.contains({ "hide", "stealth", }, sSkillLower) then
		nEffectBonus = nEffectBonus * 4;
	else
		nEffectBonus = nEffectBonus * 2;
	end

	rRoll.bEffects = true;
	rRoll.nMod = rRoll.nMod + nEffectBonus;
	table.insert(rRoll.tNotifications, string.format("[SIZE %+d]", nEffectBonus));
end

function onRoll(rSource, rTarget, rRoll)
	local rMessage = ActionsManager.createActionMessage(rSource, rRoll);
	rMessage.text = string.gsub(rMessage.text, " %[MOD:[^]]*%]", "");

	if rRoll.nTarget then
		local nTotal = ActionsManager.total(rRoll);
		local nTargetDC = tonumber(rRoll.nTarget) or 0;
		
		rMessage.text = rMessage.text .. " [vs. DC " .. nTargetDC .. "]";
		if nTotal >= nTargetDC then
			rMessage.text = rMessage.text .. " [SUCCESS]";
		else
			rMessage.text = rMessage.text .. " [FAILURE]";
		end
	end
	
	local nTotal = ActionsManager.total(rRoll);
	Comm.deliverChatMessage(rMessage);
end
