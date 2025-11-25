"use client";

import { useEffect } from "react";


import { Globe, Trash2 } from "lucide-react";

import { RagSourceFileUploader } from "@/components/shared/rag-source-file-uploader";
import { RagSourceUrlInput } from "@/components/shared/rag-source-url-input";
import { FILE_ICON_MAP } from "@/components/shared/file-icon-map";

import { SourceIndexingStatus } from "@/enums";
import { useAdminStore } from "@/stores/admin-store";
import { useGrantingInstitutionStore } from "@/stores/granting-institution-store";
import type { FileWithId, FileWithSource, UrlWithSource } from "@/types/files";
import { getFileExtension } from "@/utils/file-extensions";

export function AdminGrantingInstitutionSourcesContent() {
  const { grantingInstitution } = useAdminStore();
  const {
    addFile,
    addUrl,
    deleteSource,
    isLoading,
    loadData,
    pendingUploads,
    removePendingUpload,
    reset,
    setInstitutionId,
    sources,
  } = useGrantingInstitutionStore();

  useEffect(() => {
    if (grantingInstitution) {
      setInstitutionId(grantingInstitution.id);
      void loadData();
    }

    return () => {
      reset();
    };
  }, [grantingInstitution, setInstitutionId, loadData, reset]);

  useEffect(() => {
    const hasIndexingSources = sources.some(
      (source) =>
        (source.indexing_status as SourceIndexingStatus) ===
          SourceIndexingStatus.CREATED ||
        (source.indexing_status as SourceIndexingStatus) ===
          SourceIndexingStatus.INDEXING
    );

    if (!hasIndexingSources) {
      return;
    }

    const pollInterval = setInterval(() => {
      void loadData();
    }, 3000);

    return () => {
      clearInterval(pollInterval);
    };
  }, [sources, loadData]);

  const handleFileAdd = async (file: FileWithId) => {
    await addFile(file);
  };

  const handleUrlAdd = async (url: string) => {
    await addUrl(url);
  };

  const handleDeleteSource = async (sourceId: string) => {
    await deleteSource(sourceId);
  };

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center h-full"
        data-testid="sources-loading"
      >
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          <p className="text-app-gray-600">Loading sources...</p>
        </div>
      </div>
    );
  }

  if (!grantingInstitution) {
    return (
      <div
        className="flex items-center justify-center h-full"
        data-testid="sources-no-institution"
      >
        <p className="text-app-gray-600">No institution selected</p>
      </div>
    );
  }

  const files: FileWithSource[] = sources
    .filter(
      (source): source is Extract<typeof source, { filename: string }> =>
        "filename" in source
    )
    .map((source) => {
      const file = new File([], source.filename, { type: source.mime_type });
      return Object.assign(file, {
        id: source.id,
        sourceId: source.id,
        sourceStatus: source.indexing_status,
      });
    });

  const urls: UrlWithSource[] = sources
    .filter(
      (source): source is Extract<typeof source, { url: string }> =>
        "url" in source
    )
    .map((source) => ({
      sourceId: source.id,
      sourceStatus: source.indexing_status,
      url: source.url,
    }));

  const existingUrls = urls.map((u) => u.url);
  const pendingUploadsArray = [...pendingUploads];

  return (
    <div className="flex flex-col h-full " data-testid="admin-sources-content">
    
      

   
      

      <main className="flex  h-[671px] gap-6">
        <div className="p-6 bg-app-gray-20 flex-1 space-y-6   h-full">
          <header className="flex items-center justify-between">
            <h1 className="font-semibold text-base text-black">Files</h1>
            <RagSourceFileUploader
              onFileAdd={handleFileAdd}
              onFileRemove={removePendingUpload}
              testId="admin-sources-file-upload"
            />
          </header>
          <main className="flex-1 overflow-y-auto space-y-2 mt-4">
            {[...files, ...pendingUploadsArray].length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-app-gray-400 text-sm italic border-2 border-dashed border-app-gray-200 rounded-lg">
                No files uploaded yet
              </div>
            ) : (
              [...files, ...pendingUploadsArray].map((file) => {
                const extension = getFileExtension(file.name);
                const isPending = !("sourceId" in file);
                
                return (
                  <div 
                    className="h-[55px] flex items-center justify-between  border-b border-app-gray-100  px-3 shadow-none hover:shadow-md transition-shadow" 
                    key={file.id}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex-shrink-0 w-8 flex justify-center">
                        {FILE_ICON_MAP[extension as keyof typeof FILE_ICON_MAP]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-app-black" title={file.name}>
                          {file.name}
                        </p>
                        {isPending && <p className="text-xs text-app-gray-400">Uploading...</p>}
                      </div>
                    </div>
                    
                    <div className="ml-2 flex-shrink-0">
                      <button 
                        className="p-2 hover:bg-app-red/10 rounded-full text-app-gray-400 hover:text-app-red transition-colors"
                        onClick={() => { isPending ? removePendingUpload(file.id) : void handleDeleteSource(file.id); }}
                        title="Remove file"
                        type="button"
                      >
                        <Trash2 className="size-4 text-app-black" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </main>
        </div>
        <div className="p-6 bg-app-gray-20 space-y-6  flex-1 h-full">
          <header className="flex items-center justify-between">
            <h1 className="font-semibold text-base text-black">Links</h1>
            <div className="w-full max-w-sm">
             <RagSourceUrlInput
              existingUrls={existingUrls}
              hideLabel
              onUrlAdd={handleUrlAdd}
              testId="admin-sources-url-input"
            />
            </div>
          </header>
          <main className="flex-1 overflow-y-auto space-y-2 mt-4">
            {urls.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-app-gray-400 text-sm italic border-2 border-dashed border-app-gray-200 rounded-lg">
                No links added yet
              </div>
            ) : (
               
               
              urls.map((urlItem) => (
                <div 
                  className="h-[55px] flex items-center justify-between  border-b border-app-gray-100  px-3 shadow-none hover:shadow-md transition-shadow" 
                  key={urlItem.sourceId}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="flex-shrink-0 w-8 flex justify-center">
                      <Globe className="size-5 text-app-gray-700" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <a 
                        className="truncate text-sm font-medium text-app-black hover:underline block"
                        href={urlItem.url}
                        rel="noopener noreferrer" 
                        target="_blank" 
                        title={urlItem.url}
                      >
                        {urlItem.url}
                      </a>
                    </div>
                  </div>
                  
                  <div className="ml-2 flex-shrink-0">
                    <button 
                      className="p-2 hover:bg-app-red/10 rounded-full text-app-gray-400 hover:text-app-red transition-colors"
                      onClick={() => handleDeleteSource(urlItem.sourceId)}
                      title="Remove link"
                      type="button"
                    >
                      <Trash2 className="size-4 text-app-gray-700" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </main>
        </div>
      </main>
    </div>
  );
}
