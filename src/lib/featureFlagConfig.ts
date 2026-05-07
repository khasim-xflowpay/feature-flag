import type {
	FeatureFlagDefinition,
	FeatureFlagsConfig,
} from "@/types/featureFlags";

type LegacyFlag = FeatureFlagDefinition & {
	metaData?: FeatureFlagDefinition["meta_data"];
};

/** Normalize legacy camelCase `metaData` from older configs into `meta_data`. */
export function normalizeFeatureFlagsConfig(
	input: FeatureFlagsConfig,
): FeatureFlagsConfig {
	const featureFlags: Record<string, FeatureFlagDefinition> = {};
	for (const [name, raw] of Object.entries(input.featureFlags)) {
		const legacy = raw as LegacyFlag;
		const { metaData, ...rest } = legacy;
		featureFlags[name] = {
			...rest,
			meta_data: rest.meta_data ?? metaData,
		};
	}
	return { featureFlags };
}

export function serializeFeatureFlagsConfig(config: FeatureFlagsConfig): string {
	return `${JSON.stringify(config, null, 2)}\n`;
}
