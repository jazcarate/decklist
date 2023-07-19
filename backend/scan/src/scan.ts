export interface Env {
	VIRUS_TOTAL_API_KEY: string
	db: KVNamespace,
	content: R2Bucket,
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

const SCAN_TIME = 300000; // 5 minutes

export default {
	async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
		console.log(`trigger fired at ${event.cron}`);

		const prefix = "scans:";
		const pending = (await env.db.list<ScanMetadata>({ prefix })).keys;

		const now = Date.now();
		const headers = new Headers([
			["Accept", "application/json"],
			["x-apikey", env.VIRUS_TOTAL_API_KEY]]);
		for (const analysis of pending) {
			const key = analysis.name.substring(prefix.length);

			try {
				if (analysis.metadata?.created ?? 0 > now - SCAN_TIME) { //ignore very recent uploads
					const response = await fetch(`https://www.virustotal.com/api/v3/analyses/{id}${analysis?.metadata?.vtid}`);
					if (response.status != 200) throw new Error(`Could not get analysis for '${key}'`);

					const { stats, status, results } = await response.json<Analyses>();
					if (status === 'completed') {
						let scan;
						if (stats.malicious == 0 && stats.suspicious == 0) {
							scan = { ok: true };
						} else {
							console.log(`Problematic file ${key}`, results);
							const problem = Object.entries(results)
								.find(([_av, result]) => result.category === "suspicious" || result.category === "malicious")
							scan = { ok: false, problem: problem ? `${problem[0]}: ${problem[1].result}` : "This file is fishy" };
						}
						await env.db.delete(analysis.name);
						await env.db.put(key, "", { metadata: scan });
					} else {
						console.log(`${key} not analysed yet.`);
					}
				}
			} catch (error) {
				console.error(error);
			}
		}
	},
};
