'use client'

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-2xl font-semibold text-gray-900">
            Vision Vox
          </Link>
          
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Button variant="ghost" onClick={() => router.push('/dashboard')} className="text-gray-700 hover:text-gray-900">
                  Dashboard
                </Button>
                <Button variant="ghost" onClick={() => router.push('/editor')} className="text-gray-700 hover:text-gray-900">
                  Editor
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Avatar className="cursor-pointer border border-gray-200">
                      <AvatarImage src="" />
                      <AvatarFallback className="bg-gray-100 text-gray-800">
                        {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="border border-gray-200">
                    <DropdownMenuLabel className="text-gray-700">My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push('/profile')} className="text-gray-700 cursor-pointer">
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/settings')} className="text-gray-700 cursor-pointer">
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-gray-700 cursor-pointer">
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={() => router.push('/login')} className="text-gray-700 hover:text-gray-900">
                  Sign In
                </Button>
                <Button onClick={() => router.push('/register')} className="bg-black text-white hover:bg-gray-800">
                  Get Started
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}