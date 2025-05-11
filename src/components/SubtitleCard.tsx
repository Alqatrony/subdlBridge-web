// SubtitleCard.tsx
import type { SubtitleResult } from '../services/subdl'

interface Props { 
  subtitle: SubtitleResult; 
  onAdd: () => void;
  alreadyAdded?: boolean;
}

export default function SubtitleCard({ subtitle, onAdd, alreadyAdded = false }: Props) {
  const display = subtitle.release_name || subtitle.name ||`ID ${subtitle.subtitle_id ?? subtitle.sd_id ?? '—'}`
  
  return (
    <div className="w-full bg-white rounded-lg shadow dark:border mb-4 dark:bg-gray-800 dark:border-gray-700">
      <div className="p-4 space-y-3">
        <div className="flex justify-between items-start">
          <h2 className="text-lg font-semibold leading-tight tracking-tight text-gray-900 dark:text-white truncate" title={display}>
            {display}
          </h2>
          <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
            {subtitle.lang}
          </span>
        </div>
        
        <div className="space-y-1">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <span className="font-medium">ID:</span> {subtitle.sd_id}
          </p>
        </div>
        
        <div className="flex justify-between items-center pt-2">
          <a 
            href={subtitle.download_link} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-primary-600 hover:underline dark:text-primary-500"
          >
            Direct Download
          </a>
          
          <button 
            onClick={onAdd}
            disabled={alreadyAdded}
            className={`${
              alreadyAdded 
                ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed' 
                : 'bg-primary-600 hover:bg-primary-700 dark:bg-primary-600 dark:hover:bg-primary-700'
            } text-white focus:ring-4 focus:outline-none focus:ring-primary-300 font-medium rounded-lg text-sm px-4 py-2 text-center dark:focus:ring-primary-800`}
          >
            {alreadyAdded ? 'Added to List' : '+ Add to My List'}
          </button>
        </div>
      </div>
    </div>
  )
}