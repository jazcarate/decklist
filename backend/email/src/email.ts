import PostalMime, { Attachment, Email } from "postal-mime";

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
	return adress.split("@", 1)[0].toLowerCase();
}

function randId() {
	var arr = new Uint8Array(3)
	crypto.getRandomValues(arr)
	return Array.from(arr, v => v.toString(16).padStart(2, "0")).join('')
}

function isSafe(attachment: Attachment): boolean {
	const { mimeType } = attachment;
	return mimeType.startsWith("image/") || mimeType.startsWith("text/") || mimeType === "application/pdf";
}

async function reply(email: Email, slug: string, subject: string, body: string): Promise<void> {
	let headers: any = {
		"Auto-Submitted": "auto-replied",
	};
	const originalID = email.headers.find(({ key }) => key === "Message-ID");
	if (originalID) {
		headers = {
			...headers,
			"In-Reply-To": originalID.value,
			"References": originalID.value
		};
	}
	const mailChannelBody: any = JSON.stringify({
		personalizations: [
			{
				to: [{ email: email.from.address, name: email.from.name }],
				headers
			}
		],
		from: {
			email: `${slug}@decklist.fun`,
			name: `${slug} at Decklist.fun`,
		},
		subject: email.subject ?? subject,
		content: [
			{
				type: 'text/plain',
				value: body,
			},
		],
	});
	const sendEmailResponse = await fetch(new Request('https://api.mailchannels.net/tx/v1/send', {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
		},
		body: mailChannelBody,
	}));
	const { status } = sendEmailResponse;
	if (status != 200 && status != 202) {
		throw new Error(`Coud't send the reply (${sendEmailResponse.status}-${sendEmailResponse.statusText}): ${await sendEmailResponse.text()}`);
	}
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
				success = "discarded"
				await reply(email, slug,
					"Problem submitting the decklist",
					`Sorry!\nWe didn't find the event "${slug}" at ${message.to}. Check with your tournament officials.`);
				return;
			}

			if (email.attachments.length == 0 && !email.text) {
				console.log(`Discarding email from '${message.from}'. Empty email`);
				success = "empty"

				await reply(email, slug,
					"Problem submitting the decklist",
					`It appears you didn't send any decklist!\nPlease attach your decklist and try again.`);
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
			if (email.text) {
				await env.content.put(bodyKey + "0", `${email.subject}\n\n${email.text}`, {
					httpMetadata: {
						contentType: "text/plain", contentDisposition: `inline; filename="body.txt"`
					}
				});
				await env.db.put(bodyKey + "0", "", { metadata: { safe: true } });
				console.log(`Saved attachment '0' (body)`);
			}

			await Promise.all(email.attachments.map(async (attachment, idx) => {
				const key = bodyKey + String(idx + 1);
				const obj = await env.content.put(key, attachment.content, {
					httpMetadata: {
						contentType: attachment.mimeType, contentDisposition: `${attachment.disposition}; filename="${attachment.filename}"`
					}
				});
				console.log(`Saved attachment '${idx + 1}' ${obj.size}bytes`);

				if (isSafe(attachment)) {
					console.log(`${key} is safe`);
					await env.db.put(key, "", { metadata: { safe: true } });
				} else {
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
				}
			}));

			success = "yes";
			await reply(
				email, slug,
				"Decklist submitted correctly",
				`Your submittion has been accepted! With the id: ev${slug}-em${id}.`
			);
			console.log("Done");
		} catch (err) {
			console.error(err);
			success = "error " + err;
		} finally {
			env.emailMetrics.writeDataPoint({ blobs: [success], indexes: [slug] });
		}
	},
};
