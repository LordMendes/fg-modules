-- 
-- Please see the license.html file included with this distribution for 
-- attribution and copyright information.
--

OOB_MSGTYPE_APPLYATK = "applyatk";
OOB_MSGTYPE_APPLYHRFC = "applyhrfc";
OOB_MSGTYPE_APPLYAOO = "applyaoo";

function onInit()
	OOBManager.registerOOBMsgHandler(OOB_MSGTYPE_APPLYATK, handleApplyAttack);
	OOBManager.registerOOBMsgHandler(OOB_MSGTYPE_APPLYHRFC, handleApplyHRFC);
	OOBManager.registerOOBMsgHandler(OOB_MSGTYPE_APPLYAOO, handleApplyAoO);

	ActionsManager.registerTargetingHandler("attack", onTargeting);

	ActionsManager.registerModHandler("attack", modAttack);
	ActionsManager.registerModHandler("grapple", modAttack);
	
	ActionsManager.registerResultHandler("attack", onAttack);
	ActionsManager.registerResultHandler("critconfirm", onAttack);
	ActionsManager.registerResultHandler("misschance", onMissChance);
	ActionsManager.registerResultHandler("grapple", onGrapple);
	ActionsManager.registerResultHandler("mrtable", onMalfunctionTable);
end

-- Core Rules Table 11-3. Rolled when a device has no chosen malfunction effect.
aMalfunctionEffects = {
	{ name = "Function lock", text = "For 2d6 rounds, the device continues to repeat the action taken during the round in which it malfunctioned. Weapons continue to fire and their direction cannot be altered; vehicles continue to move uncontrollably in the same direction at the same speed. All ammunition or fuel loaded into the device is consumed or destroyed." },
	{ name = "Mangled", text = "The device can be repaired, but it will never look the same again. For sale or appraisal, its market value is halved. If a device suffers this effect twice, it must be replaced." },
	{ name = "Leaky", text = "The device now requires a daily application of some substance (lubricant, phlogiston, or the like) or it ceases to function." },
	{ name = "Total failure", text = "The device fails, and so do all its add-ons. They must be repaired individually." },
	{ name = "Inhibited function", text = "Once the device is repaired, its Time Factor is doubled." },
	{ name = "Degradation", text = "Even after being repaired, one feature (randomly determined) is decreased as if its Technology Score were 1 lower (minimum 0)." },
	{ name = "Balky", text = "The device's Maneuverability Rating decreases by 1." },
	{ name = "Pieces everywhere", text = "The device falls apart into tiny components. Craft (technological device) checks to repair it have their DCs increased by +4." },
	{ name = "Awkward operation", text = "After repair, all skill checks or attack rolls made with the device take a -2 circumstance penalty." },
	{ name = "Backfire", text = "All weapons on the device backfire, dealing their damage to the operator." },
	{ name = "Frangible", text = "The device can be repaired normally, but its Malfunction Rating increases by +1." },
	{ name = "Kickback", text = "The device deals 3d6 points of damage to its operator." },
	{ name = "Bulky", text = "Repair costs increase as if the market price were 25% higher. After repair, the device is one size larger, its weight doubles, and its movement speed decreases by 20 mph (if applicable)." },
	{ name = "Critical component", text = "A critical component is destroyed. The device cannot be repaired until a component worth at least 10% of its market value is replaced." },
	{ name = "Self-destructive", text = "After repair, the device takes 1 point of damage each time it is successfully operated. Hardness does not protect against this damage." },
	{ name = "Noisemaker", text = "The device emits a loud noise audible within 60 feet. After repair, it continues to make that noise while operating and for a period equal to its Time Factor (at least 1 minute)." },
	{ name = "Fused function", text = "The device cannot be upgraded, and skill checks made to repair it have their DCs increased by +3." },
	{ name = "Fragile", text = "The device's maximum hit points are halved." },
	{ name = "Pain machine", text = "The device can be repaired normally, but it deals 1d6 points of damage to its operator each time it is used." },
	{ name = "Phlogiston explosion", text = "The phlogiston boiler explodes, dealing (Technology Score)d6 slashing and fire damage to all creatures within 15 feet. Craft (technological device) checks to repair the device have their DCs increased by +6." },
};

function notifyApplyAttack(rSource, rTarget, rRoll)
	if not rTarget then
		return;
	end

	rRoll.sResults = table.concat(rRoll.aMessages, "\r");
	
	local msgOOB = UtilityManager.encodeRollToOOB(rRoll);
	msgOOB.type = ActionAttack.OOB_MSGTYPE_APPLYATK;
	msgOOB.sSourceNode = ActorManager.getCreatureNodeName(rSource);
	msgOOB.sTargetNode = ActorManager.getCreatureNodeName(rTarget);

	Comm.deliverOOBMessage(msgOOB, "");
