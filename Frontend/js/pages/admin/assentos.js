/* =========================================================
   CONFIGURAÇÕES
========================================================= */

let PRECO_INGRESSO = 0;

const INTERVALO_ATUALIZACAO_MS = 2000;
const ATRASO_SINCRONIZACAO_SELECAO_MS = 200;


/* =========================================================
   ELEMENTOS - PÁGINA
========================================================= */

const mapaAssentos = document.getElementById("mapaAssentos");
const quantidadeDisponiveis = document.getElementById("quantidade-disponiveis");
const quantidadeOcupados = document.getElementById("quantidade-ocupados");
const quantidadeSelecionados = document.getElementById("quantidade-selecionados");
const listaAssentosSelecionados = document.getElementById("listaAssentosSelecionados");
const valorTotal = document.getElementById("valorTotal");
const botaoContinuar = document.getElementById("botaoContinuar");

const tituloFilme = document.getElementById("titulo-filme");
const dataSessao = document.getElementById("data-sessao");
const horarioSessao = document.getElementById("horario-sessao");

const botaoVoltar = document.getElementById("botao-voltar");
const mensagemPagina = document.getElementById("mensagem-pagina");


/* =========================================================
   ELEMENTOS - TROCA DE SESSÃO
========================================================= */

const botaoAlterarSessao = document.getElementById("botao-alterar-sessao");
const modalSessoes = document.getElementById("modal-sessoes");
const botaoFecharModalSessoes = document.getElementById("botao-fechar-modal-sessoes");
const pesquisaSessao = document.getElementById("pesquisa-sessao");
const listaSessoes = document.getElementById("lista-sessoes");


/* =========================================================
   ELEMENTOS - VENDA
========================================================= */

const modalVenda = document.getElementById("modalVenda");
const botaoFecharModalVenda = document.getElementById("botaoFecharModalVenda");
const ingressosSelecionados = document.getElementById("ingressosSelecionados");
const valorTotalModal = document.getElementById("valorTotalModal");
const botaoFinalizarVenda = document.getElementById("botaoFinalizarVenda");
const mensagemModalVenda = document.getElementById("mensagem-modal-venda");

const opcoesPagamento = document.querySelectorAll(
    'input[name="formaPagamento"]'
);


/* =========================================================
   ELEMENTOS - RESULTADO DA VENDA
========================================================= */

const modalResultadoVenda = document.getElementById("modal-resultado-venda");
const tituloResultadoVenda = document.getElementById("titulo-resultado-venda");
const descricaoResultadoVenda = document.getElementById("descricao-resultado-venda");
const idsIngressosVenda = document.getElementById("ids-ingressos-venda");

const statusImpressao = document.getElementById("status-impressao");
const statusImpressaoTitulo = document.getElementById("status-impressao-titulo");
const statusImpressaoDescricao = document.getElementById("status-impressao-descricao");

const botaoReimprimir = document.getElementById("botao-reimprimir");
const botaoNovaVenda = document.getElementById("botao-nova-venda");


/* =========================================================
   ESTADO
========================================================= */

let sessaoIdAtual = null;
let dadosSessaoAtual = null;

let todosAssentos = [];
let assentosSelecionados = [];
let sessoesDisponiveis = [];

let operacaoAssentoEmAndamento = false;
let vendaEmAndamento = false;

let temporizadorSincronizacaoSelecao = null;
let sincronizacaoSelecaoEmAndamento = false;
let sincronizacaoSelecaoPendente = false;

let carregandoTrocaSessao = false;

let intervaloAtualizacao = null;
let paginaAtiva = true;

let ultimaVendaBilheteria = null;


/* =========================================================
   INICIALIZAÇÃO
========================================================= */

document.addEventListener("DOMContentLoaded", inicializarPagina);

async function inicializarPagina() {
    const usuario = obterUsuarioAutenticado();

    if (!usuario) {
        redirecionarParaLogin();
        return;
    }

    if (usuario.tipoUsuario !== "Funcionario") {
        redirecionarParaHomeCliente();
        return;
    }

    configurarEventos();
    atualizarResumoSelecao();

    try {
        sessaoIdAtual = await resolverSessaoInicial();

        await carregarSessaoCompleta(
            sessaoIdAtual,
            true
        );

        iniciarAtualizacaoAutomatica();
    } catch (erro) {
        console.error(
            "Erro ao inicializar venda de ingressos:",
            erro
        );

        exibirMensagemPagina(
            erro.message ||
            "Não foi possível carregar a tela de venda.",
            "erro"
        );
    }
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
        return JSON.parse(usuarioArmazenado);
    } catch {
        return null;
    }
}


/* =========================================================
   EVENTOS
========================================================= */

function configurarEventos() {
    botaoVoltar?.addEventListener(
        "click",
        voltarPaginaAnterior
    );

    botaoAlterarSessao?.addEventListener(
        "click",
        abrirModalSessoes
    );

    botaoFecharModalSessoes?.addEventListener(
        "click",
        fecharModalSessoes
    );

    modalSessoes
        ?.querySelector(".fundo-modal")
        ?.addEventListener(
            "click",
            fecharModalSessoes
        );

    pesquisaSessao?.addEventListener(
        "input",
        renderizarSessoesFiltradas
    );

    botaoContinuar?.addEventListener(
        "click",
        abrirModalVenda
    );

    botaoFecharModalVenda?.addEventListener(
        "click",
        fecharModalVenda
    );

    modalVenda
        ?.querySelector(".fundo-modal")
        ?.addEventListener(
            "click",
            fecharModalVenda
        );

    botaoFinalizarVenda?.addEventListener(
        "click",
        finalizarVenda
    );

    opcoesPagamento.forEach(opcao => {
        opcao.addEventListener(
            "change",
            () => {
                esconderErroVenda();
                atualizarValoresModalVenda();
            }
        );
    });

    botaoNovaVenda?.addEventListener(
        "click",
        iniciarNovaVenda
    );

    botaoReimprimir?.addEventListener(
        "click",
        tentarReimprimirUltimaVenda
    );

    document.addEventListener(
        "keydown",
        controlarTeclado
    );

    document.addEventListener(
        "visibilitychange",
        tratarVisibilidadePagina
    );

    window.addEventListener(
        "pagehide",
        tratarSaidaPagina
    );

    window.addEventListener(
        "pageshow",
        tratarRetornoPagina
    );
}


/* =========================================================
   SESSÃO INICIAL
========================================================= */

async function resolverSessaoInicial() {
    const parametros = new URLSearchParams(
        window.location.search
    );

    const sessaoId = Number(
        parametros.get("sessaoId")
    );

    if (
        Number.isInteger(sessaoId) &&
        sessaoId > 0
    ) {
        return sessaoId;
    }

    const sessoes = await buscarSessoesFuturas();

    if (!sessoes.length) {
        throw new Error(
            "Não existem sessões futuras disponíveis para venda."
        );
    }

    const proximaSessao = sessoes[0];
    const proximaSessaoId = obterIdSessao(proximaSessao);

    atualizarSessaoIdUrl(
        proximaSessaoId
    );

    return proximaSessaoId;
}


