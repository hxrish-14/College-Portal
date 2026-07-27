/*==================================================
Student Portal
result.js
Part 1
==================================================*/

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

/*==================================================
LOAD STUDENT INFO
==================================================*/

function loadStudentInfo(student){

    document.getElementById(
        "studentName"
    ).textContent =
    student.name || "--";

    document.getElementById(
        "studentReg"
    ).textContent =
    student.regno || "--";

    document.getElementById(
        "studentDept"
    ).textContent =
    student.department || "--";

    document.getElementById(
        "studentBatch"
    ).textContent =
    student.batch || "--";

}

/*==================================================
LOAD RESULTS
==================================================*/

async function loadResults(

    regno,

    semester

){

showLoading("resultContainer");

try{

const{

data,

error

}=await supabaseClient

.from(TABLES.results)

.select("*")

.eq("regno",regno)

.eq("semester",semester)

.order("subject_code");

if(error){

throw error;

}

if(!data || data.length===0){

emptyState(

"resultContainer",

"No Result Available"

);

return;

}

renderTable(data);

updateSummary(data,semester);

}

catch(err){

console.error(err);

showError(

"resultContainer",

"Unable to load semester result."

);

showToast(

"Failed to load results",

"error"

);

}

}
/*==================================================
Student Portal
result.js
Part 2
==================================================*/

/*==================================================
RENDER RESULT TABLE
==================================================*/

function renderTable(results){

const table=document.getElementById(

"resultTableBody"

);

table.innerHTML="";

results.forEach(subject=>{

const row=document.createElement("tr");

const status=

(subject.result||"PASS")

.toUpperCase();

const badge=status==="PASS"

?'<span class="badge badge-success">PASS</span>'

:'<span class="badge badge-danger">FAIL</span>';

row.innerHTML=`

<td>${subject.subject_code}</td>

<td>${subject.subject_name}</td>

<td>${subject.internal}</td>

<td>${subject.external}</td>

<td>${subject.total}</td>

<td>${subject.grade}</td>

<td>${badge}</td>

`;

table.appendChild(row);

});

}

/*==================================================
UPDATE SUMMARY
==================================================*/

function updateSummary(

results,

semester

){

document.getElementById(

"semesterValue"

).innerHTML=

semester;

document.getElementById(

"subjectCount"

).innerHTML=

results.length;

let totalMarks=0;

let totalGradePoints=0;

let passCount=0;

let failCount=0;

results.forEach(subject=>{

totalMarks+=

Number(subject.total||0);

totalGradePoints+=

Number(subject.grade_point||0);

if(

(subject.result||"").toUpperCase()

==="PASS"

){

passCount++;

}else{

failCount++;

}

});

document.getElementById(

"totalMarks"

).innerHTML=

totalMarks;

const sgpa=

results.length

?

(totalGradePoints/results.length)

.toFixed(2)

:

"0.00";

document.getElementById(

"sgpaValue"

).innerHTML=

sgpa;

const status=

document.getElementById(

"semesterStatus"

);

if(failCount>0){

status.className=

"badge badge-danger";

status.innerHTML="FAIL";

}else{

status.className=

"badge badge-success";

status.innerHTML="PASS";

}

calculateOverallCGPA();

}

/*==================================================
HOVER EFFECT
==================================================*/

document.addEventListener(

"mouseover",

function(e){

const row=e.target.closest("tr");

if(

row &&

row.parentElement.id===

"resultTableBody"

){

row.style.transition=

".3s";

}

});
/*==================================================
Student Portal
result.js
Part 3
==================================================*/

/*==================================================
CALCULATE OVERALL CGPA
==================================================*/

async function calculateOverallCGPA(){

const session=getSession();

if(!session)return;

try{

const{

data,

error

}=await supabaseClient

.from(TABLES.results)

.select("semester,grade_point");

if(error)throw error;

const filtered=data.filter(

item=>item.regno===session.regno ||

session.regno===undefined
);

if(filtered.length===0){

document.getElementById(

"cgpaValue"

).textContent="0.00";

return;

}

let total=0;

filtered.forEach(item=>{

total+=Number(

item.grade_point||0

);

});

const cgpa=(

total/filtered.length

).toFixed(2);

document.getElementById(

"cgpaValue"

).textContent=cgpa;

}catch(err){

console.error(err);

document.getElementById(

"cgpaValue"

).textContent="--";

}

}

