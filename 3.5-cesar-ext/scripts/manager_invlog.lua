--
-- Please see the license.html file included with this distribution for
-- attribution and copyright information.
--

local OOB_MSGTYPE_INVLOG = "cesar_invlog";
local _tCache = {};
local _tIgnoreDelete = {};
local _tPending = nil;

local function itemName(nodeItem, sFallback)
	local sName = "";
	if nodeItem then
		sName = DB.getValue(nodeItem, "name", "");
		if sName == "" then
			sName = DB.getValue(nodeItem, "nonid_name", "");
		end
	end
	if sName == "" then
		sName = sFallback or "";
	end
	return sName;
end

local function holderFromOwner(nodeOwner, sType)
	if sType == "partysheet" then
		return "party sheet", "partysheet";
	end
	if not nodeOwner then
		return nil, nil;
	end
	if sType == "item" or sType == "string" or sType == "temp" or sType == "" then
		return nil, nil;
	end
	local sName = DB.getValue(nodeOwner, "name", "");
	if sName == "" then
		if sType == "treasureparcel" then
			sName = "Parcel";
		else
			sName = "Character";
		end
	end
	return sName, DB.getPath(nodeOwner);
end

local function holderFromItem(nodeItem, sType)
	if sType == "partysheet" then
		return "party sheet", "partysheet";
	end
	if not nodeItem or sType == "item" or sType == "string" or sType == "temp" or sType == "" then
		return nil, nil;
	end
	return holderFromOwner(DB.getChild(nodeItem, "..."), sType);
end

local function holderFromList(nodeList, sType)
	if sType == "partysheet" then
		return "party sheet", "partysheet";
	end
	if not nodeList then
		return nil, nil;
	end
	return holderFromOwner(DB.getParent(nodeList), sType);
end

local function willDeleteSource(rSourceItem, rTargetItem, nMove)
	if not rSourceItem or not rSourceItem.node or not rTargetItem then
		return false;
	end
	local nHave = DB.getValue(rSourceItem.node, "count", 0);
	if nHave > nMove then
		return false;
	end
	local bSource = ItemManager.doesRecordTypeAllowInventoryTransfer(rSourceItem.sType);
	local bTarget = ItemManager.doesRecordTypeAllowInventoryTransfer(rTargetItem.sType);
	if bSource and (bTarget or rTargetItem.sType == "partysheet") then
		return true;
	end
	if (rSourceItem.sType == "partysheet") and bTarget then
		return true;
	end
	return false;
end

local function transfersFullCount(rSourceItem, rTargetItem)
	if not rSourceItem or not rTargetItem or rTargetItem.sType == "item" then
		return false;
	end
	if rSourceItem.sType == "treasureparcel" then
		return ItemManager.doesRecordTypeHaveInventory(rTargetItem.sType) or (rTargetItem.sType == "partysheet");
	elseif rSourceItem.sType == "partysheet" then
		if rTargetItem.sType == "treasureparcel" then
			return true;
		end
		if ItemManager.doesRecordTypeHaveInventory(rTargetItem.sType) then
			return rSourceItem.bTransferAll == true;
		end
	elseif rSourceItem.sType == "temp" then
		return ItemManager.doesRecordTypeHaveInventory(rTargetItem.sType) or (rTargetItem.sType == "partysheet");
	elseif ItemManager.doesRecordTypeHaveInventory(rSourceItem.sType) then
		if ItemManager.doesRecordTypeHaveInventory(rTargetItem.sType) or (rTargetItem.sType == "partysheet") then
			return rSourceItem.bTransferAll == true;
		end
	end
	return false;
end

local function report(sMsg)
	if not sMsg or sMsg == "" then
		return;
	end
	if Session.IsHost then
		ChatManager.sendMessage(sMsg, { bSecret = true, sIcon = "coins" });
	else
		Comm.deliverOOBMessage({ type = OOB_MSGTYPE_INVLOG, sMsg = sMsg }, "");
	end
end

local function handleLogOOB(msgOOB)
	if Session.IsHost and msgOOB and ((msgOOB.sMsg or "") ~= "") then
		ChatManager.sendMessage(msgOOB.sMsg, { bSecret = true, sIcon = "coins" });
	end
end

local function remember(nodeItem)
	if not nodeItem or not Session.IsHost then
		return;
	end
	local sPath = DB.getPath(nodeItem);
	if sPath == "" then
		return;
	end
	local sType = ItemManager.getItemSourceType(nodeItem);
	if sType == "" then
		sType = ItemManager.getItemSourceType(DB.getChild(nodeItem, "..."));
	end
	local sHolder = holderFromItem(nodeItem, sType);
	local nCount = DB.getValue(nodeItem, "count", 1);
	if nCount < 1 then
		nCount = 1;
	end
	_tCache[sPath] = {
		sName = itemName(nodeItem),
		sHolder = sHolder or "",
		nCount = nCount,
	};
end

local function nodePath(vNode)
	if type(vNode) == "databasenode" then
		return DB.getPath(vNode);
	end
	if type(vNode) == "string" then
		return vNode;
	end
	return "";
end