/* =========================================================
   CARREGAMENTO DA SESSÃO
========================================================= */

async function carregarSessaoCompleta(
    sessaoId,
    exibirCarregamento = false
) {
    sessaoIdAtual = Number(sessaoId);

    if (
        !Number.isInteger(sessaoIdAtual) ||
        sessaoIdAtual <= 0
    ) {
        throw new Error(
            "Sessão inválida."
        );
    }

    if (exibirCarregamento) {
        exibirCarregamentoAssentos();
    }

    const [
        sessao,
        assentos
    ] = await Promise.all([
        buscarSessao(sessaoIdAtual),
        buscarStatusAssentos(sessaoIdAtual)
    ]);

    dadosSessaoAtual = sessao;

    const precoIngresso = Number(
        sessao.precoIngresso ??
        sessao.PrecoIngresso
    );

    if (
        !Number.isFinite(precoIngresso) ||
        precoIngresso <= 0
    ) {
        throw new Error(
            "Não foi possível identificar o preço da sessão."
        );
    }

    PRECO_INGRESSO = precoIngresso;

    mostrarDadosSessao(sessao);
    aplicarStatusAssentos(assentos);

    esconderMensagemPagina();
}


/* =========================================================
   BUSCAR SESSÃO
========================================================= */

async function buscarSessao(sessaoId) {
    const resposta = await apiRequest(
        `/Sessao/${sessaoId}`
    );

    if (!resposta.ok) {
        throw criarErroApiRequest(
            resposta,
            "Não foi possível carregar a sessão."
        );
    }

    if (!resposta.data) {
        throw new Error(
            "A sessão não foi encontrada."
        );
    }

    return resposta.data;
}

function mostrarDadosSessao(sessao) {
    const titulo =
        sessao.tituloFilme ??
        sessao.TituloFilme ??
        "Filme";

    const dataHora = new Date(
        sessao.dataHora ??
        sessao.DataHora
    );

    if (tituloFilme) {
        tituloFilme.textContent = titulo;
    }

    if (Number.isNaN(dataHora.getTime())) {
        if (dataSessao) {
            dataSessao.textContent = "--/--/----";
        }

        if (horarioSessao) {
            horarioSessao.textContent = "--:--";
        }

        return;
    }

    if (dataSessao) {
        dataSessao.textContent =
            dataHora.toLocaleDateString(
                "pt-BR",
                {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric"
                }
            );
    }

    if (horarioSessao) {
        horarioSessao.textContent =
            dataHora.toLocaleTimeString(
                "pt-BR",
                {
                    hour: "2-digit",
                    minute: "2-digit"
                }
            );
    }
}


/* =========================================================
   STATUS DOS ASSENTOS
========================================================= */

async function buscarStatusAssentos(
    sessaoId
) {
    return await requisicaoAutenticada(
        `/ReservaAssento/sessao/${sessaoId}`
    );
}

async function sincronizarAssentosComServidor(
    opcoes = {}
) {
    const {
        exibirCarregamento = false,
        exibirErro = false
    } = opcoes;

    if (!sessaoIdAtual) {
        return;
    }

    if (exibirCarregamento) {
        exibirCarregamentoAssentos();
    }

    try {
        const resposta =
            await buscarStatusAssentos(
                sessaoIdAtual
            );

        aplicarStatusAssentos(
            resposta
        );
    } catch (erro) {
        console.error(
            "Erro ao sincronizar assentos:",
            erro
        );

        if (
            exibirErro &&
            mapaAssentos
        ) {
            mapaAssentos.innerHTML = `
                <p class="mensagem-erro">
                    Não foi possível carregar os assentos.
                </p>
            `;
        }

        if (erro.status === 401) {
            redirecionarParaLogin();
        }

        throw erro;
    }
}

function aplicarStatusAssentos(
    resposta
) {
    if (!Array.isArray(resposta)) {
        throw new Error(
            "A API não retornou uma lista válida de assentos."
        );
    }

    todosAssentos =
        resposta.map(
            normalizarStatusAssento
        );

    assentosSelecionados =
        todosAssentos.filter(
            assento =>
                assento.status === "reservado" &&
                assento.reservadoPeloUsuarioAtual
        );

    mostrarAssentos(
        todosAssentos
    );
}

function normalizarStatusAssento(
    assento
) {
    const id = Number(
        assento.assentoId ??
        assento.AssentoId ??
        assento.id ??
        assento.Id
    );

    const codigo = String(
        assento.codigo ??
        assento.Codigo ??
        ""
    );

    const status = String(
        assento.status ??
        assento.Status ??
        "disponivel"
    ).toLowerCase();

    const reservadoPeloUsuarioAtual =
        Boolean(
            assento.reservadoPeloUsuarioAtual ??
            assento.ReservadoPeloUsuarioAtual
        );

    return {
        id,
        assentoId: id,
        codigo,
        status,
        reservadoPeloUsuarioAtual,

        reservaExpiraEm:
            assento.reservaExpiraEm ??
            assento.ReservaExpiraEm ??
            null
    };
}


/* =========================================================
   MAPA
========================================================= */

function mostrarAssentos(
    assentos
) {
    if (!mapaAssentos) {
        return;
    }

    mapaAssentos.innerHTML = "";

    atualizarContadores(
        assentos
    );

    const assentosPorFileira =
        organizarAssentosPorFileira(
            assentos
        );

    const ordemFileiras = [
        "J",
        "I",
        "H",
        "G",
        "F",
        "E",
        "D",
        "C",
        "B",
        "A"
    ];

    ordemFileiras.forEach(
        letraFileira => {
            const assentosFileira =
                assentosPorFileira[
                    letraFileira
                ];

            if (!assentosFileira) {
                return;
            }

            mapaAssentos.appendChild(
                criarFileira(
                    letraFileira,
                    assentosFileira
                )
            );
        }
    );

    atualizarResumoSelecao();
}

function organizarAssentosPorFileira(
    assentos
) {
    const resultado = {};

    assentos.forEach(
        assento => {
            const letra =
                assento.codigo
                    .charAt(0)
                    .toUpperCase();

            if (!resultado[letra]) {
                resultado[letra] = [];
            }

            resultado[letra].push(
                assento
            );
        }
    );

    Object.values(resultado)
        .forEach(fileira => {
            fileira.sort(
                (a, b) =>
                    obterNumeroAssento(
                        a.codigo
                    ) -
                    obterNumeroAssento(
                        b.codigo
                    )
            );
        });

    return resultado;
}

