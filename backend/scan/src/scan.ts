export interface Env {
	VIRUS_TOTAL_API_KEY: string
	db: KVNamespace,
	content: R2Bucket,
	emailMetrics: AnalyticsEngineDataset
}

interface ScanMetadata {
	created: number,
	vtid: string,
}

// https://developers.virustotal.com/reference/analyses-object
interface Analyses {
	status: "completed" | "queued" | "in-progress",
	stats: {
		harmless: number,
		malicious: number,
		suspicious: number
	}
	results: {
		[av: string]: {
			category: string,
			result: string | null
		},
	}
}

async function scan(env: Env, pending: KVNamespaceListKey<ScanMetadata>[]) {
	console.log("Scanning", pending);
	const result = [];

	const headers = new Headers([
		["Accept", "application/json"],
		["x-apikey", env.VIRUS_TOTAL_API_KEY]]);
	for (const analysis of pending) {
		const key = analysis.name.substring("scans:".length);

		try {
			const vtid = analysis?.metadata?.vtid as string;
			const response = await fetch(
				`https://www.virustotal.com/api/v3/analyses/${vtid}`,
				{ headers });
			if (response.status != 200) throw new Error(`Could not get analysis for '${key}'`);

			const json = await response.json<{ data: { attributes: Analyses } }>();
			const { stats, status, results } = json.data.attributes;
			if (status === 'completed') {
				let scan;
				if (stats.malicious == 0 && stats.suspicious == 0) {
					scan = { safe: true };
					result.push({ key, status: "Not malicious" });
					env.emailMetrics.writeDataPoint({
						blobs: ["Not malicious"], indexes: [key]
					});
				} else {
					console.log(`Problematic file ${key}`, results);
					const problems = Object.entries(results)
						.find(([_av, result]) => result.category === "suspicious" || result.category === "malicious");
					const problem = problems ? `${problems[0]}: ${problems[1].result}` : "This file is fishy"
					scan = { safe: false, problem };
					result.push({ key, status: "Malicious", problem });
					env.emailMetrics.writeDataPoint({
						blobs: ["Malicious", problem], indexes: [key]
					});
				}
				await env.db.delete(analysis.name);
				await env.db.put(key, "", { metadata: scan });
			} else {
				result.push({ key, status: "not analysed yet" });
				console.log(`${key} not analysed yet.`);
				env.emailMetrics.writeDataPoint({
					blobs: ["Not analysed yet"], indexes: [key]
				});
			}
		} catch (error) {
			result.push({ key, error });
			console.error(error);
		} finally {
			console.log(`Scaned ${key}`);
		}
	}
	return result;
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext) {
		if (request.method != 'POST') return new Response("", { status: 405 });
		const { slug, mail } = await request.json<any>();

		if (!slug || !mail) return new Response("", { status: 400 });

		const prefix = `scans:event:${slug}:mail:${mail}:attachments:`;
		console.log({ prefix });
		const pending = (await env.db.list<ScanMetadata>({ prefix })).keys;

		const result = await scan(env, pending);
		return Response.json(result);
	},

	async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
		console.log(`trigger fired at ${event.cron}`);

		const prefix = "scans:";
		const pending = (await env.db.list<ScanMetadata>({ prefix })).keys;

		await scan(env, pending);
	},
};
