import type {
	FeatureFlagDefinition,
	FeatureFlagsConfig,
} from "@/types/featureFlags";

type LegacyFlag = FeatureFlagDefinition & {
	metaData?: FeatureFlagDefinition["meta_data"];
	validUntil?: number;
	createdAt?: number;
	updatedAt?: number;
};

/** Normalize legacy camelCase fields from AppConfig into snake_case. */
export function normalizeFeatureFlagDefinitionFromLegacy(
	raw: LegacyFlag,
): FeatureFlagDefinition {
	const { metaData, validUntil, createdAt, updatedAt, ...rest } = raw;
	return {
		...rest,
		created_at: rest.created_at ?? createdAt,
		updated_at: rest.updated_at ?? updatedAt,
		valid_until: rest.valid_until ?? validUntil,
		meta_data: rest.meta_data ?? metaData,
	};
}

export function normalizeFeatureFlagsConfig(
	input: FeatureFlagsConfig,
): FeatureFlagsConfig {
	const out: FeatureFlagsConfig = {};
	for (const [name, raw] of Object.entries(input)) {
		out[name] = normalizeFeatureFlagDefinitionFromLegacy(raw as LegacyFlag);
	}
	return out;
}

export function serializeFeatureFlagsConfig(config: FeatureFlagsConfig): string {
	return `${JSON.stringify(config, null, 2)}\n`;
}
