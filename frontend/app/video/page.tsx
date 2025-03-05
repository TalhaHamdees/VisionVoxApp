import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardLayout } from '@/components/shared/dashboard-layout';

export default function VideoPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Set page title
  useEffect(() => {
    const pageTitleEvent = new CustomEvent('updatePageTitle', {
      detail: {
        badge: 'Video',
        title: 'Video Generator',
        description: 'Create videos from your scripts and audio'
      }
    });
    window.dispatchEvent(pageTitleEvent);
  }, []);

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-4">
        <Tabs defaultValue="generate" className="space-y-6">
          <TabsList>
            <TabsTrigger value="generate">Generate Video</TabsTrigger>
            <TabsTrigger value="enhance">Enhance Video</TabsTrigger>
          </TabsList>
          
          {/* Rest of the content remains the same */}
          {/* ... existing code ... */}
        </Tabs>
      </div>
    </DashboardLayout>
  );
} 