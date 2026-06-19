import { redirect } from "next/navigation";

export default function Home() {
  // Middleware handles auth; land everyone on the dashboard.
  redirect("/dashboard");
}
