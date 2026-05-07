export interface FeatureFlagMetaData {
	version?: string;
	description?: string;
}

export interface FeatureFlagAttributes {
	allowedAccounts?: string[];
	accountTypes?: string[];
	countries?: string[];
	blackListedAccounts?: string[];
	/** Typo preserved for configs stored in AppConfig */
	allowedAccoutsOwnerIds?: string[];
}

export interface FeatureFlagDefinition {
	enabled: boolean;
	created_at?: number;
	updated_at?: number;
	valid_until?: number;
	environment?: string;
	meta_data?: FeatureFlagMetaData;
	attributes?: FeatureFlagAttributes;
}

export interface FeatureFlagsConfig {
	featureFlags: Record<string, FeatureFlagDefinition>;
}
