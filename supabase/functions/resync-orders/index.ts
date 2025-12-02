import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Romanian VAT rate
const VAT_RATE = 0.21;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const websiteToken = Deno.env.get('EASYSALES_WEBSITE_TOKEN');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!websiteToken) {
      throw new Error('Missing EasySales website token');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get request body for optional month filter
    let monthFilter = null;
    try {
      const body = await req.json();
      monthFilter = body.month; // Format: "2025-10" for October 2025
    } catch {
      // No body provided, sync all
    }

    console.log(`Starting resync${monthFilter ? ` for month ${monthFilter}` : ' for all orders'}...`);

    // Get ALL product costs
    let allProductCosts: { sku: string; production_cost: number }[] = [];
    let costPage = 0;
    let hasMoreCosts = true;
    const COST_PAGE_SIZE = 1000;

    while (hasMoreCosts) {
      const { data: costBatch } = await supabase
        .from('product_costs')
        .select('sku, production_cost')
        .range(costPage * COST_PAGE_SIZE, (costPage + 1) * COST_PAGE_SIZE - 1);

      if (costBatch && costBatch.length > 0) {
        allProductCosts = [...allProductCosts, ...costBatch];
        hasMoreCosts = costBatch.length === COST_PAGE_SIZE;
        costPage++;
      } else {
        hasMoreCosts = false;
      }
    }

    const costMap = new Map(allProductCosts.map(p => [p.sku, p.production_cost]));
    console.log(`Loaded ${costMap.size} product costs`);

    // Get existing orders from our database
    let ordersQuery = supabase
      .from('orders')
      .select('id, easysales_order_id, order_date, shipping_cost, discount_amount, total_items');
    
    if (monthFilter) {
      const startDate = `${monthFilter}-01`;
      const [year, month] = monthFilter.split('-').map(Number);
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextYear = month === 12 ? year + 1 : year;
      const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
      ordersQuery = ordersQuery.gte('order_date', startDate).lt('order_date', endDate);
    }

    const { data: existingOrders, error: ordersError } = await ordersQuery;
    
    if (ordersError) {
      throw new Error(`Failed to fetch orders: ${ordersError.message}`);
    }

    console.log(`Found ${existingOrders?.length || 0} orders to resync`);

    let updatedOrders = 0;
    let updatedItems = 0;
    let differences: { orderId: string; field: string; oldValue: number; newValue: number }[] = [];

    // Process orders in batches via API
    const orderIds = existingOrders?.map(o => o.easysales_order_id) || [];
    
    for (const order of existingOrders || []) {
      // Fetch fresh data from EasySales API
      const url = `https://easy-sales.com/api/v2/orders/${order.easysales_order_id}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${websiteToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        console.error(`Failed to fetch order ${order.easysales_order_id}: ${response.status}`);
        continue;
      }

      const apiData = await response.json();
      const apiOrder = apiData.data || apiData;

      // Extract fresh values from API
      const items = apiOrder.products || [];
      const totalItems = items.reduce((sum: number, item: any) => sum + (parseInt(item.quantity) || 1), 0) || 1;
      
      const charges = apiOrder.charges || [];
      const shippingCharge = charges.find((c: any) => c.type === 'shipping');
      const discountCharge = charges.find((c: any) => c.type === 'discount');
      
      const newShippingCost = shippingCharge ? Math.abs(parseFloat(shippingCharge.price_with_tax || 0)) : 0;
      const newDiscountAmount = discountCharge ? Math.abs(parseFloat(discountCharge.price_with_tax || 0)) : 0;

      // Check for differences in order level
      let orderChanged = false;
      
      if (Math.abs(Number(order.shipping_cost) - newShippingCost) > 0.01) {
        differences.push({
          orderId: order.easysales_order_id,
          field: 'shipping_cost',
          oldValue: Number(order.shipping_cost),
          newValue: newShippingCost
        });
        orderChanged = true;
      }
      
      if (Math.abs(Number(order.discount_amount) - newDiscountAmount) > 0.01) {
        differences.push({
          orderId: order.easysales_order_id,
          field: 'discount_amount',
          oldValue: Number(order.discount_amount),
          newValue: newDiscountAmount
        });
        orderChanged = true;
      }

      if (order.total_items !== totalItems) {
        differences.push({
          orderId: order.easysales_order_id,
          field: 'total_items',
          oldValue: order.total_items,
          newValue: totalItems
        });
        orderChanged = true;
      }

      // Update order if changed
      if (orderChanged) {
        const adjustmentPerItem = (newShippingCost - newDiscountAmount) / totalItems;
        
        const { error: updateOrderError } = await supabase
          .from('orders')
          .update({
            shipping_cost: newShippingCost,
            discount_amount: newDiscountAmount,
            total_items: totalItems,
            adjustment_per_item: adjustmentPerItem,
          })
          .eq('id', order.id);

        if (updateOrderError) {
          console.error(`Failed to update order ${order.easysales_order_id}:`, updateOrderError.message);
        } else {
          updatedOrders++;
        }
      }

      // Delete existing items and re-insert with correct values
      const { error: deleteError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', order.id);

      if (deleteError) {
        console.error(`Failed to delete items for order ${order.easysales_order_id}:`, deleteError.message);
        continue;
      }

      // Re-insert items with fresh calculations
      const adjustmentPerItem = (newShippingCost - newDiscountAmount) / totalItems;
      const orderItems: any[] = [];
      
      for (const item of items) {
        const sku = item.sku || item.product_sku || '';
        const netPrice = parseFloat(item.sale_price || item.price || item.final_price || 0);
        const salePriceWithVat = Math.round(netPrice * (1 + VAT_RATE) * 100) / 100;
        const quantity = parseInt(item.quantity || 1);
        const productionCost = costMap.get(sku) || 0;

        for (let i = 0; i < quantity; i++) {
          const realRevenue = salePriceWithVat + adjustmentPerItem;
          const netProfit = realRevenue - productionCost;

          orderItems.push({
            order_id: order.id,
            sku: sku,
            product_name: item.name || item.product_name || 'Unknown Product',
            sale_price: salePriceWithVat,
            production_cost: productionCost,
            real_revenue: realRevenue,
            net_profit: netProfit,
          });
        }
      }

      if (orderItems.length > 0) {
        const { error: insertError } = await supabase.from('order_items').insert(orderItems);
        if (insertError) {
          console.error(`Failed to insert items for order ${order.easysales_order_id}:`, insertError.message);
        } else {
          updatedItems += orderItems.length;
        }
      }

      // Log progress every 50 orders
      if ((updatedOrders + 1) % 50 === 0) {
        console.log(`Progress: processed ${updatedOrders + 1} orders...`);
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`Resync complete. Updated ${updatedOrders} orders, ${updatedItems} items.`);
    console.log(`Found ${differences.length} differences:`, JSON.stringify(differences.slice(0, 20)));

    return new Response(
      JSON.stringify({ 
        success: true, 
        ordersProcessed: existingOrders?.length || 0,
        ordersUpdated: updatedOrders,
        itemsUpdated: updatedItems,
        differences: differences.slice(0, 50) // Return first 50 differences
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Resync error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
