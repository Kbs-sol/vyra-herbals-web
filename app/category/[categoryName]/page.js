import Category from '@/Pages/Category';

export async function generateMetadata({ params }) {
  const { categoryName } = await params;
  return {
    title: `${decodeURIComponent(categoryName)} - Vyra Herbals`,
    description: `Browse our ${decodeURIComponent(categoryName)} collection`,
  };
}

export default async function CategoryPage({ params }) {
  return <Category />;
}
