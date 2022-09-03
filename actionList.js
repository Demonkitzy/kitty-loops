"use strict";

function withoutSpaces(name) {
    return name.replace(/ /gu, "");
}

function translateClassNames(name) {
    // construct a new action object with appropriate prototype
    const nameWithoutSpaces = withoutSpaces(name);
    if (nameWithoutSpaces in Action) {
        return Object.create(Action[nameWithoutSpaces]);
    }
    console.log(`error trying to create ${name}`);
    return false;
}

const limitedActions = [
    "Smash Pots",
    "Pick Locks",
    "Short Quest",
    "Long Quest",
    "Gather Herbs",
    "Wild Mana",
    "Hunt",
    "Gamble",
    "Gather Team",
    "Mana Geyser",
    "Mine Soulstones",
    "Take Artifacts",
    "Accept Donations",
    "Mana Well",
    "Destroy Pylons"
];
const trainingActions = [
    "Train Speed",
    "Train Strength",
    "Train Dexterity",
    "Sit By Waterfall",
    "Read Books",
    "Bird Watching",
    "Oracle",
    "Charm School"
];
function hasLimit(name) {
    return limitedActions.includes(name);
}
function getTravelNum(name) {
    if (name === "Face Judgement" && resources.reputation <= 50) return 2;
    if (name === "Face Judgement" && resources.reputation >= 50) return 1;
    if (name === "Start Journey" || name === "Continue On" || name === "Start Trek" || name === "Fall From Grace" || name === "Journey Forth" || name === "Escape" || name === "Leave City" || name === "Guru") return 1;
    if (name === "Hitch Ride") return 2;
    if (name === "Underworld") return 5;
    if (name === "Open Portal") return -5;
    return 0;
}
function isTraining(name) {
    return trainingActions.includes(name);
}

function getXMLName(name) {
    return name.toLowerCase().replace(/ /gu, "_");
}

const townNames = ["Beginnersville", "Forest Path", "Merchanton", "Mt. Olympus", "Valhalla", "Startington", "Jungle Path", "Commerceville", "Valley of Olympus"];


// there are 4 types of actions
// 1: normal actions. normal actions have no additional UI (haggle, train strength)
// 2: progress actions. progress actions have a progress bar and use 100, 200, 300, etc. leveling system (wander, meet people)
// 3: limited actions. limited actions have town info for their limit, and a set of town vars for their "data"
// 4: multipart actions. multipart actions have multiple distinct parts to get through before repeating. they also get a bonus depending on how often you complete them

// type names are "normal", "progress", "limited", and "multipart".
// define one of these in the action, and they will create any additional UI elements that are needed

// exp mults are default 100%, 150% for skill training actions, 200% for actions that cost a resource, 300% for actions that cost 2 resources, and 500% for actions that cost soulstones
// todo: ^^ currently some actions are too high, but I am saving these balance changes for the z5/z6 update

// actions are all sorted below by town in order

class Action{
    constructor(name, extras) {
        this.name = name;
        // many actions have to override this (in extras) for save compatibility, because the
        // varName is often used in parts of the game state
        this.varName = withoutSpaces(name);
        Object.assign(this, extras);
    }
    
    // all actions to date with info text have the same info text, so presently this is
    // centralized here (function will not be called by the game code if info text is not
    // applicable)
    infoText() {
        return `${_txt(`actions>${getXMLName(this.name)}>info_text1`)}
                <i class='fa fa-arrow-left'></i>
                ${_txt(`actions>${getXMLName(this.name)}>info_text2`)}
                <i class='fa fa-arrow-left'></i>
                ${_txt(`actions>${getXMLName(this.name)}>info_text3`)}
                <br><span class='bold'>${`${_txt("actions>tooltip>total_found")}: `}</span><div id='total${this.varName}'></div>
                <br><span class='bold'>${`${_txt("actions>tooltip>total_checked")}: `}</span><div id='checked${this.varName}'></div>`;
    };
}

/* eslint-disable no-invalid-this */
// not all actions have tooltip2 or labelDone, but among actions that do, the XML format is
// always the same; these are loaded lazily once (and then they become own properties of the
// specific Action object)
defineLazyGetter(Action.prototype, "tooltip", function() {
    return _txt(`actions>${getXMLName(this.name)}>tooltip`);
});
defineLazyGetter(Action.prototype, "tooltip2", function() {
    return _txt(`actions>${getXMLName(this.name)}>tooltip2`);
});
defineLazyGetter(Action.prototype, "label", function() {
    return _txt(`actions>${getXMLName(this.name)}>label`);
});
defineLazyGetter(Action.prototype, "labelDone", function() {
    return _txt(`actions>${getXMLName(this.name)}>label_done`);
});


