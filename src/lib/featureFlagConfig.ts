import type {
	FeatureFlagDefinition,
	FeatureFlagsConfig,
} from "@/types/featureFlags";

type LegacyFlag = FeatureFlagDefinition & {
	meta_data?: FeatureFlagDefinition["metadata"];
	metaData?: FeatureFlagDefinition["metadata"];
	created_at?: number;
	updated_at?: number;
	valid_until?: number;
};

/** Normalize legacy snake_case fields from AppConfig into camelCase. */
export function normalizeFeatureFlagDefinitionFromLegacy(
	raw: LegacyFlag,
): FeatureFlagDefinition {
	const {
		meta_data,
		metaData,
		validUntil,
		createdAt,
		updatedAt,
		created_at,
		updated_at,
		valid_until,
		metadata,
		...rest
	} = raw;
	return {
		...rest,
		createdAt: createdAt ?? created_at,
		updatedAt: updatedAt ?? updated_at,
		validUntil: validUntil ?? valid_until,
		metadata: metadata ?? metaData ?? meta_data,
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
