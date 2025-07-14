import { get, post, update, deletes } from './services.js';

const urlUsers = 'http://localhost:3000/users';
const urlEvents = 'http://localhost:3000/events';
const urlEnrollments = 'http://localhost:3000/enrollments';

const routes = {
    '/login': './app/login.html',
    '/create': './app/createEvent.html',
    '/edit': './app/editEvent.html',
    '/events': './app/events.html',
    '/register': './app/register.html',
    '/enrollments': './app/enrollments.html',
}

// Esta función verifica si el usuario está autenticado
function isAuth() {
    let result = localStorage.getItem('Auth') || null
    const resultBool = result === 'true'
    return resultBool;
}

function isAdmin() {
    let result = localStorage.getItem('role') || null
    const resultBool = result === 'true'
    return resultBool;
}

async function navigate(pathname) {
    
    // Verifica si el usuario está autenticado para permitir la entrada a las vistas
    if (!isAuth() && pathname !== '/login' && pathname !== '/register') {
        pathname = '/login';
    }
    if (isAuth() && (pathname === '/login' || pathname === '/register')) {
        alert("Ya estás autenticado, no puedes acceder a esta página");
        pathname = '/events';
    }
    if (!isAdmin()) {
        if (pathname === '/create' || pathname === '/edit') {
            alert("No tienes permisos para acceder a esta página");
            pathname = '/events';
        }
    }

    const route = routes[pathname];
    const html = await fetch(route).then(res => res.text());
    document.getElementById('content').innerHTML = html;
    history.pushState({}, '', pathname);

    if (pathname === '/events') {
        showEvents();
    }
    if (pathname === '/create') {
        addEvent();
    }
    if (pathname === '/edit') {
        updateEvent();
    }
    if (pathname === '/login') {
        setupLoginForm();
    }
    if (pathname === '/register') {
        addUser();
    }
    if (pathname === '/enrollments') {
        showEventsenrolled();
    }

};

//Debo comenzar a escuchar eventos para capturar las funciones por medio de los botones

document.body.addEventListener('click', (e) => {
    if (e.target.matches("[data-link]")) {
        //Estas lineas son para evitar que el navegador recargue la pagina
        e.preventDefault();
        //Esta linea es para navegar a la ruta que se le pasa como parametro
        const path = e.target.getAttribute('href');
        navigate(path);
    }
});

// Esta funcion sirve para devolverme a la pagina anterior
window.addEventListener("popstate", () => {
    console.log("se hizo clic");
    console.log(location);
    navigate(location.pathname);
});

//funcion del  login 
function setupLoginForm() {

    const form = document.getElementById("login-spa");

    // Sirve para que busque en los co rreos y contraseña
    form.addEventListener("submit", (e) => {
        e.preventDefault();

        const user = document.getElementById("user").value;
        const pass = document.getElementById("password").value;
        fetch(urlUsers)
            .then(response => response.json())
            .then(data => {
                //Con esto se obtienen todos los datos del usuario que tenga el email ingresado, sino se encuentra, este va a retornar un undefined:false
                const usuario = data.find(userEmail => userEmail.email === user);
                if (!usuario || pass !== usuario.password) {
                    alert("Usuario o contraseña incorrectas");
                    return;
                }
                // Si el usuario y la contraseña son correctos, se guarda la información en localStorage
                localStorage.setItem("userId", usuario.id);

                if (usuario.role === "admin") {
                    localStorage.setItem("role", "true");
                } else {
                    localStorage.setItem("role", "false");
                }
                localStorage.setItem("Auth", "true");
                navigate("/events");
            });
    })
};

//Funcion para cerrar sesion 
const buttonCloseSession = document.getElementById("close-sesion");
buttonCloseSession.addEventListener("click", () => {
    localStorage.setItem("Auth", "false");
    navigate("/login");
});


window.addEventListener("DOMContentLoaded", () => {
    navigate(location.pathname);
});

//Funcion para mostrar eventos
function showEvents() {
    let containerEvents = document.getElementById("container-events");

    let userData = get(urlEvents)

    userData.then((data) => {
        data.forEach(event => {
            let eventElement = document.createElement("div");
            eventElement.className = "event";
            eventElement.innerHTML = `
                <div class="event-info">
                <img class="profile-photo" src="images/34670fc26fbfe493b602b742a1d42ff29d9d3d3c.jpg" alt="">
                <p style= display:none >ID: ${event.id}</p>
                <p>Nombre: ${event.name}</p>
                <p>Descripcion: ${event.description}</p>
                <p>Capacidad: ${event.capacity}</p>
                <p>Fecha:${event.date}</p>
                <button class="edit-event-btn">Editar</button>
                <button class="delete-event-btn" >Borrar</button>
                <button class="enroll-event-btn">Inscribirse</button>
                </div>
            `;
            containerEvents.appendChild(eventElement);

            //Condicional para ocultar los botones de editar y borrar si el usuario no es admin
            if (!isAdmin()) {
                const editButtons = document.querySelectorAll('.edit-event-btn');
                const deleteButtons = document.querySelectorAll('.delete-event-btn');
                editButtons.forEach(button => button.style.display = 'none');
                deleteButtons.forEach(button => button.style.display = 'none');
            }
            if (isAdmin()) {
                const enrollButtons = document.querySelectorAll('.enroll-event-btn');
                enrollButtons.forEach(button => button.style.display = 'none');
            }
        });
    }).catch(error => {
        console.error("Error fetching users:", error);
    });
    //This line is to add the event listener to the create button, to navigate to the create page
    document.getElementById('create-btn').addEventListener('click', (e) => {
        e.preventDefault();
        navigate('/create');
    });

};

