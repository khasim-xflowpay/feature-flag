function pad(value: number): string {
	return String(value).padStart(2, "0");
}

function startOfLocalDay(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function normalizeUnixSecondsToDate(sec: number | undefined): number | undefined {
	if (sec === undefined || !Number.isFinite(sec)) return undefined;
	return Math.floor(startOfLocalDay(new Date(sec * 1000)).getTime() / 1000);
}

export function todayUnixSeconds(): number {
	return Math.floor(startOfLocalDay(new Date()).getTime() / 1000);
}

export function unixSecondsToDateInput(sec: number | undefined): string {
	if (sec === undefined || !Number.isFinite(sec)) return "";
	const date = new Date(sec * 1000);
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function dateInputToUnixSeconds(value: string): number | undefined {
	const trimmed = value.trim();
	if (trimmed === "") return undefined;
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
	if (!match) return undefined;
	const [, year, month, day] = match;
	return Math.floor(
		new Date(Number(year), Number(month) - 1, Number(day)).getTime() / 1000
	);
}

export function formatUnixSecondsDate(sec: number | undefined): string {
	const normalized = normalizeUnixSecondsToDate(sec);
	if (normalized === undefined) return "—";
	return unixSecondsToDateInput(normalized);
}
