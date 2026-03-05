import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, FileText, File as FileIcon, Type } from "lucide-react";

export default function FileList({ files, removeFile }) {
    if (!files.length) return null;

    const getIcon = (fileName) => {
        if (fileName.toLowerCase().endsWith('.pdf')) return <FileIcon className="text-red-500 w-5 h-5" />;
        if (fileName.toLowerCase().endsWith('.doc') || fileName.toLowerCase().endsWith('.docx')) return <Type className="text-blue-500 w-5 h-5" />;
        return <FileText className="text-slate-500 w-5 h-5" />;
    };

    return (
        <Card className="mt-6 border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/60 backdrop-blur-sm rounded-2xl shadow-sm overflow-hidden">
            <CardContent className="p-5">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm tracking-tight">
                        Selected {files.length === 1 ? 'File' : 'Files'}
                    </h3>
                    <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 font-bold px-3 py-0.5 rounded-full shadow-inner pointer-events-none">
                        {files.length}
                    </Badge>
                </div>

                <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-600 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full">
                    {files.map((file, index) => (
                        <div
                            key={index}
                            className="flex justify-between items-center group bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 p-3 rounded-xl hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800/60 transition-all duration-300"
                        >
                            <div className="flex items-center gap-4 overflow-hidden">
                                <div className="p-2.5 bg-slate-50 dark:bg-slate-900 shadow-inner rounded-xl group-hover:scale-110 transition-transform">
                                    {getIcon(file.name)}
                                </div>
                                <div className="flex flex-col overflow-hidden">
                                    <span className="truncate max-w-[170px] sm:max-w-[280px] md:max-w-[340px] text-sm font-semibold text-slate-700 dark:text-slate-200">
                                        {file.name}
                                    </span>
                                    <span className="text-xs font-medium text-slate-400 dark:text-slate-500 font-mono tracking-tight mt-0.5">
                                        {(file.size / 1024 / 1024).toFixed(2)} MB
                                    </span>
                                </div>
                            </div>

                            <button
                                onClick={() => removeFile(index)}
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                                <X size={18} strokeWidth={3} />
                            </button>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}