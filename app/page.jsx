'use client';

import { useState } from 'react';

export default function Home() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [documentId, setDocumentId] = useState(null);
  const [checking, setChecking] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setDocumentId(data.document_id);
      alert('✅ Upload successful! Processing started. Click "Check Status" to see results.');
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const checkStatus = async () => {
    if (!documentId) {
      setError('No document ID');
      return;
    }

    setChecking(true);
    setError(null);

    try {
      const response = await fetch(`/api/document/${documentId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch document');
      }

      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">🤖 AI Document Intelligence System</h1>
        <p className="text-gray-600 mb-8">Upload documents for OCR, classification & extraction</p>

        {/* Upload Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Upload Document</h2>
          
          <div className="mb-4">
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          {file && (
            <p className="text-sm text-gray-600 mb-4">
              Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
            </p>
          )}

          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {uploading ? 'Uploading...' : 'Upload & Process'}
          </button>
        </div>

        {/* Check Status Section */}
        {documentId && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Check Processing Status</h2>
            <p className="text-sm text-gray-600 mb-4">Document ID: {documentId}</p>
            
            <button
              onClick={checkStatus}
              disabled={checking}
              className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
            >
              {checking ? 'Checking...' : 'Check Status'}
            </button>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Results Display */}
        {result && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">📄 Results</h2>
            
            {/* Document Info */}
            <div className="mb-4 p-4 bg-gray-50 rounded">
              <p><strong>Status:</strong> <span className={`px-2 py-1 rounded text-sm ${
                result.document.status === 'processed' ? 'bg-green-100 text-green-800' :
                result.document.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                result.document.status === 'failed' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>{result.document.status}</span></p>
              <p><strong>Type:</strong> {result.document.document_type || 'Unknown'}</p>
              <p><strong>Filename:</strong> {result.document.filename}</p>
            </div>

            {/* Structured Result */}
            {result.document.structured_result && (
              <div className="mb-4">
                <h3 className="font-semibold mb-2">🎯 Extracted Data:</h3>
                <pre className="bg-gray-900 text-green-400 p-4 rounded overflow-x-auto text-sm">
                  {JSON.stringify(result.document.structured_result, null, 2)}
                </pre>
              </div>
            )}

            {/* Extracted Fields */}
            {result.extracted_fields && result.extracted_fields.length > 0 && (
              <div className="mb-4">
                <h3 className="font-semibold mb-2">📋 Fields:</h3>
                <div className="space-y-2">
                  {result.extracted_fields.map((field, idx) => (
                    <div key={idx} className="flex justify-between p-2 bg-blue-50 rounded">
                      <span className="font-medium">{field.field_name}:</span>
                      <span>{field.field_value} ({field.confidence}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Job Status */}
            {result.job && (
              <div className="mb-4 p-4 bg-purple-50 rounded">
                <p><strong>Job Status:</strong> {result.job.status}</p>
                <p><strong>Progress:</strong> {result.job.progress}%</p>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 p-6 bg-blue-50 rounded-lg">
          <h3 className="font-semibold mb-2">📝 Instructions:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
            <li>Upload an invoice, receipt, CV, or ID card image</li>
            <li>Wait for upload confirmation</li>
            <li>Click &quot;Check Status&quot; to see results (may take 10-30 seconds)</li>
            <li>View extracted text, document type, and key fields</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
