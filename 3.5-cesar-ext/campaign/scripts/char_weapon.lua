-- 
-- Please see the license.html file included with this distribution for 
-- attribution and copyright information.
--

function onInit()
	self.onLinkChanged();
	self.onLockModeChanged(WindowManager.getWindowReadOnlyState(self));

	if minisheet then
		carried.setVisible(false);
		activatedetail.setVisible(false);
	end

	local nodeWeapon = getDatabaseNode();
	local nodeChar = DB.getChild(nodeWeapon, "...");
	DB.addHandler(DB.getPath(nodeWeapon, "shortcut"), "onUpdate", self.onLinkChanged);
	DB.addHandler(DB.getPath(nodeWeapon, "type"), "onUpdate", self.onTypeChanged);
	DB.addHandler(nodeWeapon, "onChildUpdate", self.onDataChanged);
	DB.addHandler(DB.getPath(nodeChar, "abilities.*.bonus"), "onUpdate", self.onDataChanged);
	DB.addHandler(DB.getPath(nodeChar, "attackbonus.base"), "onUpdate", self.onDataChanged);
	DB.addHandler(DB.getPath(nodeChar, "attackbonus.*"), "onChildUpdate", self.onDataChanged);
end
function onClose()
	local nodeWeapon = getDatabaseNode();
	local nodeChar = DB.getChild(nodeWeapon, "...");
	DB.removeHandler(DB.getPath(nodeWeapon, "shortcut"), "onUpdate", self.onLinkChanged);
	DB.removeHandler(DB.getPath(nodeWeapon, "type"), "onUpdate", self.onTypeChanged);
	DB.removeHandler(nodeWeapon, "onChildUpdate", self.onDataChanged);
	DB.removeHandler(DB.getPath(nodeChar, "abilities.*.bonus"), "onUpdate", self.onDataChanged);
	DB.removeHandler(DB.getPath(nodeChar, "attackbonus.base"), "onUpdate", self.onDataChanged);
	DB.removeHandler(DB.getPath(nodeChar, "attackbonus.*"), "onChildUpdate", self.onDataChanged);
end

function onLockModeChanged(bReadOnly)
	if minisheet then
		bReadOnly = true;
	end
	local tFields = { "type", "name", "idelete", };
	WindowManager.callSafeControlsSetLockMode(self, tFields, bReadOnly);
	
	if not minisheet then
		local sMode = DB.getValue(WindowManager.getTopWindow(self).getDatabaseNode(), "spellmode", "");
		WindowManager.callSafeControlsSetVisible(self, { "carried", }, not bReadOnly or (sMode == "preparation"));
	end

	self.onTypeChanged();
	self.onDataChanged();
end
function onModeChanged()
	self.onLockModeChanged(WindowManager.getWindowReadOnlyState(self));
end

