const Discord = require('discord.js');
const client = new Discord.Client();

// raw data
const FirstNameFile = require('./names.json');
const lastNameFile = require('./lastNames.json');

// discord data
const WOL_S = "532640741630017546";
const WOL_WEL = "532656917005467668";
const WOL_arena = "665367310629994498";
const WOL_arenaAud = "665367679007326238";
const bumpLock = 0;

const test_S = "571180141980549126";
const test_WEL = "651501879481860107";
const test_arena = "665612471771594757";
const test_arenaAud = "613565798967017473";
const test_starB = "663601689785532436";

// initialize database
const firebase = require('firebase/app');
const FieldValue = require('firebase-admin').firestore.FieldValue;
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccount.json');

admin.initializeApp({
	credential: admin.credential.cert(serviceAccount),
});

const database = admin.firestore();

class ConvF {
	getDataBase()
	{
		return database;
	}
	async retrieveRPChannels()
	{
		return await database.collection('World of Light').doc("RPChannels").get().then(d => { return d.data().channels; });
	}

	attack(attackerStats, defenderStats, ability = { name: "attack", description: "A simple strike." }, double = 0)
	{
		if (!attackerStats) return;
		// this.log(`***Combat!***`);
		// this.log(`Double: ${double}`);
		// this.logJSON("attacker", attackerStats);
		// this.logJSON("defender", defenderStats);
		// this.logJSON("ability", ability);

		function calculateCritRate()
		{
		// this.log('Calculating hit rate...');
			let hitRate = (attackerStats.hitBuff || 0) + (ability.hit || 0);
			const x = (fAttackerStats.dex + (fAttackerStats.dexBuff || 0) - fDefenderStats.spd - (fDefenderStats.spdBuff || 0));
			// calculate hitRate
			hitRate += ability.critRate || (x != 0 ? (60 + 16 * (x / Math.abs(x)) * Math.sqrt(Math.abs(x) / 5)) / 10 : 6);

			// perform hit
			hit = this.randomBetweenInt(1, 100);

			// this.log('hit: ' + hit);
			// this.log('hitRate: ' + hitRate);

			// see if hit hits and comments
			if (hit <= hitRate)
			{
				damage = damage * 3;
				commentOnHit = 'Critical Hit!';
			}
			else if (hit > hitRate)
			{
				commentOnHit = 'It lands!';
			}

			if (damage < 0 && commentOnHit != 'Miss!')
			{
				commentOnHit = 'It lands but does no damage!';
			}
		}

		function calculateDamage()
		{
		// base damage
			damage = attackerStats.damageBuff + ability.damage || 0;
			// this.log('Calculating damage...');
			if (weaponType == 'physical')
			{
				damage += ((parseInt(fAttackerStats.str) + weaponStats.might) * this.randomBetweenInt(weaponStats.minRange, weaponStats.maxRange) / 100) - (defenderStats.def || 0);
				damage *= ability.multiplier || 1;
			}
			else if (weaponType == 'magical')
			{
				damage += (parseInt(fAttackerStats.int) * this.randomBetweenInt(weaponStats.minRange, weaponStats.maxRange) / 100 + weaponStats.might) - (defenderStats.res || 0);
				damage *= ability.multiplier || 1;
			}
		// this.log('damage: ' + damage);
		}

		// this.log(`${attackerStats.name} Atk: ${attackerStats.str}`);
		// this.log(`${attackerStats.name} Mag: ${attackerStats.int}`);
		// this.log(`${attackerStats.name} Spd: ${attackerStats.spd}`);
		// this.log(`${attackerStats.name} Def: ${attackerStats.def}`);

		// this.log(`${defenderStats.name} Def: ${defenderStats.def}`);
		// this.log(`${defenderStats.name} Res: ${defenderStats.res}`);
		// this.log(`${defenderStats.name} Spd: ${defenderStats.spd}`);

		// pre damage and hit rate calculation
		let battleMessage = '';
		let commentOnHit = '';
		let damage;
		let hit;
		const fAttackerStats = Object.assign({}, attackerStats);
		const fDefenderStats = Object.assign({}, defenderStats);
		const weaponStats = attackerStats.right_equipped;
		const weaponType = attackerStats.right_equipped.type;

		// this.logJSON("Attacker wpn", weaponStats);

		// this.log(`INIT: damage: ${damage}; hit: ${hit}`);

		// set up beforeHP
		let beforeHP;
		if (defenderStats.HP > 0 && defenderStats.HP < 1)
		{
			beforeHP = `DEATH'S DOOR`;
		}
		else if (defenderStats.HP < 0)
		{
			beforeHP = `OVERKILL`;
		}
		else
		{
			beforeHP = Math.round(defenderStats.HP);
		}

		// dish out damage
		calculateDamage(); // damage here
		calculateCritRate(); // might turn to zero if misses + also reduces HP here

		// this.log('damage: ' + damage);

		battleMessage += `\n${beforeHP} => ${Math.round(defenderStats.HP - damage)}\n${commentOnHit}\n`;

		// doubling
		if (double)
		{
			battleMessage += "Double!";
			const doubleAttack = this.attack(attackerStats, defenderStats);
			damage += doubleAttack.damage;
			battleMessage += doubleAttack.description;
		}

		// results
		// this.log('***End of Combat***');

		return {
			"description": battleMessage,
			"attacker": attackerStats.name,
			"defender": defenderStats.name,
			"ability": ability,
			"damage": damage,
			"DHP": defenderStats.HP,
			"DMHP": defenderStats.maxHP,
		};
	}

