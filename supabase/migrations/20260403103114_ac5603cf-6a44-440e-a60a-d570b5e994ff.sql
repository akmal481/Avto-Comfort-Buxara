
ALTER TABLE public.products ADD COLUMN qr_code TEXT UNIQUE;
CREATE INDEX idx_products_qr_code ON public.products (qr_code);
