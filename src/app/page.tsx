import Benefits from "@/components/blocks/Benefits";
import Reviews from "@/components/blocks/Reviews";
import RecentlyViewed from "@/components/blocks/RecentlyViewed";
import TopProducts from "@/components/blocks/TopProducts";
import Categories from "@/components/layout/Categories";
import HeroSlider from "@/components/layout/Slider";
import { getCategoryImages, getSliderImages, getTopProducts } from "@/lib";

// Головна — статична з регенерацією раз на годину (ISR).
export const revalidate = 3600;

export default async function Home() {
	const [topProducts, sliderImages, categoryImages] = await Promise.all([
		getTopProducts(),
		getSliderImages(),
		getCategoryImages(),
	]);

	return (
		<div>
			<HeroSlider images={sliderImages} />
			<TopProducts products={topProducts} />
			<Categories images={categoryImages} />
			<Reviews />
			<RecentlyViewed />
			<Benefits />
		</div>
	);
}
