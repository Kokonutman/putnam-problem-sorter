import { PutnamDashboard } from "@/components/putnam-dashboard";
import { loadPutnamDataset } from "@/lib/data";

export const dynamic = "force-static";

export default async function HomePage() {
  const dataset = await loadPutnamDataset();
  return <PutnamDashboard dataset={dataset} />;
}
