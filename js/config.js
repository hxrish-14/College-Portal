/*==================================================

Student Portal Configuration

==================================================*/

/*
----------------------------------------------------
SUPABASE PROJECT DETAILS
Replace with your own project details
----------------------------------------------------
*/

const SUPABASE_URL =
"https://yydcbfrrsicqchgumhjr.supabase.co";

const SUPABASE_ANON_KEY =
"sb_publishable_HIABykMzBRENxXJxlTKATg_4QtyDgIV";

/*
----------------------------------------------------
INITIALIZE SUPABASE
----------------------------------------------------
*/

const supabaseClient =
supabase.createClient(
SUPABASE_URL,
SUPABASE_ANON_KEY
);

/*
----------------------------------------------------
TABLE NAMES
----------------------------------------------------
*/

const TABLES = {

students: "students",

results: "results"

};

/*
----------------------------------------------------
LOCAL STORAGE KEYS
----------------------------------------------------
*/

const STORAGE = {

student: "student",

login: "loggedIn",

semester: "semester"

};

/*
----------------------------------------------------
SAVE SESSION
----------------------------------------------------
*/

function saveSession(student){

localStorage.setItem(

STORAGE.student,

JSON.stringify(student)

);

localStorage.setItem(

STORAGE.login,

"true"

);

}

/*
----------------------------------------------------
GET SESSION
----------------------------------------------------
*/

function getSession(){

const data =
localStorage.getItem(STORAGE.student);

if(!data){

return null;

}

return JSON.parse(data);

}

/*
----------------------------------------------------
CHECK LOGIN
----------------------------------------------------
*/

function isLoggedIn(){

return localStorage.getItem(STORAGE.login)
==="true";

}

/*
----------------------------------------------------
CLEAR SESSION
----------------------------------------------------
*/

function logout(){

localStorage.removeItem(STORAGE.student);

localStorage.removeItem(STORAGE.login);

localStorage.removeItem(STORAGE.semester);

window.location.href="index.html";

}

/*
----------------------------------------------------
SEMESTER STORAGE
----------------------------------------------------
*/

function saveSemester(sem){

localStorage.setItem(

STORAGE.semester,

sem

);

}

function getSemester(){

return localStorage.getItem(

STORAGE.semester

);

}

/*
----------------------------------------------------
FORMAT DATE
----------------------------------------------------
*/

function formatDate(date){

const d=new Date(date);

return d.toLocaleDateString();

}

/*
----------------------------------------------------
CGPA CALCULATOR
----------------------------------------------------
*/

function calculateCGPA(rows){

if(!rows || rows.length===0){

return 0;

}

let total=0;

rows.forEach(r=>{

total+=Number(r.grade_point);

});

return (

total/

rows.length

).toFixed(2);

}

/*
----------------------------------------------------
TOTAL MARK
----------------------------------------------------
*/

function calculateTotal(rows){

let total=0;

rows.forEach(r=>{

total+=Number(r.total);

});

return total;

}

/*
----------------------------------------------------
TOTAL SUBJECTS
----------------------------------------------------
*/

function totalSubjects(rows){

return rows.length;

}

/*
----------------------------------------------------
PASS COUNT
----------------------------------------------------
*/

function totalPass(rows){

let count=0;

rows.forEach(r=>{

if(r.result==="PASS"){

count++;

}

});

return count;

}

/*
----------------------------------------------------
FAIL COUNT
----------------------------------------------------
*/

function totalFail(rows){

let count=0;

rows.forEach(r=>{

if(r.result==="FAIL"){

count++;

}

});

return count;

}

/*
----------------------------------------------------
TOAST MESSAGE
----------------------------------------------------
*/

function showToast(message,type="info"){

let toast=document.createElement("div");

toast.className=

"toast toast-"+type;

toast.innerHTML=message;

document.body.appendChild(toast);

setTimeout(()=>{

toast.classList.add("show");

},100);

setTimeout(()=>{

toast.classList.remove("show");

setTimeout(()=>{

toast.remove();

},300);

},3000);

}

/*
----------------------------------------------------
LOADING
----------------------------------------------------
*/

function showLoading(id){

document.getElementById(id).innerHTML=

`
<div class="loading">

<div class="loader"></div>

</div>

`;

}

/*
----------------------------------------------------
EMPTY DATA
----------------------------------------------------
*/

function emptyState(id,text){

document.getElementById(id).innerHTML=

`
<div class="empty-state">

<h2>No Data Found</h2>

<p>${text}</p>

</div>

`;

}

/*
----------------------------------------------------
ERROR
----------------------------------------------------
*/

function showError(id,text){

document.getElementById(id).innerHTML=

`
<div class="empty-state">

<h2>Error</h2>

<p>${text}</p>

</div>

`;

}

/*
----------------------------------------------------
NUMBER FORMAT
----------------------------------------------------
*/

function number(num){

return Number(num).toLocaleString();

}

/*
----------------------------------------------------
PAGE
*/

function protectPage(){

if(!isLoggedIn()){

window.location.href="index.html";

}

}

/*
----------------------------------------------------
LOGOUT BUTTON AUTO
----------------------------------------------------
*/

window.addEventListener(

"DOMContentLoaded",

()=>{

const btn=document.getElementById("logoutBtn");

if(btn){

btn.addEventListener(

"click",

logout

);

}

}

);