end
function handleApplyAttack(msgOOB)
	local rSource = ActorManager.resolveActor(msgOOB.sSourceNode);
	local rTarget = ActorManager.resolveActor(msgOOB.sTargetNode);
	
	local rRoll = UtilityManager.decodeRollFromOOB(msgOOB);
	ActionAttack.applyAttack(rSource, rTarget, rRoll);
end

function notifyApplyHRFC(sTable)
	local msgOOB = {
		type = OOB_MSGTYPE_APPLYHRFC,
		sTable = sTable,
	};
	Comm.deliverOOBMessage(msgOOB, "");
end
function handleApplyHRFC(msgOOB)
	TableManager.processTableRoll("", msgOOB.sTable);
end

function notifyApplyAoO(rActor)
	local msgOOB = {
		type = OOB_MSGTYPE_APPLYAOO,
		sSourceNode = ActorManager.getCreatureNodeName(rActor),
	};
	Comm.deliverOOBMessage(msgOOB, "");
end
function handleApplyAoO(msgOOB)
	local rActor = ActorManager.resolveActor(msgOOB.sSourceNode);
	local nodeCT = ActorManager.getCTNode(rActor);
	if not nodeCT then
		return;
	end

	DB.setValue(nodeCT, "aoo", "number", DB.getValue(nodeCT, "aoo", 0) + 1);

	local tMsgData = {
		rActor = rActor,
		bSecret = Session.IsHost and OptionsManager.isOption("REVL", "off"),
	};
	local nAOO = DB.getValue(nodeCT, "aoo", 0);
	local nMaxAOO = DB.getValue(nodeCT, "aoomax", 0);
	if nAOO == nMaxAOO then
		ChatManager.sendMessage(Interface.getString("attack_message_aoo_used"), tMsgData);
	elseif nAOO > nMaxAOO then
		tMsgData.sIcon = "action_warning";
		ChatManager.sendMessage(Interface.getString("attack_message_aoo_exceeded"), tMsgData);
	end
end

function onTargeting(rSource, aTargeting, rRolls)
	if OptionsManager.isOption("RMMT", "multi") then
		local aTargets = {};
		for _,vTargetGroup in ipairs(aTargeting) do
			for _,vTarget in ipairs(vTargetGroup) do
				table.insert(aTargets, vTarget);
			end
		end
		if #aTargets > 1 then
			for _,vRoll in ipairs(rRolls) do
				if not string.match(vRoll.sDesc, "%[FULL%]") then
					vRoll.bRemoveOnMiss = true;
				end
			end
		end
	end
	return aTargeting;
end

function performPartySheetVsRoll(draginfo, rActor, rAction)
	local rRoll = ActionAttack.getRoll(nil, rAction);
	
	if DB.getValue("partysheet.hiderollresults", 0) == 1 then
		rRoll.bSecret = true;
		rRoll.bTower = true;
	end
	
	ActionsManager.actionDirect(nil, "attack", { rRoll }, { { rActor } });
end

function performRoll(draginfo, rActor, rAction)
	local rRoll = ActionAttack.getRoll(rActor, rAction);
	ActionsManager.performAction(draginfo, rActor, rRoll);
end
function getRoll(rActor, rAction)
	local rRoll = {};
	if rAction.cm then
		rRoll.sType = "grapple";
	else
		rRoll.sType = "attack";
	end
	rRoll.aDice = DiceRollManager.getActorDice({ "d20" }, rActor);
	rRoll.nMod = rAction.modifier or 0;
	
	if rAction.cm then
		rRoll.sDesc = ActionCore.encodeActionText(rAction, "action_cm_tag");
	else
		rRoll.sDesc = ActionAttackCore.encodeActionText(rAction);
	end
	rRoll.sRange = rAction.range;
	
	-- Add ability modifiers
	if rAction.stat then
		if (rAction.range == "M" and rAction.stat ~= "strength") or (rAction.range == "R" and rAction.stat ~= "dexterity") then
			local sAbilityEffect = DataCommon.ability_ltos[rAction.stat];
			if sAbilityEffect then
				rRoll.sDesc = rRoll.sDesc .. " [MOD:" .. sAbilityEffect .. "]";
			end
		end
	end
	
	-- Add other modifiers
	if rAction.crit and rAction.crit < 20 then
		rRoll.nCrit = rAction.crit;
	end
	if (rAction.mr or 0) > 0 then
		rRoll.nMR = rAction.mr;
	end
	if (rAction.malfunction or "") ~= "" then
		rRoll.sMalfunction = rAction.malfunction;
		rRoll.sDesc = rRoll.sDesc .. "\r[MRFX]" .. rAction.malfunction:gsub("\r", " ");
	end
	if (rAction.mrtable or "") ~= "" then
		rRoll.sMRTable = rAction.mrtable;
		rRoll.sDesc = rRoll.sDesc .. string.format(" [MRTABLE %s]", rAction.mrtable);
	end
	rRoll.sWeapon = rAction.label or "";
	if rAction.touch then
		rRoll.sDesc = rRoll.sDesc .. " [TOUCH]";
	end

	rRoll.bWeapon = rAction.bWeapon;
	rRoll.bSpell = rAction.bSpell;

	rRoll.tActionTags = rAction.tActionTags;

	-- Legacy
	rRoll.range = rAction.range;

	return rRoll;
