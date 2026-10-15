-- 
-- Please see the license.html file included with this distribution for 
-- attribution and copyright information.
--

local bCounting = false;
function onListChanged()
	if not bCounting then
		bCounting = true;
		WindowManager.callOuterWindowFunction(window, "onSpellCounterUpdate");
		bCounting = false;
	end
end

function addEntry(bFocus)
	local w = createWindow();
	
	-- Set the default points value
	local nodeParent = DB.getParent(getDatabaseNode());
	if nodeParent then
		local nCost = tonumber(string.sub(DB.getName(nodeParent), -1)) or 0;
		if nCost > 0 then
			nCost = ((nCost - 1) * 2) + 1;
		end
		DB.setValue(w.getDatabaseNode(), "cost", "number", nCost);
	end
	
	-- Set the focus to the name if requested.
	if bFocus and w then
		w.header.subwindow.name.setFocus();
	end
	
	return w;
end

function onEnter()
	if Input.isShiftPressed() then
		self.addEntry(true);
		return true;
	end
	
	return false;
end

function onFilter(w)
	return w.getFilter();
end

function onDrop(x, y, draginfo)
	-- Do not process message; pass it directly to level list
	return false;
end