-- 
-- Please see the license.html file included with this distribution for 
-- attribution and copyright information.
--

OOB_MSGTYPE_APPLYSAVE = "applysave";

function onInit()
	OOBManager.registerOOBMsgHandler(ActionSave.OOB_MSGTYPE_APPLYSAVE, ActionSave.handleApplySave);

	ActionsManager.registerModHandler("save", modSave);
	ActionsManager.registerResultHandler("save", onSave);
end

function notifyApplySave(rSource, rRoll)
	local msgOOB = UtilityManager.encodeRollToOOB(rRoll);
	msgOOB.type = ActionSave.OOB_MSGTYPE_APPLYSAVE;
	msgOOB.sSourceNode = ActorManager.getCreatureNodeName(rSource);
	if rRoll.sSource ~= "" then
		msgOOB.sTargetNode = rRoll.sSource;
	end
	Comm.deliverOOBMessage(msgOOB, "");
end
function handleApplySave(msgOOB)
	local rSource = ActorManager.resolveActor(msgOOB.sSourceNode);
	local rOrigin = ActorManager.resolveActor(msgOOB.sTargetNode);
	local rRoll = UtilityManager.decodeRollFromOOB(msgOOB);
	ActionSave.applySave(rSource, rOrigin, rRoll);
end

function performPartySheetRoll(draginfo, rActor, sSave)
	local rRoll = getRoll(rActor, sSave);
	
	local nTargetDC = DB.getValue("partysheet.savedc", 0);
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

function performRoll(draginfo, rActor, sSave)
	local rRoll = getRoll(rActor, sSave);
	ActionsManager.performAction(draginfo, rActor, rRoll);
end

function getRoll(rActor, sSave)
	local rRoll = {};
	rRoll.sType = "save";
	rRoll.aDice = DiceRollManager.getActorDice({ "d20" }, rActor);
	rRoll.nMod = 0;
	
	-- Look up actor specific information
	local sAbility = nil;
	local nodeActor = ActorManager.getCreatureNode(rActor);
	if nodeActor then
		if ActorManager.isPC(rActor) then
			rRoll.nMod = DB.getValue(nodeActor, "saves." .. sSave .. ".total", 0);
			sAbility = DB.getValue(nodeActor, "saves." .. sSave .. ".ability", "");
		else
			rRoll.nMod = DB.getValue(nodeActor, sSave .. "save", 0);
		end
	end

	rRoll.sDesc = ActionSaveCore.encodeActionText({ label = sSave, });

	if sAbility and sAbility ~= "" then
		if (sSave == "fortitude" and sAbility ~= "constitution") or
				(sSave == "reflex" and sAbility ~= "dexterity") or
				(sSave == "will" and sAbility ~= "wisdom") then
			local sAbilityEffect = DataCommon.ability_ltos[sAbility];
			if sAbilityEffect then
				rRoll.sDesc = rRoll.sDesc .. " [MOD:" .. sAbilityEffect .. "]";
			end
		end
	end
	
	return rRoll;
end

