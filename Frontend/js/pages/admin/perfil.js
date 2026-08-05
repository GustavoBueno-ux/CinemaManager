const PERFIL_ENDPOINT = "/Usuario/perfil";
const FUNCIONARIO_ENDPOINT = "/Usuario/funcionario";

const elementos = {
    sidebar: document.getElementById("sidebar"),
    sidebarOverlay: document.getElementById("sidebar-overlay"),
    sidebarOpenButton: document.getElementById("sidebar-open-button"),
    sidebarCloseButton: document.getElementById("sidebar-close-button"),
    logoutButton: document.getElementById("logout-button"),
    sidebarUserAvatar: document.getElementById("sidebar-user-avatar"),
    sidebarUserName: document.getElementById("sidebar-user-name"),

    profileLoading: document.getElementById("profile-loading"),
    profileError: document.getElementById("profile-error"),
    profileErrorMessage: document.getElementById("profile-error-message"),
    profileRetryButton: document.getElementById("profile-retry-button"),
    profileContent: document.getElementById("profile-content"),

    profileAvatar: document.getElementById("profile-avatar"),
    profileDisplayName: document.getElementById("profile-display-name"),
    profileDisplayEmail: document.getElementById("profile-display-email"),
    profileRegistrationDate: document.getElementById("profile-registration-date"),

    profileForm: document.getElementById("profile-form"),
    profileName: document.getElementById("profile-name"),
    profileEmail: document.getElementById("profile-email"),
    profileFormError: document.getElementById("profile-form-error"),
    profileFormSuccess: document.getElementById("profile-form-success"),
    saveProfileButton: document.getElementById("save-profile-button"),

    newEmployeeButton: document.getElementById("new-employee-button"),

    employeeModal: document.getElementById("employee-modal"),
    employeeModalCloseButton: document.getElementById("employee-modal-close-button"),
    employeeModalCancelButton: document.getElementById("employee-modal-cancel-button"),

    employeeForm: document.getElementById("employee-form"),
    employeeName: document.getElementById("employee-name"),
    employeeEmail: document.getElementById("employee-email"),
    employeePassword: document.getElementById("employee-password"),
    employeePasswordConfirmation: document.getElementById("employee-password-confirmation"),

    employeeFormError: document.getElementById("employee-form-error"),
    employeeFormSuccess: document.getElementById("employee-form-success"),
    saveEmployeeButton: document.getElementById("save-employee-button")
};

const estado = {
    usuario: null,
    salvandoPerfil: false,
    cadastrandoFuncionario: false
};

/* =========================================================
   INICIALIZAÇÃO
========================================================= */

document.addEventListener("DOMContentLoaded", iniciarPagina);

function iniciarPagina() {
    const usuario = obterUsuarioAutenticado();

    if (!usuario) {
        redirecionarParaLogin();
        return;
    }

    if (usuario.tipoUsuario !== "Funcionario") {
        redirecionarParaHomeCliente();
        return;
    }

    configurarFuncionarioNavbar(usuario);
    configurarEventos();
    carregarPerfil();
}

/* =========================================================
   AUTENTICAÇÃO
========================================================= */

function obterUsuarioAutenticado() {
    const token = localStorage.getItem("token");
    const usuarioArmazenado = localStorage.getItem("usuario");

    if (!token || !usuarioArmazenado) {
        return null;
    }

    try {
        const usuario = JSON.parse(usuarioArmazenado);

        return usuario?.nome && usuario?.tipoUsuario
            ? usuario
            : null;
    } catch (erro) {
        console.error("Erro ao ler usuário:", erro);
        return null;
    }
}

function configurarFuncionarioNavbar(usuario) {
    const nome = usuario.nome.trim();

    elementos.sidebarUserName.textContent = nome;

    elementos.sidebarUserAvatar.textContent =
        obterInicial(nome);
}

/* =========================================================
   EVENTOS
========================================================= */

