
CREATE TABLE public.sold_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  product_price INTEGER NOT NULL,
  product_image TEXT DEFAULT '',
  quantity INTEGER NOT NULL DEFAULT 1,
  total INTEGER NOT NULL DEFAULT 0,
  sold_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sold_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage sold items"
ON public.sold_items
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Sold items viewable by admins"
ON public.sold_items
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Add a column to orders to track if moved to sold
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS moved_to_sold BOOLEAN NOT NULL DEFAULT false;
