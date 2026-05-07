import {
	CreateHostedConfigurationVersionCommand,
	StartDeploymentCommand,
} from "@aws-sdk/client-appconfig";
import { getAppConfigControlClient } from "./controlClient";

function readIds(): {
	applicationId: string;
	environmentId: string;
	profileId: string;
	deploymentStrategyId: string;
} {
	const applicationId = process.env.APPCONFIG_APPLICATION_ID;
	const environmentId = process.env.APPCONFIG_ENVIRONMENT_ID;
	const profileId = process.env.APPCONFIG_PROFILE_ID;
	const deploymentStrategyId = process.env.APPCONFIG_DEPLOYMENT_STRATEGY_ID;
	if (!applicationId || !environmentId || !profileId) {
		throw new Error(
			"APPCONFIG_APPLICATION_ID, APPCONFIG_ENVIRONMENT_ID, and APPCONFIG_PROFILE_ID must be set",
		);
	}
	if (!deploymentStrategyId) {
		throw new Error(
			"APPCONFIG_DEPLOYMENT_STRATEGY_ID is required to publish (create version + deploy). Create an AppConfig deployment strategy in AWS and set its ID.",
		);
	}
	return {
		applicationId,
		environmentId,
		profileId,
		deploymentStrategyId,
	};
}

/**
 * Uploads a new hosted configuration version and starts a deployment to the environment.
 * IAM needs appconfig:CreateHostedConfigurationVersion and appconfig:StartDeployment.
 */
export async function publishHostedConfigurationJson(
	jsonBody: string,
): Promise<{ versionNumber: number }> {
	const ids = readIds();
	const client = getAppConfigControlClient();
	const content = new TextEncoder().encode(jsonBody);

	const created = await client.send(
		new CreateHostedConfigurationVersionCommand({
			ApplicationId: ids.applicationId,
			ConfigurationProfileId: ids.profileId,
			Content: content,
			ContentType: "application/json",
			Description: `Admin publish ${new Date().toISOString()}`,
		}),
	);

	const versionNumber = created.VersionNumber;
	if (versionNumber === undefined) {
		throw new Error(
			"CreateHostedConfigurationVersion did not return VersionNumber",
		);
	}

	await client.send(
		new StartDeploymentCommand({
			ApplicationId: ids.applicationId,
			EnvironmentId: ids.environmentId,
			DeploymentStrategyId: ids.deploymentStrategyId,
			ConfigurationProfileId: ids.profileId,
			ConfigurationVersion: String(versionNumber),
		}),
	);

	return { versionNumber };
}