function configurarEventos() {
    elementos.sidebarOpenButton?.addEventListener("click", abrirSidebar);
    elementos.sidebarCloseButton?.addEventListener("click", fecharSidebar);
    elementos.sidebarOverlay?.addEventListener("click", fecharSidebar);
    elementos.logoutButton?.addEventListener("click", fazerLogout);

    elementos.profileRetryButton?.addEventListener(
        "click",
        carregarPerfil
    );

    elementos.profileForm?.addEventListener(
        "submit",
        salvarPerfil
    );

    elementos.newEmployeeButton?.addEventListener(
        "click",
        abrirModalFuncionario
    );

    elementos.employeeModalCloseButton?.addEventListener(
        "click",
        fecharModalFuncionario
    );

    elementos.employeeModalCancelButton?.addEventListener(
        "click",
        fecharModalFuncionario
    );

    elementos.employeeForm?.addEventListener(
        "submit",
        cadastrarFuncionario
    );

    elementos.employeeModal?.addEventListener(
        "click",
        evento => {
            if (evento.target === elementos.employeeModal) {
                fecharModalFuncionario();
            }
        }
    );

    document.addEventListener("keydown", evento => {
        if (evento.key !== "Escape") {
            return;
        }

        if (!elementos.employeeModal.classList.contains("hidden")) {
            fecharModalFuncionario();
            return;
        }

        fecharSidebar();
    });
}

/* =========================================================
   SIDEBAR
========================================================= */

function abrirSidebar() {
    elementos.sidebar?.classList.add("open");
    elementos.sidebarOverlay?.classList.add("visible");

    elementos.sidebarOpenButton?.setAttribute(
        "aria-expanded",
        "true"
    );

    document.body.classList.add("sidebar-open");
}

function fecharSidebar() {
    elementos.sidebar?.classList.remove("open");
    elementos.sidebarOverlay?.classList.remove("visible");

    elementos.sidebarOpenButton?.setAttribute(
        "aria-expanded",
        "false"
    );

    document.body.classList.remove("sidebar-open");
}

function fazerLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");

    redirecionarParaLogin();
}

/* =========================================================
   CARREGAMENTO DO PERFIL
========================================================= */

async function carregarPerfil() {
    prepararCarregamento();

    try {
        const resposta = await apiRequest(
            PERFIL_ENDPOINT
        );

        if (!resposta.ok) {
            tratarErroCarregamento(resposta);
            return;
        }

        if (!resposta.data) {
            throw new Error(
                "O servidor retornou dados inválidos."
            );
        }

        estado.usuario = resposta.data;

        preencherPerfil(resposta.data);

        elementos.profileLoading.classList.add(
            "hidden"
        );

        elementos.profileError.classList.add(
            "hidden"
        );

        elementos.profileContent.classList.remove(
            "hidden"
        );
    } catch (erro) {
        console.error(
            "Erro ao carregar perfil:",
            erro
        );

        exibirErroCarregamento(
            "Não foi possível se comunicar com o servidor."
        );
    }
}

function prepararCarregamento() {
    elementos.profileLoading.classList.remove(
        "hidden"
    );

    elementos.profileError.classList.add(
        "hidden"
    );

    elementos.profileContent.classList.add(
        "hidden"
    );
}

function preencherPerfil(usuario) {
    const nome =
        usuario.nome?.trim() || "Funcionário";

    elementos.profileDisplayName.textContent =
        nome;

    elementos.profileDisplayEmail.textContent =
        usuario.email || "--";

    elementos.profileAvatar.textContent =
        obterInicial(nome);

    elementos.profileRegistrationDate.textContent =
        formatarData(usuario.dataCadastro);

    elementos.profileName.value =
        usuario.nome || "";

    elementos.profileEmail.value =
        usuario.email || "";

    atualizarNavbarComUsuario(usuario);
}

function atualizarNavbarComUsuario(usuario) {
    const nome =
        usuario.nome?.trim() || "Funcionário";

    elementos.sidebarUserName.textContent =
        nome;

    elementos.sidebarUserAvatar.textContent =
        obterInicial(nome);
}

/* =========================================================
   SALVAR PERFIL
========================================================= */

