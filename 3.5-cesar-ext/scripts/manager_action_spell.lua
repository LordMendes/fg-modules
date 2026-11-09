-- 
-- Please see the license.html file included with this distribution for 
-- attribution and copyright information.
--

OOB_MSGTYPE_APPLYSAVEVS = "applysavevs";

function onInit()
	OOBManager.registerOOBMsgHandler(OOB_MSGTYPE_APPLYSAVEVS, handleApplySave);

	ActionsManager.registerTargetingHandler("cast", ActionCore.onTargeting);
	ActionsManager.registerTargetingHandler("clc", ActionCore.onTargeting);
	ActionsManager.registerTargetingHandler("spellsave", ActionCore.onTargeting);

	ActionsManager.registerModHandler("castsave", modCastSave);
	ActionsManager.registerModHandler("spellsave", modCastSave);
	ActionsManager.registerModHandler("clc", modCLC);
	ActionsManager.registerModHandler("concentration", modConcentration);
	
	ActionsManager.registerResultHandler("cast", onSpellCast);
	ActionsManager.registerResultHandler("castclc", onCastCLC);
	ActionsManager.registerResultHandler("castsave", onCastSave);
	ActionsManager.registerResultHandler("clc", onCLC);
	ActionsManager.registerResultHandler("spellsave", onSpellSave);
	ActionsManager.registerResultHandler("spellfailure", onSpellFailure);
end

function notifyApplySave(rSource, rTarget, rRoll)
	local msgOOB = UtilityManager.encodeRollToOOB(rRoll);
	msgOOB.type = ActionSpell.OOB_MSGTYPE_APPLYSAVEVS;
	msgOOB.sSourceNode = ActorManager.getCreatureNodeName(rSource);
	msgOOB.sTargetNode = ActorManager.getCreatureNodeName(rTarget);
	Comm.deliverOOBMessage(msgOOB, "");
end
function handleApplySave(msgOOB)
	local rSource = ActorManager.resolveActor(msgOOB.sSourceNode);
	local rTarget = ActorManager.resolveActor(msgOOB.sTargetNode);
	local rSaveVsRoll = UtilityManager.decodeRollFromOOB(msgOOB);
	ActionSpell.performSaveVsRoll(rSource, rTarget, rSaveVsRoll);
end
function performSaveVsRoll(rSource, rTarget, rSaveVsRoll)
	if not rSaveVsRoll then
		return;
	end
	local sSaveShort, sSaveDC = (rSaveVsRoll.sDesc or ""):match("%[(%w+) DC (%d+)%]");
	if not sSaveShort then
		return;
	end
	local sSave = DataCommon.save_stol[sSaveShort];
	if not sSave then
		return;
	end

	local rRoll = ActionSave.getRoll(rTarget, sSave);
	rRoll.bVsSave = true;
	rRoll.sSaveDesc = rSaveVsRoll.sDesc;
	rRoll.sSource = ActorManager.getCTNodeName(rSource);
	rRoll.bSecret = rSaveVsRoll.bSecret;
	rRoll.nTarget = rSaveVsRoll.nMod; 
	rRoll.bRemoveOnMiss = rSaveVsRoll.bRemoveOnMiss;
	rRoll.tActionTags = rSaveVsRoll.tActionTags;

	ActionsManager.performAction(draginfo, rTarget, rRoll);
end

function getSpellCastRoll(rActor, rAction)
	local rRoll = {
		sType = "cast",
		sDesc = ActionCore.encodeActionText(rAction, "action_cast_tag"),
		aDice = {},
		nMod = 0,
		sActionPath = DB.getPath(rAction.nodeAction),
		tActionTags = rAction.tActionTags,
	};
	return rRoll;
end

function getCLCRoll(rActor, rAction)
	local rRoll = {};
	rRoll.sType = "clc";
	rRoll.aDice = DiceRollManager.getActorDice({ "d20" }, rActor);
	rRoll.nMod = rAction.clc or 0;
	
	rRoll.sDesc = "[CL CHECK";
	if rAction.order and rAction.order > 1 then
		rRoll.sDesc = rRoll.sDesc .. " #" .. rAction.order;
	end
	rRoll.sDesc = rRoll.sDesc .. "] " .. StringManager.capitalizeAll(rAction.label);
	if rAction.sr == "no" then
		rRoll.sDesc = rRoll.sDesc .. " [SR NOT ALLOWED]";
	end
	rRoll.tActionTags = rAction.tActionTags;
	
	return rRoll;
