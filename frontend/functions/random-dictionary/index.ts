import animals from "./animals";

export default function generate(): string {
    return `${rndFrom(animals)}-${rndNum()}`
}

function rndNum(): number {
    return Math.floor(Math.random() * 100);
}
function rndFrom<T>(xs: T[]): T {
    const i = Math.floor(Math.random() * xs.length);
    return xs[i];
}