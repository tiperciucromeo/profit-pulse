-- Add unique constraint on SKU for product_costs table to enable upsert
ALTER TABLE public.product_costs 
ADD CONSTRAINT product_costs_sku_unique UNIQUE (sku);