	async clash(attackerID, defenderID, trueClash = false)
	{
		const attacker = typeof attackerID == 'string' ? await this.getData(attackerID, "stats") : attackerID; // this.logJSON("attacker", attacker);
		const defender = typeof defenderID == 'string' ? await this.getData(defenderID, "stats") : defenderID; // this.logJSON("defender", defender);
		const result = [0, "Miss"];

		// define hit chance
		const hitChance = attacker.Acc - defender.Dodge;

		// roll
		const hit = this.randomBetweenInt(1, 100);

		// see if it crits
		if (hit <= hitChance)
		{
		// crit
			if (hit <= hitChance / 10)
			{
				result[0] = attacker.Damage[1] * 2;
				result[1] = "Crit";
			}
			else // hit
			{
				result[0] = this.randomBetweenInt(attacker.Damage[0], attacker.Damage[1]);
				result[1] = "Hit";
			}
		}

		// apply protections
		result[0] = Math.round(result[0] * (1 - defender.Prot));

		// true clash
		if (trueClash)
		{
			// this.log(`True Clash: ${defender.name} went from ${defender.HP} to ${defender.HP - result[0]}`);
			defender.HP -= result[0];
			this.saveUserStats(defender, defenderID);
		}

		return result;
	}

	async saveUserData(userData, senderID)
	{
		await database.collection('World of Light').doc(senderID).set(userData);
	}

	saveUserStats(gstats, ID)
	{
		database.collection('World of Light').doc(ID).update(
			{
				stats: gstats,
			}
		)
			.then(r => { return r; })
			.catch(err => {
				this.log(err);
			});
	}

	async addMoney(targetID, amount)
	{
		if (!Number.isInteger(amount))
		{
			// this.log(`addMoney provided non-integer: ${amount}`);
			return;
		}

		const moneynow = await this.getData(targetID, "money");

		if(typeof moneynow == "object")
		{
			this.logJSON(`Unexpected object in addMoney`, moneynow);
			return;
		}

		if (moneynow)
		{
			database.collection('World of Light').doc(targetID).update({
				money: parseInt(moneynow) + parseInt(amount),
			});
		}
	}

	async getData(ID, info)
	{
		return await database.collection('World of Light').doc(ID).get()
			.then(q => {
				if (q.exists)
				{
					return q.data()[info] == undefined ? q.data() : q.data()[info];
				}
				else
				{
					return undefined;
				}
			})
			.catch((err) => {
				this.log(err);
				return undefined;
			});
	}

	async getCharacter(name, init = 0)
	{
		const getDoc = new Promise((resolve) => {
			database.collection('Character').doc(name).get()
				.then(q => {
					if (q.exists)
					{
						resolve(q.data());
					}
					else
					{
						resolve(undefined);
					}
				})
				.catch(err => {
					this.log(err);
					resolve(undefined);
				});
		});

		const char = await getDoc;
		if (init) return await this.charInit(char);
		return char;
	}

	async getNewCharacter(name, ini = 0)
	{
		if (!name) return;
		const char = await this.get("NewCharacter", name);
		if (!char) // this.log(`Found a null return for "${name}"`);
		{if (ini) return await this.charNewInit(char);}
		return char;
	}

	forAllStats(allStatsArray, method)
	{
		for (let i = 0; i < allStatsArray.length; i++)
		{
			method(allStatsArray[i]);
		}
	}

	async get(collection, key)
	{
		return await new Promise((resolve) => {
			database.collection(collection).doc(key).get()
				.then(q => {
					if (q.exists)
					{
						resolve(q.data());
					}
					else
					{
						resolve(undefined);
					}
				})
				.catch(err => {
					this.log(err);
					resolve(undefined);
				});
		});
	}

	async set(collection, key, object) {
		await database.collection(collection).doc(key).set(object);
	}

	async update(collection, key, object) {
		await database.collection(collection).doc(key).update(object);
	}

	async updateData(ID, object) {
		await database.collection('World of Light').doc(ID).update(object);
	}

	randomBetweenInt(number1, number2)
	{
	// it's (number2 - number1 + 1) because of Math.floor
		const result = Math.floor(Math.random() * Math.abs(number2 - number1 + 1) + number1); // this.log(result);
		return result;
	}

	randomBetweenDb(number1, number2)
	{
		return Math.random() * Math.abs(number2 - number1) + number1;
	}

	log(message)
	{
		console.log(message);
	}

	logJSON(name, object) {
		this.log(`${name}: ${JSON.stringify(object)}`);
	}

	HPTranslate(end) {
		return -200000 / (Math.pow((end + 40), 1.91)) + 200;
	}

	readiness(spd) {
		return (-2000 / Math.pow((spd / 4 + 6.65), 3)) + 6.7;
	}

	stamRegn(end) {
		return (-2000 / Math.pow((end / 4 + 6.65), 3)) + 6.7;
	}

	async deleteMessagesAfter(channel, ID)
	{
		// this.log("Deleting messages...");
		return await channel.fetchMessages({ after: ID })
			.then((collection) => {
			// this.log(collection.values());
				for (const m of collection.values())
				{
				// this.log(m.content);
					m.delete();
				}
				return 1;
			})
			.catch(err => {
				this.log(err);
			});
	}

