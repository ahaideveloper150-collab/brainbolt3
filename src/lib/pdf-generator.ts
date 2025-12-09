import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { MCQ } from "@/components/MCQList";
import { Flashcard } from "@/components/FlashcardDisplay";

export const generateMCQPDF = (mcqs: MCQ[], title: string = "BrainBolt Generated MCQs") => {
    const doc = new jsPDF();

    // Title
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    doc.text(title, 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 30);

    let yPos = 40;

    mcqs.forEach((mcq, index) => {
        // Check for page break
        if (yPos > 270) {
            doc.addPage();
            yPos = 20;
        }

        // Question
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "bold");

        const questionText = `${index + 1}. ${mcq.question}`;
        const splitQuestion = doc.splitTextToSize(questionText, 180);
        doc.text(splitQuestion, 14, yPos);

        yPos += splitQuestion.length * 5 + 2;

        // Options
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);

        mcq.options.forEach((option, optIdx) => {
            const optionLetter = String.fromCharCode(65 + optIdx);
            const optionText = `${optionLetter}. ${option}`;
            const splitOption = doc.splitTextToSize(optionText, 170);

            // Highlight correct answer if needed (optional - usually PDFs are for testing so maybe don't highlight?)
            // For now, let's keep it clean like a test paper. 
            // We can add an answer key at the end.

            doc.text(splitOption, 20, yPos);
            yPos += splitOption.length * 5;
        });

        yPos += 5; // Spacing between questions
    });

    // Add Answer Key on a new page
    doc.addPage();
    doc.setFontSize(18);
    doc.setTextColor(40, 40, 40);
    doc.text("Answer Key", 14, 22);

    const answerData = mcqs.map((mcq, index) => [
        `${index + 1}`,
        mcq.correct,
        mcq.explanation || "-"
    ]);

    autoTable(doc, {
        startY: 30,
        head: [["Q", "Answer", "Explanation"]],
        body: answerData,
        columnStyles: {
            0: { cellWidth: 15 },
            1: { cellWidth: 20 },
            2: { cellWidth: 'auto' },
        },
        headStyles: { fillColor: [66, 133, 244] }, // Google Blue-ish
    });

    doc.save("brainbolt-mcqs.pdf");
};

export const generateFlashcardPDF = (flashcards: Flashcard[], title: string = "BrainBolt Flashcards") => {
    const doc = new jsPDF();

    // Title
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    doc.text(title, 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 30);

    let yPos = 40;

    flashcards.forEach((card, index) => {
        // Check for page break
        if (yPos > 250) {
            doc.addPage();
            yPos = 20;
        }

        // Card number and type
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Card ${index + 1} • ${card.type}`, 14, yPos);
        yPos += 8;

        // Front (Question)
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "bold");
        doc.text("Front:", 14, yPos);
        yPos += 6;

        doc.setFont("helvetica", "normal");
        const frontText = doc.splitTextToSize(card.front, 180);
        doc.text(frontText, 14, yPos);
        yPos += frontText.length * 5 + 4;

        // Back (Answer)
        doc.setFont("helvetica", "bold");
        doc.text("Back:", 14, yPos);
        yPos += 6;

        doc.setFont("helvetica", "normal");
        const backText = doc.splitTextToSize(card.back, 180);
        doc.text(backText, 14, yPos);
        yPos += backText.length * 5;

        // Separator
        yPos += 10;
        doc.setDrawColor(200, 200, 200);
        doc.line(14, yPos, 196, yPos);
        yPos += 10;
    });

    doc.save("brainbolt-flashcards.pdf");
};

export const generateFormattedTextPDF = (content: string, title: string = "BrainBolt Formatted Content") => {
    const doc = new jsPDF();

    // Title
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    doc.text(title, 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 30);

    // Content
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");

    let yPos = 45;
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    const margin = 14;
    const maxWidth = pageWidth - (margin * 2);

    // Simple markdown processing (remove markdown syntax for PDF)
    const cleanContent = content
        .replace(/#{1,6}\s/g, '') // Remove heading markers
        .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markers
        .replace(/\*(.*?)\*/g, '$1') // Remove italic markers
        .replace(/`(.*?)`/g, '$1'); // Remove code markers

    const lines = doc.splitTextToSize(cleanContent, maxWidth);

    lines.forEach((line: string) => {
        if (yPos > pageHeight - 20) {
            doc.addPage();
            yPos = 20;
        }
        doc.text(line, margin, yPos);
        yPos += 6;
    });

    doc.save("brainbolt-formatted.pdf");
};
