'use client';

import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import Image from 'next/image';
import { FaPaperclip, FaCamera, FaTimes, FaFilePdf, FaFileAlt } from 'react-icons/fa';
import { ChatInputProps } from '../../utils/types/chat';

export default function ChatInput({ conversationId, user, sendMessage, onRunCreated }: ChatInputProps) {
  const [input, setInput] = useState<string>('');
  const [filePreviews, setFilePreviews] = useState<{ file: File; previewUrl: string }[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [cameraSupported, setCameraSupported] = useState<boolean>(true);

  useEffect(() => {
    return () => {
      filePreviews.forEach(item => URL.revokeObjectURL(item.previewUrl));
    };
  }, [filePreviews]);

  const renderFilePreview = (item: { file: File; previewUrl: string }, index: number) => {
    const { file, previewUrl } = item;
    const isImage = file.type.startsWith('image/');
    return (
      <div
        key={index}
        className="flex items-center gap-2 bg-gray-800/60 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-white border border-gray-700/50"
      >
        {isImage ? (
          <Image
            src={previewUrl}
            alt={file.name}
            width={40}
            height={40}
            className="w-10 h-10 object-cover rounded-md border border-gray-600"
          />
        ) : (
          <div className="w-10 h-10 flex items-center justify-center bg-gray-700 rounded-md">
            {file.type === 'application/pdf' ? (
              <FaFilePdf size={18} className="text-red-400" />
            ) : (
              <FaFileAlt size={18} className="text-blue-400" />
            )}
          </div>
        )}
        <span className="truncate max-w-[120px] font-medium">{file.name}</span>
        <button
          type="button"
          onClick={() => {
            setFilePreviews((current) => {
              const removed = current[index];
              URL.revokeObjectURL(removed.previewUrl);
              return current.filter((_, i) => i !== index);
            });
          }}
          className="text-gray-400 hover:text-red-400 p-1 rounded-full transition-colors"
          aria-label="Remove file"
        >
          <FaTimes size={14} />
        </button>
      </div>
    );
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!user?.token) {
      alert("You must be logged in to send a message.");
      return;
    }
    if (isLoading) return;
    if (!input.trim() && filePreviews.length === 0) return;

    setIsLoading(true);

    try {
      const run = await sendMessage({
        conversationId: conversationId ?? null,
        userInput: input.trim(),
        files: filePreviews.length > 0 ? filePreviews.map(preview => preview.file) : [],
        filePreviews: filePreviews.length > 0 ? filePreviews : undefined,
      });
      if (run && onRunCreated) onRunCreated(run);
      setInput("");
      setFilePreviews([]);
    } catch {
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files ?? []) as File[];
    const validFiles = selectedFiles.filter((file) => {
      const isValidType = ['application/pdf', 'image/jpeg', 'image/png', 'text/plain'].includes(file.type);
      const isUnderLimit = file.size <= 10 * 1024 * 1024;
      return isValidType && isUnderLimit;
    });
    if (validFiles.length !== selectedFiles.length) {
      alert('Some files are invalid. Only PDF, JPEG, PNG, or text files under 10MB are allowed.');
    }
    const newPreviews = validFiles.map(file => ({
      file,
      previewUrl: URL.createObjectURL(file)
    }));
    setFilePreviews(prev => [...prev, ...newPreviews]);
    e.target.value = '';
  };

  const handleCameraCapture = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files ?? []) as File[];
    const validFiles = selectedFiles.filter((file) => {
      const isValidType = file.type.startsWith('image/');
      const isUnderLimit = file.size <= 2 * 1024 * 1024;
      return isValidType && isUnderLimit;
    });
    if (validFiles.length !== selectedFiles.length) {
      alert('Some images are invalid. Only JPEG or PNG files under 10MB are allowed from the camera.');
    }
    const newPreviews = validFiles.map(file => ({
      file,
      previewUrl: URL.createObjectURL(file)
    }));
    setFilePreviews(prev => [...prev, ...newPreviews]);
    e.target.value = '';
  };

  useEffect(() => {
    const checkCameraSupport = async () => {
      if (typeof navigator.mediaDevices !== 'undefined' && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          stream.getTracks().forEach((track) => track.stop());
        } catch {
          setCameraSupported(false);
        }
      } else {
        setCameraSupported(false);
      }
    };
    checkCameraSupport();
  }, []);

  return (
    <div className="w-full xl:max-w-3xl md:max-w-xl lg:max-w-2xl mx-auto space-y-1">
      {filePreviews.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4">
          {filePreviews.map((item, index) => renderFilePreview(item, index))}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="relative flex items-center w-full bg-blue-900/70 border border-cyan-400/50 rounded-full shadow-lg overflow-hidden py-1 pl-2 pr-1"
      >
        <button
          type="button"
          onClick={() => document.getElementById('file-upload')?.click()}
          disabled={isLoading}
          title="Upload File"
          className="text-cyan-400 hover:text-cyan-300 transition-colors rounded-full p-2 mr-1 cursor-pointer"
        >
          <FaPaperclip size={18} />
        </button>

        <button
          type="button"
          onClick={() => {
            const cameraInput = document.getElementById('camera-upload') as HTMLInputElement | null;
            if (cameraInput && cameraSupported) {
              cameraInput.click();
              setTimeout(() => {
                if (!cameraInput.value) {
                  alert('Camera access failed. Please check permissions.');
                }
              }, 2000);
            } else if (!cameraSupported) {
              alert('Camera not supported on this device.');
            }
          }}
          disabled={isLoading}
          title="Take Photo"
          className="text-cyan-400 hover:text-cyan-300 transition-colors rounded-full p-2 cursor-pointer"
        >
          <FaCamera size={18} />
        </button>

        <input
          type="file"
          id="file-upload"
          multiple
          onChange={handleFileChange}
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png,.txt"
          disabled={isLoading}
        />
        <input
          type="file"
          id="camera-upload"
          capture="environment"
          accept="image/*"
          onChange={handleCameraCapture}
          className="hidden"
          disabled={isLoading}
        />

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Zeno"
          disabled={isLoading}
          className="flex-1 bg-transparent text-white placeholder-cyan-300 px-2 py-2 focus:outline-none"
        />

        <button
          type="submit"
          disabled={isLoading || (!input.trim() && filePreviews.length === 0)}
          className="mr-2 bg-cyan-500 rotate-45 hover:bg-cyan-400 text-white p-2 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          title="Send"
        >
          {isLoading ? (
            <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          )}
        </button>
      </form>

      <div className="text-sm text-gray-400 mt-2 text-center">
        Zeno AI can hallucinate, so double-check it
      </div>
    </div>
  );
}