end

function performGrappleRoll(draginfo, rActor, rAction)
	local rRoll = ActionAttack.getGrappleRoll(rActor, rAction);
	ActionsManager.performAction(draginfo, rActor, rRoll);
end
function getGrappleRoll(rActor, rAction)
	local rRoll = {};
	rRoll.sType = "grapple";
	rRoll.aDice = DiceRollManager.getActorDice({ "d20" }, rActor);
	rRoll.nMod = rAction.modifier or 0;
	
	if DataCommon.isPFRPG() then
		rRoll.sDesc = ActionCore.encodeActionText(rAction, "action_cm_tag");
	else
		rRoll.sDesc = ActionCore.encodeActionText(rAction, "action_grapple_tag");
	end
	
	-- Add ability modifiers
	if rAction.stat then
		if rAction.stat ~= "strength" then
			local sAbilityEffect = DataCommon.ability_ltos[rAction.stat];
			if sAbilityEffect then
				rRoll.sDesc = rRoll.sDesc .. " [MOD:" .. sAbilityEffect .. "]";
			end
		end
	end
	
	return rRoll;
end

function modAttack(rSource, rTarget, rRoll)
	ActionAttackCore.clearCritState(rSource);
	
	ActionAttackCore.decodeRollData(rRoll);

	local aAddDesc = {};
	local aAddDice = {};
	local nAddMod = 0;
	local bEffects = false;
	
	-- Check for opportunity attack
	rRoll.bOpportunity = ModifierManager.getKey("ATT_OPP") or Input.isShiftPressed();

	-- Check defense modifiers
	local bTouch = ModifierManager.getKey("ATT_TCH");
	local bFlatFooted = ModifierManager.getKey("ATT_FF");
	local bCA = ModifierManager.getKey("ATT_CA");
	local bCover = ModifierManager.getKey("DEF_COVER");
	local bPartialCover = ModifierManager.getKey("DEF_PCOVER");
	local bSuperiorCover = ModifierManager.getKey("DEF_SCOVER");
	local bConceal = ModifierManager.getKey("DEF_CONC");
	local bTotalConceal = ModifierManager.getKey("DEF_TCONC");
	
	local bUncannyDodge = ActorManager35E.hasRollSpecialAbility(rTarget, "Uncanny Dodge");
	if bFlatFooted and bUncannyDodge then
		bFlatFooted = false;
	end

	if rRoll.bOpportunity then
		table.insert(aAddDesc, "[OPPORTUNITY]");
	end
	if bTouch and not rRoll.sDesc:match("%[TOUCH%]") then
		table.insert(aAddDesc, "[TOUCH]");
	end
	if bFlatFooted then
		table.insert(aAddDesc, "[FF]");
	end
	if bSuperiorCover then
		table.insert(aAddDesc, "[COVER -8]");
	elseif bCover then
		table.insert(aAddDesc, "[COVER -4]");
	elseif bPartialCover then
		table.insert(aAddDesc, "[COVER -2]");
	end
	if bTotalConceal then
		table.insert(aAddDesc, "[TOTAL CONC]");
	elseif bConceal then
		table.insert(aAddDesc, "[CONCEAL]");
	end
	
	if rSource then
		-- Determine ability used
		local sActionStat = nil;
		local sModStat = string.match(rRoll.sDesc, "%[MOD:(%w+)%]");
		if sModStat then
			sActionStat = DataCommon.ability_stol[sModStat];
		end
		if not sActionStat then
			if rRoll.sRange == "M" then
				sActionStat = "strength";
			elseif rRoll.sRange == "R" then
				sActionStat = "dexterity";
			end
		end

		-- Build attack filter
		local tAttackFilter = ActionCore.buildEffectFilter(rRoll);
		
		-- Get attack effect modifiers
		local tSrcEffData = { rTarget = rTarget, tFilter = tAttackFilter, tActionTags = rRoll.tActionTags, };
		local tTrgtEffData = { rTarget = rSource, tFilter = tAttackFilter, tActionTags = rRoll.tActionTags, };
		local nEffectCount;
		aAddDice, nAddMod, nEffectCount = EffectManager.getBonusDiceMod(rSource, "ATK", tSrcEffData);
		if (nEffectCount > 0) then
			bEffects = true;
		end
		if rTarget then
			local tAttackDice, nAttackMod, nAttackEffect = EffectManager.getBonusDiceMod(rTarget, "@ATK", tTrgtEffData);
			if nAttackEffect > 0 then
				bEffects = true;
				for _,vDie in ipairs(tAttackDice) do
					table.insert(aAddDice, vDie);
				end
				nAddMod = nAddMod + nAttackMod;
			end
		end
		if rRoll.sType == "grapple" then
			local aPFDice, nPFMod, nPFCount = EffectManager.getBonusDiceMod(rSource, "CMB", tSrcEffData);
			if nPFCount > 0 then
				bEffects = true;
				for _,v in ipairs(aPFDice) do
					table.insert(aAddDice, v);
				end
				nAddMod = nAddMod + nPFMod;
			end
			if rTarget then
				local tAttackDice, nAttackMod, nAttackEffect = EffectManager.getBonusDiceMod(rTarget, "@CMB", tTrgtEffData);
				if nAttackEffect > 0 then
					bEffects = true;
					for _,vDie in ipairs(tAttackDice) do
						table.insert(aAddDice, vDie);
					end
					nAddMod = nAddMod + nAttackMod;
				end
			end
		end
		
		local nEffectCrit = EffectManager.getMinMod(rSource, "CRIT", tSrcEffData);
		if nEffectCrit then
			bEffects = true;
			rRoll.nCrit = math.max(math.min(rRoll.nCrit or 20, nEffectCrit), 2);
		end
		if EffectManager.hasCondition(rSource, "KEEN", tSrcEffData) then
			bEffects = true;
			rRoll.nCrit = math.max(((rRoll.nCrit or 20) * 2) - 21, 2);
			table.insert(aAddDesc, "[KEEN]");
		end

		-- Get condition modifiers
		if EffectManager.hasCondition(rSource, "Ethereal") and not EffectManager.hasCondition(rTarget, "Ethereal") then
			bEffects = true;
			nAddMod = nAddMod + 2;
			if not bUncannyDodge then
				bCA = true;
			end
		elseif EffectManager.hasCondition(rSource, "Invisible") and 
				((rRoll.sRange == "R") or not ActorManager35E.hasRollFeat(rTarget, "Blind-Fight")) then
			bEffects = true;
			nAddMod = nAddMod + 2;
			if not bUncannyDodge then
				bCA = true;
			end
		elseif EffectManager.hasCondition(rSource, "CA", tSrcEffData) then
			bEffects = true;
			bCA = true;
		elseif EffectManager.hasCondition(rTarget, "@CA", tTrgtEffData) then
			bEffects = true;
			bCA = true;
		end
		if bCA then
			table.insert(aAddDesc, "[CA]");
		end

		if EffectManager.hasCondition(rSource, "Blinded") then
			bEffects = true;
			table.insert(aAddDesc, "[BLINDED]");
		end
		if not DataCommon.isPFRPG() then
			if EffectManager.hasCondition(rSource, "Incorporeal") and (rRoll.sRange == "M") and not string.match(string.lower(rRoll.sDesc), "incorporeal touch") then
				bEffects = true;
				table.insert(aAddDesc, "[INCORPOREAL]");
			end
		end
		if EffectManager.hasCondition(rSource, "Dazzled") then
			bEffects = true;
			nAddMod = nAddMod - 1;
		end
		if EffectManager.hasCondition(rSource, "Slowed") then
			bEffects = true;
			nAddMod = nAddMod - 1;
		end
		if EffectManager.hasCondition(rSource, "Entangled") then
			bEffects = true;
			nAddMod = nAddMod - 2;
		end
		if rRoll.sType == "attack" and 
				(EffectManager.hasCondition(rSource, "Pinned") or
				EffectManager.hasCondition(rSource, "Grappled")) then
			bEffects = true;
			nAddMod = nAddMod - 2;
		end
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

		-- Get other effect modifiers
		if EffectManager.hasCondition(rSource, "Squeezing") then
			bEffects = true;
			nAddMod = nAddMod - 4;
		end
		if EffectManager.hasCondition(rSource, "Prone") then
			if rRoll.sRange == "M" then
				bEffects = true;
				nAddMod = nAddMod - 4;
			end
		end
		
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
	
	if (rRoll.nCrit or 20) < 20 then
		table.insert(aAddDesc, string.format("[CRIT %d]", rRoll.nCrit));
	end
	if (rRoll.nMR or 0) > 0 then
		table.insert(aAddDesc, string.format("[MR %d]", rRoll.nMR));
	end

	DiceRollManager.addRollEffectDiceMod(rSource, rRoll, aAddDice, nAddMod);
	if bEffects then
		table.insert(aAddDesc, EffectManager.buildEffectDiceModOutput(aAddDice, nAddMod));
	end
	if #aAddDesc > 0 then
		rRoll.sDesc = StringManager.appendLine(rRoll.sDesc, table.concat(aAddDesc, "\r"));
	end
	
	-- Add other modifiers
	if bSuperiorCover then
		rRoll.nMod = rRoll.nMod - 8;
	elseif bCover then
		rRoll.nMod = rRoll.nMod - 4;
	elseif bPartialCover then
		rRoll.nMod = rRoll.nMod - 2;
	end

	applySizeEffectsToModRoll(rSource, rTarget, rRoll);
