import home from "./home.html";
import Mustache from "mustache";
import { Event } from "@decklist/api";

interface Env {
	db: KVNamespace
	content: R2Bucket
}

interface Metadata {
	name?: string;
}


function date() {
	return function (date: number | undefined): string {
		if (date)
			return new Date(date).toISOString();
		return "";
	}
}

function bbtoa(buffer: ArrayBuffer): string {
	var binary = '';
	var bytes = new Uint8Array(buffer);
	var len = bytes.byteLength;
	for (var i = 0; i < len; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary);
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);
		try {
			if (url.pathname == "/") {
				const prefix = "events:";
				const result = await env.db.list<Metadata>({ prefix });
				const events = result.keys.map((k) => ({
					name: k.metadata?.name ?? "[No name]",
					slug: k.name.substring(prefix.length),
					expiration: k.expiration
				}));

				const html = Mustache.render(home, { events, date });
				return new Response(html, {
					headers: {
						"content-type": "text/html;charset=UTF-8",
					},
				});
			} else if (url.pathname == "/create" && request.method === "POST") {
				const formData = await request.formData();
				const name = formData.get("name");
				const slug = formData.get("slug");
				const password = formData.get("password");

				if (!slug || !name || !password) {
					const problem = `Could not create an event without Name (${name}) or Slug (${slug}) or Password (${!!password})`;
					console.error(problem);
					return new Response(problem, { status: 400 });
				}

				const ePassword = new TextEncoder().encode(password);
				const passwordHash = bbtoa(await crypto.subtle.digest({ name: 'SHA-256' }, ePassword));
				const event: Event = {
					creationDate: Date.now(),
					passwordHash
				};
				await env.db.put(`events:${slug}`, JSON.stringify(event), { metadata: { name } });

				return Response.redirect(url.origin);
			}
			return Response.redirect(url.origin);
		} catch (err) {
			console.error(`Problem in ${url}`, err);
			return new Response(err?.toString(), { status: 500 });
		}
	},
};
