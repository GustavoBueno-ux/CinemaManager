/* =========================================
   NAVBAR
========================================= */

const nomeUsuario =
    document.getElementById("nomeUsuario");

const usuarioBtn =
    document.getElementById("usuarioBtn");

const menuUsuario =
    document.getElementById("menuUsuario");

const logoutBtn =
    document.getElementById("logoutBtn");


/* =========================================
   LOGIN
========================================= */

function verificarLogin() {

    const token =
        localStorage.getItem("token");

    const usuario =
        localStorage.getItem("usuario");

    if (!token || !usuario) {

        window.location.href =
            "../../index.html";

        return null;

    }

    try {

        return JSON.parse(usuario);

    }
    catch {

        localStorage.removeItem("token");
        localStorage.removeItem("usuario");

        window.location.href =
            "../../index.html";

        return null;

    }

}


/* =========================================
   CARREGAR USUÁRIO
========================================= */

function carregarUsuario() {

    if (!nomeUsuario)
        return;

    const usuario =
        verificarLogin();

    if (!usuario)
        return;

    nomeUsuario.textContent =
        obterPrimeiroNome(usuario.nome);

}

function obterPrimeiroNome(nomeCompleto) {

    if (!nomeCompleto)
        return "Usuário";

    return nomeCompleto
        .trim()
        .split(/\s+/)[0];

}


/* =========================================
   MENU
========================================= */

function configurarMenuUsuario() {

    if (!usuarioBtn || !menuUsuario)
        return;

    usuarioBtn.addEventListener(
        "click",
        function (event) {

            event.stopPropagation();

            menuUsuario.classList.toggle(
                "ativo"
            );

        }
    );

    menuUsuario.addEventListener(
        "click",
        function (event) {

            event.stopPropagation();

        }
    );

    document.addEventListener(
        "click",
        function () {

            menuUsuario.classList.remove(
                "ativo"
            );

        }
    );

}


/* =========================================
   LOGOUT
========================================= */

function configurarLogout() {

    if (!logoutBtn)
        return;

    logoutBtn.addEventListener(
        "click",
        function (event) {

            event.preventDefault();

            localStorage.removeItem("token");
            localStorage.removeItem("usuario");

            window.location.href =
                "../../index.html";

        }
    );

}


/* =========================================
   INICIALIZAÇÃO
========================================= */

function inicializarNavbar() {

    carregarUsuario();

    configurarMenuUsuario();

    configurarLogout();

}

inicializarNavbar();