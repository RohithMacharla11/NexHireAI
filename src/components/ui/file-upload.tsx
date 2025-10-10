
'use client';
import React from 'react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  id: string;
  children?: React.ReactNode;
  className?: string;
  accept?: string;
}

export function FileUpload({ onFileSelect, id, children, className, accept }: FileUploadProps) {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <label
      htmlFor={id}
      className={className}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <input
        id={id}
        type="file"
        className="sr-only"
        onChange={handleFileChange}
        accept={accept}
      />
      {children}
    </label>
  );
}
