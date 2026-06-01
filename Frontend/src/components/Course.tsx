import { useRef, useState } from 'react';
import type { CourseData, DocumentItem } from '../types/course.types';
import { useCourses } from '../contexts/CourseContext';
import PDFsViewer from './PDFsViewer';

type CourseProps = CourseData & { onBack?: () => void };

export const Course = (course: CourseProps) => {
  const [viewer, setViewer] = useState(false);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const { getDocumentItemsFromCourse, getMaterialSecureUrl } = useCourses();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [scrollStartX, setScrollStartX] = useState(0);
  const [viewerData, setViewerData] = useState<{ courseId: string; moduleId: string } | null>(null);

  const handleModuleClick = async (moduleOrder: number, moduleId: string) => {
    setIsLoadingDocuments(true);
    
    const moduleDocuments = getDocumentItemsFromCourse(course._id, moduleOrder);

    const documentsWithUrls = await Promise.all(
      moduleDocuments.map(async (doc) => {
        if (doc.materialId) {
          const secureUrl = await getMaterialSecureUrl(doc.materialId);
          return { ...doc, url: secureUrl || '' };
        }
        return doc;
      })
    );

    const validDocuments = documentsWithUrls.filter((doc) => doc.url);

    setDocuments(validDocuments);
    setIsLoadingDocuments(false);
    setViewerData({ courseId: course._id, moduleId});
    setViewer(true);
  };

  const handleCloseViewer = () => {
    setViewer(false);
    setViewerData(null);
    setDocuments([]);
  };

  const onMouseDown: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setDragStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollStartX(scrollRef.current.scrollLeft);
  };

  const onMouseMove: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = x - dragStartX;
    scrollRef.current.scrollLeft = scrollStartX - walk;
  };

  const endDrag = () => setIsDragging(false);

  const onTouchStart: React.TouchEventHandler<HTMLDivElement> = (e) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setDragStartX(e.touches[0].pageX - scrollRef.current.offsetLeft);
    setScrollStartX(scrollRef.current.scrollLeft);
  };

  const onTouchMove: React.TouchEventHandler<HTMLDivElement> = (e) => {
    if (!isDragging || !scrollRef.current) return;
    const x = e.touches[0].pageX - scrollRef.current.offsetLeft;
    const walk = x - dragStartX;
    scrollRef.current.scrollLeft = scrollStartX - walk;
  };

  const onTouchEnd = () => setIsDragging(false);

  return (
    <>
      {course.onBack && (
        <button
          className="mx-20 absolute top-10 left-7 z-10 inline-flex items-center hover:scale-110 transition-opacity cursor-pointer"
          onClick={course.onBack}
        >
          <img
            src="/assets/images/Return-Button.svg"
            alt="Back"
            className="w-35 h-18"
          />
        </button>
      )}
      <div
        ref={scrollRef}
        className={`${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        } w-full h-full overflow-x-auto overflow-y-hidden select-none`}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="mx-9 flex flex-row items-center py-30 w-max ">
          {course.modules &&
            course.modules.map((module) => {
              const isUnlocked = module.isModuleOpen;
              if (!isUnlocked) {
                return (
                  <div
                    key={module._id}
                    className="relative w-auto h-auto flex-shrink-0 "
                    aria-disabled="true"
                  >
                    <img
                      className="w-64 h-96 object-contain"
                      src="assets/images/Level_Elements/Base-Locked2.png"
                      alt="Module locked"
                    />
                  </div>
                );
              }

              return (
                <button
                  key={module._id}
                  className="relative w-auto h-auto flex-shrink-0 flex flex-col items-center space-y-2 cursor-pointer group hover:scale-105"
                  disabled={isLoadingDocuments}
                  onClick={() => {
                    handleModuleClick(module.order, module._id);
                  }}
                >
                    <div
                      className="absolute -top-2 -left-1 w-[calc(100%+0.5rem)] h-[calc(100%+0.5rem)] inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-30 pointer-events-none justify-center items-center"
                      style={{
                        backgroundImage: 'url(assets/images/Level_Elements/Base-bg.png)',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center',
                        backgroundSize: 'contain',
                      }}
                    ></div>
                    <img
                      className="w-74 h-96 object-contain z-10 items-center"
                      src="assets/images/Level_Elements/Base.png"
                      alt="Module button"

                    />
                    <div className="absolute top-35 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center gap-1 z-10">
                      {[...String(module.order)].map((digit, i) => (
                        <img
                          key={i}
                          className="w-20 h-auto object-contain pt-5"
                          src={`assets/images/Level_Elements/${digit}.png`}
                          alt={`Digit ${digit}`}
                        />
                      ))}
                    </div>
                    
                    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex gap-1 z-10">
                      {Array.from({ length: 3 }).map((_, i) => (
                        
                        <img
                          key={i}
                          src={
                            i < module.crystals
                              ? "assets/images/Level_Elements/Crystal.png" // filled crystal
                              : "assets/images/Level_Elements/Crystal-gray.png" // placeholder
                          }
                          alt={i < module.crystals ? "Crystal" : "Crystal Placeholder"}
                          className="w-10 h-auto object-contain"
                        />
                      ))}
                    </div>

                    

                    {module.crystals === 0 ? (
                      // START button
                      <div
                        className="absolute bottom-10 left-1/2 -translate-x-1/2 w-32 h-7 z-10"
                      >
                        <img
                          src="assets/images/Level_Elements/Bar.png"
                          alt="bar"
                          className="w-full h-full"
                        />
                        <div className="absolute inset-0 flex items-center justify-center text-white text-xl font-semibold">
                          START
                        </div>
                      </div>
                    ) : (
                      // TRY AGAIN button
                      <div
                        className="absolute bottom-10 left-1/2 -translate-x-1/2 w-32 h-7 z-10"
                      >
                        <img
                          src="assets/images/Level_Elements/Bar2.png"
                          alt="bar"
                          className="w-full h-full"
                        />
                        <div className="absolute inset-0 flex items-center justify-center text-white text-xl font-semibold">
                          TRY AGAIN
                        </div>
                      </div>
                    )}

                    {/* {isLoadingDocuments && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
                        <div className="text-white text-xs">Loading...</div>
                      </div>
                    )} */}

                  
                </button>
              );
            })}
        </div>
      </div>

      <PDFsViewer
        isOpen={viewer}
        documents={documents}
        viewerData={viewerData!}
        onClose={handleCloseViewer}
      />
    </>
  );
};
