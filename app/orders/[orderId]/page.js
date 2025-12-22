import Orders from '@/Pages/Orders';

export async function generateMetadata({ params }) {
  const { orderId } = await params;
  return {
    title: `Order ${orderId} - Vyra Herbals`,
    description: `Order details for ${orderId}`,
  };
}

export default async function OrderPage({ params }) {
  return <Orders />;
}
