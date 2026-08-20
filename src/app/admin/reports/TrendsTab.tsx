import { Card } from "@/components/ui/Card";
import { serverApi } from "@/lib/server-api";
import { ExportCsvButton } from "./ExportCsvButton";

interface TrendRow {
  label: string;
  newUsers: number;
  newProviders: number;
  bookings: number;
  revenue: number;
}

export async function TrendsTab() {
  const data = await serverApi<{ rows: TrendRow[] }>(`/api/admin/reports/trends`);

  const totalUsers = data.rows.reduce((s, r) => s + r.newUsers, 0);
  const totalProviders = data.rows.reduce((s, r) => s + r.newProviders, 0);
  const totalBookings = data.rows.reduce((s, r) => s + r.bookings, 0);
  const totalRevenue = data.rows.reduce((s, r) => s + r.revenue, 0);

  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "New Users (12 mo)", value: totalUsers },
          { label: "New Providers (12 mo)", value: totalProviders },
          { label: "Bookings (12 mo)", value: totalBookings },
          { label: "Revenue (12 mo)", value: totalRevenue.toLocaleString("en-US", { style: "currency", currency: "USD" }) },
        ].map((stat) => (
          <Card key={stat.label} className="p-3">
            <p className="text-xl font-bold text-charcoal-900 dark:text-charcoal-100">{stat.value}</p>
            <p className="text-xs text-charcoal-500 dark:text-charcoal-400">{stat.label}</p>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-charcoal-200 text-left text-charcoal-500 dark:border-charcoal-800 dark:text-charcoal-400">
              <th className="px-6 py-3 font-medium">Month</th>
              <th className="px-6 py-3 font-medium text-right">New Users</th>
              <th className="px-6 py-3 font-medium text-right">New Providers</th>
              <th className="px-6 py-3 font-medium text-right">Bookings</th>
              <th className="px-6 py-3 font-medium text-right">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.label} className="border-b border-charcoal-100 last:border-0 hover:bg-sand dark:border-charcoal-800 dark:hover:bg-charcoal-800">
                <td className="px-6 py-4 font-medium text-charcoal-900 dark:text-charcoal-100">{row.label}</td>
                <td className="px-6 py-4 text-right text-charcoal-500 dark:text-charcoal-400">{row.newUsers}</td>
                <td className="px-6 py-4 text-right text-charcoal-500 dark:text-charcoal-400">{row.newProviders}</td>
                <td className="px-6 py-4 text-right text-charcoal-500 dark:text-charcoal-400">{row.bookings}</td>
                <td className="px-6 py-4 text-right font-medium text-charcoal-900 dark:text-charcoal-100">
                  {row.revenue.toLocaleString("en-US", { style: "currency", currency: "USD" })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="mt-4 flex justify-end">
        <ExportCsvButton
          endpoint="/api/admin/reports/trends"
          filename="monthly-trends"
          columns={[
            { key: "label", label: "Month" },
            { key: "newUsers", label: "New Users" },
            { key: "newProviders", label: "New Providers" },
            { key: "bookings", label: "Bookings" },
            { key: "revenue", label: "Revenue" },
          ]}
        />
      </div>
    </>
  );
}