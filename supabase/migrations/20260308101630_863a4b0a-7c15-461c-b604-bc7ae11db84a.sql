-- Add photo_url column to contacts
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS photo_url text;

-- Create storage bucket for contact photos
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('contact-photos', 'contact-photos', true, 2097152)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to upload photos
CREATE POLICY "Anyone can upload contact photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'contact-photos');

-- Allow public read access
CREATE POLICY "Public read access for contact photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'contact-photos');

-- Allow authenticated users to delete contact photos
CREATE POLICY "Authenticated can delete contact photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'contact-photos');
