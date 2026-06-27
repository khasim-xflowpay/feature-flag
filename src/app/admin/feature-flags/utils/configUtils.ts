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

function normalizeMetaVersion(
	version: string | number | undefined,
): string | number | undefined {
	if (version === undefined) return undefined;
	if (typeof version === "number") {
		return Number.isFinite(version) ? version : undefined;
	}
	const trimmed = version.trim();
	return trimmed !== "" ? trimmed : undefined;
}

/** Compare only fields editable in the flag modal (ignores timestamps). */
export function modalDraftEqualsStored(
	draft: FeatureFlagDefinition,
	stored: FeatureFlagDefinition,
): boolean {
	if (draft.enabled !== stored.enabled) return false;

	if (
		normalizeUnixSecondsToDate(draft.validUntil) !==
		normalizeUnixSecondsToDate(stored.validUntil)
	) {
		return false;
	}

	const draftVersion = normalizeMetaVersion(draft.metadata?.version);
	const storedVersion = normalizeMetaVersion(stored.metadata?.version);
	if (String(draftVersion ?? "") !== String(storedVersion ?? "")) {
		return false;
	}

	const draftDesc = draft.metadata?.description?.trim() ?? "";
	const storedDesc = stored.metadata?.description?.trim() ?? "";
	if (draftDesc !== storedDesc) return false;

	const draftIds = dedupeOwnerIds(
		draft.attributes?.allowedAccountOwnerIds ?? [],
	);
	const storedIds = dedupeOwnerIds(
		stored.attributes?.allowedAccountOwnerIds ?? [],
	);
	if (draftIds.length !== storedIds.length) return false;
	for (let i = 0; i < draftIds.length; i++) {
		if (draftIds[i] !== storedIds[i]) return false;
	}

	return true;
}

export function buildUpdatedFlag(
	draft: FeatureFlagDefinition,
	isAdd: boolean,
	prevCreatedAt: number | undefined,
): FeatureFlagDefinition {
	const today = todayUnixSeconds();

	const metaVersion = normalizeMetaVersion(draft.metadata?.version);
	const metaDesc = draft.metadata?.description?.trim();
	const meta =
		metaVersion || metaDesc
			? {
					...(metaVersion ? { version: metaVersion } : {}),
					...(metaDesc ? { description: metaDesc } : {}),
				}
			: undefined;

	const attrsFromDraft = draft.attributes;
	const ownerIds = dedupeOwnerIds(
		attrsFromDraft?.allowedAccountOwnerIds ?? []
	);
	const includeAttributes =
		attrsFromDraft !== undefined || ownerIds.length > 0;

	return {
		...draft,
		updatedAt: today,
		createdAt: isAdd
			? today
			: normalizeUnixSecondsToDate(prevCreatedAt ?? draft.createdAt) ?? today,
		validUntil: normalizeUnixSecondsToDate(draft.validUntil),
		metadata: meta,
		attributes: includeAttributes
			? { ...(attrsFromDraft ?? {}), allowedAccountOwnerIds: ownerIds }
			: undefined,
	};
}
