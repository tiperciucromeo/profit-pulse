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

    console.log('Fetching existing orders and product costs...');

    // Get all existing order IDs upfront to skip them quickly
    const { data: existingOrders } = await supabase
      .from('orders')
      .select('easysales_order_id');
    
    const existingOrderIds = new Set(existingOrders?.map(o => o.easysales_order_id) || []);
    console.log(`Found ${existingOrderIds.size} existing orders in database`);

    // Get product costs for profit calculation
    const { data: productCosts } = await supabase
      .from('product_costs')
      .select('sku, production_cost');

    const costMap = new Map(productCosts?.map(p => [p.sku, p.production_cost]) || []);
    console.log(`Loaded ${costMap.size} product costs from database`);

    const startDate = '2025-08-01';
    let currentPage = 1;
    let hasMorePages = true;
    let totalOrdersProcessed = 0;
    let totalOrdersSkipped = 0;
    
    // Process page by page instead of fetching all first
    while (hasMorePages) {
      const url = `https://easy-sales.com/api/v2/orders?per_page=50&status=3&page=${currentPage}&date_from=${startDate}`;
      console.log(`Fetching page ${currentPage}...`);
      
      const ordersResponse = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${websiteToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      if (!ordersResponse.ok) {
        const errorText = await ordersResponse.text();
        console.error('EasySales API error:', ordersResponse.status, errorText);
        throw new Error(`EasySales API error: ${ordersResponse.status} - ${errorText}`);
      }

      const ordersData = await ordersResponse.json();
      const pageOrders = ordersData.data || [];
      
      console.log(`Page ${currentPage}: got ${pageOrders.length} orders`);
      
      // Process this page immediately
      for (const order of pageOrders) {
        const orderId = String(order.internal_id || order.id || order.order_display_id);
        
        // Quick skip if already exists
        if (existingOrderIds.has(orderId)) {
          totalOrdersSkipped++;
          continue;
        }

        const customerName = order.customer_name || order.billing_name || 
          `${order.billing_first_name || ''} ${order.billing_last_name || ''}`.trim() ||
          order.shipping_name || order.buyer_name || order.contact_name ||
          (order.customer?.name) || (order.client?.name) || 'N/A';

        const items = order.products || [];
        const totalItems = items.reduce((sum: number, item: any) => sum + (parseInt(item.quantity) || 1), 0) || 1;
        
        const charges = order.charges || [];
        const shippingCharge = charges.find((c: any) => c.type === 'shipping');
        const discountCharge = charges.find((c: any) => c.type === 'discount');
        
        const shippingCost = shippingCharge ? Math.abs(parseFloat(shippingCharge.price_with_tax || 0)) : 0;
        const discountAmount = discountCharge ? Math.abs(parseFloat(discountCharge.price_with_tax || 0)) : 0;
        
        const shippingPerItem = shippingCost / totalItems;
        const discountPerItem = discountAmount / totalItems;
        const adjustmentPerItem = shippingPerItem - discountPerItem;

        // Insert order
        const { data: newOrder, error: orderError } = await supabase
          .from('orders')
          .insert({
            easysales_order_id: orderId,
            order_date: order.order_date || order.created_at || new Date().toISOString(),
            shipping_cost: shippingCost,
            discount_amount: discountAmount,
            total_items: totalItems,
            adjustment_per_item: adjustmentPerItem,
            status: 'processed',
            customer_name: customerName,
          })
          .select()
          .single();

        if (orderError) {
          console.error(`Error inserting order ${orderId}:`, orderError.message);
          continue;
        }

        // Batch insert order items
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
              order_id: newOrder.id,
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
          const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
          if (itemsError) {
            console.error(`Error inserting items for order ${orderId}:`, itemsError.message);
          }
        }

        existingOrderIds.add(orderId);
        totalOrdersProcessed++;
        
        if (totalOrdersProcessed % 10 === 0) {
          console.log(`Progress: ${totalOrdersProcessed} orders processed, ${totalOrdersSkipped} skipped`);
        }
      }
      
      // Check if there are more pages
      if (pageOrders.length < 50) {
        hasMorePages = false;
      } else {
        currentPage++;
      }
      
      // Safety limit
      if (currentPage > 100) {
        console.log('Reached page limit (100), stopping');
        hasMorePages = false;
      }
    }

    console.log(`Sync complete. ${totalOrdersProcessed} new orders processed, ${totalOrdersSkipped} existing orders skipped.`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        ordersProcessed: totalOrdersProcessed,
        ordersSkipped: totalOrdersSkipped 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Sync error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