end

function getSaveVsRoll(rActor, rAction)
	local rRoll = {
		sType = "spellsave",
		sDesc = ActionCore.encodeActionText(rAction, "action_savevs_tag"),
		aDice = {},
		nMod = (rAction.savemod or 0),
	};

	if rAction.save == "fortitude" then
		rRoll.sDesc = StringManager.appendLine(rRoll.sDesc, string.format("[FORT DC %d]", rAction.savemod));
	elseif rAction.save == "reflex" then
		rRoll.sDesc = StringManager.appendLine(rRoll.sDesc, string.format("[REF DC %d]", rAction.savemod));
	elseif rAction.save == "will" then
		rRoll.sDesc = StringManager.appendLine(rRoll.sDesc, string.format("[WILL DC %d]", rAction.savemod));
	end

	if rAction.dcstat then
		local sAbilityEffect = DataCommon.ability_ltos[rAction.dcstat];
		if sAbilityEffect then
			rRoll.sDesc = StringManager.appendLine(rRoll.sDesc, string.format("[MOD:%s]", sAbilityEffect));
		end
	end
	if rAction.onmissdamage == "half" then
		rRoll.sDesc = StringManager.appendLine(rRoll.sDesc, "[HALF ON SAVE]");
	end

	local nDCEffectMod = EffectManager.getBonusMod(rActor, "DC", { tActionTags = rAction.tActionTags, });
	if nDCEffectMod ~= 0 then
		rRoll.nMod = rRoll.nMod + nDCEffectMod;
		rRoll.sDesc = StringManager.appendLine(rRoll.sDesc, EffectManager.buildEffectOutput(nDCEffectMod));
	end

	rRoll.tActionTags = rAction.tActionTags;

	return rRoll;
end

function performSpellFailureRoll(rActor, nTarget)
	local rRoll = {
		sType = "spellfailure",
		sDesc = "[SPELL FAILURE CHECK]",
		aDice = { "d100" },
		nTarget = nTarget,
	};
	ActionsManager.actionDirect(rActor, rRoll.sType, { rRoll });
end

function modCastSave(rSource, rTarget, rRoll)
	if rSource then
		local sActionStat = nil;
		local sModStat = string.match(rRoll.sDesc, "%[MOD:(%w+)%]");
		if sModStat then
			sActionStat = DataCommon.ability_stol[sModStat];
		end
		if sActionStat then
			local nBonusStat, nBonusEffects = ActorManagerD20.getAbilityEffectsBonus(rSource, sActionStat);
			if nBonusEffects > 0 then
				rRoll.sDesc = StringManager.appendLine(rRoll.sDesc, EffectManager.buildEffectOutput(nBonusStat));
				rRoll.nMod = rRoll.nMod + nBonusStat;
			end
		end
	end
end

function modCLC(rSource, rTarget, rRoll)
	if rSource then
		local aAddDice = {};
		local nAddMod = 0;
		
		-- Get CLC modifier effects
		local tCLCDice, nCLCMod, nCLCCount = EffectManager.getBonusDiceMod(rSource, "CLC", { rTarget = rTarget, tActionTags = rRoll.tActionTags, });
		if nCLCCount > 0 then
			bEffects = true;
			for _,v in ipairs(tCLCDice) do
				table.insert(aAddDice, v);
			end
			nAddMod = nAddMod + nCLCMod;
		end
		
		-- Get negative levels
		local nNegLevelMod, nNegLevelCount = EffectManager.getBonusMod(rSource, "NLVL");
		if nNegLevelCount > 0 then
			bEffects = true;
			nAddMod = nAddMod - nNegLevelMod;
		end

		if bEffects then
			rRoll.sDesc = StringManager.appendLine(rRoll.sDesc, EffectManager.buildEffectDiceModOutput(aAddDice, nAddMod));
			DiceRollManager.addRollEffectDiceMod(rSource, rRoll, aAddDice, nAddMod);
		end
	end
end

