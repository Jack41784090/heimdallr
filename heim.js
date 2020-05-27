/* eslint-disable no-case-declarations */
const Discord = require('discord.js');
const client = new Discord.Client();
const ConvF = require('./functions.js');
const AIJS = require('./AI.js');
const AI = new AIJS();
const f = new ConvF();

// global variables
let allRPChannels;
let ike;

client.on('ready', async () => {
	// f.log(`Ready:`);
	ike = await client.fetchUser('262871357455466496');
	// f.log(ike);
	allRPChannels = await f.retrieveRPChannels();

	// arena
	// arenaSession();
	setInterval(f.arenaSession, 60 * 60 * 1000);
});

client.on('guildMemberAdd', (member) => {
	// f.log(member.guild);
	// welcoming
	const newEmbed = new Discord.RichEmbed(
		{
			"title": "Sound the horns!",
			"description": `${member} comes! We welcome them!`,
			"color": 0x00FF4D,
		});
	client.channels.get(member.guild.systemChannelID).send(newEmbed);
	const role = client.guilds.get(member.guild.id).roles.find(r => r.name == "Spectator");
	if (role) member.addRole(role);
});

client.on('guildMemberRemove', member => {
	const newEmbed = new Discord.RichEmbed(
		{
			"title": "Misfortune comes uninvited...",
			"description": `${member.user.username} has unfortunately left us.`,
			"color": 0xFF0000,
		}
	);
	client.channels.get(member.guild.systemChannelID).send(newEmbed);
});

