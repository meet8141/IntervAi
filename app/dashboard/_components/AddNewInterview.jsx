"use client";
import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from "@/components/ui/textarea";
import { sendMessage } from "utils/Geminimodel";
import { LoaderCircle, Sparkles } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import { useUser } from '@/context/AuthContext';
import moment from 'moment';
import { useRouter } from 'next/navigation';

function AddNewInterview() {
    const [openDialog, setOpenDialog] = React.useState(false);
    const [Jobpost, setJobpost] = React.useState("");
    const [JobDescription, setJobDescription] = React.useState("");
    const [Experience, setExperience] = React.useState("");
    const [difficulty, setDifficulty] = React.useState("Intermediate");
    const [loading, setLoading] = React.useState(false);
    const[response,setResponse] = React.useState([]);
    const {user} = useUser();
    const Router = useRouter();

    const onSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
    
        const Inputprompt = `Job position: ${Jobpost}, Job Description: ${JobDescription}, Experience: ${Experience}, Difficulty Level: ${difficulty}. Based on the Job position, Job Description, Experience, and Difficulty Level, give me 5 interview questions along with answers in JSON format. The questions should be appropriate for a ${difficulty} level candidate. For 'Student/Beginner' level, ask basic foundational questions. For 'Intermediate' level, ask questions that require practical understanding and some experience. For 'Expert' level, ask advanced questions that test deep knowledge, architecture decisions, and complex problem-solving. Return ONLY a plain JSON array (no wrapping object) where each element has exactly "question" and "answer" fields. Example format: [{"question":"...","answer":"..."}]`;
    
        try {
            console.log("Sending request to Gemini...");
            const result = await sendMessage(Inputprompt);
            console.log("Gemini response received:", result);
    
            // Await the result's text content
            let responseText = await result.response.text();
            console.log("Raw response text:", responseText);
    
            // Clean up the response to remove any non-JSON parts
            responseText = responseText.trim()
                .replace(/```json/g, '')  // Remove any markdown JSON block formatting
                .replace(/```/g, '');     // Remove leftover closing markdown
    
            // Try to parse the cleaned response
            let jsonResponse;
            try {
                jsonResponse = JSON.parse(responseText);
            } catch (parseError) {
                console.error("Error parsing JSON:", parseError);
                console.log("Raw response text:", responseText); // Log the raw response for debugging
                toast.error("We couldn't understand the AI response. Please try again in a moment.");
                setLoading(false);
                return;
            }
    
            // Log the parsed JSON response
            console.log(jsonResponse);
            setResponse(jsonResponse);
    
            if (jsonResponse) {
                console.log("Inserting into database...");
                const mockId = uuidv4();
                console.log("Generated mockid:", mockId);
                
                const res = await fetch('/api/interviews', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        mockid: mockId,
                        jsonmockresp: responseText,
                        jobposition: Jobpost,
                        jobdescription: JobDescription,
                        jobexp: Experience,
                        difficulty: difficulty,
                        createdby: user?.primaryEmailAddress?.emailAddress
                    })
                });

                if (!res.ok) {
                    console.error("API response not OK:", res.status, res.statusText);
                    const errorData = await res.json();
                    console.error("Error data:", errorData);
                    toast.error("Failed to create interview. Please try again.");
                    setLoading(false);
                    return;
                }

                const output = await res.json();
                console.log("API response:", output);
                console.log("Inserted mockid:", output.mockid);

                if (output && output.mockid) {
                    setOpenDialog(false);
                    Router.push(`/dashboard/interview/${output.mockid}`);
                } else {
                    console.error("Invalid API response - missing mockid:", output);
                    toast.error("Failed to get interview ID. Please try again.");
                }
            }
        } catch (error) {
            console.error("Full error object:", error);
            console.error("Error message:", error.message);
            console.error("Error stack:", error.stack);
            toast.error("Something went wrong generating questions. Please try again.");
        } finally {
            setLoading(false);
        }
    };
    

  return (
    <div>
        <div 
            className='group relative p-10 border-2 border-dashed border-[#a8b5a8] rounded-[40px] bg-white/70 backdrop-blur-xl hover:bg-white/90 hover:border-[#4a6b5b] hover:shadow-lg cursor-pointer transition-all duration-500 transform hover:-translate-y-2 hover:scale-105'
            onClick={() => setOpenDialog(true)}
        >
            <div className='flex flex-col items-center justify-center space-y-4'>
                <div className='w-20 h-20 bg-gradient-to-br from-[#2d5f5f] to-[#4a6b5b] rounded-[40%_60%_50%_50%/60%_40%_60%_40%] flex items-center justify-center group-hover:scale-110 group-hover:rotate-90 transition-all duration-500 shadow-soft'>
                    <span className='text-white text-5xl font-light'>+</span>
                </div>
                <h2 className='text-xl font-medium text-[#1f2937] group-hover:text-[#2d5f5f] transition-colors'>
                    Create New Session
                </h2>
                <p className='text-base text-[#6b7280] text-center font-light leading-relaxed'>
                    Begin a thoughtful interview practice
                </p>
                <div className='flex items-center gap-1.5 text-xs text-[#4a6b5b] font-medium bg-[#f5ebe0] px-3 py-1.5 rounded-full border border-[#e5d5c8]'>
                    <Sparkles className='w-3.5 h-3.5' />
                    AI-Powered Mock Interview
                </div>
            </div>
        </div>
        
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogContent className="bg-white/95 backdrop-blur-2xl max-w-2xl rounded-[40px] border-2 border-[#e5d5c8]/50 shadow-2xl">
                <DialogHeader className='space-y-4'>
                    <DialogTitle className="text-3xl font-display font-normal text-[#1a4d4d]">
                        Share Your Interview Details
                    </DialogTitle>
                    <DialogDescription className='text-base text-[#4b5563] font-light'>
                        Tell us about your aspirations to receive personalized interview questions
                    </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={onSubmit} className='space-y-6 mt-6'>
                    <div className='space-y-5'>
                        <div className='space-y-2'>
                            <label className='text-sm font-medium text-[#1f2937] flex items-center'>
                                Position Title <span className='text-[#e8b4a8] ml-1'>*</span>
                            </label>
                            <Input 
                                placeholder="e.g., Senior Product Designer, Data Scientist"  
                                required 
                                onChange={(event) => setJobpost(event.target.value)}
                                className='h-12 border-[#e5d5c8] focus:border-[#4a6b5b] focus:ring-[#4a6b5b] rounded-[20px]'
                            />
                        </div>
                        
                        <div className='space-y-2'>
                            <label className='text-sm font-medium text-[#1f2937] flex items-center'>
                                Role Description <span className='text-[#e8b4a8] ml-1'>*</span>
                            </label>
                            <Textarea 
                                placeholder="Describe the role, required skills, and technologies..."  
                                required 
                                onChange={(event) => setJobDescription(event.target.value)}
                                className='min-h-[120px] border-[#e5d5c8] focus:border-[#4a6b5b] focus:ring-[#4a6b5b] rounded-[20px] resize-none'
                            />
                        </div>
                        
                        <div className='space-y-2'>
                            <label className='text-sm font-medium text-[#1f2937] flex items-center'>
                                Years of Experience <span className='text-[#e8b4a8] ml-1'>*</span>
                            </label>
                            <Input 
                                placeholder="e.g., 3"
                                max="50"
                                type="number"
                                required 
                                onChange={(event) => setExperience(event.target.value)}
                                className='h-12 border-[#e5d5c8] focus:border-[#4a6b5b] focus:ring-[#4a6b5b] rounded-[20px]'
                            />
                            <p className='text-xs text-[#6b7280] font-light'>Helps us tailor questions to your journey</p>
                        </div>
                        
                        <div className='space-y-2'>
                            <label className='text-sm font-medium text-[#1f2937] flex items-center'>
                                Difficulty Level <span className='text-[#e8b4a8] ml-1'>*</span>
                            </label>
                            <div className='flex gap-3'>
                                <button
                                    type="button"
                                    onClick={() => setDifficulty('Student/Beginner')}
                                    className={`flex-1 py-3 px-4 rounded-[20px] border-2 transition-all duration-300 ${
                                        difficulty === 'Student/Beginner'
                                            ? 'bg-[#2d5f5f] border-[#2d5f5f] text-white shadow-md'
                                            : 'bg-white border-[#e5d5c8] text-[#4b5563] hover:border-[#4a6b5b]'
                                    }`}
                                >
                                    <div className='text-center'>
                                        <div className='font-medium text-sm'>Student/Beginner</div>
                                        <div className='text-xs mt-1 opacity-80'>Basic concepts</div>
                                    </div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setDifficulty('Intermediate')}
                                    className={`flex-1 py-3 px-4 rounded-[20px] border-2 transition-all duration-300 ${
                                        difficulty === 'Intermediate'
                                            ? 'bg-[#2d5f5f] border-[#2d5f5f] text-white shadow-md'
                                            : 'bg-white border-[#e5d5c8] text-[#4b5563] hover:border-[#4a6b5b]'
                                    }`}
                                >
                                    <div className='text-center'>
                                        <div className='font-medium text-sm'>Intermediate</div>
                                        <div className='text-xs mt-1 opacity-80'>Practical skills</div>
                                    </div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setDifficulty('Expert')}
                                    className={`flex-1 py-3 px-4 rounded-[20px] border-2 transition-all duration-300 ${
                                        difficulty === 'Expert'
                                            ? 'bg-[#2d5f5f] border-[#2d5f5f] text-white shadow-md'
                                            : 'bg-white border-[#e5d5c8] text-[#4b5563] hover:border-[#4a6b5b]'
                                    }`}
                                >
                                    <div className='text-center'>
                                        <div className='font-medium text-sm'>Expert</div>
                                        <div className='text-xs mt-1 opacity-80'>Advanced topics</div>
                                    </div>
                                </button>
                            </div>
                            <p className='text-xs text-[#6b7280] font-light'>Select the difficulty level for your interview questions</p>
                        </div>
                    </div>
                    
                    <div className='flex gap-4 justify-end pt-4 border-t border-[#f0e6db]'>
                        <Button 
                            type="button" 
                            variant="ghost" 
                            onClick={() => setOpenDialog(false)}
                            className='px-6 py-2 hover:bg-[#f5ebe0] rounded-[20px] font-medium'
                        >
                            Cancel
                        </Button>
                        <Button 
                            type="submit" 
                            disabled={loading}
                            className='px-8 py-2 bg-[#2d5f5f] hover:bg-[#1a4d4d] text-white font-medium rounded-[28px] shadow-soft hover:shadow-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed'
                        >
                            {loading ? (
                                <span className='flex items-center space-x-2'>
                                    <LoaderCircle className='animate-spin w-5 h-5' />
                                    <span>Crafting Questions...</span>
                                </span>
                            ) : (
                                'Begin Session'
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    </div>
  )
}

export default AddNewInterview;