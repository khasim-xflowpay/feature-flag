import type { Metadata } from "next";
import FeatureFlagsAdmin from "./FeatureFlagsAdmin";

export const metadata: Metadata = {
	title: "Feature flags admin",
	description: "Manage AppConfig hosted feature flags",
};

export default function AdminFeatureFlagsPage() {
	return <FeatureFlagsAdmin />;
}
