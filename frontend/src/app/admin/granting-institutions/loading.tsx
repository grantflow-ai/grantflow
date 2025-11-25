import { Skeleton } from "@/components/ui/skeleton";

export default function LoadingPreviewPage() {
  return (
    <div className="py-8 px-4 md:pr-5 md:pl-0 w-full">
      <div className="h-[40px] w-full flex justify-end items-center gap-1 px-6 mb-2">
         <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
                <Skeleton className="size-8 rounded-full border-2 border-white bg-gray-200" />
                <Skeleton className="size-8 rounded-full border-2 border-white bg-gray-200" />
                <Skeleton className="size-8 rounded-full border-2 border-white bg-gray-200" />
            </div>
         </div>
      </div>

      <div className="mb-4 2xl:mb-6 px-6 2xl:px-10 relative flex flex-col gap-6 2xl:gap-8 py-6 2xl:py-10 rounded-lg bg-white border border-app-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-[42px] w-64 rounded-md bg-gray-200" />
            <Skeleton className="h-[24px] w-96 rounded-md bg-gray-200" />
          </div>
          <div className="flex items-center gap-6">
             <Skeleton className="h-10 w-[400px] rounded-[4px] bg-gray-200" />
             <Skeleton className="h-10 w-[160px] rounded-md bg-gray-200" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 auto-rows-min mt-4">
          {[1, 2, 3, 4, 5, 6,7,8,9,10].map((i) => (
            <div
              className="relative flex flex-col rounded-[4px] space-y-6 border border-app-gray-100 p-6 bg-preview-bg"
              key={i}
            >
              <header className="flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-1">
                    <Skeleton className="h-[12px] w-24 bg-gray-200" />
                  </div>
                  <div className="flex items-center pt-2 gap-3">
                    <Skeleton className="h-4 w-4 rounded-full bg-gray-200" />
                  </div>
                </div>
              </header>

              <main className="space-y-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="size-4 rounded-sm bg-gray-200" />
                  <Skeleton className="h-[22px] w-48 rounded-sm bg-gray-200" />
                </div>

                <div className="space-y-2">
                    <div className="flex space-x-2 items-center">
                    <Skeleton className="h-[14px] w-20 rounded-sm bg-gray-200" />
                    <Skeleton className="h-[14px] w-12 rounded-sm bg-gray-200" />
                    </div>
                    <div className="flex space-x-2 items-center">
                    <Skeleton className="h-[14px] w-20 rounded-sm bg-gray-200" />
                    <Skeleton className="h-[14px] w-32 rounded-sm bg-gray-200" />
                    </div>
                </div>
              </main>

              <main className="flex h-full w-full pt-2">
                <div className="flex gap-2">
                  <Skeleton className="h-[24px] w-20 rounded-[4px] bg-gray-200" />
                  <Skeleton className="h-[24px] w-24 rounded-[4px] bg-gray-200" />
                </div>
              </main>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}