import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { serverApi } from "@/lib/server-api";
import { ExportCsvButton } from "./ExportCsvButton";

interface ProviderRow {
  id: string;
  businessName: string;
  category: string;
  owner: string;
  email: string;
  verificationStatus: string;
  isApproved: boolean;
  bookings: number;
  revenue: number;
  rating: number;
  reviews: number;
}

export async function ProvidersTab({ search, page }: { search?: string; page?: string }) {
  const currentPage = Math.max(1, Number(page) || 1);
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (currentPage > 1) params.set("page", String(currentPage));
  const qs = params.toString();

  const data = await serverApi<{
    rows: ProviderRow[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>(`/api/admin/reports/providers${qs ? `?${qs}` : ""}`);

  const linkFor = (p: string | number) =>
    new URLSearchParams({ ...(search ? { search } : {}), page: String(p) }).toString();

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-4">
        <form className="flex flex-1 gap-4">
          <div className="flex-1">
            <Input name="search" placeholder="Search by business name or email..." defaultValue={search} />
          </div>
          <Button type="submit" variant="secondary">Filter</Button>
        </form>
        <ExportCsvButton
          endpoint="/api/admin/reports/providers"
          filename="providers-report"
          columns={[
            { key: "businessName", label: "Business" },
            { key: "category", label: "Category" },
            { key: "owner", label: "Owner" },
            { key: "email", label: "Email" },
            { key: "verificationStatus", label: "Verification" },
            { key: "isApproved", label: "Approved", format: (v) => (v ? "Yes" : "No") },
            { key: "bookings", label: "Bookings" },
            { key: "revenue", label: "Revenue" },
            { key: "rating", label: "Rating" },
            { key: "reviews", label: "Reviews" },
          ]}
        />
      </div>

      <Card className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-charcoal-200 text-left text-charcoal-500 dark:border-charcoal-800 dark:text-charcoal-400">
              <th className="px-6 py-3 font-medium">Business</th>
              <th className="px-6 py-3 font-medium">Category</th>
              <th className="px-6 py-3 font-medium">Verification</th>
              <th className="px-6 py-3 font-medium text-right">Bookings</th>
              <th className="px-6 py-3 font-medium text-right">Revenue</th>
              <th className="px-6 py-3 font-medium text-right">Rating</th>
              <th className="px-6 py-3 font-medium text-right">Reviews</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.id} className="border-b border-charcoal-100 last:border-0 hover:bg-sand dark:border-charcoal-800 dark:hover:bg-charcoal-800">
                <td className="px-6 py-4">
                  <Link href={`/admin/providers`} className="font-medium text-charcoal-900 hover:text-primary-700 dark:text-charcoal-100">
                    {row.businessName}
                  </Link>
                  <p className="text-xs text-charcoal-500 dark:text-charcoal-400">{row.owner}</p>
                </td>
                <td className="px-6 py-4 text-charcoal-500 dark:text-charcoal-400">{row.category.replace(/_/g, " ")}</td>
                <td className="px-6 py-4">
                  <Badge variant={row.verificationStatus === "VERIFIED" ? "success" : row.verificationStatus === "PENDING" ? "warning" : row.verificationStatus === "REJECTED" ? "danger" : "default"}>
                    {row.verificationStatus === "NONE" ? "Not Submitted" : row.verificationStatus}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-right text-charcoal-500 dark:text-charcoal-400">{row.bookings}</td>
                <td className="px-6 py-4 text-right font-medium text-charcoal-900 dark:text-charcoal-100">
                  {row.revenue.toLocaleString("en-US", { style: "currency", currency: "USD" })}
                </td>
                <td className="px-6 py-4 text-right text-charcoal-500 dark:text-charcoal-400">{row.rating.toFixed(1)}</td>
                <td className="px-6 py-4 text-right text-charcoal-500 dark:text-charcoal-400">{row.reviews}</td>
              </tr>
            ))}
            {data.rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-sm text-charcoal-500 dark:text-charcoal-400">
                  No providers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {data.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-charcoal-500 dark:text-charcoal-400">
            Page {data.page} of {data.totalPages} ({data.total} providers)
          </p>
          <div className="flex gap-2">
            {currentPage > 1 && (
              <Link href={`/admin/reports?tab=providers&${linkFor(currentPage - 1)}`}>
                <Button variant="outline" size="sm">← Previous</Button>
              </Link>
            )}
            {currentPage < data.totalPages && (
              <Link href={`/admin/reports?tab=providers&${linkFor(currentPage + 1)}`}>
                <Button variant="outline" size="sm">Next →</Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );
}