export default function CafeteriaLoading() {
  return (
    <div className="p-6 space-y-6">
      <div className="h-8 w-48 rounded-lg bg-muted/40 animate-pulse" />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-36 rounded-2xl bg-muted/40 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
