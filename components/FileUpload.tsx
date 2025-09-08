'use client';

import { useCallback, useState } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { ParsedFile } from '@/lib/csvParser';

interface FileUploadProps {
  onFilesParsed: (files: ParsedFile[]) => void;
}

export default function FileUpload({ onFilesParsed }: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    
    try {
      const fileArray = Array.from(files);
      const { parseMultipleCSVFiles } = await import('@/lib/csvParser');
      const parsedFiles = await parseMultipleCSVFiles(fileArray);
      onFilesParsed(parsedFiles);
    } catch (error) {
      console.error('Error parsing files:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [onFilesParsed]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  }, [handleFiles]);

  return (
    <div className="w-full">
      <div
        className={`upload-area relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300 ${
          isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
        } ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          multiple
          accept=".csv,.txt"
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isProcessing}
        />
        
        <div className="flex flex-col items-center space-y-4">
          {isProcessing ? (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              <p className="text-gray-600">ファイルを処理中...</p>
            </>
          ) : (
            <>
              <Upload className="h-12 w-12 text-gray-400" />
              <div>
                <p className="text-lg font-medium text-gray-700">
                  ドラッグ&ドロップまたはクリックしてCSVファイルを選択
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  複数のファイルを同時にアップロードできます
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface FileSummaryProps {
  files: ParsedFile[];
}

export function FileSummary({ files }: FileSummaryProps) {
  if (files.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 space-y-3">
      <h3 className="text-lg font-semibold text-gray-800">アップロードされたファイル</h3>
      <div className="space-y-2">
        {files.map((file, index) => (
          <div
            key={index}
            className={`flex items-center space-x-3 p-3 rounded-lg border ${
              file.error 
                ? 'border-red-200 bg-red-50' 
                : 'border-green-200 bg-green-50'
            }`}
          >
            {file.error ? (
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            ) : (
              <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
            )}
            <FileText className="h-5 w-5 text-gray-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {file.filename}
              </p>
              {file.error ? (
                <p className="text-sm text-red-600">{file.error}</p>
              ) : (
                <p className="text-sm text-gray-600">
                  セッション: {file.sessionName} | 
                  データポイント: {file.data.t?.length || 0} | 
                  ラップ数: {new Set(file.data.lap || []).size}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
