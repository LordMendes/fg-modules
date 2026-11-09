-- 
-- Please see the license.html file included with this distribution for 
-- attribution and copyright information.
--

function onInit()
	if title and title.setValue then
		title.setValue(Interface.getString("cesar_title_gestalt"));
	end
	slot1_name.setValue(Interface.getString("cesar_label_gestaltdrop"));
	slot2_name.setValue(Interface.getString("cesar_label_gestaltdrop"));
end

function setCharacter(nodeChar)
	if nodeChar then
		charpath.setValue(DB.getPath(nodeChar));
	else
		charpath.setValue("");
	end
end

function onClassDrop(nSlot, draginfo)
	if not draginfo or not draginfo.isType("shortcut") then
		return false;
	end
	local sClass, sRecord = draginfo.getShortcutData();
	if sClass ~= "referenceclass" or (sRecord or "") == "" then
		return false;
	end
	local nodeSource = DB.findNode(sRecord);
	if not nodeSource then
		return false;
	end
	local sName = DB.getValue(nodeSource, "name", "");
	if nSlot == 1 then
		slot1_name.setValue(sName);
		slot1_class.setValue(sClass);
		slot1_record.setValue(sRecord);
	else
		slot2_name.setValue(sName);
		slot2_class.setValue(sClass);
		slot2_record.setValue(sRecord);
	end
	return true;
end

function processOK()
	local sRecord1 = slot1_record.getValue();
	local sRecord2 = slot2_record.getValue();
	if (sRecord1 or "") == "" or (sRecord2 or "") == "" then
		ChatManager.SystemMessage(Interface.getString("cesar_message_gestalt_empty"));
		return;
	end
	local sName1 = StringManager.strip(StringManager.trim(slot1_name.getValue() or ""):lower());
	local sName2 = StringManager.strip(StringManager.trim(slot2_name.getValue() or ""):lower());
	if sName1 == "" or sName1 == sName2 or sRecord1 == sRecord2 then
		ChatManager.SystemMessage(Interface.getString("cesar_message_gestalt_duplicate"));
		return;
	end
	local nodeChar = DB.findNode(charpath.getValue());
	if CharManager.addGestaltPair(nodeChar, slot1_class.getValue(), sRecord1, slot2_class.getValue(), sRecord2) then
		close();
	end
end

function processCancel()
	close();
end
