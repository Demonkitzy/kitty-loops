"use strict";
class Town {

    constructor(index) {
        this.index = index;
        this.varNames = [];
        this.progressVars = [];
        this.totalActionList = [];
        

        for (const action of totalActionList) {
            if (this.index === action.townNum) {
                this.totalActionList.push(action);
                if (action.type === "limited") this.createVars(action.varName);
                if (action.type === "progress") this.createProgressVars(action.varName);
                if (action.type === "multipart") {
                    this[action.varName] = 0;
                    this[`${action.varName}LoopCounter`] = 0;
                }
            }
        }
    }

    unlocked(player) {
        return player.townsUnlocked.includes(this.index);
    };

    expFromLevel(level) {
        return level * (level + 1) * 50;
    };

    getLevel(varName) {
        return Math.floor((Math.sqrt(8 * this[`exp${varName}`] / 100 + 1) - 1) / 2);
    };

    restart(state) {
        for (let i = 0; i < this.varNames.length; i++) {
            const varName = this.varNames[i];
            this[`goodTemp${varName}`] = this[`good${varName}`];
            this[`lootFrom${varName}`] = 0;
            if (state === player) view.requestUpdate("updateRegular",{name: varName, index: this.index});
        }
    };

    finishProgress(varName, expGain, state) {
        // return if capped, for performance
        if (this[`exp${varName}`] === 505000 && (state === player) ) {
            if (options.pauseOnComplete) pauseGame();
            else return;
        }

        const prevLevel = this.getLevel(varName);
        if (this[`exp${varName}`] + expGain > 505000) {
            this[`exp${varName}`] = 505000;
        } else {
            this[`exp${varName}`] += expGain;
        }
        const level = this.getLevel(varName);
        if (level !== prevLevel && (state === player) ) {
            view.requestUpdate("updateLockedHidden", null);
            adjustAll(state);
            for (const action of totalActionList) {
                if (state.towns[action.townNum].varNames.indexOf(action.varName) !== -1) {
                    view.requestUpdate("updateRegular", {name: action.varName, index: action.townNum});
                }
            }
        }
        if (state === player) view.requestUpdate("updateProgressAction", {name: varName, town: player.towns[player.curTown]});
    };

    getPrcToNext(varName) {
        const level = this.getLevel(varName);
        const expOfCurLevel = this.expFromLevel(level);
        const curLevelProgress = this[`exp${varName}`] - expOfCurLevel;
        const nextLevelNeeds = this.expFromLevel(level + 1) - expOfCurLevel;
        return Math.floor(curLevelProgress / nextLevelNeeds * 100 * 10) / 10;
    };

    // finishes actions that have checkable aspects
    finishRegular(varName, rewardRatio, rewardFunc, state) {
        // error state, negative numbers.
        if (this[`total${varName}`] - this[`checked${varName}`] < 0) {
            this[`checked${varName}`] = this[`total${varName}`];
            this[`good${varName}`] = Math.floor(this[`total${varName}`] / rewardRatio);
            this[`goodTemp${varName}`] = this[`good${varName}`];
            console.log("Error state fixed");
        }

        // only checks unchecked items 
        // IF there are unchecked items 
        // AND the user has not disabled checking unchecked items OR there are no checked items left
        const searchToggler = document.getElementById(`searchToggler${varName}`);
        if (this[`total${varName}`] - this[`checked${varName}`] > 0 && ((searchToggler && !searchToggler.checked) || this[`goodTemp${varName}`] <= 0)) {
            this[`checked${varName}`]++;
            if (this[`checked${varName}`] % rewardRatio === 0) {
                this[`lootFrom${varName}`] += rewardFunc();
                this[`good${varName}`]++;
            }
        } else if (this[`goodTemp${varName}`] > 0) {
            this[`goodTemp${varName}`]--;
            this[`lootFrom${varName}`] += rewardFunc();
        }
        if (state === player) view.requestUpdate("updateRegular", {name: varName, index: this.index});
    };

    createVars(varName) {
        if (this[`checked${varName}`] === undefined) {
            this[`checked${varName}`] = 0;
        }
        if (this[`goodTemp${varName}`] === undefined) {
            this[`goodTemp${varName}`] = 0;
        }
        if (this[`good${varName}`] === undefined) {
            this[`good${varName}`] = 0;
        }
        if (this[`lootFrom${varName}`] === undefined) {
            this[`lootFrom${varName}`] = 0;
        }
        if (this[`total${varName}`] === undefined) {
            this[`total${varName}`] = 0;
        }
        if (this.varNames.indexOf(varName) === -1) {
            this.varNames.push(varName);
        }
    };

    createProgressVars(varName) {
        if (this[`exp${varName}`] === undefined) {
            this[`exp${varName}`] = 0;
        }
        if (this.progressVars.indexOf(varName) === -1) {
            this.progressVars.push(varName);
        }
    };
}