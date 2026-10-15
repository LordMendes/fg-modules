-- 
-- Please see the license.html file included with this distribution for 
-- attribution and copyright information.
--

function onInit()
	ActionsManager.registerModHandler("ability", modRoll);
	ActionsManager.registerResultHandler("ability", onRoll);
end

function performPartySheetRoll(draginfo, rActor, sAbilityStat)
	local rRoll = getRoll(rActor, sAbilityStat);
	
	local nTargetDC = DB.getValue("partysheet.abilitydc", 0);
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

function performRoll(draginfo, rActor, sAbilityStat)
	local rRoll = getRoll(rActor, sAbilityStat);
	ActionsManager.performAction(draginfo, rActor, rRoll);
end
function getRoll(rActor, sAbilityStat)
	local rRoll = {};
	rRoll.sType = "ability";
	rRoll.aDice = DiceRollManager.getActorDice({ "d20" }, rActor);
	rRoll.nMod = ActorManager35E.getAbilityBonus(rActor, sAbilityStat);
	rRoll.sDesc = ActionCore.encodeActionText({ label = sAbilityStat, }, "action_ability_tag");
	return rRoll;
end

function modRoll(rSource, rTarget, rRoll)
	if rSource then
		local sAbility = ActionCore.decodeLabelText(rRoll.sDesc, "action_ability_tag"):lower();
		if sAbility == "" then 
			if string.match(rRoll.sDesc, "%[STABILIZATION%]") then
				sAbility = "constitution";
			end
		end

		-- ACTION MODIFIERS
		ActionCore.applyModRollEffectBonusDiceMod(rSource, rRoll, "ABIL", { tFilter = { sAbility }, });

		-- CONDITION MODIFIERS
		if EffectManager.hasCondition(rSource, "Frightened") or 
				EffectManager.hasCondition(rSource, "Panicked") or
				EffectManager.hasCondition(rSource, "Shaken") then
			rRoll.bEffects = true;
			rRoll.nEffectMod = rRoll.nEffectMod - 2;
		end
		if EffectManager.hasCondition(rSource, "Sickened") then
			rRoll.bEffects = true;
			rRoll.nEffectMod = rRoll.nEffectMod - 2;
		end

		-- STAT MODIFIERS
		local nBonusStat, nBonusEffects = ActorManagerD20.getAbilityEffectsBonus(rSource, sAbility);
		ActionCore.applyModRollEffect(rRoll, nil, nBonusStat, nBonusEffects);

		-- NEGATIVE LEVEL MODIFIERS
		local nNegLevelMod, nNegLevelCount = EffectManager.getBonusMod(rSource, "NLVL");
		ActionCore.applyModRollEffect(rRoll, nil, -nNegLevelMod, nNegLevelCount);
	end
end

function onRoll(rSource, rTarget, rRoll)
	local rMessage = ActionsManager.createActionMessage(rSource, rRoll);

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
	
	Comm.deliverChatMessage(rMessage);
end
