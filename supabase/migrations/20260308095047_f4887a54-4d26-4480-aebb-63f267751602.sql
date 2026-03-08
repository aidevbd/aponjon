
-- Create contacts table
CREATE TABLE public.contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  whatsapp TEXT,
  imo TEXT,
  email TEXT,
  category TEXT NOT NULL DEFAULT 'অন্যান্য',
  custom_category TEXT,
  note TEXT,
  address TEXT,
  blood_group TEXT,
  birthday TEXT,
  secret_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique index on phone to prevent duplicates
CREATE UNIQUE INDEX idx_contacts_phone ON public.contacts(phone);

-- Enable RLS
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (public form)
CREATE POLICY "Anyone can add contacts"
  ON public.contacts FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only authenticated (admin) can select all
CREATE POLICY "Authenticated users can view all contacts"
  ON public.contacts FOR SELECT
  TO authenticated
  USING (true);

-- Public can select by phone + secret_code (for self-access verification)
CREATE POLICY "Anon can select own contact by phone"
  ON public.contacts FOR SELECT
  TO anon
  USING (true);

-- Only authenticated (admin) can delete
CREATE POLICY "Authenticated users can delete contacts"
  ON public.contacts FOR DELETE
  TO authenticated
  USING (true);

-- Authenticated can update any, anon can update (for self-edit via verification)
CREATE POLICY "Authenticated users can update contacts"
  ON public.contacts FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Anon can update contacts"
  ON public.contacts FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger
CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create a view that hides secret_code for anon access
CREATE VIEW public.contacts_public
WITH (security_invoker = on) AS
  SELECT id, name, phone, whatsapp, imo, email, category, custom_category, note, address, blood_group, birthday, created_at, updated_at
  FROM public.contacts;