function onPreTransfer(rSourceItem, rTargetItem)
	_tPending = nil;
	if not rSourceItem or not rTargetItem or rTargetItem.sType == "item" then
		return;
	end

	local sItem = itemName(rSourceItem.node, rSourceItem.sValue);
	local sSrcHolder, sSrcKey = holderFromItem(rSourceItem.node, rSourceItem.sType);
	local sDstHolder, sDstKey = holderFromList(rTargetItem.nodeList, rTargetItem.sType);
	local nCount = 1;
	if rSourceItem.node and transfersFullCount(rSourceItem, rTargetItem) then
		nCount = DB.getValue(rSourceItem.node, "count", 1);
	elseif rSourceItem.nTransferCount and rSourceItem.nTransferCount > 0 then
		nCount = rSourceItem.nTransferCount;
	end
	if nCount < 1 then
		nCount = 1;
	end

	if Session.IsHost and rSourceItem.node and willDeleteSource(rSourceItem, rTargetItem, nCount) then
		local sPath = DB.getPath(rSourceItem.node);
		if sPath ~= "" then
			_tIgnoreDelete[sPath] = true;
		end
	end

	_tPending = {
		sItem = sItem,
		nCount = nCount,
		sSrcHolder = sSrcHolder,
		sSrcKey = sSrcKey,
		sDstHolder = sDstHolder,
		sDstKey = sDstKey,
	};
end

function onPostTransfer(rSourceItem, rTargetItem)
	local tPending = _tPending;
	_tPending = nil;
	if not tPending then
		return;
	end
	if rTargetItem and rTargetItem.node then
		local sHolder, sKey = holderFromItem(rTargetItem.node, rTargetItem.sType);
		if sHolder then
			tPending.sDstHolder = sHolder;
			tPending.sDstKey = sKey;
		end
		if tPending.sItem == "" then
			tPending.sItem = itemName(rTargetItem.node);
		end
		if rSourceItem and rSourceItem.nFinalTransferCount and rSourceItem.nFinalTransferCount > 0 then
			tPending.nCount = rSourceItem.nFinalTransferCount;
		end
	end
	if tPending.sItem == "" or not tPending.sDstHolder then
		return;
	end
	if tPending.sSrcHolder and tPending.sSrcKey == tPending.sDstKey then
		return;
	end

	local sCount = "";
	if tPending.nCount > 1 then
		sCount = " (" .. tPending.nCount .. "x)";
	end
	if tPending.sSrcHolder then
		report(string.format("[MOVE] %s -> %s: %s%s", tPending.sSrcHolder, tPending.sDstHolder, tPending.sItem, sCount));
	else
		report(string.format("[ADD] %s: %s%s", tPending.sDstHolder, tPending.sItem, sCount));
	end
end

function onChildAdded(nodeParent, nodeChild)
	if type(nodeChild) == "databasenode" then
		remember(nodeChild);
	end
end

function onFieldUpdated(nodeField)
	remember(DB.getParent(nodeField));
end

function onChildDeleted(nodeParent, nodeChild)
	local sPath = nodePath(nodeChild);
	if sPath ~= "" and _tIgnoreDelete[sPath] then
		_tIgnoreDelete[sPath] = nil;
		_tCache[sPath] = nil;
		return;
	end

	local sName = "";
	local sHolder = "";
	local nCount = 1;
	local tCached = _tCache[sPath];
	if tCached then
		sName = tCached.sName or "";
		sHolder = tCached.sHolder or "";
		nCount = tCached.nCount or 1;
	end
	if sName == "" and type(nodeChild) == "databasenode" then
		sName = itemName(nodeChild);
		local sType = ItemManager.getItemSourceType(nodeChild);
		sHolder = holderFromItem(nodeChild, sType) or sHolder;
	end
	if sPath ~= "" then
		_tCache[sPath] = nil;
	end
	if sName == "" then
		return;
	end
	if sHolder == "" then
		sHolder = "inventory";
	end
	local sCount = "";
	if nCount > 1 then
		sCount = " (" .. nCount .. "x)";
	end
	report(string.format("[DELETE] %s: %s%s", sHolder, sName, sCount));
end

local function watchList(sListPath)
	DB.addHandler(sListPath, "onChildAdded", onChildAdded);
	DB.addHandler(sListPath, "onChildDeleted", onChildDeleted);
	DB.addHandler(sListPath .. ".*.name", "onUpdate", onFieldUpdated);
	DB.addHandler(sListPath .. ".*.count", "onUpdate", onFieldUpdated);
end

local function seedContainers()
	for _, sRecordType in ipairs(RecordDataManager.getRecordTypes()) do
		if ItemManager.doesRecordTypeHaveInventory(sRecordType) then
			local tLists = ItemManager.getInventoryPaths(sRecordType) or {};
			for _, sRoot in ipairs(RecordDataManager.getDataPaths(sRecordType) or {}) do
				for _, nodeRecord in ipairs(DB.getChildList(sRoot)) do
					for _, sList in ipairs(tLists) do
						for _, nodeItem in ipairs(DB.getChildList(nodeRecord, sList)) do
							remember(nodeItem);
						end
					end
				end
			end
		end
	end
	for _, nodeItem in ipairs(DB.getChildList("partysheet.treasureparcelitemlist")) do
		remember(nodeItem);
	end
	for _, nodeParcel in ipairs(DB.getChildList("treasureparcels")) do
		for _, nodeItem in ipairs(DB.getChildList(nodeParcel, "itemlist")) do
			remember(nodeItem);
		end
	end
end

function onInit()
	OOBManager.registerOOBMsgHandler(OOB_MSGTYPE_INVLOG, handleLogOOB);
	ItemManager.registerPreTransferHandler(onPreTransfer);
	ItemManager.registerPostTransferHandler(onPostTransfer);

	if not Session.IsHost then
		return;
	end

	for _, sRecordType in ipairs(RecordDataManager.getRecordTypes()) do
		if ItemManager.doesRecordTypeHaveInventory(sRecordType) then
			local tLists = ItemManager.getInventoryPaths(sRecordType) or {};
			for _, sRoot in ipairs(RecordDataManager.getDataPaths(sRecordType) or {}) do
				for _, sList in ipairs(tLists) do
					watchList(string.format("%s.*.%s", sRoot, sList));
				end
			end
		end
	end
	watchList("partysheet.treasureparcelitemlist");
	watchList("treasureparcels.*.itemlist");
	seedContainers();
end
