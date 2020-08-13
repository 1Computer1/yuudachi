import 'reflect-metadata';

import { Amqp } from '@spectacles/brokers';
import { AmqpResponseOptions } from '@spectacles/brokers/typings/src/Amqp';
import { on } from 'events';
import postgres from 'postgres';
import { Lexer, Parser, prefixedStrategy, Args } from 'lexure';
import { resolve } from 'path';
import readdirp from 'readdirp';
import Rest from '@yuudachi/rest';
import { container } from 'tsyringe';

import Command, { commandInfo } from '../src/Command';
import { kSQL } from '../src/tokens';
import { Message } from '@spectacles/types';

const token = process.env.DISCORD_TOKEN;
if (!token) throw new Error('missing discord token');

const restBroker = new Amqp('rest');
const rest = new Rest(token, restBroker);
const broker = new Amqp('gateway');
const pg = postgres();

container.register(Rest, { useValue: rest });
container.register(kSQL, { useValue: pg });

const commands = new Map<string, Command>();

const files = readdirp(resolve(__dirname, '..', 'src', 'commands'), {
	fileFilter: '*.js',
});

void (async () => {
	const conn = await broker.connect('rabbitmq');
	await broker.subscribe(['MESSAGE_CREATE']);

	await restBroker.connect(conn);

	for await (const dir of files) {
		const cmdInfo = commandInfo(dir.path);
		if (!cmdInfo) continue;

		console.log(cmdInfo);
		const command = container.resolve<Command>((await import(dir.fullPath)).default);
		commands.set(command.name ?? cmdInfo.name, command);
		command.aliases?.forEach((alias) => commands.set(alias, command));
	}

	type MessageCreates = AsyncIterable<[Message, AmqpResponseOptions]>;
	for await (const [message, { ack }] of on(broker, 'MESSAGE_CREATE') as MessageCreates) {
		ack();
		const [data] = (await pg`select prefix
		from guild_settings
		where guild_id = ${message.guild_id ?? null};`) as [{ prefix: string | null }];
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		const prefix = data?.prefix ?? '?';
		const lexer = new Lexer(message.content).setQuotes([
			['"', '"'],
			['“', '”'],
		]);

		const res = lexer.lexCommand((s) => (s.startsWith(prefix) ? prefix.length : null));
		if (!res) continue;

		const command = commands.get(res[0].value);
		if (!command) continue;

		const parser = new Parser(res[1]()).setUnorderedStrategy(prefixedStrategy(['--', '-'], ['=', ':']));
		const args = new Args(parser.parse());
		command.execute(message, args);
	}
})();