// same as Action, but contains shared code to load segment names for multipart actions.
// (constructor takes number of segments as a second argument)
class MultipartAction extends Action {
    constructor(name, extras) {
        super(name, extras)
        this.segments = (extras.varName === "Fight") ? 3 : extras.loopStats.length;
    };

    getSegmentName(segment) {
        return this.segmentNames[segment % this.segmentNames.length];
    };
}
// lazily calculate segment names when explicitly requested (to give chance for localization
// code to be loaded first)
defineLazyGetter(MultipartAction.prototype, "segmentNames", function() {
    return Array.from(
        _txtsObj(`actions>${getXMLName(this.name)}>segment_names>name`)
    ).map(elt => elt.textContent);
});

// same as MultipartAction, but includes shared code to generate dungeon completion tooltip
// as well as specifying 7 segments (constructor takes dungeon ID number as a second
// argument)
class DungeonAction extends MultipartAction{
    constructor(name, dungeonNum, extras) {
        super(name, extras);
        this.dungeonNum = dungeonNum;
    };

    completedTooltip() {
        let ssDivContainer = "";
        if (this.dungeonNum < 3) {
            for (let i = 0; i < player.dungeons[this.dungeonNum].length; i++) {
                ssDivContainer += `Floor ${i + 1} |
                                    <div class='bold'>${_txt(`actions>${getXMLName(this.name)}>chance_label`)} </div> <div id='soulstoneChance${this.dungeonNum}_${i}'></div>% -
                                    <div class='bold'>${_txt(`actions>${getXMLName(this.name)}>last_stat_label`)} </div> <div id='soulstonePrevious${this.dungeonNum}_${i}'>NA</div> -
                                    <div class='bold'>${_txt(`actions>${getXMLName(this.name)}>label_done`)}</div> <div id='soulstoneCompleted${this.dungeonNum}_${i}'></div><br>`;
            }
        }
        return _txt(`actions>${getXMLName(this.name)}>completed_tooltip`) + ssDivContainer;
    };

    getPartName() {
        const floor = Math.floor((player.towns[this.townNum][`${this.varName}LoopCounter`] + 0.0001) / this.segments + 1);
        return `${_txt(`actions>${getXMLName(this.name)}>label_part`)} ${floor <= player.dungeons[this.dungeonNum].length ? numberToWords(floor) : _txt(`actions>${getXMLName(this.name)}>label_complete`)}`;
    };
}

//====================================================================================================
//Zone 1 - Beginnersville
//====================================================================================================

Action.Wander = new Action("Wander", {
    type: "progress",
    expMult: 1,
    townNum: 0,
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return player.towns[0].getLevel(this.varName) >= 20;
            case 2:
                return player.towns[0].getLevel(this.varName) >= 40;
            case 3:
                return player.towns[0].getLevel(this.varName) >= 60;
            case 4:
                return player.towns[0].getLevel(this.varName) >= 80;
            case 5:
                return player.towns[0].getLevel(this.varName) >= 100;
        }
        return false;
    },
    stats: {
        Per: 0.2,
        Con: 0.2,
        Cha: 0.2,
        Spd: 0.3,
        Luck: 0.1
    },
    affectedBy: ["Buy Glasses"],
    manaCost(player) {
        return 250;
    },
    visible() {
        return true;
    },
    unlocked() {
        return true;
    },
    finish(player) {
        player.towns[0].finishProgress(this.varName, 200 * (player.resources.glasses ? 4 : 1), player);
    }
});
function adjustPots(player) {
    let town = player.towns[0];
    let basePots = town.getLevel("Wander") * 5;
    town.totalPots = Math.floor(basePots);
}
function adjustLocks(player) {
    let town = player.towns[0];
    let baseLocks = town.getLevel("Wander");
    town.totalLocks = Math.floor(baseLocks * getSkillMod("Spatiomancy", 100, 300, .5, player));
}

