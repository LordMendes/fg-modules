-- 
-- Please see the license.html file included with this distribution for 
-- attribution and copyright information.
--

function onInit()
	self.onModeChanged();
end

function onModeChanged()
	applyFilter();

	if not minisheet then	
		WindowManager.callInnerWindowFunction(self, "onModeChanged");
	end
end

function onDrop(x, y, draginfo)
	return CharManager.onActionDrop(draginfo, window.getDatabaseNode());
end
function onFilter(w)
	if minisheet then
		return (w.carried.getValue() >= 2);
	end
	if not WindowManager.getWindowReadOnlyState(window) then
		return true;
	end
	return ((w.carried.getValue() >= 2) or (DB.getValue(window.getDatabaseNode(), "spellmode", "") ~= "combat"));
end