function criarFileira(
    letraFileira,
    assentos
) {
    const fileira =
        document.createElement(
            "div"
        );

    fileira.classList.add(
        "fileira"
    );

    const identificadorEsquerdo =
        criarIdentificadorFileira(
            letraFileira
        );

    const areaAssentos =
        document.createElement(
            "div"
        );

    areaAssentos.classList.add(
        "area-assentos-fileira"
    );

    assentos.forEach(
        assento => {
            const numeroAssento =
                obterNumeroAssento(
                    assento.codigo
                );

            const elemento =
                criarAssento(
                    assento
                );

            elemento.style.gridColumn =
                obterColunaAssento(
                    letraFileira,
                    numeroAssento
                );

            areaAssentos.appendChild(
                elemento
            );
        }
    );

    const identificadorDireito =
        criarIdentificadorFileira(
            letraFileira
        );

    fileira.append(
        identificadorEsquerdo,
        areaAssentos,
        identificadorDireito
    );

    return fileira;
}

function obterColunaAssento(
    letraFileira,
    numeroAssento
) {
    if (letraFileira === "J") {
        return numeroAssento;
    }

    if (numeroAssento <= 4) {
        return numeroAssento;
    }

    if (numeroAssento <= 11) {
        return numeroAssento + 2;
    }

    return numeroAssento + 4;
}

function criarIdentificadorFileira(
    letraFileira
) {
    const identificador =
        document.createElement(
            "span"
        );

    identificador.classList.add(
        "identificador-fileira"
    );

    identificador.textContent =
        letraFileira;

    return identificador;
}

function obterNumeroAssento(
    codigo
) {
    return Number(
        codigo.substring(1)
    );
}

/* =========================================================
   ASSENTO
========================================================= */

function criarAssento(assento) {
    const botao =
        document.createElement("button");

    botao.type = "button";

    botao.classList.add(
        "assento"
    );

    botao.textContent =
        obterNumeroAssento(
            assento.codigo
        );

    botao.dataset.assentoId =
        assento.id;

    botao.dataset.codigo =
        assento.codigo;

    const reservadoPeloFuncionario =
        assento.status === "reservado" &&
        assento.reservadoPeloUsuarioAtual;

    const indisponivel =
        assento.status === "ocupado" ||
        (
            assento.status === "reservado" &&
            !assento.reservadoPeloUsuarioAtual
        ) ||
        assento.status === "bloqueado";

    if (reservadoPeloFuncionario) {
        botao.classList.add(
            "selecionado"
        );

        botao.title =
            `Assento ${assento.codigo} selecionado`;

        botao.addEventListener(
            "click",
            () =>
                cancelarSelecaoAssento(
                    assento
                )
        );

    } else if (indisponivel) {
        botao.classList.add(
            "ocupado"
        );

        if (
            assento.status === "bloqueado"
        ) {
            botao.classList.add(
                "bloqueado"
            );
        }

        botao.disabled = true;

        botao.title =
            `Assento ${assento.codigo} indisponível`;

    } else {
        botao.classList.add(
            "disponivel"
        );

        botao.title =
            `Assento ${assento.codigo} disponível`;

        botao.addEventListener(
            "click",
            () =>
                reservarAssento(
                    assento
                )
        );
    }

    if (vendaEmAndamento) {
        botao.disabled = true;
    }

    return botao;
}


/* =========================================================
   SELEÇÃO OTIMISTA
========================================================= */

function reservarAssento(assento) {
    if (
        vendaEmAndamento ||
        assentosSelecionados.some(
            item =>
                item.id === assento.id
        )
    ) {
        return;
    }

    /*
        Atualiza primeiro o estado local.

        Isso faz o assento ficar selecionado
        imediatamente, sem esperar Railway/API/MySQL.
    */

    assentosSelecionados.push({
        ...assento,
        status: "reservado",
        reservadoPeloUsuarioAtual: true
    });

    atualizarAssentoLocal(
        assento.id,
        "reservado",
        true
    );

    mostrarAssentos(
        todosAssentos
    );

    /*
        A comunicação com o servidor acontece
        depois, em segundo plano.
    */

    agendarSincronizacaoSelecao();
}


function cancelarSelecaoAssento(
    assento
) {
    if (vendaEmAndamento) {
        return;
    }

    /*
        Remove imediatamente da seleção local.
    */

    assentosSelecionados =
        assentosSelecionados.filter(
            item =>
                item.id !== assento.id
        );

    atualizarAssentoLocal(
        assento.id,
        "disponivel",
        false
    );

    mostrarAssentos(
        todosAssentos
    );

    /*
        Agenda a atualização do backend sem
        bloquear os próximos cliques.
    */

    agendarSincronizacaoSelecao();
}


function atualizarAssentoLocal(
    assentoId,
    status,
    reservadoPeloUsuarioAtual
) {
    const assento =
        todosAssentos.find(
            item =>
                item.id === assentoId
        );

    if (!assento) {
        return;
    }

    assento.status =
        status;

    assento.reservadoPeloUsuarioAtual =
        reservadoPeloUsuarioAtual;
}


/* =========================================================
   AGENDAMENTO DA SINCRONIZAÇÃO
========================================================= */

function agendarSincronizacaoSelecao() {
    sincronizacaoSelecaoPendente =
        true;

    /*
        Se o funcionário clicar em vários
        assentos rapidamente, reiniciamos
        este temporizador.

        Exemplo:

        F7
        F8
        F9
        F10

        Tudo isso dentro de ~200ms pode virar
        uma única sincronização.
    */

    if (
        temporizadorSincronizacaoSelecao
    ) {
        window.clearTimeout(
            temporizadorSincronizacaoSelecao
        );
    }

    temporizadorSincronizacaoSelecao =
        window.setTimeout(
            sincronizarSelecaoComServidor,
            ATRASO_SINCRONIZACAO_SELECAO_MS
        );
}


/* =========================================================
   SINCRONIZAÇÃO COM O SERVIDOR
========================================================= */

