"use client";

interface BrowserFrameProps {
  src: string;
  title?: string;
  className?: string;
}

export function BrowserFrame({
  src,
  title = "Browser Session",
  className = "",
}: BrowserFrameProps) {
  return (
    <div className={`rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}>
      <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 text-center">
          <span className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate">
            {title}
          </span>
        </div>
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-500 hover:text-blue-700 hover:underline shrink-0"
        >
          Open in new tab
        </a>
      </div>
      <iframe
        src={src}
        title={title}
        className="w-full h-[600px] bg-white"
        allow="clipboard-read; clipboard-write"
      />
    </div>
  );
}
