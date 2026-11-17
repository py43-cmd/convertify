import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { toast } from "sonner";
import "./index.css";
import PdfConverter from "./pdf/PdfConverter";
import { apiUrl } from "./lib/api";
import { Sparkles, LogOut, ChevronDown, User } from "lucide-react";

// Auth modal is only needed after a user clicks Log in / Sign up.
const AuthModal = lazy(() => import("./components/AuthModal"));

const words = ["PDF", "Word", "MergePDF", "Document"];

function App() {
  const [wordIndex, setWordIndex] = useState(0);
  const [user, setUser] = useState(null);           // null = not logged in
  const [authLoading, setAuthLoading] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [authModal, setAuthModal] = useState(null); // null | "login" | "signup"
  const profileRef = useRef(null);

  // Rotate hero words
  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((current) => (current + 1) % words.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  // Check if a session is active on mount
  useEffect(() => {
    fetch(apiUrl("/api/auth/user"), { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setUser(data);
        setAuthLoading(false);
      })
      .catch(() => setAuthLoading(false));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("auth") === "failed") {
      toast.error("Google sign-in failed. Please try again.");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => {
    await fetch(apiUrl("/api/auth/logout"), { method: "POST", credentials: "include" });
    setUser(null);
    setProfileOpen(false);
  };

  return (
    <div className="min-h-screen relative bg-[#FAFAFA] dark:bg-[#0B1121] text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30 overflow-x-hidden">

      {/* Background grid */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] dark:bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[400px] w-[600px] rounded-full bg-indigo-400 dark:bg-indigo-600/30 opacity-15 blur-[120px]"></div>
      </div>

      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <header className="w-full border-b border-slate-200/50 dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">

          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer group">
            <div className="flex items-center justify-center p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl text-white shadow-lg shadow-indigo-500/30 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
              <Sparkles size={24} className="fill-white group-hover:animate-pulse" />
            </div>
            <span className="font-black text-2xl md:text-3xl tracking-tight text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              Convertify<span className="text-indigo-600 dark:text-indigo-400 animate-pulse">.</span>
            </span>
          </div>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-8 text-base font-bold text-slate-700 dark:text-slate-200">
            <a href="#tools" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Tools</a>
            <span className="cursor-default">Pricing</span>
            <span className="cursor-default">API</span>
          </nav>

          {/* Auth Section */}
          <div className="flex items-center gap-3">
            {authLoading ? (
              <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
            ) : user ? (
              /* ── Logged-in: Profile Dropdown ───────────────────────────── */
              <div className="relative" ref={profileRef}>
                <button
                  id="profile-menu-btn"
                  onClick={() => setProfileOpen((o) => !o)}
                  className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 transition-all duration-200 group"
                >
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full object-cover ring-2 ring-indigo-500/40" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                      <User size={16} className="text-white" />
                    </div>
                  )}
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 hidden sm:block max-w-[120px] truncate">
                    {user.name.split(" ")[0]}
                  </span>
                  <ChevronDown size={14} className={`text-slate-500 transition-transform duration-200 ${profileOpen ? "rotate-180" : ""}`} />
                </button>

                {/* Dropdown */}
                {profileOpen && (
                  <div className="absolute right-0 top-12 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-3 py-3 border-b border-slate-100 dark:border-slate-800 mb-2">
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{user.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                    </div>
                    <button
                      id="logout-btn"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors"
                    >
                      <LogOut size={15} />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* ── Logged-out: Login / Sign up ── */
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  id="login-btn"
                  onClick={() => setAuthModal("login")}
                  className="px-3 sm:px-4 py-2 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  Log in
                </button>
                <button
                  id="signup-btn"
                  onClick={() => setAuthModal("signup")}
                  className="px-3 sm:px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl text-sm font-bold text-white hover:shadow-lg hover:shadow-indigo-500/30 hover:-translate-y-0.5 transition-all duration-200"
                >
                  Sign up
                </button>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <div className="md:hidden flex items-center">
            <div className="p-2 space-y-1.5 cursor-pointer">
              <div className="w-6 h-0.5 bg-slate-800 dark:bg-slate-200"></div>
              <div className="w-6 h-0.5 bg-slate-800 dark:bg-slate-200"></div>
              <div className="w-4 h-0.5 bg-slate-800 dark:bg-slate-200"></div>
            </div>
          </div>
        </div>
      </header>

      {/* ─── Main ───────────────────────────────────────────────────────────── */}
      <main className="flex-1 w-full flex flex-col items-center justify-center p-6 py-16 md:py-28 relative z-10">
        <div id="tools" className="w-full max-w-4xl relative z-10 scroll-mt-28">
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
                <div className="absolute inset-0 m-auto w-3/4 h-full bg-gradient-to-r from-indigo-500/0 via-purple-500/20 to-pink-500/0 blur-2xl rounded-full scale-150 animate-pulse pointer-events-none"></div>
              </span>

              <span className="animate-in fade-in slide-in-from-top-4 duration-1000 flex items-center gap-4 py-2">
                <span className="h-[2px] w-8 md:w-16 bg-gradient-to-r from-transparent to-slate-200 dark:to-slate-800"></span>
                <span className="text-slate-600 dark:text-slate-300 font-bold tracking-widest text-lg md:text-xl">TOOLS</span>
                <span className="h-[2px] w-8 md:w-16 bg-gradient-to-l from-transparent to-slate-200 dark:to-slate-800"></span>
              </span>
            </h1>
            <p className="text-xl md:text-2xl font-medium text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed animate-in fade-in duration-1000 delay-500">
              Effortlessly convert, merge, and edit your PDFs with blazingly fast and secure local processing.
            </p>
            {authLoading ? (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-800 animate-pulse text-sm font-semibold text-transparent">
                <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" />
                Checking authentication status...
              </div>
            ) : user ? (
              <p className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/60 dark:border-emerald-500/20 text-sm font-semibold text-emerald-700 dark:text-emerald-400 animate-in fade-in duration-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Logged in as {user.name} — all services unlocked
              </p>
            ) : (
              <p className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/20 text-sm font-semibold text-amber-700 dark:text-amber-400 animate-in fade-in duration-700">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                Authentication required — please sign in to use document services
              </p>
            )}
          </div>

          <PdfConverter user={user} setAuthModal={setAuthModal} authLoading={authLoading} />
        </div>
      </main>

      {/* ─── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="relative border-t border-slate-200/50 dark:border-slate-800/50 bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl pt-16 pb-8 overflow-hidden w-full">
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
              <h2 className="font-bold text-slate-900 dark:text-white">Product</h2>
              <ul className="space-y-3 text-sm font-medium text-slate-500 dark:text-slate-400">
                <li><a href="#tools" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors hover:translate-x-1 inline-block duration-200">Tools</a></li>
                <li><span className="inline-block">Pricing</span></li>
                <li><span className="inline-block">Enterprise</span></li>
                <li><span className="inline-block">Developer API</span></li>
              </ul>
            </div>
            <div className="space-y-5">
              <h2 className="font-bold text-slate-900 dark:text-white">Company</h2>
              <ul className="space-y-3 text-sm font-medium text-slate-500 dark:text-slate-400">
                <li><span className="inline-block">About Us</span></li>
                <li><span className="inline-block">Blog</span></li>
                <li><span className="inline-block">Careers</span></li>
                <li><span className="inline-block">Contact</span></li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-slate-200/50 dark:border-slate-800/50 text-sm font-medium text-slate-500 dark:text-slate-400">
            <p>© {new Date().getFullYear()} Convertify Inc. All rights reserved.</p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <span>Terms of Service</span>
              <span>Privacy Policy</span>
              <span>Cookies</span>
            </div>
          </div>
        </div>
      </footer>

      {authModal && (
        <Suspense fallback={null}>
          <AuthModal
            mode={authModal}
            onClose={() => setAuthModal(null)}
            onSuccess={setUser}
            onSwitchMode={setAuthModal}
          />
        </Suspense>
      )}
    </div>
  );
}

export default App;
