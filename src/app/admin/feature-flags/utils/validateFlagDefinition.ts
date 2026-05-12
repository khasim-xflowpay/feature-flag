import type {
	FeatureFlagAttributes,
	FeatureFlagDefinition,
	FeatureFlagMetaData,
} from "@/types/featureFlags";

const DEF_TOP_KEYS = new Set([
	"enabled",
	"created_at",
	"updated_at",
	"valid_until",
	"meta_data",
	"attributes",
]);

function isFiniteNumber(v: unknown): v is number {
	return typeof v === "number" && Number.isFinite(v);
}

function validateMetaData(v: unknown): string | null {
	if (v === undefined) return null;
	if (typeof v !== "object" || v === null) return "meta_data must be an object.";
	const o = v as Record<string, unknown>;
	const allowed = new Set(["version", "description"]);
	for (const k of Object.keys(o)) {
		if (!allowed.has(k)) return `meta_data has unknown field "${k}".`;
		const val = o[k];
		if (val === null || val === undefined) continue;
		if (typeof val !== "string")
			return `meta_data.${k} must be a string or null.`;
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
		"allowedAccoutsOwnerIds",
	]);
	for (const k of Object.keys(o)) {
		if (!allowed.has(k)) return `attributes has unknown field "${k}".`;
	}
	for (const key of [
		"allowedAccounts",
		"accountTypes",
		"countries",
		"blackListedAccounts",
		"allowedAccoutsOwnerIds",
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
	for (const timeKey of ["created_at", "updated_at", "valid_until"] as const) {
		const t = o[timeKey];
		if (t !== undefined && !isFiniteNumber(t))
			return `"${timeKey}" must be a finite number (Unix seconds).`;
	}
	const mErr = validateMetaData(o.meta_data);
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
		typeof o.version === "string" && o.version.trim() !== ""
			? o.version.trim()
			: undefined;
	const description =
		typeof o.description === "string" && o.description.trim() !== ""
			? o.description.trim()
			: undefined;
	if (!version && !description) return undefined;
	return { ...(version ? { version } : {}), ...(description ? { description } : {}) };
}

export function normalizeAttributes(
	v: unknown,
): FeatureFlagAttributes | undefined {
	if (v === undefined) return undefined;
	if (typeof v !== "object" || v === null) return undefined;
	const o = v as Record<string, unknown>;
	const pick = (key: string): string[] | undefined => {
		const raw = o[key];
		if (!Array.isArray(raw)) return undefined;
		const strings = raw.filter((x): x is string => typeof x === "string");
		return strings.length > 0 ? strings : undefined;
	};
	const allowedAccounts = pick("allowedAccounts");
	const accountTypes = pick("accountTypes");
	const countries = pick("countries");
	const blackListedAccounts = pick("blackListedAccounts");
	const allowedAccoutsOwnerIds = pick("allowedAccoutsOwnerIds");
	if (
		!allowedAccounts &&
		!accountTypes &&
		!countries &&
		!blackListedAccounts &&
		!allowedAccoutsOwnerIds
	)
		return undefined;
	return {
		...(allowedAccounts ? { allowedAccounts } : {}),
		...(accountTypes ? { accountTypes } : {}),
		...(countries ? { countries } : {}),
		...(blackListedAccounts ? { blackListedAccounts } : {}),
		...(allowedAccoutsOwnerIds ? { allowedAccoutsOwnerIds } : {}),
	};
}

export function normalizeFeatureFlagDefinition(
	raw: FeatureFlagDefinition,
): FeatureFlagDefinition {
	return {
		enabled: raw.enabled,
		...(raw.created_at !== undefined ? { created_at: raw.created_at } : {}),
		...(raw.updated_at !== undefined ? { updated_at: raw.updated_at } : {}),
		...(raw.valid_until !== undefined ? { valid_until: raw.valid_until } : {}),
		...(normalizeMetaData(raw.meta_data) !== undefined
			? { meta_data: normalizeMetaData(raw.meta_data) }
			: {}),
		...(normalizeAttributes(raw.attributes) !== undefined
			? { attributes: normalizeAttributes(raw.attributes) }
			: {}),
	};
}
