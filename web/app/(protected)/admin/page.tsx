import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function AdminPage() {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;

  if (role !== "ADMIN") {
    redirect("/");
  }

  const [userCount, totalKeys] = await Promise.all([
    prisma.user.count(),
    prisma.apiKey.count(),
  ]);

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
          <span className="px-2.5 py-1 rounded-lg bg-violet-900/60 text-violet-300 text-sm border border-violet-700/50">
            🛡️ ADMIN
          </span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            { label: "Total Users", value: String(userCount), icon: "👤" },
            { label: "API Keys Stored", value: String(totalKeys), icon: "🔑" },
            { label: "Active Sessions", value: "—", icon: "🔒" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-gray-900 border border-gray-800 rounded-xl p-5"
            >
              <div className="flex items-center gap-2 mb-2">
                <span>{stat.icon}</span>
                <p className="text-gray-400 text-sm">{stat.label}</p>
              </div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Global API Keys */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-1">
            🌐 Global Default API Keys
          </h2>
          <p className="text-gray-400 text-sm mb-4">
            These keys are used for users who haven&apos;t added their own. Set
            your platform defaults here.
          </p>
          <p className="text-gray-500 text-sm italic">
            Global key management UI coming in the next phase.
          </p>
        </div>
      </div>
    </div>
  );
}
