import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Starting cost recalculation...");

    // Fetch all product costs
    const { data: productCosts, error: costsError } = await supabase
      .from('product_costs')
      .select('sku, production_cost');

    if (costsError) {
      throw new Error(`Failed to fetch product costs: ${costsError.message}`);
    }

    // Create a map of SKU -> production_cost
    const costMap = new Map<string, number>();
    for (const pc of productCosts || []) {
      costMap.set(pc.sku, pc.production_cost);
    }
    console.log(`Loaded ${costMap.size} product costs`);

    // Fetch all order_items with their orders (for adjustment calculation)
    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select('id, sku, sale_price, order_id, orders(adjustment_per_item)');

    if (itemsError) {
      throw new Error(`Failed to fetch order items: ${itemsError.message}`);
    }

    console.log(`Processing ${orderItems?.length || 0} order items...`);

    let updatedCount = 0;
    let skippedCount = 0;
    const VAT_RATE = 1.21;

    // Process in batches
    const batchSize = 100;
    for (let i = 0; i < (orderItems?.length || 0); i += batchSize) {
      const batch = orderItems!.slice(i, i + batchSize);
      
      for (const item of batch) {
        const productionCost = costMap.get(item.sku) || 0;
        const adjustment = (item.orders as any)?.adjustment_per_item || 0;
        
        // Calculate real_revenue: (sale_price * VAT) + adjustment
        const realRevenue = (item.sale_price * VAT_RATE) + adjustment;
        
        // Calculate net_profit: real_revenue - production_cost
        const netProfit = realRevenue - productionCost;

        // Update the item
        const { error: updateError } = await supabase
          .from('order_items')
          .update({
            production_cost: productionCost,
            real_revenue: realRevenue,
            net_profit: netProfit
          })
          .eq('id', item.id);

        if (updateError) {
          console.error(`Error updating item ${item.id}: ${updateError.message}`);
          skippedCount++;
        } else {
          updatedCount++;
        }
      }

      console.log(`Progress: ${Math.min(i + batchSize, orderItems!.length)}/${orderItems!.length} items processed`);
    }

    console.log(`Recalculation complete. Updated: ${updatedCount}, Skipped: ${skippedCount}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        updated: updatedCount, 
        skipped: skippedCount,
        message: `Recalculated costs for ${updatedCount} items` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error:', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
