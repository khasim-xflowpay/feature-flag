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

function readEntityId(request: NextRequest): string | undefined {
	const id =
		request.headers.get("entity-id") ??
		request.headers.get("x-entity-id");
	return id === null || id === "" ? undefined : id;
}

export async function GET(request: NextRequest) {
	try {
		const config = await fetchAppConfigJson(readEntityId(request));
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
