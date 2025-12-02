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

    console.log('Fetching orders from EasySales API...');

    // Fetch "Finalizate" (Completed) orders - status=3 in EasySales
    const ordersResponse = await fetch('https://easy-sales.com/api/v2/orders?per_page=100&status=3', {
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
    console.log('Orders response:', JSON.stringify(ordersData).substring(0, 1000));

    const orders = ordersData.data || [];
    let ordersProcessed = 0;

    // Get product costs for profit calculation
    const { data: productCosts } = await supabase
      .from('product_costs')
      .select('sku, production_cost');

    const costMap = new Map(productCosts?.map(p => [p.sku, p.production_cost]) || []);
    console.log(`Loaded ${costMap.size} product costs from database`);

    for (const order of orders) {
      const orderId = order.internal_id || order.id || order.order_display_id;
      
      // Log specific order for debugging
      if (String(orderId) === '25005603') {
        console.log('Order 25005603 ALL FIELDS:', JSON.stringify(order));
      }
      
      // Extract customer name from order - try multiple field names
      const customerName = order.customer_name || order.billing_name || 
        `${order.billing_first_name || ''} ${order.billing_last_name || ''}`.trim() ||
        order.shipping_name || order.buyer_name || order.contact_name ||
        (order.customer?.name) || (order.client?.name) || 'N/A';
      
      // Check if order already exists
      const { data: existingOrder } = await supabase
        .from('orders')
        .select('id, customer_name')
        .eq('easysales_order_id', String(orderId))
        .maybeSingle();

      if (existingOrder) {
        // Update customer_name if it's missing or 'N/A'
        if (!existingOrder.customer_name || existingOrder.customer_name === 'N/A') {
          await supabase
            .from('orders')
            .update({ customer_name: customerName })
            .eq('id', existingOrder.id);
          console.log(`Updated customer name for order ${orderId}: ${customerName}`);
        }
        continue;
      }

      const items = order.products || [];
      const totalItems = items.reduce((sum: number, item: any) => sum + (parseInt(item.quantity) || 1), 0) || 1;
      const shippingCost = parseFloat(order.shipping_price || order.shipping_cost || 0);
      const discountAmount = parseFloat(order.discount || order.total_discount || 0);
      
      // Per-item adjustment: (shipping - discount) / total items
      // Positive adjustment = shipping adds to cost, negative = discount reduces revenue
      const adjustmentPerItem = (shippingCost - discountAmount) / totalItems;

      console.log(`Order ${orderId}: shipping=${shippingCost}, discount=${discountAmount}, items=${totalItems}, adjustment/item=${adjustmentPerItem}`);

      // Insert order
      const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert({
          easysales_order_id: String(orderId),
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
        console.error('Error inserting order:', orderError);
        continue;
      }

      // Insert order items
      for (const item of items) {
        const sku = item.sku || item.product_sku || '';
        
        // Log item fields for debugging
        console.log(`Product ${sku} fields: price=${item.price}, sale_price=${item.sale_price}, final_price=${item.final_price}`);
        
        // Get the base price (without VAT) from EasySales
        // EasySales typically provides net prices
        const netPrice = parseFloat(item.sale_price || item.price || item.final_price || 0);
        
        // Calculate price with 21% VAT
        const salePriceWithVat = Math.round(netPrice * (1 + VAT_RATE) * 100) / 100;
        
        const quantity = parseInt(item.quantity || 1);
        const productionCost = costMap.get(sku) || 0;
        
        console.log(`Product ${sku}: net=${netPrice}, withVAT=${salePriceWithVat}, prodCost=${productionCost}`);

        for (let i = 0; i < quantity; i++) {
          // Real revenue = sale price with VAT + shipping share - discount share
          // Using the adjustment: positive means shipping adds revenue, discount subtracts
          const realRevenue = salePriceWithVat + adjustmentPerItem;
          const netProfit = realRevenue - productionCost;

          await supabase.from('order_items').insert({
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

      ordersProcessed++;
      console.log(`Processed order ${orderId}`);
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
