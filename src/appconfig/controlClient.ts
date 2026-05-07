import { AppConfigClient } from "@aws-sdk/client-appconfig";

let client: AppConfigClient | null = null;

/** Control-plane client (create versions, start deployments). */
export function getAppConfigControlClient(): AppConfigClient {
	if (client) {
		return client;
	}
	const region = process.env.AWS_REGION;
	if (!region) {
		throw new Error("AWS_REGION is not set");
	}
	client = new AppConfigClient({ region });
	return client;
}
