export const publishEnvironmentOptions = [
	{ value: "stage", label: "Stage" },
	{ value: "pre_prod", label: "Pre-prod" },
	{ value: "prod", label: "Production" },
] as const;

export type PublishEnvironment =
	(typeof publishEnvironmentOptions)[number]["value"];

export const DEFAULT_PUBLISH_ENVIRONMENT: PublishEnvironment = "stage";

export function isPublishEnvironment(
	value: string | null | undefined,
): value is PublishEnvironment {
	return publishEnvironmentOptions.some((option) => option.value === value);
}

export function getPublishEnvironmentLabel(
	value: PublishEnvironment,
): string {
	return (
		publishEnvironmentOptions.find((option) => option.value === value)?.label ??
		value
	);
}
