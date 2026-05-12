-- Create reviews table
CREATE TABLE public.reviews (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    user_id uuid NOT NULL,
    rating integer NOT NULL,
    comment text NOT NULL DEFAULT '',
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE(product_id, user_id)
);

-- Add validation trigger for rating 1-5
CREATE OR REPLACE FUNCTION public.validate_review_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF NEW.rating < 1 OR NEW.rating > 5 THEN
        RAISE EXCEPTION 'Rating must be between 1 and 5';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER validate_review_rating_trigger
BEFORE INSERT OR UPDATE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.validate_review_rating();

-- Update timestamp trigger
CREATE TRIGGER update_reviews_updated_at
BEFORE UPDATE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Everyone can view reviews
CREATE POLICY "Reviews viewable by everyone"
ON public.reviews FOR SELECT
USING (true);

-- Authenticated users can create reviews
CREATE POLICY "Users can create reviews"
ON public.reviews FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update own reviews
CREATE POLICY "Users can update own reviews"
ON public.reviews FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Users can delete own reviews
CREATE POLICY "Users can delete own reviews"
ON public.reviews FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Function to update product rating/reviews_count
CREATE OR REPLACE FUNCTION public.update_product_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        UPDATE public.products SET
            rating = COALESCE((SELECT AVG(rating)::numeric(3,1) FROM public.reviews WHERE product_id = OLD.product_id), 0),
            reviews_count = (SELECT COUNT(*) FROM public.reviews WHERE product_id = OLD.product_id)
        WHERE id = OLD.product_id;
        RETURN OLD;
    ELSE
        UPDATE public.products SET
            rating = COALESCE((SELECT AVG(rating)::numeric(3,1) FROM public.reviews WHERE product_id = NEW.product_id), 0),
            reviews_count = (SELECT COUNT(*) FROM public.reviews WHERE product_id = NEW.product_id)
        WHERE id = NEW.product_id;
        RETURN NEW;
    END IF;
END;
$$;

CREATE TRIGGER update_product_rating_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_product_rating();