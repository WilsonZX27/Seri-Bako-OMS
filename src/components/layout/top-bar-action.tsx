"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

const actions = [
  { match: /^\/production\/jobs/, href: "/production/jobs/new", label: "New Production Job" },
  { match: /^\/goods-receivings/, href: "/goods-receivings/new", label: "New GRN" },
  { match: /^\/suppliers/, href: "/suppliers/new", label: "New supplier" },
  { match: /^\/stock-counts/, href: "/stock-counts/new", label: "New Count" },
  { match: /^\/stock-transfers/, href: "/stock-transfers/new", label: "New Transfer" },
  { match: /^\/stock-wastage/, href: "/stock-wastage/new", label: "New Wastage" },
  { match: /^\/stock-transactions/, href: "/stock-transactions/new", label: "New movement" },
  { match: /^\/items/, href: "/items/new", label: "New item" },
  { match: /^\/purchase-orders/, href: "/purchase-orders/new", label: "New PO" },
  { match: /^\/roles/, href: "/staffs/new", label: "Add staff" },
  { match: /^\/purchase-requests|^\/dashboard/, href: "/purchase-requests/new", label: "Create PR" },
];

export function TopBarAction() {
  const pathname = usePathname();
  const action = actions.find((item) => item.match.test(pathname)) ?? actions[actions.length - 1];

  return (
    <Button asChild size="sm">
      <Link href={action.href}>
        <Plus className="h-3.5 w-3.5" />
        {action.label}
      </Link>
    </Button>
  );
}