async function salvarPerfil(evento) {
    evento.preventDefault();

    if (
        estado.salvandoPerfil ||
        !estado.usuario
    ) {
        return;
    }

    esconderMensagensPerfil();

    const nome =
        elementos.profileName.value.trim();

    const email =
        elementos.profileEmail.value.trim();

    if (!nome || !email) {
        exibirErroPerfil(
            "Preencha todos os campos."
        );

        return;
    }

    if (nome.length > 100) {
        exibirErroPerfil(
            "O nome deve possuir no máximo 100 caracteres."
        );

        return;
    }

    if (!emailValido(email)) {
        exibirErroPerfil(
            "Informe um endereço de e-mail válido."
        );

        return;
    }

    if (email.length > 150) {
        exibirErroPerfil(
            "O e-mail deve possuir no máximo 150 caracteres."
        );

        return;
    }

    const alteracoes = montarAlteracoesPerfil(
        nome,
        email
    );

    if (!Object.keys(alteracoes).length) {
        exibirSucessoPerfil(
            "Nenhuma alteração foi realizada."
        );

        return;
    }

    definirEstadoSalvamentoPerfil(true);

    try {
        await atualizarPerfil(alteracoes);

        estado.usuario = {
            ...estado.usuario,
            ...alteracoes
        };

        atualizarUsuarioLocal();
        preencherPerfil(estado.usuario);

        exibirSucessoPerfil(
            "Perfil atualizado com sucesso."
        );
    } catch (erro) {
        console.error(
            "Erro ao atualizar perfil:",
            erro
        );

        exibirErroPerfil(
            erro.message ||
            "Não foi possível atualizar o perfil."
        );
    } finally {
        definirEstadoSalvamentoPerfil(false);
    }
}

function montarAlteracoesPerfil(nome, email) {
    const alteracoes = {};

    if (nome !== estado.usuario.nome) {
        alteracoes.nome = nome;
    }

    if (email !== estado.usuario.email) {
        alteracoes.email = email;
    }

    return alteracoes;
}

async function atualizarPerfil(alteracoes) {
    const token =
        localStorage.getItem("token");

    if (!token) {
        fazerLogout();

        throw new Error(
            "Sua sessão expirou."
        );
    }

    let resposta;

    try {
        resposta = await fetch(
            `${API_URL}${PERFIL_ENDPOINT}`,
            {
                method: "PATCH",
                headers: {
                    "Content-Type":
                        "application/json",

                    Authorization:
                        `Bearer ${token}`
                },

                body: JSON.stringify(
                    alteracoes
                )
            }
        );
    } catch {
        throw new Error(
            "Não foi possível se comunicar com o servidor."
        );
    }

    tratarAutorizacao(resposta);

    if (!resposta.ok) {
        const mensagem =
            await tentarLerMensagemErro(
                resposta
            );

        throw new Error(
            mensagem ||
            "Não foi possível atualizar o perfil."
        );
    }
}

/* =========================================================
   USUÁRIO DO LOCALSTORAGE
========================================================= */

function atualizarUsuarioLocal() {
    const usuarioLocal =
        obterUsuarioAutenticado();

    if (!usuarioLocal) {
        return;
    }

    usuarioLocal.nome =
        estado.usuario.nome;

    usuarioLocal.email =
        estado.usuario.email;

    localStorage.setItem(
        "usuario",
        JSON.stringify(usuarioLocal)
    );
}

/* =========================================================
   MODAL FUNCIONÁRIO
========================================================= */

function abrirModalFuncionario() {
    if (estado.cadastrandoFuncionario) {
        return;
    }

    elementos.employeeForm.reset();

    esconderMensagensFuncionario();

    elementos.employeeModal.classList.remove(
        "hidden"
    );

    elementos.employeeModal.setAttribute(
        "aria-hidden",
        "false"
    );

    document.body.classList.add(
        "modal-open"
    );

    setTimeout(() => {
        elementos.employeeName.focus();
    }, 0);
}

function fecharModalFuncionario() {
    if (estado.cadastrandoFuncionario) {
        return;
    }

    elementos.employeeModal.classList.add(
        "hidden"
    );

    elementos.employeeModal.setAttribute(
        "aria-hidden",
        "true"
    );

    elementos.employeeForm.reset();

    esconderMensagensFuncionario();

    document.body.classList.remove(
        "modal-open"
    );
}

