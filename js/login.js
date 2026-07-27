/*=========================================================
    STUDENT RESULT MODULE
    PART 1
=========================================================*/

document.addEventListener("DOMContentLoaded", async () => {

    protectPage();

    const session = getSession();

    if (!session) {
        window.location.href = "index.html";
        return;
    }

    loadStudentInfo(session);

    const semesterSelect =
        document.getElementById("semesterSelect");

    if (getSemester()) {
        semesterSelect.value = getSemester();
    }

    await loadResults(
        session.regno,
        semesterSelect.value
    );

    semesterSelect.addEventListener(
        "change",
        async function () {

            saveSemester(this.value);

            await loadResults(
                session.regno,
                this.value
            );

        }

    );

});


/*=========================================================
    LOAD STUDENT INFORMATION
=========================================================*/

function loadStudentInfo(student) {

    document.getElementById("studentName").textContent =
        student.name || "-";

    document.getElementById("studentReg").textContent =
        student.regno || "-";

    document.getElementById("studentDept").textContent =
        student.department || "-";

    document.getElementById("studentBatch").textContent =
        student.batch || "-";

}


/*=========================================================
    LOAD RESULTS
=========================================================*/

async function loadResults(regno, semester) {

    showLoading("resultContainer");

    try {

        const sem = Number(semester);

        const { data, error } =
            await supabaseClient

                .from("results")

                .select("*")

                .eq("regno", regno)

                .eq("semester", sem)

                .order(
                    "subject_code",
                    {
                        ascending: true
                    }
                );

        console.log("Session Reg No :", regno);
        console.log("Semester :", sem);
        console.log("Results :", data);
        console.log("Supabase Error :", error);

        if (error) {

            throw error;

        }

        if (!data || data.length === 0) {

            emptyState(

                "resultContainer",

                "No Result Found For Semester " + sem

            );

            return;

        }

        renderTable(data);

        updateSummary(

            data,

            sem

        );

    }

    catch (err) {

        console.error(err);

        showError(

            "resultContainer",

            err.message

        );

        showToast(

            "Unable to load result",

            "error"

        );

    }

}
/*=========================================================
    RENDER RESULT TABLE
=========================================================*/

function renderTable(results) {

    const container =
        document.getElementById("resultContainer");

    const tableBody =
        document.getElementById("resultTableBody");

    if (!container || !tableBody) return;

    container.style.display = "block";

    tableBody.innerHTML = "";

    results.forEach(subject => {

        const row = document.createElement("tr");

        const status =
            (subject.result || "PASS").toUpperCase();

        const badge =
            status === "PASS"
            ? '<span class="badge badge-success">PASS</span>'
            : '<span class="badge badge-danger">FAIL</span>';

        row.innerHTML = `

            <td>${subject.subject_code ?? "-"}</td>

            <td>${subject.subject_name ?? "-"}</td>

            <td>${subject.internal ?? 0}</td>

            <td>${subject.external ?? 0}</td>

            <td>${subject.total ?? 0}</td>

            <td>${subject.grade ?? "-"}</td>

            <td>${badge}</td>

        `;

        tableBody.appendChild(row);

    });

}


/*=========================================================
    UPDATE SUMMARY
=========================================================*/

async function updateSummary(results, semester) {

    document.getElementById("semesterValue").textContent =
        semester;

    document.getElementById("subjectCount").textContent =
        results.length;

    let totalMarks = 0;
    let totalGradePoints = 0;
    let passCount = 0;
    let failCount = 0;

    results.forEach(subject => {

        totalMarks +=
            Number(subject.total || 0);

        totalGradePoints +=
            Number(subject.grade_point || 0);

        if (
            (subject.result || "")
            .toUpperCase() === "PASS"
        ) {

            passCount++;

        }
        else {

            failCount++;

        }

    });

    document.getElementById("totalMarks").textContent =
        totalMarks;

    const sgpa =
        results.length > 0
            ? (
                totalGradePoints /
                results.length
              ).toFixed(2)
            : "0.00";

    document.getElementById("sgpaValue").textContent =
        sgpa;

    const status =
        document.getElementById("semesterStatus");

    if (failCount === 0) {

        status.className =
            "badge badge-success";

        status.textContent =
            "PASS";

    }
    else {

        status.className =
            "badge badge-danger";

        status.textContent =
            "FAIL";

    }

    document.getElementById("passCount").textContent =
        passCount;

    document.getElementById("failCount").textContent =
        failCount;

    await calculateOverallCGPA();

}
/*=========================================================
    CALCULATE OVERALL CGPA
=========================================================*/

async function calculateOverallCGPA() {

    const session = getSession();

    if (!session) return;

    try {

        const { data, error } =
            await supabaseClient

                .from("results")

                .select("grade_point")

                .eq("regno", session.regno);

        if (error) {

            throw error;

        }

        if (!data || data.length === 0) {

            document.getElementById("cgpaValue")
                .textContent = "0.00";

            return;

        }

        let total = 0;

        data.forEach(row => {

            total += Number(row.grade_point || 0);

        });

        const cgpa = (

            total /

            data.length

        ).toFixed(2);

        document.getElementById("cgpaValue")
            .textContent = cgpa;

    }

    catch (err) {

        console.error(err);

        document.getElementById("cgpaValue")
            .textContent = "--";

    }

}