Action.SmashPots = new Action("Smash Pots", {
    type: "limited",
    expMult: 1,
    townNum: 0,
    varName: "Pots",
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return player.towns[0][`good${this.varName}`] >= 50;
            case 2:
                return player.towns[0][`good${this.varName}`] >= 75;
        }
        return false;
    },
    stats: {
        Str: 0.2,
        Per: 0.2,
        Spd: 0.6
    },
    manaCost(player) {
        return Math.ceil(50 * getSkillBonus("Practical", player));
    },
    visible() {
        return true;
    },
    unlocked() {
        return true;
    },
    // note this name is misleading: it is used for mana and gold gain.
    goldCost(player) {
        return Math.floor(100 * getSkillBonus("Dark", player));
    },
    finish(player) {
        player.towns[0].finishRegular(this.varName, 10, () => {
            const manaGain = this.goldCost(player);
            addMana(manaGain, player);
            return manaGain;
        }, player);
    }
});

Action.PickLocks = new Action("Pick Locks", {
    type: "limited",
    varName: "Locks",
    expMult: 1,
    townNum: 0,
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return player.towns[0][`checked${this.varName}`] >= 1;
            case 2:
                return player.towns[0][`checked${this.varName}`] >= 50;
            case 3:
                return player.towns[0][`good${this.varName}`] >= 10;
            case 4:
                return player.towns[0][`good${this.varName}`] >= 25;
        }
        return false;
    },
    stats: {
        Dex: 0.5,
        Per: 0.3,
        Spd: 0.1,
        Luck: 0.1
    },
    manaCost(player) {
        return 400;
    },
    visible() {
        return player.towns[0].getLevel("Wander") >= 3;
    },
    unlocked() {
        return player.towns[0].getLevel("Wander") >= 20;
    },
    goldCost(player) {
        let base = 10;
        return Math.floor(base * getSkillMod("Practical",0,200,1, player));
    },
    finish(player) {
        player.towns[0].finishRegular(this.varName, 10, () => {
            const goldGain = this.goldCost(player);
            addResource("gold", goldGain, player);
            return goldGain;
        }, player);
    }
});

Action.BuyGlasses = new Action("Buy Glasses", {
    type: "normal",
    expMult: 1,
    townNum: 0,
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return player.storyReqs.glassesBought;
        }
        return false;
    },
    stats: {
        Cha: 0.7,
        Spd: 0.3
    },
    allowed(player) {
        return 1;
    },
    canStart(player) {
        return player.resources.gold >= 10;
    },
    cost(player) {
        addResource("gold", -10, player);
    },
    manaCost(player) {
        return 50;
    },
    visible() {
        return player.towns[0].getLevel("Wander") >= 3;
    },
    unlocked() {
        return player.towns[0].getLevel("Wander") >= 20;
    },
    finish(player) {
        addResource("glasses", true, player);
    },
    story(completed, player) {
        unlockStory("glassesBought", player);
    }
});


Action.BuyManaZ1 = new Action("Buy Mana Z1", {
    type: "normal",
    expMult: 1,
    townNum: 0,
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return player.towns[0].getLevel("Met") > 0;
        }
        return false;
    },
    stats: {
        Cha: 0.7,
        Int: 0.2,
        Luck: 0.1
    },
    manaCost(player) {
        return 100;
    },
    visible() {
        return player.towns[0].getLevel("Wander") >= 3;
    },
    unlocked() {
        return player.towns[0].getLevel("Wander") >= 20;
    },
    goldCost(player) {
        return Math.floor(50 * getSkillBonus("Mercantilism",player));
    },
    finish(player) {
        addMana(player.resources.gold * this.goldCost(player), player);
        resetResource("gold", player);
    },
});

Action.MeetPeople = new Action("Meet People", {
    type: "progress",
    expMult: 1,
    townNum: 0,
    varName: "Met",
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return player.towns[0].getLevel(this.varName) >= 1;
            case 2:
                return player.towns[0].getLevel(this.varName) >= 20;
            case 3:
                return player.towns[0].getLevel(this.varName) >= 40;
            case 4:
                return player.towns[0].getLevel(this.varName) >= 60;
            case 5:
                return player.towns[0].getLevel(this.varName) >= 80;
            case 6:
                return player.towns[0].getLevel(this.varName) >= 100;
        }
        return false;
    },
    stats: {
        Int: 0.1,
        Cha: 0.8,
        Soul: 0.1
    },
    manaCost(player) {
        return 800;
    },
    visible() {
        return player.towns[0].getLevel("Wander") >= 10;
    },
    unlocked() {
        return player.towns[0].getLevel("Wander") >= 22;
    },
    finish(player) {
        player.towns[0].finishProgress(this.varName, 200, player);
    },
});

