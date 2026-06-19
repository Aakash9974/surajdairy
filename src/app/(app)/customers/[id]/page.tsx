import CustomerDetailClient from "@/components/customers/CustomerDetailClient";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CustomerDetailClient id={id} />;
}