/*=========================================================
    REFRESH RESULTS
=========================================================*/

async function refreshResults() {

    const session = getSession();

    if (!session) return;

    const semester =

        document.getElementById("semesterSelect").value;

    await loadResults(

        session.regno,

        semester

    );

    showToast(

        "Results refreshed",

        "success"

    );

}


/*=========================================================
    RESULT STATISTICS
=========================================================*/

function getResultStatistics(results) {

    let pass = 0;
    let fail = 0;

    let highest = 0;
    let lowest = 100;

    results.forEach(subject => {

        const mark = Number(subject.total || 0);

        if (mark > highest) {

            highest = mark;

        }

        if (mark < lowest) {

            lowest = mark;

        }

        if (

            (subject.result || "")
            .toUpperCase() === "PASS"

        ) {

            pass++;

        }

        else {

            fail++;

        }

    });

    return {

        pass,

        fail,

        highest,

        lowest

    };

}


/*=========================================================
    PRINT RESULT
=========================================================*/

function printResult() {

    window.print();

}


/*=========================================================
    DOWNLOAD BUTTON
=========================================================*/

const pdfButton =

    document.getElementById("downloadPdf");

if (pdfButton) {

    pdfButton.addEventListener(

        "click",

        async () => {

            if (

                typeof downloadResultPDF ===

                "function"

            ) {

                await downloadResultPDF();

            }

            else {

                showToast(

                    "PDF module not found",

                    "error"

                );

            }

        }

    );

}
/*=========================================================
    SHOW SUBJECT DETAILS
=========================================================*/

function showSubjectDetails(subject) {

    const modal =
        document.getElementById("resultModal");

    const content =
        document.getElementById("modalContent");

    if (!modal || !content) return;

    content.innerHTML = `

        <div class="info-grid">

            <div class="info-item">
                <div class="info-title">Subject Code</div>
                <div class="info-value">${subject.code}</div>
            </div>

            <div class="info-item">
                <div class="info-title">Subject Name</div>
                <div class="info-value">${subject.subject}</div>
            </div>

            <div class="info-item">
                <div class="info-title">Internal Mark</div>
                <div class="info-value">${subject.internal}</div>
            </div>

            <div class="info-item">
                <div class="info-title">External Mark</div>
                <div class="info-value">${subject.external}</div>
            </div>

            <div class="info-item">
                <div class="info-title">Total</div>
                <div class="info-value">${subject.total}</div>
            </div>

            <div class="info-item">
                <div class="info-title">Grade</div>
                <div class="info-value">${subject.grade}</div>
            </div>

            <div class="info-item">
                <div class="info-title">Result</div>
                <div class="info-value">${subject.result}</div>
            </div>

        </div>

    `;

    modal.classList.add("active");

}


/*=========================================================
    TABLE ROW CLICK
=========================================================*/

document.addEventListener("click", function (e) {

    const row = e.target.closest("#resultTableBody tr");

    if (!row) return;

    const cells = row.querySelectorAll("td");

    showSubjectDetails({

        code: cells[0].textContent,

        subject: cells[1].textContent,

        internal: cells[2].textContent,

        external: cells[3].textContent,

        total: cells[4].textContent,

        grade: cells[5].textContent,

        result: cells[6].textContent

    });

});


/*=========================================================
    CLOSE MODAL
=========================================================*/

window.addEventListener("click", function (e) {

    const modal =
        document.getElementById("resultModal");

    if (!modal) return;

    if (e.target === modal) {

        modal.classList.remove("active");

    }

});


/*=========================================================
    KEYBOARD SHORTCUTS
=========================================================*/

document.addEventListener("keydown", function (e) {

    if (e.ctrlKey && e.key.toLowerCase() === "p") {

        e.preventDefault();

        window.print();

    }

    if (e.key === "Escape") {

        const modal =
            document.getElementById("resultModal");

        if (modal) {

            modal.classList.remove("active");

        }

    }

    if (e.key === "F5") {

        e.preventDefault();

        refreshResults();

    }

});


/*=========================================================
    FORMAT NUMBER
=========================================================*/

function formatNumber(value) {

    return Number(value || 0).toFixed(2);

}


/*=========================================================
    GET CURRENT RESULT DATA
=========================================================*/

function getCurrentResultData() {

    const rows = [

        ...document.querySelectorAll(

            "#resultTableBody tr"

        )

    ];

    return rows.map(row => {

        const cells = row.querySelectorAll("td");

        return {

            subject_code: cells[0].textContent,

            subject_name: cells[1].textContent,

            internal: cells[2].textContent,

            external: cells[3].textContent,

            total: cells[4].textContent,

            grade: cells[5].textContent,

            result: cells[6].textContent

        };

    });

}


/*=========================================================
    PAGE READY
=========================================================*/

console.log("Student Result Module Loaded Successfully");
