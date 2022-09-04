function loadChallenge() {
    switch (challengeSave.challengeMode) {
        case 1:
            gameSpeed = 2;

            Action.BuyManaZ1.canStart = function(player) {return totalMerchantMana > 0}
            Action.BuyManaZ1.manaCost = function(player) {return 1;}
            Action.BuyManaZ1.goldCost = function(player) {return 30;}
            Action.BuyManaZ1.finish = function(player) {
                let spendGold = Math.min(resources.gold, 300);
                let buyMana = Math.min(spendGold * this.goldCost(player), totalMerchantMana);
                addMana(buyMana);
                totalMerchantMana -= buyMana;
                addResource("gold", -spendGold, player);
            }

            Action.BuyManaZ3.visible = function() {return false;}
            Action.BuyManaZ5.visible = function() {return false;}
            break;
        case 2:
            getSelfCombat = function() {
                return Math.max(getZombieStrength(), getTeamStrength()) / 2;
            }
            getTeamCombat = function() {
                return getZombieStrength() + getTeamStrength();
            }
            break;
        case 3:
            restart = function() {
                shouldRestart = false;
                timer = 0;
                timeCounter = 0;
                effectiveTime = 0;
                timeNeeded = 4320000 - totals.effectiveTime*50;
                document.title = "Idle Loops";
                resetResources();
                restartStats();
                for (let i = 0; i < towns.length; i++) {
                    towns[i].restart(player);
                }
                view.requestUpdate("updateSkills");
                actions.restart(player);
                view.requestUpdate("updateCurrentActionsDivs");
            }
            break;
    }
}