	async awaitMessageContent(channel, filter, option = { maxMatches: 1 }) {
		return await channel.awaitMessages(filter, option)
			.then((collected) => {
			// this.log(collected);
				const returned = [];
				collected.forEach(c => returned.push(c.content));
				// this.log(returned);
				return returned;
			})
			.catch(err => {
				this.log(err);
				return undefined;
			});
	}

	drawMap(bx, by, allStats, focus)
	{
		const map = ['`', '`', '`'];
		const xMag = bx[1] - bx[0] + 1;
		const yMag = by[1] - by[0] + 1;

		// draw initial
		for (let i = 0; i < xMag * yMag + by[1]; i++)
		{
			const num = Math.floor(i / xMag);
			// f.log(`i: ${i}; num: ${num}`);
			if (i === (xMag * num) + (num - 1))
			{
				map.push('\n');
				// f.log("Jump");
			}
			else
			{
				map.push('⬜');
			}
		}

		allStats.map(stat => {
			// look for coords
			const X = stat.x;
			const Y = (by[1] - stat.y);
			const index = 3 + (xMag + 1) * Y + X; // f.log(`^^ index: ${index}`);

			if (stat.bot && stat.bot.type === 'block') map.splice(index, 1, '⬛');
			if (stat.bot && stat.bot.type === 'enemy') map.splice(index, 1, '🔴');
			if (stat.bot && stat.bot.type === 'barricade') map.splice(index, 1, '🟫');
			if (!stat.bot)
			{
				if (stat.HP != "dead") map.splice(index, 1, '🟢');
				else map.splice(index, 1, '❎');
			}
			if (focus && stat.name == focus) map.splice(index, 1, '⭐');
		});

		// end
		const result = map.concat(['`', '`', '`']);
		return result.join('');
	}

	movementTranslate(spd)
	{
		return (2 + Math.abs(spd)) / (2.25 + Math.abs(spd) / 32);
	}

	async charInit(charData)
	{
		if(!charData) return;
		const weapon = await this.get("Weapons", "Steel Sword");
		return Object.assign({}, Object.assign(charData, {
			hitBuff: 0,
			damageBuff: 0,
			strBuff: 0,
			dexBuff: 0,
			spdBuff: 0,
			endBuff: 0,
			intBuff: 0,
			perBuff: 0,
			wilBuff: 0,
			readiness: 0,
			stamina: 0,
			stress: 0,
			HP: charData.maxHP,
			left_equipped: charData.left_equipped || {},
			right_equipped: charData.right_equipped || weapon,
			swords: 0,
			shields: 0,
			sprints: 0,
		}));
	}

	async charNewInit(charData, coordsReset = false)
	{
		if(!charData) return undefined;
		const addTo = coordsReset ? {
			readiness: 0,
			HP: charData.AHP,
			x: 0,
			y: 0,
		} : {
			readiness: 0,
			HP: charData.AHP,
		};
		return Object.assign({}, Object.assign(charData, addTo));
	}

	charReset(charData, soft = 0)
	{
		return Object.assign({}, Object.assign(charData, {
			hitBuff: 0,
			damageBuff: 0,
			strBuff: 0,
			dexBuff: 0,
			spdBuff: 0,
			endBuff: 0,
			intBuff: 0,
			perBuff: 0,
			wilBuff: 0,
			readiness: 0,
			stamina: this.HPTranslate(charData.end) * 0.8,
			stress: soft ? charData.stress : 0,
			HP: soft ? charData.HP : this.HPTranslate(charData.end) * 2,
			swords: 0,
			shields: 0,
			boots: 0,
		}));
	}

	async createCharacter()
	{
		function Character()
		{
			1;
			0;
			"";
			0;
			0;
			0;
			0;
			0;
			0;
			0;
			0;
			0;

			0;
			0;
			0;
			0;
			0;
			0;
			0;
			0;

			'';
		}

		const thisCharacter = new Character();
		thisCharacter.level = 1;
		thisCharacter.exp = 0;
		const stats = ['str', 'int', 'dex', 'spd', 'def', 'res'];

		let BST = 0;
		thisCharacter.end = this.randomBetweenInt(10, 20); BST += thisCharacter.end;
		thisCharacter.HP = this.HPTranslate(thisCharacter.end);
		thisCharacter.maxHP = thisCharacter.HP;
		for (let i = 0; i < 6; i++)
		{
			const statNow = stats[this.randomBetweenInt(0, (5 - i))];
			stats.splice(stats.indexOf(statNow), 1);
			const randomizer = this.randomBetweenInt(-2, 2);
			thisCharacter[statNow] = this.randomBetweenInt(0, 10 - randomizer - i);
			BST += thisCharacter[statNow];
		}

		thisCharacter.name = FirstNameFile.names[this.randomBetweenInt(0, FirstNameFile.names.length - 1)] + ` ${lastNameFile.names[this.randomBetweenInt(0, lastNameFile.names.length - 1)]}`;
		thisCharacter.right_equipped = await this.get('Weapons', thisCharacter.str >= thisCharacter.int ? 'Iron Sword' : 'El Tome');

		// growthRates
		const gstats = ['gstr', 'gint', 'gdex', 'gspd', 'gdef', 'gres'];

		thisCharacter.gend = this.randomBetweenInt(30, 150 - thisCharacter.end * 6);
		for (let i = 0; i < 6; i++)
		{
			const gstatNow = gstats[this.randomBetweenInt(0, (5 - i))];
			gstats.splice(gstats.indexOf(gstatNow), 1);
			const randomizer = this.randomBetweenInt(-10, 10);
			const result = this.roundToFive(this.randomBetweenInt(0, 200 - BST - randomizer - i * 15));
			thisCharacter[gstatNow] = result * (Math.sign(result) == -1 ? -1 : 1);
		}

		return thisCharacter;
	}