function adjustSQuests(player) {
    let town = player.towns[0];
    let baseSQuests = town.getLevel("Met");
    town.totalSQuests = Math.floor(baseSQuests * getSkillMod("Spatiomancy", 200, 400, .5, player));
}

Action.TrainStrength = new Action("Train Strength", {
    type: "normal",
    expMult: 4,
    townNum: 0,
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return player.storyReqs.strengthTrained;
            case 2:
                return getTalent("Str", player) >= 100;
            case 3:
                return getTalent("Str", player) >= 1000;
            case 4:
                return getTalent("Str", player) >= 10000;
            case 5:
                return getTalent("Str", player) >= 100000;
        }
        return false;
    },
    stats: {
        Str: 0.8,
        Con: 0.2
    },
    allowed(player) {
        return player.trainingLimits;
    },
    manaCost(player) {
        return 2000;
    },
    visible() {
        return player.towns[0].getLevel("Met") >= 1;
    },
    unlocked() {
        return player.towns[0].getLevel("Met") >= 5;
    },
    finish(player) {
    },
    story(completed, player) {
        unlockStory("strengthTrained", player);
    }
});

Action.ShortQuest = new Action("Short Quest", {
    type: "limited",
    expMult: 1,
    townNum: 0,
    varName: "SQuests",
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return player.towns[0][`checked${this.varName}`] >= 1;
            case 2:
                // 20 short quests in a loop
                return player.storyReqs.maxSQuestsInALoop;
            case 3:
                // 50 short quests in a loop
                return player.storyReqs.realMaxSQuestsInALoop;
        }
        return false;
    },
    stats: {
        Str: 0.2,
        Dex: 0.1,
        Cha: 0.3,
        Spd: 0.2,
        Luck: 0.1,
        Soul: 0.1
    },
    manaCost(player) {
        return 600;
    },
    visible() {
        return player.towns[0].getLevel("Met") >= 1;
    },
    unlocked() {
        return player.towns[0].getLevel("Met") >= 5;
    },
    goldCost(player) {
        let base = 20;
        return Math.floor(base * getSkillMod("Practical",100,300,1,player));
    },
    finish(player) {
        player.towns[0].finishRegular(this.varName, 5, () => {
            const goldGain = this.goldCost(player);
            addResource("gold", goldGain, player);
            return goldGain;
        }, player);
    },
    story(completed, player) {
        if (player.towns[0][`good${this.varName}`] >= 20 && player.towns[0][`goodTemp${this.varName}`] <= player.towns[0][`good${this.varName}`] - 20) unlockStory("maxSQuestsInALoop",player);
        if (player.towns[0][`good${this.varName}`] >= 50 && player.towns[0][`goodTemp${this.varName}`] <= player.towns[0][`good${this.varName}`] - 50) unlockStory("realMaxSQuestsInALoop",player);
    }
    
});

Action.Investigate = new Action("Investigate", {
    type: "progress",
    expMult: 1,
    townNum: 0,
    varName: "Secrets",
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return player.towns[0].getLevel(this.varName) >= 20;
            case 2:
                return player.towns[0].getLevel(this.varName) >= 40;
            case 3:
                return player.towns[0].getLevel(this.varName) >= 60;
            case 4:
                return player.towns[0].getLevel(this.varName) >= 80;
            case 5:
                return player.towns[0].getLevel(this.varName) >= 100;
        }
        return false;
    },
    stats: {
        Per: 0.3,
        Cha: 0.4,
        Spd: 0.2,
        Luck: 0.1
    },
    manaCost(player) {
        return 1000;
    },
    visible() {
        return player.towns[0].getLevel("Met") >= 5;
    },
    unlocked() {
        return player.towns[0].getLevel("Met") >= 25;
    },
    finish(player) {
        player.towns[0].finishProgress(this.varName, 500, player);
    },
});
function adjustLQuests(player) {
    let town = player.towns[0];
    let baseLQuests = town.getLevel("Secrets") / 2;
    town.totalLQuests = Math.floor(baseLQuests * getSkillMod("Spatiomancy", 300, 500, .5,player));
}

