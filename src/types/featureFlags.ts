export interface FeatureFlagAttributes {
	allowedAccounts?: string[];
	accountTypes?: string[];
	countries?: string[];
	blackListedAccounts?: string[];
}

export interface FeatureFlagDefinition {
	enabled: boolean;
	metaData?: { description?: string };
	attributes?: FeatureFlagAttributes;
}

export interface FeatureFlagsConfig {
	featureFlags: Record<string, FeatureFlagDefinition>;
}
