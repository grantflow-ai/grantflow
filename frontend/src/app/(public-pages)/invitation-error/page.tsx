import StreamlineAttribution from '@/components/shared/streamline-attribution';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import React from 'react';

const InvitationErrorPage = () => {
  return ( 
    <>
    <main className='flex flex-col w-full'>

   <header className='pl-10 py-[34px] '>
     <Image alt=""  src="/assets/logo-horizontal-with-description.svg" width={189} height={141} className=' bg-cover'  />
    </header> 
    <main className='flex items-center justify-center flex-1  w-full'>
      <main className='flex items-center flex-col gap-12'>

      <div className='w-[189.04px] h-[141.12px] '>
      <Image alt=""  src="/assets/invitation-error.svg" width={189} height={141} className=' bg-cover'  />
      </div>

    <div className='flex items-center flex-col gap-3'>
      <h1 className='text-black font-cabin font-medium text-[36px]'>We couldn’t verify your invitation link</h1>
      <p className='font-sans text-black text-base font-normal'>Your invitation link may have expired or become invalid.</p>
      <p className='font-normal text-app-gray-600 font-sans leading-[18px] text-center'>
        This can happen if the link is over 36 days old or was disrupted during sending. <br/> Don’t worry, you can easily request a new one.
      </p>
    </div>

    <div>
      <Button className='rounded-[4px] cursor-pointer' >
        Request a New Invitation
      </Button>
    </div>
    <div>
     <StreamlineAttribution/>
    </div>
      </main>
    </main>
    </main>
    </>
  );
};

export default InvitationErrorPage;
