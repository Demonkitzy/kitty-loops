"use strict";

class Actions {

    constructor() {

        this.current = [];
        this.next = [];
        this.addAmount = 1;
    
        this.totalNeeded = 0;
        this.completedTicks = 0;
        this.currentPos = 0;
        this.timeSinceLastUpdate = 0;
    }

    tick(player, timer) {
        const curAction = this.getNextValidAction(player);
        let finishedAction = false;
        // out of actions
        if (!curAction) {
            if (player.visual) shouldRestart = true;
            return {"finished": false, "shouldRestart": true, "resources": copyObject(player.resources)};
        }
        this.addExpFromAction(curAction, player);
        curAction.ticks++;
        curAction.manaUsed++;
        curAction.timeSpent += 1 / baseManaPerSecond / getActualGameSpeed(player.curTown, player);
        // only for multi-part progress bars
        if (curAction.loopStats) {
            let segment = 0;
            let curProgress = player.towns[curAction.townNum][curAction.varName];
            while (curProgress >= curAction.loopCost(segment, player)) {
                curProgress -= curAction.loopCost(segment, player);
                segment++;
            }
            // segment is 0,1,2
            const toAdd = curAction.tickProgress(segment, player) * (curAction.manaCost(player) / curAction.adjustedTicks);
            // console.log("using: "+curAction.loopStats[(towns[curAction.townNum][curAction.varName + "LoopCounter"]+segment) % curAction.loopStats.length]+" to add: " + toAdd + " to segment: " + segment + " and part " +towns[curAction.townNum][curAction.varName + "LoopCounter"]+" of progress " + curProgress + " which costs: " + curAction.loopCost(segment));
            player.towns[curAction.townNum][curAction.varName] += toAdd;
            curProgress += toAdd;
            let partUpdateRequired = false;
            while (curProgress >= curAction.loopCost(segment, player)) {
                curProgress -= curAction.loopCost(segment, player);
                // segment finished
                if (segment === curAction.segments - 1) {
                    // part finished
                    if (curAction.name === "Dark Ritual" && player.towns[curAction.townNum][curAction.varName] >= 4000000) unlockStory("darkRitualThirdSegmentReached", player);
                    if (curAction.name === "Imbue Mind" && player.towns[curAction.townNum][curAction.varName] >= 700000000) unlockStory("imbueMindThirdSegmentReached", player);
                    player.towns[curAction.townNum][curAction.varName] = 0;
                    player.towns[curAction.townNum][`${curAction.varName}LoopCounter`] += curAction.segments;
                    player.towns[curAction.townNum][`total${curAction.varName}`]++;
                    segment -= curAction.segments;
                    curAction.loopsFinished(player);
                    partUpdateRequired = true;
                    if (curAction.canStart && !curAction.canStart(player)) {
                        this.completedTicks += curAction.ticks;
                        if (player.visual) view.requestUpdate("updateTotalTicks", null);
                        curAction.loopsLeft = 0;
                        curAction.ticks = 0;
                        curAction.manaRemaining = player.timeNeeded - timer;
                        curAction.goldRemaining = player.resources.gold;
                        curAction.finish(player);
                        totals.actions++;
                        break;
                    }
                    player.towns[curAction.townNum][curAction.varName] = curProgress;
                }
                if (curAction.segmentFinished) {
                    curAction.segmentFinished(player);
                    partUpdateRequired = true;
                }
                segment++;
            }
            if (player.visual) view.requestUpdate("updateMultiPartSegments", curAction);
            if (partUpdateRequired && player.visual) {
                view.requestUpdate("updateMultiPart", curAction);
            }
        }
        if (curAction.ticks >= curAction.adjustedTicks) {
            curAction.ticks = 0;
            curAction.loopsLeft--;

            curAction.lastMana = curAction.rawTicks;
            this.completedTicks += curAction.adjustedTicks;
            curAction.finish(player);
            if (player.visual) totals.actions++;
            curAction.manaRemaining = player.timeNeeded - timer;
            
            if (curAction.cost) {
                curAction.cost(player);
            }
            curAction.goldRemaining = player.resources.gold;

            this.adjustTicksNeeded(player);
            finishedAction = true;
            if (player.visual) view.requestUpdate("updateCurrentActionLoops", this.currentPos);
        }
        if (player.visual) view.requestUpdate("updateCurrentActionBar", this.currentPos);
        if (curAction.loopsLeft === 0) {
            if (!this.current[this.currentPos + 1] && options.repeatLastAction &&
                (!curAction.canStart || curAction.canStart(player)) && curAction.townNum === player.curTown) {
                curAction.loopsLeft++;
                curAction.loops++;
                curAction.extraLoops++;
            } else {
                this.currentPos++;
            }
        }
        
        return {"finished": finishedAction, "resources": copyObject(player.resources), "mana": (player.timeNeeded - timer), "shouldRestart": false}
        
    };

    getNextValidAction(player) {
        let curAction = this.current[this.currentPos];
        if (!curAction) {
            return curAction;
        }
        if (curAction.allowed && this.getNumOnCurList(curAction.name) > curAction.allowed(player)) {
            curAction.ticks = 0;
            curAction.timeSpent = 0;
            if (player.visual) view.requestUpdate("updateCurrentActionBar", this.currentPos);
            return undefined;
        }
        while ((curAction.canStart && !curAction.canStart(player) && curAction.townNum === player.curTown) || curAction.townNum !== player.curTown) {
            curAction.errorMessage = this.getErrorMessage(curAction, player);
            if (player.visual) view.requestUpdate("updateCurrentActionBar", this.currentPos);
            this.currentPos++;
            if (this.currentPos >= this.current.length) {
                curAction = undefined;
                break;
            }
            curAction = this.current[this.currentPos];
        }
        return curAction;
    };

