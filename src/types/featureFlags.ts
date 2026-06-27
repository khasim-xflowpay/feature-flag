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
	allowedAccountOwnerIds?: string[];
}

export interface FeatureFlagDefinition {
	enabled: boolean;
	created_at?: number;
	updated_at?: number;
	valid_until?: number;
	meta_data?: FeatureFlagMetaData;
	attributes?: FeatureFlagAttributes;
}

/** Root AppConfig JSON: flag key → definition (no wrapper object). */
export type FeatureFlagsConfig = Record<string, FeatureFlagDefinition>;
