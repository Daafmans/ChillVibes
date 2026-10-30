# Balance bots

*Status: draft v0.1. These bots play the real game code (`game/*.js`) so that balance changes can be measured against the targets in `08-balance.md`. They are rough stand-ins for players, not good players. Read their results as "is this in the right range", not as exact turn counts.*

## Overview

| Bot | Lives in | Run with | Purpose |
|---|---|---|---|
| Idle | `tools/test.html` | `tools/run-tests.ps1` | Only ends turns. Measures how fast blight kills a player who does nothing. |
| General | `tools/test.html` | `tools/run-tests.ps1`, `node tools/balance-pacing.js` | Uses every system sensibly but never aims at a win. Measures economic pacing. |
| Temple | `tools/balance-paths.js` | `node tools/balance-paths.js temple` | Commits to the Ancient Temple victory. |
| Economy | `tools/balance-paths.js` | `node tools/balance-paths.js economy` | Commits to the economic victory (Economic Dominion). |
| Awaken | `tools/balance-paths.js` | `node tools/balance-paths.js awaken` | Commits to the awakened-sites victory (Ancient Rites). |

The Node scripts take config overrides as `key=value` (for example `winUpgrades=14`), and `tools/test.html` takes them as a query string (`?winUpgrades=14`). Neither changes `game/config.js`.

## Idle bot
- Does nothing but end the turn, for up to 400 turns on seeds 1, 2 and 3.
- Reports the turn it lost, the blight size and the number of pustules.
- **Target:** loses around turn 80 (see "Win conditions" in `08-balance.md`).

## General bot
`play(seed, 'bot', maxTurns)` in `tools/test.html`. Each turn, in this order:
1. **Ancient sites:** activates every unused site. Prefers `cleanse` while any blight exists, otherwise `settlement`, then `explore`, `features`, `bundle`.
2. **Projects:** while materials reach the threshold, takes a **random** offered project.
3. **Upgrades:** for each settlement without one, if Wealth allows, buys the upgrade with the highest `upgradeScore`. That is a rough value of the upgrade for that settlement in resources per turn (a site counts as about 8 per turn).
4. **Settlements:** founds up to 5 per turn, greedily. A spot scores 1 per unclaimed, unblighted tile it would claim, minus 0.05 × its distance from the start. It only founds if the best spot scores at least 12.
5. **Explore:** picks a random legal frontier tile.

`tools/run-tests.ps1` runs it on seeds 1–4 for 300 turns. `tools/balance-pacing.js` runs it on seeds 1–8 for 150 turns and prints:
- the turn of each new settlement and each project (first 12),
- snapshots at turns 10, 30 and 60: settlements, projects, sites, upgrades, known tiles, income and banked resources.

**Limits**
- It never pursues a win, so it rarely wins. Use it for pacing (how fast settlements, projects and income grow), not for win turns.
- It explores with `Math.random`, so results change a little between runs even on the same seed.
- `balance-pacing.js` copies `upgradeScore` and `play` out of `tools/test.html` by searching the file's text. Renaming or moving those functions breaks it.

## Committed bots
`tools/balance-paths.js`, seeds 1–8, 150-turn cap. Each bot follows one win path. They share most of their logic and differ in project order, upgrade preference and how they explore.

| Bot | Project order (then random) | Upgrade preference | Explores |
|---|---|---|---|
| Temple | Surveyor's Eye → Seafaring → Cartography → Ruin Lore → Awakening → Wayfinders → Open Frontier | Survey Post | the legal tile closest to the temple |
| Economy | Surveyor's Eye → Glorious Capital → Trade Empire → Merchant Guilds → Economic Dominion | Trading Post, Market Town, Survey Post | wide: the tile with the most hidden neighbours |
| Awaken | Surveyor's Eye → Ancient Sight → Pilgrimage → Legacy of Distance → Ancient Rites → Bountiful Sites | Shrine Keeper | wide: the tile with the most hidden neighbours |

The fifth project in each order completes the win path. The bot records that turn as "unlocked".

Each turn, in this order:
1. **Ancient sites:** activates every site as many times as allowed (Shrine Keepers add activations). The awaken bot always picks `awaken` once it has Ancient Rites. Otherwise it prefers `cleanse` while any blight exists, then `settlement`, `explore`, `bundle`. It never takes `features`.
2. **Projects:** while materials reach the threshold, takes the next project in its order that is on offer, otherwise a random offered one.
3. **Upgrades:** for each settlement without one, if Wealth allows, buys the first preferred upgrade on offer, otherwise the first upgrade on offer.
4. **Settlements:** the same greedy rule as the general bot (score ≥ 12, up to 5 per turn). The temple bot measures distance from the temple instead of the start, so it settles toward it.
5. **Explore:** with Open Frontier it also considers tiles within `openFrontierRadius` of its settlements. Ties are broken by the game's seeded RNG, so runs are repeatable.
6. **Temple:** once a temple tile is known, the bot awakens it. That only works once Awakening is taken.

Output: for each path, how many of the 8 seeds won and on which turns. With `-v` it adds a line per seed: the result, the unlock turn, the turn the temple was found, final settlements, upgrades, sites, awakenings, projects, known tiles, nearest known tile to the temple, final banks, and the turns of the first 15 settlements.

**Limits**
- **The temple bot cheats:** it knows where the temple is from turn 1. It stands in for a player who follows the ruin trail perfectly, so humans will be somewhat slower.
- **Every bot picks projects off its path at random**, so it may skip useful projects such as Wayfinders for the economy bot.
- The economy bot does not plan Trading Post neighbours. It upgrades in settlement order.
- The awaken bot does not place settlements to stack Shrine Keepers near sites. Its fast wins come from luck in where sites and settlements land.
- No bot plays around blight beyond cleansing with sites. They never avoid placing near pustules.

## Reading the results
- **Win turns** from the committed bots should fall around turns 50–70, the target in `08-balance.md`. If a path is well below that, it is too easy; if it often doesn't win in 150 turns, it is out of reach.
- **The spread** between seeds matters as much as the median. A path that wins anywhere from turn 24 to turn 150 depends on the map more than on play.
- **Banked resources** that keep piling up mean that resource has nothing worth spending on.
- After a change, run the tests first (`tools/run-tests.ps1`), then `node tools/balance-paths.js all`, and record notable results in `08-balance.md`.

## Adding a bot
To measure a new win path, add an entry to `STRATS` in `tools/balance-paths.js` with:
- `path`: project ids in order, with the project that completes the win path fifth (or change the `S.path[4]` check),
- `ups`: upgrade ids in order of preference.

Point to the bot in `08-balance.md` too. Then add any special behaviour (for example how it activates sites or explores) next to the existing `name === ...` checks.
