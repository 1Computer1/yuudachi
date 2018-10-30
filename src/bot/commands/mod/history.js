const { Command } = require('discord-akairo');
const { historyEmbed } = require('../../util');

class HistoryCommand extends Command {
	constructor() {
		super('history', {
			aliases: ['history'],
			category: 'mod',
			description: {
				content: '.',
				usage: '<member>',
				examples: ['history @Crawl']
			},
			channel: 'guild',
			clientPermissions: ['MANAGE_ROLES'],
			ratelimit: 2,
			args: [
				{
					'id': 'member',
					'match': 'content',
					'type': 'member',
					'default': message => message.member
				}
			]
		});
	}

	async exec(message, { member }) {
		if (!this.client.settings.get(message.guild, 'moderation', false)) {
			return message.reply('moderation commands are disabled on this server.');
		}
		const staffRole = message.member.roles.has(this.client.settings.get(message.guild, 'modRole'));
		if (!staffRole && message.author.id !== member.id) return message.reply('you know, I know, we should just leave it at that.');

		const dbCases = await this.client.db.models.cases.findAll({ where: { target_id: member.id } });
		if (!dbCases.length) {
			return message.reply('I looked where I could, but I couldn\'t find a case with that Id, maybe look for something that actually exists next time!');
		}
		const embed = historyEmbed(member, dbCases);

		return message.util.send(embed);
	}
}

module.exports = HistoryCommand;
