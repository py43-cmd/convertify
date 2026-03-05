import { Card, CardContent } from "@/components/ui/card";
import { UploadCloud } from "lucide-react";

export default function UploadCard({ activeTool, handleFileSelect }) {
    const isMultiple = activeTool === "merge";
    const acceptedFiles = activeTool === "merge" || activeTool === "pdf-to-word" ? ".pdf" : ".doc,.docx";

    return (
        <Card className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:border-indigo-500/80 dark:hover:bg-indigo-950/20 transition-all duration-300 group rounded-[20px] overflow-hidden cursor-pointer bg-white/40 dark:bg-slate-900/40 shadow-sm relative">
            <CardContent className="p-12 md:p-16 text-center relative">
                <input
                    type="file"
                    multiple={isMultiple}
                    accept={acceptedFiles}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    onChange={handleFileSelect}
                    title=""
                />

                <div className="flex flex-col items-center justify-center gap-5 transition-transform group-hover:scale-[1.02] duration-300 pointer-events-none z-0">
                    <div className="p-5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-full shadow-inner ring-4 ring-white dark:ring-slate-900 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300 relative">
                        <UploadCloud className="w-8 h-8 md:w-10 md:h-10" strokeWidth={2.5} />
                    </div>

                    <div className="space-y-1.5">
                        <p className="text-xl md:text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                            Drag & Drop files here
                        </p>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                            or click to browse from your device
                        </p>
                    </div>

                    <div className="mt-4 flex items-center justify-center gap-2">
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest shadow-sm">
                            {activeTool.replace(/-/g, " ")}
                        </span>
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest shadow-sm">
                            {acceptedFiles.replace(/\./g, "").toUpperCase()}
                        </span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}