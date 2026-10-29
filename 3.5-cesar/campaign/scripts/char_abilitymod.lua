-- 
-- Please see the license.html file included with this distribution for 
-- attribution and copyright information.
--

local _sAbility = "";
local _nodeCreature = nil;
local _nodeAbility = nil;

function onInit()
	if super and super.onInit then
		super.onInit();
	end
	if applymaxstat then
		addSource("encumbrance.armormaxstatbonus");
		addSource("encumbrance.armormaxstatbonusactive");
		addSource("encumbrance.maxstatbonus");
	end
end
function onClose()
	if _nodeAbility then
		DB.removeHandler(_nodeAbility, "onUpdate", updateValue);
	end
	if applymaxstat then
		removeSource("encumbrance.armormaxstatbonus");
		removeSource("encumbrance.armormaxstatbonusactive");
		removeSource("encumbrance.maxstatbonus");
	end
end

function addSource(sName, sType)
	if (sName or "") == "" then
		return;
	end
	local node = DB.createChild(window.getDatabaseNode(), sName, sType or "number");
	if not node then
		return;
	end
	DB.addHandler(node, "onUpdate", self.updateValue);
end
function removeSource(sName)
	if (sName or "") == "" then
		return;
	end
	local node = DB.getChild(window.getDatabaseNode(), sName);
	if not node then
		return;
	end
	DB.removeHandler(node, "onUpdate", self.updateValue);
end

function setAbilityNodes(nodeCreature, sAbility, nodeAbility)
	if _nodeAbility then
		_sAbility = "";
		_nodeCreature = nil;
		DB.removeHandler(_nodeAbility, "onUpdate", updateValue);
	end
	_nodeAbility = nodeAbility;
	if _nodeAbility then
		_sAbility = sAbility;
		_nodeCreature = nodeCreature;
		DB.addHandler(_nodeAbility, "onUpdate", updateValue);
	end
end

function updateAbility(sCharRelative, sAbility)
	if _sAbility == sAbility then
		return;
	end
	
	local nodeCreature = nil;
	local nodeAbility = nil;
	if sAbility ~= "" then
		local nodeSpellClass = window.getDatabaseNode();
		nodeCreature = DB.getChild(nodeSpellClass, sCharRelative);

		if nodeCreature then
			if ActorManager.isPC(nodeCreature) then
				if StringManager.contains(DataCommon.abilities, sAbility) then
					nodeAbility = DB.getChild(nodeCreature, "abilities." .. sAbility .. ".bonus");
				elseif sAbility == "bab" then
					nodeAbility = DB.getChild(nodeCreature, "attackbonus.base");
				elseif sAbility == "level" then
					nodeAbility = DB.getChild(nodeCreature, "level");
				end
			else
				if StringManager.contains(DataCommon.abilities, sAbility) then
					nodeAbility = DB.getChild(nodeCreature, sAbility);
				elseif sAbility == "bab" then
					nodeAbility = DB.getChild(nodeCreature, "babgrp");
				elseif sAbility == "level" then
					nodeAbility = DB.getChild(nodeCreature, "hd");
				end
			end
		end
	end
	setAbilityNodes(nodeCreature, sAbility, nodeAbility)

	updateValue();
end

function updateValue()
	if _nodeAbility then
		local nodeParent = DB.getParent(_nodeCreature);

		local nValue = 0;
		if DB.getName(nodeParent) == "charsheet" then
			nValue = DB.getValue(_nodeAbility);
		elseif DB.getName(nodeParent) == "npc" then
			local rActor = ActorManager.resolveActor(nodeCreature);
			nValue = ActorManager35E.getAbilityBonus(rActor, _sAbility);
		end
		if applymaxstat then
			local nMaxMod = EncumbranceManager35E.getDefenseMaxStatBonus(window.getDatabaseNode());
			if nMaxMod then
				nValue = math.min(nValue, nMaxMod);
			end
		end
		setValue(nValue);
	else
		setValue(0);
	end
end