function modConcentration(rSource, rTarget, rRoll)
	if rSource then
		local sActionStat = nil;
		local sModStat = string.match(rRoll.sDesc, "%[MOD:(%w+)%]");
		if sModStat then
			sActionStat = DataCommon.ability_stol[sModStat];
		end

		local nBonusStat, nBonusEffects = ActorManagerD20.getAbilityEffectsBonus(rSource, sActionStat);
		if nBonusEffects > 0 then
			rRoll.sDesc = StringManager.appendLine(rRoll.sDesc, EffectManager.buildEffectOutput(nBonusStat));
			rRoll.nMod = rRoll.nMod + nBonusStat;
		end
	end
end

function onSpellCast(rSource, rTarget, rRoll)
	local rMessage = ActionsManager.createActionMessage(rSource, rRoll);
	rMessage.dice = nil;
	rMessage.icon = "action_cast";

	if rTarget then
		rMessage.text = rMessage.text .. "\r[at " .. ActorManager.getDisplayName(rTarget) .. "]";
	end
	
	Comm.deliverChatMessage(rMessage);

	ActionSpell.handleSpellFailure(rSource, rTarget, rRoll);
end
function handleSpellFailure(rSource, rTarget, rRoll)
	local nodeAction = DB.findNode(rRoll.sActionPath);
	local nodeSpell = DB.getChild(nodeAction, "...");
	local rActor = ActorManager.resolveActor(DB.getChild(nodeSpell, "......."));
	handleSpellFailureConditions(rActor, nodeSpell);
	handleSpellFailureComponents(rActor, nodeSpell);
end
function handleSpellFailureConditions(rActor, nodeSpell)
	if not rActor or not nodeSpell then
		return;
	end

	local tComponents = StringManager.splitByPattern( DB.getValue(nodeSpell, "components", ""):lower(), ",", true);

	if EffectManager.hasCondition(rActor, "Silenced") and StringManager.contains(tComponents, "v") then
		ChatManager.sendMessage(Interface.getString("cast_message_verbalwhilesilenced"), { sIcon = "action_error", rActor = rActor, });
		return;
	end

	local sConcCond;
	if EffectManager.hasCondition(rActor, "Pinned") then
		if StringManager.contains(tComponents, "s") then
			ChatManager.sendMessage(Interface.getString("cast_message_somaticwhilepinned"), { sIcon = "action_error", rActor = rActor, });
			return;
		end
		sConcCond = "Pinned";
	end
	if not sConcCond and EffectManager.hasCondition(rActor, "Entangled") then
		sConcCond = "Entangled";
	end
	if not sConcCond and EffectManager.hasCondition(rActor, "Grappled") then
		sConcCond = "Grappled";
	end
	if sConcCond then
		local sMsg = string.format(Interface.getString("cast_message_needconcentrationcheck"), sConcCond);
		ChatManager.sendMessage(sMsg, { sIcon = "action_warning", rActor = rActor, });
	end
end
function handleSpellFailureComponents(rActor, nodeSpell)
	if not rActor or not nodeSpell then
		return;
	end

	local sComponents = DB.getValue(nodeSpell, "components", "");
	local tComponents = StringManager.splitByPattern(sComponents:lower(), ",", true);

	if StringManager.contains(tComponents, "v") then
		handleSpellFailureVerbal(rActor, nodeSpell);
	end
	if StringManager.contains(tComponents, "s") then
		handleSpellFailureSomatic(rActor, nodeSpell);
	end
end
function handleSpellFailureVerbal(rActor, nodeSpell)
	local nVerbalSpellFailureChance = 0;
	if EffectManager.hasCondition(rActor, "Deafened") then
		nVerbalSpellFailureChance = 20;
		ChatManager.Message(Interface.getString("cast_message_verbalwhiledeafened"), true, rActor);
	end

	if nVerbalSpellFailureChance > 0 then
		if OptionsManager.isOption("AUTO_SPELL_FAILURE", "auto") then
			ActionSpell.performSpellFailureRoll(rActor, nVerbalSpellFailureChance);
		elseif OptionsManager.isOption("AUTO_SPELL_FAILURE", "prompt") then
			local sMsg = string.format(Interface.getString("cast_message_verbal_prompt"), nVerbalSpellFailureChance);
			ChatManager.sendMessage(sMsg, { sIcon = "action_warning", rActor = rActor, });
		end
	end
