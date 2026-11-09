-- 
-- Please see the license.html file included with this distribution for 
-- attribution and copyright information.
--

local function forEachList(fn)
	local nodeChar = getDatabaseNode();
	if CesarRules.migrateDamageReductionLists then
		CesarRules.migrateDamageReductionLists(nodeChar);
	end
	fn(DB.getPath(nodeChar, "damagereduction.drlist"));
	fn(DB.getPath(nodeChar, "damagereduction.resistlist"));
end

function onInit()
	forEachList(function(sPath)
		DB.addHandler(sPath, "onChildAdded", onListChanged);
		DB.addHandler(sPath, "onChildDeleted", onListChanged);
		DB.addHandler(sPath, "onChildUpdate", onListChanged);
	end);
	onListChanged();
end

function onClose()
	forEachList(function(sPath)
		DB.removeHandler(sPath, "onChildAdded", onListChanged);
		DB.removeHandler(sPath, "onChildDeleted", onListChanged);
		DB.removeHandler(sPath, "onChildUpdate", onListChanged);
	end);
end

function onListChanged()
	CesarRules.refreshDamageReductionSummary(getDatabaseNode());
end
