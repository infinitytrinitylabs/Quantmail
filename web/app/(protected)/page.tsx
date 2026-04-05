import { auth } from "@/lib/auth";

export default async function InboxPage() {
  const session = await auth();
  const name = session?.user?.name ?? "there";

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">
            Good morning, {name.split(" ")[0]} 👋
          </h1>
          <p className="text-gray-400 mt-1">
            Your AI-powered inbox is ready.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            { label: "Unread", value: "0", color: "violet" },
            { label: "Starred", value: "0", color: "yellow" },
            { label: "Drafts", value: "0", color: "blue" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-gray-900 border border-gray-800 rounded-xl p-5"
            >
              <p className="text-gray-400 text-sm">{stat.label}</p>
              <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
            </div>
          ))}
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
          <p className="text-4xl mb-3">✉️</p>
          <p className="text-white font-medium">Your inbox is empty</p>
          <p className="text-gray-400 text-sm mt-1">
            Messages will appear here once your email is connected.
          </p>
        </div>
      </div>
    </div>
  );
}
