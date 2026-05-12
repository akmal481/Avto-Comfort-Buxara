
-- Fix: orders insert should set user_id if authenticated, allow anonymous orders too
DROP POLICY "Anyone can create orders" ON public.orders;
CREATE POLICY "Anyone can create orders" ON public.orders 
FOR INSERT WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- Fix: order items insert - only allow if the order belongs to the user
DROP POLICY "Anyone can create order items" ON public.order_items;
CREATE POLICY "Anyone can create order items" ON public.order_items 
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.orders o 
        WHERE o.id = order_id AND (o.user_id IS NULL OR o.user_id = auth.uid())
    )
);
