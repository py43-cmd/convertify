import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Lock } from "lucide-react";

import ToolTabs from "./ToolTabs";
import UploadCard from "./UploadCard";
import FileList from "./FileList";
import ActionButton from "./ActionButton";
import { buildDownloadName, saveBlob, submitConversion, validateSelection, MAX_MERGE_FILES, MAX_UPLOAD_BYTES } from "@/lib/download";
import { apiUrl } from "@/lib/api";

const ENDPOINTS = {
    merge: apiUrl("/api/merge"),
    "word-to-pdf": apiUrl("/api/word-to-pdf"),
    "pdf-to-word": apiUrl("/api/pdf-to-word"),
};

export default function PdfConverter({ user, setAuthModal, authLoading }) {
    const [files, setFiles] = useState([]);
    const [activeTool, setActiveTool] = useState("merge");
    const [loading, setLoading] = useState(false);

    const handleFileSelect = (e) => {
        const { files: selectedFiles, error } = validateSelection(
            e.target.files,
            activeTool,
            { maxBytes: MAX_UPLOAD_BYTES, maxMergeFiles: MAX_MERGE_FILES, existingCount: files.length }
        );

        if (error) {
            toast.error(error);
            return;
        }

        if (selectedFiles.length === 0) return;

        if (activeTool === "merge") {
            setFiles((prev) => [...prev, ...selectedFiles]);
            toast.success(`Added ${selectedFiles.length} file${selectedFiles.length === 1 ? "" : "s"} for merging.`);
        } else {
            setFiles(selectedFiles);
            toast.success("File ready for conversion.");
        }
    };

    const removeFile = (index) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const handleConvert = async () => {
        if (files.length === 0) {
            toast.error("Please upload a file first.");
            return;
        }

        if (activeTool === "merge" && files.length < 2) {
            toast.error("Please upload at least 2 files to merge.");
            return;
        }

        if (loading) return;

        setLoading(true);
        const id = toast.loading("Uploading and processing your files...");

        const formData = new FormData();
        const endpoint = ENDPOINTS[activeTool];

        if (activeTool === "merge") {
            files.forEach((file) => formData.append("files", file));
        } else {
            formData.append("file", files[0]);
        }

        try {
            const fallbackName = buildDownloadName(activeTool, files[0]?.name || "document");
            const { blob, filename } = await submitConversion({ endpoint, formData, fallbackName });
            saveBlob({ blob, filename });
            setFiles([]);
            toast.success("All done! Your file is downloading.", { id });
        } catch (error) {
            console.error("Conversion error:", error);
            toast.error(error.message || "An error occurred during conversion.", { id });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="shadow-[0_20px_50px_-12px_rgba(99,102,241,0.15)] dark:shadow-[0_20px_50px_-12px_rgba(99,102,241,0.05)] border-white/40 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl ring-1 ring-slate-900/5 dark:ring-white/5 w-full rounded-3xl overflow-hidden relative z-20">
            {/* Decorative Top Accent Line */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

            <CardHeader className="text-center pb-2 pt-8">
                <CardTitle className="text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-br from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                    {activeTool === "merge" ? "Merge PDFs" : activeTool === "word-to-pdf" ? "Word to PDF Converter" : "PDF to Word Converter"}
                </CardTitle>
                <CardDescription className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-2 text-base">
                    Select the ideal mode, drop your files below, and let the magic happen.
                </CardDescription>
            </CardHeader>

            <CardContent className="p-4 md:p-8 pt-4">
                <ToolTabs
                    activeTool={activeTool}
                    setActiveTool={(tool) => {
                        setActiveTool(tool);
                        setFiles([]); // Reset files on tool switch
                    }}
                />

                <div className="space-y-6">
                    {authLoading ? (
                        <div className="border border-slate-200/50 dark:border-slate-800/50 rounded-[20px] bg-white/40 dark:bg-slate-900/40 p-12 text-center backdrop-blur-md flex flex-col items-center justify-center min-h-[280px]">
                            <div className="w-12 h-12 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin mb-4" />
                            <p className="text-slate-500 dark:text-slate-400 font-semibold">Verifying session...</p>
                        </div>
                    ) : user ? (
                        <>
                            <UploadCard
                                activeTool={activeTool}
                                handleFileSelect={handleFileSelect}
                                filesCount={files.length}
                            />

                            <FileList
                                files={files}
                                removeFile={removeFile}
                                activeTool={activeTool}
                            />

                            <ActionButton
                                files={files}
                                loading={loading}
                                handleConvert={handleConvert}
                                activeTool={activeTool}
                            />
                        </>
                    ) : (
                        <div className="border border-slate-200/60 dark:border-slate-800/60 rounded-3xl bg-gradient-to-b from-slate-50/80 to-white/90 dark:from-slate-950/30 dark:to-slate-900/40 p-8 md:p-12 text-center relative overflow-hidden backdrop-blur-xl shadow-lg border-dashed">
                            {/* Ambient background glow */}
                            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full blur-[60px] opacity-20 pointer-events-none" />

                            <div className="flex flex-col items-center justify-center gap-6 relative z-10">
                                <div className="p-5 bg-gradient-to-tr from-indigo-500 to-purple-600 text-white rounded-2xl shadow-xl shadow-indigo-500/20 animate-bounce duration-[3000ms] relative">
                                    <Lock className="w-8 h-8" strokeWidth={2.5} />
                                    <span className="absolute -inset-1 rounded-2xl bg-indigo-500/30 blur animate-ping duration-[2500ms]" />
                                </div>

                                <div className="space-y-2.5 max-w-md mx-auto">
                                    <h2 className="text-2xl font-extrabold bg-gradient-to-r from-slate-950 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                                        Unlock Document Tools
                                    </h2>
                                    <p className="text-sm md:text-base font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                                        Join Convertify to convert Word files to PDF, merge documents, or extract content. Sign in to get started instantly.
                                    </p>
                                </div>

                                <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-xs mt-2">
                                    <button
                                        id="unlock-login-btn"
                                        onClick={() => setAuthModal("login")}
                                        className="w-full px-5 py-3.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl text-sm font-bold text-white hover:shadow-lg hover:shadow-indigo-500/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
                                    >
                                        Log In
                                    </button>
                                    <button
                                        id="unlock-signup-btn"
                                        onClick={() => setAuthModal("signup")}
                                        className="w-full px-5 py-3.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 border border-slate-200/60 dark:border-slate-700/60"
                                    >
                                        Create Account
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}