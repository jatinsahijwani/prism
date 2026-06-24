import data from "@/data/demo-data.json";

export type DemoData = typeof data;
export const demo = data;

export const txUrl = (hash: string) => `${data.explorer}/tx/${hash}`;
export const contractUrl = (id: string) => `${data.explorer}/contract/${id}`;
export const short = (s: string, n = 6) => (s.length > n * 2 ? `${s.slice(0, n)}…${s.slice(-n)}` : s);