function modSave(rSource, rTarget, rRoll)
	local bEffects = false;
	local aAddDesc = {};
	local aAddDice = {};
	local nAddMod = 0;
	
	-- Determine save type
	local sSave = ActionSaveCore.decodeLabelText(rRoll.sDesc):lower();

	if rSource then
		-- Determine origin actor of save roll, if any
		local rSaveSource = nil;
		if rRoll.sSource then
			rSaveSource = ActorManager.resolveActor(rRoll.sSource);
		end

		-- Determine ability used
		local sActionStat = nil;
		local sModStat = string.match(rRoll.sDesc, "%[MOD:(%w+)%]");
		if sModStat then
			sActionStat = DataCommon.ability_stol[sModStat];
		end
		if not sActionStat then
			if sSave == "fortitude" then
				sActionStat = "constitution";
			elseif sSave == "reflex" then
				sActionStat = "dexterity";
			elseif sSave == "will" then
				sActionStat = "wisdom";
			end
		end
		
		-- Build save filter
		local aSaveFilter = {};
		if (sSave or "") ~= "" then
			table.insert(aSaveFilter, sSave);
		end
		
		-- Determine flatfooted status
		local bFlatfooted = false;
		local bCA = false;
		if not rRoll.bVsSave then
			if ModifierManager.getKey("ATT_FF") then
				bFlatfooted = true;
			end
			bCA = ModifierManager.getKey("ATT_CA");
		end
		if EffectManager.hasCondition(rSource, "Flat-Footed") or EffectManager.hasCondition(rSource, "Flatfooted") then
			bFlatfooted = true;
		end
		if bFlatfooted and ActorManager35E.hasRollSpecialAbility(rSource, "Uncanny Dodge") then
			bFlatfooted = false;
		end
		if EffectManager.hasCondition(rSource, "@CA", { rTarget = rSaveSource, tActionTags = rRoll.tActionTags, }) then
			bCA = true;
		elseif EffectManager.hasCondition(rSaveSource, "CA", { rTarget = rSource, tActionTags = rRoll.tActionTags, }) then
			bCA = true;
		end

		-- Get effect modifiers
		local aExistingBonusByType = {};
		local aSaveEffects = EffectManager.getCompsDataByTag(rSource, "SAVE", { rTarget = rSaveSource, tFilter = aSaveFilter, tActionTags = rRoll.tActionTags, });
		for _,v in pairs(aSaveEffects) do
			-- Determine bonus type if any
			local sBonusType = nil;
			for _,v2 in pairs(v.remainder) do
				if StringManager.contains(DataCommon.bonustypes, v2) then
					sBonusType = v2;
					break;
				end
			end
			-- Dodge bonuses stack (by rules)
			if sBonusType then
				if sBonusType == "dodge" then
					if not bFlatfooted and not bCA then
						nAddMod = nAddMod + v.mod;
						bEffects = true;
					end
				elseif aExistingBonusByType[sBonusType] then
					if v.mod < 0 then
						nAddMod = nAddMod + v.mod;
					elseif v.mod > aExistingBonusByType[sBonusType] then
						nAddMod = nAddMod + v.mod - aExistingBonusByType[sBonusType];
						aExistingBonusByType[sBonusType] = v.mod;
					end
					bEffects = true;
				else
					nAddMod = nAddMod + v.mod;
					aExistingBonusByType[sBonusType] = v.mod;
					bEffects = true;
				end
			else
				for _,v2 in pairs(v.dice) do
					table.insert(aAddDice, v2);
				end
				nAddMod = nAddMod + v.mod;
				bEffects = true;
			end
		end

		-- Get condition modifiers
		if EffectManager.hasCondition(rSource, "Frightened") or 
				EffectManager.hasCondition(rSource, "Panicked") or
				EffectManager.hasCondition(rSource, "Shaken") then
			nAddMod = nAddMod - 2;
			bEffects = true;
		end
		if EffectManager.hasCondition(rSource, "Sickened") then
			nAddMod = nAddMod - 2;
			bEffects = true;
		end
		if sSave == "reflex" then
			if EffectManager.hasCondition(rSource, "Slowed") then
				nAddMod = nAddMod - 1;
				bEffects = true;
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

		local nWoundPenalty = CesarRules.getWoundPenalty(rSource);
		if nWoundPenalty ~= 0 then
			bEffects = true;
			nAddMod = nAddMod + nWoundPenalty;
			table.insert(aAddDesc, string.format("[WOUND %+d]", nWoundPenalty));
		end

		-- If flatfooted or CA, then add a note
		if bFlatfooted then
			table.insert(aAddDesc, "[FF]");
		end
		if bCA then
			table.insert(aAddDesc, "[CA]");
		end
	end
	
	DiceRollManager.addRollEffectDiceMod(rSource, rRoll, aAddDice, nAddMod);
	if bEffects then
		table.insert(aAddDesc, EffectManager.buildEffectDiceModOutput(aAddDice, nAddMod));
	end
	if #aAddDesc > 0 then
		rRoll.sDesc = StringManager.appendLine(rRoll.sDesc, table.concat(aAddDesc, "\r"));
	end
end

function onSave(rSource, rTarget, rRoll)
	local rMessage = ActionsManager.createActionMessage(rSource, rRoll);
	Comm.deliverChatMessage(rMessage);
	
	if rRoll.nTarget then
		if #(rRoll.aDice) > 0 then
			local nFirstDie = rRoll.aDice[1].result or 0;
			if nFirstDie == 20 then
				rRoll.sResult = "critsuccess";
			elseif nFirstDie == 1 then
				rRoll.sResult = "critfailure";
			end
		end
		if (rRoll.sResult or "") == "" then
			local nTarget = tonumber(rRoll.nTarget) or 0;
			if rRoll.nTotal >= nTarget then
				rRoll.sResult = "success";
			else
				rRoll.sResult = "failure";
			end
		end
		notifyApplySave(rSource, rRoll);
	end
	CesarRules.rememberRoll(rSource, rRoll);
end
	
