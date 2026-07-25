import {
    PRECO_INGRESSO,
    formatarPreco,
    obterAssentosSelecionados,
    obterDadosSessaoAtual,
    obterSessaoId,
    obterValorTotal,
    sincronizarAssentosComServidor
} from "./assentos-logica.js";


/* =========================================
   ELEMENTOS DO MODAL
========================================= */

const botaoContinuar =
    document.getElementById("botaoContinuar");

const modalPagamento =
    document.getElementById("modalPagamento");

const fundoModal =
    modalPagamento?.querySelector(".fundo-modal");

const conteudoModal =
    modalPagamento?.querySelector(".conteudo-modal");

const botaoFecharModal =
    document.getElementById("botaoFecharModal");

const ingressosSelecionados =
    document.getElementById("ingressosSelecionados");

const valorTotalModal =
    document.getElementById("valorTotalModal");

const botaoPagar =
    document.getElementById("botaoPagar");


/* =========================================
   ESTADO DO MODAL
========================================= */

let elementoFocadoAntesDoModal = null;
let pagamentoEmAndamento = false;


/* =========================================
   CONFIGURAÇÃO
========================================= */

function configurarModalPagamento() {
    if (!modalPagamento) {
        console.error(
            'Elemento com ID "modalPagamento" não encontrado.'
        );

        return;
    }

    fecharModalPagamento();

    botaoContinuar?.addEventListener(
        "click",
        abrirModalPagamento
    );

    botaoFecharModal?.addEventListener(
        "click",
        fecharModalPagamento
    );

    fundoModal?.addEventListener(
        "click",
        fecharModalPagamento
    );

    botaoPagar?.addEventListener(
        "click",
        finalizarPagamento
    );

    document.addEventListener(
        "keydown",
        controlarTecladoModal
    );

    document.addEventListener(
        "assentos:selecao-alterada",
        atualizarResumoModal
    );
}


/* =========================================
   ABERTURA E FECHAMENTO
========================================= */

function abrirModalPagamento() {
    const assentos =
        obterAssentosSelecionados();

    if (assentos.length === 0) {
        return;
    }

    elementoFocadoAntesDoModal =
        document.activeElement;

    atualizarResumoModal();

    modalPagamento.hidden = false;

    modalPagamento.classList.add(
        "aberto"
    );

    modalPagamento.classList.add(
        "ativo"
    );

    modalPagamento.setAttribute(
        "aria-hidden",
        "false"
    );

    document.body.classList.add(
        "modal-aberto"
    );

    botaoFecharModal?.focus();
}

function fecharModalPagamento() {
    if (!modalPagamento) {
        return;
    }

    if (pagamentoEmAndamento) {
        return;
    }

    modalPagamento.hidden = true;

    modalPagamento.classList.remove(
        "aberto"
    );

    modalPagamento.classList.remove(
        "ativo"
    );

    modalPagamento.setAttribute(
        "aria-hidden",
        "true"
    );

    document.body.classList.remove(
        "modal-aberto"
    );

    if (
        elementoFocadoAntesDoModal
        instanceof HTMLElement
    ) {
        elementoFocadoAntesDoModal.focus();
    }

    elementoFocadoAntesDoModal = null;
}

function modalEstaAberto() {
    if (!modalPagamento) {
        return false;
    }

    return (
        modalPagamento.hidden === false
        && modalPagamento.getAttribute("aria-hidden")
            === "false"
    );
}


/* =========================================
   CONTROLE POR TECLADO
========================================= */

function controlarTecladoModal(evento) {
    if (!modalEstaAberto()) {
        return;
    }

    if (evento.key === "Escape") {
        fecharModalPagamento();

        return;
    }

    if (evento.key === "Tab") {
        manterFocoDentroDoModal(evento);
    }
}

function manterFocoDentroDoModal(evento) {
    if (!conteudoModal) {
        return;
    }

    const elementosFocaveis =
        conteudoModal.querySelectorAll(
            `
                button:not([disabled]),
                a[href],
                input:not([disabled]),
                select:not([disabled]),
                textarea:not([disabled]),
                [tabindex]:not([tabindex="-1"])
            `
        );

    if (elementosFocaveis.length === 0) {
        return;
    }

    const primeiroElemento =
        elementosFocaveis[0];

    const ultimoElemento =
        elementosFocaveis[
            elementosFocaveis.length - 1
        ];

    if (
        evento.shiftKey
        && document.activeElement === primeiroElemento
    ) {
        evento.preventDefault();

        ultimoElemento.focus();

        return;
    }

    if (
        !evento.shiftKey
        && document.activeElement === ultimoElemento
    ) {
        evento.preventDefault();

        primeiroElemento.focus();
    }
}


/* =========================================
   RESUMO DO PAGAMENTO
========================================= */

