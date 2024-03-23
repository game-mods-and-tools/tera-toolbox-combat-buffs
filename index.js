const path = require("path");

exports.NetworkMod = class {
	interval = null;
	mod = null;
	nextBracingForce = 0; // when next bracing force is available

	constructor(mod) {
		mod.dispatch.addDefinition("C_REQUEST_SPAWN_SERVANT", 2, path.join(__dirname, "defs", "C_REQUEST_SPAWN_SERVANT.2.def"));
		mod.dispatch.addDefinition("C_START_SERVANT_ACTIVE_SKILL", 2, path.join(__dirname, "defs", "C_START_SERVANT_ACTIVE_SKILL.2.def"));
		mod.dispatch.addDefinition("S_START_COOLTIME_SERVANT_SKILL", 1, path.join(__dirname, "defs", "S_START_COOLTIME_SERVANT_SKILL.1.def"));
		mod.dispatch.addDefinition("S_UPDATE_SERVANT_INFO", 1, path.join(__dirname, "defs", "S_UPDATE_SERVANT_INFO.1.def"));

		// code probably doesn't matter
		mod.dispatch.addOpcode("C_REQUEST_SPAWN_SERVANT", 23680, false);

		mod.game.initialize(['me', 'me.abnormalities']);

		mod.game.me.on("enter_combat", () => this.startReminders());
		mod.game.me.on("leave_combat", () => this.stopReminders());

		mod.command.add("crd", {
			r: () => { console.log("reloading"); this.stopReminders(); this.mod.manager.reload("combat-reminders"); },
			t: () => console.log("test"),
		});

		// listen for pet info
		mod.hook("C_START_SERVANT_ACTIVE_SKILL", 2, event => {
			if (event.skill !== mod.settings.skill) {
				mod.settings.skill = event.skill;
				mod.command.message("Pet skill saved");
			}
		});

		// if bracing force is used then this gives the remaining cooldown
		mod.hook("S_START_COOLTIME_SERVANT_SKILL", 1, event => {
			this.nextBracingForce = Date.now() + event.cooltime;
		});

		mod.hook("S_UPDATE_SERVANT_INFO", 1, event => {
			if (event.energy < 200) {
				// use food
			}
		});

		mod.hook("S_REQUEST_SPAWN_SERVANT", 4, (event) => {
			if (mod.game.me.is(event.ownerId)) {
				mod.command.remove("cr");

				const dbId = Number(event.dbid);
				const gameId = Number(event.gameId);

				if (mod.settings.dbid !== dbId) {
					mod.command.add("cr", () => {
						mod.settings.dbid = dbId
						mod.settings.id = event.id;
						mod.settings.gameId = gameId; // does this need to be in settings?
						mod.command.message("Config saved, remember to use pet skill to save it");
					});

					mod.command.message("New pet detected. Use !cr to save pet");
				} else if (mod.settings.skill) {
					mod.settings.gameId = gameId; // does this need to be in settings?

					// use skill if pet is same as saved and skill is known
					mod.send("C_START_SERVANT_ACTIVE_SKILL", 2, {
						gameId: this.mod.settings.gameId,
						skill: this.mod.settings.skill,
					});
				}
			}
		});

		this.mod = mod;
	}

	startReminders() {
		this.checkReminders();
		this.interval = this.mod.setInterval(() => this.checkReminders(), 3000);
	}

	stopReminders() {
		this.mod.clearInterval(this.interval);
		this.interval = null;
	}

	checkReminders() {
		// console.log("checkReminders");
		// console.log(Object.values(this.mod.game.me.abnormalities).map(ab => [ab.id, ab.data.name]));
		// bracing force +40
		if (!(13037 in this.mod.game.me.abnormalities)) {
			if (Date.now() > this.nextBracingForce) {
				this.useBracingForce();
			}
		}

		// nostrum
		/*
			[ 922, 'Superior Noctenium Elixir' ],
			[ 4030, 'Everful Nostrum' ],
			[ 4032, 'Everful Nostrum (BTS if shown)' ],
			[ 4955, 'Strong Canephora Potion' ],
			[ 70244, 'Hot Fish Buffet' ],
		*/
		// assume that we're using menma's nostrum and the hot fish
		// buffet is the shortest duration buff that it gives and it
		// disappears on death, use it as a reference for when to use
		// nostrum
		if (!(70244 in this.mod.game.me.abnormalities)) {
			this.useNostrum();
		}
	}

	useNostrum() {
		// console.log("useNostrum");
		// check if available?
		/*
		// red multinostrum
		this.mod.send("C_USE_PREMIUM_SLOT", 1, {
			set: 433,
			slot: 8,
			type: 1,
			id: 280061,
		});
		*/

		// blue multinostrum
		this.mod.send("C_USE_PREMIUM_SLOT", 1, { set: 433, slot: 7, type: 1, id: 280060 });
	}

	useBracingForce() {
		// console.log("useBracingForce");
		// spawn, this triggers the data listener too
		this.mod.send("C_REQUEST_SPAWN_SERVANT", 2, {
			servantId: this.mod.settings.id,
			uniqueId: this.mod.settings.dbid,
			unk: 0
		});
	}
}
