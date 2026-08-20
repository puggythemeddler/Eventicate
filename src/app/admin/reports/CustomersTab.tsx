import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { serverApi } from "@/lib/server-api";
import { formatDate } from "@/lib/utils";
import { ExportCsvButton } from "./ExportCsvButton";

interface CustomerRow {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  bookings: number;
  spent: number;
  joined: string;
}

export async function CustomersTab({ search, page }: { search?: string; page?: string }) {
  const currentPage = Math.max(1, Number(page) || 1);
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (currentPage > 1) params.set("page", String(currentPage));
  const qs = params.toString();

  const data = await serverApi<{
    rows: CustomerRow[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>(`/api/admin/reports/customers${qs ? `?${qs}` : ""}`);

  const linkFor = (p: string | number) =>
    new URLSearchParams({ ...(search ? { search } : {}), page: String(p) }).toString();

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-4">
        <form className="flex flex-1 gap-4">
          <div className="flex-1">
            <Input name="search" placeholder="Search by name or email..." defaultValue={search} />
          </div>
          <Button type="submit" variant="secondary">Filter</Button>
        </form>
        <ExportCsvButton
          endpoint="/api/admin/reports/customers"
          filename="customers-report"
          columns={[
            { key: "name", label: "Name" },
            { key: "email", label: "Email" },
            { key: "isActive", label: "Active", format: (v) => (v ? "Yes" : "No") },
            { key: "bookings", label: "Bookings" },
            { key: "spent", label: "Total Spent" },
            { key: "joined", label: "Joined" },
          ]}
        />
      </div>

      <Card className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-charcoal-200 text-left text-charcoal-500 dark:border-charcoal-800 dark:text-charcoal-400">
              <th className="px-6 py-3 font-medium">Name</th>
              <th className="px-6 py-3 font-medium">Email</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium text-right">Bookings</th>
              <th className="px-6 py-3 font-medium text-right">Total Spent</th>
              <th className="px-6 py-3 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.id} className="border-b border-charcoal-100 last:border-0 hover:bg-sand dark:border-charcoal-800 dark:hover:bg-charcoal-800">
                <td className="px-6 py-4 font-medium text-charcoal-900 dark:text-charcoal-100">{row.name}</td>
                <td className="px-6 py-4 text-charcoal-500 dark:text-charcoal-400">{row.email}</td>
                <td className="px-6 py-4">
                  <Badge variant={row.isActive ? "success" : "danger"}>{row.isActive ? "Active" : "Inactive"}</Badge>
                </td>
                <td className="px-6 py-4 text-right text-charcoal-500 dark:text-charcoal-400">{row.bookings}</td>
                <td className="px-6 py-4 text-right font-medium text-charcoal-900 dark:text-charcoal-100">
                  {row.spent.toLocaleString("en-US", { style: "currency", currency: "USD" })}
                </td>
                <td className="px-6 py-4 text-charcoal-500 dark:text-charcoal-400">{formatDate(row.joined)}</td>
              </tr>
            ))}
            {data.rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-sm text-charcoal-500 dark:text-charcoal-400">
                  No customers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {data.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-charcoal-500 dark:text-charcoal-400">
            Page {data.page} of {data.totalPages} ({data.total} customers)
          </p>
          <div className="flex gap-2">
            {currentPage > 1 && (
              <Link href={`/admin/reports?tab=customers&${linkFor(currentPage - 1)}`}>
                <Button variant="outline" size="sm">← Previous</Button>
              </Link>
            )}
            {currentPage < data.totalPages && (
              <Link href={`/admin/reports?tab=customers&${linkFor(currentPage + 1)}`}>
                <Button variant="outline" size="sm">Next →</Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );
}