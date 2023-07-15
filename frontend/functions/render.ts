import Mustache from "mustache";

import layout from "../templates/layout.html";
import * as allPartials from "../templates/partials";

export function renderFull(inner: string, view: any = {}): Response {
    return renderPartial(layout, view, { inner });
}

export function renderPartial(template: string, view: any = {}, extraPartials?: Record<string, string>): Response {
    const headers = new Headers([["Content-Type", "text/html;charset=UTF-8"]]);
    // DEVELOPMENT MODE
    view.dev = true;
    return new Response(
        Mustache.render(template, view, { ...allPartials, ...extraPartials }),
        {
            headers, status: 200
        });
}