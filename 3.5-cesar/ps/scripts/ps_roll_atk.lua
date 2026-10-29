-- 
-- Please see the license.html file included with this distribution for 
-- attribution and copyright information.
--

function action(draginfo)
	local tParty = PartyManager.getPartyActors();
	if #tParty == 0 then
		return true;
	end
	
	local rAction = {};
	rAction.label = Interface.getString("ps_label_groupatk");
	rAction.modifier = window.bonus.getValue();
	rAction.crit = 20;

	ModifierStack.lock();
	for _,v in pairs(tParty) do
		ActionAttack.performPartySheetVsRoll(nil, v, rAction);
	end
	ModifierStack.unlock(true);
	return true;
end

function onButtonPress()
	return action();
end			