	addHPBar(maxValue, nowValue, addMessage = '') {
		let blockCount = Math.round(nowValue / 2);
		let lineCount = Math.round(maxValue / 2) - blockCount;

		if (nowValue <= 0) {
			blockCount = 0;
			lineCount = Math.round(maxValue / 2);
		}
		// this.log('lineCount: ' + lineCount);
		// this.log('blockCount: ' + blockCount);

		for (let i = 0; i < blockCount; i++) {
			addMessage += '█';
		}
		for (let i = 0; i < lineCount + 1; i++) {
			addMessage += '|';
		}
		// this.log(`add message: ${addMessage}`);
		return addMessage;
	}

	addBars(count, withSpace = false, addMessage = '', specifiedBarriers = [false, [0, 0]]) {
		const barrierRequested = specifiedBarriers[0];
		const barrierBegin = specifiedBarriers[1][0];
		const barrierEnd = specifiedBarriers[1][1];
		if (barrierRequested)
		{
			for (let loop = 1; loop <= count; loop++)
			{
				if (loop == barrierBegin) addMessage += '[';
				addMessage += `█${' '.repeat(withSpace)}`;
				if (loop == barrierEnd) addMessage += ']';
			}
		}
		else
		{
			addMessage += `█${' '.repeat(withSpace)}`.repeat(count);
		}
		return addMessage;
	}

	returnExplorerEmbed(explorerStats)
	{
		if (explorerStats.HP > explorerStats.AHP) explorerStats.HP = explorerStats.AHP;
		// if (explorerStats.stamina > HPTranslate(explorerStats.end) * 0.8) explorerStats.stamina = HPTranslate(explorerStats.end) * 0.8;

		const title = `${'`'}${this.addHPBar(explorerStats.AHP, explorerStats.HP)}${'`'}`;
		const stamina = `${'`'}${this.addHPBar(50, explorerStats.readiness)}${'`'}`;
		// const status = `:dagger: : ${addBars(explorerStats.swords, true)}\n:shield: : ${addBars(explorerStats.shields, true)}\n:boot: : ${addBars(explorerStats.boots, true)}`;
		// const actions = `1. Attack (perform a default attack) \n2. Move (gain or lose distance) \n 3. Abilities (use abilities. for example, try: "abilities list" or "abilities info 1") \n 4. Surround (check your enemies' distance)\n 5. Info (check last round/ this round's actions)\n ${explorerStats.name}'s distance is ${explorerStats.distance}.`;
		return new Discord.RichEmbed(
			{
				author: {
					name: explorerStats.name,
				},
				title: title,
				fields: [
					{
						name: `Readiness ${Math.floor(explorerStats.readiness)} / 50`,
						value: stamina,
					},
				],
				footer: {
					text: `( ${explorerStats.x}, ${explorerStats.y} )`,
				},
			}
		);

	}

	returnFullPlayerEmbed(stat, bx, by, allStats)
	{
		const explorerEmbed = this.returnExplorerEmbed(stat);
		explorerEmbed.fields.push({ name: `Your Coords: ( ${stat.x}, ${stat.y} )`, value: `${this.drawMap(bx, by, allStats, stat.name)}` });
		return explorerEmbed;
	}

	stress(number, will)
	{
		const stressed = number + (3 * number / will);
		return this.randomBetweenInt(stressed - stressed * 0.9 / stressed, stressed - stressed * 1.1 / stressed);
	}

	addChannel(now, channelID)
	{
		now.push(channelID);
		database.collection('World of Light').doc("RPChannels").update({
			channels: now,
		});
	}

	async refreshChannels(now)
	{
		now = await database.collection('World of Light').doc("RPChannels").get()
			.then(d => {
				return d.data().channels;
			});
		// this.log(now);
	}

	returnCharEmbed(character)
	{
		const charEmbed = new Discord.RichEmbed({
			title: character.name,
			description: this.returnCharDescription(character),
		});
		return charEmbed;
	}

	returnCharDescription(character)
	{
		return `level: ${character.level}
	HP: ${Math.round(character.maxHP)}			(${character.gend}%)\n
	STR: ${character.str}		(${character.gstr}%)\n
	MAG: ${character.int}		(${character.gint}%)\n
	SKI: ${character.dex}		(${character.gdex}%)\n
	SPD: ${character.spd}		(${character.gspd}%)\n
	DEF: ${character.def}		(${character.gdef}%)\n
	RES: ${character.res}		(${character.gres}%)\n
	Equipped: ${character.right_equipped.name}`;
	}

	returnCommandArgs(content)
	{
		const command = content.split(' ')[0].slice(2);
		const args = content.split(' '); args.shift();
		return [command, args];
	}

	roundToFive(number)
	{
		return Math.round(number / 5) * 5;
	}

	async wait(ms)
	{
		if (isNaN(ms)) return;
		await new Promise((resolve) => {
			setTimeout(() => {
				resolve();
			}, ms);
		});
	}

