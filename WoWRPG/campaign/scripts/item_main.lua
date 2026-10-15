-- 
-- Please see the license.html file included with this distribution for 
-- attribution and copyright information.
--

function onInit()
	self.onStateChanged();
end

function onLockModeChanged()
	self.onStateChanged();
end
function onIDModeChanged()
	self.onStateChanged();
end

function onStateChanged()
	local nodeRecord = getDatabaseNode();
	local bReadOnly = WindowManager.getReadOnlyState(nodeRecord);
	local bID = RecordDataManager.getIDState("item", nodeRecord);

	local sType = type.getValue();
	local bWeapon = (sType == "Weapon");
	local bArmor = (sType == "Armor");
	
	local tTypeFields = { "type", "subtype", };
	WindowManager.callSafeControlsUpdate(self, tTypeFields, bReadOnly, not bID);
	divider2.setVisible(WindowManager.getAnyControlVisible(self, tTypeFields));

	local tBasicFields = { "cost", "weight", };
	WindowManager.callSafeControlsUpdate(self, tBasicFields, bReadOnly, not bID);
	divider3.setVisible(WindowManager.getAnyControlVisible(self, tBasicFields));
	
	if bID and bWeapon then
		type_stats.setValue("item_main_weapon", nodeRecord);
	elseif bID and bArmor then
		type_stats.setValue("item_main_armor", nodeRecord);
	else
		type_stats.setValue("", "");
	end
	type_stats.setVisible(not type_stats.isEmpty());
	divider4.setVisible(WindowManager.getAnyControlVisible(self, { "type_stats", }));

	local tMagicFields = { "aura", "cl", "prerequisites", };
	WindowManager.callSafeControlsUpdate(self, tMagicFields, bReadOnly, not bID);
	divider5.setVisible(WindowManager.getAnyControlVisible(self, tMagicFields));
	
	WindowManager.callSafeControlsUpdate(self, { "description", }, bReadOnly, not bID);

	WindowManager.callSafeControlUpdate(self, "sub_pack", bReadOnly, bID);
end
