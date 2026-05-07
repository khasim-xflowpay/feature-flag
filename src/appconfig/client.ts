import { AppConfigDataClient } from "@aws-sdk/client-appconfigdata";

let client: AppConfigDataClient | null = null;

export function getAppConfigDataClient(): AppConfigDataClient {
	if (client) {
		return client;
	}
	const region = process.env.AWS_REGION;
	if (!region) {
		throw new Error("AWS_REGION is not set");
	}
	client = new AppConfigDataClient({ region });
	return client;
}
