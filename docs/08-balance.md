# Balance intent

*Status: draft v0.1. This doc says what the numbers in `07-config.md` are **for**. When a value is tuned, check it against the targets here. If a target turns out to be wrong, change the target here first, then the numbers. Guesses are marked **[ASSUMPTION]**.*

## Session length
- **A single game takes about 30 minutes**, from the first turn to a win or a loss.
- This counts for a player who knows the rules but not the map. A first game may run longer, and an expert's may run shorter.
- A game that has clearly been decided (a sure win or a sure loss) should not drag on for long after that point.

### Turn budget
- **[ASSUMPTION]** An average turn takes about **30 seconds**. Early turns are quick (one explore, maybe a settlement). Later turns take longer (more settlements, projects, sites and blight to read).
- That gives a target of roughly **50–70 turns** per game, about **60** on average.
- Measure real turn times in playtests and update this budget. All the turn-based targets below follow from it.

## Pacing targets
These line up with the tension curve in `02-core-loop.md`.

| Phase | Turns | Real time | What should have happened |
|---|---|---|---|
| Opening | 1–7 | ~3 min | 2–3 settlements founded, first project taken, a first idea of the nearby land. |
| Blight arrives | 8–25 | ~9 min | First pustules are spreading. The player has a direction and a likely win condition in mind. |
| Middle | 25–45 | ~10 min | Projects have changed the rules noticeably. Blight forces real choices about where to expand. |
| Endgame | 45–60 | ~8 min | Racing toward one win condition while blight closes in. |

## Win conditions
- Each win condition should be reachable in about **50–70 turns** by a player who commits to it.
- No single win condition should be clearly the fastest in most games. Which one is best should depend on the map and on the projects taken.
- A player who doesn't commit to anything should usually lose to blight before turn ~80.

## Loss
- Blight should be a real threat from about turn 25 onward, not only in the last few turns.
- A loss should be readable: the player should be able to see it coming several turns ahead and know what they could have done differently.
- Losing before turn ~20 should be rare and should only happen to clearly careless play.

## Tuning decisions
Changes made to fit the 30-minute target, with the reasoning behind them.
- **Settlement-count victory removed.** With `settlementBaseCost` 40 and `settlementCostGrowth` 1.45, 20 settlements cost about 150,000 Food in total, far out of reach in ~60 turns. Settlements are now a means, not a goal.
- **Ancient Temple moved closer: 80–120 tiles** (was 600–800). One explore per turn pushes the frontier about one tile, so ~60 turns alone gets about 60 tiles out. The rest has to come from projects (Wayfinders, Open Frontier, site explores), which makes committing to the temple a real choice rather than out of reach. With `ruinStepMin`..`ruinStepMax` at 15–30, the trail has about 4–9 ruins (seeds 1, 2, 3, 42, 777 give 9, 4, 7, 5, 7).
- **Blight sped up: first pustule on turn 8, then every 6 turns** (was 10 / 10). A 60-turn game now sees about 9 pustules instead of 6, so blight is a threat by the middle phase and not only in the endgame.

## Economy

### Targets
- **Opening:** the 2nd settlement around turn 4–5, 3 settlements by turn 7. Starting income is about 25 Food, so the first settlement should cost about three turns of it.
- **Expansion:** about 8 settlements by turn 25 and 12–15 by turn 60. Expansion slows down but never stops dead in a 60-turn game.
- **Projects:** a committed player unlocks their win path (5 projects deep for every path) around turns 13–22. That is after blight arrives, and in time for the "player has a direction" point in the pacing table.
- **Upgrades:** Wealth, not Food, limits how many upgrades a player has. Upgrading every settlement should take real commitment.
- **Economic victory:** reachable around turns 50–65 by a player who commits to it.

### Values
| Key | Was | Now | Why |
|---|---|---|---|
| `settlementBaseCost` | 40 | 80 | The opening was too fast: 4–5 settlements by turn 7. Now 2–3. |
| `settlementCostGrowth` | 1.45 | 1.35 | Gentler curve, so expansion keeps going through the middle phase instead of hitting a wall at about 14. |
| `projectBase` | 60 | 80 | Win paths unlocked as early as turn 10. Now mostly turns 12–24 (one outlier at 33). |
| `upgradeBaseCost` | 30 | 40 | With `winUpgrades` 12, the economic victory came too early (turns 33–51). |
| `winUpgrades` | 20 | 12 | 20 upgraded settlements never happened within 150 turns. Upgrade costs grow 1.45× per upgrade, so Wealth caps out around 13–14 upgrades in a 60-turn game. |

### Measured
Simple bots that each commit to one win path, 8 seeds, 150-turn cap (`node tools/balance-paths.js`; the bots are described in `09-balance-bots.md`). The temple bot knows where the temple is (it stands in for Ruin Lore), so a human will be a little slower.

| Win path | Before | After |
|---|---|---|
| Ancient Temple | 8/8, turns 33–57 | 8/8, turns 38–63 |
| Economic victory | 0/8 | 7/8, turns 47–68 |
| Awakened sites | 6/8, turns 24–115 | 5/8, turns 56–150 |

An idle player still loses to blight on turns 68–82.

## Balance tools
Both scripts run the real game code in Node and accept config overrides as `key=value`, so you can try values without editing `game/config.js`.
- `node tools/balance-paths.js [temple|economy|awaken|all] [-v] [key=value ...]`: bots that each commit to one win path, 8 seeds. Prints the win turns per path; `-v` adds per-seed details (unlock turn, settlement turns, final banks).
- `node tools/balance-pacing.js [key=value ...]`: the general bot from `tools/test.html`, 8 seeds. Prints settlement and project turns and snapshots at turns 10, 30 and 60.

Example: `node tools/balance-paths.js economy winUpgrades=14 upgradeCostGrowth=1.35`

## To check in playtests
- Is the temple now too easy to reach by just walking toward it? If so, push `templeMinDistance` out, or lengthen the ruin steps.
- Does the opening feel too slow now? The 2nd settlement takes about 4 turns.
- Does blight end most uncommitted games before turn ~80?
- **Awakened sites is the outlier.** How fast it goes depends on how many sites are near the start and how many Shrine Keepers stack on them. A cluster of Shrine Keepers can win very early, and a map with few nearby sites can take 150 turns. This is about site density (`siteChance`), `shrineKeeperRadius`, and `winAwakened`, not the economy.