/* =========================================================
   CADASTRAR FUNCIONÁRIO
========================================================= */

async function cadastrarFuncionario(evento) {
    evento.preventDefault();

    if (estado.cadastrandoFuncionario) {
        return;
    }

    esconderMensagensFuncionario();

    const nome =
        elementos.employeeName.value.trim();

    const email =
        elementos.employeeEmail.value.trim();

    const senha =
        elementos.employeePassword.value;

    const confirmacaoSenha =
        elementos.employeePasswordConfirmation.value;

    if (
        !nome ||
        !email ||
        !senha ||
        !confirmacaoSenha
    ) {
        exibirErroFuncionario(
            "Preencha todos os campos."
        );

        return;
    }

    if (nome.length > 100) {
        exibirErroFuncionario(
            "O nome deve possuir no máximo 100 caracteres."
        );

        return;
    }

    if (!emailValido(email)) {
        exibirErroFuncionario(
            "Informe um endereço de e-mail válido."
        );

        return;
    }

    if (email.length > 150) {
        exibirErroFuncionario(
            "O e-mail deve possuir no máximo 150 caracteres."
        );

        return;
    }

    if (senha.length < 6) {
        exibirErroFuncionario(
            "A senha deve possuir pelo menos 6 caracteres."
        );

        return;
    }

    if (senha !== confirmacaoSenha) {
        exibirErroFuncionario(
            "As senhas não coincidem."
        );

        return;
    }

    definirEstadoCadastroFuncionario(true);

    try {
        await enviarCadastroFuncionario({
            nome,
            email,
            senha
        });

        elementos.employeeForm.reset();

        exibirSucessoFuncionario(
            "Funcionário cadastrado com sucesso."
        );

        setTimeout(() => {
            if (!estado.cadastrandoFuncionario) {
                fecharModalFuncionario();
            }
        }, 1200);
    } catch (erro) {
        console.error(
            "Erro ao cadastrar funcionário:",
            erro
        );

        exibirErroFuncionario(
            erro.message ||
            "Não foi possível cadastrar o funcionário."
        );
    } finally {
        definirEstadoCadastroFuncionario(false);
    }
}

async function enviarCadastroFuncionario(funcionario) {
    const token =
        localStorage.getItem("token");

    if (!token) {
        fazerLogout();

        throw new Error(
            "Sua sessão expirou."
        );
    }

    let resposta;

    try {
        resposta = await fetch(
            `${API_URL}${FUNCIONARIO_ENDPOINT}`,
            {
                method: "POST",
                headers: {
                    "Content-Type":
                        "application/json",

                    Authorization:
                        `Bearer ${token}`
                },

                body: JSON.stringify(
                    funcionario
                )
            }
        );
    } catch {
        throw new Error(
            "Não foi possível se comunicar com o servidor."
        );
    }

    tratarAutorizacao(resposta);

    if (!resposta.ok) {
        const mensagem =
            await tentarLerMensagemErro(
                resposta
            );

        throw new Error(
            mensagem ||
            "Não foi possível cadastrar o funcionário."
        );
    }
}

/* =========================================================
   AUTORIZAÇÃO
========================================================= */

function tratarAutorizacao(resposta) {
    if (resposta.status === 401) {
        fazerLogout();

        throw new Error(
            "Sua sessão expirou."
        );
    }

    if (resposta.status === 403) {
        throw new Error(
            "Você não possui permissão para realizar esta operação."
        );
    }
}

/* =========================================================
   ERROS DE CARREGAMENTO
========================================================= */

function tratarErroCarregamento(resposta) {
    if (resposta.status === 401) {
        fazerLogout();
        return;
    }

    if (resposta.status === 403) {
        redirecionarParaHomeCliente();
        return;
    }

    exibirErroCarregamento(
        "Não foi possível carregar seu perfil."
    );
}

