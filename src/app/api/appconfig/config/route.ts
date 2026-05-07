import { getFeatureFlagsConfig } from "@/appconfig/cache";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Returns the current hosted configuration document from AWS AppConfig (after validation).
 * For evaluation by account/context, add a separate route later.
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
