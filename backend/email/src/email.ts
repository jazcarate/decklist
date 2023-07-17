import PostalMime from "postal-mime";
import { EmailMessage } from "cloudflare:email";
import { createMimeMessage } from "mimetext";

interface Env {
	db: KVNamespace
	content: R2Bucket,
	email: SendEmail
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

function randId() {
	var arr = new Uint8Array(3)
	crypto.getRandomValues(arr)
	return Array.from(arr, v => v.toString(16).padStart(2, "0")).join('')
}

export default {
	async email(message: ForwardableEmailMessage, env: Env, ctx: ExecutionContext): Promise<void> {
		// TODO remove debug forward
		await message.forward("j@florius.com.ar");


		const slug = slugFrom(message.to)
		const content = await readAll(message.raw, message.rawSize);
		const email = await new PostalMime().parse(content);

		const event = await env.db.get(`events:${slug}`);
		if (!event) {
			console.log(`Discarding email from '${message.from}'. No event '${slug}'`);

			const reply = createMimeMessage();
			reply.setSender({
				name: "Don't Reply", addr: message.to
			});
			const originalID = message.headers.get("Message-ID");
			if (originalID) {
				reply.setHeader("In-Reply-To", originalID);
				reply.setHeader("References", originalID);
			}
			reply.setHeader("Auto-Submitted", "auto-replied");
			reply.setRecipient(message.from);
			reply.setSubject(email.subject ?? "Problem submitting the decklist");
			reply.addMessage({
				contentType: 'text/plain',
				data: `Sorry!\nWe didn't find the event "${slug}" at ${message.to}. Check with your tournament officials.`
			});

			await env.email.send(new EmailMessage(message.to, message.from, reply.asRaw()));
			return;
		}

		if (email.attachments.length == 0 && !email.text) {
			console.log(`Discarding email from '${message.from}'. Empty email`);

			const reply = createMimeMessage();
			reply.setSender({
				name: "Don't Reply", addr: message.to
			});
			const originalID = message.headers.get("Message-ID");
			if (originalID) {
				reply.setHeader("In-Reply-To", originalID);
				reply.setHeader("References", originalID);
			}
			reply.setHeader("Auto-Submitted", "auto-replied");
			reply.setRecipient(message.from);
			reply.setSubject(email.subject ?? "Problem submitting the decklist");
			reply.addMessage({
				contentType: 'text/plain',
				data: `It appears you didn't send any decklist!\nPlease attach your decklist and try againl.`
			});

			await env.email.send(new EmailMessage(message.to, message.from, reply.asRaw()));
			return;
		}

		const id = randId();
		const from = email.from.address;
		const name = email.from.name;
		const subject = email.subject;
		const date = Date.now();

		await env.db.put(`event:${slug}:mails:${id}`,
			"", { metadata: { date, from, name: name == from ? undefined : name, subject, reviewed: false } });

		console.log(`Saved email ${id}`);

		const bodyKey = `event:${slug}:mail:attachments:${id}:`;
		await env.content.put(bodyKey + "0", `${email.subject}\n\n${email.text}`, {
			httpMetadata: {
				contentType: "text/plain", contentDisposition: `inline; filename="body.txt"`
			}
		});
		console.log(`Saved attachment '0'`);

		await Promise.all(email.attachments.map(async (attachment, idx) => {
			const obj = await env.content.put(bodyKey + String(idx + 1), attachment.content, {
				httpMetadata: {
					contentType: attachment.mimeType, contentDisposition: `inline; filename="${attachment.filename}"`
				}
			});
			console.log(`Saved attachment '${idx + 1}' ${obj.size}bytes`);
		}));

		const reply = createMimeMessage();
		reply.setSender({
			name: "Don't Reply", addr: message.to
		});
		const originalID = message.headers.get("Message-ID");
		if (originalID) {
			reply.setHeader("In-Reply-To", originalID);
			reply.setHeader("References", originalID);
		}
		reply.setHeader("Message-ID", `${id}@${slug}.decklist.fun`);
		reply.setHeader("Auto-Submitted", "auto-replied");
		reply.setRecipient(message.from);
		reply.setSubject(email.subject ?? "Decklist submitted correctly");
		reply.addMessage({
			contentType: 'text/plain',
			data: `Your submittion has been accepted! With the id: ev${slug}-em${id}.`
		});

		await env.email.send(new EmailMessage(message.to, message.from, reply.asRaw()));
		console.log("Done");
	},
};
