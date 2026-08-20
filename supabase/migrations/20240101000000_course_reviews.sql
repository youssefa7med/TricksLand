-- =============================================
-- Course Reviews: Table + RLS + RPCs
-- Run this in Supabase Dashboard > SQL Editor
-- =============================================

-- 1. Create the table
CREATE TABLE IF NOT EXISTS public.course_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title TEXT NOT NULL,
    review_text TEXT,
    responses JSONB DEFAULT '{}'::jsonb,
    reviewer_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.course_reviews ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Anyone can read reviews (public display)
CREATE POLICY "course_reviews_select_public"
    ON public.course_reviews
    FOR SELECT
    USING (true);

-- Authenticated users can insert reviews
CREATE POLICY "course_reviews_insert_authenticated"
    ON public.course_reviews
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Admins can update/delete any review
CREATE POLICY "course_reviews_update_admin"
    ON public.course_reviews
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

CREATE POLICY "course_reviews_delete_admin"
    ON public.course_reviews
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_course_reviews_course_id ON public.course_reviews(course_id);
CREATE INDEX IF NOT EXISTS idx_course_reviews_coach_id ON public.course_reviews(coach_id);
CREATE INDEX IF NOT EXISTS idx_course_reviews_created_at ON public.course_reviews(created_at DESC);

-- 5. RPC: Get form options (courses + coaches for dropdowns)
CREATE OR REPLACE FUNCTION public.get_course_review_form_options()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'courses', (
            SELECT json_agg(json_build_object('id', c.id, 'name', c.name) ORDER BY c.name)
            FROM public.courses c
            WHERE c.status = 'active'
        ),
        'coaches', (
            SELECT json_agg(json_build_object('id', p.id, 'full_name', p.full_name) ORDER BY p.full_name)
            FROM public.profiles p
            WHERE p.role = 'coach'
        )
    ) INTO result;

    RETURN result;
END;
$$;

-- 6. RPC: Submit a review
CREATE OR REPLACE FUNCTION public.submit_course_review(
    p_course_id UUID,
    p_coach_id UUID,
    p_rating INTEGER,
    p_title TEXT,
    p_review_text TEXT DEFAULT NULL,
    p_responses JSONB DEFAULT '{}'::jsonb,
    p_reviewer_name TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_review RECORD;
BEGIN
    -- Validate rating
    IF p_rating < 1 OR p_rating > 5 THEN
        RETURN json_build_object('error', 'Rating must be between 1 and 5');
    END IF;

    -- Validate course exists
    IF NOT EXISTS (SELECT 1 FROM public.courses WHERE id = p_course_id) THEN
        RETURN json_build_object('error', 'Course not found');
    END IF;

    -- Validate coach exists
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_coach_id AND role = 'coach') THEN
        RETURN json_build_object('error', 'Coach not found');
    END IF;

    -- Insert review
    INSERT INTO public.course_reviews (
        course_id, coach_id, rating, title, review_text, responses, reviewer_name
    ) VALUES (
        p_course_id, p_coach_id, p_rating, p_title, p_review_text, p_responses, p_reviewer_name
    )
    RETURNING * INTO new_review;

    RETURN json_build_object(
        'success', true,
        'review', json_build_object(
            'id', new_review.id,
            'rating', new_review.rating,
            'title', new_review.title,
            'created_at', new_review.created_at
        )
    );
END;
$$;
