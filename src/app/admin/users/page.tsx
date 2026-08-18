import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Navigation";
import { PageContent } from "@/components/layout/PageContent";
import { Card } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { serverApi } from "@/lib/server-api";
import { formatDate } from "@/lib/utils";
import { UserActions } from "./UserActions";

const ROLE_OPTIONS = [
  { value: "ALL", label: "All Roles" },
  { value: "CUSTOMER", label: "Customer" },
  { value: "PROVIDER", label: "Provider" },
  { value: "ADMIN", label: "Admin" },
];

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; search?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/auth/login");
  if (session.role !== "ADMIN") redirect("/dashboard");

  const { role, search } = await searchParams;

  const params = new URLSearchParams();
  if (role && role !== "ALL") params.set("role", role);
  if (search) params.set("search", search);
  const qs = params.toString();

  const data = await serverApi<{
    users: Array<{
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      phone: string | null;
      role: string;
      isActive: boolean;
      isVerified: boolean;
      createdAt: string;
      bookingCount: number;
    }>;
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>(`/api/admin/users${qs ? `?${qs}` : ""}`);

  const enriched = data.users;

  return (
    <div className="flex min-h-screen">
      <Sidebar role="ADMIN" />
      <PageContent>
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Users</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{data.total} total users</p>
          </div>
        </div>

        <Card className="mb-6">
          <form className="flex gap-4">
            <div className="flex-1">
              <Input name="search" placeholder="Search by name or email..." defaultValue={search} />
            </div>
            <div className="w-44">
              <Select name="role" options={ROLE_OPTIONS} defaultValue={role || "ALL"} />
            </div>
            <Button type="submit" variant="secondary">Filter</Button>
          </form>
        </Card>

        <Card className="overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500 dark:border-gray-700 dark:text-gray-400">
                <th className="px-6 py-3 font-medium">Name</th>
                <th className="px-6 py-3 font-medium">Email</th>
                <th className="px-6 py-3 font-medium">Role</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Created</th>
                <th className="px-6 py-3 font-medium text-right">Bookings</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {enriched.map((user) => (
                <tr key={user.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">
                    {user.firstName} {user.lastName}
                  </td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{user.email}</td>
                  <td className="px-6 py-4">
                    <Badge variant={user.role === "ADMIN" ? "info" : user.role === "PROVIDER" ? "warning" : "default"}>
                      {user.role}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={user.isActive ? "success" : "danger"}>
                      {user.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{formatDate(user.createdAt)}</td>
                  <td className="px-6 py-4 text-right text-gray-500 dark:text-gray-400">{user.bookingCount}</td>
                  <td className="px-6 py-4 text-right">
                    <UserActions user={user} isSelf={user.id === session.id} />
                  </td>
                </tr>
              ))}
              {enriched.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </PageContent>
    </div>
  );
}