client.on('message', async (m) => {
	const sender = m.author; // f.log(`Message from ${sender.username}`);
	const command = m.content.split(' ')[0].slice(2);
	const args = m.content.split(' ');	args.shift();
	let userData;
	let money = 0;
	await f.getDataBase().collection('World of Light').doc(sender.id).get().then(async q => {
		if (q.exists) {
			userData = q.data();
			if (q.data().name != sender.username)
			{
				userData.name = sender.username;
				await f.saveUserData(userData, sender.id);
			}
		}
		else
		{
			userData = {
				name: sender.username,
				stats: {},
				money: 50,
			};
			await f.saveUserData(userData, sender.id);
		}
	});

	async function sendMessageToCurrent(info)
	{
		return await m.channel.send(info)
			.then(mes => {return mes;});
	}
	// f.log(m);

	// activity money
	money++;

	// check RP mark
	if (allRPChannels.includes(m.channel.id))
	{
		if (!m.content.startsWith('(') && !m.content.startsWith('/'))
		{
			money += m.content.length / 10;
			m.react('👍');
		}
	}

	// bump reward
	if (sender.id == '302050872383242240' && m.channel.id == '565745319564804127')
	{
		if (!m.embeds[0].description.includes('Bump done')) return;

		// f.log(m.embeds[0].description);
		const des = m.embeds[0].description.split('');
		// f.log(des.includes('Bump done'));
		des.shift();
		des.shift();
		// f.log(des);

		let num = parseInt(des.shift());
		// f.log(num);
		const id = [];
		while(!isNaN(num))
		{
			// f.log(num);
			id.push(num);
			num = parseInt(des.shift());
		}
		// f.log(`Finish: id == ${id.join('')}`);
		const bumper = await client.fetchUser(id.join(''))
			.then(u => { return u.username; })
			.catch((err) => {
				// f.log(err);
				return "friend";
			});
		const goldCount = f.randomBetweenInt(50, 100);
		const bumperEmbed = new Discord.RichEmbed()
			.setTitle(`**Thank you, ${bumper}, for helping us grow. Here is some gold, for your efforts.**`)
			.setDescription(`You gained ${goldCount} gold.`);
		sendMessageToCurrent(bumperEmbed);
		f.addMoney(`${id.join('')}`, goldCount).then(() => {
			setInterval(() => {
			}, 2 * 60 * 60 * 1000);
		});
	}

	// is command
	if (m.content.startsWith('//'))
	{
		// f.log(`From ${sender.username}: ${command}`);

		// add RP channel ids to the list
		// if (command == 'addToRPs' && args.length && client.channels.find(args[0])) allRPChannels.push(args[0]);

		// select character
		if (command == "selectChar")
		{
			const charData = await f.getCharacter(args[0]);
			if (sender.id == charData.owner && !userData.stats.name)
			{
				sendMessageToCurrent(`${sender} Set your character to ${charData.name}.`);
				const init = await f.charInit(charData); // f.logJSON("init", init);
				f.saveUserStats(init, sender.id);
			}
			else if (sender.id != charData.owner)
			{
				sendMessageToCurrent(`${sender} You do not have access to this character.`);
			}
			else
			{
				sendMessageToCurrent(`${sender} You are already using this character.`);
			}
		}

		if (command == "selectWeapon")
		{
			const weaponData = await f.get("Weapons", args.join(" "));
			if (weaponData && weaponData.cost <= money)
			{
				sendMessageToCurrent(`${sender} It costs ${weaponData.cost} Gold. Are you sure you want this? (Y/N)`);
				const response = await f.awaitMessageContent(m.channel, m2 => m2.author == sender && m2.content, { maxMatches: 1, time: 30 * 1000 });
				const positiveResponse = response[0] ? response[0].toLowerCase() == "y" || response[0].toLowerCase() == "ye" || response[0].toLowerCase() == "yes" : undefined;
				const negativeResponse = response[0] ? response[0].toLowerCase() == "n" || response[0].toLowerCase() == "no" : undefined;
				if (positiveResponse && weaponData.cost <= money)
				{
					userData.stats.equipped = weaponData;
					sendMessageToCurrent(`${sender} You have bought and equipped ${args[0]}.`);
					f.saveUserStats(userData, sender.id);
				}
				else if (!response[0] || negativeResponse)
				{
					sendMessageToCurrent(`${sender} Trade is cancelled. Invoke me again to buy the weapon.`);
				}
			}
			else if (weaponData.cost > money)
			{
				sendMessageToCurrent(`${sender} You do not have enough Gold. It costs ${weaponData.cost}.`);
			}
			else if (!weaponData)
			{
				sendMessageToCurrent(`${sender} "${args[0]}" does not exist.`);
			}
		}

		// generate char
		if (command == "gChar")
		{
			const character = await f.createCharacter();
			sendMessageToCurrent(f.returnCharEmbed(character));
		}

		// check gold
		if (command == 'me')
		{
			const moneyEmbed = new Discord.RichEmbed()
				.setAuthor(sender.username, sender.avatarURL)
				.setTitle(`You have ${Math.round(parseInt(userData.money))} gold.`)
				.setFooter('"Bump the server, roleplay, be active. Earn your worth!"', client.user.avatarURL);
			sendMessageToCurrent(moneyEmbed);
		}

		// randomizer
		if (command == "rdn")
		{
			if (args[0])
			{
				const fv = args[1] ? parseInt(args[0]) : 0;
				const sv = args[1] ? parseInt(args[1]) : parseInt(args[0]);
				const result = f.randomBetweenInt(fv, sv);
				const rollEmbed = new Discord.RichEmbed({
					author: { name: `${sender.username} did a roll between ${fv} and ${sv}`, icon_url: sender.avatarURL },
					title: `Rolled a ${result}!`,
				});
				sendMessageToCurrent(rollEmbed);
			}
		}

		if (command == "draw")
		{
			if (args[0])
			{
				const dc = parseInt(args[0]);
				if (dc >= 1000)
				{
					sendMessageToCurrent(`${sender} I refuse. That's too many to count. Keep it below 1000`);
					return;
				}
				const translate = ["sword", "shield", "boot"];
				const drawn = { sword: 0, shield: 0, boot: 0 };
				for (let i = 0; i < dc; i++)
				{
					const cID = f.randomBetweenInt(0, 2);
					drawn[translate[cID]]++;
				}

				const drawnEmbed = new Discord.RichEmbed({
					author: { name: `${sender.username} drew ${dc} cards`, icon_url: sender.avatarURL },
					title: `${drawn.sword} Sword; ${drawn.shield} Shield; ${drawn.boot} Boot.`,
				});

				sendMessageToCurrent(drawnEmbed);
			}
		}

		// clash
		if (command == "clash")
		{
			// fail: sender has no stats

		}

		// deal
		if (command == "deal")
		{
			try
			{
				const character = await f.getCharacter(args[0], true);
				const target = await f.getCharacter(args[1], true);
				const ability = { hit: 0, damage: 0 };

				// CR
				if (args[3])
				{
					const gcritRate = parseInt(args[3].slice(1)) || 10;
					// f.log(`gcritRate ${gcritRate}`);
					Object.assign(ability, args[3][0] == 's' ? { critRate: gcritRate } : args[3][0] == '+' ? { hit: gcritRate } : {});
				}

				// damage
				if (args[2])
				{
					const damageMod = parseFloat(args[2].slice(1)) || 0;
					// f.log(`damageMod ${damageMod}`);
					Object.assign(ability, args[2][0] == '+' ? { damage: damageMod } : args[2][0] == 'x' ? { multiplier: damageMod } : {});
				}

				f.logJSON('ability', ability);

				const result = f.attack(character, target, ability);
				const resultMessage = await sendMessageToCurrent(new Discord.RichEmbed({
					title: `${Math.round(result.damage)}!`,
					description: result.description,
					footer: { text: `${character.name} with ${args[2] || "+0"} damage and ${ability.critRate ? 'set ' : '+'}${ ability.critRate || ability.hit } critRate` },
				}));

				// resultMessage.react('🛡️');
				// let reduction = 0;
				// const collectorFilter = emote => emote.emoji;
				// const collector = new Discord.ReactionCollector(resultMessage, collectorFilter);
				// collector.on('collect', r => {
				// 	r.users.map(u => {
				// 		if (u.id != client.user.id)
				// 		{
				// 			r.remove(u);
				// 		}
				// 	});
				// 	const emoteN = r.emoji.name;
				// 	if (emoteN == '🛡️')
				// 	{
				// 		const newEmbed = resultMessage.embeds[0] || new Discord.RichEmbed({
				// 			fields: [
				// 				{ name: "**Change in value:**", value: `-${reduction}%` },
				// 			],
				// 		});
				// 		// f.log(`Begining: ${newEmbed}`);
				// 		reduction += 20;
				// 		newEmbed.fields[0] ? newEmbed.fields[0].value = `-${reduction}%` : newEmbed.fields.push({ name: "**Change in value:**", value: `-${reduction}%` });
				// 		// f.log(newEmbed.fields);
				// 		resultMessage.edit(newEmbed)
				// 			.then(() => {
				// 				// f.log(resultMessage.embeds[0]);
				// 			});
				// 	}
				// 	if (emoteN == '🗡️')
				// 	{
				// 		page++;
				// 	}
				// });
			}
			catch (err)
			{
				sendMessageToCurrent(`${"```"}${err}${"```"}`);
			}
		}

		if (command == "status") sendMessageToCurrent(f.returnExplorerEmbed(userData.stats));

		// ike only commands
		if (sender.id == '262871357455466496')
		{
			if (command == "removeStat" && m.mentions.members.first())
			{
				const targetID = m.mentions.members.first().id;
				f.saveUserStats({}, targetID);
				sendMessageToCurrent("Removed.");
			}
			if (command == "setStat" && args[1])
			{
				const targetID = m.mentions.members.first().id;
				const character = await f.getNewCharacter(args[1], 1);
				if (!character)
				{
					sendMessageToCurrent(`Unknown character name: ${args[1]}.`);
				}
				else
				{
					f.saveUserStats(character, targetID);
					sendMessageToCurrent(`Successful! Assigned class "${args[1]}".`);
				}
			}

			if (command == "glad")
			{
				const glad = await f.createCharacter();
				f.gladiatorPurchase(m.channel, glad);
			}
			// add money
			// f.log(`Trying command: ${command == 'f.addMoney' && args.length && m.mentions && args[1]}`);
			if (command == 'addMoney')
			{
				if (args.length && m.mentions && args[1])
				{
					await f.addMoney(m.mentions.users.first().id, parseInt(args[1]));
					sendMessageToCurrent(`${"They have been rewarded handsomely.".repeat(Boolean(1 + Math.sign(args[1])))}${"Taken away.".repeat(Boolean(Math.sign(args[1]) - 1))}`);
				}
				if (!args.length)
				{
					sendMessageToCurrent("Give arguments.");
				}
				if (!m.mentions)
				{
					sendMessageToCurrent("Mention someone.");
				}
				if (!args[1])
				{
					sendMessageToCurrent("Enter amount.");
				}
			}

			// start Battle
			if (command.toLowerCase() == "starthere")
			{
				// ask for location. else the battle will start in the command channel
				const locationID = args[0] || m.channel.id;
				f.log(`Initializing at ${locationID}...`);

				// finding the location channel
				const location = client.channels.get(locationID);
				if (!location) {
					sendMessageToCurrent("Unknown location. Retry.");
					return;
				}

				// initialization
				const Battle = new Discord.RichEmbed({
					title: "Sound the horns! There's a Battle to be met!",
					footer: {
						text: "Tag the players that will be joining the Battle.",
					},
				});
				sendMessageToCurrent("```\n \n```");
				m.delete();
				f.log(`Requesting players...`);
				const battleMessage = await sendMessageToCurrent(Battle);
				const taggedIDs = await new Promise(resolve => {
					const collectedIDs = [];
					// tag collector collects the player IDs
					// collect if: message has a mention
					const tagCollector = battleMessage.channel.createCollector(message => message.mentions.users.first());

					// manually shut down the tag collector with a finish collector, finding a message with words "end"
					// collect if: message's content == "end" (lowercased)
					const finishCollector = battleMessage.channel.createCollector(message => message.content.toLowerCase() == "end");
					tagCollector.on('collect', tc => {
						const foundIDs = tc.mentions.users.map(u => u.id);
						foundIDs.forEach(id => {
							collectedIDs.push(id);
						});
					});
					tagCollector.on('end', () => {
						resolve(collectedIDs);
					});
					finishCollector.on('collect', () => {
						tagCollector.stop();
						finishCollector.stop();
					});
				});
				f.log(`Done.`);

				// delete the tags
				await f.deleteMessagesAfter(location, battleMessage.id);
				battleMessage.delete();

				// setting up battle properties from firebase || new
				const loaded = await f.get('Battle', location.id); // check if this channel has a saved array
				const allStats = loaded ? loaded.allStats : [];
				const allIndexes = loaded ? loaded.allIndexes : {};
				const spawning = loaded ? loaded.spawning : [];
				const spawners = loaded ? loaded.spawners : [];
				let timeElapsed = loaded ? loaded.timeElapsed : 0;

				// going through each player and getting their stats in firebase
				for (let i = 0; i < taggedIDs.length; i++)
				{
					const stat = await f.getData(taggedIDs[i], "stats");
					if (stat.name == undefined)
					{
						const noCharUser = await client.fetchUser(taggedIDs[i]);
						location.send(`${noCharUser} does not have a character selected.`);
					}
					else
					{
						if (stat.readiness != 0) stat.readiness = 0;
						const initStat = await f.charNewInit(stat, true);
						allStats.push(initStat);
					}
				}

				let timeNow = timeElapsed;
				let action = "";

				const deathEmbed = new Discord.RichEmbed()
					.setImage('https://i.ytimg.com/vi/Kr9rIx7MVvg/maxresdefault.jpg');

				// borders of a map
				let bx = loaded ? loaded.bx : [0, 50];
				let by = loaded ? loaded.by : [0, 50];

				// QUICK COMMANDS
				const sync = () => {
					// f.log("Syncing to the firebase...");
					for (let i = 0; i < allStats.length; i++)
					{
						if(!allStats[i].bot) f.saveUserStats(allStats[i], allStats[i].owner);
					}
					// f.log("Sync done.");
				};
				const updateB = () => {
					const readyPlayersEmbed = new Discord.RichEmbed({
						footer: { text: `Maximum Coord: ( ${bx[1]}, ${by[1]} )\nMinimum Coord: ( ${by[0]}, ${by[0]} )` },
					});
					for (let i = 0; i < allStats.length; i++)
					{
						if (allStats[i].bot && allStats[i].bot.type == 'block') continue;
						if (allStats[i].HP != "dead")
						{
							readyPlayersEmbed.fields.push({ name: allStats[i].name, value: `: ${"`" + f.addHPBar(allStats[i].AHP, allStats[i].HP) + "`"}` });
						}
						else
						{
							readyPlayersEmbed.fields.push({ name: allStats[i].name + ' ( defeated )', value: `: ${"`" + f.addHPBar(allStats[i].AHP, 0) + "`"}` });
						}
					}
					return readyPlayersEmbed;
				};
				const updateBoards = async () => {
					const spillBoard = f.spillBattleBoards(allStats);
					const existingTypes = boardMessages.map(mes => {
						return mes.embeds[0].title.toLowerCase();
					});

					// update existing boards
					for (let i = 0; i < boardMessages.length; i++)
					{
						// look through the type for this message board in allStats
						const boardMessage = boardMessages[i];
						const type = boardMessage.embeds[0].title.toLowerCase();
						const allStatsType = allStats.filter(stat => {
							return stat.bot ? stat.bot.type == type : type == 'player';
						});

						// if such type still exists in allStats`
						if (allStatsType[0])
						{
							const newTypeEmbed = new Discord.RichEmbed({
								title: `${f.capFirstLetter(type)}`,
							});
							allStatsType.forEach(stat => {
								if (stat.HP != "dead")
								{
									newTypeEmbed.fields.push({ name: stat.name, value: `: ${"`" + f.addHPBar(stat.AHP, stat.HP) + "`"}` });
								}
								else
								{
									newTypeEmbed.fields.push({ name: stat.name + ' ( defeated )', value: `: ${"`" + f.addHPBar(stat.AHP, 0) + "`"}` });
								}
							});
							boardMessage.edit(newTypeEmbed);
						}
						else
						{
							boardMessage.delete();
							boardMessages.splice(boardMessages.indexOf(boardMessage), 1);
							i--;
						}
					}

					// send new boards
					for (const [type, embed] of Object.entries(spillBoard))
					{
						// if board in spillBoard exists but not in boardMessages...
						if (!existingTypes.includes(type))
						{
							const newBoardMessage = await sendMessageToCurrent(embed);
							boardMessages.push(newBoardMessage);
						}
					}
					lastBoard = boardMessages[boardMessages.length - 1];
				};
				const move = (player, coord, magnitude) => {
					if (coord != 'x' && coord != 'y')
					{
						// f.log(`'${coord}' is an invalid coordination.`);
						return;
					}
					const condition = `player[coord] + magnitude <= b${coord}[1] && player[coord] + magnitude >= b${coord}[0]`;

					// bound detection
					if (eval(condition))
					{
						player[coord] += magnitude;
					}
					else
					{
						const toMax = Math.abs(by[1] - player[coord]);
						const toMin = Math.abs(by[0] - player[coord]);
						player[coord] += toMax < toMin ? toMax : -toMin;
					}
				};
				const allStatChange = (targetName, statName, magnitude) => {
					const t = allStats.find(c => c.name === targetName);
					if (!t) return;
					if (t[statName] !== undefined) // stat exists
					{
						t[statName] += magnitude;
					}
					else
					{
						// f.log(`Error in allStatChange method: "${statName}" does not exist.`);
					}
				};
				const allStatSet = (targetName, statName, magnitude) => {
					const t = allStats.find(c => c.name === targetName);
					if (!t) return;
					if (t[statName] !== undefined) // stat exists
					{
						t[statName] = magnitude;
					}
					else
					{
						// f.log(`Error in allStatSet method: "${statName}" does not exist.`);
					}
				};

				// board references + first wave of boards
				let lastBoard;
				let playerBoard;
				const boardMessages = [];
				const boardEntries = f.spillBattleBoards(allStats);
				f.log(`Sending boards...`);
				for (const [type, embed] of Object.entries(boardEntries))
				{
					const iMessage = await sendMessageToCurrent(embed);
					// f.log(iMessage.embeds[0].fields);
					boardMessages.push(iMessage);
					// is last?
					if (Object.values(boardEntries).indexOf(iMessage) == boardEntries.length - 1) lastBoard = iMessage;
					if (type === 'player') playerBoard = iMessage;
				}
				f.log(`Done.`);

				// f.logJSON('allBoards', obj);
				// while the battle is still going
				while (action != "end")
				{
					// == SPAWN IN + INDEX ENEMIES ==
					f.log(`Spawning enemies...`);
					// for each enemy to be spawned...
					for (let i = 0; i < spawning.length; i++)
					{
						const stat = spawning[i];
						// 0. indexing
						if (!allIndexes[stat.name])
						{
							allIndexes[stat.name] = {
								using: [],
								used: [],
							};
						}

						f.log(`Looking for ${stat.name}... `);
						// 1. look for spawner
						const possibleCoords = spawners.map(s => {
							return [s.x, s.y];
						});
						// f.log(possibleCoords);
						// 2. look for coords if occupied and spawn if not
						const unavailableStats = allStats.filter(s => {
							const TF = possibleCoords.some(c => c[0] === s.x && c[1] === s.y);
							// f.log(`( ${s.x}, ${s.y} ): ${TF}`);
							return TF;
						});
						// f.log(unavailableStats);
						const unavailableCoords = unavailableStats.map(s => {
							return [s.x, s.y];
						});
						f.log(unavailableCoords);
						const availableCoords = possibleCoords.filter(xyz => {
							return !unavailableCoords.some(c => c[0] === xyz[0] && c[1] === xyz[1]);
						});
						f.log(availableCoords);

						// if there is at least one available coords
						if (availableCoords[0])
						{
							// f.log(`${availableCoords[0][0]}, ${availableCoords[0][1]} is available!`);
							// 1. find index
							const index = await new Promise(resolve => {
								// 1.1 check if index is occupied
								const count = f.countUnits(allStats, stat.name);
								const indexBoxUsing = allIndexes[stat.name].using;
								const indexBoxUsed = allIndexes[stat.name].used;
								if (indexBoxUsing.includes(count + 1))
								{
									// index is used, find a new one
									const newIndex = indexBoxUsed.shift();
									indexBoxUsing.push(newIndex);
									resolve(newIndex);
								}
								else
								{
									// index is okay
									indexBoxUsing.push(count + 1);
									resolve(count + 1);
								}
							});

							// spawn
							spawning.shift();
							i--;
							allStats.push(Object.assign(stat, { name: `${stat.name}${index}`, x: availableCoords[0][0], y: availableCoords[0][1] }));
							sendMessageToCurrent(new Discord.RichEmbed({
								title: `"${stat.name} ( ${stat.bot ? stat.bot.type : "player"} )" joins the battle at ( ${stat.x}, ${stat.y} )!`,
							}));
						}
					}
					f.log(`Done.`);

					// == UPDATE BOARD ==
					updateBoards();

					// == LET READINESS TICK ==
					while (timeElapsed < timeNow + 50)
					{
						timeElapsed++;
						allStats.map(s => {
							if (!s.bot || s.bot.type != 'block')
							{
								// f.log(s);
								s.readiness += f.randomBetweenDb(s.zRed / 20 - s.zRed / 30, s.zRed / 20 + s.zRed / 30);
								if (s.readiness > 50) s.readiness = 50;
							}
						});
					}

					// == READINESS SYNC ==
					sync();

					// PAUSE
					// == ACTIONS OF THE ROUND ==
					let pass = 0;
					while (pass == 0)
					{
						location.send('Action?');
						action = await f.awaitMessageContent(location, x => x.author.id == sender.id);
						const actionCommand = action[0].split(' ')[0];
						const actionArgs = action[0].split(' '); actionArgs.shift();

						if (actionCommand == "next" || actionCommand == 'n' || actionCommand == "end") pass = 1;

						// add character
						if (actionCommand == "add")
						{
							const isUserID = !isNaN(actionArgs[0]);
							if (isUserID)
							{
								const tagged = await client.fetchUser(actionArgs[0]);
								const char = await f.getData(tagged.id, "stats");
								if (char)
								{
									allStats.push(char);
									updateBoards();
								}
								else
								{
									location.send("This person does not have a character.");
								}
							}
							else
							{
								const char = await f.getNewCharacter(actionArgs[0], true);
								if (!char)
								{
									location.send(`"${actionArgs}" does not exist.`);
								}
								else
								{
									if (actionArgs[1]) char.name = actionArgs[1];
									const initChar = await f.charNewInit(char, true);
									allStats.push(initChar); // f.log(char);
								}
							}
						}

						// remove character
						if (actionCommand == "remove")
						{
							const removeThis = allStats.find(char => char.name == actionArgs[0]);
							if (removeThis)
							{
								allStats.splice(allStats.indexOf(removeThis), 1);
								sendMessageToCurrent(`Removed '${removeThis.name}'.`);
							}
							else
							{
								location.send(`"${actionArgs[0]}" does not exist.`);
							}
						}

						// modify stats
						if (actionCommand == "mod")
						{
							const modTarget = allStats.find(s => s.name == actionArgs[0]);
							if (modTarget)
							{
								// if targetted stat exists and args[2] is a number
								if (modTarget[actionArgs[1]] != undefined && !isNaN(parseInt(actionArgs[2])))
								{
									const num = actionArgs[1] == "stress" ? f.stress(parseInt(actionArgs[2]), modTarget.wil) : parseInt(actionArgs[2]);
									// permit mods
									modTarget[actionArgs[1]] += num;
									location.send(`Modded ${actionArgs[1]} by ${num} for ${actionArgs[0]}.`);
									f.saveUserStats(modTarget, modTarget.owner);
									// f.logJSON("modTarget", modTarget);
									// f.logJSON("userData.stats", userData.stats);
								}
							}
							else
							{
								location.send(`"${actionArgs[0]}" does not exist.`);
							}
						}

						// quick draw
						if (actionCommand == "draw") {
							const modTarget = allStats.find(s => s.name == actionArgs[0]);
							if (modTarget)
							{
								// if targetted stat exists and all three arguments are numbers
								if (!isNaN(parseInt(actionArgs[1])) && !isNaN(parseInt(actionArgs[2])) && !isNaN(parseInt(actionArgs[3])))
								{
									modTarget.swords += parseInt(actionArgs[1]);
									modTarget.shields += parseInt(actionArgs[2]);
									modTarget.boots += parseInt(actionArgs[3]);
									location.send(`Drew ${actionArgs[1]} sword(s), ${actionArgs[2]} shield(s), and ${actionArgs[3]} boot(s).`);
									f.saveUserStats(modTarget, modTarget.owner);
								}
							}
							else
							{
								location.send(`"${actionArgs[0]}" does not exist.`);
							}
						}

						// proc
						if (actionCommand == "proc") {
							const procEmbed = new Discord.RichEmbed({
								title: `${actionArgs[0]} used ${actionArgs[1]}!`,
								footer: { text: actionArgs.shift().shift().join('') || ":crossed_swords:" },
							});
							location.send(procEmbed);
						}

						// save
						if (actionCommand == "save") {
							await f.getDataBase().collection('Battle').doc(location.id).set({
								allStats: allStats,
								allIndexes: allIndexes,
								timeElapsed: timeElapsed,
								bx: bx,
								by: by,
								spawning: spawning,
								spawners: spawners,
							});
						}

						// set coords
						if (actionCommand == "setCoords")
						{
							const targetName = actionArgs[0];
							const x = parseInt(actionArgs[1]);
							const y = parseInt(actionArgs[2]);
							if (!targetName)
							{
								location.send(`Cannot read target: "${targetName}".`);
								return;
							}
							if (x === undefined || y === undefined)
							{
								location.send(`x or y does not exist. (x: '${x}'. y: '${y}').`);
								return;
							}
							allStatSet(targetName, "x", x);
							allStatSet(targetName, "y", y);
						}

						// set borders
						if (actionCommand == "setBorder")
						{
							const mx = parseInt(actionArgs[0]);
							const Mx = parseInt(actionArgs[1]);
							const my = parseInt(actionArgs[2]);
							const My = parseInt(actionArgs[3]);
							setTimeout(() => {
								bx = [mx, Mx];
								by = [my ? my : mx, My ? My : Mx];
							}, 100);
						}

						// draw blocks
						if (actionCommand == "drawBlocks")
						{
							const XfromHere = parseInt(actionArgs[0]);
							const XtoHere = parseInt(actionArgs[1]);
							const YfromHere = parseInt(actionArgs[2]);
							const YtoHere = parseInt(actionArgs[3]);
							if (!((actionArgs[1] === undefined || actionArgs[2] === undefined) || isNaN(XfromHere + XtoHere + YfromHere + YtoHere)))
							{
								for (let x = XfromHere; x <= XtoHere; x++)
								{
									for (let y = YfromHere; y <= YtoHere; y++)
									{
										const block = await f.getNewCharacter('block', true)
											.then(b => {
												b.name = `blockX${x}Y${y}`;
												b.x = x;
												b.y = y;
												// f.log(b);
												return b;
											});
										allStats.push(block);
									}
								}
							}
							else
							{
								sendMessageToCurrent(`Misinput!`);
							}
						}

						if (actionCommand == "drawMap")
						{
							sendMessageToCurrent(new Discord.RichEmbed({
								description: `${f.drawMap(bx, by, allStats)}`,
							}));
						}

						if (actionCommand == "log")
						{
							f.log(allStats);
						}

						if (actionCommand == "setSpawn")
						{
							const character = await f.getNewCharacter(actionArgs[0], true);
							const x = parseInt(actionArgs[1]);
							const y = parseInt(actionArgs[2]);
							if (!character)
							{
								sendMessageToCurrent(`Invalid character '${actionArgs[0]}'.`);
							}
							else if (isNaN(x + y))
							{
								sendMessageToCurrent(`Provide valid coordinates. (x: '${x}', y: '${y}')`);
							}
							else if (spawners.find(s => s.x == x && s.y == y))
							{
								sendMessageToCurrent(`Location occupied.`);
							}
							else
							{
								spawners.push({
									spawns: character.name,
									x: x,
									y: y,
								});
							}
						}

						if (actionCommand == "spawn")
						{
							const repeat = parseInt(actionArgs[1]) || 1;
							const spawn = await f.getNewCharacter(actionArgs[0], true);
							if (spawn)
							{
								for (let i = 0; i < repeat; i++)
								{
									const initSpawn = await f.charNewInit(spawn);
									spawning.push(initSpawn);
								}
								sendMessageToCurrent(`${repeat} ${actionArgs[0]}(s) will spawn next round.`);
							}
							else
							{
								sendMessageToCurrent(`"${actionArgs[0]}" does not exist.`);
							}
						}
					}

					// == ACTIONS SYNC ==
					sync();

					// == COUNT LIVES ==
					let aliveCount = allStats.reduce((acc, stat) => {
						if (!stat.bot && stat.HP != "dead") return acc + 1;
						else return acc;
					}, 0);
					f.log(`AliveCount: ${aliveCount}`);
					const enemyCount = allStats.reduce((acc, stat) => {
						if (stat.bot && stat.bot.type == "enemy") return acc + 1;
						else return acc;
					}, 0);
					f.log(`EnemyCount: ${enemyCount}`);

					// == REFRESH CHAT ==
					await f.deleteMessagesAfter(m.channel, lastBoard.id);

					// === NEW ROUND ===
					timeNow = timeElapsed;

					// == REGENERATE TOKENS ==

					// == CREATE/UPDATE COMMAND CHANNELS ==
					// cat == already exist category || newly created category
					const cat = m.guild.channels.find(c => c.name === "Command Rooms" && c.type === "category") || await m.guild.createChannel(`Command Rooms`, { type: "category" }).then(channel => { return channel; });

					// == PLAYER ACTIONS ==
					let readyPlayersCount = 0;
					let readyEnemiesCount = 0;
					const allPlayers_ALLACTS = [];
					f.forAllStats(allStats, async stat => {
						// if the character is dead
						if (stat.HP === "dead")
						{
							// dead by natural causes
							return;
						}
						else if (stat.HP <= 0)
						{
							// dead when coming into the battle
							// f.log(`Unnatural Death from ${stat.name}; HP == ${stat.HP}`);
							aliveCount--;
							stat.HP = "dead";
							return;
						}
						// if bot
						if (stat.bot && stat.bot.type === 'enemy')
						{
							// f.log(`loop for ${stat.name} bot`);
							const newChannelStuff = (createdChannel) => {
								createdChannel.setParent(cat.id);
								createdChannel.replacePermissionOverwrites({
									overwrites: [
										{
											id: m.guild.defaultRole.id,
											deny: ['VIEW_CHANNEL'],
										}],
								});
								return createdChannel;
							};
							const createdChannel = m.guild.channels.find(c => c.name == 'enemies') || await m.guild.createChannel(`enemies`, { type: "text" }).then(newChannelStuff);

							const botBody = await createdChannel.send(f.returnExplorerEmbed(stat)).then(mes => {
								mes.react('▶️');
								mes.react('🚫');
								mes.react('✅');
								mes.react('🪓');
								return mes;
							});

							const act = (actionEmoji) => {
								acted = actionEmoji;
								// f.log(`Executing: ${acted}; ${unlocked}`);
								const stayPutAction = (unlocked) => {
									// remove react from moving
									botBody.reactions.filter((reaction, name) => {
										// check inside move reactions
										if (name == '▶️')
										{
											// reacted to move?
											const reduceResult = reaction.users.reduce((t, user) => {
												return user.id == ike.id ? true : t;
											}, false);
											// if reacted, remove move react
											if (reduceResult) reaction.remove(ike);
										}
									});

									// if unlocked, push action
									if (unlocked)
									{
										// f.log(`Bot acting on ${actionEmoji}`);
										allPlayers_ALLACTS.push([stat.name]);
									}
								};
								const moveAction = (unlocked, ignore = ['block', 'enemy', 'barricade']) => {
									// remove halt reaction
									botBody.reactions.filter((reaction, name) => {
										if (name == '🚫')
										{
											const reduceResult = reaction.users.reduce((t, user) => {
												return user.id == ike.id ? true : t;
											}, false);
											if (reduceResult) reaction.remove(ike);
										}
										let check;
										if (ignore[2] === 'barricade') check = '🪓';
										if (!ignore[2]) check = '▶️';
										if (name == check)
										{
											const reduceResult = reaction.users.reduce((t, user) => {
												return user.id == ike.id ? true : t;
											}, false);
											if (reduceResult) reaction.remove(ike);
										}
									});

									// if unlocked, push action
									if (unlocked)
									{
										// f.log(`Bot acting on ${actionEmoji}`);
										let AIResults = AI.closest(stat, allStats, bx, by, ignore);
										if (AIResults.length == 1) AIResults = AI.matchClosest(stat, allStats, bx, by, ignore);
										// f.log(AIResults);
										allPlayers_ALLACTS.push(AIResults);
									}
								};
								const messageFinish = () => {
									createdChannel.send(`Finished actions: ${allActions}`);
									allPlayers_ALLACTS.push(allActions);
									unlocked = true;
								};
								switch(actionEmoji)
								{
								case '🚫':
									stayPutAction(unlocked);
									break;
								case '▶️':
									moveAction(unlocked);
									break;
								case '🛃':
									messageFinish();
									break;
								case '🪓':
									moveAction(unlocked, ['block', 'enemy']);
									break;
								}
							};

							let acted = '';
							let allActions = [stat.name];
							let unlocked = false;
							let timeRemaining = stat.bot.time || 60;
							let requiredReadiness = 0;
							let BX = stat.x;
							let BY = stat.y;
							const timer = setInterval(() => {
								timeRemaining--;
								if (timeRemaining == 0)
								{
									clearInterval(timer);
									// f.log(`Time's up for ${stat.name}!`);
								}
							}, 1 * 1000);

							// timing
							while (timeRemaining !== 0 && (unlocked === false || acted === ''))
							{
								// f.log(`unlocked: ${unlocked}; acted: ${acted}`);
								// find reaction via collector

								// reaction here
								// f.log(`${stat.name}: "Awaiting..."`);
								const actionEmoji = await new Promise(resolve => {
									const subTimer = setTimeout(() => {
										resolve('▶️');
										unlocked = true;
									}, timeRemaining * 1000);

									// collect action via reactions
									const collector = new Discord.ReactionCollector(botBody, (emote, user) => {
										// f.log(user.id);
										return (emote.emoji.name == '🚫' || emote.emoji.name == '▶️' || emote.emoji.name == '✅' || emote.emoji.name == '🪓') && user.id === ike.id;
									}, { maxEmojis: 1 });

									collector.on('collect', r => {
										resolve(r.emoji.name);
										unlocked = r.emoji.name == '✅' || f.checkReaction('✅', botBody);
										clearTimeout(subTimer);
										mesCollector.stop();
									});

									// collection action via messages
									const mesCollector = new Discord.MessageCollector(createdChannel, mes => mes.author === ike, { maxMatches: 1 });
									mesCollector.on('collect', mes => {
										const reply = mes.content;
										const Mcommand = reply.split(' ')[0];
										const Margs = reply.split(' ');	Margs.shift();
										const target = allStats.find(c => c.name.toLowerCase() === Mcommand.toLowerCase());
										const MRcommand = Margs[0];
										const MRcommand_target = Margs[1];
										let valid = true;
										// not directed to self
										if (Mcommand !== stat.name)
										{
											valid = false;
											resolve();
										}
										// invalid input
										// 1. unknown char
										if (!target)
										{
											valid = false;
											createdChannel.send(`${stat.name}: Unknown char: '${Mcommand}'`);
											resolve();
										}
										// 2. invalid arguments
										const validCommands = ['attack', 'right', 'up', 'clear', 'end'];
										if (!validCommands.includes(MRcommand))
										{
											valid = false;
											createdChannel.send(`${stat.name}: Unknown commad: '${MRcommand}'`);
											resolve();
										}
										const attackTarget = allStats.find(c => c.owner === MRcommand_target);
										if (MRcommand === 'attack' && !attackTarget)
										{
											valid = false;
											createdChannel.send(`${stat.name}: Invalid ID: ${MRcommand_target}`);
											resolve();
										}

										// valid move
										if (valid)
										{
											switch (MRcommand)
											{
											case 'up':
												f.fullMovement(parseInt(MRcommand_target), 'y', stat, allStats, requiredReadiness, createdChannel, allActions, [], BX, BY, bx, by);
												break;
											case 'right':
												f.fullMovement(parseInt(MRcommand_target), 'x', stat, allStats, requiredReadiness, createdChannel, allActions, [], BX, BY, bx, by);
												break;
											case 'attack':
												f.attackMove(stat, allStats, requiredReadiness, MRcommand_target, createdChannel, allActions, []);
												break;
											case 'clear':
												allActions = [stat.name];
												requiredReadiness = 0;
												BX = stat.x;
												BY = stat.y;
												break;
											case 'end':
												resolve('🛃');
												break;
											}
										}
										resolve();
										clearTimeout(subTimer);
										collector.stop();
									});
								});

								// execute actions
								switch(actionEmoji)
								{
								case '🚫':
								case '▶️':
								case '🛃':
								case '🪓':
									act(actionEmoji);
									// f.log(`${stat.name}: Finished! ${actionEmoji}`);
									// f.log(`${stat.name}: unlocked: ${unlocked}; acted: ${acted}`);
									break;
								case '✅':
									act(acted);
									// f.log(`${stat.name}: Finished! ${actionEmoji}`);
									// f.log(`${stat.name}: unlocked: ${unlocked}; acted: ${acted}`);
									break;
								}
							}

							// finish round
							// f.log(`Finished for ${stat.name}`);
							botBody.delete();
							readyEnemiesCount++;
							clearInterval(timer);
							// f.log(`loop for ${stat.name} bot: finished`);
						}

						// if player
						// create/update channel
						if (!stat.bot)
						{
							const newChannelStuff = (createdChannel) => {
								createdChannel.setParent(cat.id);
								createdChannel.replacePermissionOverwrites({
									overwrites: [{
										id: stat.owner,
										allow: ['VIEW_CHANNEL'],
									},
									{
										id: m.guild.defaultRole.id,
										deny: ['VIEW_CHANNEL'],
									}],
								});
								return createdChannel;
							};
							const channelAlreadyExist = m.guild.channels.find(c => c.name == stat.owner);
							const createdChannel = channelAlreadyExist || await m.guild.createChannel(`${stat.owner}`, { type: "text" }).then(newChannelStuff);
							// f.log(`For ${stat.name}:`);
							// f.log(createdChannel);

							let timeRemaining = 60;
							const round_USER = await client.fetchUser(stat.owner).then(u => { return u; });
							f.sendAndDelete(`${round_USER}`, 100, createdChannel);
							const timerMessage = await createdChannel.send(f.returnTimerEmbed(timeRemaining)).then(m => { return m; });
							createdChannel.send(f.returnFullPlayerEmbed(stat, bx, by, allStats));

							const timer = setInterval(() => {
								timeRemaining -= 5;
								timerMessage.edit(f.returnTimerEmbed(timeRemaining));
								if (timeRemaining <= 0) clearInterval(timer);
							}, 5 * 1000);

							// listen to actions with collector
							const actionCollector = new Discord.MessageCollector(createdChannel, mes => mes.content.startsWith("//"), { time: 60 * 1000 });
							// saving all input actions into this array
							let allActions = [];
							let allActionsTranslated = [];

							// to-be scenarios
							let requiredReadiness = 0;
							let BX = stat.x;
							let BY = stat.y;

							// collect actions
							actionCollector.on('collect', mes => {
								const actionName = mes.content.split(' ')[0].slice(2).toLowerCase();
								const actionArgs = mes.content.split(' ');	actionArgs.shift();
								const moveMagnitude = parseInt(actionArgs[0]);
								const targetName = actionArgs[0];
								switch(actionName)
								{
								// move vertically
								case "vert":
								case "up":
								case "v":
									const YendMove = f.fullMovement(moveMagnitude, 'y', stat, allStats, requiredReadiness, createdChannel, allActions, allActionsTranslated, BX, BY, bx, by);
									requiredReadiness += Math.abs(7 * YendMove);
									BY += YendMove;
									break;
								case "down":
									const RYendMove = f.fullMovement(-1 * moveMagnitude, 'y', stat, allStats, requiredReadiness, createdChannel, allActions, allActionsTranslated, BX, BY, bx, by);
									requiredReadiness += Math.abs(7 * RYendMove);
									BY += RYendMove;
									break;
									// move horizontally
								case "hor":
								case "right":
								case "h":
								case "r":
									const XendMove = f.fullMovement(moveMagnitude, 'x', stat, allStats, requiredReadiness, createdChannel, allActions, allActionsTranslated, BX, BY, bx, by);
									requiredReadiness += Math.abs(7 * XendMove);
									BX += XendMove;
									break;
								case "left":
									const RXendMove = f.fullMovement(-1 * moveMagnitude, 'x', stat, allStats, requiredReadiness, createdChannel, allActions, allActionsTranslated, BX, BY, bx, by);
									requiredReadiness += Math.abs(7 * RXendMove);
									BX += RXendMove;
									break;

									// attack
								case "attack":
								case "at":
								case "hit":
								case "ht":
									// coord attack
									if (!isNaN(parseInt(actionArgs[1]) + parseInt(actionArgs[0])))
									{
										requiredReadiness += f.coordAttackMove(stat, allStats, requiredReadiness, { x: actionArgs[0], y: actionArgs[1] }, createdChannel, allActions, allActionsTranslated);
									}
									else // naming attack
									{
										requiredReadiness += f.attackMove({ name: stat.name, x: BX, y: BY, Range: stat.Range }, allStats, requiredReadiness, targetName, createdChannel, allActions, allActionsTranslated);
									}
									break;

									// clear
								case "clear":
								case "cr":
									allActions = [];
									allActionsTranslated = [];
									requiredReadiness = 0;
									BX = stat.x;
									BY = stat.y;
									createdChannel.send("All actions are reset.");
									break;

									// show all actions
								case "show":
								case "actions":
								case "s":
									const actionsEmbed = new Discord.RichEmbed({
										title: "**Your actions so far.**",
										description: "( *No actions* )",
									});
									let loop = 1;
									allActionsTranslated.forEach(string => {
										if (!actionsEmbed.description.startsWith("1.")) actionsEmbed.description = '';
										actionsEmbed.description += `${loop}. ${string}\n`;
										loop++;
									});
									createdChannel.send(actionsEmbed);
									break;

									// healing
								case "heal":
								case "bandage":
									if (stat.readiness < requiredReadiness + 20)
									{
										createdChannel.send("Insufficient readiness.");
										return;
									}
									if (targetName)
									{
										const healed = allStats.find(c => c.name === targetName);
										if (!healed)
										{
											createdChannel.send(`Cannot recognize "${targetName}".`);
											return;
										}
										allActions.push(["heal", healed, 20]);
										allActionsTranslated.push(`Heal ${targetName}.`);
										requiredReadiness += 20;
									}
									else
									{
										createdChannel.send(`Cannot recognize "${targetName}".`);
									}
									break;

									// show surroundings
								case "surround":
								case "sur":
									break;

									// show self coordinate
								case "xyz":
								case "coords":
								case "coord":
									createdChannel.send(new Discord.RichEmbed({
										title: "**Coordinates**",
										description: `( ${stat.x}, ${stat.y} )`,
									}));
									break;

									// end turn
								case "end":
									actionCollector.stop();
									break;
								}
								f.log(`${stat.name}: ( ${BX}, ${BY} )`);
							// f.log(allActions + ` REQUIRE: ${requiredReadiness}`);
							});
							// collection ends
							actionCollector.on('end', collection => {
							// update board
								updateBoards();
								// call ready
								readyPlayersCount++;
								clearInterval(timer);
								timerMessage.edit(f.returnTimerEmbed("Turn ended!"));
								// push actions
								allActions.unshift(stat.name);
								allPlayers_ALLACTS.push(allActions);
								// call okay
								const yourField = playerBoard.embeds[0].fields.filter(field => {
									return field.name === stat.name;
								});
								Object.assign(yourField, { name: `${stat.name} 🆗` });
							});
						}
					});

					// PAUSE
					// wait for all players to be ready
					await new Promise((resolve) => {
						const report = setInterval(() => {
							f.log(`Waiting... \nReady Players: ${readyPlayersCount}/${aliveCount}\n Ready Enemies: ${readyEnemiesCount}/${enemyCount}`);
						}, 5 * 1000);
						const timer = setInterval(() => {
							if (readyPlayersCount === aliveCount && readyEnemiesCount === enemyCount)
							{
								clearInterval(timer);
								clearInterval(report);
								resolve();
							}
						}, 1 * 1000);
					});

					// == EXECUTE ACTIONS ==
					for (let i = 0; i < allPlayers_ALLACTS.length; i++)
					{
						// f.log(`Loop ${i}`);
						// for one player...
						const actions = allPlayers_ALLACTS[i]; // f.log(actions);
						const from = actions.shift();
						const player = allStats.find(c => c.name == from);
						const oldCoords = [player.x, player.y];
						const allActionsEmbed = new Discord.RichEmbed({
							title: `${from}'s Actions`,
						});
						let actionString = "";
						// for each action
						await f.forEachBetter(actions, async act => {
							const target = act[1];
							// f.logJSON("player", player);
							// f.logJSON("target", target);
							const distance = f.findDistance(player, target);
							// f.log(`Executing act: ${act}`);
							player.readiness -= act[2];
							switch(act[0])
							{
							// vertical movements
							case "y":
								// invalid moves
								const Ycorrected = f.blockadeMagReduction(allStats, player, 'y', target);
								// 1. position occupied
								const Uobstacle = f.findClosestObstacle(allStats, player, 'y', target);
								if (Uobstacle)
								{
									actionString += `Blocked by ${Uobstacle.name}!\nMoving ${Ycorrected} instead of ${target}\n`;
									move(player, 'y', Ycorrected);
									return;
								}

								// 2. 0 move
								if (target === 0) return;

								// can move
								move(player, 'y', target);
								actionString += `${"Up".repeat(Math.sign(act[1]) > 0)}${"Down".repeat(Math.sign(act[1]) < 0)} ${Math.abs(act[1])} blocks.\n`;
								break;
							// horizontal movements
							case "x":
								// invalid moves
								const Xcorrected = f.blockadeMagReduction(allStats, player, 'x', target);
								// 1. position occupied
								const Robstacle = f.findClosestObstacle(allStats, player, 'x', target);
								if (Robstacle)
								{
									actionString += `Blocked by ${Robstacle.name}!\nMoving ${Xcorrected} instead of ${target}\n`;
									move(player, 'x', Xcorrected);
									return;
								}

								// 2. 0 move
								if (target === 0) return;

								move(player, 'x', target);
								actionString += `${"Right".repeat(Math.sign(act[1]) > 0)}${"Left".repeat(Math.sign(act[1]) < 0)} ${Math.abs(act[1])} blocks.\n`;
								break;
							// attacking
							case "attack":
								// invalid attack
								// 1. out of range
								if (distance > player.Range[1] || distance < player.Range[0])
								{
									actionString += `Attack on ${target.name} failed!\nReason: Out of Range. ( ${Math.round(distance)} )\n`;
									return;
								}

								// valid attack
								const isID = client.users.get(player.owner);
								const damage = await f.clash(isID ? player.owner : player, act[1]);
								actionString += `Attacked ${target.name}.\n${player.Acc - target.Dodge < 100 ? player.Acc - target.Dodge : 100}% to hit... \n**${damage[1]}!** Dealt ${damage[0]} damage!\n`;
								if (target.HP > 0 && target.HP - damage[0] <= 0)
								{
									actionString += "**KILLING BLOW!**\n";
								}
								target.HP -= damage[0];
								break;

							// healing
							case "heal":
								// invalid heal
								// 1. out of range
								if (distance < player.HealRange[0] || distance > player.HealRange[1])
								{
									actionString += `**Heal ${target.name} failed!**\nReason: Out of Range. ( ${Math.round(distance)} )\n`;
									return;
								}

								// valid heal
								const pHP = target.HP;
								if (target.HP + player.Heal <= target.AHP) target.HP += player.Heal;
								else target.HP = target.AHP;
								actionString += `${from} healed ${target.name}.\n${pHP} ==> ${target.HP}\n`;
								break;
							}
							// f.log(`Finished for ${act}`);
						});
						const newCoords = [player.x, player.y];

						// if moved
						if (oldCoords[0] != newCoords[0] || oldCoords[1] != newCoords[1])
						{
							actionString += `${from}'s Final Destination...\n(${oldCoords[0]}, ${oldCoords[1]}) => (${newCoords[0]}, ${newCoords[1]})`;
						}

						if (actionString !== "")
						{
							allActionsEmbed.setDescription(actionString);
							await sendMessageToCurrent(allActionsEmbed);
						}
					}

					// == PLAYER ACTIONS SYNC ==
					sync();

					// == CHECK DEATHS ==
					const deadPlayersArray = allStats.filter(p => p.HP <= 0);
					for (let i = 0; i < allStats.length; i++)
					{
						const check = allStats[i];
						if (deadPlayersArray.includes(check))
						{
							if (!check.bot)
							{
								m.guild.channels.find(c => c.name === check.owner).send(deathEmbed);
								aliveCount--;
								check.HP = "dead";
							}
							else
							{
								const checkType = allIndexes[check.type];
								const removingIndex = checkType.using.indexOf(parseInt(check.name.match(/[0-9]+$/g)[0])); f.log(`${check.name}: Removing Index: ${removingIndex}`);
								allStats.splice(allStats.indexOf(check), 1);
								const removed = checkType.using.splice(removingIndex, 1);
								if(!checkType.used.includes(removed[0])) {
									checkType.used.push(removed[0]);
									f.log(`${check.name} is dead. Moving ${removed[0]} to used.`);
									f.log(allIndexes);
								}
							}
						}
					}

					// == FINISH ROUND ==
					// f.log("Finish Round.");
				}

				const endEmbed = new Discord.RichEmbed({
					title: `The Battle ends.`,
					footer: { text: `Thank you for participating!` },
				});
				battleMessage.channel.send(endEmbed);
			}

			// add RP channel
			if (command == "addThis")
			{
				f.addChannel(allRPChannels, m.channel.id);
				sendMessageToCurrent(new Discord.RichEmbed({
					author: { name: "Heimdallr", icon_url: client.user.avatarURL },
					title: "This channel is now classified as a RP channel. All proper responses will be rewarded in Gold!",
				}));
			}

			// purge all
			if (command == "purge")
			{
				if (isNaN(parseInt(args[0]))) return;
				m.channel.bulkDelete(parseInt(args[0]))
					.then(collection => {
						// f.log(`Deleting ${collection.size} messages in ${m.channel.name}.`);
					})
					.catch(err => {
						f.log(err);
					});
			}

			// refresh RP channels
			if (command == "refresh")
			{
				f.refreshChannels(allRPChannels);
				sendMessageToCurrent("Refreshing!");
			}
		}
	}

	f.addMoney(sender.id, money);
});