function atualizarResumoModal() {
    const assentos =
        obterAssentosSelecionados();

    atualizarListaIngressos(
        assentos
    );

    if (valorTotalModal) {
        valorTotalModal.textContent =
            formatarPreco(
                obterValorTotal()
            );
    }

    if (botaoPagar) {
        botaoPagar.disabled =
            assentos.length === 0
            || pagamentoEmAndamento;
    }

    if (
        assentos.length === 0
        && modalEstaAberto()
    ) {
        fecharModalPagamento();
    }
}

function atualizarListaIngressos(assentos) {
    if (!ingressosSelecionados) {
        return;
    }

    ingressosSelecionados.innerHTML = "";

    if (assentos.length === 0) {
        const mensagem =
            document.createElement("p");

        mensagem.classList.add(
            "nenhum-ingresso"
        );

        mensagem.textContent =
            "Nenhum assento selecionado.";

        ingressosSelecionados.appendChild(
            mensagem
        );

        return;
    }

    const fragmento =
        document.createDocumentFragment();

    assentos.forEach(assento => {
        const ingresso =
            criarItemIngresso(assento);

        fragmento.appendChild(
            ingresso
        );
    });

    ingressosSelecionados.appendChild(
        fragmento
    );
}

function criarItemIngresso(assento) {
    const sessao =
        obterDadosSessaoAtual();

    const item =
        document.createElement("article");

    item.classList.add(
        "ingresso-selecionado"
    );

    const tituloFilme =
        obterTituloFilme(sessao);

    const dataSessao =
        obterDataFormatada(sessao);

    const horarioSessao =
        obterHorarioFormatado(sessao);

    item.append(
        criarDadoIngresso(
            "Filme",
            tituloFilme,
            "dado-filme"
        ),

        criarDadoIngresso(
            "Data",
            dataSessao
        ),

        criarDadoIngresso(
            "Horário",
            horarioSessao
        ),

        criarDadoIngresso(
            "Assento",
            assento.codigo,
            "dado-assento"
        ),

        criarDadoIngresso(
            "Valor",
            formatarPreco(PRECO_INGRESSO),
            "dado-preco"
        )
    );

    return item;
}

function criarDadoIngresso(
    rotulo,
    valor,
    classeExtra
) {
    const container =
        document.createElement("div");

    container.classList.add(
        "dado-ingresso"
    );

    if (classeExtra) {
        container.classList.add(
            classeExtra
        );
    }

    const elementoRotulo =
        document.createElement("span");

    elementoRotulo.classList.add(
        "rotulo-ingresso"
    );

    elementoRotulo.textContent =
        rotulo;

    const elementoValor =
        document.createElement("strong");

    elementoValor.classList.add(
        "valor-ingresso"
    );

    elementoValor.textContent =
        valor;

    container.append(
        elementoRotulo,
        elementoValor
    );

    return container;
}


/* =========================================
   DADOS DA SESSÃO
========================================= */

function obterTituloFilme(sessao) {
    if (!sessao) {
        return "Filme";
    }

    return (
        sessao.filme?.titulo
        ?? sessao.Filme?.Titulo
        ?? sessao.tituloFilme
        ?? sessao.TituloFilme
        ?? sessao.nomeFilme
        ?? sessao.NomeFilme
        ?? "Filme"
    );
}

function obterDataFormatada(sessao) {
    const dataHora =
        obterDataHoraSessao(sessao);

    if (!dataHora) {
        return "--/--/----";
    }

    return dataHora.toLocaleDateString(
        "pt-BR",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }
    );
}

function obterHorarioFormatado(sessao) {
    const dataHora =
        obterDataHoraSessao(sessao);

    if (dataHora) {
        return dataHora.toLocaleTimeString(
            "pt-BR",
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        );
    }

    const horario =
        sessao?.horario
        ?? sessao?.Horario
        ?? sessao?.hora
        ?? sessao?.Hora;

    if (
        typeof horario === "string"
        && horario.includes(":")
    ) {
        return horario.substring(0, 5);
    }

    return horario
        ? String(horario)
        : "--:--";
}

function obterDataHoraSessao(sessao) {
    if (!sessao) {
        return null;
    }

    const valor =
        sessao.dataHora
        ?? sessao.DataHora
        ?? sessao.dataHorario
        ?? sessao.DataHorario
        ?? sessao.data
        ?? sessao.Data;

    if (!valor) {
        return null;
    }

    const data =
        new Date(valor);

    if (Number.isNaN(data.getTime())) {
        return null;
    }

    return data;
}


/* =========================================
   PAGAMENTO
========================================= */

