import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DashboardMetrics {
  totalProfit: number;
  totalRevenue: number;
  totalOrders: number;
  profitMargin: number;
  avgOrderProfit: number;
}

export interface ChartData {
  date: string;
  profit: number;
  revenue: number;
}

export interface TopProduct {
  name: string;
  profit: number;
  sku: string;
}

export interface OrderItem {
  id: string;
  sku: string;
  product_name: string;
  sale_price: number;
  production_cost: number;
  real_revenue: number;
  net_profit: number;
  created_at: string;
  orders?: {
    easysales_order_id: string;
    order_date: string;
  };
}

export function useDashboardData() {
  const metricsQuery = useQuery({
    queryKey: ["dashboard-metrics"],
    queryFn: async (): Promise<DashboardMetrics> => {
      const { data: items, error } = await supabase
        .from("order_items")
        .select("net_profit, real_revenue");

      if (error) throw error;

      const totalProfit = items?.reduce((sum, item) => sum + Number(item.net_profit), 0) || 0;
      const totalRevenue = items?.reduce((sum, item) => sum + Number(item.real_revenue), 0) || 0;

      const { count: totalOrders } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true });

      return {
        totalProfit,
        totalRevenue,
        totalOrders: totalOrders || 0,
        profitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
        avgOrderProfit: totalOrders && totalOrders > 0 ? totalProfit / totalOrders : 0,
      };
    },
  });

  const chartDataQuery = useQuery({
    queryKey: ["dashboard-chart"],
    queryFn: async (): Promise<ChartData[]> => {
      const { data, error } = await supabase
        .from("order_items")
        .select(`
          net_profit,
          real_revenue,
          orders!inner(order_date)
        `)
        .order("orders(order_date)", { ascending: true });

      if (error) throw error;

      // Group by date
      const grouped: Record<string, { profit: number; revenue: number }> = {};
      
      data?.forEach((item) => {
        const date = new Date((item.orders as any).order_date).toLocaleDateString("ro-RO", {
          day: "2-digit",
          month: "short",
        });
        
        if (!grouped[date]) {
          grouped[date] = { profit: 0, revenue: 0 };
        }
        grouped[date].profit += Number(item.net_profit);
        grouped[date].revenue += Number(item.real_revenue);
      });

      return Object.entries(grouped).map(([date, values]) => ({
        date,
        profit: values.profit,
        revenue: values.revenue,
      }));
    },
  });

  const topProductsQuery = useQuery({
    queryKey: ["top-products"],
    queryFn: async (): Promise<TopProduct[]> => {
      const { data, error } = await supabase
        .from("order_items")
        .select("sku, product_name, net_profit");

      if (error) throw error;

      // Aggregate by SKU
      const byProduct: Record<string, { name: string; profit: number; sku: string }> = {};
      
      data?.forEach((item) => {
        if (!byProduct[item.sku]) {
          byProduct[item.sku] = {
            name: item.product_name,
            profit: 0,
            sku: item.sku,
          };
        }
        byProduct[item.sku].profit += Number(item.net_profit);
      });

      return Object.values(byProduct)
        .sort((a, b) => b.profit - a.profit)
        .slice(0, 5);
    },
  });

  const recentItemsQuery = useQuery({
    queryKey: ["recent-items"],
    queryFn: async (): Promise<OrderItem[]> => {
      const { data, error } = await supabase
        .from("order_items")
        .select(`
          *,
          orders!inner(easysales_order_id, order_date)
        `)
        .order("orders(order_date)", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  return {
    metrics: metricsQuery.data,
    chartData: chartDataQuery.data || [],
    topProducts: topProductsQuery.data || [],
    recentItems: recentItemsQuery.data || [],
    isLoading:
      metricsQuery.isLoading ||
      chartDataQuery.isLoading ||
      topProductsQuery.isLoading ||
      recentItemsQuery.isLoading,
    refetch: () => {
      metricsQuery.refetch();
      chartDataQuery.refetch();
      topProductsQuery.refetch();
      recentItemsQuery.refetch();
    },
  };
}
