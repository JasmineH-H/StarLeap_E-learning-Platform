import React, { useState } from 'react';
import { Worker, Viewer } from '@react-pdf-viewer/core';
import '@react-pdf-viewer/core/lib/styles/index.css';
import type { DocumentItem } from '../types/course.types';
import { useNavigate } from 'react-router-dom';

interface PDFsViewerProps {
  isOpen: boolean;
  documents: DocumentItem[];
  viewerData: { courseId: string; moduleId: string };
  onClose: () => void;
}

const PDFsViewer: React.FC<PDFsViewerProps> = ({
  isOpen,
  documents,
  viewerData,
  onClose,
}) => {
  const [activeDocumentId, setActiveDocumentId] = useState<string>('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const navigate = useNavigate();

  const handleStart = () => {
    navigate(`/quiz-intro/${viewerData.courseId}/${viewerData.moduleId}`);
  };

  // Reset and set the first document as active when documents change
  React.useEffect(() => {
    if (isOpen && documents.length > 0) {
      setActiveDocumentId(documents[0].id);
    }
  }, [isOpen, documents]);

  // Reset active document when viewer closes
  React.useEffect(() => {
    if (!isOpen) {
      setActiveDocumentId('');
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const activeDocument = documents.find((doc) => doc.id === activeDocumentId);

  const getDocumentTypeColor = (type: 'homework' | 'exercise') => {
    return type === 'homework'
      ? 'bg-blue-100 text-blue-800'
      : 'bg-green-100 text-green-800';
  };

  return (
    <div className="fixed inset-0 z-50 flex bg-black bg-opacity-75">
      {/* Document Sidebar */}
      <div
        className={`bg-white shadow-2xl transition-all duration-300 ${
          sidebarCollapsed ? 'w-12' : 'w-80'
        } flex flex-col`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 bg-gray-100 border-b">
          {!sidebarCollapsed && (
            <h3 className="text-lg font-semibold text-gray-800">
              Course Materials
            </h3>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="text-gray-600 hover:text-gray-900 text-xl transition-colors"
            aria-label={
              sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'
            }
          >
            {sidebarCollapsed ? (
              <img
                src="/assets/images/PDFViewer/Left.png"
                alt=""
                className="w-10"
              />
            ) : (
              <img
                src="/assets/images/PDFViewer/Right.png"
                alt=""
                className="w-10"
              />
            )}
          </button>
          
        </div>

        {/* Document List */}
        {!sidebarCollapsed && (
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-3">
              {documents.map((document) => (
                <div
                  key={document.id}
                  onClick={() => setActiveDocumentId(document.id)}
                  className={`cursor-pointer rounded-lg border-2 p-3 transition-all duration-200 hover:shadow-md ${
                    activeDocumentId === document.id
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">
                        {document.title}
                      </h4>
                      <span
                        className={`inline-block px-2 py-1 text-xs font-medium rounded-full mt-1 ${getDocumentTypeColor(
                          document.type
                        )}`}
                      >
                        {document.type === 'homework'
                          ? 'Homework'
                          : 'In-Class Exercise'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Collapsed Sidebar Icons */}
        {sidebarCollapsed && (
          <div className="flex-1 p-2">
            <div className="space-y-2">
              {documents.map((document) => (
                <button
                  key={document.id}
                  onClick={() => setActiveDocumentId(document.id)}
                  className={`w-8 h-8 rounded-md flex items-center justify-center text-sm transition-colors ${
                    activeDocumentId === document.id
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  title={document.title}
                ></button>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          className="relative w-80 h-auto p-4 justify-center items-center opacity-100 transition-opacity cursor-pointer "
          onClick={handleStart}
        >
          <img
            src="assets/images/Level_Elements/Bar.png"
            alt="bar"
            className="w-full h-full"
          />
          <div className="absolute inset-0 flex items-center justify-center text-white text-xl font-semibold opacity-60 hover:opacity-100 transition-opacity">
            Ready For Challenge
          </div>
        </button>

        <button
          type="button"
          className="relative w-80 h-auto p-4 justify-center items-center cursor-pointer opacity-60 hover:opacity-100 transition-opacity"
          onClick={onClose} aria-label="Close PDF viewer"
        >
          <img
            src="assets/images/Level_Elements/Bar3.png"
            alt="bar"
            className="w-full h-full"
          />
          <div className="absolute inset-0 flex items-center justify-center text-black text-xl font-semibold">
            Back
          </div>
        </button>
      </div>

      {/* Main PDF Viewer Area */}
      <div className="flex-1 flex flex-col">
        {/* Header with document title and close button */}
        <div className="flex justify-between items-center p-4 bg-white border-b">
          <div className="flex items-center space-x-3">
            {activeDocument && (
              <>
                <div>
                  <h2 className="text-xl font-semibold text-gray-800">
                    {activeDocument.title}
                  </h2>
                  <span
                    className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getDocumentTypeColor(
                      activeDocument.type
                    )}`}
                  >
                    {activeDocument.type === 'homework'
                      ? 'Homework'
                      : 'In-Class Exercise'}
                  </span>
                </div>
              </>
            )}
          </div>
          {/* <button onClick={onClose} aria-label="Close PDF viewer">
            <img
              src="/assets/images/PDFViewer/Return-Button.png"
              alt="Return"
              className="w-12"
            />
          </button> */}
        </div>

        {/* PDF Content */}
        <div className="flex-1 overflow-hidden">
          {activeDocument ? (
            <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js">
              <div className="h-full">
                <Viewer
                  fileUrl={activeDocument.url}
                  theme={{
                    theme: 'light',
                  }}
                />
              </div>
            </Worker>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <div className="text-4xl mb-2">📄</div>
                <p>No document selected</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PDFsViewer;
