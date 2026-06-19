"use client";

import { useRouter } from "next/navigation";
import CustomerForm from "@/components/customers/CustomerForm";

export default function NewCustomerPage() {
  const router = useRouter();
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Add customer</h1>
      <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
        <CustomerForm
          onSaved={(id) => router.replace(`/customers/${id}`)}
          onClose={() => router.back()}
        />
      </div>
    </div>
  );
}
