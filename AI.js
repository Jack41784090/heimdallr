/* eslint-disable space-infix-ops */
const Discord = require('discord.js');
const client = new Discord.Client();
const conF = require('./functions.js');
const f = new conF();

class AI
{
	// returns an allStats of all actions
	// AI #1: Go to closest enemy
	closest(stat, allStats, bx, by, ignore = ['block'])
	{
		if (!ignore.includes('block')) ignore.push('block');
		const resultActions = [stat.name];
		// 1. find closest enemy
		const closestEnemy = f.findClosestEntity(allStats, stat, ignore);
		const distanceFromStart = f.findDistance(stat, closestEnemy);

		// reject: no enemies
		if (!closestEnemy) return [stat.name];

		f.logJSON(`${stat.name} Target`, closestEnemy);
		// 2. show valid coords
		const validCoords = [
			{
				x: closestEnemy.x - 1,
				y: closestEnemy.y,
			},
			{
				x: closestEnemy.x + 1,
				y: closestEnemy.y,
			},
			{
				x: closestEnemy.x,
				y: closestEnemy.y - 1,
			},
			{
				x: closestEnemy.x,
				y: closestEnemy.y + 1,
			},
		];
		f.log(`${stat.name} target coords`);
		f.log(validCoords);

		const resultPaths = [];
		// 3. draw path to valid coordinates
		function findPath(gx, gy, gr, path = [], pastCoords = [], pattern = [])
		{
			if (path[path.length - 1]) pattern.push(path[path.length-1]);
			// f.log(`${stat.name}'s Pattern:`);
			// f.log(pattern);
			// f.log(`gx: ${gx}; gy: ${gy}`);
			// f.log(path);

			const distance = f.findDistance({ x: gx, y: gy }, closestEnemy);
			// BAD ROUTES
			// 1. out of bounds
			if (gx < bx[0] || gx > bx[1] || gy < by[0] || gy > by[1])
			{
				return;
			}

			// 2. overwhelming readiness required
			if (Math.abs(gr - stat.readiness) > 100)
			{
				// f.log(`${pathReadiness} > 50`);
				return;
			}

			// 3. illegal pattern
			if (pattern.length > 1)
			{
				const resetFirst = path[path.length - 1];
				const counterAxis = pattern[0] ? f.counterAxis(pattern[0][0]) : null;
				const axis = pattern[0] ? pattern[0][0] : null;
				const moveInCounter = pattern[1][0] === counterAxis;
				const moveInDiffDirect = pattern[2] ? pattern[2][0] === axis && pattern[2][1] === (Math.sign(pattern[0][1]) * -1) : null;

				if (pattern.length >= 2 && !moveInCounter)
				{
					// f.log("Reset 2");
					// f.log(pattern);
					pattern = [resetFirst];
					// f.log(pattern);
				}

				if (pattern.length >= 3 && !moveInDiffDirect)
				{
					// f.log("Reset 3");
					// f.log(pattern);
					pattern = [resetFirst];
				}
				else if (pattern.length >= 3 && moveInDiffDirect)
				{
					// f.log(`Bad Pattern: ${pattern}`);
					return;
				}
				else if (pattern.length > 3)
				{
					f.log(`Ok: ${pattern}`);
				}

			}

			// 4. too far away
			if (distance > distanceFromStart + distanceFromStart / 2)
			{
				f.log(`Cutting: ${distance} ( distance from start : ${distanceFromStart} )`);
				return;
			}

			// ***RECURSION FINISHLINE***
			if (validCoords.reduce((valid, coord) => {
				// f.logJSON("valid", coord);
				return coord.x == gx && coord.y == gy ? true : valid;
			}, false))
			{
				resultPaths.push([path, Math.abs(gr - stat.readiness)]);
				return;
			}

			// 2.1. find obstacles
			// 2.2. find backtracks
			const xP1 = allStats.filter(c => c.x === gx + 1 && c.y === gy);
			const xP1B = pastCoords.reduce((backtrack, coord) => {
				return coord.x == gx + 1 && coord.y == gy ? true : backtrack;
			}, false);
			// console.log(`xP1B: ${xP1B}`);

			const xM1 = allStats.filter(c => c.x === gx - 1 && c.y === gy);
			const xM1B = pastCoords.reduce((backtrack, coord) => {
				return coord.x == gx - 1 && coord.y == gy ? true : backtrack;
			}, false);
			// console.log(`xM1B: ${xM1B}`);

			const yP1 = allStats.filter(c => c.x === gx && c.y === gy + 1);
			const yP1B = pastCoords.reduce((backtrack, coord) => {
				return coord.x == gx && coord.y == gy + 1 ? true : backtrack;
			}, false);
			// console.log(`yP1B: ${yP1B}`);

			const yM1 = allStats.filter(c => c.x === gx && c.y === gy - 1);
			const yM1B = pastCoords.reduce((backtrack, coord) => {
				return coord.x == gx && coord.y == gy - 1 ? true : backtrack;
			}, false);
			// console.log(`yM1B: ${yM1B}`);

			// 2.3 going into next recursion
			const lastDirection = path[path.length - 1] || [undefined];
			let newPath = path;
			if (!xP1B && !xP1[0])
			{
				// if (lastDirection[0] == "x" && Math.sign(lastDirection[1]) === 1)
				// {
				// 	newPath[newPath.length-1][1]++;
				// 	newPath[newPath.length-1][2] = 7 * Math.abs(lastDirection[1]);
				// 	f.log(`newPath: ${newPath}`);
				// }
				// else
				{
					newPath = path.concat([["x", 1, 7]]);
				}
				findPath(gx + 1, gy, gr - 7, newPath, pastCoords.concat({ x: gx, y: gy }), pattern);
			}
			if (!xM1B && !xM1[0])
			{
				// if (lastDirection[0] == "x" && Math.sign(lastDirection[1]) === -1)
				// {
				// 	newPath[newPath.length-1][1]--;
				// 	newPath[newPath.length-1][2] = 7 * Math.abs(lastDirection[1]);
				// 	// f.log(newPath);
				// }
				// else
				{
					newPath = path.concat([["x", -1, 7]]);
				}
				findPath(gx - 1, gy, gr - 7, newPath, pastCoords.concat({ x: gx, y: gy }), pattern);
			}
			if (!yP1B && !yP1[0])
			{
				// if (lastDirection[0] == "y" && Math.sign(lastDirection[1]) === 1)
				// {
				// 	newPath[newPath.length-1][1]++;
				// 	newPath[newPath.length-1][2] = 7 * Math.abs(lastDirection[1]);
				// 	// f.log(newPath);
				// }
				// else
				{
					newPath = path.concat([["y", 1, 7]]);
				}
				findPath(gx, gy + 1, gr - 7, newPath, pastCoords.concat({ x: gx, y: gy }), pattern);
			}
			if (!yM1B && !yM1[0])
			{
				// if (lastDirection[0] == "y" && Math.sign(lastDirection[1]) === -1)
				// {
				// 	newPath[newPath.length-1][1]--;
				// 	newPath[newPath.length-1][2] = 7 * Math.abs(lastDirection[1]);
				// 	// f.log(newPath);
				// }
				// else
				{
					newPath = path.concat([["y", -1, 7]]);
				}
				findPath(gx, gy - 1, gr - 7, newPath, pastCoords.concat({ x: gx, y: gy }), pattern);
			}
		}

		findPath(stat.x, stat.y, stat.readiness);

		// 4. detect valid paths
		if (resultPaths[0])
		{
			// 4.2. find the best path from results
			const optimalResult = resultPaths.reduce((optimum, path) => {
				// f.log(path);
				return path[1] <= optimum[1] ? path : optimum;
			}, [[], 100]);

			// f.logJSON("optimalResult", optimalResult);

			// 4.3 check if readiness is enough
			let requiredReadiness = 0;
			optimalResult[0].forEach(move => {
				// push full move
				requiredReadiness += move[2];
				if (stat.readiness >= requiredReadiness)
				{
					resultActions.push(move);
				}
				else if (move[0] === 'x' || move[0] === 'y')
				{
					// f.log(`${stat.name} cannot move: ${move}`);
					// const missingReadiness = Math.floor(requiredReadiness - stat.readiness);
					// const missingSteps = Math.floor(missingReadiness / 7);
					// const modifiedStep = [move[0], (Math.sign(move[1]) > 1 ? -1 : 1) * missingSteps + move[1], 7 * Math.abs(missingSteps)];
					// f.log(modifiedStep);
					// resultActions.push(modifiedStep);
				}
			});

			// 5. if within range and has readiness, attack
			if (stat.readiness >= optimalResult[1] + 15)
			{
				// attack
				resultActions.push(["attack", closestEnemy, 15]);
			}
		}

		f.log(`Result for ${stat.name}`);
		f.log(resultActions);
		return resultActions;
	}

