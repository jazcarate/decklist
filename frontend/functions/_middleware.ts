export async function onRequest(context: EventContext<void, string, void>): Promise<Response> {
    try {
        return await context.next();
    } catch (err) {
        return new Response(`${err.message}\n${err.stack}`, { status: 500 });
    }
}