end
function handleSpellFailureSomatic(rActor, nodeSpell)
	if EffectManager.hasCondition(rActor, "NSF") then
		return;
	end

	local nSomaticSpellFailureChance = 0;
	if ActorManager.isPC(rActor) then
		nSomaticSpellFailureChance = DB.getValue(ActorManager.getCreatureNode(rActor), "encumbrance.spellfailure", 0);
	end
	nSomaticSpellFailureChance = nSomaticSpellFailureChance + EffectManager.getBonusMod(rActor, "SF");

	if nSomaticSpellFailureChance > 0 then
		if OptionsManager.isOption("AUTO_SPELL_FAILURE", "auto") then
			ActionSpell.performSpellFailureRoll(rActor, nSomaticSpellFailureChance);
		elseif OptionsManager.isOption("AUTO_SPELL_FAILURE", "prompt") then
			local sMsg = string.format(Interface.getString("cast_message_somatic_prompt"), nSomaticSpellFailureChance);
			ChatManager.sendMessage(sMsg, { sIcon = "action_warning", rActor = rActor, });
		end
	end
end

function onCastCLC(rSource, rTarget, rRoll)
	if rTarget then
		local nSR = ActorManager35E.getSpellDefense(rSource, rTarget);
		nSR = nSR + EffectManager.getBonusMod(rTarget, "SR", { rTarget = rSource, tActionTags = rRoll.tActionTags, });

		if nSR > 0 then
			if not string.match(rRoll.sDesc, "%[SR NOT ALLOWED%]") then
				local rRoll = { 
					sType = "clc", 
					sDesc = rRoll.sDesc, 
					aDice = DiceRollManager.getActorDice({ "d20" }, rSource),
					nMod = rRoll.nMod, 
					bRemoveOnMiss = rRoll.bRemoveOnMiss
				};
				ActionsManager.actionDirect(rSource, "clc", { rRoll }, { { rTarget } });
				return true;
			end
		end
	end
end

function onCastSave(rSource, rTarget, rRoll)
	if rTarget then
		local sSaveShort, sSaveDC = string.match(rRoll.sDesc, "%[(%w+) DC (%d+)%]")
		if sSaveShort then
			local sSave = DataCommon.save_stol[sSaveShort];
			if sSave then
				ActionSpell.notifyApplySave(rSource, rTarget, rRoll);
				return true;
			end
		end
	end

	return false;
end

function onCLC(rSource, rTarget, rRoll)
	local rMessage = ActionsManager.createActionMessage(rSource, rRoll);

	local nTotal = ActionsManager.total(rRoll);
	local bSRAllowed = not string.match(rRoll.sDesc, "%[SR NOT ALLOWED%]");
	
	if rTarget then
		rMessage.text = rMessage.text .. " [at " .. ActorManager.getDisplayName(rTarget) .. "]";
		
		if bSRAllowed then
			local nSR = ActorManager35E.getSpellDefense(rSource, rTarget) + EffectManager.getBonusMod(rTarget, "SR", { rTarget = rSource, tActionTags = rRoll.tActionTags, });
			if nSR > 0 then
				if nTotal >= nSR then
					rMessage.text = rMessage.text .. " [SUCCESS]";
				else
					rMessage.text = rMessage.text .. " [FAILURE]";
					if rSource then
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
			else
				rMessage.text = rMessage.text .. " [TARGET HAS NO SR]";
			end
		end
	end
	
	Comm.deliverChatMessage(rMessage);
end

function onSpellSave(rSource, rTarget, rRoll)
	if onCastSave(rSource, rTarget, rRoll) then
		return;
	end

	local rMessage = ActionsManager.createActionMessage(rSource, rRoll);
	Comm.deliverChatMessage(rMessage);
end

function onSpellFailure(rSource, _, rRoll)
	local msg = ActionsManager.createActionMessage(rSource, rRoll);
	if rRoll.nTarget then
		msg.text = StringManager.append(msg.text, string.format("[%d%%]", rRoll.nTarget), " ");
		if rRoll.nTotal > rRoll.nTarget then
			msg.icon = "action_save_success";
			msg.text = StringManager.appendLine(msg.text, "[SUCCEEDED]");
		else
			msg.icon = "action_save_failure";
			msg.text = StringManager.appendLine(msg.text, "[FAILED]");
		end
	end
	Comm.deliverChatMessage(msg);
end
