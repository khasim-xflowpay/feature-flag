import { Suspense } from "react";
import FeatureFlagsAdmin from "./admin/feature-flags/FeatureFlagsAdmin";

export default function Home() {
	return (
		<Suspense fallback={null}>
			<FeatureFlagsAdmin />
		</Suspense>
	);
}
