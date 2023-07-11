import Mustache from "mustache";

import layout from "../templates/layout.html";

interface Options {
    view?: any,
    headers?: Headers,
    partials?: Record<string, string>
}

export function renderFull(inner: string, options: Options = {}): Response {
    return renderPartial(layout, { ...options, partials: { ...options.partials ?? {}, inner } });
}

export function renderPartial(template: string, options: Options = {}): Response {
    const headers = options.headers ?? new Headers();
    const view = options.view ?? {};
    const partial = options.partials;

    headers.append("Content-Type", "text/html;charset=UTF-8");
    return new Response(
        Mustache.render(template, view, partial),
        {
            headers, status: 200
        });
}