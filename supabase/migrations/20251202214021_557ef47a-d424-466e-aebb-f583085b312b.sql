-- Create table for monthly expenses
CREATE TABLE public.monthly_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  month TEXT NOT NULL, -- Format: "2025-10"
  fan_curier NUMERIC NOT NULL DEFAULT 0,
  sameday NUMERIC NOT NULL DEFAULT 0,
  easysale NUMERIC NOT NULL DEFAULT 0,
  the_marketer NUMERIC NOT NULL DEFAULT 0,
  netopia NUMERIC NOT NULL DEFAULT 0,
  google_ads NUMERIC NOT NULL DEFAULT 0,
  facebook_ads NUMERIC NOT NULL DEFAULT 0,
  employee_costs NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(month)
);

-- Enable RLS
ALTER TABLE public.monthly_expenses ENABLE ROW LEVEL SECURITY;

-- Allow public read/insert/update (no auth in this app)
CREATE POLICY "Allow public read on monthly_expenses" 
ON public.monthly_expenses FOR SELECT USING (true);

CREATE POLICY "Allow public insert on monthly_expenses" 
ON public.monthly_expenses FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on monthly_expenses" 
ON public.monthly_expenses FOR UPDATE USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_monthly_expenses_updated_at
BEFORE UPDATE ON public.monthly_expenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();