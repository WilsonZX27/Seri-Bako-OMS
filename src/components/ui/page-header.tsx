import type { ReactNode } from "react";

type PageHeaderProps = {
  title: ReactNode;
  description?: string;
  action?: {
    href: string;
    label: string;
  };
  secondaryAction?: {
    href: string;
    label: string;
  };
};

export function PageHeader(props: PageHeaderProps) {
  void props;
  return null;
}
