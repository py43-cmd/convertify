import { useState, useEffect } from "react";
import "./index.css";
import PdfConverter from "./pdf/PdfConverter";
import { Sparkles } from "lucide-react";

function App() {
  const words = ["PDF", "Word", "MergePDF", "Document"];
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((current) => (current + 1) % words.length);
    }, 2500); // changes every 2.5 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen relative bg-[#FAFAFA] dark:bg-[#0B1121] text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30 overflow-x-hidden">

      {/* Exquisite minimal background grid */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] dark:bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)]"></div>
        {/* Soft top-glow */}
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[400px] w-[600px] rounded-full bg-indigo-400 dark:bg-indigo-600/30 opacity-15 blur-[120px]"></div>
      </div>

      {/* Header */}
      <header className="w-full border-b border-slate-200/50 dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group">
            <div className="flex items-center justify-center p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl text-white shadow-lg shadow-indigo-500/30 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
              <Sparkles size={24} className="fill-white group-hover:animate-pulse" />
            </div>
            <span className="font-black text-2xl md:text-3xl tracking-tight text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              Convertify<span className="text-indigo-600 dark:text-indigo-400 animate-pulse">.</span>
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-base font-bold text-slate-700 dark:text-slate-200">
            <a href="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Tools</a>
            <a href="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Pricing</a>
            <a href="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">API</a>
          </nav>
          <div className="md:hidden flex items-center">
            {/* Mobile menu placeholder */}
            <div className="p-2 space-y-1.5 cursor-pointer">
              <div className="w-6 h-0.5 bg-slate-800 dark:bg-slate-200"></div>
              <div className="w-6 h-0.5 bg-slate-800 dark:bg-slate-200"></div>
              <div className="w-4 h-0.5 bg-slate-800 dark:bg-slate-200"></div>
            </div>
          </div>
        </div>
      </header>

      {/* Main App Content */}
      <main className="flex-1 w-full flex flex-col items-center justify-center p-6 py-16 md:py-28 relative z-10">

        <div className="w-full max-w-4xl relative z-10">
          <div className="text-center mb-16 space-y-6">
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-slate-900 dark:text-white leading-[1.1] flex flex-col justify-center items-center uppercase py-4">
              <span className="animate-in fade-in slide-in-from-bottom-4 duration-1000">Powerful</span>

              {/* Dynamic Rotating Word Canvas */}
              <span className="relative h-[80px] md:h-[120px] w-full flex items-center justify-center overflow-hidden my-2 md:my-4">
                {words.map((word, i) => (
                  <span
                    key={word}
                    className={`absolute transition-all duration-[800ms] cubic-bezier(0.4, 0, 0.2, 1) bg-clip-text text-transparent ${i === 0 ? "bg-gradient-to-br from-red-500 via-rose-500 to-orange-500" :
                      i === 1 ? "bg-gradient-to-br from-blue-500 via-sky-500 to-cyan-500" :
                        i === 2 ? "bg-gradient-to-br from-emerald-400 via-teal-500 to-green-500" :
                          "bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500"
                      } drop-shadow-[0_0_20px_rgba(255,255,255,0.1)]`}
                    style={{
                      transform: wordIndex === i ? 'translateY(0) scale(1)' : wordIndex > i ? 'translateY(-150%) scale(0.8) rotateX(45deg)' : 'translateY(150%) scale(0.8) rotateX(-45deg)',
                      opacity: wordIndex === i ? 1 : 0,
                      filter: wordIndex === i ? 'blur(0px)' : 'blur(10px)',
                    }}
                  >
                    {word}
                  </span>
                ))}
                {/* Intense dynamic backglow */}
                <div className="absolute inset-0 m-auto w-3/4 h-full bg-gradient-to-r from-indigo-500/0 via-purple-500/20 to-pink-500/0 blur-2xl rounded-full scale-150 animate-pulse pointer-events-none"></div>
              </span>

              <span className="animate-in fade-in slide-in-from-top-4 duration-1000 flex items-center gap-4">
                <span className="text-slate-300 dark:text-slate-600">Tools</span>
              </span>
            </h1>
            <p className="text-xl md:text-2xl font-medium text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed animate-in fade-in duration-1000 delay-500">
              Effortlessly convert, merge, and edit your PDFs with blazingly fast and secure local processing.
            </p>
          </div>

          <PdfConverter />
        </div>
      </main>

      {/* Footer */}
      <footer className="relative border-t border-slate-200/50 dark:border-slate-800/50 bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl pt-16 pb-8 overflow-hidden w-full">
        {/* Subtle glow in footer */}
        <div className="absolute bottom-[-100px] left-1/4 w-[400px] h-[400px] bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="max-w-6xl mx-auto px-6 relative z-10 w-full">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="md:col-span-2 space-y-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/20">
                  <Sparkles size={18} className="text-white fill-white" />
                </div>
                <span className="font-bold text-xl text-slate-900 dark:text-white">Convertify.</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
                The most advanced, blazingly fast local PDF and Document processing platform designed to empower your workflow.
              </p>
            </div>

            <div className="space-y-5">
              <h4 className="font-bold text-slate-900 dark:text-white">Product</h4>
              <ul className="space-y-3 text-sm font-medium text-slate-500 dark:text-slate-400">
                <li><a href="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors hover:translate-x-1 inline-block duration-200">Tools</a></li>
                <li><a href="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors hover:translate-x-1 inline-block duration-200">Pricing</a></li>
                <li><a href="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors hover:translate-x-1 inline-block duration-200">Enterprise</a></li>
                <li><a href="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors hover:translate-x-1 inline-block duration-200">Developer API</a></li>
              </ul>
            </div>

            <div className="space-y-5">
              <h4 className="font-bold text-slate-900 dark:text-white">Company</h4>
              <ul className="space-y-3 text-sm font-medium text-slate-500 dark:text-slate-400">
                <li><a href="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors hover:translate-x-1 inline-block duration-200">About Us</a></li>
                <li><a href="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors hover:translate-x-1 inline-block duration-200">Blog</a></li>
                <li><a href="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors hover:translate-x-1 inline-block duration-200">Careers</a></li>
                <li><a href="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors hover:translate-x-1 inline-block duration-200">Contact</a></li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-slate-200/50 dark:border-slate-800/50 text-sm font-medium text-slate-500 dark:text-slate-400">
            <p>© {new Date().getFullYear()} Convertify Inc. All rights reserved.</p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <a href="#" className="hover:text-slate-900 dark:hover:text-white transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-slate-900 dark:hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-slate-900 dark:hover:text-white transition-colors">Cookies</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
