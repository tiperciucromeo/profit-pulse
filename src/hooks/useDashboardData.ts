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
    customer_name: string | null;
    shipping_cost: number;
    discount_amount: number;
  };
}

export interface OrderTotals {
  totalShipping: number;
  totalDiscounts: number;
}

export function useDashboardData() {
  const metricsQuery = useQuery({
    queryKey: ["dashboard-metrics"],
    queryFn: async (): Promise<DashboardMetrics> => {
      // Fetch all order items with pagination
      const PAGE_SIZE = 1000;
      let allItems: { net_profit: number; real_revenue: number }[] = [];
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("order_items")
          .select("net_profit, real_revenue")
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          allItems = [...allItems, ...data];
          hasMore = data.length === PAGE_SIZE;
          page++;
        } else {
          hasMore = false;
        }
      }

      const totalProfit = allItems.reduce((sum, item) => sum + Number(item.net_profit), 0);
      const totalRevenue = allItems.reduce((sum, item) => sum + Number(item.real_revenue), 0);

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
      const PAGE_SIZE = 1000;
      let allData: { net_profit: number; real_revenue: number; orders: { order_date: string } }[] = [];
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("order_items")
          .select("net_profit, real_revenue, orders!inner(order_date)")
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          allData = [...allData, ...(data as any)];
          hasMore = data.length === PAGE_SIZE;
          page++;
        } else {
          hasMore = false;
        }
      }

      // Group by date
      const grouped: Record<string, { profit: number; revenue: number }> = {};
      
      allData.forEach((item) => {
        const date = new Date(item.orders.order_date).toLocaleDateString("ro-RO", {
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
      const PAGE_SIZE = 1000;
      let allData: { sku: string; product_name: string; net_profit: number }[] = [];
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("order_items")
          .select("sku, product_name, net_profit")
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          allData = [...allData, ...data];
          hasMore = data.length === PAGE_SIZE;
          page++;
        } else {
          hasMore = false;
        }
      }

      // Aggregate by SKU
      const byProduct: Record<string, { name: string; profit: number; sku: string }> = {};
      
      allData.forEach((item) => {
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
      const PAGE_SIZE = 1000;
      let allData: OrderItem[] = [];
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("order_items")
          .select("*, orders!inner(easysales_order_id, order_date, customer_name, shipping_cost, discount_amount)")
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          allData = [...allData, ...(data as any)];
          hasMore = data.length === PAGE_SIZE;
          page++;
        } else {
          hasMore = false;
        }
      }
      
      // Sort by order_date descending (most recent first)
      const sorted = allData.sort((a, b) => {
        const dateA = new Date(a.orders?.order_date || 0).getTime();
        const dateB = new Date(b.orders?.order_date || 0).getTime();
        return dateB - dateA;
      });
      
      return sorted;
    },
  });

  // Query to get order totals (shipping and discounts) directly from orders table
  const orderTotalsQuery = useQuery({
    queryKey: ["order-totals"],
    queryFn: async (): Promise<OrderTotals> => {
      const PAGE_SIZE = 1000;
      let allOrders: { shipping_cost: number; discount_amount: number }[] = [];
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("orders")
          .select("shipping_cost, discount_amount")
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          allOrders = [...allOrders, ...data];
          hasMore = data.length === PAGE_SIZE;
          page++;
        } else {
          hasMore = false;
        }
      }

      const totalShipping = allOrders.reduce((sum, order) => sum + Number(order.shipping_cost), 0);
      const totalDiscounts = allOrders.reduce((sum, order) => sum + Number(order.discount_amount), 0);

      return { totalShipping, totalDiscounts };
    },
  });

  return {
    metrics: metricsQuery.data,
    chartData: chartDataQuery.data || [],
    topProducts: topProductsQuery.data || [],
    recentItems: recentItemsQuery.data || [],
    orderTotals: orderTotalsQuery.data || { totalShipping: 0, totalDiscounts: 0 },
    isLoading:
      metricsQuery.isLoading ||
      chartDataQuery.isLoading ||
      topProductsQuery.isLoading ||
      recentItemsQuery.isLoading ||
      orderTotalsQuery.isLoading,
    refetch: () => {
      metricsQuery.refetch();
      chartDataQuery.refetch();
      topProductsQuery.refetch();
      recentItemsQuery.refetch();
      orderTotalsQuery.refetch();
    },
  };
}