Action.LongQuest = new Action("Long Quest", {
    type: "limited",
    expMult: 1,
    townNum: 0,
    varName: "LQuests",
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return player.towns[0][`checked${this.varName}`] >= 1;
            case 2:
                // 10 long quests in a loop
                return player.storyReqs.maxLQuestsInALoop;
            case 3:
                // 25 long quests in a loop
                return player.storyReqs.realMaxLQuestsInALoop;
        }
        return false;
    },
    stats: {
        Str: 0.2,
        Int: 0.2,
        Con: 0.4,
        Spd: 0.2
    },
    manaCost(player) {
        return 1500;
    },
    visible() {
        return player.towns[0].getLevel("Secrets") >= 1;
    },
    unlocked() {
        return player.towns[0].getLevel("Secrets") >= 10;
    },
    goldCost(player) {
        let base = 30;
        return Math.floor(base * getSkillMod("Practical",200,400,1,player));
    },
    finish(player) {
        player.towns[0].finishRegular(this.varName, 5, () => {
            addResource("reputation", 1, player);
            const goldGain = this.goldCost(player);
            addResource("gold", goldGain, player);
            return goldGain;
        }, player);
        
    },
    story(completed, player) {
        if (player.towns[0][`good${this.varName}`] >= 10 && player.towns[0][`goodTemp${this.varName}`] <= player.towns[0][`good${this.varName}`] - 10) unlockStory("maxLQuestsInALoop", player);
        if (player.towns[0][`good${this.varName}`] >= 25 && player.towns[0][`goodTemp${this.varName}`] <= player.towns[0][`good${this.varName}`] - 25) unlockStory("realMaxLQuestsInALoop", player);
    }
});

Action.ThrowParty = new Action("Throw Party", {
    type: "normal",
    expMult: 2,
    townNum: 0,
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return player.storyReqs.partyThrown;
            case 2:
                return player.storyReqs.partyThrown2;
        }
        return false;
    },
    stats: {
        Cha: 0.8,
        Soul: 0.2
    },
    manaCost(player) {
        return 1600;
    },
    canStart(player) {
        return player.resources.reputation >= 2;
    },
    cost(player) {
        addResource("reputation", -2, player);
    },
    visible() {
        return player.towns[this.townNum].getLevel("Secrets") >= 20;
    },
    unlocked() {
        return player.towns[this.townNum].getLevel("Secrets") >= 30;
    },
    finish(player) {
        player.towns[0].finishProgress("Met", 3200, player);
    },
    story(completed,player) {
        unlockStory("partyThrown",player);
        if (completed >= 10) unlockStory("partyThrown2",player);
    }
});

Action.WarriorLessons = new Action("Warrior Lessons", {
    type: "normal",
    expMult: 1.5,
    townNum: 0,
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return getSkillLevel("Combat", player) >= 1;
            case 2:
                return getSkillLevel("Combat", player) >= 100;
            case 3:
                return getSkillLevel("Combat", player) >= 200;
            case 4:
                return getSkillLevel("Combat", player) >= 250;
            case 5:
                return getSkillLevel("Combat", player) >= 1000;
        }
        return false;
    },
    stats: {
        Str: 0.5,
        Dex: 0.3,
        Con: 0.2
    },
    skills: {
        Combat: 100
    },
    manaCost(player) {
        return 1000;
    },
    canStart(player) {
        return player.resources.reputation >= 2;
    },
    visible() {
        return player.towns[0].getLevel("Secrets") >= 10;
    },
    unlocked() {
        return player.towns[0].getLevel("Secrets") >= 20;
    },
    finish(player) {
        handleSkillExp(this.skills,player);
    },
});

