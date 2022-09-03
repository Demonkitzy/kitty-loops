/* What is needed:
stats + talents
towns
skills
buffs
resources
*/

class Player {
    create(stats, buffs, towns, skills, totalTalent, trainingLimits, townsUnlocked, completedActions,
        dungeons, goldInvested, storyMax, unreadActionStories, totalOfflineMs, storyReqs) {
        this.stats = stats;
        this.buffs =  buffs;
        this.towns = towns;
        this.totalTalent = totalTalent;
        this.resources = copyObject(resourcesTemplate);;
        this.skills = skills;
        this.trainingLimits = trainingLimits;
        this.curTown = 0;
        this.guild = "";
        this.goldInvested = goldInvested;
        this.townsUnlocked = townsUnlocked;
        this.completedActions = completedActions;
        this.dungeons = dungeons;
        this.storyMax = storyMax;
        this.unreadActionStories = unreadActionStories;
        this.totalOfflineMs = totalOfflineMs;
        this.storyReqs = storyReqs;
        this.curAdvGuildSegment = 0;
        this.curCraftGuildSegment = 0;
        this.curWizCollegeSegment = 0;
        this.curFightFrostGiantsSegment = 0;
        this.curFightJungleMonstersSegment = 0;
        this.curThievesGuildSegment = 0;
        this.timeNeeded = timeNeededInitial;
        this.escapeStarted = false;
        this.portalUsed = false;
    }
    
}