end
function applySizeEffectsToModRoll(rSource, _, rRoll)
	if not rSource then
		return;
	end

	local nActorSize, nBaseSize = ActorCommonManager.getSize(rSource);
	if nActorSize == nBaseSize then
		return;
	end

	local nEffectBonus;
	if rRoll.sType == "grapple" then
		-- Smaller grants penalty; Larger grants bonus
		if DataCommon.isPFRPG() then
			nActorSize = math.max(math.min(nActorSize, 4), -4);
			nBaseSize = math.max(math.min(nBaseSize, 4), -4);
			nEffectBonus = DataCommon.sizeCombatMod[nBaseSize] - DataCommon.sizeCombatMod[nActorSize];
		else
			nEffectBonus = nActorSize - nBaseSize;
			nEffectBonus = nEffectBonus * 4;
		end
	else
		-- Smaller grants bonus; Larger grants penalty
		nActorSize = math.max(math.min(nActorSize, 4), -4);
		nBaseSize = math.max(math.min(nBaseSize, 4), -4);
		nEffectBonus = DataCommon.sizeCombatMod[nActorSize] - DataCommon.sizeCombatMod[nBaseSize];
	end

	rRoll.bEffects = true;
	rRoll.nMod = rRoll.nMod + nEffectBonus;
	table.insert(rRoll.tNotifications, string.format("[SIZE %+d]", nEffectBonus));