	arraySum(array)
	{
		let total = 0;
		array.forEach(num => {
			if (isNaN(num)) return;
			total += parseInt(num);
		});
		return total;
	}

	async arenaSession(gchar1, gchar2)
	{
		const arenaChannel = client.channels.get(WOL_arena);
		const audChannel = client.channels.get(WOL_arenaAud);

		// introduction
		const char1 = gchar1 || await this.createCharacter();
		const char2 = gchar2 || await this.createCharacter();

		const introEmbed = new Discord.RichEmbed({
			author: { name: "Heimdallr", icon_url: client.user.avatarURL },
			title: "Arena battle incoming! Place your bets!",
			description: "1. Bet between 10 - 100 Gold in #audience\n2. Use command //bet fighter-tag-here(1 or 2) your-gold-here (Example: //bet 2 100)",
			fields: [
				{ name: '1. ' + char1.name, value: this.returnCharDescription(char1), inline: true },
				{ name: '2. ' + char2.name, value: this.returnCharDescription(char2), inline: true },
			],
			footer: { text: `300 Seconds for bets...` },
		});
		const introMessage = await arenaChannel.send(introEmbed);

		// betting

		// 5 Minutes for betting
		let timeRemaining = 300;
		const tock = () => {
			timeRemaining -= 10;
			const newIntroEmbed = introEmbed;
			newIntroEmbed.footer = { text: `${timeRemaining} Seconds for bets... ` };
			introMessage.edit(newIntroEmbed);
		};
		const timeTracker = setInterval(() => {
			tock();
		}, 10 * 1000);

		// NOTE: Async here breaks this filter
		const validBet = mes => {
			const Bargs = this.this.returnCommandArgs(mes.content)[1];
			const validBett = mes.content.startsWith("//bet") &&
		(Bargs[0] == '1' || Bargs[0] == '2') &&
		Number.isInteger(parseInt(Bargs[1])) &&
		parseInt(Bargs[1]) > 9 &&
		parseInt(Bargs[1]) < 101;

			return validBett;
		};
		const betters = await audChannel.awaitMessages(validBet, { time: 5 * 60 * 1000 });
		tock();
		clearInterval(timeTracker);
		// this.log(betters);

		// 20 seconds for looking at bets
		const betEmbed = new Discord.RichEmbed({
			author: { name: "Heimdallr", icon_url: client.user.avatarURL },
			title: "Here are the bets:",
			fields: [ { name: "No bets--", value: "--it would seem." } ],
			footer: { text: `20s Remaining...` },
		});

		// finding all bets
		const Gfields = [];
		for (let i = 0; i < betters.array().length; i++)
		{
			const mes = betters.array()[i];
			const Bargs = this.this.returnCommandArgs(mes.content)[1];
			Gfields.push({ name: `${eval(`char${Bargs[0]}.name`)}`, value: `${mes.author.username} with ${Bargs[1]} Gold.`, inline: true });
			await this.addMoney(mes.author.id, -1 * Math.abs(parseInt(Bargs[1])));
		}

		if (Gfields[0]) betEmbed.fields = Gfields;

		// watch your bets
		const tick = () => {
			time -= 5;
			const newBetEmbed = betEmbed;
			newBetEmbed.footer = { text: `${time}s Remaining...` };
			betMessage.edit(newBetEmbed);
		};
		const betMessage = await arenaChannel.send(betEmbed);
		let time = 20;
		const timeDownClock = setInterval(() => {
			tick();
		}, 5 * 1000);
		await this.wait(20 * 1000);
		tick();
		clearInterval(timeDownClock);

		// combat starts
		const combatEmbed = new Discord.RichEmbed({
			author: { name: "Heimdallr", icon_url: client.user.avatarURL },
			title: "Get set...",
		});
		const combatMessage = await arenaChannel.send(combatEmbed);

		let turn = 1;
		await new Promise((resolve) => {
			const tickTock = setInterval(() => {
				const attacker = turn == 1 ? char1 : char2;
				const defender = turn == 1 ? char2 : char1;
				const combatResult = this.attack(attacker, defender, { name: "attack", description: "Simple attack." }, attacker.spd >= defender.spd + 5);

				const newCombatEmbed = new Discord.RichEmbed(
					{
						title: `${combatResult.attacker} :crossed_swords: ${combatResult.defender}`,
						fields:
							[
								{
									name: `${combatResult.attacker} used: ${combatResult.ability.name}.`,
									value: `**${combatResult.description} Dealt ${Math.round(combatResult.damage)} damage!**`,
								},
								{
									name: `${combatResult.defender}`,
									value: `\`${this.addHPBar(combatResult.DMHP, combatResult.DHP)}\``,
								},
								{
									name: `━━━━━━━━ •:arrow_down:• ━━━━━━━━`,
									value: `\`${this.addHPBar(combatResult.DMHP, combatResult.DHP - combatResult.damage)}\``,
								},
							],
					}
				);
				defender.HP -= combatResult.damage;
				combatMessage.edit(newCombatEmbed);
				turn == 1 ? turn++ : turn--;

				if (char1.HP < 0 || char2.HP < 0)
				{
					clearInterval(tickTock);
					resolve();
				}
			}, 4 * 1000);
		});
		await this.wait(5 * 1000);

		// victory screen
		const victorChar = char1.HP > 0 ? char1 : char2;
		const victorTag = char1.HP > 0 ? '1' : '2'; // this.log(victorTag);
		const loserTag = char1.HP > 0 ? '2' : '1'; // this.log(loserTag);
		const winningBetters = betters.array().filter(mes => this.returnCommandArgs(mes.content)[1][0] == victorTag);
		const losingBetters = betters.array().filter(mes => this.returnCommandArgs(mes.content)[1][0] == loserTag);
		const winningFields = [];
		const lostGold = this.arraySum(losingBetters.map(mes => this.returnCommandArgs(mes.content)[1][1]));

		const coinEmote = client.guilds.get(WOL_S).emojis.find(e => e.name == 'coin');

		for (let i = 0; i < winningBetters.length; i++)
		{
			const mes = winningBetters[i];
			const award = parseInt(this.returnCommandArgs(mes.content)[1][1]) * 1.5 + lostGold / winningBetters.length;
			winningFields.push({ name: mes.author.username, value: `${Math.round(award)} ${coinEmote}` });
			await this.addMoney(mes.author.id, award);
		}

		const victoryEmbed = new Discord.RichEmbed({
			title: `${victorChar.name} is victorious!`,
			fields: winningFields,
		});
		combatMessage.edit(victoryEmbed);
	}

