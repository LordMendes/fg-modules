-- 
-- Please see the license.html file included with this distribution for 
-- attribution and copyright information.
--

function onInit()
	ItemManager.isArmor = isArmor;
	ItemManager.isShield = isShield;
	ItemManager.isWeapon = isWeapon;

	ItemManager.registerCleanupTransferHandler(handleItemCleanupOnTransfer);
end

function isArmor(nodeItem)
	local sTypeLower = StringManager.trim(DB.getValue(nodeItem, "type", "")):lower();
	if StringManager.contains({"armor", "shield", "shields"}, sTypeLower) then
		return true;
	end

	return false;
end

function isShield(nodeItem)
	local sTypeLower = StringManager.trim(DB.getValue(nodeItem, "type", "")):lower();
	if StringManager.contains({"shield", "shields"}, sTypeLower) then
		return true;
	end

	local sSubtypeLower = StringManager.trim(DB.getValue(nodeItem, "subtype", "")):lower();
	if StringManager.contains({"shield", "shields"}, sSubtypeLower) then
		return true;
	end
	
	return false;
end

function isWeapon(nodeItem)
	local sTypeLower = StringManager.trim(DB.getValue(nodeItem, "type", "")):lower();
	local sSubtypeLower = StringManager.trim(DB.getValue(nodeItem, "subtype", "")):lower();

	if ((sTypeLower == "weapon") and (sSubtypeLower ~= "ammunition")) then
		return true;
	end
	if (sSubtypeLower == "weapon") then
		return true;
	end

	return false;
end

function handleItemCleanupOnTransfer(rSourceItem, rTempItem, rTargetItem)
	if rSourceItem.sClass ~= "item" then
		DB.setValue(rTempItem.node, "isidentified", "number", 1);
	end
end
