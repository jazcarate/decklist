export interface Event {
    date: number;
    passwordHash: string;
}

export enum Status {
    Pending = 0,
    Ignored,
    Checked,
}

export interface Entry {
    from: string;
    note: string;
    status: Status;
}