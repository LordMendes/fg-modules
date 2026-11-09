-- 
-- Please see the license.html file included with this distribution for 
-- attribution and copyright information.
--

function onInit()
	EffectManager.setTagOptions("CARRY", { bIgnoreExpire = true, bIgnoreTarget = true });
	EffectManager.setTagOptions("CARRYMULT", { bIgnoreExpire = true, bIgnoreTarget = true });
end
function onTabletopInit()
	if Session.IsHost then
		GameManager.addEventFunction("onActorEncumbranceLimitChanged", EncumbranceManager35E.updateEncumbranceLimit);
		GameManager.addEventFunction("onActorSizeChanged", EncumbranceManager35E.updateEncumbranceLimit);
		DB.addHandler("charsheet.*.abilities.strength.score", "onUpdate", EncumbranceManager35E.onStrengthChange);
		DB.addHandler("charsheet.*.abilities.strength.damage", "onUpdate", EncumbranceManager35E.onStrengthChange);
		DB.addHandler("charsheet.*.encumbrance.stradj", "onUpdate", EncumbranceManager35E.onEncumbranceFieldChange);
		DB.addHandler("charsheet.*.encumbrance.carrymult", "onUpdate", EncumbranceManager35E.onEncumbranceFieldChange);

		GameManager.addEventFunction("onActorEncumbranceChanged", EncumbranceManager35E.onEncumbranceChanged);

		CombatManager.setCustomDeleteCombatantEffectHandler(EncumbranceManager35E.onActorEffectDelete);
		CombatManager.addAllCombatantEffectFieldChangeHandler("isactive", "onUpdate", EncumbranceManager35E.onActorEffectFieldUpdate);
		CombatManager.addAllCombatantEffectFieldChangeHandler("label", "onUpdate", EncumbranceManager35E.onActorEffectFieldUpdate);

		OptionsManager.registerCallback("HREN", EncumbranceManager35E.onOptionChanged);
		EncumbranceManager35E.onOptionChanged();
	end
end

function onOptionChanged()
	for _,nodeChar in ipairs(DB.getChildList("charsheet")) do
		EncumbranceManager35E.updateEncumbranceLimit(nodeChar);
	end
end

function onActorEffectDelete(nodeCT)
	EncumbranceManager35E.updateEncumbranceLimit(nodeCT);
end
function onActorEffectFieldUpdate(nodeField)
	local nodeEffect = DB.getParent(nodeField);
	EffectIndexManager.clearEffectData(nodeEffect);
	EncumbranceManager35E.updateEncumbranceLimit(DB.getChild(nodeEffect, "..."));
end

--
--	ENCUMBRANCE LIMIT HANDLING
--

function onSizeChanged(rActor)
	EncumbranceManager35E.updateEncumbranceLimit(rActor);
end

function onStrengthChange(nodeField)
	local nodeChar = DB.getChild(nodeField, "....");
	EncumbranceManager35E.updateEncumbranceLimit(nodeChar);
end
function onEncumbranceFieldChange(nodeField)
	local nodeChar = DB.getChild(nodeField, "...");
	EncumbranceManager35E.updateEncumbranceLimit(nodeChar);
end

