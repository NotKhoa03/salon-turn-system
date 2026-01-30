import { getCachedEmployees, getCachedServices } from "@/lib/supabase/server";
import DashboardClient from "./dashboard-client";

export default async function DashboardPage() {
  // Fetch static data on server with caching (5 min)
  const [employees, services] = await Promise.all([
    getCachedEmployees(),
    getCachedServices(),
  ]);

  return <DashboardClient employees={employees} services={services} />;
}
