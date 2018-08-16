const { Listener } = require('discord-akairo');

class GuildMemberUpdateListener extends Listener {
	constructor() {
		super('guildMemberUpdate', {
			emitter: 'client',
			event: 'guildMemberUpdate',
			category: 'client'
		});
	}

	async exec(oldMember, newMember) {
		const roleState = this.client.settings.get(newMember.guild, 'roleState');
		if (roleState) {
			await newMember.guild.members.fetch(newMember.id);
			if (newMember.roles) {
				const roles = newMember.roles.filter(role => role.id !== newMember.guild.id).map(role => role.id);
				if (roles.length) {
					await this.client.db.models.role_states.upsert({ guild: newMember.guild.id, user: newMember.id, roles });
				} else {
					await this.client.db.models.role_states.destroy({ where: { guild: newMember.guild.id, user: newMember.id } });
				}
			}
		}
	}
}

module.exports = GuildMemberUpdateListener;
