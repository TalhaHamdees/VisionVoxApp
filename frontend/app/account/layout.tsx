import { DashboardLayout } from '@/components/shared/dashboard-layout';

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
} 