    getErrorMessage(action, player) {
        if (action.townNum !== player.curTown) {
            return `You were in zone ${player.curTown + 1} when you tried this action, and needed to be in zone ${action.townNum + 1}`;
        }
        if (action.canStart && !action.canStart(player)) {
            return "You could not make the cost for this action.";
        }
        return "??";
    };

    restart(player) {
        this.currentPos = 0;
        this.completedTicks = 0;
        player.curTown = 0;
        player.towns[0].suppliesCost = 300;
        if (player.visual) view.requestUpdate("updateResource","supplies");
        player.curAdvGuildSegment = 0;
        player.curCraftGuildSegment = 0;
		player.curWizCollegeSegment = 0;
        player.curFightFrostGiantsSegment = 0;
        player.curFightJungleMonstersSegment = 0;
        player.curThievesGuildSegment = 0;
        for (const town of player.towns) {
            for (const action of town.totalActionList) {
                if (action.type === "multipart") {
                    town[action.varName] = 0;
                    town[`${action.varName}LoopCounter`] = 0;
                }
            }
        }
        player.guild = "";
        player.escapeStarted = false;
        player.portalUsed = false;
        totalMerchantMana = 7500;
        if (options.keepCurrentList && (player.visual)) {

            for (const action of this.current) {
                action.loops -= action.extraLoops;
                action.loopsLeft = action.loops;
                action.extraLoops = 0;
                action.ticks = 0;
                action.manaUsed = 0;
                action.lastMana = 0;
                action.manaRemaining = 0;
                action.goldRemaining = 0;
                action.timeSpent = 0;
            }

        } else {
            this.current = [];
            for (const action of this.next) {
                // don't add empty/disabled ones
                if (action.loops === 0 || action.disabled) {
                    continue;
                }
                const toAdd = translateClassNames(action.name);

                toAdd.loops = action.loops;
                toAdd.loopsLeft = action.loops;
                toAdd.extraLoops = 0;
                toAdd.ticks = 0;
                toAdd.manaUsed = 0;
                toAdd.lastMana = 0;
                toAdd.manaRemaining = 0;
                toAdd.goldRemaining = 0;
                toAdd.timeSpent = 0;

                this.current.push(toAdd);
            }
        }
        if ((this.current.length === 0) && (player.visual)) {
            pauseGame();
        }
        this.adjustTicksNeeded(player);
        if (player.visual) {
            view.requestUpdate("updateMultiPartActions");
            view.requestUpdate("updateNextActions");
            view.requestUpdate("updateTime");
        }
    };

    adjustTicksNeeded(player) {
        let remainingTicks = 0;
        for (let i = this.currentPos; i < this.current.length; i++) {
            const action = this.current[i];
            this.setAdjustedTicks(action, player);
            remainingTicks += action.loopsLeft * action.adjustedTicks;
        }
        this.totalNeeded = this.completedTicks + remainingTicks;
        if (player.visual) view.requestUpdate("updateTotalTicks", null);
    };


    addAction(action, loops, initialOrder, disabled) {
        const toAdd = {};
        toAdd.name = action;
        if (disabled) toAdd.disabled = true;
        else toAdd.disabled = false;

        toAdd.loops = loops === undefined ? this.addAmount : loops;

        if (initialOrder === undefined) {
            if (options.addActionsToTop) {
                this.next.splice(0, 0, toAdd);
            } else {
                this.next.push(toAdd);
            }
        } else {
            // insert at index
            this.next.splice(initialOrder, 0, toAdd);
        }
    };

    setAdjustedTicks(action, player) {
        let newCost = 0;
        for (const actionStatName in action.stats){
            newCost += action.stats[actionStatName] / (1 + getLevel(actionStatName, player) / 100);
        }
        action.rawTicks = action.manaCost(player) * newCost - 0.000001;
        action.adjustedTicks = Math.max(1, Math.ceil(action.rawTicks));
    };

    addExpFromAction(action, player) {
        const adjustedExp = action.expMult * (action.manaCost(player) / action.adjustedTicks);
        for (const stat in action.stats) {
            const expToAdd = action.stats[stat] * adjustedExp * getTotalBonusXP(stat, player);
            const statExp = `statExp${stat}`;
            if (!action[statExp]) {
                action[statExp] = 0;
            }
            action[statExp] += expToAdd;
            addExp(stat, expToAdd, player);
        }
    };

    markActionsComplete(loopCompletedActions, player) {
        loopCompletedActions.forEach(action => {
            let varName = Action[withoutSpaces(action.name)].varName;
            if (!player.completedActions.includes(varName)) player.completedActions.push(varName);
        });
    };
    
    actionStory(loopCompletedActions, player) {
        loopCompletedActions.forEach(action => {
            let completed = action.loops - action.loopsLeft;
            if (action.story !== undefined) action.story(completed, player);
        });
    };

    getNumOnList(actionName) {
        let count = 0;
        for (const action of this.next) {
            if (!action.disabled && action.name === actionName) {
                count += action.loops;
            }
        }
        return count;
    };
    
    getNumOnCurList(actionName) {
        let count = 0;
        for (const action of this.current) {
            if (action.name === actionName) {
                count += action.loops;
            }
        }
        return count;
    }

}

function calcSoulstoneMult(soulstones) {
    return 1 + Math.pow(soulstones, 0.8) / 30;
}

function calcTalentMult(talent) {
    return 1 + Math.pow(talent, 0.4) / 3;
}