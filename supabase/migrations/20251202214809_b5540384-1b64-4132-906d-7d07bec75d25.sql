-- Add other expenses column
ALTER TABLE public.monthly_expenses 
ADD COLUMN alte_cheltuieli NUMERIC NOT NULL DEFAULT 0;