function updateEncumbranceLimit(vActor)
	local rActor = ActorManager.resolveActor(vActor);
	local nodeActor = ActorManager.getCreatureNode(rActor);
	if not nodeActor then
		return;
	end

	-- ABILITY SCORE
	local nStrength = DB.getValue(nodeActor, "abilities.strength.score", 10);
	if not DataCommon.isPFRPG() then
		nStrength = nStrength - DB.getValue(nodeActor, "abilities.strength.damage", 0);
	end

	-- ENCUMBRANCE STR ADJ
	nStrength = nStrength + DB.getValue(nodeActor, "encumbrance.stradj", 0);
	if ActorManager35E.hasTrait(nodeActor, "Muscle of the Society") then
		nStrength = nStrength + 2;
	end

	-- EFFECT ADJ
	local nBonusStat, nBonusEffects = ActorManagerD20.getAbilityEffectsBonus(rActor, "strength");
	nStrength = nStrength + nBonusStat;
	nStrength = nStrength + EffectManager.getBonusMod(rActor, "CARRY");

	-- CARRY MULT CALC
	local nCarryMult = DB.getValue(nodeActor, "encumbrance.carrymult", 1);
	local nEffectCarryMult = EffectManager.getBonusMod(rActor, "CARRYMULT");
	if nEffectCarryMult ~= 0 then
		nCarryMult = nCarryMult * nEffectCarryMult;
	end

	local nHeavy = 0;
	if nStrength > 0 then
		if nStrength <= 10 then
			nHeavy = nStrength * 10;
		else
			nHeavy = 1.25 * math.pow(2, math.floor(nStrength / 5)) * math.floor((20 * math.pow(2, math.fmod(nStrength, 5) / 5)) + 0.5);
		end
	end
	nHeavy = math.floor(nHeavy * nCarryMult);
	
	local nLight = math.floor(nHeavy / 3);
	local nMedium = math.floor((nHeavy / 3) * 2);
	local nLiftOver = nHeavy;
	local nLiftOff = nHeavy * 2;
	local nPushDrag = nHeavy * 5;
	
	local nSize = ActorCommonManager.getSize(rActor);
	if (nSize < 0) then
		local nMult = 0;
		if (nSize == -1) then
			nMult = 0.75;
		elseif (nSize == -2) then
			nMult = 0.5;
		elseif (nSize == -3) then
			nMult = .25;
		elseif (nSize == -4) then
			nMult = .125;
		end
			
		nLight = math.floor(((nLight * nMult) * 100) + 0.5) / 100;
		nMedium = math.floor(((nMedium * nMult) * 100) + 0.5) / 100;
		nHeavy = math.floor(((nHeavy * nMult) * 100) + 0.5) / 100;
		nLiftOver = math.floor(((nLiftOver * nMult) * 100) + 0.5) / 100;
		nLiftOff = math.floor(((nLiftOff * nMult) * 100) + 0.5) / 100;
		nPushDrag = math.floor(((nPushDrag * nMult) * 100) + 0.5) / 100;
	elseif (nSize > 0) then
		local nMult = math.pow(2, nSize);
		
		nLight = nLight * nMult;
		nMedium = nMedium * nMult;
		nHeavy = nHeavy * nMult;
		nLiftOver = nLiftOver * nMult;
		nLiftOff = nLiftOff * nMult;
		nPushDrag = nPushDrag * nMult;
	end

	DB.setValue(nodeActor, "encumbrance.lightload", "number", nLight);
	DB.setValue(nodeActor, "encumbrance.mediumload", "number", nMedium);
	DB.setValue(nodeActor, "encumbrance.heavyload", "number", nHeavy);
	DB.setValue(nodeActor, "encumbrance.liftoverhead", "number", nLiftOver);
	DB.setValue(nodeActor, "encumbrance.liftoffground", "number", nLiftOff);
	DB.setValue(nodeActor, "encumbrance.pushordrag", "number", nPushDrag);

	EncumbranceManager35E.onEncumbranceChanged(rActor);
end

--
--	ENCUMBRANCE STATE HANDLING
--

function onEncumbranceChanged(vActor)
	EncumbranceManager35E.refreshEncumbranceState(vActor);
end

function refreshEncumbranceState(vActor)
	local rActor = ActorManager.resolveActor(vActor);
	if not ActorManager.hasInventory(rActor) then
		return;
	end

	local nEncumbranceLevel = EncumbranceManager35E.calcEncumbranceLevel(rActor);
	EncumbranceManager35E.setEncumbranceLevel(rActor, nEncumbranceLevel);
end
function calcEncumbranceLevel(rActor)
	local nodeActor = ActorManager.getCreatureNode(rActor);
	if not nodeActor then
		return 0;
	end

	if OptionsManager.isOption("HREN", "off") then
		return 0;
	end

	local nLoad = GameManager.getRecordFieldValue(rActor, "encload", 0);
	if nLoad > DB.getValue(nodeActor, "encumbrance.pushordrag", 0) then
		return 4;
	elseif nLoad > DB.getValue(nodeActor, "encumbrance.heavyload", 0) then
		return 3;
	elseif nLoad > DB.getValue(nodeActor, "encumbrance.mediumload", 0) then
		return 2;
	elseif nLoad > DB.getValue(nodeActor, "encumbrance.lightload", 0) then
		return 1;
	end
	return 0;
