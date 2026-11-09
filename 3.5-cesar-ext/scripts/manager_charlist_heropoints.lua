--
-- Character list badge for the hero point counter.
--

CHARLIST_WIDGET_POSITION = "topright";
CHARLIST_WIDGET_X = -12;
CHARLIST_WIDGET_Y = 12;

function onInit()
	DB.addHandler("charsheet.*.heropoints", "onUpdate", self.onUpdate);
	if CharacterListManager and CharacterListManager.setDecorator then
		CharacterListManager.setDecorator("heropoints", self.updateWidgets);
	end
end

function onUpdate(node)
	if not CharacterListManager or not CharacterListManager.getDisplayControlByPath then
		return;
	end
	self.updateWidgets(CharacterListManager.getDisplayControlByPath(DB.getPath(DB.getChild(node, ".."))));
end

function updateWidgets(c)
	if not c then
		return;
	end
	local nodeRecord = c.getRecordNode();
	if not nodeRecord then
		return;
	end
	local n = DB.getValue(nodeRecord, "heropoints", 0);
	local widget = c.findWidget("heropointstext");
	if n <= 0 then
		if widget then
			widget.destroy();
		end
		return;
	end
	if not widget then
		widget = c.addTextWidget({
			name = "heropointstext",
			font = "sheetlabel",
			text = "",
			position = CharacterListManager_HeroPoints.CHARLIST_WIDGET_POSITION,
			x = CharacterListManager_HeroPoints.CHARLIST_WIDGET_X,
			y = CharacterListManager_HeroPoints.CHARLIST_WIDGET_Y,
		});
	end
	widget.setText(tostring(n));
end
