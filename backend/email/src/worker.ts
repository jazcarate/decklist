import PostalMime from "postal-mime";
import { Entry, Status } from "@decklist/api";

interface Env {
	db: KVNamespace
	content: R2Bucket
}

async function readAll(stream: ReadableStream, size: number): Promise<Uint8Array> {
	let result = new Uint8Array(size);
	let bytesRead = 0;
	const reader = stream.getReader();
	while (true) {
		const { done, value } = await reader.read();
		if (done) {
			break;
		}
		result.set(value, bytesRead);
		bytesRead += value.length;
	}
	return result;
}

function slugFrom(adress: string): string {
	return adress.split("@", 1)[0];
}

export default {
	async email(message: ForwardableEmailMessage, env: Env, ctx: ExecutionContext): Promise<void> {
		const slug = slugFrom(message.to)
		const event = await env.db.get(`events:${slug}`);
		if (!event) {
			console.log(`Discarding email from '${message.from}'. No event '${slug}'`);
			message.setReject(`There is no '${slug}' event`);
			return;
		}

		const content = await readAll(message.raw, message.rawSize);
		const email = await new PostalMime().parse(content);

		const entry: Entry = {
			from: message.from,
			note: email.subject ?? "[No subject]",
			status: Status.Pending
		};
		const id = crypto.randomUUID();

		const key = `event:${slug}:entry:${id}`;
		await env.db.put(key, JSON.stringify(entry));
		console.log(`Saved entry '${key}'`);

		const bodyKey = `attachment:${id}:0`;
		await env.content.put(bodyKey, `${email.subject}\n\n${email.text}`, {
			httpMetadata: {
				contentType: "text/plain", contentDisposition: `attachment; filename="body.txt"`
			}
		});
		console.log(`Saved body attachment '${bodyKey}'`);

		await Promise.all(email.attachments.map(async (attachment, idx) => {
			const attachmentKey = `attachment:${id}:${idx + 1}`;
			const obj = await env.content.put(attachmentKey, attachment.content, {
				httpMetadata: {
					contentType: attachment.mimeType, contentDisposition: `attachment; filename="${attachment.filename}"`
				}
			});
			console.log(`Saved attachment '${attachmentKey}' ${obj.size}bytes`);
		}));
	},
};
