import { PageLoadingState } from "@/components/ui/system-states";

export default function AuthLoading() {
  return (
    <div className="min-h-screen bg-background">
      <PageLoadingState label="Loading..." />
    </div>
  );
}
