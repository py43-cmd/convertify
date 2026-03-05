import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Files, FileText, HardDriveDownload } from "lucide-react";

export default function ToolTabs({ activeTool, setActiveTool }) {
    return (
        <Tabs value={activeTool} onValueChange={setActiveTool} className="w-full mb-8">
            <TabsList className="grid w-full grid-cols-3 p-1.5 h-auto bg-slate-100/80 dark:bg-slate-800/80 rounded-2xl backdrop-blur-md">
                <TabsTrigger
                    value="merge"
                    className="flex flex-col sm:flex-row items-center justify-center gap-2.5 py-3.5 px-4 rounded-[12px] text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-white/50 dark:hover:bg-slate-700/50 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 data-[state=active]:shadow transition-all"
                >
                    <Files className="w-4.5 h-4.5" />
                    <span className="font-semibold text-sm">Merge PDFs</span>
                </TabsTrigger>
                <TabsTrigger
                    value="word-to-pdf"
                    className="flex flex-col sm:flex-row items-center justify-center gap-2.5 py-3.5 px-4 rounded-[12px] text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-300 hover:bg-white/50 dark:hover:bg-slate-700/50 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-purple-600 dark:data-[state=active]:text-purple-400 data-[state=active]:shadow transition-all"
                >
                    <HardDriveDownload className="w-4.5 h-4.5" />
                    <span className="font-semibold text-sm">Word to PDF</span>
                </TabsTrigger>
                <TabsTrigger
                    value="pdf-to-word"
                    className="flex flex-col sm:flex-row items-center justify-center gap-2.5 py-3.5 px-4 rounded-[12px] text-slate-600 dark:text-slate-400 hover:text-pink-600 dark:hover:text-pink-300 hover:bg-white/50 dark:hover:bg-slate-700/50 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-pink-600 dark:data-[state=active]:text-pink-400 data-[state=active]:shadow transition-all"
                >
                    <FileText className="w-4.5 h-4.5" />
                    <span className="font-semibold text-sm">PDF to Word</span>
                </TabsTrigger>
            </TabsList>
        </Tabs>
    );
}
