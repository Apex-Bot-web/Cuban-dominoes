/**
 * CLI proof-of-life: four bots play a complete match to 100 with full logging.
 * Run: npx tsx src/cli-sim.ts [seed]
 */
import { applyAction, createMatch, startNextHand } from './match.js';
import { botAction, type BotLevel } from './bots.js';
import { tileToString } from './tiles.js';
import type { MatchState } from './types.js';

const seed = Number(process.argv[2] ?? 2026);
const levels: BotLevel[] = ['duro', 'medio', 'duro', 'medio'];
const names = ['Yoel (duro)', 'Mari (medio)', 'Pipo (duro)', 'Caro (medio)'];

let match: MatchState = createMatch({}, seed);
console.log(`\n=== CUBAN DOUBLE-9 DOMINOES — seed ${seed}, target ${match.config.targetScore} ===`);
console.log(`Teams: [${names[0]} + ${names[2]}] vs [${names[1]} + ${names[3]}]\n`);

let safety = 100_000;
while (match.winnerTeam === undefined && safety-- > 0) {
  if (match.hand.result) {
    const r = match.hand.result;
    if (r.type === 'domino') {
      console.log(
        `  >>> ¡DOMINÓ! ${names[r.winnerSeat]} goes out. Team ${r.winnerTeam} scores ${r.points} ` +
          `(pips left: ${r.pipsBySeat.join('/')})`,
      );
    } else if (r.tie && r.winnerTeam === undefined) {
      console.log(`  >>> TRANQUE EMPATADO — ${r.teamPips[0]} vs ${r.teamPips[1]}. Nobody scores.`);
    } else {
      console.log(
        `  >>> ¡TRANQUE! Team pips ${r.teamPips[0]} vs ${r.teamPips[1]} — ` +
          `Team ${r.winnerTeam} scores ${r.points}`,
      );
    }
    console.log(`  SCORE: Team 0 = ${match.teamScores[0]}  |  Team 1 = ${match.teamScores[1]}\n`);
    if (match.winnerTeam !== undefined) break;
    const next = startNextHand(match);
    if (!next.ok) throw new Error(next.error);
    match = next.match;
    console.log(`--- Hand ${match.handNumber} (salida: ${names[match.hand.salida]}) ---`);
    continue;
  }

  if (match.handNumber === 1 && match.hand.board.length === 0) {
    console.log(`--- Hand 1 (salida: ${names[match.hand.salida]}) ---`);
  }

  const seat = match.hand.turn;
  const action = botAction(match.hand, seat, levels[seat]!, seed);
  const r = applyAction(match, action);
  if (!r.ok) throw new Error(`illegal bot action: ${r.error}`);
  match = r.match;

  if (action.type === 'play') {
    const ends = match.hand.board.length
      ? `ends [${match.hand.board[0]![0]}|${match.hand.board[match.hand.board.length - 1]![1]}]`
      : '';
    console.log(`  ${names[seat]} plays ${tileToString(action.tile)} ${action.side ?? ''} ${ends}`);
  } else {
    console.log(`  ${names[seat]} PASSES (toca la mesa)`);
  }
}

if (safety <= 0) throw new Error('did not terminate');

// The loop exits the moment a winner is decided — print that final hand's result.
const fr = match.hand.result;
if (fr) {
  if (fr.type === 'domino') {
    console.log(
      `  >>> ¡DOMINÓ! ${names[fr.winnerSeat]} goes out. Team ${fr.winnerTeam} scores ${fr.points} ` +
        `(pips left: ${fr.pipsBySeat.join('/')})`,
    );
  } else if (fr.winnerTeam !== undefined) {
    console.log(
      `  >>> ¡TRANQUE! Team pips ${fr.teamPips[0]} vs ${fr.teamPips[1]} — Team ${fr.winnerTeam} scores ${fr.points}`,
    );
  }
}
console.log(
  `\n=== MATCH OVER: Team ${match.winnerTeam} wins ` +
    `${match.teamScores[match.winnerTeam!]} to ${match.teamScores[(1 - match.winnerTeam!) as 0 | 1]} ` +
    `in ${match.handNumber} hands ===\n`,
);