async function sincronizarSelecaoComServidor() {
    temporizadorSincronizacaoSelecao =
        null;

    /*
        Se já existe uma sincronização acontecendo,
        não criamos outra simultaneamente.

        Apenas marcamos que existe uma atualização
        mais recente esperando para ser enviada.
    */

    if (
        sincronizacaoSelecaoEmAndamento
    ) {
        sincronizacaoSelecaoPendente =
            true;

        return;
    }

    sincronizacaoSelecaoEmAndamento =
        true;

    sincronizacaoSelecaoPendente =
        false;

    definirEstadoOperacaoAssento(
        true
    );

    /*
        Tiramos uma fotografia da seleção atual.
    */

    const assentoIds =
        assentosSelecionados.map(
            assento =>
                assento.id
        );

    try {

        /*
            Primeiro removemos as reservas atuais
            deste funcionário nesta sessão.

            Depois recriamos a seleção atual
            inteira usando o endpoint em lote.

            Dessa forma, o estado do backend
            fica igual ao estado atual da tela.
        */

        await requisicaoAutenticada(
            `/ReservaAssento/minhas?sessaoId=${sessaoIdAtual}`,
            {
                method: "DELETE"
            }
        );

        if (assentoIds.length) {
            await requisicaoAutenticada(
                "/ReservaAssento/lote",
                {
                    method: "POST",

                    body: JSON.stringify({
                        sessaoId:
                            sessaoIdAtual,

                        assentoIds
                    })
                }
            );
        }

        esconderMensagemPagina();

    } catch (erro) {
        console.error(
            "Erro ao sincronizar seleção de assentos:",
            erro
        );

        if (
            erro.status === 401
        ) {
            redirecionarParaLogin();
            return;
        }

        exibirMensagemPagina(
            erro.message ||
            "Não foi possível atualizar a seleção.",
            "erro"
        );

    } finally {

        sincronizacaoSelecaoEmAndamento =
            false;

        /*
            Se o funcionário clicou em outro
            assento enquanto a API respondia,
            existe uma versão mais recente
            da seleção.

            Nesse caso sincronizamos novamente.
        */

        if (
            sincronizacaoSelecaoPendente
        ) {
            sincronizarSelecaoComServidor();
            return;
        }

        /*
            Depois da operação, buscamos o estado
            verdadeiro da sessão no servidor.

            Isso também resolve conflitos caso
            outra pessoa tenha reservado algum
            daqueles assentos.
        */

        try {
            await sincronizarAssentosComServidor();
        } catch {
            /*
                O próprio método já trata/loga
                o erro de sincronização.
            */
        }

        definirEstadoOperacaoAssento(
            false
        );
    }
}


/* =========================================================
   ESTADO DA OPERAÇÃO
========================================================= */

function definirEstadoOperacaoAssento(
    emAndamento
) {
    operacaoAssentoEmAndamento =
        emAndamento;

    /*
        IMPORTANTE:

        Não desabilitamos todos os assentos.

        A sincronização acontece em background
        enquanto o funcionário continua podendo
        selecionar outros lugares.
    */

    atualizarEstadoBotaoContinuar();
}


/* =========================================================
   GARANTIR SINCRONIZAÇÃO
========================================================= */

async function garantirSelecaoSincronizada() {

    /*
        Pode acontecer de o funcionário:

        selecionar F7
        selecionar F8
        clicar imediatamente em Continuar

        antes dos 200ms do debounce terminarem.

        Nesse caso forçamos a sincronização antes
        de prosseguir para a venda.
    */

    if (
        temporizadorSincronizacaoSelecao
    ) {
        window.clearTimeout(
            temporizadorSincronizacaoSelecao
        );

        temporizadorSincronizacaoSelecao =
            null;

        await sincronizarSelecaoComServidor();
    }

    /*
        Se já existe uma requisição acontecendo,
        esperamos ela terminar antes da venda.
    */

    while (
        sincronizacaoSelecaoEmAndamento ||
        sincronizacaoSelecaoPendente
    ) {
        await new Promise(
            resolve =>
                window.setTimeout(
                    resolve,
                    25
                )
        );
    }
}


/* =========================================================
   CONTADORES
========================================================= */

function atualizarContadores(
    assentos
) {
    const disponiveis =
        assentos.filter(
            assento =>
                assento.status ===
                "disponivel"
        ).length;

    const ocupados =
        assentos.filter(
            assento =>
                assento.status ===
                    "ocupado" ||
                assento.status ===
                    "bloqueado" ||
                (
                    assento.status ===
                        "reservado" &&
                    !assento.reservadoPeloUsuarioAtual
                )
        ).length;

    if (quantidadeDisponiveis) {
        quantidadeDisponiveis.textContent =
            disponiveis;
    }

    if (quantidadeOcupados) {
        quantidadeOcupados.textContent =
            ocupados;
    }

    if (quantidadeSelecionados) {
        quantidadeSelecionados.textContent =
            assentosSelecionados.length;
    }
}


/* =========================================================
   RESUMO DA SELEÇÃO
========================================================= */

function atualizarResumoSelecao() {
    if (
        quantidadeSelecionados
    ) {
        quantidadeSelecionados.textContent =
            assentosSelecionados.length;
    }

    if (
        listaAssentosSelecionados
    ) {
        listaAssentosSelecionados.innerHTML =
            "";

        if (
            !assentosSelecionados.length
        ) {
            const mensagem =
                document.createElement(
                    "span"
                );

            mensagem.classList.add(
                "nenhum-assento"
            );

            mensagem.textContent =
                "Nenhum assento selecionado";

            listaAssentosSelecionados.appendChild(
                mensagem
            );
        } else {
            const ordenados = [
                ...assentosSelecionados
            ].sort(
                compararAssentos
            );

            ordenados.forEach(
                assento => {
                    const item =
                        document.createElement(
                            "span"
                        );

                    item.classList.add(
                        "assento-selecionado"
                    );

                    item.textContent =
                        assento.codigo;

                    listaAssentosSelecionados.appendChild(
                        item
                    );
                }
            );
        }
    }

    const total =
        assentosSelecionados.length *
        PRECO_INGRESSO;

    if (valorTotal) {
        valorTotal.textContent =
            formatarMoeda(
                total
            );
    }

    atualizarEstadoBotaoContinuar();
}


/* =========================================================
   BOTÃO CONTINUAR
========================================================= */

function atualizarEstadoBotaoContinuar() {
    if (!botaoContinuar) {
        return;
    }

    botaoContinuar.disabled =
        vendaEmAndamento ||
        assentosSelecionados.length === 0;
}


/* =========================================================
   ORDENAÇÃO DOS ASSENTOS
========================================================= */

function compararAssentos(
    a,
    b
) {
    const fileiraA =
        a.codigo
            .charAt(0)
            .toUpperCase();

    const fileiraB =
        b.codigo
            .charAt(0)
            .toUpperCase();

    if (
        fileiraA !== fileiraB
    ) {
        return fileiraA.localeCompare(
            fileiraB
        );
    }

    return (
        obterNumeroAssento(
            a.codigo
        ) -
        obterNumeroAssento(
            b.codigo
        )
    );
}

/* =========================================================
   CONTADORES
========================================================= */

function atualizarContadores(
    assentos
) {
    if (
        !quantidadeDisponiveis ||
        !quantidadeOcupados
    ) {
        return;
    }

    const disponiveis =
        assentos.filter(
            assento =>
                assento.status ===
                "disponivel"
        ).length;

    const ocupados =
        assentos.filter(
            assento =>
                assento.status ===
                    "ocupado" ||
                assento.status ===
                    "bloqueado" ||
                (
                    assento.status ===
                        "reservado" &&
                    !assento.reservadoPeloUsuarioAtual
                )
        ).length;

    quantidadeDisponiveis.textContent =
        disponiveis;

    quantidadeOcupados.textContent =
        ocupados;
}


