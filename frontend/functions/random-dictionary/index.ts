import adjectives from "./adjectives";
import colors from "./colors";
import animals from "./animals";

export default function generate(): string {
    return `${rnd(adjectives)}-${rnd(colors)}-${rnd(animals)}`
}

function rnd<T>(xs: T[]): T {
    const i = Math.floor(Math.random() * xs.length);
    return xs[i];
}