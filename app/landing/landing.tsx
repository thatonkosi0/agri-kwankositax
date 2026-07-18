import { ColoredText } from "@/components/ui/colored-text"
import Image from "next/image"
import Link from "next/link"

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50">
      <header className="py-6 px-4 md:px-8 bg-white/90 backdrop-blur-xl shadow-lg border-b border-gradient-to-r from-pink-200 to-indigo-200 fixed w-full z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative">
              <Image
                src="/logo/256.png"
                alt="Logo"
                width={32}
                height={32}
                className="h-8 group-hover:scale-110 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-pink-600 to-indigo-600 rounded-full opacity-20 blur-md group-hover:opacity-40 transition-opacity duration-300" />
            </div>
            <ColoredText className="text-2xl font-bold">Agri-KwankosiTax</ColoredText>
          </Link>
          <Link
            href="/enter"
            className="cursor-pointer font-medium px-4 py-2 rounded-full border-2 border-gradient-to-r from-pink-300 to-indigo-300 hover:from-pink-400 hover:to-indigo-400 bg-white/80 hover:bg-white transition-all duration-300 hover:scale-105 text-xs md:text-sm"
          >
            Log In
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-16 px-8 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-br from-pink-100/50 via-purple-100/30 to-indigo-100/50" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-r from-pink-400 to-indigo-400 rounded-full opacity-10 blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-r from-indigo-400 to-pink-400 rounded-full opacity-10 blur-3xl animate-pulse" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-12">
            <div className="inline-block px-6 py-3 rounded-full border-2 border-pink-600/50 text-sm font-medium mb-6 shadow-lg hover:shadow-xl transition-all duration-300">
              🚀 Under Active Development
            </div>
            <h1 className="text-5xl font-bold tracking-tight sm:text-6xl mb-6 bg-gradient-to-r from-gray-900 via-pink-700 to-indigo-700 bg-clip-text text-transparent pb-2">
              Let AI finally care about your taxes, scan your receipts and analyze your expenses
            </h1>
            <p className="text-xl text-gray-700 mb-8 max-w-2xl mx-auto font-medium">
              Self-hosted accounting app crafted for freelancers, indie-hackers and small businesses
            </p>
            <div className="flex gap-4 justify-center text-sm md:text-lg">
              <Link
                href="#start"
                className="px-8 py-4 bg-gradient-to-r from-pink-600 to-indigo-600 text-white font-bold rounded-full hover:from-pink-700 hover:to-indigo-700 transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-110 border-2 border-white/20"
              >
                Get Started ✨
              </Link>
              <Link
                href="mailto:me@vas3k.com"
                className="px-8 py-4 border-2 border-gradient-to-r from-pink-300 to-indigo-300 text-gray-800 font-bold rounded-full hover:bg-gradient-to-r hover:from-pink-50 hover:to-indigo-50 transition-all duration-300 hover:scale-105 bg-white/80"
              >
                Contact Us 💌
              </Link>
            </div>
          </div>
          <div className="relative aspect-auto rounded-3xl overflow-hidden shadow-2xl ring-4 ring-gradient-to-r from-pink-200 to-indigo-200">
            <div className="absolute inset-0 bg-gradient-to-b from-pink-500/5 via-purple-500/5 to-indigo-500/10 z-10" />
            <video className="w-full h-auto" autoPlay loop muted playsInline poster="/landing/ai-scanner-big.webp">
              <source src="/landing/video.mp4" type="video/mp4" />
              <Image src="/landing/ai-scanner-big.webp" alt="Agri-KwankosiTax" width={1728} height={1080} priority />
            </video>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-8 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-white/50 to-indigo-50/50" />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <h2 className="flex flex-col gap-3 mb-4">
              <span className="text-6xl font-bold bg-gradient-to-r from-pink-600 to-indigo-600 bg-clip-text text-transparent">
                F∗ck Taxes
              </span>
              <span className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                Agri-KwankosiTax saves you time, money and nerves
              </span>
            </h2>
          </div>

          {/* AI Scanner Feature */}
          <div className="flex flex-wrap items-center gap-12 mb-20 bg-gradient-to-br from-white via-pink-50/30 to-indigo-50/30 p-8 rounded-3xl shadow-xl ring-2 ring-gradient-to-r from-pink-200 to-indigo-200 hover:shadow-2xl transition-all duration-500 group">
            <div className="flex-1 min-w-60">
              <div className="inline-block px-4 py-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-bold mb-4 shadow-lg">
                🤖 LLM-Powered
              </div>
              <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent">
                Analyze photos and invoices with AI
              </h3>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-center">
                  <span className="text-blue-600 mr-3 text-lg">✨</span>
                  Upload your receipts or invoices in PDF for automatic recognition
                </li>
                <li className="flex items-center">
                  <span className="text-blue-600 mr-3 text-lg">✨</span>
                  Extract key information like dates, items, and vendors
                </li>
                <li className="flex items-center">
                  <span className="text-blue-600 mr-3 text-lg">✨</span>
                  Works with any language and any photo quality
                </li>
                <li className="flex items-center">
                  <span className="text-blue-600 mr-3 text-lg">✨</span>
                  Automatically organize everything into a structured database
                </li>
                <li className="flex items-center">
                  <span className="text-blue-600 mr-3 text-lg">✨</span>
                  Bulk upload and analyze multiple files at once
                </li>
              </ul>
            </div>
            <div className="flex-1 relative aspect-auto rounded-3xl overflow-hidden shadow-2xl ring-4 ring-gradient-to-r from-blue-200 to-indigo-200 hover:scale-105 transition-all duration-500">
              <Image src="/landing/ai-scanner.webp" alt="AI Document Analyzer" width={1900} height={1524} />
              {/* Animated "scanning" beam that sweeps up and down over the document */}
              <div className="pointer-events-none absolute left-0 right-0 top-0 h-1.5 bg-emerald-400/90 shadow-[0_0_22px_7px_rgba(52,211,153,0.8)] animate-scanline" />
            </div>
          </div>

          {/* Multi-currency Feature */}
          <div className="flex flex-wrap items-center gap-12 mb-20 bg-gradient-to-br from-white via-green-50/30 to-emerald-50/30 p-8 rounded-3xl shadow-xl ring-2 ring-gradient-to-r from-green-200 to-emerald-200 hover:shadow-2xl transition-all duration-500 group flex-row-reverse">
            <div className="flex-1 min-w-60">
              <div className="inline-block px-4 py-2 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-bold mb-4 shadow-lg">
                💱 Currency Converter
              </div>
              <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-green-700 to-emerald-700 bg-clip-text text-transparent">
                Automatically convert currencies (even crypto!)
              </h3>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-center">
                  <span className="text-green-600 mr-3 text-lg">💰</span>
                  Detects foreign currencies and converts it to yours
                </li>
                <li className="flex items-center">
                  <span className="text-green-600 mr-3 text-lg">💰</span>
                  Knows historical exchange rates on a date of transaction
                </li>
                <li className="flex items-center">
                  <span className="text-green-600 mr-3 text-lg">💰</span>
                  Supports 170+ world currencies
                </li>
                <li className="flex items-center">
                  <span className="text-green-600 mr-3 text-lg">💰</span>
                  Works with popular cryptocurrencies (BTC, ETH, LTC, etc.)
                </li>
                <li className="flex items-center">
                  <span className="text-green-600 mr-3 text-lg">💰</span>
                  Still allows you to fill it manually
                </li>
              </ul>
            </div>
            <div className="flex-1 relative aspect-auto rounded-3xl overflow-hidden shadow-2xl ring-4 ring-gradient-to-r from-green-200 to-emerald-200 hover:scale-105 transition-all duration-500">
              <Image src="/landing/multi-currency.webp" alt="Currency Converter" width={1400} height={1005} />
            </div>
          </div>

          {/* Transaction Table Feature */}
          <div className="flex flex-wrap items-center gap-12 mb-20 bg-gradient-to-br from-white via-pink-50/30 to-rose-50/30 p-8 rounded-3xl shadow-xl ring-2 ring-gradient-to-r from-pink-200 to-rose-200 hover:shadow-2xl transition-all duration-500 group flex-row-reverse">
            <div className="flex-1 relative aspect-auto rounded-3xl overflow-hidden shadow-2xl ring-4 ring-gradient-to-r from-pink-200 to-rose-200 hover:scale-105 transition-all duration-500">
              <Image src="/landing/transactions.webp" alt="Transactions Table" width={2000} height={1279} />
            </div>
            <div className="flex-1  min-w-60">
              <div className="inline-block px-4 py-2 rounded-full bg-gradient-to-r from-pink-500 to-rose-600 text-white text-sm font-bold mb-4 shadow-lg">
                🔍 Filters & Categories
              </div>
              <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-pink-700 to-rose-700 bg-clip-text text-transparent">
                Organize your transactions using fully customizable categories, projects and fields
              </h3>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-center">
                  <span className="text-pink-600 mr-3 text-lg">📊</span>
                  Absolute freedom to create custom categories, projects and fields
                </li>
                <li className="flex items-center">
                  <span className="text-pink-600 mr-3 text-lg">📊</span>
                  Add, edit and manage your transactions
                </li>
                <li className="flex items-center">
                  <span className="text-pink-600 mr-3 text-lg">📊</span>
                  Filter by any column, category or date range
                </li>
                <li className="flex items-center">
                  <span className="text-pink-600 mr-3 text-lg">📊</span>
                  Customize which columns to show in the table
                </li>
                <li className="flex items-center">
                  <span className="text-pink-600 mr-3 text-lg">📊</span>
                  Import transactions from CSV
                </li>
              </ul>
            </div>
          </div>

          {/* Invoice Generator */}
          <div className="flex flex-wrap items-center gap-12 mb-20 bg-gradient-to-br from-white via-purple-50/30 to-indigo-50/30 p-8 rounded-3xl shadow-xl ring-2 ring-gradient-to-r from-purple-200 to-indigo-200 hover:shadow-2xl transition-all duration-500 group">
            <div className="max-w-sm flex-1 relative aspect-auto rounded-3xl overflow-hidden shadow-2xl ring-4 ring-gradient-to-r from-purple-200 to-indigo-200 hover:scale-105 transition-all duration-500">
              <Image src="/landing/invoice-generator.webp" alt="Invoice Generator" width={1800} height={1081} />
            </div>
            <div className="flex-1 min-w-60">
              <div className="inline-block px-4 py-2 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-sm font-bold mb-4 shadow-lg">
                📋 Invoice Generator
              </div>
              <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-purple-700 to-indigo-700 bg-clip-text text-transparent">
                Create custom invoices
              </h3>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-center">
                  <span className="text-purple-600 mr-3 text-lg">📄</span>
                  Advanced invoice generator to create any invoice in any language
                </li>
                <li className="flex items-center">
                  <span className="text-purple-600 mr-3 text-lg">📄</span>
                  Edit any field, even labels and titles
                </li>
                <li className="flex items-center">
                  <span className="text-purple-600 mr-3 text-lg">📄</span>
                  Export invoices to PDF or as transactions
                </li>
                <li className="flex items-center">
                  <span className="text-purple-600 mr-3 text-lg">📄</span>
                  Save invoices as templates to reuse them later
                </li>
                <li className="flex items-center">
                  <span className="text-purple-600 mr-3 text-lg">📄</span>
                  Native support for both included and excluded taxes (VAT, GST, etc.)
                </li>
              </ul>
            </div>
          </div>

          {/* Custom Fields & Categories */}
          <div className="flex flex-wrap items-center gap-12 mb-20 bg-gradient-to-br from-white via-violet-50/30 to-purple-50/30 p-8 rounded-3xl shadow-xl ring-2 ring-gradient-to-r from-violet-200 to-purple-200 hover:shadow-2xl transition-all duration-500 group">
            <div className="flex-1 min-w-60">
              <div className="inline-block px-4 py-2 rounded-full bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-bold mb-4 shadow-lg">
                🎨 Control over AI
              </div>
              <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-violet-700 to-purple-700 bg-clip-text text-transparent">
                Tune any LLM prompt to extract anything you need
              </h3>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-center">
                  <span className="text-violet-600 mr-3 text-lg">🔧</span>
                  Expand and improve your Agri-KwankosiTax instance with custom LLM prompts
                </li>
                <li className="flex items-center">
                  <span className="text-violet-600 mr-3 text-lg">🔧</span>
                  Create custom fields and categories and tell AI how to parse them for you
                </li>
                <li className="flex items-center">
                  <span className="text-violet-600 mr-3 text-lg">🔧</span>
                  Extract any additional information you need
                </li>
                <li className="flex items-center">
                  <span className="text-violet-600 mr-3 text-lg">🔧</span>
                  Automatically categorize by project or category
                </li>
                <li className="flex items-center">
                  <span className="text-violet-600 mr-3 text-lg">🔧</span>
                  Ask AI to assess risk level or any other criteria
                </li>
              </ul>
            </div>
            <div className="flex-1 relative aspect-auto rounded-3xl overflow-hidden shadow-2xl ring-4 ring-gradient-to-r from-violet-200 to-purple-200 hover:scale-105 transition-all duration-500">
              <Image src="/landing/custom-llm.webp" alt="Custom LLM promts" width={1800} height={1081} />
            </div>
          </div>

          {/* Data Export */}
          <div className="flex flex-wrap items-center gap-12 mb-20 bg-gradient-to-br from-white via-orange-50/30 to-amber-50/30 p-8 rounded-3xl shadow-xl ring-2 ring-gradient-to-r from-orange-200 to-amber-200 hover:shadow-2xl transition-all duration-500 group flex-row-reverse">
            <div className="flex-1 min-w-60">
              <div className="inline-block px-4 py-2 rounded-full bg-gradient-to-r from-orange-500 to-amber-600 text-white text-sm font-bold mb-4 shadow-lg">
                📦 Self-hosting & Data Export
              </div>
              <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-orange-700 to-amber-700 bg-clip-text text-transparent">
                Your Data — Your Rules
              </h3>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-center">
                  <span className="text-orange-600 mr-3 text-lg">📤</span>
                  Deploy your own instance of Agri-KwankosiTax for 100% privacy
                </li>
                <li className="flex items-center">
                  <span className="text-orange-600 mr-3 text-lg">📤</span>
                  Export your transactions to CSV for tax prep
                </li>
                <li className="flex items-center">
                  <span className="text-orange-600 mr-3 text-lg">📤</span>
                  Full-text search across documents and invoices
                </li>
                <li className="flex items-center">
                  <span className="text-orange-600 mr-3 text-lg">📤</span>
                  Download full data archive to migrate to another service. We don't take away or limit what you do with
                  your data
                </li>
              </ul>
            </div>
            <div className="flex-1 relative aspect-auto rounded-3xl overflow-hidden shadow-2xl ring-4 ring-gradient-to-r from-orange-200 to-amber-200 hover:scale-105 transition-all duration-500">
              <Image src="/landing/export.webp" alt="Export" width={1200} height={1081} />
            </div>
          </div>
        </div>
      </section>

      {/* Deployment Options */}
      <section
        id="start"
        className="py-20 px-8 bg-gradient-to-br from-white via-pink-50/20 to-indigo-50/20 scroll-mt-20 relative"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-pink-100/20 to-indigo-100/20" />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-pink-600 to-indigo-600 bg-clip-text text-transparent">
              Choose Your Version of Agri-KwankosiTax
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-16">
            {/* Self-Hosted Version */}
            <div className="bg-gradient-to-br from-white via-violet-50/50 to-indigo-50/50 p-8 rounded-3xl shadow-xl ring-2 ring-gradient-to-r from-violet-200 to-indigo-200 hover:shadow-2xl transition-all duration-500 group">
              <div className="inline-block px-4 py-2 rounded-full bg-gradient-to-r from-violet-500 to-indigo-600 text-white text-sm font-bold mb-6 shadow-lg">
                🏠 Use Your Own Server
              </div>
              <h3 className="text-2xl font-bold mb-4">
                <ColoredText>Self-Hosted Edition</ColoredText>
              </h3>
              <ul className="space-y-3 text-gray-700 mb-8">
                <li className="flex items-center">
                  <span className="text-indigo-600 mr-3 text-lg">🆓</span>
                  Free and Open Source
                </li>
                <li className="flex items-center">
                  <span className="text-indigo-600 mr-3 text-lg">🔒</span>
                  Complete control over your data
                </li>
                <li className="flex items-center">
                  <span className="text-indigo-600 mr-3 text-lg">🏗️</span>
                  Deploy at your own infrastructure or home server
                </li>
                <li className="flex items-center">
                  <span className="text-indigo-600 mr-3 text-lg">🔑</span>
                  Bring your own keys (OpenAI, Gemini, Mistral, etc.)
                </li>
              </ul>
              <Link
                href="https://github.com/vas3k/TaxHacker"
                target="_blank"
                className="block w-full text-center px-6 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold rounded-full hover:from-violet-700 hover:to-indigo-700 transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-110"
              >
                Github + Docker Compose 🐳
              </Link>
            </div>

            {/* Cloud Version */}
            <div className="bg-gradient-to-br from-white via-pink-50/50 to-purple-50/50 p-8 rounded-3xl shadow-xl ring-2 ring-gradient-to-r from-pink-200 to-purple-200 hover:shadow-2xl transition-all duration-500 group relative">
              <div className="inline-block px-4 py-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-white text-sm font-bold mb-6 shadow-lg">
                ☁️ We Host It For You
              </div>
              <h3 className="text-2xl font-bold mb-4">
                <ColoredText>Cloud Edition</ColoredText>
              </h3>
              <ul className="space-y-3 text-gray-700 mb-8">
                <li className="flex items-center">
                  <span className="text-purple-600 mr-3 text-lg">🎯</span>
                  SaaS version if you don't want to hassle with own servers and deployments
                </li>
                <li className="flex items-center">
                  <span className="text-purple-600 mr-3 text-lg">🤖</span>
                  We provide you with AI keys and storage
                </li>
                <li className="flex items-center">
                  <span className="text-purple-600 mr-3 text-lg">💳</span>
                  Yearly subscription plans. No hidden fees
                </li>
                <li className="flex items-center">
                  <span className="text-purple-600 mr-3 text-lg">🚀</span>
                  Automatic updates and new features
                </li>
              </ul>
              <button
                type="button"
                disabled
                className="block w-full text-center px-6 py-4 bg-gradient-to-r from-gray-300 to-gray-400 text-gray-700 font-bold rounded-full shadow-xl opacity-80 cursor-not-allowed"
              >
                Temporarily unavailable
              </button>
            </div>
          </div>
        </div>
      </section>


    </div>
  )
}
