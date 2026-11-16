import { Suspense } from "react";
import { ServerDetail } from "@/components/server-detail";

type Props = { params: Promise<{ id: string }> };

async function Content({ params }: Props) {
  const { id } = await params;
  return <ServerDetail id={id} />;
}

export default function ServerPage({ params }: Props) {
  return (
    <main className="mx-auto max-w-6xl p-6">
      <Suspense fallback={<p className="text-sm text-muted">Chargement…</p>}>
        <Content params={params} />
      </Suspense>
    </main>
  );
}