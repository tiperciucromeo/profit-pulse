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

    console.log("Starting cost recalculation (restoring VAT)...");

    // Fetch ALL product costs with pagination
    const costMap = new Map<string, number>();
    let offset = 0;
    const pageSize = 1000;
    
    while (true) {
      const { data: productCosts, error: costsError } = await supabase
        .from('product_costs')
        .select('sku, production_cost')
        .range(offset, offset + pageSize - 1);

      if (costsError) {
        throw new Error(`Failed to fetch product costs: ${costsError.message}`);
      }

      if (!productCosts || productCosts.length === 0) {
        break;
      }

      for (const pc of productCosts) {
        costMap.set(pc.sku, pc.production_cost);
      }

      console.log(`Loaded ${costMap.size} product costs so far...`);
      
      if (productCosts.length < pageSize) {
        break;
      }
      
      offset += pageSize;
    }
    
    console.log(`Total loaded: ${costMap.size} product costs`);

    // EasySales API returns NET prices (without VAT)
    // We need to add 21% VAT to match EasySales UI which shows WITH VAT
    const VAT_RATE = 1.21;
    let updatedCount = 0;
    let skippedCount = 0;
    let itemOffset = 0;
    
    while (true) {
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('id, sku, sale_price, order_id, orders(adjustment_per_item)')
        .range(itemOffset, itemOffset + pageSize - 1);

      if (itemsError) {
        throw new Error(`Failed to fetch order items: ${itemsError.message}`);
      }

      if (!orderItems || orderItems.length === 0) {
        break;
      }

      console.log(`Processing batch at offset ${itemOffset}, ${orderItems.length} items...`);

      for (const item of orderItems) {
        const productionCost = costMap.get(item.sku) || 0;
        const adjustment = (item.orders as any)?.adjustment_per_item || 0;
        
        // Restore VAT: multiply current sale_price by 1.21
        // (undoing the previous incorrect division)
        const salePriceWithVat = Math.round(item.sale_price * VAT_RATE * 100) / 100;
        
        // real_revenue = sale price with VAT + adjustment
        const realRevenue = Math.round((salePriceWithVat + adjustment) * 100) / 100;
        
        // net_profit = real_revenue - production_cost
        const netProfit = Math.round((realRevenue - productionCost) * 100) / 100;

        // Update the item
        const { error: updateError } = await supabase
          .from('order_items')
          .update({
            sale_price: salePriceWithVat,
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

      console.log(`Progress: ${updatedCount + skippedCount} items processed`);
      
      if (orderItems.length < pageSize) {
        break;
      }
      
      itemOffset += pageSize;
    }

    console.log(`Recalculation complete. Updated: ${updatedCount}, Skipped: ${skippedCount}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        updated: updatedCount, 
        skipped: skippedCount,
        totalCosts: costMap.size,
        message: `Restored VAT and recalculated costs for ${updatedCount} items` 
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
