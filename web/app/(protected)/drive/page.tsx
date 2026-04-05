export default function DrivePage() {
  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">Drive</h1>
        <p className="text-gray-400 mb-8">
          AI semantic file search &amp; storage
        </p>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
          <p className="text-4xl mb-3">☁️</p>
          <p className="text-white font-medium">No files uploaded</p>
          <p className="text-gray-400 text-sm mt-1">
            Upload files and search them with natural language.
          </p>
        </div>
      </div>
    </div>
  );
}
