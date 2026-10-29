-- 
-- Please see the license.html file included with this distribution for 
-- attribution and copyright information.
--

	
function onInit()
	self.setInitialized();
	
	self.onCasterTypeChanged();
	self.toggleDetail();
	self.onDisplayChanged();

	self.onLockModeChanged(WindowManager.getWindowReadOnlyState(self));
end

function onLockModeChanged(bReadOnly)
	local tFields = { "castertype", "label", "cl", "points", "pointsused", "idelete", };
	WindowManager.callSafeControlsSetLockMode(self, tFields, bReadOnly);
	local tFieldsSlots = { "availablelevel0", "availablelevel1", "availablelevel2", "availablelevel3", "availablelevel4", "availablelevel5", "availablelevel6", "availablelevel7", "availablelevel8", "availablelevel9", };
	WindowManager.callSafeControlsSetLockMode(self, tFieldsSlots, bReadOnly);
	local tFieldsOther = { "dcmisc", "dcstat", "sp", "ccmisc", };
	WindowManager.callSafeControlsSetLockMode(self, tFieldsOther, bReadOnly);
end

local _bShow = true;
function setFilter(bValue)
	_bShow = bValue;
end
function getFilter()
	return _bShow;
end
local _bInitialized = false;
function isInitialized()
	return _bInitialized;
end
function setInitialized()
	_bInitialized = true;
end

function registerMenuItems()
	resetMenuItems();
	
	if DB.getValue(getDatabaseNode(), "castertype", "") == "" then
		registerMenuItem(Interface.getString("menu_resetspells"), "pointer_circle", 3);
	end
end

local bStatUpdateLock = false;
function onStatUpdate()
	if bStatUpdateLock then
		return;
	end
	bStatUpdateLock = true;

	if dcstatmod then
		local nodeSpellClass = getDatabaseNode();
		local nodeCreature = DB.getChild(nodeSpellClass, "...");

		local sAbility = DB.getValue(nodeSpellClass, "dc.ability", "");

		local rActor = ActorManager.resolveActor(nodeCreature);
		local nValue = ActorManager35E.getAbilityBonus(rActor, sAbility);
		
		dcstatmod.setValue(nValue);
	end
	
	for _, vLevel in pairs(levels.getWindows()) do
		for _, v in pairs(vLevel.spells.getWindows()) do
			if v.header.subwindow and v.header.subwindow.actionsmini then
				for _,v2 in pairs(v.header.subwindow.actionsmini.getWindows()) do
					v2.onDataChanged();
				end
			end
			if v.actions then
				for _,v2 in pairs(v.actions.getWindows()) do
					v2.onDataChanged();
				end
			end
		end
	end

	bStatUpdateLock = false;
end

function onMenuSelection(selection, subselection)
	if selection == 3 then
		local nodeCaster = DB.getChild(getDatabaseNode(), "...");
		SpellManager.resetPrepared(nodeCaster);
	end
end

function toggleDetail()
	if minisheet then
		return;
	end
	
	local status = (activatedetail.getValue() == 1);

	frame_levels.setVisible(status);
	WindowManager.setControlVisibleWithLabel(self, "availablelevel", status);
	WindowManager.setControlVisibleWithLabel(self, "availablelevel0", status);
	WindowManager.setControlVisibleWithLabel(self, "availablelevel1", status);
	WindowManager.setControlVisibleWithLabel(self, "availablelevel2", status);
	WindowManager.setControlVisibleWithLabel(self, "availablelevel3", status);
	WindowManager.setControlVisibleWithLabel(self, "availablelevel4", status);
	WindowManager.setControlVisibleWithLabel(self, "availablelevel5", status);
	WindowManager.setControlVisibleWithLabel(self, "availablelevel6", status);
	WindowManager.setControlVisibleWithLabel(self, "availablelevel7", status);
	WindowManager.setControlVisibleWithLabel(self, "availablelevel8", status);
	WindowManager.setControlVisibleWithLabel(self, "availablelevel9", status);
	
	frame_stat.setVisible(status);
	ability_label.setVisible(status);
	WindowManager.setControlVisibleWithLabel(self, "dcstat", status);
	
	frame_dc.setVisible(status);
	dc_label.setVisible(status);
	WindowManager.setControlVisibleWithLabel(self, "dcstatmod", status);
	WindowManager.setControlVisibleWithLabel(self, "dcmisc", status);
	WindowManager.setControlVisibleWithLabel(self, "dctotal", status);
	
	frame_sp.setVisible(status);
	spmain_label.setVisible(status);
	WindowManager.setControlVisibleWithLabel(self, "sp", status);
	
	frame_cc.setVisible(status);
	label_cc.setVisible(status);
	WindowManager.setControlVisibleWithLabel(self, "ccmisc", status);
