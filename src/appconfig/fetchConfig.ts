import {
	AppConfigDataClient,
	GetLatestConfigurationCommand,
	StartConfigurationSessionCommand,
} from "@aws-sdk/client-appconfigdata";
import { normalizeFeatureFlagsConfig } from "@/lib/featureFlagConfig";
import type {
	FeatureFlagDefinition,
	FeatureFlagsConfig,
} from "@/types/featureFlags";

export interface AppConfigIdentifiers {
	applicationId: string;
	environmentId: string;
	profileId: string;
}

function readAppConfigEnv(): AppConfigIdentifiers {
	const applicationId = process.env.APPCONFIG_APPLICATION_ID;
	const environmentId = process.env.APPCONFIG_ENVIRONMENT_ID;
	const profileId = process.env.APPCONFIG_PROFILE_ID;
	if (!applicationId || !environmentId || !profileId) {
		throw new Error(
			"APPCONFIG_APPLICATION_ID, APPCONFIG_ENVIRONMENT_ID, and APPCONFIG_PROFILE_ID must be set",
		);
	}
	return { applicationId, environmentId, profileId };
}

function isStringArray(value: unknown): value is string[] {
	return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isFeatureFlagAttributes(
	value: unknown,
): value is NonNullable<FeatureFlagDefinition["attributes"]> {
	if (value === undefined) {
		return true;
	}
	if (typeof value !== "object" || value === null) {
		return false;
	}
	const o = value as Record<string, unknown>;
	return Object.values(o).every(
		(v) => v === undefined || isStringArray(v),
	);
}

function isFeatureFlagMetaData(
	value: unknown,
): value is NonNullable<FeatureFlagDefinition["meta_data"]> {
	if (value === undefined) {
		return true;
	}
	if (typeof value !== "object" || value === null) {
		return false;
	}
	const o = value as Record<string, unknown>;
	if (
		"version" in o &&
		o.version !== undefined &&
		typeof o.version !== "string"
	) {
		return false;
	}
	if (
		"description" in o &&
		o.description !== undefined &&
		typeof o.description !== "string"
	) {
		return false;
	}
	return true;
}

function isFeatureFlagDefinition(value: unknown): value is FeatureFlagDefinition {
	if (typeof value !== "object" || value === null) {
		return false;
	}
	const o = value as Record<string, unknown>;
	if (typeof o.enabled !== "boolean") {
		return false;
	}
	const tsKeys = ["created_at", "updated_at", "valid_until"] as const;
	for (const key of tsKeys) {
		if (key in o && o[key] !== undefined && typeof o[key] !== "number") {
			return false;
		}
	}
	if (
		"environment" in o &&
		o.environment !== undefined &&
		typeof o.environment !== "string"
	) {
		return false;
	}
	const meta =
		o.meta_data ?? ("metaData" in o ? o.metaData : undefined);
	if (!isFeatureFlagMetaData(meta)) {
		return false;
	}
	if ("attributes" in o && !isFeatureFlagAttributes(o.attributes)) {
		return false;
	}
	return true;
}

export function assertFeatureFlagsConfig(value: unknown): FeatureFlagsConfig {
	if (typeof value !== "object" || value === null) {
		throw new Error("AppConfig JSON must be an object");
	}
	const root = value as Record<string, unknown>;
	if (typeof root.featureFlags !== "object" || root.featureFlags === null) {
		throw new Error('AppConfig JSON must include a "featureFlags" object');
	}
	const flags = root.featureFlags as Record<string, unknown>;
	for (const [name, def] of Object.entries(flags)) {
		if (!isFeatureFlagDefinition(def)) {
			throw new Error(`Invalid feature flag definition for "${name}"`);
		}
	}
	const parsed = value as FeatureFlagsConfig;
	return normalizeFeatureFlagsConfig(parsed);
}

function decodeConfiguration(bytes: Uint8Array): FeatureFlagsConfig {
	const text = new TextDecoder("utf-8").decode(bytes);
	let parsed: unknown;
	try {
		parsed = JSON.parse(text) as unknown;
	} catch {
		throw new Error("AppConfig configuration is not valid JSON");
	}
	return assertFeatureFlagsConfig(parsed);
}

async function startConfigurationSession(
	client: AppConfigDataClient,
	ids: AppConfigIdentifiers,
): Promise<string> {
	const out = await client.send(
		new StartConfigurationSessionCommand({
			ApplicationIdentifier: ids.applicationId,
			EnvironmentIdentifier: ids.environmentId,
			ConfigurationProfileIdentifier: ids.profileId,
		}),
	);
	const token = out.InitialConfigurationToken;
	if (!token) {
		throw new Error("StartConfigurationSession did not return InitialConfigurationToken");
	}
	return token;
}

export interface PullFeatureFlagsResult {
	/** Token for the next GetLatestConfiguration call (from NextPollConfigurationToken). */
	nextPollToken: string;
	/** New config when AWS returned non-empty Configuration; otherwise use the previous snapshot. */
	config: FeatureFlagsConfig | undefined;
}

export async function pullFeatureFlagsConfig(
	client: AppConfigDataClient,
	existingPollToken: string | undefined,
): Promise<PullFeatureFlagsResult> {
	const ids = readAppConfigEnv();
	const configurationToken =
		existingPollToken ?? (await startConfigurationSession(client, ids));

	const latest = await client.send(
		new GetLatestConfigurationCommand({
			ConfigurationToken: configurationToken,
		}),
	);

	const nextPollToken = latest.NextPollConfigurationToken;
	if (!nextPollToken) {
		throw new Error("GetLatestConfiguration did not return NextPollConfigurationToken");
	}

	// AWS may return `null` (not only `undefined`) when there is no new body yet.
	const raw = latest.Configuration;
	if (raw != null && raw.byteLength > 0) {
		return { nextPollToken, config: decodeConfiguration(raw) };
	}

	return { nextPollToken, config: undefined };
}

export function isAppConfigTokenError(error: unknown): boolean {
	return (
		typeof error === "object" &&
		error !== null &&
		"name" in error &&
		(error as { name: string }).name === "BadRequestException"
	);
}