	async gladiatorPurchase(channel, char)
	{
	// === defensive stuff ===
		if (!channel) return;
		// ===

		// data set up
		let highestBetter;
		let currentHighest = 0;
		const timeLeft = 30;

		const filter = mes => {
			const Bargs = this.returnCommandArgs(mes.content)[1];
			const validBett = mes.content.startsWith("//buy") &&
		Number.isInteger(parseInt(Bargs[0])) &&
		parseInt(Bargs[0]) > 0;

			return validBett;
		};
		const options = { time: 30 * 1000 };
		let collector = new Discord.MessageCollector(channel, filter, { time: 30 * 1000 });
		const collectFnc = async mes => {
			const Bargs = this.returnCommandArgs(mes.content)[1];
			const currency = await this.getData(mes.author.id, "money");
			const givenMoney = parseInt(Bargs[0]);

			// this.log(`${mes} and given: ${givenMoney}`);

			if (currentHighest < givenMoney && currency > givenMoney)
			{
				currentHighest = givenMoney;
				highestBetter = mes.author;
				collector.stop("new_bet");
				// this.log(`New bet of ${givenMoney}`);
			}
		};
		const endFnc = async (collectedCollection, reason) => {
			const messagesCollected = collectedCollection.array();
			if (reason == "new_bet")
			{
				// this.log("ends witha new bet");
				// this creates a loop
				collector = this.collectInfoViaCollector(channel, filter, collectFnc, endFnc, options, collector);
			}
			else if (highestBetter)
			{
			// give gladiator to highestBetter
				// this.log(highestBetter);
			}
			else
			{
				// this.log("no betters");
			// put to Barracks if HP > 0
			}
		};

		// introduction
		const auctionEmbed = new Discord.RichEmbed({
			author: { name: char.name },
			title: "The Gladiator waves their hand. Would you purchase their loyalty to you?",
			description: 'Do "//buy your-value-here" to name a price. The highest bidder gets this Gladiator.',
		});
		const auctionMessage = await channel.send(auctionEmbed);

		// send timer
		const timerEmbed = new Discord.RichEmbed({
			author: { name: `${highestBetter.username} with ${currentHighest}!` },
			title: `30 Seconds...`,
			footer: { text: "Timer will be renewed when a higher bid is presented." },
		});
		const timerMessage = await channel.send(timerEmbed);

		// start collection
		this.collectInfoViaCollector(channel, filter, collectFnc, endFnc, options, collector);
	}

	collectInfoViaCollector(channel, filter, callbackCollect, callbackEnd, option = { maxMatches: 1 }, collector = new Discord.MessageCollector(channel, filter, option)) {
		collector = channel.createMessageCollector(filter, option);
		collector.on('collect', callbackCollect);
		collector.on('end', callbackEnd);
	}

	async forEachBetter(array, method)
	{
		if (typeof array != "object" || typeof method != "function")
		{
			// this.log(`Invalid types for array: ${array} or method: ${method}.`);
			return;
		}
		for (let i = 0; i < array.length; i++)
		{
			await method(array[i]);
		}
	}

	findDistance(selfStat, enemyStat)
	{
		if (!selfStat || !enemyStat) return;
		return Math.sqrt((selfStat.x - enemyStat.x) * (selfStat.x - enemyStat.x) + (selfStat.y - enemyStat.y) * (selfStat.y - enemyStat.y));
	}

	checkReaction(reaction, message)
	{
		if (!message || !reaction) return false;
		const result = message.reactions.reduce((MO, r, name) => {
			// f.log(`moved: ${name}; T/F: ${name == '▶️'}`);
			// check inside move reactions
			if (name == reaction)
			{
				// reacted to move?
				const reduceResult = r.users.reduce((t, user) => {
					// f.log(user);
					return user.id === '262871357455466496' ? true : t;
				}, false);
				// f.log(`▶️ reduceResult == ${reduceResult}`);
				// if reacted, remove move react
				return reduceResult;
			}
			return MO;
		}, false);
		return result;
	}

