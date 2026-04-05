export default function CalendarPage() {
  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">Calendar</h1>
        <p className="text-gray-400 mb-8">
          AI scheduling – type a meeting in plain English
        </p>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
          <p className="text-4xl mb-3">📅</p>
          <p className="text-white font-medium">No events yet</p>
          <p className="text-gray-400 text-sm mt-1">
            Try: &quot;Meet Priya tomorrow at 3pm&quot;
          </p>
        </div>
      </div>
    </div>
  );
}
