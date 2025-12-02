import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TopProductsChartProps {
  data: {
    name: string;
    profit: number;
    sku: string;
  }[];
}

const COLORS = [
  "hsl(142, 72%, 42%)",
  "hsl(142, 72%, 50%)",
  "hsl(142, 72%, 58%)",
  "hsl(158, 64%, 52%)",
  "hsl(158, 64%, 60%)",
];

export function TopProductsChart({ data }: TopProductsChartProps) {
  return (
    <Card className="animate-slide-up border-border bg-card" style={{ animationDelay: "300ms" }}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          Top 5 Produse Profitabile
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                horizontal={true}
                vertical={false}
              />
              <XAxis
                type="number"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                tickFormatter={(value) => `${value} RON`}
              />
              <YAxis
                type="category"
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                width={100}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                  boxShadow: "var(--shadow-md)",
                }}
                formatter={(value: number) => [`${value.toFixed(2)} RON`, "Profit"]}
                labelFormatter={(label) => `Produs: ${label}`}
              />
              <Bar dataKey="profit" radius={[0, 4, 4, 0]}>
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
