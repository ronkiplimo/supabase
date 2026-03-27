-- Fix function body to reference listing_reviews instead of item_reviews
-- Keep the parameter name as target_item_id for backward compatibility with existing policies
CREATE OR REPLACE FUNCTION public.listing_latest_review_is_approved(target_item_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT lr.status = 'approved'
      FROM public.listing_reviews lr
      WHERE lr.listing_id = target_item_id
      ORDER BY COALESCE(lr.reviewed_at, lr.updated_at, lr.created_at) DESC
      LIMIT 1
    ),
    false
  );
$$;
