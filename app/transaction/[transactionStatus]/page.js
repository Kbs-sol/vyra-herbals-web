import Transaction from '@/Pages/Transaction';

export async function generateMetadata({ params }) {
  const { transactionStatus } = await params;
  return {
    title: `Transaction ${transactionStatus} - Vyra Herbals`,
    description: `Transaction status: ${transactionStatus}`,
  };
}

export default async function TransactionPage({ params }) {
  return <Transaction />;
}