end

function getSheetMode()
	if minisheet then
		return "combat";
	end
	
	return DB.getValue(getDatabaseNode(), "...spellmode", "");
end

function onCasterTypeChanged()
	local bShowPP = (DB.getValue(getDatabaseNode(), "castertype", "") == "points");
	pointsused.setVisible(bShowPP);
	label_pointsused.setVisible(bShowPP);
	points.setVisible(bShowPP);
	label_points.setVisible(bShowPP);
	
	self.onSpellCounterUpdate();
	
	self.registerMenuItems();
end

function onDisplayChanged()
	if minisheet then
		return;
	end
	
	for _,vLevel in pairs(levels.getWindows()) do
		for _,vSpell in pairs(vLevel.spells.getWindows()) do
			vSpell.onDisplayChanged();
		end
	end
end

function onSpellCounterUpdate()
	if not self.isInitialized() then
		return;
	end
	
	SpellManager.updateSpellClassCounts(getDatabaseNode());

	self.updateSpellView();
	
	self.performFilter();
end

function updateSpellView()
	local nodeSpellClass = getDatabaseNode();

	local bClassShow = false;
	local sSheetMode = self.getSheetMode();
	local bCombatMode = (sSheetMode == "combat");
	local sCasterType = DB.getValue(nodeSpellClass, "castertype", "");

	local bLevelShow, nodeLevel, nAvailable, nTotalCast, nTotalPrepared, nSpells;
	local bSpellShow, nodeSpell, nCast, nPrepared, nPointCost;

	local nPP = DB.getValue(nodeSpellClass, "points", 0);
	local nPPUsed = DB.getValue(nodeSpellClass, "pointsused", 0);
	
	local bPFMode = DataCommon.isPFRPG();
	
	for kLevel, vLevel in pairs(levels.getWindows()) do
		bLevelShow = false;

		nAvailable = 0;
		nodeLevel = vLevel.getDatabaseNode();
		if nodeLevel then
			nAvailable = DB.getValue(nodeSpellClass, "available" .. DB.getName(nodeLevel), 0);
		end
		
		nSpells = 0;
		nTotalCast = DB.getValue(nodeLevel, "totalcast", 0);
		nTotalPrepared = DB.getValue(nodeLevel, "totalprepared", 0);

		if bPFMode and nodeLevel and DB.getName(nodeLevel) == "level0" then
			for _,vSpell in pairs(vLevel.spells.getWindows()) do
				nodeSpell = vSpell.getDatabaseNode();
				nSpells = nSpells + 1;
				
				bSpellShow = true;
				nPrepared = DB.getValue(nodeSpell, "prepared", 0);
				
				if (sCasterType == "") and bCombatMode then
					if nPrepared == 0 then
						bSpellShow = false;
					end
				end
				bLevelShow = bLevelShow or bSpellShow;
				vSpell.setFilter(bSpellShow);
				
				if sCasterType == "" then
					if sSheetMode == "preparation" then
						vSpell.header.subwindow.usepower.setVisible(false);
						vSpell.header.subwindow.counter.setVisible(true);
						vSpell.header.subwindow.counter.update(sSheetMode, (sCasterType == "spontaneous"), nAvailable, 0);
						vSpell.header.subwindow.usespacer.setVisible(nAvailable == 0);
					else
						if (nPrepared > 0) then
							vSpell.header.subwindow.usepower.setVisible(true);
							vSpell.header.subwindow.usepower.setTooltipText(Interface.getString("spell_tooltip_castspell"));
							vSpell.header.subwindow.usespacer.setVisible(false);
						else
							vSpell.header.subwindow.usepower.setVisible(false);
							vSpell.header.subwindow.usespacer.setVisible(true);
						end
						vSpell.header.subwindow.counter.setVisible(false);
					end
				elseif sCasterType == "points" then
					vSpell.header.subwindow.usepower.setVisible(true);
					vSpell.header.subwindow.usepower.setTooltipText(Interface.getString("power_tooltip_use"));
					vSpell.header.subwindow.counter.setVisible(false);
					vSpell.header.subwindow.usespacer.setVisible(false);
				else
					vSpell.header.subwindow.usepower.setVisible(true);
					vSpell.header.subwindow.usepower.setTooltipText(Interface.getString("spell_tooltip_castspell"));
					vSpell.header.subwindow.counter.setVisible(false);
					vSpell.header.subwindow.usespacer.setVisible(false);
				end
				vSpell.header.subwindow.cost.setVisible(false);
			end
			
			if bCombatMode then
				bLevelShow = bLevelShow and (nAvailable > 0) and (nSpells > 0);
			else
				bLevelShow = (nAvailable > 0);
			end
			
		elseif sCasterType == "points" then
			for _,vSpell in pairs(vLevel.spells.getWindows()) do
				nodeSpell = vSpell.getDatabaseNode();
				nSpells = nSpells + 1;
				
				nPointCost = DB.getValue(nodeSpell, "cost", 0);
				
				if bCombatMode then
					bSpellShow = (nPointCost <= (nPP - nPPUsed));
				else
					bSpellShow = true;
				end
				vSpell.setFilter(bSpellShow);
				bLevelShow = bLevelShow or bSpellShow;

				vSpell.header.subwindow.usepower.setVisible(true);
				vSpell.header.subwindow.cost.setVisible(true);
				vSpell.header.subwindow.counter.setVisible(false);
				vSpell.header.subwindow.usespacer.setVisible(false);
			end
		
			if bCombatMode then
				bLevelShow = bLevelShow and (nAvailable > 0) and (nSpells > 0);
			else
				bLevelShow = (nAvailable > 0);
			end
		else
			-- Update spell counter objects and spell visibility
			for _,vSpell in pairs(vLevel.spells.getWindows()) do
				nodeSpell = vSpell.getDatabaseNode();
				nSpells = nSpells + 1;
				
				nCast = DB.getValue(nodeSpell, "cast", 0);
				nPrepared = DB.getValue(nodeSpell, "prepared", 0);
				
				if sCasterType == "spontaneous" or not bCombatMode then
					bSpellShow = true;
				else
					bSpellShow = (nCast < nPrepared);
				end
				bLevelShow = bLevelShow or bSpellShow;
				vSpell.setFilter(bSpellShow);

				vSpell.header.subwindow.usepower.setVisible(false);
				vSpell.header.subwindow.cost.setVisible(false);
				vSpell.header.subwindow.counter.setVisible(true);
				vSpell.header.subwindow.counter.update(sSheetMode, (sCasterType == "spontaneous"), nAvailable, nTotalCast);
				if (sSheetMode == "preparation" or sCasterType == "spontaneous") then
					vSpell.header.subwindow.usespacer.setVisible(nAvailable == 0);
				else
					vSpell.header.subwindow.usespacer.setVisible(nPrepared == 0);
				end
			end
			
			-- Determine level visibility
			if bCombatMode then
				bLevelShow = bLevelShow and (nTotalCast < nAvailable) and (nAvailable > 0) and (nSpells > 0);
			else
				bLevelShow = (nAvailable > 0);
			end
		end
		bClassShow = bClassShow or bLevelShow;
		vLevel.setFilter(bLevelShow);

		if not minisheet then
			-- Set level statistics label
			local sStats = "";
			if bPFMode and nodeLevel and DB.getName(nodeLevel) == "level0" then
				if sCasterType == "" then
					sStats = "Prepared:  " .. nTotalPrepared .. " / " .. nAvailable;
				end
			elseif (sCasterType ~= "points") and (nAvailable > 0) and (nSpells > 0) then
				if (sCasterType == "spontaneous") then
					sStats = "Cast:  " .. nTotalCast .. " / " .. nAvailable;
				else
					sStats = "Cast:  " .. nTotalCast .. " / " .. nTotalPrepared;
					if nTotalPrepared < nAvailable then
						sStats = sStats .. "    Prepared:  " .. nTotalPrepared .. " / " .. nAvailable;
					end
				end
			end
			vLevel.stats.setValue(sStats);
		end
	end
	
	if bCombatMode then
		self.setFilter(bClassShow);
	else
		self.setFilter(true);
	end
end

function performFilter()
	for _,vLevel in pairs(levels.getWindows()) do
		vLevel.spells.applyFilter();
	end
	levels.applyFilter();

	windowlist.applyFilter();
end

function showSpellsForLevel(nLevel)
	for _,vWin in pairs(levels.getWindows()) do
		if DB.getValue(vWin.getDatabaseNode(), "level") == nLevel then
			vWin.spells.setVisible(true);
			break;
		end
	end
end
