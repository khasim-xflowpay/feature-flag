import {
	DEFAULT_PUBLISH_ENVIRONMENT,
	isPublishEnvironment,
	type PublishEnvironment,
} from "@/app/admin/feature-flags/publishEnvironments";
import { fetchAppConfigJson } from "@/appconfig/fetchConfig";
import { publishHostedConfigurationJson } from "@/appconfig/deployHostedConfig";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const APP_CONFIG_ENVIRONMENT_IDS: Record<PublishEnvironment, string> = {
	pre_prod: "y17en27",
	prod: "uveliyh",
	stage: "7t9i764",
};

function isAuthorized(request: NextRequest): boolean {
	const secret = process.env.APPCONFIG_ADMIN_SECRET;
	if (secret === undefined || secret === "") {
		return true;
	}
	const header = request.headers.get("x-admin-secret");
	return header === secret;
}

function readEntityId(request: NextRequest): string | undefined {
	const id =
		request.headers.get("entity-id") ??
		request.headers.get("x-entity-id");
	return id === null || id === "" ? undefined : id;
}

function readSelectedEnvironment(request: NextRequest): PublishEnvironment {
	const value = request.nextUrl.searchParams.get("environment");
	if (value === null || value === "") {
		return DEFAULT_PUBLISH_ENVIRONMENT;
	}
	if (!isPublishEnvironment(value)) {
		throw new Error(`Invalid environment "${value}"`);
	}
	return value;
}

function resolveEnvironmentId(environment: PublishEnvironment): string {
	return APP_CONFIG_ENVIRONMENT_IDS[environment];
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function readEnvironmentFromBody(body: unknown): PublishEnvironment {
	if (!isRecord(body) || body.environment === undefined) {
		return DEFAULT_PUBLISH_ENVIRONMENT;
	}
	const environment =
		typeof body.environment === "string" ? body.environment : "";
	if (!isPublishEnvironment(environment)) {
		throw new Error(`Invalid environment "${String(body.environment)}"`);
	}
	return environment;
}

export async function GET(request: NextRequest) {
	try {
		const environment = readSelectedEnvironment(request);
		const config = await fetchAppConfigJson({
			entityId: readEntityId(request),
			environmentId: resolveEnvironmentId(environment),
		});
		return NextResponse.json(config);
	} catch (err) {
		console.error("[appconfig] fetch failed", err);
		const message = err instanceof Error ? err.message : "Unknown error";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}

export async function PUT(request: NextRequest) {
	if (!isAuthorized(request)) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}
	try {
		const body: unknown = await request.json();
		const environment = readEnvironmentFromBody(body);
		const configBody =
			isRecord(body) && "config" in body ? body.config : body;
		const json = `${JSON.stringify(configBody, null, 2)}\n`;
		const { versionNumber } = await publishHostedConfigurationJson(json, {
			environmentId: resolveEnvironmentId(environment),
		});
		return NextResponse.json({ ok: true, versionNumber, environment });
	} catch (err) {
		console.error("[appconfig] publish failed", err);
		const message = err instanceof Error ? err.message : "Unknown error";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
