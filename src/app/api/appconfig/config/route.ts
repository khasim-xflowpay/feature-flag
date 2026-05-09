import { getAppConfigDataClient } from "@/appconfig/client";
import { fetchAppConfigJson } from "@/appconfig/fetchConfig";
import { publishHostedConfigurationJson } from "@/appconfig/deployHostedConfig";
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

export async function GET() {
	try {
		const client = getAppConfigDataClient();
		const config = await fetchAppConfigJson(client);
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
		const json = `${JSON.stringify(body, null, 2)}\n`;
		const { versionNumber } = await publishHostedConfigurationJson(json);
		return NextResponse.json({ ok: true, versionNumber });
	} catch (err) {
		console.error("[appconfig] publish failed", err);
		const message = err instanceof Error ? err.message : "Unknown error";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}
