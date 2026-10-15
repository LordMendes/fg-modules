-- 
-- Please see the license.html file included with this distribution for 
-- attribution and copyright information.
--

function onInit()
	TokenManager.addDefaultHealthFeatures(nil, { "hp", "hptemp", "nonlethal", "wounds" });
	TokenManager.addDefaultEffectFeatures();
end
