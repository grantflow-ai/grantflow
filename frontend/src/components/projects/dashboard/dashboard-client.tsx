"use client";

import { AppButton } from "@/components/app";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  BellIcon,
  Copy,
  
  MoreVertical,
  Plus,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import WelcomeModal from "./welcome/welcome-modal";
import { Notification } from "./notification";


export default function DashboardClient() {
  const [cards, setCards] = useState([
    {
      id: 1,
      title: "Research Project",
      description: "Create grants applications under this research.",
    },
  ]);

  const handleDuplicate =(cardId) => {
	setCards((prevCard)=>{
		const cardToDuplicate = prevCard.find((c) => c.id === cardId)
		if(!cardToDuplicate) return prevCard

		return[
			...prevCard, {...cardToDuplicate, id: Date.now()}
		]
	})
  }
  const handleDelete = (cardId) => {
	setCards(prev => prev.filter(card => card.id !== cardId))
  }
  return (

    <>
      <WelcomeModal
        onStartApplication={() => {
        }}
      />
      <section className="bg-preview-bg w-full h-full  flex">
    
        <main className="w-[1368px] h-full">
          <header className=" h-[73px] w-[1368px] flex justify-end items-center gap-2">
            <div className="size-8 flex items-center justify-center">
              <Notification/>
            </div>
            <div className="size-8 bg-[#369E94] rounded-sm flex items-center justify-center ">
              <p className="font-semibold text-base">NH</p>
            </div>
          </header>
          <main className="w-full px-10 flex flex-col gap-10 py-14 rounded-lg bg-white border border-gray-100">
            <main className="flex flex-col gap-8">
              <article className="text-black flex justify-between items-center">
                <div className="flex flex-col gap-2">
                  <h2 className="font-medium text-4xl ">Dashboard</h2>
                  <p className="font-normal text-base text-gray-600">
                    Your one‑stop overview for all your Research Projects.
                  </p>
                </div>
                <div className="flex gap-6">
                  <main className=" flex justify-end items-center gap-2">
                    <div className="size-8 flex items-center justify-center bg-gray-50 rounded-xs cursor-pointer">
                      <Tooltip>
                        <TooltipTrigger className="cursor-pointer">
                          <Plus className="size-2.5 text-primary " />
                        </TooltipTrigger>
                        <TooltipContent className="bg-app-dark-blue px-3 py-1 rounded-xs">
                          <p className="text-white font-normal text-base">
                            Invite collaborators
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <div className="size-8 bg-[#369E94] rounded-sm flex items-center justify-center ">
                      <p className="font-semibold text-base text-white">NH</p>
                    </div>
                  </main>
                  <AppButton variant="primary" className="px-4 py-2">
                    <p className="font-normal text-base">
                      + New Research Project
                    </p>
                  </AppButton>
                </div>
              </article>

              <article className="flex gap-8 items-center w-full mt-6">
                <div className="w-full h-[130px]  border border-gray-200 rounded-sm px-6 py-6 flex flex-col gap-2.5">
                  <h4 className="font-normal text-4xl text-black">{cards.length}</h4>
                  <p className="font-normal text-2xl text-gray-600">
                    Research projects
                  </p>
                </div>
                <div className="w-full h-[130px]  border border-gray-200 rounded-sm px-6 py-6 flex flex-col gap-2.5">
                  <h4 className="font-normal text-4xl text-black">0</h4>
                  <p className="font-normal text-2xl text-gray-600">
                    Applications
                  </p>
                </div>
              </article>
            </main>
            <main>
              <h3 className="font-normal text-4xl text-black">
                Research Projects
              </h3>

              <main className="flex items-center gap-4 flex-wrap mt-6">
                {cards.map((card) => {
                  return (
                    <div
                      key={card.id}
                      className="w-[413px] h-[300px] rounded-sm p-6 border border-gray-200 bg-preview-bg flex"
                    >
                      <div className="flex  flex-col w-full">
                        <div className="flex flex-col gap-3">
                          <figure className="px-2 gap-1 bg-gray-100 text-app-dark-blue w-fit items-center flex rounded-[20px]">
                            <div className="size-3">
                              <Image
                                src="/icons/note_stack.svg"
                                alt="No projects"
                                width={100}
                                height={100}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            You have no applications yet
                          </figure>
                          <div className="flex flex-col gap-2">
                            <h4 className="font-medium text-2xl text-black">
                              {card.title}
                            </h4>
                            <p className="text-gray-600 text-base font-normal">
                              {card.description}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-end  h-full">
                          <div className="size-8 bg-[#369E94] rounded-sm flex items-center justify-center ">
                            <p className="font-semibold text-base text-white">
                              NH
                            </p>
                          </div>
                        </div>
                      </div>
                      <div>
                        <DropdownMenu>
                          <DropdownMenuTrigger className="-mt-2 cursor-pointer">
                            <MoreVertical className="size-4 text-gray-700 " />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="w-[200px] rounded-sm bg-white border border-gray-200 shadow-none p-0">
                            <DropdownMenuItem onClick={()=>handleDelete(card.id)}  className="p-3 font-normal text-base text-gray-700 flex items-center gap-2 cursor-pointer data-[highlighted]:bg-transparent data-[highlighted]:text-gray-700">
                              <Trash2 className="size-4 text-gray-700" />
                              Delete
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicate(card.id)} className="p-3 font-normal text-base text-gray-700 flex items-center gap-2 cursor-pointer data-[highlighted]:bg-transparent data-[highlighted]:text-gray-700">
                              <Copy className="size-4 text-gray-700" />
                              Duplicate
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })}
              </main>
            </main>
          </main>
        </main>
      </section>
    </>
  );
}