function applySave(rSource, rOrigin, rRoll)
	local msgShort = {font = "msgfont"};
	local msgLong = {font = "msgfont"};
	
	msgShort.text = "Save";
	msgLong.text = "Save [" .. rRoll.nTotal ..  "]";
	if rRoll.nTarget then
		msgLong.text = msgLong.text .. "[vs. DC " .. rRoll.nTarget .. "]";
	end
	if rSource or rOrigin then
		msgShort.text = msgShort.text .. "\r->";
		msgLong.text = msgLong.text .. "\r->";
		if rSource then
			msgShort.text = msgShort.text .. " [for " .. ActorManager.getDisplayName(rSource) .. "]";
			msgLong.text = msgLong.text .. " [for " .. ActorManager.getDisplayName(rSource) .. "]";
		end
		if rOrigin then
			msgShort.text = msgShort.text .. " [vs " .. ActorManager.getDisplayName(rOrigin) .. "]";
			msgLong.text = msgLong.text .. " [vs " .. ActorManager.getDisplayName(rOrigin) .. "]";
		end
	end
	
	local sAttack = "";
	local bHalfMatch = false;
	if rRoll.sSaveDesc then
		sAttack = ActionCore.decodeLabelText(rRoll.sSaveDesc, "action_savevs_tag");
		bHalfMatch = (rRoll.sSaveDesc:match("%[HALF ON SAVE%]") ~= nil);
	end
	
	msgShort.icon = "action_save";

	if rRoll.sResult == "critsuccess" or rRoll.sResult == "success" then
		if rRoll.sResult == "critsuccess" then
			msgLong.icon = "action_save_success_crit";
			msgLong.text = msgLong.text .. " [AUTOMATIC SUCCESS]";
		else
			msgLong.icon = "action_save_success";
			msgLong.text = msgLong.text .. " [SUCCESS]";
		end
		
		if rSource then
			local bHalfDamage = bHalfMatch;
			local bAvoidDamage = false;
			if bHalfDamage then
				local sSave = ActionSaveCore.decodeLabelText(rRoll.sDesc):lower();
				if sSave == "reflex" then
					if ActorManager35E.hasRollSpecialAbility(rSource, "Improved Evasion") then
						local bHelpless = EffectManager.hasCondition(rSource, "Helpless") or
								EffectManager.hasCondition(rSource, "Paralyzed") or
								EffectManager.hasCondition(rSource, "Petrified") or
								EffectManager.hasCondition(rSource, "Sleeping") or
								EffectManager.hasCondition(rSource, "Unconscious");
						if not bHelpless then
							bAvoidDamage = true;
							msgLong.text = msgLong.text .. "\r[IMPROVED EVASION]";
						end
					elseif ActorManager35E.hasRollSpecialAbility(rSource, "Evasion") then
						local bHelpless = EffectManager.hasCondition(rSource, "Helpless") or
								EffectManager.hasCondition(rSource, "Paralyzed") or
								EffectManager.hasCondition(rSource, "Petrified") or
								EffectManager.hasCondition(rSource, "Sleeping") or
								EffectManager.hasCondition(rSource, "Unconscious");
						if not bHelpless then
							bAvoidDamage = true;
							msgLong.text = msgLong.text .. "\r[EVASION]";
						end
					end
				end
			end
			
			if bAvoidDamage then
				rRoll.sResult = "none";
				rRoll.bRemoveOnMiss = false;
			elseif bHalfDamage then
				rRoll.sResult = "half_success";
				rRoll.bRemoveOnMiss = false;
			end
			
			if rOrigin and rRoll.bRemoveOnMiss then
				TargetingManager.removeTarget(ActorManager.getCTNodeName(rOrigin), ActorManager.getCTNodeName(rSource));
			end
		end

		ActionSaveCore.handleSaveSuccess(rSource, rRoll);
	else
		if rRoll.sResult == "critfailure" then
			msgLong.icon = "action_save_failure_crit";
			msgLong.text = msgLong.text .. " [AUTOMATIC FAILURE]";
		else
			msgLong.icon = "action_save_failure";
			msgLong.text = msgLong.text .. " [FAILURE]";
		end

		if rSource then
			local bHalfDamage = false;
			if bHalfMatch then
				local sSave = ActionSaveCore.decodeLabelText(rRoll.sDesc):lower();
				if sSave == "reflex" then
					if ActorManager35E.hasRollSpecialAbility(rSource, "Improved Evasion") then
						local bHelpless = EffectManager.hasCondition(rSource, "Helpless") or
								EffectManager.hasCondition(rSource, "Paralyzed") or
								EffectManager.hasCondition(rSource, "Petrified") or
								EffectManager.hasCondition(rSource, "Sleeping") or
								EffectManager.hasCondition(rSource, "Unconscious");
						if not bHelpless then
							bHalfDamage = true;
							msgLong.text = msgLong.text .. "\r[IMPROVED EVASION]";
						end
					end
				end
			end
			
			if bHalfDamage then
				rRoll.sResult = "half_failure";
			end
		end

		ActionSaveCore.handleSaveFail(rSource, rRoll);
	end
	
	ActionsManager.outputResult(rRoll.bTower, rSource, rOrigin, msgLong, msgShort);
	
	if rSource and rOrigin then
		ActionDamageCore.setDamageState(rOrigin, rSource, StringManager.trim(sAttack), rRoll.sResult);
	end

	GameManager.callEventFunctions("onSavePostResolve", rSource, rOrigin, rRoll);
end

--
--	LEGACY (2026-06)
--

function performVsRoll(draginfo, rActor, sSave, nTargetDC, bSecretRoll, rSource, bRemoveOnMiss, sSaveDesc)
	local rRoll = getRoll(rActor, sSave);

	if bSecretRoll then
		rRoll.bSecret = true;
	end
	rRoll.nTarget = nTargetDC;
	rRoll.bRemoveOnMiss = bRemoveOnMiss;
	if sSaveDesc then
		rRoll.sSaveDesc = sSaveDesc;
	end
	if rSource then
		rRoll.sSource = ActorManager.getCTNodeName(rSource);
	end
	rRoll.bVsSave = true;

	ActionsManager.performAction(draginfo, rActor, rRoll);
end
