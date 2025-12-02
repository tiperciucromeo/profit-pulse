import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BATCH_SIZE = 500;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sheetUrl, csvData } = await req.json();
    
    if (!sheetUrl && !csvData) {
      throw new Error('Missing Google Sheet URL or CSV data');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let csvText: string;

    if (csvData) {
      // Direct CSV data provided
      csvText = csvData;
      console.log('Using provided CSV data');
    } else {
      // Fetch from Google Sheets
      console.log('Fetching costs from Google Sheets:', sheetUrl);

      let csvUrl = sheetUrl;
      if (sheetUrl.includes('/edit')) {
        csvUrl = sheetUrl.replace('/edit#gid=', '/export?format=csv&gid=').replace('/edit?gid=', '/export?format=csv&gid=').replace('/edit', '/export?format=csv');
      } else if (sheetUrl.includes('spreadsheets/d/')) {
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

      csvText = await response.text();
    }

    console.log('CSV content (first 500 chars):', csvText.substring(0, 500));

    // Parse CSV
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('CSV appears to be empty or has no data rows');
    }

    // Get headers and find column indices
    const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
    console.log('Headers found:', headers);

    const skuIndex = headers.findIndex(h => 
      h.includes('cod produs') || h.includes('cod') || h.includes('sku')
    );
    
    let nameIndex = headers.findIndex(h => 
      h.includes('nume') || h.includes('name') || h.includes('denumire')
    );
    if (nameIndex === -1) nameIndex = 0;
    
    const costIndex = headers.findIndex(h => 
      h.includes('pret productie') || h.includes('cost productie') || h.includes('cost prod') ||
      h.includes('production') || (h.includes('cost') && !h.includes('reducere'))
    );

    console.log(`Column indices - SKU: ${skuIndex}, Name: ${nameIndex}, Cost: ${costIndex}`);

    if (skuIndex === -1 || costIndex === -1) {
      throw new Error(`Nu am găsit coloanele necesare. Coloane găsite: ${headers.join(', ')}. Am nevoie de: "SKU" și "Cost Producție"`);
    }

    // Collect all products to upsert
    const products: { sku: string; product_name: string; production_cost: number }[] = [];
    let skippedRows = 0;

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const sku = values[skuIndex]?.trim();
      const productName = nameIndex >= 0 ? values[nameIndex]?.trim() : 'Unknown';
      const costStr = values[costIndex]?.trim().replace(',', '.');
      const productionCost = parseFloat(costStr);

      if (!sku || isNaN(productionCost) || productionCost === 0) {
        skippedRows++;
        continue;
      }

      products.push({ sku, product_name: productName, production_cost: productionCost });
    }

    console.log(`Found ${products.length} valid products, skipped ${skippedRows} invalid rows`);

    // Batch upsert
    let totalUpserted = 0;
    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      const batch = products.slice(i, i + BATCH_SIZE);
      
      const { error } = await supabase
        .from('product_costs')
        .upsert(batch, { onConflict: 'sku', ignoreDuplicates: false });

      if (error) {
        console.error(`Batch upsert error at ${i}:`, error);
        throw error;
      }

      totalUpserted += batch.length;
      console.log(`Upserted batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} products (total: ${totalUpserted})`);
    }

    console.log(`Sync complete. Total upserted: ${totalUpserted}`);

    return new Response(
      JSON.stringify({ success: true, totalUpserted, skippedRows }),
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