/* =========================================================
   RESUMO DA SELEÇÃO
========================================================= */

function atualizarResumoSelecao() {
    const quantidade =
        assentosSelecionados.length;

    if (quantidadeSelecionados) {
        quantidadeSelecionados.textContent =
            quantidade;
    }

    if (!quantidade) {
        if (
            listaAssentosSelecionados
        ) {
            listaAssentosSelecionados.innerHTML = `
                <span class="nenhum-assento">
                    Nenhum assento selecionado
                </span>
            `;
        }

        if (valorTotal) {
            valorTotal.textContent =
                formatarPreco(0);
        }

        atualizarEstadoBotaoContinuar();
        notificarAlteracaoSelecao();

        return;
    }

    assentosSelecionados.sort(
        (a, b) =>
            a.codigo.localeCompare(
                b.codigo,
                "pt-BR",
                {
                    numeric: true
                }
            )
    );

    if (
        listaAssentosSelecionados
    ) {
        listaAssentosSelecionados.textContent =
            assentosSelecionados
                .map(
                    assento =>
                        assento.codigo
                )
                .join(" - ");
    }

    if (valorTotal) {
        valorTotal.textContent =
            formatarPreco(
                obterValorTotal()
            );
    }

    atualizarEstadoBotaoContinuar();
    notificarAlteracaoSelecao();
}

function atualizarEstadoBotaoContinuar() {
    if (!botaoContinuar) {
        return;
    }

    botaoContinuar.disabled =
        vendaEmAndamento ||
        assentosSelecionados.length === 0;
}

function obterValorTotal() {
    return (
        assentosSelecionados.length *
        PRECO_INGRESSO
    );
}

function notificarAlteracaoSelecao() {
    document.dispatchEvent(
        new CustomEvent(
            "assentos:selecao-alterada",
            {
                detail: {
                    assentos:
                        obterAssentosSelecionados(),

                    quantidade:
                        assentosSelecionados.length,

                    valorTotal:
                        obterValorTotal()
                }
            }
        )
    );
}

function obterAssentosSelecionados() {
    return [
        ...assentosSelecionados
    ];
}


/* =========================================================
   ATUALIZAÇÃO QUASE EM TEMPO REAL
========================================================= */

function iniciarAtualizacaoAutomatica() {
    pararAtualizacaoAutomatica();

    intervaloAtualizacao =
        window.setInterval(
            async () => {
                if (
                    !paginaAtiva ||
                    document.hidden ||
                    vendaEmAndamento ||
                    sincronizacaoSelecaoEmAndamento ||
                    sincronizacaoSelecaoPendente
                ) {
                    return;
                }

                try {
                    await sincronizarAssentosComServidor();
                } catch {
                    /* atualização silenciosa */
                }
            },
            INTERVALO_ATUALIZACAO_MS
        );
}

function pararAtualizacaoAutomatica() {
    if (
        intervaloAtualizacao ===
        null
    ) {
        return;
    }

    window.clearInterval(
        intervaloAtualizacao
    );

    intervaloAtualizacao = null;
}

function tratarVisibilidadePagina() {
    if (document.hidden) {
        return;
    }

    sincronizarAssentosComServidor()
        .catch(() => {});
}

function tratarSaidaPagina() {
    paginaAtiva = false;

    pararAtualizacaoAutomatica();
}

function tratarRetornoPagina() {
    paginaAtiva = true;

    sincronizarAssentosComServidor()
        .catch(() => {});

    iniciarAtualizacaoAutomatica();
}


/* =========================================================
   TROCA DE SESSÃO
========================================================= */

async function abrirModalSessoes() {
    if (
        carregandoTrocaSessao ||
        vendaEmAndamento
    ) {
        return;
    }

    abrirModal(
        modalSessoes
    );

    if (pesquisaSessao) {
        pesquisaSessao.value = "";
    }

    if (listaSessoes) {
        listaSessoes.innerHTML = `
            <div class="carregando-sessoes">
                Carregando sessões...
            </div>
        `;
    }

    carregandoTrocaSessao = true;

    try {
        sessoesDisponiveis =
            await buscarSessoesFuturas();

        renderizarSessoesFiltradas();

        pesquisaSessao?.focus();

    } catch (erro) {
        console.error(
            "Erro ao carregar sessões:",
            erro
        );

        if (listaSessoes) {
            listaSessoes.innerHTML = `
                <p class="mensagem-erro">
                    Não foi possível carregar as sessões.
                </p>
            `;
        }

    } finally {
        carregandoTrocaSessao = false;
    }
}

function fecharModalSessoes() {
    if (carregandoTrocaSessao) {
        return;
    }

    fecharModal(
        modalSessoes
    );
}

async function buscarSessoesFuturas() {
    const resposta =
        await apiRequest(
            "/Sessao/ativas"
        );

    if (!resposta.ok) {
        throw criarErroApiRequest(
            resposta,
            "Não foi possível carregar as sessões."
        );
    }

    if (
        !Array.isArray(
            resposta.data
        )
    ) {
        throw new Error(
            "A API retornou sessões inválidas."
        );
    }

    const agora = new Date();

    return resposta.data
        .filter(sessao => {
            const dataHora =
                new Date(
                    sessao.dataHora ??
                    sessao.DataHora
                );

            return (
                !Number.isNaN(
                    dataHora.getTime()
                ) &&
                dataHora > agora
            );
        })
        .sort(
            (a, b) =>
                new Date(
                    a.dataHora ??
                    a.DataHora
                ) -
                new Date(
                    b.dataHora ??
                    b.DataHora
                )
        );
}

function renderizarSessoesFiltradas() {
    if (!listaSessoes) {
        return;
    }

    const pesquisa =
        pesquisaSessao?.value
            .trim()
            .toLocaleLowerCase(
                "pt-BR"
            ) || "";

    const filtradas =
        sessoesDisponiveis.filter(
            sessao =>
                String(
                    sessao.tituloFilme ??
                    sessao.TituloFilme ??
                    ""
                )
                    .toLocaleLowerCase(
                        "pt-BR"
                    )
                    .includes(
                        pesquisa
                    )
        );

    listaSessoes.replaceChildren();

    if (!filtradas.length) {
        const mensagem =
            document.createElement(
                "p"
            );

        mensagem.className =
            "nenhuma-sessao";

        mensagem.textContent =
            "Nenhuma sessão encontrada.";

        listaSessoes.append(
            mensagem
        );

        return;
    }

    const grupos =
        agruparSessoesPorDia(
            filtradas
        );

    grupos.forEach(grupo => {
        listaSessoes.append(
            criarGrupoSessoes(
                grupo
            )
        );
    });
}

