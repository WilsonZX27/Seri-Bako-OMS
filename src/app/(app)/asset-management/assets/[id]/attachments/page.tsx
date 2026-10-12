import { AssetAttachmentRegister } from "@/components/asset-attachment-register";
export default async function AttachmentsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ page?: string }> }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  return <AssetAttachmentRegister kind="asset" id={id} page={query.page}/>;
}