Action.MageLessons = new Action("Mage Lessons", {
    type: "normal",
    expMult: 1.5,
    townNum: 0,
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return getSkillLevel("Magic",player) >= 1;
            case 2:
                return getSkillLevel("Magic",player) >= 100;
            case 3:
                return getSkillLevel("Magic",player) >= 200;
            case 4:
                return getSkillLevel("Magic",player) >= 250;
            case 5:
                return getSkillLevel("Alchemy",player) >= 10;
            case 6:
                return getSkillLevel("Alchemy",player) >= 50;
            case 7:
                return getSkillLevel("Alchemy",player) >= 100;
        }
        return false;
    },
    stats: {
        Per: 0.3,
        Int: 0.5,
        Con: 0.2
    },
    skills: {
        Magic(player) {
            return 100 * (1 + getSkillLevel("Alchemy",player) / 100);
        }
    },
    manaCost(player) {
        return 1000;
    },
    canStart(player) {
        return player.resources.reputation >= 2;
    },
    visible() {
        return player.towns[0].getLevel("Secrets") >= 10;
    },
    unlocked() {
        return player.towns[0].getLevel("Secrets") >= 20;
    },
    finish(player) {
        handleSkillExp(this.skills, player);
    },
});

Action.HealTheSick = new MultipartAction("Heal The Sick", {
    type: "multipart",
    expMult: 1,
    townNum: 0,
    varName: "Heal",
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return player.towns[0].totalHeal >= 1;
            case 2:
                // 10 patients healed in a loop
                return player.storyReqs.heal10PatientsInALoop;
            case 3:
                return player.towns[0].totalHeal >= 100;
            case 4:
                return player.towns[0].totalHeal >= 1000;
            case 5:
                // fail reputation req
                return player.storyReqs.failedHeal;
            case 6:
                return getSkillLevel("Restoration",player) >= 50;
        }
        return false;
    },
    stats: {
        Per: 0.2,
        Int: 0.2,
        Cha: 0.2,
        Soul: 0.4
    },
    skills: {
        Magic: 10
    },
    loopStats: ["Per", "Int", "Cha"],
    manaCost(player) {
        return 2500;
    },
    canStart(player) {
        return player.resources.reputation >= 1;
    },
    loopCost(segment, player) {
        return fibonacci(2 + Math.floor((player.towns[0].HealLoopCounter + segment) / this.segments + 0.0000001)) * 5000;
    },
    tickProgress(offset, player) {
        return getSkillLevel("Magic",player) * Math.max(getSkillLevel("Restoration",player) / 50, 1) * (1 + getLevel(this.loopStats[(player.towns[0].HealLoopCounter + offset) % this.loopStats.length], player) / 100) * Math.sqrt(1 + player.towns[0].totalHeal / 100);
    },
    loopsFinished(player) {
        addResource("reputation", 3, player);
    },
    getPartName() {
        return `${_txt(`actions>${getXMLName(this.name)}>label_part`)} ${numberToWords(Math.floor((player.towns[0].HealLoopCounter + 0.0001) / this.segments + 1))}`;
    },
    visible() {
        return player.towns[0].getLevel("Secrets") >= 20;
    },
    unlocked() {
        return getSkillLevel("Magic",player) >= 12;
    },
    finish(player) {
        handleSkillExp(this.skills,player);
    },
    story(completed,player) {
        if (player.towns[0].HealLoopCounter / 3 + 1 >= 10) unlockStory("heal10PatientsInALoop",player);
    }
});

Action.FightMonsters = new MultipartAction("Fight Monsters", {
    type: "multipart",
    expMult: 1,
    townNum: 0,
    varName: "Fight",
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return player.towns[0].totalFight >= 1;
            case 2:
                return player.towns[0].totalFight >= 100;
            case 3:
                return player.towns[0].totalFight >= 500;
            case 4:
                return player.towns[0].totalFight >= 1000;
            case 5:
                return player.towns[0].totalFight >= 5000;
            case 6:
                return player.towns[0].totalFight >= 10000;
            case 7:
                return player.towns[0].totalFight >= 20000;
        }
        return false;
    },
    stats: {
        Str: 0.3,
        Spd: 0.3,
        Con: 0.3,
        Luck: 0.1
    },
    skills: {
        Combat: 10
    },
    loopStats: ["Spd", "Spd", "Spd", "Str", "Str", "Str", "Con", "Con", "Con"],
    manaCost(player) {
        return 2000;
    },
    canStart(player) {
        return player.resources.reputation >= 2;
    },
    loopCost(segment,player) {
        return fibonacci(Math.floor((player.towns[0].FightLoopCounter + segment) - player.towns[0].FightLoopCounter / 3 + 0.0000001)) * 10000;
    },
    tickProgress(offset,player) {
        return getSelfCombat(player) * (1 + getLevel(this.loopStats[(player.towns[0].FightLoopCounter + offset) % this.loopStats.length], player) / 100) * Math.sqrt(1 + player.towns[0].totalFight / 100);
    },
    loopsFinished(player) {
        // empty
    },
    segmentFinished(player) {
        addResource("gold", 20,player);
    },
    getPartName() {
        const monster = Math.floor(player.towns[0].FightLoopCounter / 3 + 0.0000001);
        if (monster >= this.segmentNames.length) return this.altSegmentNames[monster % 3];
        return this.segmentNames[monster];
    },
    getSegmentName(segment) {
        return `${this.segmentModifiers[segment % 3]} ${this.getPartName()}`;
    },
    visible() {
        return player.towns[0].getLevel("Secrets") >= 20;
    },
    unlocked() {
        return getSkillLevel("Combat",player) >= 10;
    },
    finish(player) {
        handleSkillExp(this.skills,player);
    },
});
// lazily loaded to allow localization code to load first
defineLazyGetter(Action.FightMonsters, "altSegmentNames",
    () => Array.from(_txtsObj("actions>fight_monsters>segment_alt_names>name")).map(elt => elt.textContent)
);
defineLazyGetter(Action.FightMonsters, "segmentModifiers",
    () => Array.from(_txtsObj("actions>fight_monsters>segment_modifiers>segment_modifier")).map(elt => elt.textContent)
);

