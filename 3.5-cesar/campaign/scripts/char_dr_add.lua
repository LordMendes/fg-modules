-- 
-- Please see the license.html file included with this distribution for 
-- attribution and copyright information.
--

local _sKind = "dr";
local _sJoin = "and";
local _sEnergy = "";
local _bNone = false;
local _tSelected = {};
local _tButtons = {};
local _tTypeOrder = {
	"bludgeoning", "piercing", "slashing", "magic",
	"silver", "cold iron", "adamantine", "good",
	"evil", "lawful", "chaotic", "epic",
};

local function paint(w, bOn)
	if w and w.setColor then
		if bOn then
			w.setColor("88AA88");
		else
			w.setColor(nil);
		end
	end
end

function onInit()
	if title and title.setValue then
		title.setValue(Interface.getString("cesar_title_dr"));
	end
	_tButtons = {
		bludgeoning = type_bludgeoning,
		piercing = type_piercing,
		slashing = type_slashing,
		magic = type_magic,
		silver = type_silver,
		["cold iron"] = type_coldiron,
		adamantine = type_adamantine,
		good = type_good,
		evil = type_evil,
		lawful = type_lawful,
		chaotic = type_chaotic,
		epic = type_epic,
		none = type_none,
	};
	amount.setValue(0);
	magiclevel.setValue(1);
	setKind("dr");
end

function setCharacter(nodeChar)
	if nodeChar then
		charpath.setValue(DB.getPath(nodeChar));
	else
		charpath.setValue("");
	end
end

function setKind(sKind)
	_sKind = sKind;
	paint(kind_dr, sKind == "dr");
	paint(kind_resist, sKind == "resist");
	local bDR = (sKind == "dr");
	heading_dr.setVisible(bDR);
	heading_dr_label.setVisible(bDR);
	heading_resist.setVisible(not bDR);
	heading_resist_label.setVisible(not bDR);
	join_and.setVisible(bDR);
	join_or.setVisible(bDR);
	type_none.setVisible(bDR);
	magiclevel_label.setVisible(bDR);
	magiclevel.setVisible(bDR);
	for _, sType in ipairs(_tTypeOrder) do
		if _tButtons[sType] then
			_tButtons[sType].setVisible(bDR);
		end
	end
	energy_acid.setVisible(not bDR);
	energy_cold.setVisible(not bDR);
	energy_electricity.setVisible(not bDR);
	energy_fire.setVisible(not bDR);
	energy_sonic.setVisible(not bDR);
	updatePreview();
end

function setJoin(sJoin)
	_sJoin = sJoin;
	paint(join_and, sJoin == "and");
	paint(join_or, sJoin == "or");
	updatePreview();
end

function onTypePress(sType)
	_bNone = false;
	paint(_tButtons.none, false);
	_tSelected[sType] = not _tSelected[sType];
	paint(_tButtons[sType], _tSelected[sType] == true);
	updatePreview();
end

function onNonePress()
	_bNone = not _bNone;
	paint(_tButtons.none, _bNone);
	if _bNone then
		_tSelected = {};
		for _, sType in ipairs(_tTypeOrder) do
			paint(_tButtons[sType], false);
		end
	end
	updatePreview();
end

function onEnergyPress(sEnergy)
	_sEnergy = sEnergy;
	paint(energy_acid, sEnergy == "acid");
	paint(energy_cold, sEnergy == "cold");
	paint(energy_electricity, sEnergy == "electricity");
	paint(energy_fire, sEnergy == "fire");
	paint(energy_sonic, sEnergy == "sonic");
	updatePreview();
end

function buildBypass()
	if _bNone then
		return "-";
	end
	local nMagic = magiclevel.getValue();
	if nMagic < 1 then
		nMagic = 1;
	end
	local a = {};
	for _, sType in ipairs(_tTypeOrder) do
		if _tSelected[sType] then
			if sType == "magic" and nMagic > 1 then
				table.insert(a, "magic " .. nMagic);
			else
				table.insert(a, sType);
			end
		end
	end
	return table.concat(a, " " .. _sJoin .. " ");
