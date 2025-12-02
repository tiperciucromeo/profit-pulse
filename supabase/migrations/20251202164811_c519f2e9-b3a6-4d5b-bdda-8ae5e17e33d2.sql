-- Tabel pentru costurile de producție (sincronizat din Google Sheets)
CREATE TABLE public.product_costs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE,
  product_name TEXT NOT NULL,
  production_cost DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabel pentru comenzile procesate din EasySales
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  easysales_order_id TEXT NOT NULL UNIQUE,
  order_date TIMESTAMP WITH TIME ZONE NOT NULL,
  shipping_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_items INTEGER NOT NULL DEFAULT 1,
  adjustment_per_item DECIMAL(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'processed',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabel pentru produsele din comenzi cu calculul de profit
CREATE TABLE public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  product_name TEXT NOT NULL,
  sale_price DECIMAL(10,2) NOT NULL,
  production_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  real_revenue DECIMAL(10,2) NOT NULL DEFAULT 0,
  net_profit DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes pentru performanță
CREATE INDEX idx_orders_date ON public.orders(order_date);
CREATE INDEX idx_order_items_sku ON public.order_items(sku);
CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX idx_product_costs_sku ON public.product_costs(sku);

-- Enable RLS (public read pentru dashboard simplu, fără auth necesară)
ALTER TABLE public.product_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Politici publice pentru acces (dashboard intern, fără user auth)
CREATE POLICY "Allow public read on product_costs" ON public.product_costs FOR SELECT USING (true);
CREATE POLICY "Allow public insert on product_costs" ON public.product_costs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on product_costs" ON public.product_costs FOR UPDATE USING (true);

CREATE POLICY "Allow public read on orders" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Allow public insert on orders" ON public.orders FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read on order_items" ON public.order_items FOR SELECT USING (true);
CREATE POLICY "Allow public insert on order_items" ON public.order_items FOR INSERT WITH CHECK (true);

-- Funcție pentru updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pentru product_costs
CREATE TRIGGER update_product_costs_updated_at
  BEFORE UPDATE ON public.product_costs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime pentru dashboard live
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;