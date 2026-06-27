export interface FeatureFlagMetaData {
	version?: string | number;
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
	createdAt?: number;
	updatedAt?: number;
	validUntil?: number;
	metadata?: FeatureFlagMetaData;
	attributes?: FeatureFlagAttributes;
}

/** Root AppConfig JSON: flag key → definition (no wrapper object). */
export type FeatureFlagsConfig = Record<string, FeatureFlagDefinition>;
