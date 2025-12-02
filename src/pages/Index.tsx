import { TrendingUp, DollarSign, Package, Percent } from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { ProfitChart } from "@/components/dashboard/ProfitChart";
import { TopProductsChart } from "@/components/dashboard/TopProductsChart";
import { OrdersTable } from "@/components/dashboard/OrdersTable";
import { SyncPanel } from "@/components/dashboard/SyncPanel";
import { useDashboardData } from "@/hooks/useDashboardData";

const Index = () => {
  const { metrics, chartData, topProducts, recentItems, isLoading, refetch } =
    useDashboardData();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Dashboard Profitabilitate
              </h1>
              <p className="text-sm text-muted-foreground">
                Vizualizare profit real per produs • eCommerce
              </p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 text-success text-sm font-medium">
              <div className="h-2 w-2 rounded-full bg-success animate-pulse-soft" />
              Live
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 space-y-8">
        {/* Sync Panel */}
        <SyncPanel onSync={refetch} isLoading={isLoading} />

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Profit Net Total"
            value={`${(metrics?.totalProfit || 0).toFixed(2)} RON`}
            subtitle="Luna curentă"
            icon={TrendingUp}
            variant="success"
            delay={0}
          />
          <MetricCard
            title="Venituri Reale"
            value={`${(metrics?.totalRevenue || 0).toFixed(2)} RON`}
            subtitle="După ajustări"
            icon={DollarSign}
            delay={50}
          />
          <MetricCard
            title="Comenzi Procesate"
            value={String(metrics?.totalOrders || 0)}
            subtitle="Finalizate"
            icon={Package}
            delay={100}
          />
          <MetricCard
            title="Marjă Reală"
            value={`${(metrics?.profitMargin || 0).toFixed(1)}%`}
            subtitle="Profit / Venituri"
            icon={Percent}
            variant="accent"
            delay={150}
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ProfitChart data={chartData} />
          <TopProductsChart data={topProducts} />
        </div>

        {/* Orders Table */}
        <OrdersTable items={recentItems} />

        {/* Footer Info */}
        <div className="text-center text-sm text-muted-foreground py-4">
          <p>
            Formula: <span className="font-mono bg-muted px-2 py-1 rounded">
              Profit = (Preț Vânzare - Reducere/n + Transport/n) - Cost Producție
            </span>
          </p>
          <p className="mt-2">
            Metoda distribuirii uniforme • Cheltuielile și transportul se împart egal la toate produsele din comandă
          </p>
        </div>
      </main>
    </div>
  );
};

export default Index;