end

function updatePreview()
	local nAmount = amount.getValue();
	local sLabel = "";
	if _sKind == "resist" then
		if _sEnergy ~= "" then
			sLabel = string.format("Resist %d %s", nAmount, _sEnergy);
		end
	else
		local sBypass = buildBypass();
		if sBypass ~= "" then
			sLabel = string.format("%d/%s", nAmount, sBypass);
		end
	end
	preview.setValue(sLabel);
end

function processOK()
	local nAmount = amount.getValue();
	if nAmount < 1 then
		ChatManager.SystemMessage(Interface.getString("cesar_message_dr_amount"));
		return;
	end
	local nodeChar = DB.findNode(charpath.getValue());
	if not nodeChar then
		return;
	end
	local tEntry = { amount = nAmount, kind = _sKind };
	if _sKind == "resist" then
		if _sEnergy == "" then
			ChatManager.SystemMessage(Interface.getString("cesar_message_dr_energy"));
			return;
		end
		tEntry.energy = _sEnergy;
		tEntry.bypass = "";
		tEntry.label = string.format("Resist %d %s", nAmount, _sEnergy);
	else
		local sBypass = buildBypass();
		if sBypass == "" then
			ChatManager.SystemMessage(Interface.getString("cesar_message_dr_bypass"));
			return;
		end
		tEntry.bypass = sBypass;
		tEntry.energy = "";
		tEntry.label = string.format("%d/%s", nAmount, sBypass);
	end
	local sEntry = "";
	if entrypath and entrypath.getValue then
		sEntry = entrypath.getValue();
	end
	if (sEntry or "") ~= "" then
		local nodeEntry = DB.findNode(sEntry);
		if CesarRules.updateDamageReduction(nodeEntry, tEntry) then
			close();
		end
	elseif CesarRules.addDamageReduction(nodeChar, tEntry) then
		close();
	end
end

function setEntry(nodeEntry)
	if not nodeEntry then
		return;
	end
	entrypath.setValue(DB.getPath(nodeEntry));
	if title and title.setValue then
		title.setValue(Interface.getString("cesar_title_dredit"));
	end
	local sKind = DB.getValue(nodeEntry, "kind", "dr");
	amount.setValue(DB.getValue(nodeEntry, "amount", 0));
	if sKind == "resist" then
		setKind("resist");
		onEnergyPress(DB.getValue(nodeEntry, "energy", ""));
	else
		setKind("dr");
		loadBypass(DB.getValue(nodeEntry, "bypass", ""));
	end
	updatePreview();
end

function loadBypass(sBypass)
	_tSelected = {};
	_bNone = false;
	for _, sType in ipairs(_tTypeOrder) do
		paint(_tButtons[sType], false);
	end
	paint(_tButtons.none, false);
	sBypass = string.lower(sBypass or "");
	if sBypass == "" or sBypass == "-" then
		_bNone = true;
		paint(_tButtons.none, true);
		updatePreview();
		return;
	end
	local sJoin = "and";
	if sBypass:find(" or ", 1, true) then
		sJoin = "or";
	end
	setJoin(sJoin);
	local sPattern = "%s+" .. sJoin .. "%s+";
	local n = 1;
	while n <= #sBypass do
		local i, j = sBypass:find(sPattern, n);
		local sToken;
		if not i then
			sToken = sBypass:sub(n);
			n = #sBypass + 1;
		else
			sToken = sBypass:sub(n, i - 1);
			n = j + 1;
		end
		sToken = StringManager.trim(sToken);
		local nMagic = tonumber(sToken:match("^magic (%d+)$"));
		if sToken == "magic" or nMagic then
			_tSelected["magic"] = true;
			paint(_tButtons["magic"], true);
			if nMagic and nMagic > 1 then
				magiclevel.setValue(nMagic);
			else
				magiclevel.setValue(1);
			end
		elseif _tButtons[sToken] then
			_tSelected[sToken] = true;
			paint(_tButtons[sToken], true);
		end
		if not i then
			break;
		end
	end
	updatePreview();
end

function processCancel()
	close();
end
