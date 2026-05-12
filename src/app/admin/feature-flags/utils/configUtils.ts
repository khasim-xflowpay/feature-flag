import type {
	FeatureFlagDefinition,
	FeatureFlagsConfig,
} from "@/types/featureFlags";
import {
	normalizeUnixSecondsToDate,
	todayUnixSeconds,
} from "./dateUtils";

export function cloneConfig(c: FeatureFlagsConfig): FeatureFlagsConfig {
	return JSON.parse(JSON.stringify(c)) as FeatureFlagsConfig;
}

export function sortKeysDeep(v: unknown): unknown {
	if (v === null || typeof v !== "object") return v;
	if (Array.isArray(v)) return v.map(sortKeysDeep);
	const o = v as Record<string, unknown>;
	const keys = Object.keys(o).sort();
	const out: Record<string, unknown> = {};
	for (const k of keys) {
		out[k] = sortKeysDeep(o[k]);
	}
	return out;
}

export function configsAreEqual(
	a: FeatureFlagsConfig,
	b: FeatureFlagsConfig,
): boolean {
	return (
		JSON.stringify(sortKeysDeep(a)) === JSON.stringify(sortKeysDeep(b))
	);
}

export function definitionsEqual(
	a: FeatureFlagDefinition | undefined,
	b: FeatureFlagDefinition | undefined,
): boolean {
	if (a === undefined && b === undefined) return true;
	if (a === undefined || b === undefined) return false;
	return JSON.stringify(sortKeysDeep(a)) === JSON.stringify(sortKeysDeep(b));
}

export function parseOwnerIds(text: string): string[] {
	return dedupeOwnerIds(
		text
			.split(/[\s,]+/)
			.map((s) => s.trim())
			.filter(Boolean)
	);
}

export function dedupeOwnerIds(ids: string[]): string[] {
	const seen = new Set<string>();
	const next: string[] = [];
	for (const rawId of ids) {
		const id = rawId.trim();
		if (id === "" || seen.has(id)) continue;
		seen.add(id);
		next.push(id);
	}
	return next;
}

export function buildUpdatedFlag(
	draft: FeatureFlagDefinition,
	isAdd: boolean,
	prevCreatedAt: number | undefined,
): FeatureFlagDefinition {
	const today = todayUnixSeconds();

	const metaVersion = draft.meta_data?.version?.trim();
	const metaDesc = draft.meta_data?.description?.trim();
	const meta =
		metaVersion || metaDesc
			? {
					...(metaVersion ? { version: metaVersion } : {}),
					...(metaDesc ? { description: metaDesc } : {}),
				}
			: undefined;

	const ownerIds = dedupeOwnerIds(
		draft.attributes?.allowedAccoutsOwnerIds ?? []
	);

	return {
		...draft,
		updated_at: today,
		created_at: isAdd
			? today
			: normalizeUnixSecondsToDate(prevCreatedAt ?? draft.created_at) ?? today,
		valid_until: normalizeUnixSecondsToDate(draft.valid_until),
		meta_data: meta,
		attributes: ownerIds.length > 0 ? { allowedAccoutsOwnerIds: ownerIds } : undefined,
	};
}