client.on('messageReactionAdd', async mr => {
	if (mr.users.size < 10 || (mr.emoji != '😆' && mr.emoji != '⭐' && mr.emoji != '👍')) return;
	const starredBoards = client.channels.get(f.test_starB).messages.array();

	let funnyCount = 0;
	let greatCount = 0;
	let starCount = 0;
	for (const reaction of mr.message.reactions)
	{
		if (reaction[0] == '👍') greatCount = mr.users.size;
		if (reaction[0] == '😆') funnyCount = mr.users.size;
		if (reaction[0] == '⭐') starCount = mr.users.size;
	}

	// already has it on the board
	const starred = starredBoards.filter(x => x.embeds[0].footer.text == mr.message.id)[0];
	if (starred)
	{
		starred.embeds[0].title = `${funnyCount} :laughing: `.repeat(Boolean(funnyCount)) + `${greatCount} :thumpsup:`.repeat(Boolean(greatCount)) + ` ${starCount} :star:`.repeat(Boolean(starCount));
		return;
	}

	// new feature
	const firstImageMessage = mr.message.attachments.values().next().value;

	client.channels.get(f.test_starB).send(new Discord.RichEmbed({
		author: { name: mr.message.author.username, icon_url: mr.message.author.avatarURL },
		title: `${funnyCount} :laughing: `.repeat(Boolean(funnyCount)) + `${greatCount} :thumpsup:`.repeat(Boolean(greatCount)) + ` ${starCount} :star:`.repeat(Boolean(starCount)),
		description: mr.message.content,
		image: { url: firstImageMessage ? firstImageMessage.proxyURL : null },
		footer: { text: mr.message.id },
		timestamp: new Date(),
	}));
});

