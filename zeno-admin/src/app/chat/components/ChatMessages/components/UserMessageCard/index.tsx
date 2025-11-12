import React from 'react';
import Image from 'next/image';
import { FaFilePdf, FaFileAlt } from 'react-icons/fa';
import { UserMessageProps } from '../../../../../utils/types/chat';

export default function UserMessage({ text, files }: UserMessageProps) {
  return (
    <div className="flex justify-end mb-5">
      <div className="max-w-[50%]">
        {text && (
          <div className="bg-[#9FF8F8] text-black p-4 md:p-5 rounded-2xl rounded-br-none 
            break-words overflow-x-auto whitespace-pre-line
            text-base leading-relaxed 
            md:text-lg md:leading-normal 
            xl:text-xl xl:leading-relaxed 
            2xl:text-2xl 2xl:leading-normal
            max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg">
            {text}
          </div>
        )}

        {files && files.length > 0 && (
          <div className="flex flex-wrap gap-2.5 mt-2.5 justify-end">
            {files.map((item, idx) => (
              <div
                key={idx}
                className="bg-gray-100 text-gray-900 p-2.5 md:p-3 rounded-xl shadow-sm 
                  flex flex-col items-center text-center min-w-[80px] md:min-w-[96px]"
              >
                {item.file.type.startsWith("image/") ? (
                  <Image
                    src={item.previewUrl}
                    alt={item.file.name}
                    width={96}
                    height={96}
                    className="w-24 h-24 md:w-28 md:h-28 object-cover rounded-md mb-1.5 md:mb-2"
                  />
                ) : (
                  <div className="flex flex-col items-center mb-1.5 md:mb-2">
                    {item.file.type === 'application/pdf' ? (
                      <FaFilePdf size={28} className="text-red-500" />
                    ) : (
                      <FaFileAlt size={28} className="text-blue-500" />
                    )}
                  </div>
                )}
                <span className="text-xs font-medium text-gray-700 truncate px-1 
                  md:text-sm md:px-1.5">
                  {item.file.name}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}