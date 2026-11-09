-- 
-- Please see the license.html file included with this distribution for 
-- attribution and copyright information.
--

function onInit()
	self.onLockModeChanged(WindowManager.getWindowReadOnlyState(self));
	self.updateAbility();

	local node = getDatabaseNode();
	for _,v in pairs(DataCommon.abilities) do
		DB.addHandler(DB.getPath(node, v), "onUpdate", updateAbility);
	end

	local node = getDatabaseNode();
	DB.addHandler(DB.getPath(node, "spellset"), "onChildUpdate", updateAbility);
end
function onClose()
	local node = getDatabaseNode();
	for _,v in pairs(DataCommon.abilities) do
		DB.removeHandler(DB.getPath(node, v), "onUpdate", updateAbility);
	end

	local node = getDatabaseNode();
	DB.removeHandler(DB.getPath(node, "spellset"), "onChildUpdate", updateAbility);
end

function onLockModeChanged(bReadOnly)
	local bReadOnly = WindowManager.getReadOnlyState(getDatabaseNode());
	WindowManager.callSafeControlsSetVisible(self, { "spellclass_iadd", }, not bReadOnly);
end

function updateAbility()
	for _,v in pairs(spellclasslist.getWindows()) do
		v.onStatUpdate();
	end
end
function onModeChanged()
	for _,vClass in pairs(spellclasslist.getWindows()) do
		vClass.onSpellCounterUpdate();
	end
end

function addSpellClass()
	local w = spellclasslist.createWindow();
	if w then
		w.activatedetail.setValue(1);
		w.label.setFocus();
		DB.setValue(getDatabaseNode(), "spellmode", "string", "");
	end
end
function onSpellDrop(x, y, draginfo)
	if draginfo.isType("spellmove") then
		ChatManager.Message(Interface.getString("spell_error_dropclassmissing"));
		return true;
	elseif draginfo.isType("spelldescwithlevel") then
		ChatManager.Message(Interface.getString("spell_error_dropclassmissing"));
		return true;
	elseif draginfo.isType("shortcut") then
		local sClass = draginfo.getShortcutData();
		
		if sClass == "spelldesc" or sClass == "spelldesc2" then
			ChatManager.Message(Interface.getString("spell_error_dropclasslevelmissing"));
			return true;
		end
	end
end

-- DEPRECATED (2025-03)
function update()
	self.onLockModeChanged(WindowManager.getWindowReadOnlyState(self));
end
