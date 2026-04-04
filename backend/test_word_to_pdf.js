import fs from 'fs';
import path from 'path';
import { Document, Packer, Paragraph, TextRun } from "docx";
import { Blob } from 'buffer';

const testWordToPdf = async () => {
    try {
        console.log("⏱️ Step 1: Creating a test Word document...");
        
        // 1. Create a quick docx file
        const doc = new Document({
            sections: [{
                properties: {},
                children: [
                    new Paragraph({
                        children: [new TextRun("Hello! This is an automatic test document created by AI.")],
                    }),
                ],
            }],
        });
        
        const b64string = await Packer.toBase64String(doc);
        const docBuffer = Buffer.from(b64string, 'base64');
        const tempFilePath = path.resolve('test_file_by_ai.docx');
        fs.writeFileSync(tempFilePath, docBuffer);
        console.log(`✅ Created test file: ${tempFilePath}`);

        // 2. Send it to your local server
        console.log("\n⏱️ Step 2: Sending to http://localhost:3000/api/word-to-pdf ...");
        
        const form = new FormData();
        const blob = new Blob([docBuffer], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
        form.append('file', blob, "test_file_by_ai.docx");

        // Use native fetch (available in Node 18+)
        const response = await fetch('http://localhost:3000/api/word-to-pdf', {
            method: 'POST',
            body: form
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Server responded with ${response.status}: ${errText}`);
        }

        // 3. Save the resulting PDF
        const arrayBuffer = await response.arrayBuffer();
        const pdfBuffer = Buffer.from(arrayBuffer);
        const finalPdfPath = path.resolve('test_result_by_ai.pdf');
        fs.writeFileSync(finalPdfPath, pdfBuffer);

        console.log(`\n🎉 SUCCESS! Received the PDF back from your server!`);
        console.log(`✅ Saved PDF to: ${finalPdfPath}`);
        
        // Cleanup the docx
        fs.unlinkSync(tempFilePath);

    } catch (err) {
        console.error("\n❌ TEST FAILED:", err.message);
    }
};

testWordToPdf();
