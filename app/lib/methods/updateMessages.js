import { sanitizedRaw } from '@nozbe/watermelondb/RawRecord';

import buildMessage from './helpers/buildMessage';
import log from '../../utils/log';
import watermelondb from '../database';
import protectedFunction from './helpers/protectedFunction';

export default function updateMessages(rid, messages) {
	try {
		const watermelon = watermelondb.database;
		return watermelon.action(async() => {
			const subCollection = watermelon.collections.get('subscriptions');
			const sub = await subCollection.find(rid);
			const msgCollection = watermelon.collections.get('messages');
			const threadCollection = watermelon.collections.get('threads');
			const threadMessagesCollection = watermelon.collections.get('thread_messages');
			const allMessagesRecords = await sub.messages.fetch();
			const allThreadsRecords = await sub.threads.fetch();
			const allThreadMessagesRecords = await sub.threadMessages.fetch();

			messages = messages.map(m => buildMessage(m));

			// filter messages
			let msgsToCreate = messages.filter(i1 => !allMessagesRecords.find(i2 => i1._id === i2.id));
			let msgsToUpdate = allMessagesRecords.filter(i1 => messages.find(i2 => i1.id === i2._id));

			// filter threads
			const allThreads = messages.filter(m => m.tlm);
			let threadsToCreate = allThreads.filter(i1 => !allThreadsRecords.find(i2 => i1._id === i2.id));
			let threadsToUpdate = allThreadsRecords.filter(i1 => allThreads.find(i2 => i1.id === i2._id));

			// filter thread messages
			const allThreadMessages = messages.filter(m => m.tmid);
			let threadMessagesToCreate = allThreadMessages.filter(i1 => !allThreadMessagesRecords.find(i2 => i1._id === i2.id));
			let threadMessagesToUpdate = allThreadMessagesRecords.filter(i1 => allThreadMessages.find(i2 => i1.id === i2._id));

			// Create
			msgsToCreate = msgsToCreate.map(message => msgCollection.prepareCreate(protectedFunction((m) => {
				m._raw = sanitizedRaw({ id: message._id }, msgCollection.schema);
				m.subscription.set(sub); // TODO: do we need it?
				Object.assign(m, message);
			})));
			threadsToCreate = threadsToCreate.map(thread => threadCollection.prepareCreate(protectedFunction((t) => {
				t._raw = sanitizedRaw({ id: thread._id }, threadCollection.schema);
				t.subscription.set(sub);
				Object.assign(t, thread);
				t.tlm = null;
			})));
			threadMessagesToCreate = threadMessagesToCreate.map(threadMessage => threadMessagesCollection.prepareCreate(protectedFunction((tm) => {
				tm._raw = sanitizedRaw({ id: threadMessage._id }, threadMessagesCollection.schema);
				Object.assign(tm, threadMessage);
				// tm.subscription.rid = threadMessage.tmid;
			})));

			// Update
			msgsToUpdate = msgsToUpdate.map((message) => {
				const newMessage = messages.find(m => m._id === message.id);
				return message.prepareUpdate(protectedFunction((m) => {
					Object.assign(m, newMessage);
				}));
			});
			threadsToUpdate = threadsToUpdate.map((thread) => {
				const newThread = allThreads.find(t => t._id === thread.id);
				return thread.prepareUpdate(protectedFunction((t) => {
					Object.assign(t, newThread);
					t.tlm = null;
				}));
			});
			threadMessagesToUpdate = threadMessagesToUpdate.map((threadMessage) => {
				const newThreadMessage = allThreadMessages.find(t => t._id === threadMessage.id);
				return threadMessage.prepareUpdate(protectedFunction((tm) => {
					Object.assign(tm, newThreadMessage);
				}));
			});

			const allRecords = [
				...msgsToCreate,
				...msgsToUpdate,
				...threadsToCreate,
				...threadsToUpdate,
				...threadMessagesToCreate,
				...threadMessagesToUpdate
			];

			try {
				await watermelon.batch(...allRecords);
			} catch (e) {
				log(e);
			}
			return allRecords.length;
		});
	} catch (e) {
		log(e);
	}
}
