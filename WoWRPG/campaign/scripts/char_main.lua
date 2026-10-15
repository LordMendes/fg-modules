-- 
-- Please see the license.html file included with this distribution for 
-- attribution and copyright information.
--

function onInit()
	self.onLevelChanged();
	self.onSystemChanged();
	self.onLockModeChanged(WindowManager.getWindowReadOnlyState(self));

	DB.addHandler(DB.getPath(getDatabaseNode(), "classes"), "onChildUpdate", self.onLevelChanged);
end
function onClose()
	DB.removeHandler(DB.getPath(getDatabaseNode(), "classes"), "onChildUpdate", self.onLevelChanged);
end

function onLockModeChanged(bReadOnly)
	local tFieldsAbility = { "strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma", };
	local tFieldsAbilityBonus = { "strengthbonus", "dexteritybonus", "constitutionbonus", "intelligencebonus", "wisdombonus", "charismabonus", };
	local tFieldsAbilityDamage = { "strengthdamage", "dexteritydamage", "constitutiondamage", "intelligencedamage", "wisdomdamage", "charismadamage", };
	local tFieldsHealth = { "hp", };
	--local tFieldsHealth = { "wounds", "hptemp", "nonlethal", };
	local tFieldsOther = { "speedfinal", "speedspecial", "senses", };

	WindowManager.callSafeControlsSetLockMode(self, tFieldsAbility, bReadOnly);
	WindowManager.callSafeControlsSetLockMode(self, tFieldsAbilityBonus, bReadOnly);
	WindowManager.callSafeControlsSetLockMode(self, tFieldsAbilityDamage, bReadOnly);
	WindowManager.callSafeControlsSetLockMode(self, tFieldsHealth, bReadOnly);
	WindowManager.callSafeControlsSetLockMode(self, tFieldsOther, bReadOnly);

	if WindowManager.getTopWindow(self).getClass() == "charsheetmini" then
		local tFieldsCombat = { "initiative", "melee", "ranged", "grapple", };
		local tFieldsDefense = { "ac", "srfinal", "fortitude", "reflex", "will", };
		WindowManager.callSafeControlsSetLockMode(self, tFieldsCombat, bReadOnly);
		WindowManager.callSafeControlsSetLockMode(self, tFieldsDefense, bReadOnly);
	else
		local tFieldsTop = { "race", };
		local tFieldsCombat = { "initiative", "meleemainattackbonus", "rangedmainattackbonus", "grappleattackbonus", }
		local tFieldsDefense = { "dr", "ac", "spellresistance", "fortitude", "reflex", "will", };
		WindowManager.callSafeControlsSetLockMode(self, tFieldsTop, bReadOnly);
		WindowManager.callSafeControlsSetLockMode(self, tFieldsCombat, bReadOnly);
		WindowManager.callSafeControlsSetLockMode(self, tFieldsDefense, bReadOnly);
	end
end

function onLevelChanged()
	CharManager.calcLevel(getDatabaseNode());
end
function onSystemChanged()
	local bPFMode = DataCommon.isPFRPG();
	
	cmd.setVisible(bPFMode);
	label_cmd.setVisible(bPFMode);
	
	if label_grapple then
		if bPFMode then
			label_grapple.setValue(Interface.getString("cmb"));
		elseif minisheet then
			label_grapple.setValue(Interface.getString("grp"));
		else
			label_grapple.setValue(Interface.getString("grapple"));
		end
	end
	
	spot.setVisible(not bPFMode);
	label_spot.setVisible(not bPFMode);
	listen.setVisible(not bPFMode);
	label_listen.setVisible(not bPFMode);
	search.setVisible(not bPFMode);
	label_search.setVisible(not bPFMode);

	perception.setVisible(bPFMode);
	label_perception.setVisible(bPFMode);
end

function onHealthChanged()
	local sColor = ActorManager35E.getPCSheetWoundColor(getDatabaseNode());
	wounds.setColor(sColor);
	nonlethal.setColor(sColor);
end

function onDrop(x, y, draginfo)
	if draginfo.isType("shortcut") then
		local sClass, sRecord = draginfo.getShortcutData();
		if StringManager.contains({"referenceclass", "referencerace"}, sClass) then
			CharManager.addInfoDB(getDatabaseNode(), sClass, sRecord);
			return true;
		end
	end
end