end
function setEncumbranceLevel(rActor, nLevel)
	local sState = "";
	if nLevel == 4 then
		sState = Interface.getString("encumbrance_overmax");
	elseif nLevel == 3 then
		sState = Interface.getString("encumbrance_overcap");
	elseif nLevel == 2 then		
		sState = Interface.getString("encumbrance_load_heavy");
	elseif nLevel == 1 then		
		sState = Interface.getString("encumbrance_load_medium");
	end
	GameManager.setRecordFieldValue(rActor, "enclevel", "number", nLevel);
	GameManager.setRecordFieldValue(rActor, "encstate", "string", sState);

	local nodeActor = ActorManager.getCreatureNode(rActor);
	if nodeActor then
		if nLevel >= 2 then
			DB.setValue(nodeActor, "encumbrance.maxstatbonus", "number", 1);
			DB.setValue(nodeActor, "encumbrance.checkpenalty", "number", -6);
		elseif nLevel == 1 then
			DB.setValue(nodeActor, "encumbrance.maxstatbonus", "number", 3);
			DB.setValue(nodeActor, "encumbrance.checkpenalty", "number", -3);
		else
			DB.setValue(nodeActor, "encumbrance.maxstatbonus", "number", 0);
			DB.setValue(nodeActor, "encumbrance.checkpenalty", "number", 0);
		end
	end
end

--
--	MISC
--

function hasEncumbrancePenalty(rActor)
	if GameManager.getRecordFieldValue(rActor, "enclevel", 0) <= 0 then
		return false;
	end

	local nodeActor = ActorManager.getCreatureNode(rActor);
	if not ActorManager35E.hasTrait(nodeActor, CharManager.TRAIT_SLOW_AND_STEADY) then
		return true;
	end

	-- If actor has Slow and Stready trait, then check if actual stat/enc penalty, since movement not affected.
	if DB.getValue(nodeActor, "encumbrance.checkpenalty", 0) < DB.getValue(nodeActor, "encumbrance.armorcheckpenalty", 0) then
		return true;
	end
	local nEncMaxStatBonus = DB.getValue(nodeActor, "encumbrance.maxstatbonus", 0);
	if nEncMaxStatBonus <= 0 then
		return false;
	end
	local bApplyArmorMod = (DB.getValue(nodeActor, "encumbrance.armormaxstatbonusactive", 0) ~= 0);
	if not bApplyArmorMod then
		return true;
	end
	if nEncMaxStatBonus < DB.getValue(nodeActor, "encumbrance.armormaxstatbonus", 0) then
		return true;
	end
	return false;
end

function getSkillCheckPenalty(vActor)
	local rActor = ActorManager.resolveActor(vActor);
	if not rActor then
		return 0;
	end
	if not ActorManager.hasInventory(rActor) then
		return 0;
	end
	local nodeActor = ActorManager.getCreatureNode(rActor);
	if not nodeActor then
		return 0;
	end
	if DataCommon.isPFRPG() then
		return math.min(DB.getValue(nodeActor, "encumbrance.armorcheckpenalty", 0), DB.getValue(nodeActor, "encumbrance.checkpenalty", 0), 0);
	end
	return math.min(DB.getValue(nodeActor, "encumbrance.armorcheckpenalty", 0) + DB.getValue(nodeActor, "encumbrance.checkpenalty", 0), 0);
end

function getDefenseMaxStatBonus(vActor)
	local rActor = ActorManager.resolveActor(vActor);
	if not rActor then
		return nil;
	end
	if not ActorManager.hasInventory(rActor) then
		return nil;
	end
	local nodeActor = ActorManager.getCreatureNode(rActor);
	if not nodeActor then
		return nil;
	end

	local nMaxStatBonus;
	local bApplyArmorMod = (DB.getValue(nodeActor, "encumbrance.armormaxstatbonusactive", 0) == 1);
	if bApplyArmorMod then
		nMaxStatBonus = math.max(DB.getValue(nodeActor, "encumbrance.armormaxstatbonus", 0), 0);
	end
	local nEncMaxStatBonus = math.max(DB.getValue(nodeActor, "encumbrance.maxstatbonus", 0), 0);
	if nEncMaxStatBonus > 0 then
		if bApplyArmorMod then
			nMaxStatBonus = math.min(nMaxStatBonus, nEncMaxStatBonus);
		else
			nMaxStatBonus = nEncMaxStatBonus;
		end
	end
	return nMaxStatBonus;
end
