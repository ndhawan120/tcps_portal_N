-- Store the employee-maintained PER objective reference on the profile.
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS per_objective_number text;