async function finalizarPagamento() {
    if (pagamentoEmAndamento) {
        return;
    }

    const assentos =
        obterAssentosSelecionados();

    if (assentos.length === 0) {
        exibirErroPagamento(
            "Selecione pelo menos um assento."
        );

        return;
    }

    const sessaoId =
        Number(obterSessaoId());

    if (
        !Number.isInteger(sessaoId)
        || sessaoId <= 0
    ) {
        exibirErroPagamento(
            "Não foi possível identificar a sessão."
        );

        return;
    }

    const assentoIds =
        assentos.map(
            assento => obterAssentoId(assento)
        );

    const possuiAssentoInvalido =
        assentoIds.some(id =>
            !Number.isInteger(id) || id <= 0
        );

    if (possuiAssentoInvalido) {
        exibirErroPagamento(
            "Um dos assentos selecionados é inválido."
        );

        return;
    }

    definirEstadoPagamento(true);

    try {

        await comprarIngressosEmLote(
            sessaoId,
            assentoIds
        );

        window.location.href =
            "meus-ingressos.html";

    } catch (erro) {

        console.error(
            "Erro ao finalizar a compra:",
            erro
        );

        exibirErroPagamento(
            erro.message
            ?? "Não foi possível finalizar a compra."
        );

        if (
            erro.status === 401
            || erro.status === 409
        ) {
            try {
                await sincronizarAssentosComServidor();
            } catch (erroSincronizacao) {
                console.error(
                    "Erro ao atualizar os assentos após a falha da compra:",
                    erroSincronizacao
                );
            }
        }

        definirEstadoPagamento(false);
    }
}


async function comprarIngressosEmLote(
    sessaoId,
    assentoIds
) {

    const resposta =
        await fetch(
            `${API_URL}/Ingresso/online/lote`,
            {
                method: "POST",

                headers:
                    criarCabecalhosCompra(),

                body: JSON.stringify({
                    sessaoId,
                    assentoIds
                })
            }
        );

    if (!resposta.ok) {

        const mensagem =
            await obterMensagemErroApi(
                resposta
            );

        const erro = new Error(
            mensagem
            ?? "Não foi possível concluir a compra."
        );

        erro.status = resposta.status;

        throw erro;
    }

    return await lerRespostaApi(
        resposta
    );
}


/* =========================================
   AUTENTICAÇÃO
========================================= */

function criarCabecalhosCompra() {
    const cabecalhos = {
        "Content-Type": "application/json"
    };

    const token =
        localStorage.getItem("token");

    if (token) {
        cabecalhos.Authorization =
            `Bearer ${token}`;
    }

    return cabecalhos;
}


/* =========================================
   ASSENTO
========================================= */

function obterAssentoId(assento) {
    const valor =
        assento?.id
        ?? assento?.Id
        ?? assento?.assentoId
        ?? assento?.AssentoId;

    const assentoId =
        Number(valor);

    return Number.isInteger(assentoId)
        ? assentoId
        : null;
}


/* =========================================
   ESTADO DO PAGAMENTO
========================================= */

function definirEstadoPagamento(
    estaCarregando
) {
    pagamentoEmAndamento =
        estaCarregando;

    if (botaoPagar) {
        botaoPagar.disabled =
            estaCarregando;

        botaoPagar.classList.toggle(
            "carregando",
            estaCarregando
        );

        botaoPagar.textContent =
            estaCarregando
                ? "Finalizando..."
                : "Finalizar compra";
    }

    if (botaoFecharModal) {
        botaoFecharModal.disabled =
            estaCarregando;
    }
}


/* =========================================
   TRATAMENTO DA RESPOSTA
========================================= */

async function obterMensagemErroApi(
    resposta
) {
    const tipoConteudo =
        resposta.headers.get(
            "content-type"
        ) || "";

    try {
        if (
            tipoConteudo.includes(
                "application/json"
            )
        ) {
            const dados =
                await resposta.json();

            if (typeof dados === "string") {
                return dados;
            }

            if (
                dados.errors
                && typeof dados.errors === "object"
            ) {
                return obterErrosValidacao(
                    dados.errors
                );
            }

            return (
                dados.message
                ?? dados.mensagem
                ?? dados.title
                ?? dados.erro
                ?? dados.error
                ?? null
            );
        }

        const texto =
            await resposta.text();

        return texto.trim() || null;
    } catch (erro) {
        console.error(
            "Erro ao ler resposta da API:",
            erro
        );

        return null;
    }
}

function obterErrosValidacao(errors) {
    const mensagens =
        Object.values(errors)
            .flat()
            .filter(Boolean);

    if (mensagens.length === 0) {
        return (
            "Os dados enviados são inválidos."
        );
    }

    return mensagens.join("\n");
}

async function lerRespostaApi(resposta) {
    if (resposta.status === 204) {
        return null;
    }

    const tipoConteudo =
        resposta.headers.get(
            "content-type"
        ) || "";

    if (
        tipoConteudo.includes(
            "application/json"
        )
    ) {
        return await resposta.json();
    }

    return await resposta.text();
}

function exibirErroPagamento(mensagem) {
    window.alert(
        mensagem
    );
}


/* =========================================
   INICIALIZAÇÃO
========================================= */

configurarModalPagamento();