	findObstacles(allStats, stat, axis, magnitude)
	{
		const counterAxis = axis == 'x' ? 'y' : 'x';
		return allStats.filter(s => {
			let conditionOne;
			if (Math.sign(magnitude) == -1) conditionOne = s[axis] >= stat[axis] + magnitude && s[axis] < stat[axis];
			if (Math.sign(magnitude) == 1) conditionOne = s[axis] <= stat[axis] + magnitude && s[axis] > stat[axis];
			return (s.name != stat.name && conditionOne && s[counterAxis] == stat[counterAxis]);
		});
	}

	findClosestEntity(allStats, stat, ignore = ['block'])
	{
		const closestR = allStats.reduce((closest, s) => {
			if (s.bot && ignore.includes(s.bot.type)) return closest;
			if (this.findDistance(s, stat) === 0) return closest;
			if(s.name === stat.name) return closest;
			if(s.HP === 'dead') return closest;
			return closest ? this.findDistance(closest, stat) > this.findDistance(s, stat) ? s : closest : s;
		}, undefined);
		this.log(closestR);
		return closestR;
	}

	findClosestObstacle(allStats, stat, axis, magnitude)
	{
		const obs = this.findObstacles(allStats, stat, axis, magnitude);
		// this.log(`obs for ${stat.name}`);
		// this.log(obs);
		const defaultR = { x: axis === 'x' ? stat.x + magnitude : stat.x, y: axis === 'y' ? stat.y + magnitude : stat.y };
		const result = obs[0] ? obs.reduce((closest, nstat) => {
			if(nstat.name === stat.name) return closest;
			const newMag = this.findDistance(closest, nstat);
			return newMag < this.findDistance(stat, closest) ? nstat : closest;
		}, defaultR) : undefined;
		// this.logJSON(`closest obs for ${stat.name} is`, result);
		return result;
	}

	blockadeMagReduction(allStats, stat, axis, magnitude)
	{
		if (axis !== 'x' && axis !== 'y') return;
		if (!allStats || !stat) return;
		if (Math.abs(magnitude) == 0) return magnitude;

		// 1. find objects ahead of magnitude
		const obs = this.findObstacles(allStats, stat, axis, magnitude);

		// this.log(`${stat.name}'s ${axis}: ${stat[axis]}`);
		// this.log(obs);

		// 2. lower magnitude to the closest object
		const result = obs.reduce((lowest, s) => {
			const newMagnitude = Math.abs(s[axis] - stat[axis]) - 1;
			return newMagnitude < lowest ? newMagnitude : lowest;
		}, Math.abs(magnitude)) * Math.sign(magnitude);
		// this.log(`Reduced ${axis} from ${magnitude} to ${result}`);
		return result;
	}

	movement_check(moverStat, axis, moveMagnitude, requiredReadiness, BX, BY, allStats, borderX, borderY, createdChannel)
	{
		if (moveMagnitude === 0 || (axis !== 'x' && axis !== 'y')) return;
		// if input is valid
		if (moveMagnitude)
		{
			// rejected
			// 1. not enough readiness
			if (moverStat.readiness < requiredReadiness + Math.abs(7 * moveMagnitude))
			{
				createdChannel.send(`${moverStat.name}: "Insufficient readiness."`);
				return false;
			}
			// 2. obstacle ahead
			const obFilter = axis === 'y' ? s => s.x === BX && s.y === BY + moveMagnitude : s => s.x === BX + moveMagnitude && s.y === BY;
			const obstacles = allStats.filter(obFilter);
			if (obstacles[0])
			{
				createdChannel.send(`${moverStat.name}: "There is an obstacle at ( ${obstacles[0].x}, ${obstacles[0].y} )."`);
				return false;
			}

			// 3. out of bounds
			const outOfBounds = axis === 'x' ? BX + moveMagnitude < borderX[0] || BX + moveMagnitude > borderX[1] : BY + moveMagnitude < borderY[0] || BY + moveMagnitude > borderY[1];
			if (outOfBounds)
			{
				createdChannel.send(`${moverStat.name}: "Out of bounds movement."`);
				return false;
			}

			// valid
			return true;
		}
		else
		{
			createdChannel.send(`${moverStat.name}: 'Cannot recognize "${moveMagnitude}".'`);
			return false;
		}
	}

	movement_direction(axis, moveMagnitude)
	{
		const direction = axis === 'x' ? Math.sign(moveMagnitude) > 0 ? "right" : "left" : Math.sign(moveMagnitude) > 0 ? "up" : "down";
		return direction;
	}

	fullMovement(moveMagnitude, axis, moverStat, allStats, requiredReadiness, createdChannel, allActions, allActionsTranslated, BX, BY, borderX, borderY)
	{
		if (moveMagnitude === 0) return;
		const validInput = this.movement_check(moverStat, axis, moveMagnitude, requiredReadiness, BX, BY, allStats, borderX, borderY, createdChannel);
		if (validInput)
		{
			const direction = this.movement_direction(axis, moveMagnitude);
			allActions.push([axis, moveMagnitude, Math.abs(7 * moveMagnitude)]);
			allActionsTranslated.push(`Move ${direction} ${Math.abs(moveMagnitude)} blocks.`);
			return moveMagnitude;
		}
		else {return 0;}
	}

