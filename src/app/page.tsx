import Benefits from "@/components/blocks/Benefits";
import Reviews from "@/components/blocks/Reviews";
import TopProducts from "@/components/blocks/TopProducts";
import Categories from "@/components/layout/Categories";
import HeroSlider from "@/components/layout/Slider";
import { getTopProducts } from "@/lib";

export default async function Home() {
	const topProducts = await getTopProducts();

	return (
		<div>
			<HeroSlider />
			<TopProducts products={topProducts} />
			<Categories />
			<div className="px-8 md:px-12">
				<Reviews />
			</div>
			<Benefits />
		</div>
	);
}
