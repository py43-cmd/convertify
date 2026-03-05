import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight } from "lucide-react";

export default function ActionButton({ files, loading, handleConvert, activeTool }) {
    if (!files.length) return null;

    // Theme color based on active tool
    const getGradient = () => {
        if (activeTool === 'merge') return 'bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 shadow-indigo-500/25';
        if (activeTool === 'word-to-pdf') return 'bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 shadow-purple-500/25';
        return 'bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 shadow-pink-500/25';
    };

    return (
        <div className="pt-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Button
                size="lg"
                disabled={loading}
                onClick={handleConvert}
                className={`w-full h-14 mt-4 text-white text-[15px] font-bold tracking-wide shadow-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl active:scale-[0.98] rounded-[14px] border-0
                    ${getGradient()}
                `}
            >
                {loading ? (
                    <>
                        <span className="relative flex h-3 w-3 mr-4">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                        </span>
                        Processing your file{files.length > 1 ? 's' : ''}...
                    </>
                ) : (
                    <>
                        {activeTool === 'merge' ? `Merge ${files.length} PDFs` : activeTool === 'word-to-pdf' ? 'Convert to PDF' : 'Convert to Word'}
                        <ArrowRight className="ml-2 h-5 w-5" strokeWidth={2.5} />
                    </>
                )}
            </Button>
        </div>
    );
}