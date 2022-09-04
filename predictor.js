/* Key points needed:
Needs to copy the action list
Needs to copy the player
Needs to tick through all of the actions
As it ticks through, needs to keep track of when the run ends
Needs to track mana and resources at end of each action set
Will need some way to then show these resources
*/

class Predictor {
    constructor() {
        this.state = player.deepCopy();
        this.state.visual = false;
        this.actionList = deepCopyObject(actions);
        this.actionResults = [];
        this.currPos = 0;
        this.negTimer = 0;
        this.hitNegMana = false;
        this.ssCount = 0;
        this.restart();
    }

    tick() {
        while (!this.finished) {
            this.incrementTimers()
            let results = this.actionList.tick(this.state, this.timer);
            if (results["finished"]) {
                this.actionResults[this.currPos].manaLeft = (this.hitNegMana) ? this.negTimer + results.mana : results.mana;
                this.actionResults[this.currPos].resources = results.resources;
                if (this.currPos !== this.actionList.currentPos) this.currPos += 1;
                if (this.hitNegMana && (options.repeatLastAction && this.currPos >= this.actionList.current.length-1)) this.finished = true;
            }
            if (results['shouldRestart']) this.finished = true
            if (!this.ssCount && this.timer >= this.state.timeNeeded) {
                this.hitNegMana = true;
                this.actionResults[this.currPos].resources = results.resources;
                this.ssCount = this.state.ssCount;
            }
        }
        if (!this.hitNegMana) this.ssCount = this.state.ssCount;

    }

    incrementTimers() {
        this.timer++;
        this.timeCounter += 1 / baseManaPerSecond / getActualGameSpeed(this.state.curTown, this.state);
        this.effectiveTime += 1 / baseManaPerSecond / getSpeedMult(this.state.curTown, this.state);
        if (this.hitNegMana) {
            this.negTimer -= 1;
            this.state.timeNeeded += 1;
        }
    }
    
    restart() {
        this.timer = 0;
        this.finished = false;
        this.timeCounter = 0;
        this.effectiveTime = 0;
        this.state.timeNeeded = timeNeededInitial;
        this.state.ssCount = 0;
        this.currPos = 0;
        this.negTimer = 0;
        this.hitNegMana = false;
        this.ssCount = 0;
        resetResources(this.state);
        restartStats(this.state);
        for (let i = 0; i < player.towns.length; i++) {
            this.state.towns[i].restart(this.state);
        }
        this.actionList.restart(this.state);

        for (let i = 0; i < this.actionList.current.length; i++) {
            this.actionResults.push({"manaLeft": 0, "resources": {}});           
        }
    }
}