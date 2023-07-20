import PostalMime, { Attachment } from "postal-mime";
import { EmailMessage } from "cloudflare:email";
import { createMimeMessage } from "mimetext";

interface Env {
	db: KVNamespace
	content: R2Bucket,
	email: SendEmail,
	emailMetrics: AnalyticsEngineDataset
	VIRUS_TOTAL_API_KEY: string
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

function isProblematic(attachment: Attachment): boolean {
	return attachment.mimeType.startsWith("image/") || attachment.mimeType.startsWith("text/");
}

export default {
	async email(message: ForwardableEmailMessage, env: Env, ctx: ExecutionContext): Promise<void> {
		let success = "unknown";
		const slug = slugFrom(message.to);
		try {
			// TODO remove debug forward
			await message.forward("j@florius.com.ar");

			const content = await readAll(message.raw, message.rawSize);
			const email = await new PostalMime().parse(content);

			const event = await env.db.get(`events:${slug}`);
			if (!event) {
				console.log(`Discarding email from '${message.from}'. No event '${slug}'`);

				const reply = createMimeMessage();
				reply.setSender({
					name: "Decklist.fun", addr: message.to
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
				success = "discarded"
				return;
			}

			if (email.attachments.length == 0 && !email.text) {
				console.log(`Discarding email from '${message.from}'. Empty email`);

				const reply = createMimeMessage();
				reply.setSender({
					name: "Decklist.fun", addr: message.to
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
				success = "empty"
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

			const bodyKey = `event:${slug}:mail:${id}:attachments:`;
			await env.content.put(bodyKey + "0", `${email.subject}\n\n${email.text}`, {
				httpMetadata: {
					contentType: "text/plain", contentDisposition: `inline; filename="body.txt"`
				}
			});
			console.log(`Saved attachment '0' (body)`);

			await Promise.all(email.attachments.map(async (attachment, idx) => {
				const key = bodyKey + String(idx + 1);
				const obj = await env.content.put(key, attachment.content, {
					httpMetadata: {
						contentType: attachment.mimeType, contentDisposition: `${attachment.disposition}; filename="${attachment.filename}"`
					}
				});
				console.log(`Saved attachment '${idx + 1}' ${obj.size}bytes`);

				let safe;
				if (isProblematic(attachment)) {
					const body = new FormData();
					body.set("file", new Blob([attachment.content], { type: attachment.mimeType }), attachment.filename);
					const headers = new Headers([
						["Accept", "application/json"],
						["x-apikey", env.VIRUS_TOTAL_API_KEY]]);
					const response = await fetch("https://www.virustotal.com/api/v3/files", {
						method: 'post',
						headers, body
					});
					if (response.status != 200) {
						console.log(`Could not upload file ${attachment.filename}`);
					} else {
						const { data } = await response.json<any>();
						await env.db.put("scans:" + key, "", { metadata: { created: Date.now(), vtid: data.id } });
						console.log(`Started scaning ${attachment.filename}`);
					}
					safe = 'pending';
				} else {
					safe = 'yes';
				}
				await env.db.put(key, "", { metadata: { safe } });
			}));

			const reply = createMimeMessage();
			reply.setSender({
				name: "Decklist.fun", addr: message.to
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
			success = "yes";
			console.log("Done");
		} catch (err) {
			console.error(err);
			success = "error " + err;
		} finally {
			env.emailMetrics.writeDataPoint({ blobs: [success], indexes: [slug] });
		}
	},
};