/*==================================================
PREPARE PDF DATA
==================================================*/

function getCurrentResultData(){

const rows=[

...document.querySelectorAll(

"#resultTableBody tr"

)

];

return rows.map(row=>{

const cells=row.querySelectorAll("td");

return{

code:cells[0]?.textContent||"",

subject:cells[1]?.textContent||"",

internal:cells[2]?.textContent||"",

external:cells[3]?.textContent||"",

total:cells[4]?.textContent||"",

grade:cells[5]?.textContent||"",

result:cells[6]?.textContent||""

};

});

}

/*==================================================
REFRESH RESULTS
==================================================*/

async function refreshResults(){

const session=getSession();

if(!session)return;

await loadResults(

session.regno,

document.getElementById(

"semesterSelect"

).value

);

showToast(

"Results refreshed",

"success"

);

}

/*==================================================
RESULT STATISTICS
==================================================*/

function getResultStatistics(results){

let pass=0;

let fail=0;

let highest=0;

let lowest=1000;

results.forEach(item=>{

const mark=Number(item.total||0);

if(mark>highest)highest=mark;

if(mark<lowest)lowest=mark;

if(

(item.result||"")

.toUpperCase()==="PASS"

){

pass++;

}else{

fail++;

}

});

return{

pass,

fail,

highest,

lowest

};

}
/*==================================================
Student Portal
result.js
Part 4
==================================================*/

/*==================================================
SHOW SUBJECT DETAILS MODAL
==================================================*/

function showSubjectDetails(subject){

const modal=document.getElementById("resultModal");

const content=document.getElementById("modalContent");

content.innerHTML=`

<div class="info-grid">

<div class="info-item">
<div class="info-title">Subject Code</div>
<div class="info-value">${subject.code}</div>
</div>

<div class="info-item">
<div class="info-title">Subject</div>
<div class="info-value">${subject.subject}</div>
</div>

<div class="info-item">
<div class="info-title">Internal</div>
<div class="info-value">${subject.internal}</div>
</div>

<div class="info-item">
<div class="info-title">External</div>
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

/*==================================================
TABLE ROW CLICK
==================================================*/

document.addEventListener("click",function(e){

const row=e.target.closest("#resultTableBody tr");

if(!row)return;

const cells=row.querySelectorAll("td");

showSubjectDetails({

code:cells[0].textContent,

subject:cells[1].textContent,

internal:cells[2].textContent,

external:cells[3].textContent,

total:cells[4].textContent,

grade:cells[5].textContent,

result:cells[6].textContent

});

});

/*==================================================
DOWNLOAD PDF
==================================================*/

const downloadButton=document.getElementById("downloadPdf");

if(downloadButton){

downloadButton.addEventListener(

"click",

async()=>{

if(typeof downloadResultPDF==="function"){

await downloadResultPDF();

}else{

showToast(

"PDF module not loaded",

"error"

);

}

}

);

}

/*==================================================
KEYBOARD SHORTCUTS
==================================================*/

document.addEventListener(

"keydown",

function(e){

if(e.ctrlKey && e.key==="p"){

e.preventDefault();

window.print();

}

if(e.key==="Escape"){

document

.getElementById("resultModal")

.classList

.remove("active");

}

if(e.key==="F5"){

e.preventDefault();

refreshResults();

}

}

);

/*==================================================
UTILITY
==================================================*/

function formatNumber(value){

return Number(value||0).toFixed(2);

}

/*==================================================
AUTO CLOSE MODAL
==================================================*/

window.addEventListener("click",function(e){

const modal=document.getElementById("resultModal");

if(e.target===modal){

modal.classList.remove("active");

}

});

/*==================================================
READY
==================================================*/

console.log(

"Student Result Module Loaded Successfully."

);