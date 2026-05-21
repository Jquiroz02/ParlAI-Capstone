## Architecture Overview

<li>
BetSlipContext.js: Holds the user's current selections, handles the logic of adding/removing bets, and tracks errors/warnings.
<li>
betPayload.js: Contains business logic (isBettingClosed, payload formatting, market keys).
<li>
SportsLayout.jsx: Wraps all sports routes and renders the global 'GlobalBetSlipFooter' component at the bottom of the screen.

## Implementation For your sport

Call useGlobalBetSlip from the context
Grab the handlers for selection, toggleSelection, and pruneSelectionsForGames
ex.
`const { selections, toggleSelection, pruneSelectionsForGames } = useGlobalBetSlip();`

**Selections** is an array of all the selected bets. This is directly linked to toggleSelection. Selections is an array of bet objects.

Ex. a soccer object can look like this:

- gameId: 01,
- leagueId: 700, (Premier league)
- sport: 'soccer',
- marketKey: 55,
- selectionId: 100,
- outcomeLabel: Manchester City,
- odds: 2.1,
- lineValue: 1.5 or null, (This value is based on the betType/market key/selection id)
- gameName: Manchester City vs Arsenal,
- betType: Moneyline,
- betTeam: Manchester City,

For each game within your sport, you need to pass the **toggleSelection** function to it. You would need to make your sports bet object like shown above and pass it to the toggleSelection function.

Once it is passed to toggle selection, it is placed in the selections array.

**pruneSelectionsForGames** removes a bet from the betslip if the game has has started, finished, been cancelled or doesn't exist anymore from the database. You can add more statuses if needed from the betPayload.js file.

## Backend Function endpoints

**getGames**: This file has been refactored from get-soccer-games to get-games. Now, you can get the scores and odds of all the games from the db based on the start and end date along with the league.
As long as you put the scores and odds from the API into the database by following the schema, it should work for your sport. So make sure when you set up your score ingestion and odds ingestion backend functions, you take the right data and pass it to the correct attributes. **_Feel free to modify this file to add more betting types for your sport._**

It's usage can be seen the in the getSoccerGames file:

It will fetch games for the Premier league from 2 days before up to 14 days in the future through the headers.

Then it organizes each received game object into a formatted object so that your frontend can use them.

For your sport, you will also need to make something like the getSoccerGames file so that you can format the object from the backend. **Just make modifications to allow your other bet types or game attributes.**

**place-bets**: This file is what takes the user selected bets and places it into the db. You don't need to worry about doing anything with this, the only important part is that your payload structure is correct. As long as your selections object has: sport, leagueId, eventId, selectionId, marketKey, outcomeLabel, odds, lineValue, you should be good.

Now we need to evaluate and see which bets would win so we can decide how to payout users. For this, we need the globalGrading.js function under the backend/evaluation folder.

**globalGrading**: This function is called within your scores ingesting function. Since that function should constantly get the scores and status of games, you will pass this function in it:

```
await gradeEventSelections(
                pool,
                dbEvent.id,
                'soccer',
                homeScore,
                awayScore,
                rawHomeName,
                rawAwayName,
              );
```

The grade function will get all pending games and assign which bet won or lost. You may need to add some more functionality to this for your sport. Currently it can evaluate 'h2h', but for 'spreads' and 'totals' you will need to make a file just for your sport to evaluate it. Once the bets are graded and the winners/losers are assigned, the file will call the **processSettledBets** function.

**process-bet-results.js**: This will take all the bets where the payout status is pending and confirm whether the bet is successful or not. It takes into consideration straight bets and parlays. It will then payout the bet amount to the user.