// ~~~~~~~~~~~~~~~OLD CODES~~~~~~~~~~~~~~~~~~~~~~

// ==READINESS DISPLAY==

// const ready = allStats.find(s => s.readiness >= 100);
// const fatality = `0x${Math.round(255 - ready.HP / ready.maxHP * 127).toString(16)}0000`; // f.log(fatality);
// const combatEmbed = new Discord.RichEmbed({
// 	title: `${ready.name} readies...`,
// 	description: "Your next action is...?",
// 	color: eval(fatality),
// 	footer: { text: `${timeElapsed} Atoms have passed.`, icon_url: "https://static1.bigstockphoto.com/0/1/1/large2/1101466.jpg" },
// });

// f.logging readiness of others
// const readinessList = allStats.map(s => { return { name: s.name, readiness: s.readiness }; });
// readinessList.forEach(o => {
// 	f.logJSON(`${o.name}`, o);
// });

// battleMessage.edit(combatEmbed);


// ==CLASH==

// if (command == "clash")
// {
// 	// find two targets
// 	if (!args[0] || !args[1] || !args[2])
// 	{
// 		sendMessageToCurrent("Missing parameters.");
// 		return;
// 	}
// 	const char1 = isNaN(parseInt(args[0])) ? await f.getCharacter(args[0], true) : await getData(args[0], "stats");
// 	const char2 = isNaN(parseInt(args[2])) ? await f.getCharacter(args[2], true) : await getData(args[2], "stats");
// 	// f.logJSON("char1", char1);
// 	// f.logJSON("char2", char2);
// 	const abil1 = char1.abilities ? char1.abilities[args[1]] : undefined;
// 	if (!char1.name || !char2.name)
// 	{
// 		sendMessageToCurrent(`${"Args[0] does not exist.".repeat(!char1.name)} ${"Args[2] does not exist.".repeat(!char2.name)}`);
// 		return;
// 	}

// 	const attack2 = { name: "attack", description: "A singular strike" };
// 	const combatResult = attack(char1, char2, abil1 || attack2);
// 	const newEmbed = new Discord.RichEmbed(
// 		{
// 			title: `${combatResult.attacker} :crossed_swords: ${combatResult.defender}`,
// 			fields:
// 						[
// 							{
// 								name: `${combatResult.attacker} used: ${combatResult.ability.name}.`,
// 								value: `**${combatResult.description} Dealt ${Math.round(combatResult.damage)} damage!**`,
// 							},
// 							{
// 								name: `${combatResult.defender}`,
// 								value: `\`${addHPBar(combatResult.DMHP, combatResult.DHP)}\``,
// 							},
// 							{
// 								name: `━━━━━━━━ •:arrow_down:• ━━━━━━━━`,
// 								value: `\`${addHPBar(combatResult.DMHP, combatResult.DHP - combatResult.damage)}\``,
// 							},
// 						],
// 		}
// 	);

// 	sendMessageToCurrent(newEmbed);
// }