Action.SmallDungeon = new DungeonAction("Small Dungeon", 0, {
    type: "multipart",
    expMult: 1,
    townNum: 0,
    varName: "SDungeon",
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return player.storyReqs.smallDungeonAttempted;
            case 2:
                return player.towns[0][`total${this.varName}`] >= 1000;
            case 3:
                return player.towns[0][`total${this.varName}`] >= 5000;
            case 4:
                return player.towns[0][`total${this.varName}`] >= 10000;
            case 5:
                return player.storyReqs.clearSDungeon;
        }
        return false;
    },
    stats: {
        Str: 0.1,
        Dex: 0.4,
        Con: 0.3,
        Cha: 0.1,
        Luck: 0.1
    },
    skills: {
        Combat: 5,
        Magic: 5
    },
    loopStats: ["Dex", "Con", "Dex", "Cha", "Dex", "Str", "Luck"],
    manaCost(player) {
        return 2000;
    },
    canStart(player) {
        const curFloor = Math.floor((player.towns[this.townNum].SDungeonLoopCounter) / this.segments + 0.0000001);
        return player.resources.reputation >= 2 && curFloor < player.dungeons[this.dungeonNum].length;
    },
    loopCost(segment,player) {
        return precision3(Math.pow(2, Math.floor((player.towns[this.townNum].SDungeonLoopCounter + segment) / this.segments + 0.0000001)) * 15000);
    },
    tickProgress(offset,player) {
        const floor = Math.floor((player.towns[this.townNum].SDungeonLoopCounter) / this.segments + 0.0000001);
        return (getSelfCombat(player) + getSkillLevel("Magic",player)) *
            (1 + getLevel(this.loopStats[(player.towns[this.townNum].SDungeonLoopCounter + offset) % this.loopStats.length], player) / 100) *
            Math.sqrt(1 + player.dungeons[this.dungeonNum][floor].completed / 200);
    },
    loopsFinished(player) {
        const curFloor = Math.floor((player.towns[this.townNum].SDungeonLoopCounter) / this.segments + 0.0000001 - 1);
        const success = finishDungeon(this.dungeonNum, curFloor, player);
        if (success === true && player.storyMax <= 1) {
            unlockGlobalStory(1, player);
        } else if (success === false && player.storyMax <= 2) {
            unlockGlobalStory(2, player);
        }
    },
    visible() {
        return (getSkillLevel("Combat",player) + getSkillLevel("Magic",player)) >= 15;
    },
    unlocked() {
        return (getSkillLevel("Combat",player) + getSkillLevel("Magic",player)) >= 35;
    },
    finish(player) {
        handleSkillExp(this.skills,player);
    },
    story(completed,player) {
        unlockStory("smallDungeonAttempted",player);
        if (player.towns[this.townNum][this.varName + "LoopCounter"] >= 42) unlockStory("clearSDungeon",player);
    },
});
function finishDungeon(dungeonNum, floorNum, state) {
    const floor = state.dungeons[dungeonNum][floorNum];
    if (!floor) {
        return false;
    }
    floor.completed++;
    const rand = Math.random();
    if (state === player && rand <= floor.ssChance) {
        const statToAdd = statList[Math.floor(Math.random() * statList.length)];
        floor.lastStat = statToAdd;
        state.stats[statToAdd].soulstone = state.stats[statToAdd].soulstone ? (state.stats[statToAdd].soulstone + Math.floor(Math.pow(10, dungeonNum) * getSkillBonus("Divine",state))) : 1;
        floor.ssChance *= 0.98;
        view.requestUpdate("updateSoulstones",null);
        return true;
    }
    if (state !== player) {
        state.ssCount += Math.floor(Math.pow(10, dungeonNum) * getSkillBonus("Divine", state))
    }
    return false;
}

