import { useRef, useState } from 'react';

const MAX_FILE_SIZE = 1000 * 1024 * 1024; // 1 GB

interface UploadPanelProps {
  onUpload: (options: { file: File; resolution: string }) => void;
  isProcessing: boolean;
}

export default function UploadPanel({ onUpload, isProcessing }: UploadPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [resolution, setResolution] = useState<string>('720p');

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      alert('File too large, reduce size to less than 1 GB');
      if (fileInputRef.current) fileInputRef.current.value = '';
      setFileName(null);
      return;
    }
    setFileName(file.name);
  }

  function handleUploadClick(): void {
    if (isProcessing) {
      alert('Video currently processing, please wait to try again.');
      return;
    }
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      alert('Please select a video file first!');
      return;
    }
    onUpload({ file, resolution });
  }

  return (
    <div className="upload-panel">
      {/* Hidden real file input */}
      <input
        ref={fileInputRef}
        id="videoFile"
        type="file"
        accept="video/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Styled button that triggers the file input */}
      <button
        className="button primary"
        onClick={() => fileInputRef.current?.click()}
        disabled={isProcessing}
      >
        {fileName ?? 'Upload Video'}
      </button>

      <select
        id="resoSelect"
        value={resolution}
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setResolution(e.target.value)}
        disabled={isProcessing}
      >
        <option value="480p">480p</option>
        <option value="720p">720p</option>
        <option value="1080p">1080p</option>
      </select>

      <button
        className="button primary"
        onClick={handleUploadClick}
        disabled={isProcessing}
      >
        {isProcessing ? 'Processing...' : 'Analyse'}
      </button>
    </div>
  );
}
