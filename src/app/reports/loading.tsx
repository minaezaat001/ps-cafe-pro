export default function ReportsLoading() {
  return (
    <div className="p-6 space-y-6">
      <div className="h-8 w-48 rounded-lg bg-muted/40 animate-pulse" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-muted/40 animate-pulse" />
        ))}
      </div>
      <div className="h-64 rounded-2xl bg-muted/30 animate-pulse" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 rounded-xl bg-muted/30 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