	// AI #2: match x and y with closest enemy
	matchClosest(stat, allStats, bx, by, ignore = ['block'])
	{
		if (!ignore.includes('block')) ignore.push('block');
		const resultActions = [stat.name];
		// 1. find closest enemy
		const closestEnemy = allStats.reduce((closest, player) => {
			if (player.bot && ignore.includes(player.bot.type)) return closest;
			if (player.name == stat.name) return closest;
			const distance = f.findDistance(stat, player);
			const oldD = f.findDistance(closest, player);
			return !oldD ? player : distance < oldD ? player : closest;
		}, {});
		// f.logJSON(`closestEnemy`, closestEnemy);

		// reject: no enemies
		if (!closestEnemy) return resultActions;

		// f.logJSON(`Target`, closestEnemy);

		// 3. try matching coords
		const xDir = closestEnemy.x < stat.x ? -1 : 1;
		const yDir = closestEnemy.y < stat.y ? -1 : 1;
		const xMag = Math.abs(closestEnemy.x - stat.x);
		const yMag = Math.abs(closestEnemy.y - stat.y);
		const xMove = f.blockadeMagReduction(allStats, stat, 'x', xMag * xDir);
		const yMove = f.blockadeMagReduction(allStats, { name: stat.name, x: stat.x + xMove, y: stat.y }, 'y', yMag * yDir);
		// f.log(`xMag: ${xMag}; statx: ${stat.x}; enemyX: ${closestEnemy.x}`);
		// f.log(`yMag: ${yMag}; staty: ${stat.y}; enemyY: ${closestEnemy.y}`);

		// xMove
		let requiredReadiness = 0;
		let xActual = 0;
		while (stat.readiness > requiredReadiness && xActual != xMove)
		{
			xActual += xDir;
			requiredReadiness += 7;
		}

		// yMove
		let yActual = 0;
		while (stat.readiness > requiredReadiness && yActual != yMove)
		{
			yActual += yDir;
			requiredReadiness += 7;
		}

		if (xActual) resultActions.push(['x', xActual, 7 * Math.abs(xActual)]);
		if (yActual) resultActions.push(['y', yActual, 7 * Math.abs(yActual)]);
		return resultActions;
	}
}

module.exports = AI;