function agruparSessoesPorDia(
    sessoes
) {
    const mapa = new Map();

    sessoes.forEach(sessao => {
        const data =
            new Date(
                sessao.dataHora ??
                sessao.DataHora
            );

        const chave =
            obterChaveDataLocal(
                data
            );

        if (!mapa.has(chave)) {
            mapa.set(
                chave,
                {
                    data,
                    sessoes: []
                }
            );
        }

        mapa.get(chave)
            .sessoes
            .push(sessao);
    });

    return Array.from(
        mapa.values()
    );
}

function criarGrupoSessoes(
    grupo
) {
    const container =
        document.createElement(
            "section"
        );

    container.className =
        "grupo-sessoes";

    const cabecalho =
        document.createElement(
            "div"
        );

    cabecalho.className =
        "cabecalho-grupo-sessoes";

    const nomeDia =
        document.createElement(
            "strong"
        );

    nomeDia.textContent =
        obterNomeRelativoDia(
            grupo.data
        );

    const data =
        document.createElement(
            "span"
        );

    data.textContent =
        formatarData(
            grupo.data
        );

    cabecalho.append(
        nomeDia,
        data
    );

    const lista =
        document.createElement(
            "div"
        );

    lista.className =
        "opcoes-sessoes";

    grupo.sessoes.forEach(
        sessao => {
            lista.append(
                criarOpcaoSessao(
                    sessao
                )
            );
        }
    );

    container.append(
        cabecalho,
        lista
    );

    return container;
}

function criarOpcaoSessao(
    sessao
) {
    const botao =
        document.createElement(
            "button"
        );

    botao.type =
        "button";

    botao.className =
        "opcao-sessao";

    const sessaoId =
        obterIdSessao(
            sessao
        );

    const dataHora =
        new Date(
            sessao.dataHora ??
            sessao.DataHora
        );

    const titulo =
        sessao.tituloFilme ??
        sessao.TituloFilme ??
        "Filme";

    const horario =
        formatarHorario(
            dataHora
        );

    botao.innerHTML = `
        <span class="opcao-sessao-filme">
            ${escaparHtml(titulo)}
        </span>

        <span class="opcao-sessao-horario">
            ${escaparHtml(horario)}
        </span>
    `;

    if (
        sessaoId ===
        sessaoIdAtual
    ) {
        botao.classList.add(
            "selecionada"
        );

        botao.disabled = true;
    }

    botao.addEventListener(
        "click",
        () =>
            trocarSessao(
                sessaoId
            )
    );

    return botao;
}

async function trocarSessao(
    novaSessaoId
) {
    if (
        carregandoTrocaSessao ||
        vendaEmAndamento ||
        novaSessaoId === sessaoIdAtual
    ) {
        return;
    }

    carregandoTrocaSessao =
        true;

    try {
        await liberarReservasSessaoAtual();

        assentosSelecionados = [];

        atualizarResumoSelecao();

        fecharModal(
            modalSessoes
        );

        atualizarSessaoIdUrl(
            novaSessaoId
        );

        await carregarSessaoCompleta(
            novaSessaoId,
            true
        );

    } catch (erro) {
        console.error(
            "Erro ao trocar sessão:",
            erro
        );

        exibirMensagemPagina(
            erro.message ||
            "Não foi possível trocar de sessão.",
            "erro"
        );

    } finally {
        carregandoTrocaSessao =
            false;
    }
}

function obterIdSessao(
    sessao
) {
    return Number(
        sessao.id ??
        sessao.Id
    );
}


/* =========================================================
   MODAL DE VENDA
========================================================= */

async function abrirModalVenda() {
    if (
        !assentosSelecionados.length ||
        vendaEmAndamento
    ) {
        return;
    }

    /*
        Antes de permitir que o funcionário
        prossiga para o pagamento, garantimos
        que a seleção otimista já chegou ao
        servidor.
    */

    await garantirSelecaoSincronizada();

    if (
        !assentosSelecionados.length
    ) {
        return;
    }

    esconderErroVenda();
    limparFormaPagamento();
    preencherResumoVenda();

    abrirModal(
        modalVenda
    );
}

function fecharModalVenda() {
    if (vendaEmAndamento) {
        return;
    }

    fecharModal(
        modalVenda
    );
}

function preencherResumoVenda() {
    if (
        ingressosSelecionados
    ) {
        ingressosSelecionados.replaceChildren();

        assentosSelecionados
            .slice()
            .sort(
                (a, b) =>
                    a.codigo.localeCompare(
                        b.codigo,
                        "pt-BR",
                        {
                            numeric: true
                        }
                    )
            )
            .forEach(
                assento => {
                    const item =
                        document.createElement(
                            "div"
                        );

                    item.className =
                        "item-ingresso";

                    const codigo =
                        document.createElement(
                            "span"
                        );

                    codigo.textContent =
                        `Assento ${assento.codigo}`;

                    const preco =
                        document.createElement(
                            "strong"
                        );

                    preco.textContent =
                        formatarPreco(
                            PRECO_INGRESSO
                        );

                    item.append(
                        codigo,
                        preco
                    );

                    ingressosSelecionados.append(
                        item
                    );
                }
            );
    }

    atualizarValoresModalVenda();
}

function atualizarValoresModalVenda() {
    const total =
        obterValorTotal();

    if (valorTotalModal) {
        valorTotalModal.textContent =
            formatarPreco(
                total
            );
    }
}

function limparFormaPagamento() {
    opcoesPagamento.forEach(
        opcao => {
            opcao.checked = false;
        }
    );
}

function obterFormaPagamentoSelecionada() {
    const opcao =
        document.querySelector(
            'input[name="formaPagamento"]:checked'
        );

    return (
        opcao?.value ??
        null
    );
}


/* =========================================================
   FINALIZAR VENDA
========================================================= */

async function finalizarVenda() {
    if (
        vendaEmAndamento
    ) {
        return;
    }

    if (
        !assentosSelecionados.length
    ) {
        exibirErroVenda(
            "Selecione pelo menos um assento."
        );

        return;
    }

    const formaPagamento =
        obterFormaPagamentoSelecionada();

    if (!formaPagamento) {
        exibirErroVenda(
            "Selecione uma forma de pagamento."
        );

        return;
    }

    vendaEmAndamento = true;

    definirEstadoVenda(
        true
    );

    esconderErroVenda();

    const assentosDaVenda =
        assentosSelecionados.map(
            assento =>
                assento.id
        );

    try {
        const venda =
            await requisicaoAutenticada(
                "/Ingresso/venda-bilheteria",
                {
                    method: "POST",

                    body: JSON.stringify({
                        sessaoId:
                            sessaoIdAtual,

                        assentoIds:
                            assentosDaVenda,

                        formaPagamento
                    })
                }
            );

        ultimaVendaBilheteria =
            venda;

        fecharModal(
            modalVenda
        );

        mostrarResultadoVenda(
            venda
        );

        assentosSelecionados =
            [];

        await sincronizarAssentosComServidor();

    } catch (erro) {
        console.error(
            "Erro ao finalizar venda:",
            erro
        );

        if (
            erro.status === 401
        ) {
            redirecionarParaLogin();
            return;
        }

        exibirErroVenda(
            erro.message ||
            "Não foi possível finalizar a venda."
        );

    } finally {
        vendaEmAndamento =
            false;

        definirEstadoVenda(
            false
        );
    }
}

