export default function Loading() {
  return (
    <div role="status" aria-label="Chargement de la page" className="animate-pulse space-y-6">
      <div className="h-32 rounded border border-line bg-panel/75" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="h-72 rounded border border-line bg-panel/60" />
        ))}
      </div>
    </div>
  );
}
