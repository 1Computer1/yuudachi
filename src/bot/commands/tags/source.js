const { Command } = require('discord-akairo');

class TagSourceCommand extends Command {
	constructor() {
		super('tag-source', {
			category: 'tags',
			description: {
				content: 'Displays a tags source (Highlighted with Markdown).',
				usage: '<tag>'
			},
			channel: 'guild',
			ratelimit: 2,
			args: [
				{
					id: 'tag',
					match: 'content',
					type: 'tag',
					prompt: {
						start: message => `${message.author}, what tag would you like to see the source of?`,
						retry: (message, _, provided) => `${message.author}, a tag with the name **${provided.phrase}** does not exist.`
					}
				}
			]
		});
	}

	exec(message, { tag }) {
		return message.util.send(tag.content, { code: 'md' });
	}
}

module.exports = TagSourceCommand;
