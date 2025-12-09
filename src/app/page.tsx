"use client";

import Link from "next/link";
import { ErrorBoundary } from "@/components/ErrorBoundary";

interface DashboardCard {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  gradient: string;
  hoverBorder: string;
  iconBg: string;
}

const dashboardCards: DashboardCard[] = [
  {
    title: "Formatter",
    description: "Transform rough answers into clean, presentation-ready format",
    href: "/format",
    icon: (
      <svg
        className="h-8 w-8"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
        />
      </svg>
    ),
    gradient: "from-sky-500 to-sky-600",
    hoverBorder: "hover:border-sky-400",
    iconBg: "bg-sky-50",
  },
  {
    title: "MCQs Generator",
    description: "Generate high-quality multiple choice questions from study materials",
    href: "/mcq",
    icon: (
      <svg
        className="h-8 w-8"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
        />
      </svg>
    ),
    gradient: "from-purple-500 to-purple-600",
    hoverBorder: "hover:border-purple-400",
    iconBg: "bg-purple-50",
  },
  {
    title: "Concept Booster",
    description: "Adaptive learning engine for personalized understanding",
    href: "/concept-booster",
    icon: (
      <svg
        className="h-8 w-8"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 10V3L4 14h7v7l9-11h-7z"
        />
      </svg>
    ),
    gradient: "from-green-500 to-green-600",
    hoverBorder: "hover:border-green-400",
    iconBg: "bg-green-50",
  },
  {
    title: "Flashcard Generator",
    description: "Convert study material into perfectly structured flashcards",
    href: "/flashcards",
    icon: (
      <svg
        className="h-8 w-8"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
        />
      </svg>
    ),
    gradient: "from-indigo-500 to-indigo-600",
    hoverBorder: "hover:border-indigo-400",
    iconBg: "bg-indigo-50",
  },
  {
    title: "History",
    description: "View and manage your generated content history",
    href: "/history",
    icon: (
      <svg
        className="h-8 w-8"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    gradient: "from-amber-500 to-amber-600",
    hoverBorder: "hover:border-amber-400",
    iconBg: "bg-amber-50",
  },
  {
    title: "Settings",
    description: "Configure your preferences and manage your account",
    href: "/settings",
    icon: (
      <svg
        className="h-8 w-8"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
    gradient: "from-slate-500 to-slate-600",
    hoverBorder: "hover:border-slate-400",
    iconBg: "bg-slate-50",
  },
];

export default function Dashboard() {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="text-center mb-16">
          <div className="inline-flex items-center justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-sky-400 to-purple-500 rounded-full blur-2xl opacity-30"></div>
              <h1 className="relative text-6xl font-bold bg-gradient-to-r from-sky-600 to-purple-600 bg-clip-text text-transparent">
                BrainBolt
              </h1>
            </div>
            <span className="ml-3 text-4xl">⚡</span>
          </div>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Your AI-powered study companion for academic excellence
          </p>
        </header>

        {/* Dashboard Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {dashboardCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="group relative"
            >
              <div
                className={`
                  relative h-full rounded-2xl border-2 border-slate-200 bg-white
                  p-8 shadow-lg transition-all duration-300 ease-out
                  ${card.hoverBorder}
                  hover:shadow-2xl hover:shadow-slate-200/50
                  hover:-translate-y-1
                  overflow-hidden
                `}
              >
                {/* Gradient Background Effect */}
                <div
                  className={`
                    absolute inset-0 bg-gradient-to-br ${card.gradient}
                    opacity-0 group-hover:opacity-5 transition-opacity duration-300
                  `}
                />

                {/* Icon */}
                <div
                  className={`
                    relative mb-6 inline-flex items-center justify-center
                    w-16 h-16 rounded-xl ${card.iconBg}
                    text-slate-700
                    group-hover:scale-110 transition-transform duration-300
                  `}
                >
                  <div
                    className={`
                      absolute inset-0 bg-gradient-to-br ${card.gradient}
                      opacity-0 group-hover:opacity-10 rounded-xl
                      transition-opacity duration-300
                    `}
                  />
                  <div className="relative text-slate-600 group-hover:text-slate-900 transition-colors">
                    {card.icon}
                  </div>
                </div>

                {/* Content */}
                <div className="relative">
                  <h2 className="text-2xl font-bold text-slate-900 mb-3 group-hover:text-slate-800 transition-colors">
                    {card.title}
                  </h2>
                  <p className="text-slate-600 leading-relaxed group-hover:text-slate-700 transition-colors">
                    {card.description}
                  </p>
                </div>

                {/* Arrow Indicator */}
                <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div
                    className={`
                      flex items-center justify-center w-10 h-10 rounded-full
                      bg-gradient-to-br ${card.gradient} text-white
                      shadow-lg transform group-hover:scale-110 transition-transform
                    `}
                  >
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      />
                    </svg>
                  </div>
                </div>

                {/* Shine Effect on Hover */}
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none">
                  <div className="h-full w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"></div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Footer Stats */}
        <div className="mt-20 text-center">
          <div className="inline-flex items-center gap-8 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <svg
                className="h-5 w-5 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>AI-Powered</span>
            </div>
            <div className="flex items-center gap-2">
              <svg
                className="h-5 w-5 text-blue-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              <span>Secure & Private</span>
            </div>
            <div className="flex items-center gap-2">
              <svg
                className="h-5 w-5 text-purple-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              <span>Lightning Fast</span>
            </div>
          </div>
        </div>
        </main>
      </div>
    </ErrorBoundary>
  );
}
