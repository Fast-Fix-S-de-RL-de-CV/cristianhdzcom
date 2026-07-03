import { SaasFooter, SaasNav } from "../chrome";
import { CrearClient } from "./CrearClient";

/**
 * Wizard de signup de la SaaS (realm plataforma). El plan preseleccionado
 * llega por query param (?plan=basico|pro) desde /precios o el landing.
 */

export default async function CrearPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const sp = await searchParams;
  const initialPlan = sp.plan === "pro" ? "pro" : "basico";

  return (
    <div>
      <SaasNav active="crear" />
      <CrearClient initialPlan={initialPlan} />
      <SaasFooter />
    </div>
  );
}
