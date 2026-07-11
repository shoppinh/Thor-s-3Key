# Domain Context: Thor's 3Key

This document defines the core domain concepts and terminology for the team-based card battle game.

## Glossary of Terms

### Match
A complete game session played between two teams. A match consists of a series of individual duels and is won when one team completely eliminates all members of the opposing team.

### Duel
A 1v1 confrontation between the active player of each team. In each duel:
1. Each player is allocated 3 cards from a shuffled deck.
2. Players select a card group from the board.
3. Card values are summed using baccarat-style scoring (sum % 10, or 10 if sum % 10 is 0).
4. The higher baccarat score wins. Ties are broken by suit hierarchy (Diamonds > Hearts > Spades > Clubs), then by face value.
5. The losing player is eliminated from their team.

### Team Roster
The ordered list of players representing a team. During setup, rosters are loaded, validated, and can be manually reordered or shuffled. During a match, players are drawn from the front of the roster to participate in duels.

### Power-up
Strategic abilities allocated to teams during setup. Each team can have a maximum of 4 power-ups (max 2 of each type). Power-ups introduce gameplay variance and strategy:
* **Second Chance**: Force a run-back/re-duel if the team's player loses the duel.
* **Reveal Two**: Peeks at the first 2 cards of all 4 groups on the board before making a selection.
* **Life Shield**: Prevents player elimination for one round on a loss.
* **Remove Worst**: Eliminates the weakest card group on the board before selections begin.

## Architecture Guidelines

* **Seam Discipline**: Keep UI rendering fully decoupled from game rules and external database or spreadsheet integrations.
* **Deep State**: Orchestrate state changes, scoring, and history snapshots inside a single state machine.
* **Ports and Adapters**: Access external services (Google Sheets, Supabase) via ports/interfaces, keeping the domain logic independent of third-party clients and credentials.
