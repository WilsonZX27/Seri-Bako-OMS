import { LoaderCircle } from "lucide-react";

export default function AppLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="flex items-center gap-3 rounded-xl border bg-card px-5 py-4 shadow-sm">
        <LoaderCircle className="h-5 w-5 animate-spin text-primary" />
        <p className="text-sm font-medium">Loading data...</p>
      </div>
    </div>
  );
}
