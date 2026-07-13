type StatusTab = string | { value: string; label: string };

export function StatusTabs({ statuses, activeStatus }: { statuses: StatusTab[]; activeStatus?: string }) {
  void statuses;
  void activeStatus;
  return null;
}
