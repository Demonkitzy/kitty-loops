"use strict";
function initializeStats(stats) {
    for (let i = 0; i < statList.length; i++) {
        addNewStat(statList[i], stats);
    }
}

function addNewStat(name, stats) {
    stats[name] = {};
    stats[name].exp = 0;
    stats[name].talent = 0;
    stats[name].soulstone = 0;
}

function initializeSkills(skills) {
    for (let i = 0; i < skillList.length; i++) {
        addNewSkill(skillList[i], skills);
    }
}

function addNewSkill(name, skills) {
    skills[name] = {};
    skills[name].exp = 0;
}

function initializeBuffs(buffs) {
    for (let i = 0; i < buffList.length; i++) {
        addNewBuff(buffList[i], buffs);
    }
}

function addNewBuff(name, buffs) {
    buffs[name] = {};
    buffs[name].amt = 0;
}

function getLevel(stat, player) {
    return getLevelFromExp(player.stats[stat].exp);
}

function getTotalTalentLevel(player) {
    return Math.floor(Math.pow(player.totalTalent, 0.2));
}

function getTotalTalentPrc(player) {
    return (Math.pow(player.totalTalent, 0.2) - Math.floor(Math.pow(player.totalTalent, 0.2))) * 100;
}

function getLevelFromExp(exp) {
    return Math.floor((Math.sqrt(8 * exp / 100 + 1) - 1) / 2);
}

function getExpOfLevel(level) {
    return level * (level + 1) * 50;
}

function getTalent(stat, player) {
    return getLevelFromTalent(player.stats[stat].talent);
}

function getLevelFromTalent(exp) {
    return Math.floor((Math.sqrt(8 * exp / 100 + 1) - 1) / 2);
}

function getExpOfTalent(level) {
    return level * (level + 1) * 50;
}

function getPrcToNextLevel(stat, player) {
    const expOfCurLevel = getExpOfLevel(getLevel(stat, player));
    const curLevelProgress = player.stats[stat].exp - expOfCurLevel;
    const nextLevelNeeds = getExpOfLevel(getLevel(stat, player) + 1) - expOfCurLevel;
    return Math.floor(curLevelProgress / nextLevelNeeds * 100 * 10) / 10;
}

function getPrcToNextTalent(stat, player) {
    const expOfCurLevel = getExpOfTalent(getTalent(stat, player));
    const curLevelProgress = player.stats[stat].talent - expOfCurLevel;
    const nextLevelNeeds = getExpOfTalent(getTalent(stat, player) + 1) - expOfCurLevel;
    return Math.floor(curLevelProgress / nextLevelNeeds * 100 * 10) / 10;
}

function getSkillLevelFromExp(exp) {
    return Math.floor((Math.sqrt(8 * exp / 100 + 1) - 1) / 2);
}

function getExpOfSkillLevel(level) {
    return level * (level + 1) * 50;
}

function getSkillLevel(skill, player) {
    return getSkillLevelFromExp(player.skills[skill].exp);
}

function getSkillBonus(skill, player) {
    let change;
    if (skill === "Dark" || skill === "Chronomancy" || skill === "Mercantilism" || skill === "Divine" || skill === "Wunderkind" || skill === "Thievery" || skill === "Leadership") change = "increase";
    else if (skill === "Practical" || skill === "Spatiomancy" || skill === "Commune" || skill === "Gluttony") change = "decrease";
    else console.log("Skill not found:" + skill);

    if(change == "increase") return Math.pow(1 + getSkillLevel(skill, player) / 60, 0.25);
    else if (change == "decrease") return 1 / (1 + getSkillLevel(skill, player) / 100);
    else if (change == "custom") return 1 / (1 + getSkillLevel(skill, player) / 2000);
    else return 0;
}

function getSkillMod(name, min, max, percentChange, player) {
    if (getSkillLevel(name, player) < min) return 1;
    else return 1 + Math.min(getSkillLevel(name, player) - min, max-min) * percentChange / 100;
}

