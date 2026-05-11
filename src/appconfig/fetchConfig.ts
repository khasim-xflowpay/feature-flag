import {
	AppConfigDataClient,
	GetLatestConfigurationCommand,
	StartConfigurationSessionCommand,
} from "@aws-sdk/client-appconfigdata";
import { getAppConfigDataClient } from "./client";

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

/**
 * When `APPCONFIG_AGENT_BASE_URL` is set (e.g. `http://127.0.0.1:2772`), config is loaded
 * through the [AppConfig Agent](https://docs.aws.amazon.com/appconfig/latest/userguide/appconfig-agent-how-to-use.html).
 * Pass `entityId` so the agent can apply entity-based gradual deployments (same as `Entity-Id` on the agent).
 *
 * The AppConfig Data API (`StartConfigurationSession`) does not take an entity id; per-entity rollout is agent-side.
 */
function getAgentBaseUrl(): string | undefined {
	const raw = process.env.APPCONFIG_AGENT_BASE_URL;
	if (raw === undefined || raw === "") {
		return undefined;
	}
	return raw.replace(/\/$/, "");
}

async function fetchAppConfigJsonViaAgent(
	baseUrl: string,
	entityId: string | undefined,
): Promise<unknown> {
	const { applicationId, environmentId, profileId } = readAppConfigEnv();
	const path = [
		"applications",
		encodeURIComponent(applicationId),
		"environments",
		encodeURIComponent(environmentId),
		"configurations",
		encodeURIComponent(profileId),
	].join("/");
	const url = `${baseUrl}/${path}`;

	const headers: HeadersInit = {};
	if (entityId !== undefined && entityId !== "") {
		headers["Entity-Id"] = entityId;
	}

	const res = await fetch(url, { headers, cache: "no-store" });
	if (!res.ok) {
		const detail = await res.text().catch(() => "");
		throw new Error(
			`AppConfig Agent request failed (${res.status}): ${detail.slice(0, 500)}`,
		);
	}

	const text = await res.text();
	try {
		return JSON.parse(text) as unknown;
	} catch {
		throw new Error("AppConfig Agent response is not valid JSON");
	}
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

const MAX_EMPTY_POLLS = 10;

async function fetchAppConfigJsonViaDataPlane(
	client: AppConfigDataClient,
): Promise<unknown> {
	const ids = readAppConfigEnv();
	let token = await startConfigurationSession(client, ids);

	for (let i = 0; i < MAX_EMPTY_POLLS; i++) {
		const latest = await client.send(
			new GetLatestConfigurationCommand({
				ConfigurationToken: token,
			}),
		);

		const nextPollToken = latest.NextPollConfigurationToken;
		if (!nextPollToken) {
			throw new Error("GetLatestConfiguration did not return NextPollConfigurationToken");
		}

		const raw = latest.Configuration;
		if (raw != null && raw.byteLength > 0) {
			const text = new TextDecoder("utf-8").decode(raw);
			try {
				return JSON.parse(text) as unknown;
			} catch {
				throw new Error("AppConfig configuration is not valid JSON");
			}
		}

		token = nextPollToken;
	}

	throw new Error("AppConfig returned no configuration payload");
}

/**
 * Loads hosted configuration as JSON. Uses the AppConfig Agent when `APPCONFIG_AGENT_BASE_URL`
 * is set (required for entity-based gradual rollout). Otherwise uses the AppConfig Data API.
 */
export async function fetchAppConfigJson(
	entityId?: string,
): Promise<unknown> {
	const agentBase = getAgentBaseUrl();
	if (agentBase) {
		return fetchAppConfigJsonViaAgent(agentBase, entityId);
	}
	return fetchAppConfigJsonViaDataPlane(getAppConfigDataClient());
}
