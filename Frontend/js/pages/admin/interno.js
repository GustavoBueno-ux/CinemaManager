/* =========================================================
   ÁREA INTERNA - AUTENTICAÇÃO E NAVEGAÇÃO COMPARTILHADAS
========================================================= */

window.CinemaxInterno = (() => {

    const PAGINA_INICIAL = "home-admin.html";
    const PAGINA_LOGIN = "../../index.html";
    const PAGINA_CLIENTE = "../public/home.html";


    // =========================================================
    // USUÁRIO
    // =========================================================

    function obterUsuarioAutenticado() {

        const token =
            localStorage.getItem("token");

        const usuarioArmazenado =
            localStorage.getItem("usuario");


        if (!token || !usuarioArmazenado) {
            return null;
        }


        try {

            const usuario =
                JSON.parse(usuarioArmazenado);

            return usuario?.nome &&
                usuario?.tipoUsuario
                ? usuario
                : null;

        }
        catch {

            return null;
        }
    }


    function ehUsuarioInterno(usuario) {

        return (
            usuario?.tipoUsuario === "Funcionario" ||
            usuario?.tipoUsuario === "Admin"
        );
    }


    function ehAdmin(usuario) {

        return usuario?.tipoUsuario === "Admin";
    }



    // =========================================================
    // SESSÃO
    // =========================================================

    function encerrarSessao() {

        localStorage.removeItem("token");
        localStorage.removeItem("usuario");

        window.location.replace(PAGINA_LOGIN);
    }


    function redirecionarParaHomeInterna() {

        window.location.replace(PAGINA_INICIAL);
    }



    // =========================================================
    // NAVBAR
    // =========================================================

    function configurarNavbar(usuario) {

        configurarInformacoesUsuario(usuario);
        configurarRelatorios(usuario);
        configurarEquipe(usuario);
    }



    // =========================================================
    // INFORMAÇÕES DO USUÁRIO
    // =========================================================

    function configurarInformacoesUsuario(usuario) {

        document
            .querySelectorAll("#sidebar-user-name")
            .forEach(elemento => {

                elemento.textContent =
                    usuario.nome;
            });


        document
            .querySelectorAll(".sidebar-user-role")
            .forEach(elemento => {

                elemento.textContent =
                    ehAdmin(usuario)
                        ? "Administrador"
                        : "Funcionário";
            });


        configurarAvatarUsuario(usuario);
    }


    function configurarAvatarUsuario(usuario) {

        const inicial =
            usuario.nome
                ?.trim()
                .charAt(0)
                .toUpperCase() || "U";


        document
            .querySelectorAll("#sidebar-user-avatar")
            .forEach(elemento => {

                elemento.textContent = inicial;
            });
    }



    // =========================================================
    // RELATÓRIOS
    // =========================================================

    function configurarRelatorios(usuario) {

        document
            .querySelectorAll(
                "a[href='relatorios.html']"
            )
            .forEach(link => {

                const item =
                    link.closest(
                        ".sidebar-menu-item"
                    );


                if (!ehAdmin(usuario)) {

                    item?.remove();
                }
            });
    }



    // =========================================================
    // EQUIPE
    // =========================================================

    function configurarEquipe(usuario) {

        const menus =
            document.querySelectorAll(
                ".sidebar-menu"
            );


        if (!menus.length) {
            return;
        }


        /*
         * Funcionário nunca deve visualizar
         * o gerenciamento da equipe.
         */

        if (!ehAdmin(usuario)) {

            document
                .querySelectorAll(
                    "a[href='equipe.html']"
                )
                .forEach(link => {

                    link
                        .closest(
                            ".sidebar-menu-item"
                        )
                        ?.remove();
                });

            return;
        }


        /*
         * Algumas páginas, como equipe.html,
         * já possuem o item no HTML.
         *
         * Nesse caso não criamos outro.
         */

        const itemJaExiste =
            document.querySelector(
                "a[href='equipe.html']"
            );


        if (itemJaExiste) {
            return;
        }


        menus.forEach(menu => {

            const item =
                criarItemEquipe();

            menu.appendChild(item);
        });
    }


    function criarItemEquipe() {

        const item =
            document.createElement("li");

        item.className =
            "sidebar-menu-item";


        const link =
            document.createElement("a");

        link.href =
            "equipe.html";

        link.className =
            "sidebar-link";


        const icone =
            document.createElement("span");

        icone.className =
            "sidebar-link-icon";

        icone.setAttribute(
            "aria-hidden",
            "true"
        );

        icone.textContent =
            "👥";


        const texto =
            document.createElement("span");

        texto.className =
            "sidebar-link-text";

        texto.textContent =
            "Equipe";


        link.appendChild(icone);
        link.appendChild(texto);

        item.appendChild(link);


        return item;
    }



    // =========================================================
    // PROTEÇÃO DAS PÁGINAS
    // =========================================================

    function protegerPagina() {

        const usuario =
            obterUsuarioAutenticado();


        if (!usuario) {

            encerrarSessao();

            return null;
        }


        /*
         * Cliente não pode permanecer
         * na área interna.
         */

        if (!ehUsuarioInterno(usuario)) {

            window.location.replace(
                PAGINA_CLIENTE
            );

            return null;
        }


        const paginaAtual =
            window.location.pathname
                .split("/")
                .pop();


        /*
         * Páginas exclusivas de Admin.
         *
         * A API continua sendo a autoridade
         * de segurança. Essa proteção existe
         * também para a navegação/UX.
         */

        const paginasExclusivasAdmin = [
            "relatorios.html",
            "equipe.html"
        ];


        if (
            paginasExclusivasAdmin.includes(
                paginaAtual
            ) &&
            !ehAdmin(usuario)
        ) {

            redirecionarParaHomeInterna();

            return null;
        }


        configurarNavbar(usuario);

        return usuario;
    }



    // =========================================================
    // API PÚBLICA DO MÓDULO
    // =========================================================

    return {

        obterUsuarioAutenticado,
        ehUsuarioInterno,
        ehAdmin,
        encerrarSessao,
        protegerPagina
    };

})();



/* =========================================================
   INICIALIZAÇÃO
========================================================= */

window.CinemaxInterno.protegerPagina();