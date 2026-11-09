-- 
-- Please see the license.html file included with this distribution for 
-- attribution and copyright information.
--

function onInit()
	EffectManager.registerStandardDescriptorGroups();
	EffectManagerD20.registerStandardConditionals();
	
	GameManager.setFunction("onActorStartTurn", EffectManager35E.onActorStartTurn);
	GameManager.setFunction("onActorEndTurn", EffectManager35E.onActorEndTurn);
end

--
--	EFFECT MANAGER OVERRIDES
--

function onActorStartTurn(rActor)
	EffectManager.applyTurnChangeEffect(rActor, "FHEAL", ActionHealthD20.applyOngoingHealthAdjustment);
	EffectManager.applyTurnChangeEffect(rActor, "REGEN", ActionHealthD20.applyOngoingHealthAdjustment);
	EffectManager.applyTurnChangeEffect(rActor, "TEMPO", ActionHealthD20.applyOngoingHealthAdjustment);
	EffectManager.applyTurnChangeEffect(rActor, "DMGO", ActionHealthD20.applyOngoingHealthAdjustment);
	EffectManager.applyTurnChangeEffect(rActor, "SAVEO", EffectManager35E.applySave);
end
function onActorEndTurn(rActor)
	EffectManager.applyTurnChangeEffect(rActor, "REGENE", ActionHealthD20.applyOngoingHealthAdjustment);
	EffectManager.applyTurnChangeEffect(rActor, "TEMPOE", ActionHealthD20.applyOngoingHealthAdjustment);
	EffectManager.applyTurnChangeEffect(rActor, "DMGOE", ActionHealthD20.applyOngoingHealthAdjustment);
	EffectManager.applyTurnChangeEffect(rActor, "SAVEOE", EffectManager35E.applySave);
end
function applySave(rActor, tCompData)
	if not rActor or not tCompData then
		return;
	end
	if (tCompData.mod or 0) == 0 then
		return;
	end

	local sSave = tCompData.sRemainder:match("^%w+");
	if (sSave or "") == "" then
		return;
	end
	sSave = DataCommon.save_stol[sSave:upper()] or sSave:lower();
	if not DataCommon.save_ltos[sSave] then
		return;
	end

	local sEffect = EffectVarManager.getEffectVarFromNode(tCompData.node, "sName", "");
	local tComps = EffectManager.parseEffect(sEffect);
	local sSaveDesc = string.format("[EFFECT: %s]", tComps[1] or "");

	local rRoll = ActionSave.getRoll(rActor, sSave);
	rRoll.sEffectRecord = DB.getPath(tCompData.node);
	rRoll.nTarget = tCompData.mod;
	rRoll.sSaveDesc = sSaveDesc;
	ActionsManager.performAction(draginfo, rActor, rRoll);
end
