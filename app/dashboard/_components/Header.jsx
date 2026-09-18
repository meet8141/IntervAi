"use client"
import UserButton from '@/components/UserButton'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useEffect } from 'react'
import { LayoutDashboard, MessageSquare, Crown, Leaf,House } from 'lucide-react'
import Home from '@/app/page'

function Header() {
    const path = usePathname();
    
    useEffect(() => {
        console.log(path)
    }, [])

    const navItems = [
        { href: "/", label: "Home", icon: House },
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
   
    ];

    return (
        <header className='sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b-2 border-[#e5d5c8]/50 shadow-soft transition-all duration-300'>
            <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
                <div className='flex items-center justify-between h-20 md:h-24'>
                    {/* Logo */}
                    <Link href="/" className='flex items-center space-x-3 hover:opacity-80 transition-all duration-300 hover:scale-105'>
                        <div className='w-12 h-12 bg-gradient-to-br from-[#2d5f5f] to-[#4a6b5b] rounded-[40%_60%_50%_50%/60%_40%_60%_40%] flex items-center justify-center shadow-soft hover:shadow-md transition-shadow'>
                            <img src="/logo.svg" alt="logo" />
                        </div>
                        <span className='hidden sm:block text-2xl  font-display font-bold text-[#1a4d4d]'>
                            IntervAi
                        </span>
                    </Link>

                    {/* Navigation */}
                    

                    {/* User Button */}
                    <div className='flex items-center space-x-4'>
                        <nav className='hidden   md:flex justify-start items-center mar space-x-1'>
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = path === item.href;
                            return (
                                <Link 
                                    key={item.href}
                                    href={item.href}
                                    className={`
                                        flex items-center space-x-2 px-4 py-2 rounded-[20px] font-medium transition-all duration-300
                                        ${isActive 
                                            ? 'bg-[#2d5f5f] text-white shadow-soft' 
                                            : 'text-[#4b5563] hover:text-[#2d5f5f] hover:bg-[#f5ebe0]'
                                        }
                                    `}
                                >
                                    <Icon className='w-4 h-4' />
                                    <span>{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>
                        <UserButton />
                    </div>
                </div>
            </div>
        </header>
    )
}

export default Header