function exibirErroCarregamento(mensagem) {
    elementos.profileLoading.classList.add(
        "hidden"
    );

    elementos.profileContent.classList.add(
        "hidden"
    );

    elementos.profileError.classList.remove(
        "hidden"
    );

    elementos.profileErrorMessage.textContent =
        mensagem;
}

/* =========================================================
   MENSAGENS DO PERFIL
========================================================= */

function exibirErroPerfil(mensagem) {
    elementos.profileFormSuccess.classList.add(
        "hidden"
    );

    elementos.profileFormError.textContent =
        mensagem;

    elementos.profileFormError.classList.remove(
        "hidden"
    );
}

function exibirSucessoPerfil(mensagem) {
    elementos.profileFormError.classList.add(
        "hidden"
    );

    elementos.profileFormSuccess.textContent =
        mensagem;

    elementos.profileFormSuccess.classList.remove(
        "hidden"
    );
}

function esconderMensagensPerfil() {
    elementos.profileFormError.classList.add(
        "hidden"
    );

    elementos.profileFormSuccess.classList.add(
        "hidden"
    );
}

/* =========================================================
   MENSAGENS DO FUNCIONÁRIO
========================================================= */

function exibirErroFuncionario(mensagem) {
    elementos.employeeFormSuccess.classList.add(
        "hidden"
    );

    elementos.employeeFormError.textContent =
        mensagem;

    elementos.employeeFormError.classList.remove(
        "hidden"
    );
}

function exibirSucessoFuncionario(mensagem) {
    elementos.employeeFormError.classList.add(
        "hidden"
    );

    elementos.employeeFormSuccess.textContent =
        mensagem;

    elementos.employeeFormSuccess.classList.remove(
        "hidden"
    );
}

function esconderMensagensFuncionario() {
    elementos.employeeFormError.classList.add(
        "hidden"
    );

    elementos.employeeFormSuccess.classList.add(
        "hidden"
    );
}

/* =========================================================
   ESTADOS DE SALVAMENTO
========================================================= */

function definirEstadoSalvamentoPerfil(salvando) {
    estado.salvandoPerfil =
        salvando;

    elementos.profileName.disabled =
        salvando;

    elementos.profileEmail.disabled =
        salvando;

    elementos.saveProfileButton.disabled =
        salvando;

    elementos.saveProfileButton.textContent =
        salvando
            ? "Salvando..."
            : "Salvar alterações";
}

function definirEstadoCadastroFuncionario(salvando) {
    estado.cadastrandoFuncionario =
        salvando;

    elementos.employeeName.disabled =
        salvando;

    elementos.employeeEmail.disabled =
        salvando;

    elementos.employeePassword.disabled =
        salvando;

    elementos.employeePasswordConfirmation.disabled =
        salvando;

    elementos.saveEmployeeButton.disabled =
        salvando;

    elementos.employeeModalCancelButton.disabled =
        salvando;

    elementos.employeeModalCloseButton.disabled =
        salvando;

    elementos.saveEmployeeButton.textContent =
        salvando
            ? "Cadastrando..."
            : "Cadastrar funcionário";
}

/* =========================================================
   UTILITÁRIOS
========================================================= */

function obterInicial(nome) {
    return nome
        ?.trim()
        .charAt(0)
        .toUpperCase() || "F";
}

function emailValido(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email
    );
}

function formatarData(data) {
    if (!data) {
        return "--/--/----";
    }

    const valor =
        new Date(data);

    if (Number.isNaN(valor.getTime())) {
        return "--/--/----";
    }

    return valor.toLocaleDateString(
        "pt-BR",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }
    );
}

async function tentarLerMensagemErro(resposta) {
    let texto;

    try {
        texto = await resposta.text();
    } catch {
        return null;
    }

    if (!texto) {
        return null;
    }

    try {
        const dados =
            JSON.parse(texto);

        return (
            dados?.mensagem ||
            dados?.message ||
            null
        );
    } catch {
        return texto;
    }
}

/* =========================================================
   REDIRECIONAMENTOS
========================================================= */

function redirecionarParaLogin() {
    window.location.replace(
        "../../index.html"
    );
}

function redirecionarParaHomeCliente() {
    window.location.replace(
        "../public/home.html"
    );
}