-- Parent feedback for a coach's assigned course.
-- The public form uses the two RPCs below; it never receives direct table access.

CREATE TABLE IF NOT EXISTS public.course_reviews (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE RESTRICT,
    coach_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title text NOT NULL,
    review_text text,
    responses jsonb NOT NULL DEFAULT '{}'::jsonb,
    reviewer_name text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_course_reviews_course_created ON public.course_reviews (course_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_course_reviews_coach_created ON public.course_reviews (coach_id, created_at DESC);

ALTER TABLE public.course_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage course reviews"
    ON public.course_reviews FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "Coaches can view their own course reviews"
    ON public.course_reviews FOR SELECT
    USING (coach_id = auth.uid());

CREATE OR REPLACE FUNCTION public.get_course_review_form_options()
RETURNS TABLE (course_id uuid, course_name text, coach_id uuid, coach_name text)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
    SELECT c.id, c.name, p.id, p.full_name
    FROM public.courses c
    JOIN public.course_coaches cc ON cc.course_id = c.id
    JOIN public.profiles p ON p.id = cc.coach_id
    WHERE c.status = 'active' AND p.role = 'coach'
    ORDER BY c.name, p.full_name;
$$;

CREATE OR REPLACE FUNCTION public.submit_course_review(
    p_course_id uuid, p_coach_id uuid, p_rating smallint, p_title text,
    p_review_text text, p_responses jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_review_id uuid;
BEGIN
    IF p_rating NOT BETWEEN 1 AND 5 THEN RAISE EXCEPTION 'Rating must be between 1 and 5.'; END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.courses c JOIN public.course_coaches cc ON cc.course_id = c.id
        WHERE c.id = p_course_id AND c.status = 'active' AND cc.coach_id = p_coach_id
    ) THEN RAISE EXCEPTION 'Choose an active course and one of its assigned coaches.'; END IF;
    INSERT INTO public.course_reviews (course_id, coach_id, rating, title, review_text, responses)
    VALUES (p_course_id, p_coach_id, p_rating, left(trim(p_title), 160), nullif(trim(p_review_text), ''), p_responses)
    RETURNING id INTO v_review_id;
    RETURN v_review_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_course_review_form_options() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_course_review(uuid, uuid, smallint, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_course_review_form_options() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_course_review(uuid, uuid, smallint, text, text, jsonb) TO anon, authenticated;
