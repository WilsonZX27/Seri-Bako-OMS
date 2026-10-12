import { redirect } from "next/navigation";
export default async function DeliveryOrdersRedirect({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}) { const filters=await searchParams;redirect(`/outlet-daily-records/delivery-orders${filters.date?`?date=${encodeURIComponent(filters.date)}`:""}`); }
