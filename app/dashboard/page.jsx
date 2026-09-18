"use client";
import AddNewInterview from './_components/AddNewInterview';
import BasicNonTechincal from './_components/BasicNonTechincal';
import Dressing from './_components/dressing';
import React from 'react'
import InterviewList from './_components/InterviewList';
import { Leaf,LayoutDashboard } from 'lucide-react';

function Dashboard() {
  return (
    <div className='min-h-screen bg-gradient-to-b from-[#faf6f1] via-[#f5ebe0] to-white relative'>
      {/* Decorative blur elements */}
      <div className='absolute top-20 right-10 w-72 h-72 bg-[#c5d5d0] rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float' />
      <div className='absolute bottom-20 left-10 w-96 h-96 bg-[#f4cdb8] rounded-full mix-blend-multiply filter blur-3xl opacity-20' style={{animationDelay: '2s'}} />
      
      <div className='relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16'>
        {/* Header Section */}
        <div className='mb-16'>
          <div className='bg-white/60 backdrop-blur-xl rounded-[40px] p-8 shadow-soft border-2 border-[#e5d5c8]/50'>
            <div className='flex items-center space-x-4'>
              <div className='w-16 h-16 bg-gradient-to-br from-[#2d5f5f] to-[#4a6b5b] rounded-[40%_60%_50%_50%/60%_40%_60%_40%] flex items-center justify-center shadow-soft'>
                <LayoutDashboard className='w-8 h-8 text-white' />
              </div>
              <div>
                <h1 className='text-5xl font-display font-normal text-[#1a4d4d] mb-2'>Dashboard</h1>
                <p className='text-[#4b5563] text-xl font-light'>Create and nurture your interview practice sessions</p>
              </div>
            </div>
          </div>
        </div>

        {/* Create Interview Section */}
        <div className='mb-12'>
          <h2 className='text-xl font-medium text-[#1f2937] mb-4'>Begin a New Session</h2>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
            <AddNewInterview />
            <BasicNonTechincal />
            <Dressing />
          </div>
        </div>

        {/* Interview List Section */}
        <InterviewList />
      </div>
    </div>
  )
}

export default Dashboard