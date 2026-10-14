import Home from '@/Pages/Home';
import JsonLd from '@/Components/Shared/JsonLd';
import { getHeroVideo, heroVideoJsonLd } from '@/utils/heroVideo';

// The homepage used to be a pure client component, which meant no structured
// data in the server HTML. Now a thin server wrapper emits the hero video's
// VideoObject JSON-LD (visible to Google's first-pass crawl) and renders the
// unchanged client <Home />. Re-generated every 5 minutes so an admin change in
// /admin/media shows up quickly.
export const revalidate = 300;

export default async function HomePage() {
  const video = await getHeroVideo();
  return (
    <>
      {video ? <JsonLd data={heroVideoJsonLd(video)} /> : null}
      <Home />
    </>
  );
}
