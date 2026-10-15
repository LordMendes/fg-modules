-- 
-- Please see the license.html file included with this distribution for 
-- attribution and copyright information.
--

function onInit()
	self.setInitialized();
	
	acstat.onValueChanged();
	acstat2.onValueChanged();
	cmdbase.onValueChanged();
	cmdstat.onValueChanged();
	fortitudestat.onValueChanged();
	reflexstat.onValueChanged();
	willstat.onValueChanged();
	initiativestat.onValueChanged();
	meleestat.onValueChanged();
	rangedstat.onValueChanged();
	grapplestat.onValueChanged();

	self.onSystemChanged();
	self.onLockModeChanged(WindowManager.getWindowReadOnlyState(self));
end

local _bInitialized = false;
function isInitialized()
	return _bInitialized;
end
function setInitialized()
	_bInitialized = true;
end

function onLockModeChanged(bReadOnly)
	local tFieldsAC = { "ac", "acarmor", "acshield", "acstat", "acstat2", "acsize", "acnatural", "acdeflection", "acdodge", "acmisc", };
	local tFieldsACSpecial = { "ffacmisc", "touchacmisc", "cmdbase", "cmdstat", "cmdmisc", };
	local tFieldsSaveFort = { "fortitude", "fortitudebase", "fortitudestat", "fortitudemisc", };
	local tFieldsSaveRef = { "reflex", "reflexbase", "reflexstat", "reflexmisc", };
	local tFieldsSaveWill = { "will", "willbase", "willstat", "willmisc", };
	local tFieldsAttack = { "baseattackbonus", };
	local tFieldsAttackMelee = { "meleeattackbonus", "meleestat", "meleesize", "meleemisc", };
	local tFieldsAttackRanged = { "rangedattackbonus", "rangedstat", "rangedsize", "rangedmisc", };
	local tFieldsAttackGrapple = { "grappleattackbonus", "grapplestat", "grapplesize", "grapplemisc", };
	local tFieldsInit = { "initiative", "initiativestat", "initiativemiscbonus", };
	local tFieldsOther = { "srfinal", "srbase", "srmisc", "speedfinal", "speedbase", "speedarmor", "speedmisc", };

	WindowManager.callSafeControlsSetLockMode(self, tFieldsAC, bReadOnly);
	WindowManager.callSafeControlsSetLockMode(self, tFieldsACSpecial, bReadOnly);
	WindowManager.callSafeControlsSetLockMode(self, tFieldsSaveFort, bReadOnly);
	WindowManager.callSafeControlsSetLockMode(self, tFieldsSaveRef, bReadOnly);
	WindowManager.callSafeControlsSetLockMode(self, tFieldsSaveWill, bReadOnly);
	WindowManager.callSafeControlsSetLockMode(self, tFieldsAttack, bReadOnly);
	WindowManager.callSafeControlsSetLockMode(self, tFieldsAttackMelee, bReadOnly);
	WindowManager.callSafeControlsSetLockMode(self, tFieldsAttackRanged, bReadOnly);
	WindowManager.callSafeControlsSetLockMode(self, tFieldsAttackGrapple, bReadOnly);
	WindowManager.callSafeControlsSetLockMode(self, tFieldsInit, bReadOnly);
	WindowManager.callSafeControlsSetLockMode(self, tFieldsOther, bReadOnly);
end

function onSystemChanged()
	local bPFMode = DataCommon.isPFRPG();
	
	line_cmd.setVisible(bPFMode);
	
	cmd.setVisible(bPFMode);
	label_cmd.setVisible(bPFMode);
	cmdacarmor.setVisible(bPFMode);
	cmdacshield.setVisible(bPFMode);
	cmdacstatmod.setVisible(bPFMode);
	cmdacsize.setVisible(bPFMode);
	cmdacnatural.setVisible(bPFMode);
	cmdacdeflection.setVisible(bPFMode);
	cmdacdodge.setVisible(bPFMode);
	cmdmisc.setVisible(bPFMode);
	
	cmdstat.setVisible(bPFMode);
	cmdstatmod.setVisible(bPFMode);
	cmdbase.setVisible(bPFMode);
	cmdbasemod.setVisible(bPFMode);
	
	if bPFMode then
		acframe.setAnchoredHeight(210);
		label_grapple.setValue(Interface.getString("cmb"));
	else
		acframe.setAnchoredHeight(140);
		label_grapple.setValue(Interface.getString("grapple"));
	end
end
