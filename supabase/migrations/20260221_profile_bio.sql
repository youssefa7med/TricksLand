-- Add bio field to profiles for coach profile pages
ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS bio TEXT;

COMMENT ON COLUMN profiles.bio IS 'Coach brief bio/description shown on their profile page.';
