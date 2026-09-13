document.addEventListener("DOMContentLoaded", function () {

    const registerForm = document.getElementById("registerForm");

    if (registerForm) {
        registerForm.addEventListener("submit", handleRegistration);
    }


    const loginForm = document.getElementById("loginForm");

    if (loginForm) {
        loginForm.addEventListener("submit", handleLogin);
    }

});


async function handleRegistration(event) {

    event.preventDefault();

    const form = event.target;

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword =
        document.getElementById("confirmPassword").value;

    const messageBox =
        document.getElementById("registerMessage");


    messageBox.innerHTML = "";


    if (name.length < 2) {

        messageBox.innerHTML =
            '<p class="form-error">Please enter a valid name.</p>';

        return;
    }


    if (phone.length < 10) {

        messageBox.innerHTML =
            '<p class="form-error">Please enter a valid phone number.</p>';

        return;
    }


    if (password.length < 8) {

        messageBox.innerHTML =
            '<p class="form-error">Password must contain at least 8 characters.</p>';

        return;
    }


    if (password !== confirmPassword) {

        messageBox.innerHTML =
            '<p class="form-error">Passwords do not match.</p>';

        return;
    }


    try {

        const response = await fetch("php/register.php", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                name: name,
                email: email,
                phone: phone,
                password: password
            })

        });


        const data = await response.json();


        if (data.success) {

            messageBox.innerHTML =
                '<p class="form-success">' +
                data.message +
                '</p>';

            form.reset();

            setTimeout(function () {
                window.location.href = "login.html";
            }, 1200);

        } else {

            messageBox.innerHTML =
                '<p class="form-error">' +
                data.message +
                '</p>';

        }

    } catch (error) {

        console.error(error);

        messageBox.innerHTML =
            '<p class="form-error">' +
            'Unable to connect to the server.' +
            '</p>';

    }

}


async function handleLogin(event) {

    event.preventDefault();

    const email =
        document.getElementById("email").value.trim();

    const password =
        document.getElementById("password").value;

    const messageBox =
        document.getElementById("loginMessage");


    messageBox.innerHTML = "";


    try {

        const response = await fetch("php/login.php", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                email: email,
                password: password
            })

        });


        const data = await response.json();


        if (data.success) {

            window.location.href = data.redirect;

        } else {

            messageBox.innerHTML =
                '<p class="form-error">' +
                data.message +
                '</p>';

        }

    } catch (error) {

        console.error(error);

        messageBox.innerHTML =
            '<p class="form-error">' +
            'Unable to connect to the server.' +
            '</p>';

    }

}
