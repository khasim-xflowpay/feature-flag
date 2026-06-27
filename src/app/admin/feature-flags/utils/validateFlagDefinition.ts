import type {
	FeatureFlagAttributes,
	FeatureFlagDefinition,
	FeatureFlagMetaData,
} from "@/types/featureFlags";

const DEF_TOP_KEYS = new Set([
	"enabled",
	"createdAt",
	"updatedAt",
	"validUntil",
	"metadata",
	"attributes",
]);

function isFiniteNumber(v: unknown): v is number {
	return typeof v === "number" && Number.isFinite(v);
}

function validateMetaData(v: unknown): string | null {
	if (v === undefined) return null;
	if (typeof v !== "object" || v === null) return "metadata must be an object.";
	const o = v as Record<string, unknown>;
	const allowed = new Set(["version", "description"]);
	for (const k of Object.keys(o)) {
		if (!allowed.has(k)) return `metadata has unknown field "${k}".`;
		const val = o[k];
		if (val === null || val === undefined) continue;
		if (k === "version") {
			if (typeof val !== "string" && typeof val !== "number")
				return `metadata.version must be a string, number, or null.`;
			continue;
		}
		if (typeof val !== "string")
			return `metadata.${k} must be a string or null.`;
	}
	return null;
}

function validateStringArrayField(
	attrs: Record<string, unknown>,
	key: keyof FeatureFlagAttributes,
): string | null {
	const v = attrs[key as string];
	if (v === undefined) return null;
	if (!Array.isArray(v)) return `attributes.${String(key)} must be an array.`;
	for (let i = 0; i < v.length; i++) {
		if (typeof v[i] !== "string")
			return `attributes.${String(key)}[${i}] must be a string.`;
	}
	return null;
}

function validateAttributes(v: unknown): string | null {
	if (v === undefined) return null;
	if (typeof v !== "object" || v === null) return "attributes must be an object.";
	const o = v as Record<string, unknown>;
	const allowed = new Set([
		"allowedAccounts",
		"accountTypes",
		"countries",
		"blackListedAccounts",
		"allowedAccountOwnerIds",
	]);
	for (const k of Object.keys(o)) {
		if (!allowed.has(k)) return `attributes has unknown field "${k}".`;
	}
	for (const key of [
		"allowedAccounts",
		"accountTypes",
		"countries",
		"blackListedAccounts",
		"allowedAccountOwnerIds",
	] as const) {
		const err = validateStringArrayField(o, key);
		if (err) return err;
	}
	return null;
}

/** Returns `null` if valid; otherwise a short error message. */
export function validateFeatureFlagDefinition(v: unknown): string | null {
	if (typeof v !== "object" || v === null) return "Flag must be an object.";
	const o = v as Record<string, unknown>;
	if (typeof o.enabled !== "boolean") return 'Field "enabled" must be a boolean.';
	for (const k of Object.keys(o)) {
		if (!DEF_TOP_KEYS.has(k)) return `Unknown field "${k}".`;
	}
	for (const timeKey of ["createdAt", "updatedAt", "validUntil"] as const) {
		const t = o[timeKey];
		if (t !== undefined && !isFiniteNumber(t))
			return `"${timeKey}" must be a finite number (Unix seconds).`;
	}
	const mErr = validateMetaData(o.metadata);
	if (mErr) return mErr;
	const aErr = validateAttributes(o.attributes);
	if (aErr) return aErr;
	return null;
}

export function isValidFeatureFlagDefinition(
	v: unknown,
): v is FeatureFlagDefinition {
	return validateFeatureFlagDefinition(v) === null;
}

/** Narrow parsed JSON to our metadata shape for safe assignment. */
export function normalizeMetaData(
	v: unknown,
): FeatureFlagMetaData | undefined {
	if (v === undefined) return undefined;
	if (typeof v !== "object" || v === null) return undefined;
	const o = v as Record<string, unknown>;
	const version =
		typeof o.version === "number" && Number.isFinite(o.version)
			? o.version
			: typeof o.version === "string" && o.version.trim() !== ""
				? o.version.trim()
				: undefined;
	const description =
		typeof o.description === "string" && o.description.trim() !== ""
			? o.description.trim()
			: undefined;
	if (!version && !description) return undefined;
	return { ...(version ? { version } : {}), ...(description ? { description } : {}) };
}

const NORMALIZE_ATTR_ARRAY_KEYS = [
	"allowedAccounts",
	"accountTypes",
	"countries",
	"blackListedAccounts",
	"allowedAccountOwnerIds",
] as const;

export function normalizeAttributes(
	v: unknown,
): FeatureFlagAttributes | undefined {
	if (v === undefined) return undefined;
	if (typeof v !== "object" || v === null) return undefined;
	const o = v as Record<string, unknown>;
	const out: Partial<
		Record<(typeof NORMALIZE_ATTR_ARRAY_KEYS)[number], string[]>
	> = {};
	for (const key of NORMALIZE_ATTR_ARRAY_KEYS) {
		if (!Object.prototype.hasOwnProperty.call(o, key)) continue;
		const raw = o[key];
		if (!Array.isArray(raw)) continue;
		out[key] = raw.filter((x): x is string => typeof x === "string");
	}
	if (Object.keys(out).length === 0) return undefined;
	return out as FeatureFlagAttributes;
}

export function normalizeFeatureFlagDefinition(
	raw: FeatureFlagDefinition,
): FeatureFlagDefinition {
	return {
		enabled: raw.enabled,
		...(raw.createdAt !== undefined ? { createdAt: raw.createdAt } : {}),
		...(raw.updatedAt !== undefined ? { updatedAt: raw.updatedAt } : {}),
		...(raw.validUntil !== undefined ? { validUntil: raw.validUntil } : {}),
		...(normalizeMetaData(raw.metadata) !== undefined
			? { metadata: normalizeMetaData(raw.metadata) }
			: {}),
		...(normalizeAttributes(raw.attributes) !== undefined
			? { attributes: normalizeAttributes(raw.attributes) }
			: {}),
	};
}