local _sClass = "";
local _sRecord = "";
function onLinkChanged()
	local node = getDatabaseNode();
	local sClass, sRecord = DB.getValue(node, "shortcut", "", "");
	if sClass ~= _sClass or sRecord ~= _sRecord then
		_sClass = sClass;
		_sRecord = sRecord;
		
		local sInvList = DB.getPath(DB.getChild(node, "..."), "inventorylist") .. ".";
		if sRecord:sub(1, #sInvList) == sInvList then
			carried.setLink(DB.findNode(DB.getPath(sRecord, "carried")));
		end
	end
end
function onTypeChanged()
	local node = getDatabaseNode();

	local bRangedType = (DB.getValue(node, "type", 0) ~= 0);
	local bReadOnly;
	if minisheet then
		bReadOnly = true;
	else
		bReadOnly = WindowManager.getWindowReadOnlyState(self);
	end
	local bHasRange = (DB.getValue(node, "rangeincrement", 0) ~= 0);
	local bHasAmmo = (DB.getValue(node, "maxammo", 0) ~= 0);
	local bRanged = (bRangedType and (bHasRange or bHasAmmo or not bReadOnly));
	if bRanged then
		sub_ranged.setValue("char_weapon_ranged", node);
	else
		sub_ranged.setValue("", "");
	end
end

function onDataChanged()
	self.onAttackChanged();
	self.onDamageChanged();
end

function onAttackChanged()
	local nodeWeapon = getDatabaseNode();
	local nodeChar = DB.getChild(nodeWeapon, "...")
	local rActor = ActorManager.resolveActor(nodeChar);

	local nAttacks = math.max(DB.getValue(nodeWeapon, "attacks", 1), 1);
	local tAttack = {};

	local nViewOffset = 1;
	local nViewSpacing = 2;
	local nViewFieldWidth = 30;
	attackview.setAnchoredWidth(nViewOffset + ((nViewFieldWidth + nViewSpacing) * (nAttacks)));
	attackview2.setVisible(nAttacks > 1);
	attackview3.setVisible(nAttacks > 2);
	attackview4.setVisible(nAttacks > 3);
	
	local nAttack1 = self.calcAttackBonus(1);
	attackview1.setValue(nAttack1);
	local sAttack1 = string.format("%s: %+d", Interface.getString("action_attack_tag"), nAttack1);
	table.insert(tAttack, sAttack1);

	local nAttack2 = self.calcAttackBonus(2);
	attackview2.setValue(nAttack2);
	if nAttacks > 1 then
		local sAttack2 = string.format("%s #2: %+d", Interface.getString("action_attack_tag"), nAttack2);
		table.insert(tAttack, sAttack2);
	end

	local nAttack3 = self.calcAttackBonus(3);
	attackview3.setValue(nAttack3);
	if nAttacks > 2 then
		local sAttack3 = string.format("%s #3: %+d", Interface.getString("action_attack_tag"), self.calcAttackBonus(3));
		table.insert(tAttack, sAttack3);
	end

	local nAttack4 = self.calcAttackBonus(4);
	attackview4.setValue(nAttack4);
	if nAttacks > 3 then
		local sAttack4 = string.format("%s #4: %+d", Interface.getString("action_attack_tag"), self.calcAttackBonus(4));
		table.insert(tAttack, sAttack4);
	end

	button_attack.setTooltipText(table.concat(tAttack, "\r"));
end
function onDamageChanged()
	local nodeWeapon = getDatabaseNode();
	local nodeChar = DB.getChild(nodeWeapon, "...")
	local rActor = ActorManager.resolveActor(nodeChar);
	
	local tDamage = {};
	for _,v in ipairs(UtilityManager.getNodeSortedChildren(nodeWeapon, "damagelist")) do
		local aDice = DB.getValue(v, "dice", {});
		local nMod = DB.getValue(v, "bonus", 0);

		local sAbility = DB.getValue(v, "stat", "");
		if sAbility ~= "" then
			local nMult = DB.getValue(v, "statmult", 1);
			local nMax = DB.getValue(v, "statmax", 0);
			local nAbilityBonus = ActorManager35E.getAbilityBonus(rActor, sAbility);
			if nMax > 0 then
				nAbilityBonus = math.min(nAbilityBonus, nMax);
			end
			if nAbilityBonus > 0 and nMult ~= 1 then
				nAbilityBonus = math.floor(nMult * nAbilityBonus);
			end
			nMod = nMod + nAbilityBonus;
		end
		
		if #aDice > 0 or nMod ~= 0 then
			local sDamage = StringManager.convertDiceToString(DB.getValue(v, "dice", {}), nMod);
			local sType = DB.getValue(v, "type", "");
			if sType ~= "" then
				sDamage = sDamage .. " " .. sType;
			end
			table.insert(tDamage, sDamage);
		end
	end

	local sDamage = table.concat(tDamage, " + ");
	button_damage.setTooltipText(string.format("%s: %s", Interface.getString("action_damage_tag"), sDamage));
	damageview.setValue(sDamage);
end

function onFullAttackAction(draginfo)
	local nodeWeapon = getDatabaseNode();
	local rActor, rAttack = CharManager.getWeaponAttackRollStructures(nodeWeapon);
	
	local rRolls = {};
	local nAttacks = math.max(DB.getValue(nodeWeapon, "attacks", 1), 1);
	for i = 1, nAttacks do
		rAttack.modifier = self.calcAttackBonus(i);
		rAttack.order = i;
		table.insert(rRolls, ActionAttack.getRoll(rActor, rAttack));
	end
	if not OptionsManager.isOption("RMMT", "off") and (#rRolls > 1) then
		for _,v in ipairs(rRolls) do
			v.sDesc = v.sDesc .. " [FULL]";
		end
	end
	
	ActionsManager.performMultiAction(draginfo, rActor, "attack", rRolls);
	return true;
end
function onSingleAttackAction(n, draginfo)
	local nodeWeapon = getDatabaseNode();
	local rActor, rAttack = CharManager.getWeaponAttackRollStructures(nodeWeapon);
	rAttack.order = n or 1;
	rAttack.modifier = self.calcAttackBonus(n or 1);
	
	ActionAttack.performRoll(draginfo, rActor, rAttack);
	return true;
end
function onDamageAction(draginfo)
	local nodeWeapon = getDatabaseNode();
	local rActor, rDamage = CharManager.getWeaponDamageRollStructures(nodeWeapon);
	
	ActionDamageD20.performRoll(draginfo, rActor, rDamage);
	return true;
end

function calcAttackBonus(n)
	local nodeWeapon = getDatabaseNode();
	local nodeChar = DB.getChild(nodeWeapon, "...")
	local rActor, rAttack = CharManager.getWeaponAttackRollStructures(nodeWeapon);

	local nBonus = DB.getValue(nodeChar, "attackbonus.base", 0);
	nBonus = nBonus + ActorManager35E.getAbilityBonus(rActor, rAttack.stat);
	if rAttack.cm then
		nBonus = nBonus + DB.getValue(nodeChar, "attackbonus.grapple.size", 0);
		nBonus = nBonus + DB.getValue(nodeChar, "attackbonus.grapple.misc", 0);
		nBonus = nBonus + DB.getValue(nodeChar, "attackbonus.grapple.temporary", 0);
	elseif rAttack.range == "R" then
		nBonus = nBonus + DB.getValue(nodeChar, "attackbonus.ranged.size", 0);
		nBonus = nBonus + DB.getValue(nodeChar, "attackbonus.ranged.misc", 0);
		nBonus = nBonus + DB.getValue(nodeChar, "attackbonus.ranged.temporary", 0);
	else
		nBonus = nBonus + DB.getValue(nodeChar, "attackbonus.melee.size", 0);
		nBonus = nBonus + DB.getValue(nodeChar, "attackbonus.melee.misc", 0);
		nBonus = nBonus + DB.getValue(nodeChar, "attackbonus.melee.temporary", 0);
	end
	nBonus = nBonus + DB.getValue(nodeWeapon, "bonus", 0);
	nBonus = nBonus + DB.getValue(nodeWeapon, "attack" .. (n or 1) .. "modifier", 0);
	nBonus = nBonus + (((n or 1) - 1) * -5);

	return nBonus;
end
