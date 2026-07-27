/*==================================================
Student Portal Login
==================================================*/

document.addEventListener("DOMContentLoaded", () => {

    // Already logged in
    if (isLoggedIn()) {
        window.location.href = "student.html";
        return;
    }

    const form = document.getElementById("loginForm");
    const message = document.getElementById("message");

    if (!form) return;

    form.addEventListener("submit", loginStudent);

});

/*==================================================
LOGIN FUNCTION
==================================================*/

async function loginStudent(e) {

    e.preventDefault();

    const regno = document
        .getElementById("regno")
        .value
        .trim()
        .toUpperCase();

    const dob = document
        .getElementById("dob")
        .value;

    const message =
        document.getElementById("message");

    message.innerHTML = "";
    message.style.color = "#ffffff";

    if (regno === "" || dob === "") {

        message.style.color = "#ef4444";
        message.innerHTML = "Please enter Register Number and Date of Birth.";

        showToast(
            "All fields are required.",
            "error"
        );

        return;

    }

    const btn =
        document.querySelector("button");

    btn.disabled = true;
    btn.innerHTML = "Checking...";

    try {

        const {

            data,
            error

        } = await supabaseClient

            .from(TABLES.students)

            .select("*")

            .eq("regno", regno)

            .eq("dob", dob)

            .maybeSingle();

        if (error || !data) {

            btn.disabled = false;
            btn.innerHTML = "Login";

            message.style.color = "#ef4444";

            message.innerHTML =
                "Invalid Register Number or Date of Birth.";

            showToast(
                "Login Failed",
                "error"
            );

            return;

        }

        saveSession(data);

        showToast(
            "Login Successful",
            "success"
        );

        message.style.color = "#22c55e";

        message.innerHTML =
            "Redirecting...";

        setTimeout(() => {

            window.location.href =
                "student.html";

        }, 1000);

    }

    catch (err) {

        console.error(err);

        btn.disabled = false;
        btn.innerHTML = "Login";

        message.style.color = "#ef4444";

        message.innerHTML =
            "Unable to connect to server.";

        showToast(
            "Server Error",
            "error"
        );

    }

}

/*==================================================
ENTER KEY SUPPORT
==================================================*/

document.addEventListener("keypress", function (e) {

    if (e.key === "Enter") {

        const form =
            document.getElementById("loginForm");

        if (form) {

            form.dispatchEvent(

                new Event(
                    "submit",
                    {
                        cancelable: true
                    }
                )

            );

        }

    }

});

/*==================================================
INPUT EFFECT
==================================================*/

const inputs =
    document.querySelectorAll("input");

inputs.forEach(input => {

    input.addEventListener("focus", () => {

        input.parentElement.classList.add(
            "active"
        );

    });

    input.addEventListener("blur", () => {

        input.parentElement.classList.remove(
            "active"
        );

    });

});

/*==================================================
LOADING EFFECT
==================================================*/

function startLoading() {

    const btn =
        document.querySelector("button");

    btn.disabled = true;

    btn.innerHTML =

        `
        <span style="display:flex;
        justify-content:center;
        align-items:center;
        gap:10px">

        <span class="loader"
        style="
        width:18px;
        height:18px;
        border-width:3px"></span>

        Checking

        </span>
        `;

}

function stopLoading() {

    const btn =
        document.querySelector("button");

    btn.disabled = false;

    btn.innerHTML = "Login";

}

/*==================================================
AUTO FOCUS
==================================================*/

window.onload = () => {

    const reg =
        document.getElementById("regno");

    if (reg) {

        reg.focus();

    }

};
