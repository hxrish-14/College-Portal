/*==================================================
Student Portal
pdf.js
Professional Result PDF Export
==================================================*/

async function downloadResultPDF() {

    try {

        showToast("Preparing PDF...", "info");

        const resultCard = document.getElementById("resultContainer");

        if (!resultCard) {
            showToast("Result section not found.", "error");
            return;
        }

        const { jsPDF } = window.jspdf;

        const canvas = await html2canvas(resultCard, {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff",
            logging: false
        });

        const imgData = canvas.toDataURL("image/png");

        const pdf = new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: "a4"
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        const margin = 10;
        const usableWidth = pageWidth - (margin * 2);

        const imgWidth = usableWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        /* -------------------------------
           Header
        ------------------------------- */

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(18);
        pdf.text("Student Semester Result", pageWidth / 2, 16, {
            align: "center"
        });

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);

        pdf.text(
            `Generated: ${new Date().toLocaleString()}`,
            pageWidth / 2,
            23,
            {
                align: "center"
            }
        );

        pdf.line(
            margin,
            28,
            pageWidth - margin,
            28
        );

        let currentY = 34;
                /* -------------------------------
           Student Information
        ------------------------------- */

        const studentName =
            document.getElementById("studentName")?.textContent || "--";

        const registerNo =
            document.getElementById("studentReg")?.textContent || "--";

        const department =
            document.getElementById("studentDept")?.textContent || "--";

        const batch =
            document.getElementById("studentBatch")?.textContent || "--";

        const semester =
            document.getElementById("semesterValue")?.textContent || "--";

        const sgpa =
            document.getElementById("sgpaValue")?.textContent || "--";

        const cgpa =
            document.getElementById("cgpaValue")?.textContent || "--";

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(11);

        pdf.text(`Student : ${studentName}`, margin, currentY);
        currentY += 6;

        pdf.text(`Register No : ${registerNo}`, margin, currentY);
        currentY += 6;

        pdf.text(`Department : ${department}`, margin, currentY);
        currentY += 6;

        pdf.text(`Batch : ${batch}`, margin, currentY);
        currentY += 6;

        pdf.text(`Semester : ${semester}`, margin, currentY);
        currentY += 10;

        /* -------------------------------
           Result Screenshot
        ------------------------------- */

        let remainingHeight = imgHeight;
        let position = currentY;

        pdf.addImage(
            imgData,
            "PNG",
            margin,
            position,
            imgWidth,
            imgHeight
        );

        remainingHeight -= (pageHeight - position - margin);

        while (remainingHeight > 0) {

            position = remainingHeight - imgHeight;

            pdf.addPage();

            pdf.addImage(
                imgData,
                "PNG",
                margin,
                position,
                imgWidth,
                imgHeight
            );

            remainingHeight -= (pageHeight - margin * 2);
        }

        /* -------------------------------
           Summary
        ------------------------------- */

        pdf.addPage();

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(16);

        pdf.text(
            "Academic Summary",
            pageWidth / 2,
            20,
            { align: "center" }
        );

        pdf.setFontSize(12);

        pdf.text(`Semester : ${semester}`, 20, 40);
        pdf.text(`SGPA : ${sgpa}`, 20, 50);
        pdf.text(`CGPA : ${cgpa}`, 20, 60);

        /* -------------------------------
           Footer
        ------------------------------- */

        const totalPages = pdf.internal.getNumberOfPages();

        for (let i = 1; i <= totalPages; i++) {

            pdf.setPage(i);

            pdf.setFontSize(9);

            pdf.setTextColor(120);

            pdf.text(
                `Page ${i} of ${totalPages}`,
                pageWidth / 2,
                pageHeight - 8,
                { align: "center" }
            );

            pdf.text(
                "Generated by Student Portal",
                margin,
                pageHeight - 8
            );

        }

        /* -------------------------------
           Save PDF
        ------------------------------- */

        pdf.save(
            `Semester_Result_${registerNo}_Sem${semester}.pdf`
        );

        showToast(
            "PDF downloaded successfully.",
            "success"
        );

    } catch (err) {

        console.error(err);

        showToast(
            "Unable to generate PDF.",
            "error"
        );

    }

}