import type { FeatureFlagsConfig } from "@/types/featureFlags";
import { getAppConfigDataClient } from "./client";
import {
	isAppConfigTokenError,
	pullFeatureFlagsConfig,
} from "./fetchConfig";

const DEFAULT_TTL_MS = 30_000;

interface CacheState {
	nextPollToken: string | undefined;
	lastConfig: FeatureFlagsConfig | undefined;
	lastFetchedAt: number;
	inflight: Promise<FeatureFlagsConfig> | undefined;
}

const state: CacheState = {
	nextPollToken: undefined,
	lastConfig: undefined,
	lastFetchedAt: 0,
	inflight: undefined,
};

function getCacheTtlMs(): number {
	const raw = process.env.APPCONFIG_CACHE_TTL_MS;
	if (raw === undefined || raw === "") {
		return DEFAULT_TTL_MS;
	}
	const n = Number(raw);
	return Number.isFinite(n) && n >= 0 ? n : DEFAULT_TTL_MS;
}

async function refreshFromAws(): Promise<FeatureFlagsConfig> {
	const client = getAppConfigDataClient();

	const attempt = async (): Promise<FeatureFlagsConfig> => {
		const { nextPollToken, config } = await pullFeatureFlagsConfig(
			client,
			state.nextPollToken,
		);
		state.nextPollToken = nextPollToken;
		if (config !== undefined) {
			state.lastConfig = config;
		}
		state.lastFetchedAt = Date.now();
		if (state.lastConfig === undefined) {
			throw new Error(
				"AppConfig returned empty configuration and no cached snapshot exists yet",
			);
		}
		return state.lastConfig;
	};

	try {
		return await attempt();
	} catch (err) {
		if (isAppConfigTokenError(err)) {
			state.nextPollToken = undefined;
			return attempt();
		}
		throw err;
	}
}

/**
 * Returns hosted feature-flag configuration from AWS AppConfig, using an in-memory
 * TTL cache and a single in-flight refresh per process to avoid stampedes.
 */
export async function getFeatureFlagsConfig(): Promise<FeatureFlagsConfig> {
	const ttlMs = getCacheTtlMs();
	const now = Date.now();
	if (
		state.lastConfig !== undefined &&
		now - state.lastFetchedAt < ttlMs
	) {
		return state.lastConfig;
	}

	if (state.inflight) {
		return state.inflight;
	}

	state.inflight = refreshFromAws().finally(() => {
		state.inflight = undefined;
	});

	return state.inflight;
}
