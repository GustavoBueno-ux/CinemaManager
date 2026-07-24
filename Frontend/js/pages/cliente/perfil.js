const botaoVoltar =
    document.getElementById("botao-voltar");

const mensagemStatus =
    document.getElementById("mensagem-status");

const perfilCard =
    document.getElementById("perfil-card");

const perfilInicial =
    document.getElementById("perfil-inicial");

const perfilNome =
    document.getElementById("perfil-nome");

const perfilEmail =
    document.getElementById("perfil-email");

const nomeCompleto =
    document.getElementById("nome-completo");

const email =
    document.getElementById("email");

const dataCadastro =
    document.getElementById("data-cadastro");

const quantidadeIngressos =
    document.getElementById("quantidade-ingressos");

const botaoEditarPerfil =
    document.getElementById("botao-editar-perfil");


function obterToken() {

    return localStorage.getItem("token");

}


function redirecionarParaLogin() {

    window.location.href = "../../index.html";

}


function mostrarCarregamento() {

    perfilCard.hidden = true;

    mensagemStatus.hidden = false;
    mensagemStatus.classList.remove("erro");

    mensagemStatus.textContent =
        "Carregando perfil...";

}


function mostrarErro(mensagem) {

    perfilCard.hidden = true;

    mensagemStatus.hidden = false;
    mensagemStatus.classList.add("erro");

    mensagemStatus.textContent = mensagem;

}


function mostrarPerfil() {

    mensagemStatus.hidden = true;
    mensagemStatus.classList.remove("erro");

    perfilCard.hidden = false;

}


function obterInicial(nome) {

    if (!nome || !nome.trim())
        return "U";

    return nome
        .trim()
        .charAt(0)
        .toUpperCase();

}


function formatarData(data) {

    if (!data)
        return "--";

    const dataConvertida =
        new Date(data);

    if (Number.isNaN(dataConvertida.getTime()))
        return "--";

    return dataConvertida.toLocaleDateString(
        "pt-BR",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }
    );

}


function preencherPerfil(usuario) {

    const nomeUsuario =
        usuario.nome || "Usuário";

    const emailUsuario =
        usuario.email || "--";

    perfilInicial.textContent =
        obterInicial(nomeUsuario);

    perfilNome.textContent =
        nomeUsuario;

    nomeCompleto.textContent =
        nomeUsuario;

    email.textContent =
        emailUsuario;

    dataCadastro.textContent =
        formatarData(usuario.dataCadastro);

    quantidadeIngressos.textContent =
        usuario.quantidadeIngressos ?? 0;

}


async function carregarPerfil() {

    const token =
        obterToken();

    if (!token) {

        redirecionarParaLogin();
        return;

    }

    mostrarCarregamento();

    try {

        const resposta = await fetch(
            `${API_URL}/Usuario/perfil`,
            {
                method: "GET",

                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        if (resposta.status === 401) {

            localStorage.removeItem("token");
            localStorage.removeItem("usuario");

            redirecionarParaLogin();
            return;

        }

        if (resposta.status === 404) {

            mostrarErro(
                "Não foi possível encontrar os dados do usuário."
            );

            return;

        }

        if (!resposta.ok) {

            throw new Error(
                "Não foi possível carregar o perfil."
            );

        }

        const usuario =
            await resposta.json();

        preencherPerfil(usuario);

        mostrarPerfil();

    }
    catch (erro) {

        console.error(
            "Erro ao carregar perfil:",
            erro
        );

        mostrarErro(
            "Não foi possível carregar o perfil. Tente novamente."
        );

    }

}


function configurarEventos() {

    botaoVoltar?.addEventListener(
        "click",
        function () {

            window.history.back();

        }
    );

    botaoEditarPerfil?.addEventListener(
        "click",
        function () {

            console.log(
                "Edição de perfil será implementada na próxima etapa."
            );

        }
    );

}


function inicializarPaginaPerfil() {

    configurarEventos();

    carregarPerfil();

}


inicializarPaginaPerfil();