	attackMove(attackerStat, allStats, requiredReadiness, targetName, createdChannel, allActions, allActionsTranslated)
	{
		if (this.checkAttackValidation(attackerStat, requiredReadiness, createdChannel)) return 0;

		if (targetName)
		{
			const attacked = allStats.find(c => c.name === targetName);
			if (!attacked)
			{
				let newAttacked;
				// not name targets
				switch(targetName)
				{
				case "left":
					newAttacked = this.findClosestObstacle(allStats, attackerStat, 'x', -1 * attackerStat.Range[1]);
					break;

				case "right":
					newAttacked = this.findClosestObstacle(allStats, attackerStat, 'x', attackerStat.Range[1]);
					break;

				case "up":
					newAttacked = this.findClosestObstacle(allStats, attackerStat, 'y', attackerStat.Range[1]);
					break;

				case "down":
					newAttacked = this.findClosestObstacle(allStats, attackerStat, 'y', -1 * attackerStat.Range[1]);
					break;

				case "closest":
					newAttacked = this.findClosestEntity(allStats, attackerStat, ['block', 'player']);
					break;

				default:
					createdChannel.send(`Cannot recognize "${targetName}".`);
					break;
				}

				// there exist an enemy in attack range
				if (newAttacked)
				{
					allActions.push(["attack", newAttacked, 15]);
					allActionsTranslated.push(`Attack ${newAttacked.name}. ( ${newAttacked.x}, ${newAttacked.y} )`);
					return 15;
				}
				else
				{
					// no one in attack range
					createdChannel.send(`No valid targets within range.`);
					return 0;
				}
			}
			else
			{
				// name targets
				allActions.push(["attack", attacked, 15]);
				allActionsTranslated.push(`Attack ${targetName}. ( ${attacked.x}, ${attacked.y} )`);
				return 15;
			}
		}
		else
		{
			createdChannel.send(`Cannot recognize "${targetName}".`);
			return 0;
		}
	}

	coordAttackMove(attackerStat, allStats, requiredReadiness, coords, createdChannel, allActions, allActionsTranslated)
	{
		if (this.checkAttackValidation(attackerStat, requiredReadiness, createdChannel)) return 0;

		// 1. find target
		const target = allStats.find(s => s.x === coords.x && s.y === coords.y);
		if (!target)
		{
			createdChannel.send(`No enemies at ( ${coords.x}, ${coords.y} ).`);
			return 0;
		}
		// 2. push moves
		allActions.push(["attack", target, 15]);
		allActionsTranslated.push(`Attack ${target.name}. ( ${target.x}, ${target.y} )`);
		return 15;
	}

	checkAttackValidation(attackerStat, requiredReadiness, createdChannel)
	{
		if (attackerStat.readiness < requiredReadiness + 15)
		{
			createdChannel.send("Insufficient readiness.");
			return 1;
		}
		return 0;
	}

	spillBattleBoards(allStats)
	{
		const resultMessageDictionary = {};
		for (let i = 0; i < allStats.length; i++)
		{
			const stat = allStats[i];
			const type = allStats[i].bot ? allStats[i].bot.type : "player";
			// this.log(stat);
			if (type == 'block') continue;
			if (!resultMessageDictionary[type])
			{
				resultMessageDictionary[type] = new Discord.RichEmbed({
					title: `${this.capFirstLetter(type)}`,
					fields: [
						{
							name: `${this.capFirstLetter(stat.name)}`,
							value: `: ${"`" + this.addHPBar(allStats[i].AHP, allStats[i].HP) + "`"}`,
						},
					],
				});
			}
			else
			{
				resultMessageDictionary[type].fields.push({ name: allStats[i].name + (stat.HP === 'dead' ? ' ( defeated )' : ''), value: `: ${"`" + this.addHPBar(allStats[i].AHP, stat.HP) + "`"}` });
			}
		}
		return resultMessageDictionary;
	}

	capFirstLetter(string)
	{
		return string[0].toUpperCase() + string.slice(1);
	}

	countUnits(allStats, name)
	{
		const result = allStats.reduce((count, stat) => {
			return stat.name.startsWith(name) ? count + 1 : count;
		}, 0); // this.log(`result: ${result}`);
		return result;
	}

	sendAndDelete(string, time, channel)
	{
		channel.send(string)
			.then((m) => {
				setTimeout(() => {
					m.delete();
				}, time);
			});
	}

	returnTimerEmbed(timeRemaining)
	{
		const titleString = isNaN(timeRemaining) ? timeRemaining : `${timeRemaining} second${timeRemaining > 0 ? 's' : ''} remaining...`;
		return new Discord.RichEmbed({
			title: titleString,
		});
	}

	returnInputManual()
	{
		const returnEmbed = new Discord.RichEmbed({
			title: "All Inputs!",
			fields: [
				{
					name: "**//h (number)**",
					value: "To move horizontally. To change your x-axis. Example: //h 5",
				},
				{
					name: "**//v (number)**",
					value: "To move vertically. To change your y-axis. Example: //h 5",
				},
				{
					name: "**//h (number)**",
					value: "To move horizontally. To change your x-axis. Example: //h 5",
				},
				{
					name: "**//h (number)**",
					value: "To move horizontally. To change your x-axis. Example: //h 5",
				},
				{
					name: "**//h (number)**",
					value: "To move horizontally. To change your x-axis. Example: //h 5",
				},
			],
		});
		return returnEmbed;
	}

	counterAxis(axis)
	{
		if (axis != 'x' && axis != 'y') return undefined;
		return axis === 'x' ? 'y' : 'x';
	}
}

module.exports = ConvF;