function definirEstadoVenda(
    emAndamento
) {
    if (botaoFinalizarVenda) {
        botaoFinalizarVenda.disabled =
            emAndamento;

        botaoFinalizarVenda.textContent =
            emAndamento
                ? "Finalizando..."
                : "Finalizar venda";
    }

    opcoesPagamento.forEach(
        opcao => {
            opcao.disabled =
                emAndamento;
        }
    );

    mapaAssentos
        ?.querySelectorAll(
            "button.assento"
        )
        .forEach(
            botao => {
                botao.disabled =
                    emAndamento ||
                    botao.classList.contains(
                        "ocupado"
                    );
            }
        );

    atualizarEstadoBotaoContinuar();
}


/* =========================================================
   RESULTADO DA VENDA
========================================================= */

function mostrarResultadoVenda(
    venda
) {
    const vendaId =
        venda?.vendaId ??
        venda?.VendaId ??
        venda?.id ??
        venda?.Id ??
        null;

    const ingressos =
        venda?.ingressos ??
        venda?.Ingressos ??
        [];

    if (
        tituloResultadoVenda
    ) {
        tituloResultadoVenda.textContent =
            "Venda concluída";
    }

    if (
        descricaoResultadoVenda
    ) {
        descricaoResultadoVenda.textContent =
            vendaId
                ? `Venda #${vendaId} realizada com sucesso.`
                : "Venda realizada com sucesso.";
    }

    if (
        idsIngressosVenda
    ) {
        idsIngressosVenda.replaceChildren();

        if (
            Array.isArray(ingressos) &&
            ingressos.length
        ) {
            ingressos.forEach(
                ingresso => {
                    const ingressoId =
                        ingresso.id ??
                        ingresso.Id ??
                        ingresso.ingressoId ??
                        ingresso.IngressoId;

                    const codigoAssento =
                        ingresso.codigoAssento ??
                        ingresso.CodigoAssento ??
                        ingresso.assentoCodigo ??
                        ingresso.AssentoCodigo ??
                        null;

                    const item =
                        document.createElement(
                            "div"
                        );

                    item.className =
                        "ingresso-venda-realizada";

                    item.textContent =
                        codigoAssento
                            ? `Ingresso #${ingressoId} — Assento ${codigoAssento}`
                            : `Ingresso #${ingressoId}`;

                    idsIngressosVenda.append(
                        item
                    );
                }
            );
        }
    }

    atualizarStatusImpressao(
        "pendente"
    );

    abrirModal(
        modalResultadoVenda
    );

    tentarImprimirUltimaVenda();
}

function atualizarStatusImpressao(
    status
) {
    if (
        !statusImpressao ||
        !statusImpressaoTitulo ||
        !statusImpressaoDescricao
    ) {
        return;
    }

    statusImpressao.classList.remove(
        "sucesso",
        "erro",
        "pendente"
    );

    statusImpressao.classList.add(
        status
    );

    if (status === "sucesso") {
        statusImpressaoTitulo.textContent =
            "Impressão concluída";

        statusImpressaoDescricao.textContent =
            "Os ingressos foram enviados para impressão.";

        return;
    }

    if (status === "erro") {
        statusImpressaoTitulo.textContent =
            "Não foi possível imprimir";

        statusImpressaoDescricao.textContent =
            "Você pode tentar imprimir novamente.";

        return;
    }

    statusImpressaoTitulo.textContent =
        "Preparando impressão";

    statusImpressaoDescricao.textContent =
        "Aguarde enquanto os ingressos são preparados.";
}

/* =========================================================
   IMPRESSÃO
========================================================= */

async function tentarImprimirUltimaVenda() {
    if (!ultimaVendaBilheteria) {
        atualizarStatusImpressao(
            "erro"
        );

        return;
    }

    atualizarStatusImpressao(
        "pendente"
    );

    try {
        await imprimirVenda(
            ultimaVendaBilheteria
        );

        atualizarStatusImpressao(
            "sucesso"
        );

    } catch (erro) {
        console.error(
            "Erro ao imprimir ingressos:",
            erro
        );

        atualizarStatusImpressao(
            "erro"
        );
    }
}

async function tentarReimprimirUltimaVenda() {
    if (!ultimaVendaBilheteria) {
        return;
    }

    if (botaoReimprimir) {
        botaoReimprimir.disabled =
            true;
    }

    try {
        await tentarImprimirUltimaVenda();

    } finally {
        if (botaoReimprimir) {
            botaoReimprimir.disabled =
                false;
        }
    }
}

async function imprimirVenda(
    venda
) {
    /*
        Aqui permanece a lógica de impressão
        utilizada pelo projeto.

        Se o seu arquivo original possui uma
        implementação específica para gerar
        ou abrir os ingressos, mantenha essa
        implementação aqui.
    */

    const ingressos =
        venda?.ingressos ??
        venda?.Ingressos ??
        [];

    if (
        !Array.isArray(ingressos) ||
        !ingressos.length
    ) {
        throw new Error(
            "Nenhum ingresso disponível para impressão."
        );
    }

    window.print();
}


/* =========================================================
   NOVA VENDA
========================================================= */

async function iniciarNovaVenda() {
    fecharModal(
        modalResultadoVenda
    );

    ultimaVendaBilheteria =
        null;

    assentosSelecionados =
        [];

    limparFormaPagamento();

    atualizarResumoSelecao();

    try {
        await sincronizarAssentosComServidor();

    } catch {
        /*
            O erro de sincronização já é tratado
            pelo próprio método.
        */
    }
}


/* =========================================================
   LIBERAR RESERVAS
========================================================= */

async function liberarReservasSessaoAtual() {
    if (!sessaoIdAtual) {
        return;
    }

    try {
        await requisicaoAutenticada(
            `/ReservaAssento/minhas?sessaoId=${sessaoIdAtual}`,
            {
                method: "DELETE"
            }
        );

    } catch (erro) {
        console.error(
            "Erro ao liberar reservas:",
            erro
        );

        if (
            erro.status === 401
        ) {
            redirecionarParaLogin();
        }

        throw erro;
    }
}


/* =========================================================
   VOLTAR
========================================================= */

