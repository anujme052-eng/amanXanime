DROP POLICY IF EXISTS "Anyone can update videos" ON public.videos;
DROP POLICY IF EXISTS "Anyone can delete videos" ON public.videos;
DROP POLICY IF EXISTS "Anyone can update video files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete video files" ON storage.objects;