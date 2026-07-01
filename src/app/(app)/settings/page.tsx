import Link from "next/link";
import { Building2, FileDigit, MapPin, UserCog, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

const settingsLinks = [
  { href: "/company", title: "Company", description: "Legal profile and Seri Bako company identity.", icon: Building2 },
  { href: "/branches", title: "Branches", description: "Central kitchen, outlets, event booths, offices.", icon: MapPin },
  { href: "/locations", title: "Locations", description: "Dry store, chiller, freezer, packaging and receiving areas.", icon: MapPin },
  { href: "/staffs", title: "Staffs", description: "Staff access records and default branch assignment.", icon: Users },
  { href: "/roles", title: "Roles & Permissions", description: "Permission catalogue and role definitions.", icon: UserCog },
  { href: "/document-sequences", title: "Document Sequences", description: "Prefixes, padding, current number, reset rule, and preview.", icon: FileDigit },
];

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" description="Foundation setup for Seri Bako OMS administration." />
      <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
        {settingsLinks.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <Card className="h-full transition-colors hover:bg-secondary">
                <CardContent className="flex gap-4 p-5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold">{item.title}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </>
  );
}
