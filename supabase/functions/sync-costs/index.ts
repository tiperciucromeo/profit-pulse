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
    const { sheetUrl } = await req.json();
    
    if (!sheetUrl) {
      throw new Error('Missing Google Sheet URL');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Fetching costs from Google Sheets:', sheetUrl);

    // Convert Google Sheets URL to CSV export URL
    let csvUrl = sheetUrl;
    if (sheetUrl.includes('/edit')) {
      // Convert edit URL to CSV export URL
      csvUrl = sheetUrl.replace('/edit#gid=', '/export?format=csv&gid=').replace('/edit?gid=', '/export?format=csv&gid=').replace('/edit', '/export?format=csv');
    } else if (sheetUrl.includes('spreadsheets/d/')) {
      // Extract sheet ID and create CSV URL
      const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match) {
        csvUrl = `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`;
      }
    }

    console.log('CSV URL:', csvUrl);

    const response = await fetch(csvUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch Google Sheet: ${response.status}`);
    }

    const csvText = await response.text();
    console.log('CSV content (first 500 chars):', csvText.substring(0, 500));

    // Parse CSV
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('Google Sheet appears to be empty or has no data rows');
    }

    // Get headers and find column indices
    const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
    console.log('Headers found:', headers);

    const skuIndex = headers.findIndex(h => h.includes('sku') || h.includes('cod'));
    const nameIndex = headers.findIndex(h => h.includes('nume') || h.includes('name') || h.includes('produs'));
    const costIndex = headers.findIndex(h => h.includes('cost') || h.includes('pret') || h.includes('price'));

    console.log(`Column indices - SKU: ${skuIndex}, Name: ${nameIndex}, Cost: ${costIndex}`);

    if (skuIndex === -1 || costIndex === -1) {
      throw new Error(`Could not find required columns. Headers found: ${headers.join(', ')}. Need columns containing: sku/cod, cost/pret`);
    }

    let productsUpdated = 0;
    let productsInserted = 0;

    // Process data rows
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const sku = values[skuIndex]?.trim();
      const productName = nameIndex >= 0 ? values[nameIndex]?.trim() : 'Unknown';
      const costStr = values[costIndex]?.trim().replace(',', '.');
      const productionCost = parseFloat(costStr) || 0;

      if (!sku || productionCost === 0) {
        console.log(`Skipping row ${i}: SKU=${sku}, cost=${costStr}`);
        continue;
      }

      console.log(`Processing: SKU=${sku}, Name=${productName}, Cost=${productionCost}`);

      // Upsert product cost
      const { data: existing } = await supabase
        .from('product_costs')
        .select('id')
        .eq('sku', sku)
        .single();

      if (existing) {
        await supabase
          .from('product_costs')
          .update({ production_cost: productionCost, product_name: productName })
          .eq('sku', sku);
        productsUpdated++;
      } else {
        await supabase
          .from('product_costs')
          .insert({ sku, product_name: productName, production_cost: productionCost });
        productsInserted++;
      }
    }

    console.log(`Sync complete. Inserted: ${productsInserted}, Updated: ${productsUpdated}`);

    return new Response(
      JSON.stringify({ success: true, productsInserted, productsUpdated }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Sync costs error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Parse a CSV line handling quoted values
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if ((char === ',' || char === ';') && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  
  return result;
}
