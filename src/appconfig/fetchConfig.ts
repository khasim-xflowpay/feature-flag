import {
	AppConfigDataClient,
	GetLatestConfigurationCommand,
	StartConfigurationSessionCommand,
} from "@aws-sdk/client-appconfigdata";

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

/**
 * Loads the current hosted configuration from AppConfig and parses it as JSON.
 * Polls with NextPollConfigurationToken when AWS returns an empty body (normal on first call).
 */
export async function fetchAppConfigJson(
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
