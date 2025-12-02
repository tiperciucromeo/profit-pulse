import { useState, useMemo } from "react";
import { TrendingUp, DollarSign, Package, Percent, Factory } from "lucide-react";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { ProfitChart } from "@/components/dashboard/ProfitChart";
import { TopProductsChart } from "@/components/dashboard/TopProductsChart";
import { OrdersTable } from "@/components/dashboard/OrdersTable";
import { SyncPanel } from "@/components/dashboard/SyncPanel";
import { ExpensesPanel } from "@/components/dashboard/ExpensesPanel";
import { useDashboardData } from "@/hooks/useDashboardData";

const Index = () => {
  const { chartData, topProducts, recentItems, isLoading, refetch } =
    useDashboardData();

  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  // Helper to get UTC date string (YYYY-MM-DD) to match EasySales filtering
  const getUTCDateString = (date: Date) => {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Filter items based on selected date range (using UTC to match EasySales)
  const filteredItems = useMemo(() => {
    let filtered = recentItems;

    if (dateFrom) {
      // Use local date from picker but compare against UTC dates from DB
      const year = dateFrom.getFullYear();
      const month = String(dateFrom.getMonth() + 1).padStart(2, '0');
      const day = String(dateFrom.getDate()).padStart(2, '0');
      const fromDateStr = `${year}-${month}-${day}`;
      
      filtered = filtered.filter((item) => {
        if (!item.orders?.order_date) return false;
        const orderDate = new Date(item.orders.order_date);
        const orderDateStr = getUTCDateString(orderDate);
        return orderDateStr >= fromDateStr;
      });
    }

    if (dateTo) {
      const year = dateTo.getFullYear();
      const month = String(dateTo.getMonth() + 1).padStart(2, '0');
      const day = String(dateTo.getDate()).padStart(2, '0');
      const toDateStr = `${year}-${month}-${day}`;
      
      filtered = filtered.filter((item) => {
        if (!item.orders?.order_date) return false;
        const orderDate = new Date(item.orders.order_date);
        const orderDateStr = getUTCDateString(orderDate);
        return orderDateStr <= toDateStr;
      });
    }

    return filtered;
  }, [recentItems, dateFrom, dateTo]);

  // Calculate metrics based on filtered items
  const filteredMetrics = useMemo(() => {
    const totalProfit = filteredItems.reduce(
      (sum, item) => sum + Number(item.net_profit),
      0
    );
    const totalRevenue = filteredItems.reduce(
      (sum, item) => sum + Number(item.real_revenue),
      0
    );
    const totalProductionCost = filteredItems.reduce(
      (sum, item) => sum + Number(item.production_cost),
      0
    );

    // Count unique orders
    const uniqueOrders = new Set(
      filteredItems.map((item) => item.orders?.easysales_order_id).filter(Boolean)
    );

    return {
      totalProfit,
      totalRevenue,
      totalProductionCost,
      totalOrders: uniqueOrders.size,
      profitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
    };
  }, [filteredItems]);

  // Format the period subtitle
  const periodSubtitle = useMemo(() => {
    if (dateFrom && dateTo) {
      return `${format(dateFrom, "dd MMM", { locale: ro })} - ${format(dateTo, "dd MMM yyyy", { locale: ro })}`;
    }
    if (dateFrom) {
      return `De la ${format(dateFrom, "dd MMM yyyy", { locale: ro })}`;
    }
    if (dateTo) {
      return `Până la ${format(dateTo, "dd MMM yyyy", { locale: ro })}`;
    }
    return "Toate comenzile";
  }, [dateFrom, dateTo]);

  // Get selected month for expenses (from dateFrom or current month)
  const selectedMonth = useMemo(() => {
    if (dateFrom) {
      return format(dateFrom, "yyyy-MM");
    }
    return format(new Date(), "yyyy-MM");
  }, [dateFrom]);

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <MetricCard
            title="Profit Net Total"
            value={`${filteredMetrics.totalProfit.toFixed(2)} RON`}
            subtitle={periodSubtitle}
            icon={TrendingUp}
            variant="success"
            delay={0}
          />
          <MetricCard
            title="Vânzări"
            value={`${filteredMetrics.totalRevenue.toFixed(2)} RON`}
            subtitle={periodSubtitle}
            icon={DollarSign}
            delay={50}
          />
          <MetricCard
            title="Costuri Producție"
            value={`${filteredMetrics.totalProductionCost.toFixed(2)} RON`}
            subtitle={periodSubtitle}
            icon={Factory}
            variant="destructive"
            delay={100}
          />
          <MetricCard
            title="Comenzi Procesate"
            value={String(filteredMetrics.totalOrders)}
            subtitle={periodSubtitle}
            icon={Package}
            delay={150}
          />
          <MetricCard
            title="Marjă Reală"
            value={`${filteredMetrics.profitMargin.toFixed(1)}%`}
            subtitle="Profit / Vânzări"
            icon={Percent}
            variant="accent"
            delay={200}
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ProfitChart data={chartData} />
          <TopProductsChart data={topProducts} />
        </div>

        {/* Monthly Expenses Panel */}
        <ExpensesPanel 
          selectedMonth={selectedMonth} 
          totalRevenue={filteredMetrics.totalRevenue} 
        />

        {/* Orders Table */}
        <OrdersTable
          items={recentItems}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
        />

        {/* Footer Info */}
        <div className="text-center text-sm text-muted-foreground py-4">
          <p>
            Formula:{" "}
            <span className="font-mono bg-muted px-2 py-1 rounded">
              Profit = (Preț Vânzare - Reducere/n + Transport/n) - Cost Producție
            </span>
          </p>
          <p className="mt-2">
            Metoda distribuirii uniforme • Cheltuielile și transportul se împart
            egal la toate produsele din comandă
          </p>
        </div>
      </main>
    </div>
  );
};

export default Index;
