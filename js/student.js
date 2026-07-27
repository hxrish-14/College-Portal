/*====================================================

Student Portal
student.js
Part 1

====================================================*/

document.addEventListener(

"DOMContentLoaded",

async()=>{

protectPage();

await loadStudent();

});

/*====================================================

LOAD STUDENT

====================================================*/

async function loadStudent(){

const session=getSession();

if(!session){

window.location.href="index.html";

return;

}

showLoadingProfile();

try{

const{

data,

error

}=await supabaseClient

.from(TABLES.students)

.select("*")

.eq("regno",session.regno)

.single();

if(error){

throw error;

}

fillStudent(data);

await loadAcademic(data.regno);

}

catch(err){

console.error(err);

showToast(

"Unable to load profile",

"error"

);

}

}

/*====================================================

PROFILE

====================================================*/

function fillStudent(student){

setValue(

"studentName",

student.name

);

setValue(

"studentReg",

student.regno

);

setValue(

"studentDept",

student.department

);

setValue(

"studentYear",

student.year

);

setValue(

"studentBatch",

student.batch

);

setValue(

"studentDOB",

formatDate(student.dob)

);

setValue(

"studentGender",

student.gender

);

setValue(

"studentEmail",

student.email

);

setValue(

"studentPhone",

student.phone

);

setValue(

"studentBlood",

student.blood_group

);

setValue(

"studentAddress",

student.address

);

setValue(

"fatherName",

student.father_name

);

setValue(

"motherName",

student.mother_name

);

setValue(

"parentPhone",

student.parent_phone

);

setValue(

"guardian",

student.guardian

);

if(

student.photo

){

document

.getElementById(

"studentPhoto"

)

.src=

student.photo;

}

}

/*====================================================

HELPER

====================================================*/

function setValue(

id,

value

){

const el=

document.getElementById(id);

if(el){

el.textContent=

value || "--";

}

}

/*====================================================

LOADING

====================================================*/

function showLoadingProfile(){

const title=

document.getElementById(

"studentName"

);

if(title){

title.innerHTML=

"Loading...";

}

}
/*====================================================

Student Portal
student.js
Part 2

====================================================*/

/*====================================================

LOAD ACADEMIC DETAILS

====================================================*/

async function loadAcademic(regno){

try{

const{

data,

error

}=await supabaseClient

.from(TABLES.results)

.select("*")

.eq("regno",regno);

if(error){

throw error;

}

updateDashboard(data);

}

catch(err){

console.error(err);

showToast(

"Unable to load academic data",

"error"

);

}

}

/*====================================================

UPDATE DASHBOARD

====================================================*/

function updateDashboard(results){

if(!results || results.length===0){

setValue("currentSemester","--");

setValue("currentCGPA","0.00");

setValue("attendance","--");

setValue("cgpaBox","0.00");

return;

}

/*------------------------------

Latest Semester

------------------------------*/

const latestSemester=Math.max(

...results.map(r=>Number(r.semester))

);

setValue(

"currentSemester",

"Semester "+latestSemester

);

/*------------------------------

CGPA

------------------------------*/

const cgpa=calculateCGPA(results);

setValue(

"currentCGPA",

cgpa

);

setValue(

"cgpaBox",

cgpa

);

/*------------------------------

Attendance

------------------------------*/

const attendance=

results[0].attendance || "95%";

setValue(

"attendance",

attendance

);

/*------------------------------

PASS / FAIL

------------------------------*/

const passCount=

totalPass(results);

const failCount=

totalFail(results);

const status=

document.getElementById(

"overallStatus"

);

if(status){

if(failCount>0){

status.className=

"badge badge-danger";

status.innerHTML="FAIL";

}else{

status.className=

"badge badge-success";

status.innerHTML="PASS";

}

}

/*------------------------------

Statistics

------------------------------*/

console.log(

"Subjects :",

totalSubjects(results)

);

console.log(

"Total Marks :",

calculateTotal(results)

);

console.log(

"CGPA :",

cgpa

);

}

/*====================================================

LOGOUT SUPPORT

====================================================*/

const logoutButton=

document.getElementById(

"logoutBtn"

);

if(logoutButton){

logoutButton.addEventListener(

"click",

logout

);

}

/*====================================================

AUTO REFRESH

Refresh profile every 5 minutes

====================================================*/

setInterval(()=>{

if(isLoggedIn()){

loadStudent();

}

},300000);

/*====================================================

WELCOME MESSAGE

====================================================*/

window.addEventListener(

"load",

()=>{

const session=getSession();

if(session){

showToast(

"Welcome "+session.name,

"success"

);

}

});
/*====================================================

Student Portal
student.js
Part 3 (Final)

====================================================*/

/*====================================================
PROFILE IMAGE FALLBACK
====================================================*/

(function(){

const img=document.getElementById("studentPhoto");

if(!img) return;

img.onerror=function(){

const session=getSession();

const name=session?.name || "Student";

this.src=
"https://ui-avatars.com/api/?name="+
encodeURIComponent(name)+
"&background=2563eb&color=ffffff&size=300";

};

})();

/*====================================================
REFRESH BUTTON
====================================================*/

function refreshProfile(){

showToast(

"Refreshing profile...",

"info"

);

loadStudent();

}

/*====================================================
PRINT PROFILE
====================================================*/

function printProfile(){

window.print();

}

/*====================================================
COPY REGISTER NUMBER
====================================================*/

function copyRegisterNumber(){

const reg=document
.getElementById("studentReg")
.innerText;

navigator.clipboard

.writeText(reg)

.then(()=>{

showToast(

"Register Number Copied",

"success"

);

});

}

/*====================================================
NETWORK STATUS
====================================================*/

window.addEventListener(

"offline",

()=>{

showToast(

"Internet Connection Lost",

"error"

);

});

window.addEventListener(

"online",

()=>{

showToast(

"Connected",

"success"

);

});

/*====================================================
KEYBOARD SHORTCUTS
====================================================*/

document.addEventListener(

"keydown",

function(e){

/* CTRL+P */

if(e.ctrlKey && e.key==="p"){

e.preventDefault();

printProfile();

}

/* CTRL+R */

if(e.ctrlKey && e.key==="r"){

e.preventDefault();

refreshProfile();

}

/* ESC */

if(e.key==="Escape"){

const modal=document.querySelector(".modal");

if(modal){

modal.classList.remove("active");

}

}

});

/*====================================================
PROFILE COMPLETENESS
====================================================*/

function profileProgress(){

const ids=[

"studentName",

"studentReg",

"studentDept",

"studentYear",

"studentDOB",

"studentGender",

"studentEmail",

"studentPhone",

"studentAddress"

];

let filled=0;

ids.forEach(id=>{

const el=document.getElementById(id);

if(el){

if(

el.innerText!=="--"

&&

el.innerText!==""

){

filled++;

}

}

});

return Math.round(

filled/

ids.length

*100

);

}

/*====================================================
SHOW PROFILE STATUS
====================================================*/

window.addEventListener(

"load",

()=>{

setTimeout(()=>{

const progress=

profileProgress();

console.log(

"Profile Complete:",

progress+"%"

);

},1200);

});

/*====================================================
LAST LOGIN
====================================================*/

const today=new Date();

localStorage.setItem(

"lastLogin",

today.toLocaleString()

);

/*====================================================
DEBUG MODE
====================================================*/

const DEBUG=false;

if(DEBUG){

console.log(

"Student Session",

getSession()

);

}

/*====================================================
END OF FILE
====================================================*/