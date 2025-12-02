import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientId = Deno.env.get('EASYSALES_CLIENT_ID');
    const clientSecret = Deno.env.get('EASYSALES_CLIENT_SECRET');
    const websiteToken = Deno.env.get('EASYSALES_WEBSITE_TOKEN');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!clientId || !clientSecret || !websiteToken) {
      throw new Error('Missing EasySales credentials');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Fetching orders from EasySales API...');

    // Fetch orders from EasySales API
    const ordersResponse = await fetch('https://app.easysales.ro/api/orders', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${websiteToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    if (!ordersResponse.ok) {
      const errorText = await ordersResponse.text();
      console.error('EasySales API error:', errorText);
      throw new Error(`EasySales API error: ${ordersResponse.status}`);
    }

    const ordersData = await ordersResponse.json();
    console.log('Orders fetched:', ordersData);

    const orders = ordersData.data || ordersData || [];
    let ordersProcessed = 0;

    // Get product costs for profit calculation
    const { data: productCosts } = await supabase
      .from('product_costs')
      .select('sku, production_cost');

    const costMap = new Map(productCosts?.map(p => [p.sku, p.production_cost]) || []);

    for (const order of orders) {
      // Check if order already exists
      const { data: existingOrder } = await supabase
        .from('orders')
        .select('id')
        .eq('easysales_order_id', String(order.id))
        .single();

      if (existingOrder) {
        console.log(`Order ${order.id} already exists, skipping`);
        continue;
      }

      const items = order.products || order.items || [];
      const totalItems = items.length || 1;
      const shippingCost = parseFloat(order.shipping_price || order.shipping_cost || 0);
      const discountAmount = parseFloat(order.discount || order.discount_amount || 0);
      const adjustmentPerItem = (shippingCost + discountAmount) / totalItems;

      // Insert order
      const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert({
          easysales_order_id: String(order.id),
          order_date: order.created_at || order.date || new Date().toISOString(),
          shipping_cost: shippingCost,
          discount_amount: discountAmount,
          total_items: totalItems,
          adjustment_per_item: adjustmentPerItem,
          status: order.status || 'processed',
        })
        .select()
        .single();

      if (orderError) {
        console.error('Error inserting order:', orderError);
        continue;
      }

      // Insert order items
      for (const item of items) {
        const sku = item.sku || item.product_sku || '';
        const salePrice = parseFloat(item.price || item.sale_price || 0);
        const quantity = parseInt(item.quantity || 1);
        const productionCost = costMap.get(sku) || 0;

        for (let i = 0; i < quantity; i++) {
          const realRevenue = salePrice - adjustmentPerItem;
          const netProfit = realRevenue - productionCost;

          await supabase.from('order_items').insert({
            order_id: newOrder.id,
            sku: sku,
            product_name: item.name || item.product_name || 'Unknown Product',
            sale_price: salePrice,
            production_cost: productionCost,
            real_revenue: realRevenue,
            net_profit: netProfit,
          });
        }
      }

      ordersProcessed++;
    }

    console.log(`Sync complete. ${ordersProcessed} orders processed.`);

    return new Response(
      JSON.stringify({ success: true, ordersProcessed }),
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