//Funcion para agregar usuarios
function addEvent() {
    const form = document.getElementById("new-event-form");
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const name = document.getElementById("name").value;
        const description = document.getElementById("description").value;
        const capacity = document.getElementById("capacity").value;
        const date = document.getElementById("date").value;

        if (!name || !description || !capacity || !date) {
            alert("Por favor, completa todos los campos.");
            return;
        }

        const newEvent = {
            name: name,
            description: description,
            capacity: capacity,
            date: date
        };


        try {
            await post(urlEvents, newEvent);
            alert("Evento agregado correctamente");
            navigate("/events");
        } catch (error) {
            console.error("Error updating user:", error);
        }
    });
}

//Este bloque sirve para que se pueda capturar el id del usuario que se va a editar
//Esto se hace por medio de delegacion de eventos: permite manejar elementos dinamicos, que no estan por defecto en el DOM 
let eventId;

document.getElementById("content").addEventListener("click", function (event) {

    if (event.target.matches('button[class="edit-event-btn"]')) {
        // El query selector busca el primer p del parent del boton seleccionado, el cual es el id
        eventId = event.target.parentElement.querySelector("p").textContent.split(": ")[1];
        console.log(eventId);
        navigate("/edit");
    }
});

//Funcion para actualizar usuarios 

function updateEvent() {
    const form = document.getElementById("edit-event-form");
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const name = document.getElementById("nameUP").value;
        const description = document.getElementById("descriptionUP").value;
        const capacity = document.getElementById("capacityUP").value;
        const date = document.getElementById("dateUP").value;

        if (!name || !description || !capacity || !date) {
            alert("Por favor, completa todos los campos.");
            return;
        }

        const updatedEvent = {
            name: name,
            description: description,
            capacity: capacity,
            date: date
        };
        console.log(updatedEvent)
        try {
            await update(urlEvents, eventId, updatedEvent);
            alert("Usuario actualizado correctamente");
            navigate("/events");
        } catch (error) {
            alert("No se pudo actualizar el evento. Verifica el ID.");
            console.error("Error updating event:", error);
        }
    });
}


//Este bloque sirve para que se pueda capturar el id del usuario que se va a eliminar

let eventIddel;

document.getElementById("content").addEventListener("click", function (event) {

    if (event.target.matches('button[class="delete-event-btn"]')) {
        // 
        eventIddel = event.target.parentElement.querySelector("p").textContent.split(": ")[1];
        deleteUser(eventIddel);
    }
});

//Funcion para eliminar usuarios
async function deleteUser(eventIddel) {
    console.log(`EL usuario fue eliminado es: ${eventIddel}`);
    try {
        await deletes(urlEvents, eventIddel);
        alert("EL evento fue eliminado correctamente correctamente");
        navigate("/events");
    } catch (error) {
        alert("No se pudo eliminar el evento. Verifica el ID.");
        console.error("Error updating event:", error);
    }
}

//Funcion para agregar usuarios
function addUser() {
    const form = document.getElementById("register-login");
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const name = document.getElementById("nameRG").value;
        const email = document.getElementById("emailRG").value;
        const password = document.getElementById("passwordRG").value;
        const confirmPassword = document.getElementById("confirm-passwordRG").value;

        if (!name || !email || !password || !confirmPassword) {
            alert("Por favor, completa todos los campos.");
            return;
        }
        if (password !== confirmPassword) {
            alert("Las contraseñas no coinciden.");
            return;
        }

        const newUser = {
            name: name,
            email: email,
            password: password,
            role: "user" // Asignar rol por defecto como 'user'
        };


        try {
            await post(urlUsers, newUser);
            alert("Usuario agregado correctamente");
            navigate("/login");
        } catch (error) {
            console.error("Error adding user:", error);
        }
    });
}

//Inscribirse a un evento
document.getElementById("content").addEventListener("click", async function (event) {



    if (event.target.matches('button[class="enroll-event-btn"]')) {
        const userId = Number(localStorage.getItem("userId"));
        const eventId = (event.target.parentElement.querySelector("p").textContent.split(": ")[1]);


        try {
            const existingEnrollments = await get(urlEnrollments);
            const isAlreadyEnrolled = existingEnrollments.some(enroll =>
                enroll.userId === userId && enroll.eventId === eventId
            );

            if (isAlreadyEnrolled) {
                alert("Ya estás inscrito en este evento.");
                return;
            }

            const newEnrollment = {
                userId,
                eventId
            };

            await post(urlEnrollments, newEnrollment);
            alert("Inscripción realizada correctamente");
        } catch (error) {
            alert("Error al inscribirse.");
            console.error("Error al inscribirse:", error);
        }
        navigate('/enrollments')
    }
});

async function showEventsenrolled() {
    const userId = localStorage.getItem("userId");

    try {
        const enrollments = await get(urlEnrollments);

        const userEnrollments = enrollments.filter(enroll => enroll.userId === Number(userId));

        const events = await get(urlEvents);

        const enrolledEvents = events.filter(event =>
            userEnrollments.some(enroll => enroll.eventId === event.id)
        );

        await fetch(routes['/enrollments'])
            .then(res => res.text())
            .then(html => {
                document.getElementById("content").innerHTML = html;

                const tableBody = document.querySelector(".events-list");

                enrolledEvents.forEach(event => {
                    const row = document.createElement("tr");
                    row.innerHTML = `
                        <td><i class="fa-solid fa-user"></i></td>
                        <td>${event.name}</td>
                        <td>${event.description}</td>
                        <td>${event.date}</td>
                    `;
                    tableBody.appendChild(row);
                });
            });

    } catch (error) {
        console.error("Error al cargar inscripciones:", error);
    }
}