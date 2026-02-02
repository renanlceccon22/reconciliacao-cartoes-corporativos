
import React, { useRef, useState } from 'react';

interface FileUploaderProps {
  onFilesSelect: (files: File[]) => void;
  isLoading: boolean;
  accept?: string;
  title?: string;
  subtitle?: string;
}

const FileUploader: React.FC<FileUploaderProps> = ({ 
  onFilesSelect, 
  isLoading, 
  accept = "image/*,application/pdf",
  title = "Anexar Arquivos",
  subtitle = "Você pode selecionar vários arquivos de uma vez."
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (selectedFiles.length > 0) {
      onFilesSelect(selectedFiles);
      setSelectedFiles([]); // Clear after submission
    }
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full max-w-2xl mx-auto mb-8 space-y-4">
      <div 
        onClick={!isLoading ? triggerUpload : undefined}
        className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all cursor-pointer
          ${isLoading ? 'bg-gray-50 border-gray-200 cursor-not-allowed' : 'bg-white border-blue-200 hover:border-[#FDB913] hover:bg-blue-50'}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-10 w-10 mb-3 ${isLoading ? 'text-gray-400' : 'text-[#003B71]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500 mt-1 text-center">
          {subtitle}
        </p>
        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleFileChange}
          accept={accept}
          className="hidden"
          disabled={isLoading}
          multiple
        />
      </div>

      {selectedFiles.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm animate-fadeIn">
          <h4 className="text-xs font-bold text-gray-400 uppercase mb-3 tracking-wider">Arquivos Selecionados ({selectedFiles.length})</h4>
          <ul className="space-y-2 mb-4">
            {selectedFiles.map((file, idx) => (
              <li key={idx} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg text-sm">
                <div className="flex items-center space-x-2 truncate">
                  <svg className="h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A1 1 0 0111 2.414l4.293 4.293V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700 truncate">{file.name}</span>
                </div>
                {!isLoading && (
                  <button onClick={() => removeFile(idx)} className="text-red-500 hover:text-red-700 p-1">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </li>
            ))}
          </ul>
          {!isLoading && (
            <button 
              onClick={handleSubmit}
              className="w-full bg-[#003B71] text-white py-2.5 rounded-lg hover:bg-blue-800 transition-colors font-bold shadow-sm flex items-center justify-center space-x-2"
            >
              <span>Processar Selecionados</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default FileUploader;
