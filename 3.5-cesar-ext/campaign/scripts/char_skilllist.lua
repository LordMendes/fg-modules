-- 
-- Please see the license.html file included with this distribution for 
-- attribution and copyright information.
--

function onInit()
	self.constructDefaultSkills();
	CharManager.updateSkillPoints(window.getDatabaseNode());

	local nodeChar = DB.getParent(getDatabaseNode());
	DB.addHandler(DB.getPath(nodeChar, "abilities"), "onChildUpdate", onStatUpdate);
	
	DB.addHandler(DB.getPath(nodeChar, "skilllist"), "onChildAdded", onSkillDataUpdate);
	DB.addHandler(DB.getPath(nodeChar, "skilllist"), "onChildDeleted", onSkillDataUpdate);
end
function onClose()
	local nodeChar = DB.getParent(getDatabaseNode());
	DB.removeHandler(DB.getPath(nodeChar, "abilities"), "onChildUpdate", onStatUpdate);
	
	DB.removeHandler(DB.getPath(nodeChar, "skilllist"), "onChildAdded", onSkillDataUpdate);
	DB.removeHandler(DB.getPath(nodeChar, "skilllist"), "onChildDeleted", onSkillDataUpdate);
end

function onSkillDataUpdate()
	CharManager.updateSkillPoints(window.getDatabaseNode());
end

function onStatUpdate()
	for _,w in pairs(getWindows()) do
		w.onStatUpdate();
	end
end

function addEntry(bFocus)
	local w = createWindow(nil, true);
	w.setCustom(true);
	return w;
end

-- Create default skill selection
function constructDefaultSkills()
	local aSystemSkills = DataCommon.skilldata;
	
	-- Create missing entries for all known skills
	local entrymap = {};
	for _,w in pairs(getWindows()) do
		local sLabel = w.label.getValue();
	
		local t = aSystemSkills[sLabel];
		if t and not t.sublabeling then
			if not entrymap[sLabel] then
				entrymap[sLabel] = { w };
			else
				table.insert(entrymap[sLabel], w);
			end
		end
	end

	-- Set properties and create missing entries for all known skills
	for k, t in pairs(DataCommon.skilldata) do
		if not t.sublabeling then
			local matches = entrymap[k];
			
			if not matches then
				local w = createWindow();
				if w then
					w.label.setValue(k);
					if t.stat then
						w.statname.setValue(t.stat);
					else
						w.statname.setValue("");
					end
					if t.trainedonly then
						w.showonminisheet.setValue(0);
					end
					matches = { w };
				end
			end
		end
	end

	-- Fold old 3.5 skill rows into the merged Cesar skills.
	local tAlias = DataCommon.skillalias or {};
	local tByLabel = {};
	for _,w in pairs(getWindows()) do
		local sLabel = w.label.getValue();
		if DataCommon.skilldata[sLabel] and not tByLabel[sLabel] then
			tByLabel[sLabel] = w;
		end
	end
	local tDelete = {};
	for _,w in pairs(getWindows()) do
		local sLabel = w.label.getValue();
		local sNew = tAlias[sLabel];
		if sNew then
			local wNew = tByLabel[sNew];
			if wNew and wNew ~= w then
				local nodeOld = w.getDatabaseNode();
				local nodeNew = wNew.getDatabaseNode();
				local nRanks = DB.getValue(nodeOld, "ranks", 0);
				if nRanks > DB.getValue(nodeNew, "ranks", 0) then
					DB.setValue(nodeNew, "ranks", "number", nRanks);
				end
				if DB.getValue(nodeOld, "state", 0) == 1 then
					DB.setValue(nodeNew, "state", "number", 1);
				end
				local nMisc = DB.getValue(nodeOld, "misc", 0);
				if nMisc ~= 0 then
					DB.setValue(nodeNew, "misc", "number", DB.getValue(nodeNew, "misc", 0) + nMisc);
				end
				table.insert(tDelete, nodeOld);
			elseif not wNew then
				w.label.setValue(sNew);
				local tSkill = DataCommon.skilldata[sNew];
				if tSkill and tSkill.stat then
					w.statname.setValue(tSkill.stat);
				end
				tByLabel[sNew] = w;
			end
		end
	end
	for _, nodeOld in ipairs(tDelete) do
		DB.deleteNode(nodeOld);
	end

	CharManager.syncMappedClassSkills(DB.getParent(getDatabaseNode()));

	-- Set properties for all skills
	for _,w in pairs(getWindows()) do
		w.updateWindow();
	end
end

function addNewInstance(sLabel)
	local rSkill = DataCommon.skilldata[sLabel];
	if rSkill and rSkill.sublabeling then
		local w = createWindow();
		w.label.setValue(sLabel);
		w.statname.setValue(rSkill.stat);
		w.updateWindow();
		w.sublabel.setFocus();
	end
end
