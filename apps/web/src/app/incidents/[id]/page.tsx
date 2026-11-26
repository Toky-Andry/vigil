import { Suspense } from "react";
import { IncidentDetailView } from "@/components/incidents/incident-detail-view";

type IncidentPageProps = { params: Promise<{ id: string }> };

async function IncidentPageContent({ params }: IncidentPageProps) {
  const { id } = await params;
  return <IncidentDetailView id={id} />;
}

export default function IncidentPage({ params }: IncidentPageProps) {
  return (
    <main className="w-full max-w-7xl p-6">
      <Suspense
        fallback={
          <p className="rounded-lg border border-border bg-surface p-4 text-sm text-muted">
            Chargement du détail de l’incident…
          </p>
        }
      >
        <IncidentPageContent params={params} />
      </Suspense>
    </main>
  );
}
