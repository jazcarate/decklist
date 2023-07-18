import { renderFull } from "../render";
import analytics from "../../templates/admin/analytics.html";

interface Env {
    ANALYTICS_API_TOKEN: string,
}

interface Analytics {
    data: DataEntity[];
}
interface DataEntity {
    slug: string;
    success: string;
    n_readings: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
    const url = new URL(request.url);
    const span = url.searchParams.get("days") ?? "7"

    const query = `
            SELECT
				index1 AS slug,
				blob1 AS success,
				SUM(_sample_interval) AS n_readings
			FROM emailMetrics
			WHERE timestamp > NOW() - INTERVAL '${span}' DAY
        GROUP BY index1, blob1`;

    const API = `https://api.cloudflare.com/client/v4/accounts/f5396e3735b54465f00ce7a9f315f0ae/analytics_engine/sql`;
    const queryResponse = await fetch(API, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${env.ANALYTICS_API_TOKEN}`,
        },
        body: query,
    });

    if (queryResponse.status != 200) {
        const err = await queryResponse.text();
        console.error('Error querying:', err);
        throw new Error(err);
    }

    const { data } = await queryResponse.json<Analytics>();
    return renderFull(analytics, { data });
}