async function voltarPaginaAnterior() {
    if (vendaEmAndamento) {
        return;
    }

    pararAtualizacaoAutomatica();

    try {
        await liberarReservasSessaoAtual();

    } catch {
        /*
            Mesmo se não for possível liberar,
            não prendemos o funcionário na página.
        */
    }

    if (
        window.history.length > 1
    ) {
        window.history.back();
        return;
    }

    window.location.href =
        "../home-funcionario.html";
}


/* =========================================================
   TECLADO
========================================================= */

function controlarTeclado(
    evento
) {
    if (
        evento.key !== "Escape"
    ) {
        return;
    }

    if (
        modalResultadoVenda &&
        !modalResultadoVenda.hidden
    ) {
        return;
    }

    if (
        modalVenda &&
        !modalVenda.hidden
    ) {
        fecharModalVenda();
        return;
    }

    if (
        modalSessoes &&
        !modalSessoes.hidden
    ) {
        fecharModalSessoes();
    }
}


/* =========================================================
   MODAIS
========================================================= */

function abrirModal(
    modal
) {
    if (!modal) {
        return;
    }

    modal.hidden = false;

    document.body.classList.add(
        "modal-aberto"
    );
}

function fecharModal(
    modal
) {
    if (!modal) {
        return;
    }

    modal.hidden = true;

    const existeOutroModalAberto =
        Array.from(
            document.querySelectorAll(
                ".modal"
            )
        ).some(
            item =>
                !item.hidden
        );

    if (
        !existeOutroModalAberto
    ) {
        document.body.classList.remove(
            "modal-aberto"
        );
    }
}


/* =========================================================
   MENSAGENS - PÁGINA
========================================================= */

function exibirMensagemPagina(
    mensagem,
    tipo = "erro"
) {
    if (!mensagemPagina) {
        return;
    }

    mensagemPagina.textContent =
        mensagem;

    mensagemPagina.className =
        `mensagem-pagina ${tipo}`;

    mensagemPagina.hidden =
        false;
}

function esconderMensagemPagina() {
    if (!mensagemPagina) {
        return;
    }

    mensagemPagina.hidden =
        true;

    mensagemPagina.textContent =
        "";
}


/* =========================================================
   MENSAGENS - VENDA
========================================================= */

function exibirErroVenda(
    mensagem
) {
    if (!mensagemModalVenda) {
        return;
    }

    mensagemModalVenda.textContent =
        mensagem;

    mensagemModalVenda.hidden =
        false;
}

function esconderErroVenda() {
    if (!mensagemModalVenda) {
        return;
    }

    mensagemModalVenda.textContent =
        "";

    mensagemModalVenda.hidden =
        true;
}


/* =========================================================
   REQUISIÇÃO AUTENTICADA
========================================================= */

async function requisicaoAutenticada(
    endpoint,
    opcoes = {}
) {
    const token =
        localStorage.getItem(
            "token"
        );

    if (!token) {
        const erro =
            new Error(
                "Sessão expirada."
            );

        erro.status = 401;

        throw erro;
    }

    const headers =
        new Headers(
            opcoes.headers || {}
        );

    headers.set(
        "Authorization",
        `Bearer ${token}`
    );

    if (
        opcoes.body &&
        !headers.has(
            "Content-Type"
        )
    ) {
        headers.set(
            "Content-Type",
            "application/json"
        );
    }

    let resposta;

    try {
        resposta =
            await apiRequest(
                endpoint,
                {
                    ...opcoes,
                    headers
                }
            );

    } catch (erro) {
        throw new Error(
            "Não foi possível se conectar ao servidor."
        );
    }

    if (!resposta.ok) {
        const erro =
            criarErroApiRequest(
                resposta,
                "Não foi possível concluir a operação."
            );

        throw erro;
    }

    return resposta.data;
}


/* =========================================================
   ERRO DA API
========================================================= */

function criarErroApiRequest(
    resposta,
    mensagemPadrao
) {
    const mensagem =
        resposta?.data?.message ??
        resposta?.data?.mensagem ??
        resposta?.data?.Message ??
        resposta?.data?.Mensagem ??
        mensagemPadrao;

    const erro =
        new Error(
            mensagem
        );

    erro.status =
        resposta?.status;

    erro.data =
        resposta?.data;

    return erro;
}


/* =========================================================
   FORMATAÇÃO
========================================================= */

function formatarPreco(
    valor
) {
    return Number(
        valor || 0
    ).toLocaleString(
        "pt-BR",
        {
            style: "currency",
            currency: "BRL"
        }
    );
}

function formatarData(
    data
) {
    return data.toLocaleDateString(
        "pt-BR",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }
    );
}

function formatarHorario(
    data
) {
    return data.toLocaleTimeString(
        "pt-BR",
        {
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}

function obterNomeRelativoDia(
    data
) {
    const hoje =
        zerarHorario(
            new Date()
        );

    const dataComparacao =
        zerarHorario(
            new Date(data)
        );

    const diferencaDias =
        Math.round(
            (
                dataComparacao -
                hoje
            ) /
            86400000
        );

    if (
        diferencaDias === 0
    ) {
        return "Hoje";
    }

    if (
        diferencaDias === 1
    ) {
        return "Amanhã";
    }

    return data.toLocaleDateString(
        "pt-BR",
        {
            weekday: "long"
        }
    );
}

function obterChaveDataLocal(
    data
) {
    const ano =
        data.getFullYear();

    const mes =
        String(
            data.getMonth() + 1
        ).padStart(
            2,
            "0"
        );

    const dia =
        String(
            data.getDate()
        ).padStart(
            2,
            "0"
        );

    return `${ano}-${mes}-${dia}`;
}

function zerarHorario(
    data
) {
    data.setHours(
        0,
        0,
        0,
        0
    );

    return data;
}


/* =========================================================
   URL
========================================================= */

function atualizarSessaoIdUrl(
    sessaoId
) {
    const url =
        new URL(
            window.location.href
        );

    url.searchParams.set(
        "sessaoId",
        sessaoId
    );

    window.history.replaceState(
        {},
        "",
        url
    );
}


/* =========================================================
   HTML
========================================================= */

function escaparHtml(
    valor
) {
    return String(
        valor ?? ""
    )
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );
}


/* =========================================================
   CARREGAMENTO
========================================================= */

function exibirCarregamentoAssentos() {
    if (!mapaAssentos) {
        return;
    }

    mapaAssentos.innerHTML = `
        <p class="carregando-assentos">
            Carregando assentos...
        </p>
    `;
}


/* =========================================================
   REDIRECIONAMENTOS
========================================================= */

function redirecionarParaLogin() {
    localStorage.removeItem(
        "token"
    );

    localStorage.removeItem(
        "usuario"
    );

    window.location.href =
        "../index.html";
}

function redirecionarParaHomeCliente() {
    window.location.href =
        "../home.html";
}