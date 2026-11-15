import { Overview } from "@/components/overview";

export default function Home() {
  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="text-2xl font-semibold">Infrastructure Overview</h1>
      <p className="mt-1 text-sm text-muted">
        Vue en direct des serveurs surveillés.
      </p>
      <div className="mt-6">
        <Overview />
      </div>
    </main>
  );
}