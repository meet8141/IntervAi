"use client";
import { useUser } from '@/context/AuthContext'
import React, { useEffect } from 'react'
import InterviewcardList from './InterviewcardList';


function InterviewList() {
    const {user} = useUser();
    const[interviewList, setInterviewList] = React.useState([]);

    useEffect(() => { 
        user && GetInterviewList();
     }, [user]) 

    const GetInterviewList = async () => {
        try {
            const response = await fetch(`/api/interviews?email=${user?.primaryEmailAddress?.emailAddress}`);
            
            if (!response.ok) {
                console.error('Failed to fetch interviews');
                setInterviewList([]);
                return;
            }
            
            const data = await response.json();
            console.log(data);

            setInterviewList(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching interviews:', error);
            setInterviewList([]);
        }
    }
  return (
    <div className='space-y-6'>
        <div className='flex items-center justify-between'>
            <div>
                <h2 className='text-2xl md:text-3xl font-display font-normal text-[#1a4d4d]'>Your Garden of Sessions</h2>
                <p className='text-[#6b7280] mt-1 font-light'>Review and continue your practice journey</p>
            </div>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
            {interviewList && interviewList.map((interview, index) => (
                <InterviewcardList key={index} interview={interview} />
            ))}
        </div>

        {interviewList && interviewList.length === 0 && (
            <div className='text-center py-16 bg-white/60 backdrop-blur-xl rounded-[40px] border-2 border-dashed border-[#a8b5a8] space-y-3'>
                <div className='w-16 h-16 mx-auto bg-[#f5ebe0] rounded-[40%_60%_50%_50%/60%_40%_60%_40%] flex items-center justify-center'>
                    <span className='text-3xl'>🌱</span>
                </div>
                <p className='text-[#1a4d4d] text-lg font-medium'>Your garden is empty</p>
                <p className='text-[#6b7280] font-light text-sm max-w-xs mx-auto'>Create your first practice session above and watch your interview skills grow.</p>
            </div>
        )}
    </div>
  )
}

export default InterviewList