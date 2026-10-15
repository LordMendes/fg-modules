-- 
-- Please see the license.html file included with this distribution for 
-- attribution and copyright information.
--

function onInit()
	self.onCheckPenaltyChange();
	self.onStatUpdate();

	self.onLockModeChanged(WindowManager.getWindowReadOnlyState(self));
end

function onLockModeChanged(bReadOnly)
	local tFields = { "state", "sublabel", "ranks", "statname", "misc", };
	WindowManager.callSafeControlsSetLockMode(self, tFields, bReadOnly);
	if self.isCustom() then
		label.setReadOnly(bReadOnly);
	end

	local bAllowDelete = self.isCustom();
	if not bAllowDelete then
		local sLabel = label.getValue();
		local rSkill = DataCommon.skilldata[sLabel];
		if rSkill and rSkill.sublabeling then
			bAllowDelete = true;
		end
	end
	
	if bAllowDelete then
		idelete_spacer.setVisible(false);
		idelete.setVisible(not bReadOnly);
	else
		idelete_spacer.setVisible(not bReadOnly);
		idelete.setVisible(false);
	end
end

function updateWindow()
	local sLabel = label.getValue();
	local t = DataCommon.skilldata[sLabel];
	if t then
		self.setCustom(false);
		
		if t.sublabeling then
			sublabel.setVisible(true);
		end

		if t.armorcheckmultiplier then
			armorcheckmultiplier.setValue(t.armorcheckmultiplier);
		else
			armorcheckmultiplier.setValue(0);
		end
	else
		self.setCustom(true);
	end
end

function onSystemChanged(bPFMode)
	total.onSourceUpdate();
end

function onCheckPenaltyChange()
	if armorcheckmultiplier.getValue() ~= 0 then
		armorwidget.setIcon("char_armorcheck");
	else
		armorwidget.setIcon(nil);
	end
end

function onStatUpdate()
	stat.update(statname.getValue());
end

-- This function is called to set the entry to non-custom or custom.
-- Custom entries have configurable stats and editable labels.
local _bCustom = true;
function setCustom(state)
	_bCustom = state;
	
	if _bCustom then
		label.setEnabled(true);
		label.setLine(true);
	else
		label.setEnabled(false);
		label.setLine(false);
	end
	self.onLockModeChanged(WindowManager.getWindowReadOnlyState(self));
end
function isCustom()
	return _bCustom;
end
