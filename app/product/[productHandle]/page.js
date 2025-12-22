import Singleproducts from '@/Pages/Singleproducts';

export async function generateMetadata({ params }) {
  const { productHandle } = await params;
  return {
    title: `${decodeURIComponent(productHandle)} - Vyra Herbals`,
    description: `View details for ${decodeURIComponent(productHandle)}`,
  };
}

export default async function ProductPage({ params }) {
  return <Singleproducts />;
}