end

function onAttack(rSource, rTarget, rRoll)
	ActionAttackCore.decodeRollData(rRoll);
	
	local bIsSourcePC = ActorManager.isPC(rSource);
	local bAllowCC = OptionsManager.isOption("HRCC", "on") or (not bIsSourcePC and OptionsManager.isOption("HRCC", "npc"));
	
	if ActionCore.isActionText(rRoll.sDesc, "action_cm_tag") then
		rRoll.sType = "grapple";
	end
	
	rRoll.aMessages = {};
	
	-- If we have a target, then calculate the defense we need to exceed
	if rRoll.sType == "critconfirm" then
		local sDefenseVal = rRoll.sDesc:match("%[AC (%d+)%]");
		if sDefenseVal then
			rRoll.nDefenseVal = tonumber(sDefenseVal);
		end
		rRoll.nMissChance = tonumber(rRoll.sDesc:match("%[MISS CHANCE (%d+)%%%]")) or 0;
	else
		ActorManager35E.getDefenseValue(rSource, rTarget, rRoll);
		if (rRoll.nAtkEffectsBonus or 0) ~= 0 then
			rRoll.nTotal = rRoll.nTotal + rRoll.nAtkEffectsBonus;
			table.insert(rRoll.aMessages, EffectManager.buildEffectOutput(rRoll.nAtkEffectsBonus));
		end
		if (rRoll.nDefEffectsBonus or 0) ~= 0 then
			rRoll.nDefenseVal = rRoll.nDefenseVal + rRoll.nDefEffectsBonus;
			table.insert(rRoll.aMessages, EffectManager.buildDefEffectOutput(rRoll.nDefEffectsBonus));
		end
	end

	-- Get the crit threshold
	rRoll.nCrit = 20;
	local sAltCritRange = string.match(rRoll.sDesc, "%[CRIT (%d+)%]");
	if sAltCritRange then
		rRoll.nCrit = tonumber(sAltCritRange) or 20;
		if (rRoll.nCrit <= 1) or (rRoll.nCrit > 20) then
			rRoll.nCrit = 20;
		end
	end

	-- Malfunction rate from the weapon action (natural die 1 through MR)
	rRoll.nMR = rRoll.nMR or tonumber(string.match(rRoll.sDesc or "", "%[MR (%d+)%]")) or 0;
	
	rRoll.nFirstDie = 0;
	if #(rRoll.aDice) > 0 then
		rRoll.nFirstDie = rRoll.aDice[1].result or 0;
	end
	rRoll.bCritThreat = false;

	local bMalfunction = (rRoll.sType == "attack") and ((rRoll.nMR or 0) > 0) and (rRoll.nFirstDie > 0) and (rRoll.nFirstDie <= rRoll.nMR);
	rRoll.bMalfunction = bMalfunction;
	if bMalfunction then
		table.insert(rRoll.aMessages, "[MALFUNCTION]");
		if rRoll.nFirstDie == 1 then
			table.insert(rRoll.aMessages, "[AUTOMATIC MISS]");
			rRoll.sResult = "fumble";
		else
			table.insert(rRoll.aMessages, "[MISS]");
			rRoll.sResult = "miss";
		end
	elseif rRoll.nFirstDie >= 20 then
		if rRoll.sType == "critconfirm" then
			rRoll.sResult = "crit";
			table.insert(rRoll.aMessages, "[CRITICAL HIT]");
		elseif rRoll.sType == "attack" then
			if bAllowCC then
				rRoll.sResult = "hit";
				rRoll.bCritThreat = true;
				table.insert(rRoll.aMessages, "[CRITICAL THREAT]");
			else
				rRoll.sResult = "crit";
				table.insert(rRoll.aMessages, "[CRITICAL HIT]");
			end
		else
			rRoll.sResult = "hit";
			table.insert(rRoll.aMessages, "[HIT]");
		end
	elseif rRoll.nFirstDie == 1 then
		if rRoll.sType == "critconfirm" then
			table.insert(rRoll.aMessages, "[HIT]");
			table.insert(rRoll.aMessages, "[CRIT NOT CONFIRMED]");
			rRoll.sResult = "miss";
		else
			table.insert(rRoll.aMessages, "[AUTOMATIC MISS]");
			rRoll.sResult = "fumble";
		end
	elseif rRoll.nDefenseVal then
		if rRoll.nTotal >= rRoll.nDefenseVal then
			if rRoll.sType == "critconfirm" then
				rRoll.sResult = "crit";
				table.insert(rRoll.aMessages, "[CRITICAL HIT]");
			elseif rRoll.sType == "attack" and rRoll.nFirstDie >= rRoll.nCrit then
				if bAllowCC then
					rRoll.sResult = "hit";
					rRoll.bCritThreat = true;
					table.insert(rRoll.aMessages, "[CRITICAL THREAT]");
				else
					rRoll.sResult = "crit";
					table.insert(rRoll.aMessages, "[CRITICAL HIT]");
				end
			else
				rRoll.sResult = "hit";
				table.insert(rRoll.aMessages, "[HIT]");
			end
		else
			rRoll.sResult = "miss";
			if rRoll.sType == "critconfirm" then
				table.insert(rRoll.aMessages, "[HIT]");
				table.insert(rRoll.aMessages, "[CRIT NOT CONFIRMED]");
			else
				table.insert(rRoll.aMessages, "[MISS]");
			end
		end
	elseif rRoll.sType == "critconfirm" then
		rRoll.sResult = "crit";
		table.insert(rRoll.aMessages, "[CHECK FOR CRITICAL]");
	elseif rRoll.sType == "attack" and rRoll.nFirstDie >= rRoll.nCrit then
		if bAllowCC then
			rRoll.sResult = "hit";
			rRoll.bCritThreat = true;
		else
			rRoll.sResult = "crit";
		end
		table.insert(rRoll.aMessages, "[CHECK FOR CRITICAL]");
	end
	
	if ((rRoll.sType == "critconfirm") or not rRoll.bCritThreat) and ((rRoll.nMissChance or 0) > 0) then
		table.insert(rRoll.aMessages, string.format("[MISS CHANCE %d%%]", rRoll.nMissChance));
	end

	GameManager.callEventFunctions("onAttackPreResolve", rSource, rTarget, rRoll);
	ActionAttack.onPreAttackResolve(rSource, rTarget, rRoll);
	ActionAttack.readMalfunctionNotes(rRoll);

	local rMessage = ActionsManager.createActionMessage(rSource, rRoll);
	if rRoll.sType == "critconfirm" then
		rMessage.text = rMessage.text:gsub("\r%[AC %d+%]", "");
		rMessage.text = rMessage.text:gsub("\r%[MISS CHANCE %d+%%%]", "");
	end
	ActionAttack.onAttackResolve(rSource, rTarget, rRoll, rMessage);

	ActionAttack.onPostAttackResolve(rSource, rTarget, rRoll);
	GameManager.callEventFunctions("onAttackPostResolve", rSource, rTarget, rRoll);