function getBuffLevel(buff, player) {
    return player.buffs[buff].amt;
}

function getRitualBonus(min, max, speed, player)
{
    if (getBuffLevel("Ritual", player) < min) return 1;
    else return 1 + Math.min(getBuffLevel("Ritual", player) - min, max-min) * speed / 100;
}


function getArmorLevel(player) {
    return 1 + ((player.resources.armor + 3 * player.resources.enchantments))/5; //* getCraftGuildRank(player).bonus) / 5;
}

function getSelfCombat(player) {
    return (getSkillLevel("Combat", player) + getSkillLevel("Pyromancy", player) * 5); //* getArmorLevel(player) * (1 + getBuffLevel("Feast", player) * .05);
}

function getZombieStrength(player) {
    return getSkillLevel("Dark", player) * player.resources.zombie / 2 * Math.max(getBuffLevel("Ritual", player) / 100, 1) * (1 + getBuffLevel("Feast", player) * .05);
}

function getTeamStrength(player) {
    return 0;//(getSkillLevel("Combat", player) + getSkillLevel("Restoration", player) * 4) * (player.resources.teamMembers / 2) * getAdvGuildRank(player).bonus * getSkillBonus("Leadership", player) * (1 + getBuffLevel("Feast", player) * .05);
}

function getTeamCombat(player) {
    return getSelfCombat(player) + getTeamStrength(player);//+ getZombieStrength(player)
}

function getPrcToNextSkillLevel(skill, player) {
    const expOfCurLevel = getExpOfSkillLevel(getSkillLevel(skill, player));
    const curLevelProgress = player.skills[skill].exp - expOfCurLevel;
    const nextLevelNeeds = getExpOfSkillLevel(getSkillLevel(skill, player) + 1) - expOfCurLevel;
    return Math.floor(curLevelProgress / nextLevelNeeds * 100 * 10) / 10;
}

function addSkillExp(name, amount, state) {
    if (name === "Combat" || name === "Pyromancy" || name === "Restoration") amount *= 1 + getBuffLevel("Heroism", state) * 0.02;
    state.skills[name].exp += amount;
    if (state === player) view.requestUpdate("updateSkill", name);
}

function handleSkillExp(list, player) {
    for (const skill in list) {
        if (Number.isInteger(list[skill])) addSkillExp(skill, list[skill], player);
        else addSkillExp(skill, list[skill](player), player);
    }
}

function addBuffAmt(name, amount, state) {
    if (getBuffLevel(name, state) === buffHardCaps[name]) return;
    state.buffs[name].amt += amount;
    if (state === player) view.requestUpdate("updateBuff",name);
}

function addExp(name, amount, state) {
    state.stats[name].exp += amount;
    const aspirantBonus = getBuffLevel("Aspirant", state) ?  getBuffLevel("Aspirant", state) * 0.01 : 0;
    let talentGain = (amount * getSkillBonus("Wunderkind", state) + amount * aspirantBonus) / 100;
    state.stats[name].talent += talentGain;
    state.totalTalent += talentGain;
    if (state === player) view.requestUpdate("updateStat", name);
}

function restartStats(state) {
    for (let i = 0; i < statList.length; i++) {
        if(getSkillLevel("Wunderkind", state) > 0) state.stats[statList[i]].exp = getExpOfLevel(getBuffLevel("Imbuement2", state) * 2);
        else state.stats[statList[i]].exp = getExpOfLevel(getBuffLevel("Imbuement2", state));
        if (state === player) view.requestUpdate("updateStat", statList[i]);
    }
}

function getTotalBonusXP(statName, player) {
    const soulstoneBonus = player.stats[statName].soulstone ? calcSoulstoneMult(player.stats[statName].soulstone) : 1;
    return soulstoneBonus * calcTalentMult(getTalent(statName, player));
}
