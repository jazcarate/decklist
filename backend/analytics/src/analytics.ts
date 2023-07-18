interface Env {
	API_TOKEN: string,
	ACCOUNT_ID: string
}

interface Analytics {
	data: DataEntity[];
}
interface DataEntity {
	slug: string;
	success: string;
	n_readings: string;
}


export default {
	async fetch(request: Request, env: Env) {
		const url = new URL(request.url);
		if (url.pathname != '/') {
			return new Response('Not found', { status: 404 });
		}
		const span = url.searchParams.get("days") ?? "7"

		const query = `
            SELECT
				index1 AS slug,
				blob1 AS success,
				SUM(_sample_interval) AS n_readings
			FROM emailMetrics
			WHERE timestamp > NOW() - INTERVAL '${span}' DAY
			GROUP BY index1, blob1`;

		const API = `https://api.cloudflare.com/client/v4/accounts/${env.ACCOUNT_ID}/analytics_engine/sql`;
		const queryResponse = await fetch(API, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${env.API_TOKEN}`,
			},
			body: query,
		});

		if (queryResponse.status != 200) {
			console.error('Error querying:', await queryResponse.text());
			return new Response('An error occurred!', { status: 500 });
		}

		const queryJSON = await queryResponse.json<Analytics>();
		return new Response(
			renderResponse(queryJSON.data),
			{
				headers: { 'content-type': 'text/html' },
			}
		);
	}
}

function renderResponse(data: DataEntity[]) {
	return `<!DOCTYPE html>
		<html>
			<body>
				<table>
					<tr><th>Slug</th><th>Status</th><th>#</th></tr>
					${data.map(renderEntry).join('\n')}
				</table>
			</body>
		<html>`;
}

function renderEntry(entry: DataEntity) {
	return `<tr><td>${entry.slug}</td><td>${entry.success}</td><td>${entry.n_readings}</td></tr>`;
}