end

function onPreAttackResolve(rSource, rTarget, rRoll)
	-- Do nothing; location to override
end
function readMalfunctionNotes(rRoll)
	local sDesc = rRoll.sDesc or "";
	local sFx = sDesc:match("\r%[MRFX%]([^\r]*)");
	if sFx and sFx ~= "" then
		rRoll.sMalfunction = rRoll.sMalfunction or sFx;
		sDesc = sDesc:gsub("\r%[MRFX%][^\r]*", "");
	end
	local sTable = sDesc:match("%[MRTABLE ([^%]]+)%]");
	if sTable and sTable ~= "" then
		rRoll.sMRTable = rRoll.sMRTable or sTable;
		sDesc = sDesc:gsub("%s*%[MRTABLE [^%]]+%]", "");
	end
	rRoll.sDesc = sDesc;
end

function notifyMalfunction(rSource, rRoll)
	local sLabel = rRoll.sWeapon or "";
	if sLabel == "" then
		sLabel = "Weapon";
	end
	local sMsg = string.format(Interface.getString("attack_message_malfunction"), sLabel);
	if (rRoll.sMalfunction or "") ~= "" then
		sMsg = sMsg .. " " .. rRoll.sMalfunction;
	end
	ChatManager.sendMessage(sMsg, { rActor = rSource, sIcon = "action_attack_miss" });

	local sTable = rRoll.sMRTable or "";
	if sTable ~= "" then
		ActionAttack.rollMalfunctionTable(rSource, sTable);
	end
end

