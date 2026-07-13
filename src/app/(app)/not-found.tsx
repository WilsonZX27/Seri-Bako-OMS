import { NotFoundState } from "@/components/ui/system-states";

export default function AppNotFound() {
  return (
    <NotFoundState
      title="Page not found"
      description="This route does not exist, or it is not available in the current workspace."
      action={{ href: "/dashboard", label: "Back to dashboard" }}
    />
  );
}