Action.BuySupplies = new Action("Buy Supplies", {
    type: "normal",
    expMult: 1,
    townNum: 0,
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return player.storyReqs.suppliesBought;
            case 2:
                return player.storyReqs.suppliesBoughtWithoutHaggling;
        }
        return false;
    },
    stats: {
        Cha: 0.8,
        Luck: 0.1,
        Soul: 0.1
    },
    allowed(player) {
        return 1;
    },
    manaCost(player) {
        return 200;
    },
    canStart(player) {
        return player.resources.gold >= player.towns[0].suppliesCost && !player.resources.supplies;
    },
    cost(player) {
        addResource("gold", -player.towns[0].suppliesCost, player);
    },
    visible() {
        return (getSkillLevel("Combat",player) + getSkillLevel("Magic",player)) >= 15;
    },
    unlocked() {
        return (getSkillLevel("Combat",player) + getSkillLevel("Magic",player)) >= 35;
    },
    finish(player) {
        addResource("supplies", true, player);
    },
    story(completed, player) {
        unlockStory("suppliesBought",player);
        if (player.towns[0].suppliesCost === 300) unlockStory("suppliesBoughtWithoutHaggling", player);
    }
});

Action.Haggle = new Action("Haggle", {
    type: "normal",
    expMult: 1,
    townNum: 0,
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return player.storyReqs.haggle;
            case 2:
                return player.storyReqs.haggle15TimesInALoop;
            case 3:
                return player.storyReqs.haggle16TimesInALoop;
        }
        return false;
    },
    stats: {
        Cha: 0.8,
        Luck: 0.1,
        Soul: 0.1
    },
    manaCost(player) {
        return 100;
    },
    canStart(player) {
        return player.resources.reputation >= 1;
    },
    cost(player) {
        addResource("reputation", -1, player);
    },
    visible() {
        return (getSkillLevel("Combat",player) + getSkillLevel("Magic",player)) >= 15;
    },
    unlocked() {
        return (getSkillLevel("Combat",player) + getSkillLevel("Magic",player)) >= 35;
    },
    finish(state) {
        state.towns[0].suppliesCost -= 20;
        if (state.towns[0].suppliesCost < 0) {
            state.towns[0].suppliesCost = 0;
        }
        if (state === player) view.requestUpdate("updateResource", "supplies");
    },
    story(completed, player) {
        if (completed >= 15) unlockStory("haggle15TimesInALoop",player);
        if (completed >= 16) unlockStory("haggle16TimesInALoop",player);
        unlockStory("haggle",player);
    }
});

Action.StartJourney = new Action("Start Journey", {
    type: "normal",
    expMult: 2,
    townNum: 0,
    storyReqs(storyNum) {
        switch (storyNum) {
            case 1:
                return player.townsUnlocked.includes(1);
        }
        return false;
    },
    stats: {
        Con: 0.4,
        Per: 0.3,
        Spd: 0.3
    },
    allowed(player) {
        return 1;
    },
    manaCost(player) {
        return 1000;
    },
    canStart(player) {
        return player.resources.supplies;
    },
    cost(player) {
        addResource("supplies", false,player);
    },
    visible() {
        return (getSkillLevel("Combat",player) + getSkillLevel("Magic",player)) >= 15;
    },
    unlocked() {
        return (getSkillLevel("Combat",player) + getSkillLevel("Magic",player)) >= 35;
    },
    finish(player) {
        unlockTown(1, player);
    },
    story(completed,player) {
        unlockGlobalStory(3,player);
    }
});

const actionsWithGoldCost = Object.values(Action).filter(
    action => action.goldCost !== undefined
);