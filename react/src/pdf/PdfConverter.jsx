import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

import ToolTabs from "./ToolTabs";
import UploadCard from "./UploadCard";
import FileList from "./FileList";
import ActionButton from "./ActionButton";

export default function PdfConverter() {
    const [files, setFiles] = useState([]);
    const [activeTool, setActiveTool] = useState("merge");
    const [loading, setLoading] = useState(false);

    const handleFileSelect = (e) => {
        const selectedFiles = Array.from(e.target.files);
        const MAX_SIZE = 20 * 1024 * 1024; // 20MB

        if (selectedFiles.length === 0) return;

        // Check for oversized files
        const validFiles = selectedFiles.filter(file => file.size <= MAX_SIZE);
        const oversizedCount = selectedFiles.length - validFiles.length;

        if (oversizedCount > 0) {
            toast.error(`${oversizedCount} file(s) exceed the 20MB size limit.`, {
                description: "Our secure local processor has a single-file limit for optimal performance."
            });
        }

        if (validFiles.length === 0) return;

        if (activeTool === "merge") {
            setFiles((prev) => [...prev, ...validFiles]);
            toast.success(`Added ${validFiles.length} file(s) for merging!`);
        } else {
            setFiles(validFiles);
            toast.success(`File ready for conversion!`);
        }
    };

    const removeFile = (index) => {
        setFiles(files.filter((_, i) => i !== index));
    };

    const handleConvert = async () => {
        if (files.length === 0) {
            toast.error("Please upload a file first!");
            return;
        }

        if (activeTool === "merge" && files.length < 2) {
            toast.error("Please upload at least 2 files to merge!");
            return;
        }

        setLoading(true);
        const id = toast.loading("Uploading and processing your files...");

        const formData = new FormData();
        const BASE_URL = "http://localhost:3000"; // Test locally first!
        let endpoint = "";

        if (activeTool === "merge") {
            endpoint = `${BASE_URL}/api/merge`;
            files.forEach((file) => formData.append("files", file));
        } else if (activeTool === "word-to-pdf") {
            endpoint = `${BASE_URL}/api/word-to-pdf`;
            formData.append("file", files[0]);
        } else if (activeTool === "pdf-to-word") {
            endpoint = `${BASE_URL}/api/pdf-to-word`;
            formData.append("file", files[0]);
        }

        try {
            const response = await fetch(endpoint, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || "Failed to process files");
            }

            // Trigger file download natively in browser
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;

            const ext = activeTool === "pdf-to-word" ? ".docx" : ".pdf";
            const defaultName = activeTool === "merge" ? "merged_document" : (files[0].name.split(".")[0] + "_converted");

            a.download = defaultName + ext;
            document.body.appendChild(a);
            a.click();

            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            setFiles([]); // Clear queue after success
            toast.success("All Done! File processed and downloaded.", { id });
        } catch (error) {
            console.error("Conversion error:", error);
            toast.error(error.message || "An error occurred during conversion", { id });
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
                </div>
            </CardContent>
        </Card>
    );
}