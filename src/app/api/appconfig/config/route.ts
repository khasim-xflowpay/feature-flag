import { getFeatureFlagsConfig, invalidateFeatureFlagsCache } from "@/appconfig/cache";
import { assertFeatureFlagsConfig } from "@/appconfig/fetchConfig";
import { publishHostedConfigurationJson } from "@/appconfig/deployHostedConfig";
import { serializeFeatureFlagsConfig } from "@/lib/featureFlagConfig";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest): boolean {
	const secret = process.env.APPCONFIG_ADMIN_SECRET;
	if (secret === undefined || secret === "") {
		return true;
	}
	const header = request.headers.get("x-admin-secret");
	return header === secret;
}

/**
 * Returns the current hosted configuration document from AWS AppConfig (after validation).
 */
export async function GET() {
	try {
		const config = await getFeatureFlagsConfig();
		return NextResponse.json(config);
	} catch (err) {
		console.error("[appconfig] getFeatureFlagsConfig failed", err);
		const message = err instanceof Error ? err.message : "Unknown error";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}

/**
 * Publishes a full feature-flags document: new hosted version + deployment.
 * Body: `FeatureFlagsConfig` JSON. Send header `x-admin-secret` when `APPCONFIG_ADMIN_SECRET` is set.
 */
export async function PUT(request: NextRequest) {
	if (!isAuthorized(request)) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}
	try {
		const body: unknown = await request.json();
		const config = assertFeatureFlagsConfig(body);
		const json = serializeFeatureFlagsConfig(config);
		const { versionNumber } = await publishHostedConfigurationJson(json);
		invalidateFeatureFlagsCache();
		return NextResponse.json({ ok: true, versionNumber });
	} catch (err) {
		console.error("[appconfig] publish failed", err);
		const message = err instanceof Error ? err.message : "Unknown error";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
