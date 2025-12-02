import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ProfitChartProps {
  data: {
    date: string;
    profit: number;
    revenue: number;
  }[];
}

export function ProfitChart({ data }: ProfitChartProps) {
  return (
    <Card className="animate-slide-up border-border bg-card" style={{ animationDelay: "200ms" }}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          Evoluție Profit & Venituri
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="hsl(142, 72%, 42%)"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor="hsl(142, 72%, 42%)"
                    stopOpacity={0}
                  />
                </linearGradient>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="hsl(262, 83%, 58%)"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor="hsl(262, 83%, 58%)"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                tickFormatter={(value) => `${value} RON`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                  boxShadow: "var(--shadow-md)",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
                formatter={(value: number, name: string) => [
                  `${value.toFixed(2)} RON`,
                  name === "profit" ? "Profit" : "Venituri",
                ]}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="hsl(262, 83%, 58%)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#revenueGradient)"
              />
              <Area
                type="monotone"
                dataKey="profit"
                stroke="hsl(142, 72%, 42%)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#profitGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex items-center justify-center gap-6">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-primary" />
            <span className="text-sm text-muted-foreground">Profit Net</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-accent" />
            <span className="text-sm text-muted-foreground">Venituri Reale</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
