import { LoaderCircle } from "lucide-react";

export default function AuthLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex items-center gap-3 rounded-xl border bg-card px-5 py-4 shadow-sm">
        <LoaderCircle className="h-5 w-5 animate-spin text-primary" />
        <p className="text-sm font-medium">Loading...</p>
      </div>
    </div>
  );
}