function rollMalfunctionTable(rSource, sTable)
	if sTable == "Malfunction Effects" then
		local rRoll = {
			sType = "mrtable",
			sDesc = "Malfunction Effects",
			aDice = DiceRollManager.getActorDice({ "d20" }, rSource),
			nMod = 0,
		};
		ActionsManager.actionDirect(rSource, "mrtable", { rRoll }, {});
		return;
	end
	TableManager.processTableRoll("", sTable);
end

function onMalfunctionTable(rSource, _, rRoll)
	local rMessage = ActionsManager.createActionMessage(rSource, rRoll);
	local nDie = 0;
	if rRoll.aDice and (#rRoll.aDice > 0) then
		nDie = rRoll.aDice[1].result or 0;
	end
	local rEffect = aMalfunctionEffects[nDie];
	if rEffect then
		rMessage.text = rMessage.text .. "\r" .. rEffect.name .. ": " .. rEffect.text;
	end
	Comm.deliverChatMessage(rMessage);
end

function onAttackResolve(rSource, rTarget, rRoll, rMessage)
	Comm.deliverChatMessage(rMessage);

	if rRoll.bMalfunction then
		ActionAttack.notifyMalfunction(rSource, rRoll);
	end

	if rRoll.sResult == "crit" then
		ActionAttackCore.setCritState(rSource, rTarget);
	end

	local bRollMissChance = false;
	if rRoll.sType == "critconfirm" then
		bRollMissChance = true;
	else
		if rRoll.bCritThreat then
			local rCritConfirmRoll = {
				sType = "critconfirm",
				aDice = DiceRollManager.getActorDice({ "d20" }, rActor),
				bTower = rRoll.bTower,
				bSecret = rRoll.bSecret,
			};
				
			local tCCDice, nCCMod, nCCEffects = EffectManager.getBonusDiceMod(rSource, "CC", { rTarget = rTarget, tActionTags = rRoll.tActionTags, });
			if (nCCEffects > 0) then
				local sMod = StringManager.convertDiceToString(tCCDice, nCCMod, true);
				rCritConfirmRoll.sDesc = string.format("%s [CONFIRM %s]", rRoll.sDesc, sMod);
			else
				rCritConfirmRoll.sDesc = rRoll.sDesc .. " [CONFIRM]";
			end

			DiceRollManager.addRollEffectDice(rSource, rCritConfirmRoll, tCCDice);
			rCritConfirmRoll.nMod = rRoll.nMod + nCCMod;

			if (rRoll.nAtkEffectsBonus or 0) ~= 0 then
				rCritConfirmRoll.sDesc = StringManager.appendLine(rCritConfirmRoll.sDesc, EffectManager.buildEffectOutput(rRoll.nAtkEffectsBonus));
			end
			if rRoll.nDefenseVal then
				if (rRoll.nACCCBonus or 0) ~= 0 then
					rRoll.nDefenseVal = rRoll.nDefenseVal + rRoll.nACCCBonus;
					rCritConfirmRoll.sDesc = StringManager.appendLine(rCritConfirmRoll.sDesc, string.format("[CC DEF EFFECTS %d]", rRoll.nACCCBonus));
				end
				rCritConfirmRoll.sDesc = StringManager.appendLine(rCritConfirmRoll.sDesc, string.format("[AC %d]", rRoll.nDefenseVal));
			end
			if (rRoll.nMissChance or 0) > 0 then
				rCritConfirmRoll.sDesc = StringManager.appendLine(rCritConfirmRoll.sDesc, string.format("[MISS CHANCE %d%%]", rRoll.nMissChance));
			end

			ActionsManager.roll(rSource, { rTarget }, rCritConfirmRoll, true);
		elseif (rRoll.sResult ~= "miss") and (rRoll.sResult ~= "fumble") then
			bRollMissChance = true;
		end
	end
	if bRollMissChance and ((rRoll.nMissChance or 0) > 0) then
		ActionAttack.performMissChanceRoll(rSource, rTarget, rRoll)
	end

	if rTarget then
		ActionAttack.notifyApplyAttack(rSource, rTarget, rRoll);
		
		-- REMOVE TARGET ON MISS OPTION
		if (rRoll.sResult == "miss" or rRoll.sResult == "fumble") and rRoll.sType ~= "critconfirm" and not string.match(rRoll.sDesc, "%[FULL%]") then
			local bRemoveTarget = false;
			if OptionsManager.isOption("RMMT", "on") then
				bRemoveTarget = true;
			elseif rRoll.bRemoveOnMiss then
				bRemoveTarget = true;
			end
			
			if bRemoveTarget then
				TargetingManager.removeTarget(ActorManager.getCTNodeName(rSource), ActorManager.getCTNodeName(rTarget));
			end
		end
	end
end
function onPostAttackResolve(rSource, rTarget, rRoll)
	-- HANDLE FUMBLE/CRIT HOUSE RULES
	local sOptionHRFC = OptionsManager.getOption("HRFC");
	if rRoll.sResult == "fumble" and ((sOptionHRFC == "both") or (sOptionHRFC == "fumble")) then
		ActionAttack.notifyApplyHRFC("Fumble");
	end
	if rRoll.sResult == "crit" and ((sOptionHRFC == "both") or (sOptionHRFC == "criticalhit")) then
		ActionAttack.notifyApplyHRFC("Critical Hit");
	end

	-- HANDLE ATTACK OF OPPORTUNITY TRACKING
	if rRoll.bOpportunity then
		ActionAttack.notifyApplyAoO(rSource);
	end
end

function onGrapple(rSource, rTarget, rRoll)
	ActionAttackCore.decodeRollData(rRoll);

	if DataCommon.isPFRPG() then
		ActionAttack.onAttack(rSource, rTarget, rRoll);
	else
		local rMessage = ActionsManager.createActionMessage(rSource, rRoll);
		
		if rTarget then
			rMessage.text = rMessage.text .. " [at " .. ActorManager.getDisplayName(rTarget) .. "]";
		end
		
		if not rSource then
			rMessage.sender = nil;
		end
		Comm.deliverChatMessage(rMessage);
	end
end

function performMissChanceRoll(rSource, rTarget, rAttackRoll)
	local rRoll = ActionAttack.getMissChanceRoll(rSource, rTarget, rAttackRoll);
	ActionsManager.actionDirect(rSource, rRoll.sType, { rRoll }, { { rTarget } });
end
function getMissChanceRoll(rSource, rTarget, rAttackRoll)
	local rRoll = {
		sType = "misschance",
		sDesc = string.format("[MISS CHANCE] %s", ActionAttackCore.decodeLabelText(rAttackRoll.sDesc)),
		aDice = DiceRollManager.getActorDice({ "d100" }, rSource),
		nMod = 0,
		nTarget = rAttackRoll.nMissChance,
	};
	return rRoll;
end
function onMissChance(rSource, rTarget, rRoll)
	local rMessage = ActionsManager.createActionMessage(rSource, rRoll);

	if rRoll.nTarget then
		local nTotal = ActionsManager.total(rRoll);
		if nTotal <= rRoll.nTarget then
			rMessage.text = rMessage.text .. "\r[MISS]";
			if rTarget then
				rMessage.icon = "action_attack_miss";
				ActionAttackCore.clearCritState(rSource, rTarget);
			else
				rMessage.icon = "action_attack";
			end
		else
			rMessage.text = rMessage.text .. "\r[HIT]";
			if rTarget then
				rMessage.icon = "action_attack_hit";
			else
				rMessage.icon = "action_attack";
			end
		end
	end
	
	Comm.deliverChatMessage(rMessage);
end

function applyAttack(rSource, rTarget, rRoll)
	local msgShort = { font = "msgfont" };
	local msgLong = { font = "msgfont" };
	
	if rRoll.sType == "grapple" then
		msgShort.text = "Combat Man.";
		msgLong.text = "Combat Man.";
	else
		msgShort.text = "Attack";
		msgLong.text = "Attack";
	end
	if rRoll.nOrder then
		msgShort.text = string.format("%s #%d", msgShort.text, rRoll.nOrder);
		msgLong.text = string.format("%s #%d", msgLong.text, rRoll.nOrder);
	end
	if (rRoll.sRange or "") ~= "" then
		msgShort.text = string.format("%s (%s)", msgShort.text, rRoll.sRange);
		msgLong.text = string.format("%s (%s)", msgLong.text, rRoll.sRange);
	end
	if (rRoll.sLabel or "") ~= "" then
		msgShort.text = string.format("%s (%s)", msgShort.text, rRoll.sLabel or "");
		msgLong.text = string.format("%s (%s)", msgLong.text, rRoll.sLabel or "");
	end
	msgLong.text = string.format("%s [%d]", msgLong.text, rRoll.nTotal or 0);

	-- Targeting information
	msgShort.text = string.format("%s\r->", msgShort.text);
	msgLong.text = string.format("%s\r->", msgLong.text);
	if rTarget then
		local sTargetName = ActorManager.getDisplayName(rTarget);
		msgShort.text = string.format("%s [at %s]", msgShort.text, sTargetName);
		msgLong.text = string.format("%s [at %s]", msgLong.text, sTargetName);
	end

	-- Extra roll information
	msgShort.icon = "action_attack";
	if (rRoll.sResults or "") ~= "" then
		msgLong.text = string.format("%s\r%s", msgLong.text, rRoll.sResults);
		if rRoll.sResults:match("%[CRITICAL HIT%]") then
			msgLong.icon = "action_attack_crit";
		elseif rRoll.sResults:match("HIT%]") then
			msgLong.icon = "action_attack_hit";
		elseif rRoll.sResults:match("MISS%]") then
			msgLong.icon = "action_attack_miss";
		else
			msgLong.icon = "action_attack";
		end
	else
		msgLong.icon = "action_attack";
	end

	ActionsManager.outputResult(rRoll.bTower, rSource, rTarget, msgLong, msgShort);
end
