--
-- Please see the license.html file included with this distribution for
-- attribution and copyright information.
--

function onInit()
	local fPrev = nil;
	if GameManager.getMultiKeyFunction then
		fPrev = GameManager.getMultiKeyFunction("onActionPostGetRoll", "damage");
	end
	GameManager.setMultiKeyFunction("onActionPostGetRoll", "damage", function(rActor, rAction, rRoll)
		if fPrev then
			fPrev(rActor, rAction, rRoll);
		end
		PCSheetDR.tagRollEnhancement(rActor, rAction, rRoll);
	end);

	if CesarRules and CesarRules.applyCharacterDefenses then
		return;
	end
	if ActionHealthD20 and ActionHealthD20.applyDamageAdjustMain and not PCSheetDR._wrapped then
		local fStock = ActionHealthD20.applyDamageAdjustMain;
		PCSheetDR._fApplyDamageAdjustMain = fStock;
		if ActionDamage then
			ActionDamage._fApplyDamageAdjustMain = fStock;
		end
		ActionHealthD20.applyDamageAdjustMain = applyDamageAdjustMain;
		PCSheetDR._wrapped = true;
	end
end

function applyDamageAdjustMain(rSource, rTarget, rRoll, tApplyData)
	if not (CesarRules and CesarRules.applyCharacterDefenses) then
		PCSheetDR.applyCharacterDefenses(rTarget, rRoll, tApplyData);
		PCSheetDR.applyMagicDRThreshold(rRoll, tApplyData);
	end
	local fApply = (ActionDamage and ActionDamage._fApplyDamageAdjustMain) or PCSheetDR._fApplyDamageAdjustMain;
	if fApply == applyDamageAdjustMain then
		fApply = PCSheetDR._fApplyDamageAdjustMain;
	end
	return fApply(rSource, rTarget, rRoll, tApplyData);
end
