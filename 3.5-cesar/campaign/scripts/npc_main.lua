-- 
-- Please see the license.html file included with this distribution for 
-- attribution and copyright information.
--

function onInit()
	self.update();
end

function update()
	local nodeRecord = getDatabaseNode();
	local bReadOnly = WindowManager.getReadOnlyState(nodeRecord);
	local bID = LibraryData.getIDState("npc", nodeRecord);

	-- Update labels based on system being played and NPC type
	local bPFMode = DataCommon.isPFRPG();
	local sType = DB.getValue(nodeRecord, "npctype", "");
	if babgrp_label then
		if sType == "Vehicle" then
			babgrp_label.setValue(Interface.getString("npc_label_cm"));
			if bPFMode then
				WindowManager.callSafeControlUpdate(self, "babgrp", bReadOnly);
			else
				WindowManager.callSafeControlUpdate(self, "babgrp", bReadOnly, true);
			end
		else
			if bPFMode then
				babgrp_label.setValue(Interface.getString("npc_label_babcm"));
			else
				babgrp_label.setValue(Interface.getString("npc_label_babgrp"));
			end
		end
	end

	WindowManager.callSafeControlUpdate(self, "type", bReadOnly);
	if bPFMode then
		WindowManager.callSafeControlUpdate(self, "alignment", bReadOnly, true);
	else
		WindowManager.callSafeControlUpdate(self, "alignment", bReadOnly);
	end
	if bPFMode then
		WindowManager.callSafeControlUpdate(self, "senses", bReadOnly);
		WindowManager.callSafeControlUpdate(self, "aura", bReadOnly);
	else
		WindowManager.callSafeControlUpdate(self, "senses", bReadOnly, true);
		WindowManager.callSafeControlUpdate(self, "aura", bReadOnly, true);
	end
	
	WindowManager.callSafeControlUpdate(self, "ac", bReadOnly);
	WindowManager.callSafeControlUpdate(self, "hd", bReadOnly);
	WindowManager.callSafeControlUpdate(self, "specialqualities", bReadOnly);
	
	WindowManager.callSafeControlUpdate(self, "speed", bReadOnly);
	WindowManager.callSafeControlUpdate(self, "atk", bReadOnly);
	WindowManager.callSafeControlUpdate(self, "fullatk", bReadOnly);
	WindowManager.callSafeControlUpdate(self, "spacereach", bReadOnly);
	WindowManager.callSafeControlUpdate(self, "specialattacks", bReadOnly);
	
	WindowManager.callSafeControlUpdate(self, "babgrp", bReadOnly);
	WindowManager.callSafeControlUpdate(self, "feats", bReadOnly);
	WindowManager.callSafeControlUpdate(self, "skills", bReadOnly);
	WindowManager.callSafeControlUpdate(self, "languages", bReadOnly);
	WindowManager.callSafeControlUpdate(self, "advancement", bReadOnly);
	WindowManager.callSafeControlUpdate(self, "leveladjustment", bReadOnly);

	WindowManager.callSafeControlUpdate(self, "environment", bReadOnly);
	WindowManager.callSafeControlUpdate(self, "organization", bReadOnly);
	WindowManager.callSafeControlUpdate(self, "treasure", bReadOnly);
	
	-- Trap
	WindowManager.callSafeControlUpdate(self, "trigger", bReadOnly);
	WindowManager.callSafeControlUpdate(self, "reset", bReadOnly);

	-- Vehicle
	WindowManager.callSafeControlUpdate(self, "squares", bReadOnly);
	WindowManager.callSafeControlUpdate(self, "basesave", bReadOnly);
	
	WindowManager.callSafeControlUpdate(self, "prop", bReadOnly);
	WindowManager.callSafeControlUpdate(self, "drive", bReadOnly);
	WindowManager.callSafeControlUpdate(self, "ff", bReadOnly);
	WindowManager.callSafeControlUpdate(self, "drived", bReadOnly);
	WindowManager.callSafeControlUpdate(self, "drives", bReadOnly);
	WindowManager.callSafeControlUpdate(self, "crew", bReadOnly);
	WindowManager.callSafeControlUpdate(self, "decks", bReadOnly);
	WindowManager.callSafeControlUpdate(self, "weapons", bReadOnly);
end
