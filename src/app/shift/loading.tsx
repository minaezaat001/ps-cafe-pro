export default function ShiftLoading() {
  return (
    <div className="p-6 space-y-6">
      <div className="h-8 w-48 rounded-lg bg-muted/40 animate-pulse" />
      <div className="h-32 rounded-2xl bg-muted/40 animate-pulse" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-muted/30 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
