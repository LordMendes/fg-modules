/**
 * Book-complete WRPG feats (pp. 106–115).
 * Keeps existing supplemental slugs; adds missing chapter feats.
 */
export function buildWarcraftFeats({ base, html, text, a }) {
  function feat(slug, name, type, description, benefit, opts = {}) {
    const page = opts.page ?? null;
    const b = base(slug, name, page);
    const descHtml = html(description);
    const benHtml = html(benefit);
    const preHtml = opts.prereq ? html(opts.prereq) : null;
    const specialHtml = opts.special ? html(opts.special) : null;
    const normalHtml = opts.normal ? html(opts.normal) : null;
    return {
      ...b,
      type,
      index: {
        ...b.index,
        type,
        description_snippet: description.replace(/<[^>]+>/g, "").slice(0, 120),
      },
      description_html: descHtml,
      description_text: text(descHtml),
      benefit_html: benHtml,
      benefit_text: text(benHtml),
      prerequisite_html: preHtml,
      prerequisite_text: preHtml ? text(preHtml) : null,
      special_html: specialHtml,
      special_text: specialHtml ? text(specialHtml) : null,
      normal_html: normalHtml,
      normal_text: normalHtml ? text(normalHtml) : null,
    };
  }

  const bash = a("/feats/bash-wrpg", "Bash");
  const battleCry = a("/feats/battle-cry-wrpg", "Battle Cry");
  const blockSpell = a("/feats/block-magic-wrpg", "Block Spell");
  const magicEnergy = a("/feats/control-magic-energy-wrpg", "Magic Energy Control");
  const mirrorSpell = a("/feats/duplicate-spell-wrpg", "Mirror Spell");
  const reflectSpell = a("/feats/reflect-magic-wrpg", "Reflect Spell");
  const delayMalfunction = a("/feats/delay-malfunction-wrpg", "Delay Malfunction");
  const expertRider = a("/feats/expert-rider-wrpg", "Expert Rider");
  const totemFollower = a("/feats/totem-follower-wrpg", "Follower of the Totem");
  const pulverize = a("/feats/pulverize-wrpg", "Pulverize");
  const ride = a("/skills/ride", "Ride");
  const bluff = a("/skills/bluff", "Bluff");
  const spellcraft = a("/skills/spellcraft", "Spellcraft");
  const craftTech = a("/skills/craft", "Craft") + " (technological device)";
  const useTech = a("/skills/use-technological-device", "Use Technological Device");

  return [
    feat(
      "bash-wrpg",
      "Bash",
      "General",
      "One blow from your weapon can leave an opponent stunned and reeling.",
      `You can declare a bash attempt before taking a full attack action with a bludgeoning weapon. For the successful attack of your choice, roll damage normally. The foe struck must make a Fortitude save (DC 10 + the damage rolled). The foe takes no damage from that blow, but on a failed save is stunned for 1 round (cannot act, loses any Dexterity bonus to AC, and takes a −2 penalty to AC). You can use Bash only once per round and no more than once per level per day. When you use Bash, you forfeit any bonus or extra attacks granted by other feats or abilities (such as Cleave or <em>haste</em>). Constructs, oozes, plants, undead, incorporeal creatures, and creatures immune to critical hits cannot be stunned.`,
      {
        prereq: "Str 13, Power Attack, base attack bonus +4",
        special: "A fighter may select Bash as one of his fighter bonus feats.",
        page: 106,
      },
    ),
    feat(
      "battle-cry-wrpg",
      "Battle Cry",
      "General",
      "You can terrify opponents with a fearsome battle cry. Most characters must be berserk with rage to use this ability. Orcs are so intimidating they need not rage to use Battle Cry.",
      `As a move action, you sound a battle cry. Foes within 30 feet must make a Will save (DC 10 + 1/2 your character level + your Cha bonus). If you have 5 or more ranks in Intimidate, the DC increases by +2. On a failure, the foe takes a −2 morale penalty on attack rolls, Will saves, and AC for 1 round. This penalty does not stack with itself unless a character with ${a("/feats/collective-fury-wrpg", "Collective Fury")} is involved. This is a mind-affecting fear effect.`,
      {
        prereq: "Cha 13, ability to rage",
        special:
          "Non-orc characters can take this feat but can use it only while raging. Each use reduces the non-orc's remaining rage duration by 1 round.",
        page: 106,
      },
    ),
    feat(
      "war-tongue-wrpg",
      "Battle Language",
      "General",
      "You use short phrases and gestures to communicate orders during battle.",
      `You can aid another for an ally who also has this feat from up to 100 feet away if you have line of sight. Doing so is a move action. Make a DC 15 ${bluff} check; if you succeed, the recipient gains a +2 circumstance bonus on his next attack roll or to AC against an opponent's next attack. This stacks with other aid another attempts, but not with other Battle Language attempts. Opponents can make a Sense Motive check opposed by your Bluff check to intercept and negate the bonus.`,
      {
        prereq: `${bluff} 3 ranks`,
        normal: "Aid another actions usually require being adjacent to the ally.",
        special: `5 or more ranks in Knowledge (military tactics) grant a +2 synergy bonus to send or intercept Battle Language signals. A fighter may select Battle Language as one of his fighter bonus feats.`,
        page: 107,
      },
    ),
    feat(
      "block-magic-wrpg",
      "Block Spell",
      "Metamagic",
      "You channel energy to block a spell's effects.",
      `When you are targeted by a spell, you can disrupt it. Make a ${spellcraft} check (DC 15 + spell level). If you succeed, you can automatically counter the spell by spending a spell slot at least one level higher than the target spell. You need not prepare a specific counterspell.`,
      {
        prereq: `Iron Will, ${magicEnergy}, caster level 5th`,
        normal:
          "Counterspelling usually requires casting the same spell, a diametrically opposed spell, or <em>dispel magic</em>.",
        page: 107,
      },
    ),
    feat(
      "brilliant-leadership-wrpg",
      "Brilliant Leadership",
      "General",
      "You inspire followers to explore their magical talents.",
      `Each day, any spellcaster followers can prepare or cast extra spells. Each such follower gains one extra spell per day for each spell level up to two levels below the highest level you can cast. For example, if you cast 5th-level spells, followers gain extra spells for levels 1st through 3rd.`,
      {
        prereq: "Leadership, able to cast 3rd-level spells",
        page: 107,
      },
    ),
    feat(
      "create-firearms-wrpg",
      "Build Firearms",
      "Technology",
      "You have a talent for building and using firearms.",
      `You get a +2 bonus on ${craftTech} checks when crafting firearms. Your technological limit for firearms is increased by 2.`,
      {
        special:
          "Once per week, instead of making the usual attack roll, you may declare an automatic critical threat using a firearm that you have built. You must still roll to confirm the critical, as normal. A tinker may select Build Firearms as one of his tinker bonus feats.",
        page: 107,
      },
    ),
    feat(
      "create-siege-engines-wrpg",
      "Build Siege Weapons",
      "Technology",
      "You have a talent for building, or sabotaging, large weapons and engines of destruction.",
      `You get a +2 bonus on ${craftTech} checks when building catapults, cannons, mortars, and other siege weapons. Your technological limit for building these weapons is increased by 2.`,
      {
        special: `You may make a ${craftTech} check to sabotage any technological device or weapon that is larger than Medium-size. The DC equals the DC to create the item. If you succeed, the item becomes useless until repaired. If you succeed by 5 or more, you can rig the item to suffer a catastrophic malfunction the next time it is used, destroying the item and (at the GM's discretion) endangering whoever is using it. A tinker may select Build Siege Weapons as one of his tinker bonus feats.`,
        page: 108,
      },
    ),
    feat(
      "create-small-devices-wrpg",
      "Build Small Devices",
      "Technology",
      "You have nimble fingers and a gift for fine workmanship.",
      `You get a +2 bonus on ${craftTech} checks when building a device of Tiny, Diminutive, or Fine size. Your technological limit for building such devices is increased by 2.`,
      {
        prereq: "Dex 13",
        special: `You can build devices that are easily concealed or disguised as other objects. If you choose to conceal or disguise a device, any character trying to find it must make a Spot check, and any character trying to discover what the device does must make a ${useTech} check. The DC of these checks is 10 + your Craft (technological device) skill modifier. A tinker may select Build Small Devices as one of his tinker bonus feats.`,
        page: 108,
      },
    ),
    feat(
      "build-teamwork-wrpg",
      "Build Teamwork",
      "Technology",
      "You work well with others and can use teamwork to speed the construction of technological devices.",
      `When you are assisted in a Craft check by at least 3 other people who each have at least 1 rank in a Craft skill, the result of a successful Craft check is doubled. This feat has no effect on an unsuccessful Craft check.`,
      {
        prereq: "Leadership, at least 2 other technology feats",
        special: "A tinker may select Build Teamwork as one of his tinker bonus feats.",
        page: 108,
      },
    ),
    feat(
      "create-vehicles-wrpg",
      "Build Vehicles",
      "Technology",
      "You have a talent for building and operating vehicles.",
      `You get a +2 bonus on ${craftTech} and ${useTech} checks when building or using a vehicle. Your technological limit for building vehicles is increased by 2.`,
      {
        special: `Once per day for 1d6 minutes, you may double the speed of a vehicle you are driving. When this period ends, you may extend it for 1 additional minute by making a DC 20 ${useTech} check. You may continue to extend the period each minute by making another check; each subsequent check increases the DC by 1. The vehicle's speed returns to normal the first time you miss a check. A tinker may select Build Vehicles as one of his tinker bonus feats.`,
        page: 108,
      },
    ),
    feat(
      "point-blank-shot-no-aoo-wrpg",
      "Close Shot",
      "General",
      "You can use a ranged weapon while avoiding opponents in melee combat.",
      "You may fire a ranged weapon without provoking an attack of opportunity.",
      {
        prereq: "Dex 13, Dodge, Point Blank Shot, Precise Shot, base attack bonus +4",
        normal: "If you fire a ranged weapon, any opponent that threatens you gets an attack of opportunity.",
        special: "A fighter may select Close Shot as one of his fighter bonus feats.",
        page: 108,
      },
    ),
    feat(
      "collective-fury-wrpg",
      "Collective Fury",
      "General",
      "Your rage inspires nearby allies who share your fury.",
      `When you rage, all other characters within 30 feet who have the ability to rage gain the benefits of the ${battleCry} feat. Multiple Battle Cry effects do not stack.`,
      {
        prereq: `Cha 13, ${battleCry}, Leadership`,
        special:
          "When an orc with Collective Fury rages, all orcs within 30 feet gain a +2 enhancement bonus to Strength as well as the Battle Cry ability.",
        page: 109,
      },
    ),
    feat(
      "defender-wrpg",
      "Defend",
      "General",
      "You're trained to fight shoulder-to-shoulder and share the benefits of a shield with a nearby ally.",
      `If you are fighting with a shield, any ally within 5 feet who is not fighting with a shield gains your shield's AC bonus. You do not lose your shield bonus, and this bonus stacks with the ally's armor bonus as per the normal stacking rules. Any ally within 5 feet who is fighting with a shield gains a +2 circumstance bonus to AC; this bonus does not stack with itself. If multiple characters with Defend stand within 5 feet of each other and fight with shields, each character gains only the highest shield bonus to AC.`,
      {
        prereq: "Shield Proficiency, base attack bonus +2",
        special: "A fighter may select Defend as one of his fighter bonus feats.",
        page: 109,
      },
    ),
    feat(
      "deflect-magic-wrpg",
      "Deflect Spell",
      "Metamagic",
      "You may counter a spell and choose a new target for it.",
      `If you successfully counter a spell, using the same spell, a spell with a diametrically opposed effect, <em>dispel magic</em>, or the ${blockSpell} feat, you may deflect the spell at any target you choose. The new target is determined as if you had originally cast the spell yourself.`,
      {
        prereq: `${blockSpell}, Iron Will, ${magicEnergy}, ${mirrorSpell}, ${reflectSpell}, caster level 9th`,
        special:
          "Two or more spellcasters with Deflect Spell may counter and re-target the spell until no spellcaster succeeds at countering it. The spell then has its normal effect on its current target. Once you have identified the spell you are trying to counter, you do not need to make any further Spellcraft checks to identify it.",
        page: 109,
      },
    ),
    feat(
      "delay-malfunction-wrpg",
      "Delay Malfunction",
      "Technology",
      "You know how to make last-minute repairs to malfunctioning equipment, adjustments that keep a device running a little longer.",
      `When a device malfunctions, you may make a DC 15 ${craftTech} check. If you succeed, the device operates normally for 1d3 rounds, giving you a chance to finish the job you are doing, make an emergency repair, or get clear before it blows up. If you roll a natural 20 on the check, the malfunction is completely averted. You cannot try again for any specific malfunction, even after a successful use of this feat.`,
      {
        special:
          "Goblin characters can avoid the malfunction entirely by rolling a natural 19 or 20 on the check. A tinker may select Delay Malfunction as one of his tinker bonus feats.",
        page: 109,
      },
    ),
    feat(
      "dedicated-leadership-wrpg",
      "Devoted Leadership",
      "General",
      "Your faith in your followers gives them the confidence they need to survive difficult situations.",
      `Your followers receive a +2 morale bonus to AC, as well as a +1 morale bonus on all saves. Followers must be within a distance of 5 feet × your Charisma bonus to benefit. You can use Devoted Leadership for a number of rounds per day equal to your character level (maximum 20); the rounds need not be consecutive.`,
      {
        prereq: "Cha 13, Wis 13, Leadership",
        page: 110,
      },
    ),
    feat(
      "drums-of-courage-wrpg",
      "Drums of Courage",
      "General",
      "You can drive your tribe's warriors into a terrifying frenzy by playing the sacred war rhythms as they go into battle.",
      `As your tribe enters battle, you can play your war drums to inspire courage. Make a DC 20 Perform (percussion instruments) check. If successful, all warriors of your tribe who can hear your drums receive a +1 morale bonus on attack and damage rolls and on Will saves. This bonus lasts for as long as the warriors hear your drums and for 5 rounds thereafter. Playing the war drums is a standard action and requires concentration each round.`,
      {
        prereq: "Perform (percussion instruments) 5 ranks",
        page: 110,
      },
    ),
    feat(
      "emergency-repair-wrpg",
      "Emergency Repair",
      "Technology",
      "You are adept at spotting mechanical problems and making quick repairs.",
      `As a full-round action, you may make a DC 20 Craft (mechanical object) check to repair a malfunctioning or broken technological device. If you succeed, the device does not destroy itself or endanger its user due to the malfunction. Instead, it operates normally for 1 hour and then ceases functioning until it can undergo normal repairs. If you roll a natural 20 on the check, the item is completely and permanently repaired.`,
      {
        prereq: `Wis 13, ${delayMalfunction}`,
        special:
          "Goblin characters can completely and permanently repair an item by rolling a natural 19 or 20 on the check. A tinker may select Emergency Repair as one of his tinker bonus feats.",
        page: 110,
      },
    ),
    feat(
      "enduring-leadership-wrpg",
      "Enduring Leadership",
      "General",
      "Your tireless efforts are an example to your followers, and you need but a word to push those followers to the peak of their physical abilities.",
      `Once per day before an encounter begins, as a free action you may inspire your followers to exceptional efforts. They receive a +4 morale bonus on their Initiative check, and their speed increases by +10 feet for the duration of the combat.`,
      {
        prereq: "Endurance, Leadership",
        special:
          "If you or any of your followers enter a rage during this combat, the characters who rage are not fatigued when the rage ends.",
        page: 110,
      },
    ),
    feat(
      "exotic-weapon-thorium-wrpg",
      "Exotic Weapon Proficiency (Thorium Weapons)",
      "General",
      "You can use weapons made out of thorium effectively.",
      `You are proficient with a particular weapon made out of thorium and may add half your Strength bonus to damage rolls. Thus, an attack with a one-handed thorium weapon adds 1.5× your Strength bonus, while an attack with a two-handed thorium weapon adds double your Strength bonus.`,
      {
        prereq: "Appropriate proficiency with the non-thorium version of the weapon",
        normal:
          "Characters who are not proficient with thorium weapons suffer a −4 penalty on attack rolls with them, even if they are proficient with a non-thorium version of the weapon. Characters receive their normal Strength bonus to damage rolls.",
        page: 110,
      },
    ),
    feat(
      "expert-rider-wrpg",
      "Expert Rider",
      "General",
      "You can perform a variety of physical stunts while on horseback.",
      `The DCs for all ${ride} tasks are reduced by 2, and you can take 10 on Ride checks for mounted combat maneuvers.`,
      {
        prereq: `Dex 13, ${ride} skill`,
        normal: "You cannot take 10 on skill checks when threatened or distracted.",
        special: "A fighter can select Expert Rider as one of his fighter bonus feats.",
        page: 111,
      },
    ),
    feat(
      "totem-follower-wrpg",
      "Follower of the Totem",
      "General",
      "You have been trained in the shamanic traditions of the tauren and can tap into the forces of nature.",
      `Once per day as a free action, you may gain a +2 sacred bonus to any one ability score. This bonus lasts for 1d6+1 rounds.`,
      {
        prereq: "Wis 13, orc or tauren",
        special:
          "Tauren characters with this feat are considered to have the Exotic Weapon Proficiency (tauren totem) feat.",
        page: 111,
      },
    ),
    feat(
      "rapid-reload-wrpg",
      "Lightning Reload",
      "General",
      "You reload firearms with well-practiced efficiency.",
      `If your firearm takes a standard action to reload, you may reload it as a move action. If the firearm takes more than 1 round to reload, you may reload it in half the normal time.`,
      {
        prereq: "Dex 13, Exotic Weapon Proficiency (firearms)",
        special: "A fighter may select Lightning Reload as one of his fighter bonus feats.",
        page: 111,
      },
    ),
    feat(
      "control-magic-energy-wrpg",
      "Magic Energy Control",
      "Metamagic",
      "You understand the flow of magic energy and find it easy to tap into and control.",
      `You may perform your daily preparation of spells in half the normal time.`,
      {
        prereq: "Iron Will",
        special:
          "A high elf character with this feat no longer suffers from the effects of magic addiction. As a result, he prepares his spells in the normal amount of time, rather than half. A high elf is not actually cured of the addiction, however, so night elves, for instance, can still detect the addiction normally.",
        page: 111,
      },
    ),
    feat(
      "duplicate-spell-wrpg",
      "Mirror Spell",
      "Metamagic",
      "You may channel additional arcane energy to duplicate the effects of a spell you have just cast.",
      `When you cast an arcane spell, the spell is treated as if you had cast it twice. The two copies of the spell are resolved simultaneously. They may have the same or different targets, and both copies of the spell are resolved separately. To use this feat, you must spend a spell slot as if you had used it to cast the duplicate spell. This spell slot must be of the same spell level or higher as the spell you cast.`,
      {
        prereq: `Iron Will, ${magicEnergy}, caster level 3rd`,
        page: 112,
      },
    ),
    feat(
      "mounted-elite-sharpshooter-wrpg",
      "Mounted Sharpshooter",
      "General",
      "You have learned how to use a firearm while mounted.",
      `You do not suffer any penalty while making ranged attacks with a firearm while mounted. You must still make a ${ride} check to keep your mount under control.`,
      {
        prereq: `Dex 13, ${ride} skill, ${expertRider}`,
        normal:
          "If you make a ranged attack with a firearm while mounted, you suffer a −4 penalty on your attack roll.",
        special: "A fighter can select Mounted Sharpshooter as one of his fighter bonus feats.",
        page: 112,
      },
    ),
    feat(
      "butt-strike-wrpg",
      "Pistol Whip",
      "General",
      "You can use a firearm as an improvised melee weapon without damaging it.",
      `You are proficient at using a firearm as a melee weapon and can do so without breaking it. Small firearms are treated as light hammers, Medium firearms are treated as clubs, and Large firearms are treated as warhammers.`,
      {
        normal:
          "Any character may use a firearm as a melee weapon; however, the character is not necessarily proficient with the weapon (determine proficiency based on the weapon the firearm is treated as), and the firearm is broken if it hits. It cannot be fired until repaired with a Craft (mechanical object) check.",
        special: "A fighter may select Pistol Whip as one of his fighter bonus feats.",
        page: 112,
      },
    ),
    feat(
      "precise-leadership-wrpg",
      "Precision Leadership",
      "General",
      "By training your followers to coordinate their fire, you have turned individual soldiers into a single deadly ranged weapon.",
      `When making a ranged attack, each of your followers gains a +1 bonus on the attack roll for every 5 followers attacking at the same time. All followers must be near you, within a radius equal to 10 feet × your Charisma bonus, and must attack with the same kind of weapon. The followers must attack the same target, which must be within 100 feet of you.`,
      {
        prereq: "Leadership, Point Blank Shot",
        special:
          "You and all the other followers that are attacking fire a ranged attack at the same target, then the damage from all the hits is added together before any damage reduction is applied.",
        page: 112,
      },
    ),
    feat(
      "pulverize-wrpg",
      "Pulverize",
      "Tauren",
      "A mighty blow to the ground with your tauren totem frightens the spirits of the earth, causing them to shake the ground in their haste to escape.",
      `You can declare a Pulverize attempt on a full attack action with your tauren totem. Instead of making a normal attack roll, you strike the ground with your tauren totem. Roll damage for the attack, but do not apply the damage to any target. Instead, any creature within 20 feet of you must succeed at a Reflex save (DC 10 + the damage rolled) or fall prone. You can use Pulverize only once per round and no more than a number of times per day equal to 1 + your Wisdom bonus. When you use Pulverize, you forfeit any bonus or extra attacks granted by other feats or abilities (such as Cleave or <em>haste</em>). A pulverize attempt draws an attack of opportunity.`,
      {
        prereq: `Wis 13, Exotic Weapon Proficiency (tauren totem), ${totemFollower}`,
        page: 112,
      },
    ),
    feat(
      "reflect-magic-wrpg",
      "Reflect Spell",
      "Metamagic",
      "Instead of dissipating the energy of a countered spell, you may reflect that spell back upon its caster.",
      `If you are the target of a spell and successfully counter it, using the same spell, a spell with a diametrically opposed effect, <em>dispel magic</em>, or the ${blockSpell} feat, then you may reflect the spell back upon its caster. The spell resolves normally against this new target.`,
      {
        prereq: `${blockSpell}, Iron Will, ${magicEnergy}, ${mirrorSpell}, caster level 7th`,
        special:
          "Two spellcasters with Reflect Spell may bounce the spell between them until one spellcaster fails to counter it. The spell then has its normal effect on the character who failed to counter it.",
        page: 113,
      },
    ),
    feat(
      "bareback-riding-wrpg",
      "Ride Bareback",
      "General",
      "You do not need a saddle or bridle to guide a mount.",
      `You do not suffer any penalty on ${ride} checks when riding bareback.`,
      {
        prereq: `${ride} skill`,
        normal: "Characters that ride bareback suffer a −5 penalty on Ride checks.",
        page: 113,
      },
    ),
    feat(
      "vascular-materials-wrpg",
      "Scavenge Materials",
      "Technology",
      'You are adept at "making do" with whatever materials come to hand.',
      `You may build an item using raw materials equivalent to only 1/10 the item's market value. The Craft check DC needed to build the item increases by 10.`,
      {
        prereq: "Craft 8 ranks",
        page: 113,
      },
    ),
    feat(
      "storm-arrow-wrpg",
      "Storm Bolt",
      "General",
      "You can stun opponents with a well-hurled weapon.",
      `You can declare use of Storm Bolt before taking a full attack action with a ranged bludgeoning weapon. For the successful attack of your choice, roll damage normally, although the foe applies it as nonlethal damage. Also, the foe struck by your attack must make a Fortitude save (DC 10 + the damage rolled) or be stunned for 1 round. A stunned character can't act, loses any Dexterity bonus to AC, and takes a −2 penalty to AC. You can use Storm Bolt only once per round and no more than once per character level per day. When you use Storm Bolt, you forfeit any bonus or extra attacks granted by other feats or abilities (such as Manyshot or <em>haste</em>). Constructs, oozes, plants, undead, incorporeal creatures, and creatures immune to critical hits cannot be stunned.`,
      {
        prereq: `Str 13, ${bash}, Power Attack, base attack bonus +4`,
        special: "A fighter may select Storm Bolt as one of his fighter bonus feats.",
        page: 114,
      },
    ),
    feat(
      "sunder-armor-wrpg",
      "Sunder Armor",
      "General",
      "You can strike blows that damage and destroy armor.",
      `You can use a melee attack with a slashing or bludgeoning weapon to strike a piece of armor that your opponent is wearing. Doing so does not provoke an attack of opportunity from your opponent. If you score a critical hit against your opponent while targeting his armor, roll damage normally and make a Strength check (DC 15 + the targeted armor's armor bonus). If your damage surpasses the armor's hardness and your Strength check succeeds, the armor you have targeted is reduced by 1 point of armor bonus until repaired. You cannot damage magic armor that has an enhancement bonus unless your own weapon has an enhancement bonus equal to or greater than the armor's.`,
      {
        prereq: "Str 13, Power Attack",
        normal: "Targeting an opponent's armor provokes an attack of opportunity.",
        special: "A fighter may select Sunder Armor as one of his fighter bonus feats.",
        page: 114,
      },
    ),
    feat(
      "skilled-shot-wrpg",
      "Trick Shot",
      "General",
      "You can bounce a ranged attack off a surface and hit a target from an unexpected angle.",
      `Trace a path from you to a wall or other convenient surface, then from that point to your target. This is the path your attack takes. Figure your target's cover based on the direction your attack is coming from when it reaches the target. With a good angle, most cover, <em>shield</em> spells, and other directional forms of protection can be negated. Concealment is not affected by this feat. You may only bounce the weapon off one surface, and any range penalty is figured based on the total distance of the path from you to the surface to the target. Hitting a target you cannot see using this feat is possible, but you suffer from the usual 50% miss chance associated with total concealment.`,
      {
        prereq: "Dex 13",
        special:
          "If you are using a moonglaive and are proficient with that weapon, you may bounce it off two surfaces. A fighter may select Trick Shot as one of his fighter bonus feats.",
        page: 114,
      },
    ),
    feat(
      "use-land-vehicles-wrpg",
      "Vehicle Proficiency (Land)",
      "Technology",
      "You are familiar with and can operate vehicles that move over land.",
      `You may operate a land vehicle by making a ${useTech} check without the −4 nonproficiency penalty.`,
      {
        normal: `Characters who operate a vehicle without the appropriate proficiency suffer a −4 penalty on the ${useTech} check.`,
        special:
          "You can gain Vehicle Proficiency multiple times. Each time you take this feat, it applies to a different specialty (land, water, or air). A tinker may select Vehicle Proficiency as one of his tinker bonus feats.",
        page: 114,
      },
    ),
    feat(
      "use-water-vehicles-wrpg",
      "Vehicle Proficiency (Water)",
      "Technology",
      "You are familiar with and can operate vehicles that move through water.",
      `You may operate a water vehicle by making a ${useTech} check without the −4 nonproficiency penalty.`,
      {
        normal: `Characters who operate a vehicle without the appropriate proficiency suffer a −4 penalty on the ${useTech} check.`,
        special:
          "You can gain Vehicle Proficiency multiple times. Each time you take this feat, it applies to a different specialty (land, water, or air). A tinker may select Vehicle Proficiency as one of his tinker bonus feats.",
        page: 114,
      },
    ),
    feat(
      "use-air-vehicles-wrpg",
      "Vehicle Proficiency (Air)",
      "Technology",
      "You are familiar with and can operate vehicles that move in the air.",
      `You may operate an air vehicle by making a ${useTech} check without the −4 nonproficiency penalty.`,
      {
        normal: `Characters who operate a vehicle without the appropriate proficiency suffer a −4 penalty on the ${useTech} check.`,
        special:
          "You can gain Vehicle Proficiency multiple times. Each time you take this feat, it applies to a different specialty (land, water, or air). A tinker may select Vehicle Proficiency as one of his tinker bonus feats.",
        page: 114,
      },
    ),
    feat(
      "war-stomp-wrpg",
      "War Stomp",
      "Tauren",
      "With an imperious blow of your tauren totem, you command the spirits of air and earth to batter your opponents.",
      `As a full attack action, instead of a normal attack roll, you stomp the ground with a tauren totem. Choose a number of opponents within 20 feet equal to 1 + your Wisdom bonus. Roll 1d6 + your Strength bonus points of damage. Each target must succeed at a Fortitude save (DC 10 + the damage rolled) or take that damage and be dazed for 1 round (a dazed creature takes no actions but suffers no AC penalty). You can use War Stomp only once per round and a total number of times per day equal to 1 + your Charisma bonus. When you use War Stomp, you forfeit any bonus or extra attacks from other feats or abilities (such as Cleave or <em>haste</em>). Creatures who save successfully are immune to your War Stomp for 24 hours. A war stomp attempt draws an attack of opportunity.`,
      {
        prereq: `Cha 13, Wis 13, Exotic Weapon Proficiency (tauren totem), ${totemFollower}, ${pulverize}, base attack bonus +8`,
        page: 115,
      },
    ),
  ];
}
