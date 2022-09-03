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

    tick(state) {
        const curAction = this.getNextValidAction(player);
        // out of actions
        if (!curAction) {
            if (state === player) shouldRestart = true;
            return;
        }
        this.addExpFromAction(curAction, state);
        curAction.ticks++;
        curAction.manaUsed++;
        curAction.timeSpent += 1 / baseManaPerSecond / getActualGameSpeed(state.curTown, state);
        // only for multi-part progress bars
        if (curAction.loopStats) {
            let segment = 0;
            let curProgress = state.towns[curAction.townNum][curAction.varName];
            while (curProgress >= curAction.loopCost(segment, state)) {
                curProgress -= curAction.loopCost(segment, state);
                segment++;
            }
            // segment is 0,1,2
            const toAdd = curAction.tickProgress(segment, state) * (curAction.manaCost(state) / curAction.adjustedTicks);
            // console.log("using: "+curAction.loopStats[(towns[curAction.townNum][curAction.varName + "LoopCounter"]+segment) % curAction.loopStats.length]+" to add: " + toAdd + " to segment: " + segment + " and part " +towns[curAction.townNum][curAction.varName + "LoopCounter"]+" of progress " + curProgress + " which costs: " + curAction.loopCost(segment));
            state.towns[curAction.townNum][curAction.varName] += toAdd;
            curProgress += toAdd;
            let partUpdateRequired = false;
            while (curProgress >= curAction.loopCost(segment, state)) {
                curProgress -= curAction.loopCost(segment, state);
                // segment finished
                if (segment === curAction.segments - 1) {
                    // part finished
                    if (curAction.name === "Dark Ritual" && state.towns[curAction.townNum][curAction.varName] >= 4000000) unlockStory("darkRitualThirdSegmentReached", state);
                    if (curAction.name === "Imbue Mind" && state.towns[curAction.townNum][curAction.varName] >= 700000000) unlockStory("imbueMindThirdSegmentReached", state);
                    state.towns[curAction.townNum][curAction.varName] = 0;
                    state.towns[curAction.townNum][`${curAction.varName}LoopCounter`] += curAction.segments;
                    state.towns[curAction.townNum][`total${curAction.varName}`]++;
                    segment -= curAction.segments;
                    curAction.loopsFinished(state);
                    partUpdateRequired = true;
                    if (curAction.canStart && !curAction.canStart(state)) {
                        this.completedTicks += curAction.ticks;
                        if (state === player) view.requestUpdate("updateTotalTicks", null);
                        curAction.loopsLeft = 0;
                        curAction.ticks = 0;
                        curAction.manaRemaining = state.timeNeeded - timer;
                        curAction.goldRemaining = state.resources.gold;
                        curAction.finish(state);
                        totals.actions++;
                        break;
                    }
                    state.towns[curAction.townNum][curAction.varName] = curProgress;
                }
                if (curAction.segmentFinished) {
                    curAction.segmentFinished(state);
                    partUpdateRequired = true;
                }
                segment++;
            }
            if (state === player) view.requestUpdate("updateMultiPartSegments", curAction);
            if (partUpdateRequired && state === player) {
                view.requestUpdate("updateMultiPart", curAction);
            }
        }
        if (curAction.ticks >= curAction.adjustedTicks) {
            curAction.ticks = 0;
            curAction.loopsLeft--;

            curAction.lastMana = curAction.rawTicks;
            this.completedTicks += curAction.adjustedTicks;
            curAction.finish(state);
            if (state === player) totals.actions++;
            curAction.manaRemaining = state.timeNeeded - timer;
            
            if (curAction.cost) {
                curAction.cost(state);
            }
            curAction.goldRemaining = state.resources.gold;

            this.adjustTicksNeeded(state);
            if (state === player) view.requestUpdate("updateCurrentActionLoops", this.currentPos);
        }
        if (state === player) view.requestUpdate("updateCurrentActionBar", this.currentPos);
        if (curAction.loopsLeft === 0) {
            if (!this.current[this.currentPos + 1] && options.repeatLastAction &&
                (!curAction.canStart || curAction.canStart(state)) && curAction.townNum === state.curTown) {
                curAction.loopsLeft++;
                curAction.loops++;
                curAction.extraLoops++;
            } else {
                this.currentPos++;
            }
        }
    };

    getNextValidAction(state) {
        let curAction = this.current[this.currentPos];
        if (!curAction) {
            return curAction;
        }
        if (curAction.allowed && this.getNumOnCurList(curAction.name) > curAction.allowed(state)) {
            curAction.ticks = 0;
            curAction.timeSpent = 0;
            if (state === player) view.requestUpdate("updateCurrentActionBar", this.currentPos);
            return undefined;
        }
        while ((curAction.canStart && !curAction.canStart(state) && curAction.townNum === state.curTown) || curAction.townNum !== state.curTown) {
            curAction.errorMessage = this.getErrorMessage(curAction, state);
            if (state === player) view.requestUpdate("updateCurrentActionBar", this.currentPos);
            this.currentPos++;
            if (this.currentPos >= this.current.length) {
                curAction = undefined;
                break;
            }
            curAction = this.current[this.currentPos];
        }
        return curAction;
    };

    getErrorMessage(action, state) {
        if (action.townNum !== state.curTown) {
            return `You were in zone ${curTown + 1} when you tried this action, and needed to be in zone ${action.townNum + 1}`;
        }
        if (action.canStart && !action.canStart(state)) {
            return "You could not make the cost for this action.";
        }
        return "??";
    };

    restart(state) {
        this.currentPos = 0;
        this.completedTicks = 0;
        state.curTown = 0;
        state.towns[0].suppliesCost = 300;
        if (state === player) view.requestUpdate("updateResource","supplies");
        state.curAdvGuildSegment = 0;
        state.curCraftGuildSegment = 0;
		state.curWizCollegeSegment = 0;
        state.curFightFrostGiantsSegment = 0;
        state.curFightJungleMonstersSegment = 0;
        state.curThievesGuildSegment = 0;
        for (const town of state.towns) {
            for (const action of town.totalActionList) {
                if (action.type === "multipart") {
                    town[action.varName] = 0;
                    town[`${action.varName}LoopCounter`] = 0;
                }
            }
        }
        state.guild = "";
        state.escapeStarted = false;
        state.portalUsed = false;
        totalMerchantMana = 7500;
        if (options.keepCurrentList && (state === player)) {

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
        if ((this.current.length === 0) && (state === player)) {
            pauseGame();
        }
        this.adjustTicksNeeded(state);
        if (state === player) {
            view.requestUpdate("updateMultiPartActions");
            view.requestUpdate("updateNextActions");
            view.requestUpdate("updateTime");
        }
    };

    adjustTicksNeeded(state) {
        let remainingTicks = 0;
        for (let i = this.currentPos; i < this.current.length; i++) {
            const action = this.current[i];
            this.setAdjustedTicks(action, state);
            remainingTicks += action.loopsLeft * action.adjustedTicks;
        }
        this.totalNeeded = this.completedTicks + remainingTicks;
        if (state === player) view.requestUpdate("updateTotalTicks", null);
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

    setAdjustedTicks(action, state) {
        let newCost = 0;
        for (const actionStatName in action.stats){
            newCost += action.stats[actionStatName] / (1 + getLevel(actionStatName, state) / 100);
        }
        action.rawTicks = action.manaCost(state) * newCost - 0.000001;
        action.adjustedTicks = Math.max(1, Math.ceil(action.rawTicks));
    };

    addExpFromAction(action, state) {
        const adjustedExp = action.expMult * (action.manaCost(state) / action.adjustedTicks);
        for (const stat in action.stats) {
            const expToAdd = action.stats[stat] * adjustedExp * getTotalBonusXP(stat, state);
            const statExp = `statExp${stat}`;
            if (!action[statExp]) {
                action[statExp] = 0;
            }
            action[statExp] += expToAdd;
            addExp(stat, expToAdd, state);
        }
    };

    markActionsComplete(loopCompletedActions, state) {
        loopCompletedActions.forEach(action => {
            let varName = Action[withoutSpaces(action.name)].varName;
            if (!state.completedActions.includes(varName)) state.completedActions.push(varName);
        });
    };
    
    actionStory(loopCompletedActions, state) {
        loopCompletedActions.forEach(action => {
            let completed = action.loops - action.loopsLeft;
            if (action.story !== undefined) action.story(completed, state);
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