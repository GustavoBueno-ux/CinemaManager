/* =========================================================
   CONFIGURAÇÕES
========================================================= */

const VALIDAR_INGRESSO_ENDPOINT =
    "/Ingresso/validar";

const SESSAO_ENDPOINT =
    "/Sessao";

const INTERVALO_LEITURA_MS =
    180;

const JSQR_CDN =
    "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js";


/* =========================================================
   ELEMENTOS
========================================================= */

const elementos = {

    /* SESSÃO */

    selectedSessionCard:
        document.getElementById(
            "selected-session-card"
        ),

    selectedSessionTitle:
        document.getElementById(
            "selected-session-title"
        ),

    selectedSessionDate:
        document.getElementById(
            "selected-session-date"
        ),

    selectedSessionTime:
        document.getElementById(
            "selected-session-time"
        ),


    /* ERRO DA PÁGINA */

    pageError:
        document.getElementById(
            "scanner-page-error"
        ),

    pageErrorMessage:
        document.getElementById(
            "scanner-page-error-message"
        ),


    /* CÂMERA */

    cameraSection:
        document.getElementById(
            "camera-section"
        ),

    cameraContainer:
        document.getElementById(
            "camera-container"
        ),

    cameraVideo:
        document.getElementById(
            "camera-video"
        ),

    cameraStatus:
        document.getElementById(
            "camera-status"
        ),

    cameraLoading:
        document.getElementById(
            "camera-loading"
        ),

    cameraError:
        document.getElementById(
            "camera-error"
        ),

    cameraErrorMessage:
        document.getElementById(
            "camera-error-message"
        ),

    cameraRetryButton:
        document.getElementById(
            "camera-retry-button"
        ),

    cameraHelp:
        document.getElementById(
            "camera-help"
        ),


    /* VALIDAÇÃO */

    validationLoading:
        document.getElementById(
            "validation-loading"
        ),

    validationResult:
        document.getElementById(
            "validation-result"
        ),

    validationResultIcon:
        document.getElementById(
            "validation-result-icon"
        ),

    validationResultLabel:
        document.getElementById(
            "validation-result-label"
        ),

    validationResultTitle:
        document.getElementById(
            "validation-result-title"
        ),

    validationResultMessage:
        document.getElementById(
            "validation-result-message"
        ),

    validationResultCode:
        document.getElementById(
            "validation-result-code"
        ),

    validationResultCodeContainer:
        document.getElementById(
            "validation-result-code-container"
        ),

    scanAgainButton:
        document.getElementById(
            "scan-again-button"
        )
};


/* =========================================================
   ESTADO
========================================================= */

const estado = {

    sessaoId:
        null,

    sessao:
        null,

    stream:
        null,

    cameraAtiva:
        false,

    leituraAtiva:
        false,

    validacaoEmAndamento:
        false,

    aguardandoNovaLeitura:
        false,

    animationFrameId:
        null,

    ultimoProcessamento:
        0,

    canvas:
        null,

    contextoCanvas:
        null,

    barcodeDetector:
        null,

    leitor:
        null

};


/* =========================================================
   INICIALIZAÇÃO
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    iniciarPagina
);


async function iniciarPagina() {

    const usuario =
        obterUsuarioAutenticado();

    if (!usuario) {

        redirecionarParaLogin();

        return;

    }


    if (
        usuario.tipoUsuario !==
        "Funcionario"
    ) {

        redirecionarParaHomeCliente();

        return;

    }


    configurarEventos();


    const sessaoId =
        obterSessaoIdDaUrl();


    if (!sessaoId) {

        exibirErroPagina(
            "A sessão não foi informada. Volte e escolha uma sessão para iniciar a leitura."
        );

        return;

    }


    estado.sessaoId =
        sessaoId;


    const sessaoCarregada =
        await carregarSessao();


    if (!sessaoCarregada) {

        return;

    }


    await prepararLeitorQrCode();

}


/* =========================================================
   AUTENTICAÇÃO
========================================================= */

function obterUsuarioAutenticado() {

    const token =
        localStorage.getItem(
            "token"
        );

    const usuarioArmazenado =
        localStorage.getItem(
            "usuario"
        );


    if (
        !token ||
        !usuarioArmazenado
    ) {

        return null;

    }


    try {

        const usuario =
            JSON.parse(
                usuarioArmazenado
            );


        if (
            !usuario?.tipoUsuario
        ) {

            return null;

        }


        return usuario;

    }
    catch (erro) {

        console.error(
            "Erro ao ler usuário autenticado:",
            erro
        );

        return null;

    }

}


/* =========================================================
   EVENTOS
========================================================= */

function configurarEventos() {

    elementos.cameraRetryButton
        ?.addEventListener(
            "click",
            reiniciarCamera
        );


    elementos.scanAgainButton
        ?.addEventListener(
            "click",
            escanearNovamente
        );


    window.addEventListener(
        "pagehide",
        encerrarCamera
    );


    window.addEventListener(
        "beforeunload",
        encerrarCamera
    );


    document.addEventListener(
        "visibilitychange",
        tratarVisibilidadePagina
    );

}


/* =========================================================
   SESSÃO DA URL
========================================================= */

function obterSessaoIdDaUrl() {

    const parametros =
        new URLSearchParams(
            window.location.search
        );

    const valor =
        Number(
            parametros.get(
                "sessaoId"
            )
        );


    if (
        !Number.isInteger(valor) ||
        valor <= 0
    ) {

        return null;

    }


    return valor;

}


/* =========================================================
   CARREGAR SESSÃO
========================================================= */

async function carregarSessao() {

    esconderErroPagina();


    try {

        const resposta =
            await apiRequest(
                `${SESSAO_ENDPOINT}/${estado.sessaoId}`
            );


        if (!resposta.ok) {

            if (
                resposta.status ===
                401
            ) {

                fazerLogout();

                return false;

            }


            if (
                resposta.status ===
                403
            ) {

                redirecionarParaHomeCliente();

                return false;

            }


            exibirErroPagina(
                resposta.message ||
                "Não foi possível carregar a sessão selecionada."
            );

            return false;

        }


        if (!resposta.data) {

            exibirErroPagina(
                "A sessão selecionada não foi encontrada."
            );

            return false;

        }


        estado.sessao =
            resposta.data;


        preencherSessao(
            estado.sessao
        );


        return true;

    }
    catch (erro) {

        console.error(
            "Erro ao carregar sessão:",
            erro
        );


        exibirErroPagina(
            "Não foi possível se comunicar com o servidor."
        );


        return false;

    }

}


/* =========================================================
   PREENCHER SESSÃO
========================================================= */

function preencherSessao(
    sessao
) {

    const titulo =
        obterTituloFilme(
            sessao
        );


    const dataHora =
        converterParaData(
            sessao.dataHora ??
            sessao.DataHora
        );


    if (
        elementos.selectedSessionTitle
    ) {

        elementos.selectedSessionTitle
            .textContent =
            titulo;

    }


    if (
        elementos.selectedSessionDate
    ) {

        elementos.selectedSessionDate
            .textContent =
            formatarData(
                dataHora
            );

    }


    if (
        elementos.selectedSessionTime
    ) {

        elementos.selectedSessionTime
            .textContent =
            formatarHorario(
                dataHora
            );

    }

}


function obterTituloFilme(
    sessao
) {

    return (
        sessao.tituloFilme ??
        sessao.TituloFilme ??
        sessao.filme?.titulo ??
        sessao.Filme?.Titulo ??
        sessao.nomeFilme ??
        sessao.NomeFilme ??
        "Sessão"
    );

}


/* =========================================================
   PREPARAR LEITOR DE QR
========================================================= */

async function prepararLeitorQrCode() {

    mostrarCameraCarregando();


    try {

        /*
            Primeiro tentamos BarcodeDetector,
            que é nativo em navegadores compatíveis.

            Caso não exista, usamos jsQR.
        */

        const detectorDisponivel =
            await prepararBarcodeDetector();


        if (detectorDisponivel) {

            estado.leitor =
                "barcode-detector";

        }
        else {

            await carregarJsQr();

            estado.leitor =
                "jsqr";

        }


        prepararCanvas();


        await iniciarCamera();

    }
    catch (erro) {

        console.error(
            "Erro ao preparar leitor de QR Code:",
            erro
        );


        exibirErroCamera(
            obterMensagemErroCamera(
                erro
            )
        );

    }

}


/* =========================================================
   BARCODE DETECTOR
========================================================= */

async function prepararBarcodeDetector() {

    if (
        !(
            "BarcodeDetector"
            in window
        )
    ) {

        return false;

    }


    try {

        if (
            typeof BarcodeDetector
                .getSupportedFormats ===
            "function"
        ) {

            const formatos =
                await BarcodeDetector
                    .getSupportedFormats();


            if (
                !formatos.includes(
                    "qr_code"
                )
            ) {

                return false;

            }

        }


        estado.barcodeDetector =
            new BarcodeDetector({
                formats: [
                    "qr_code"
                ]
            });


        return true;

    }
    catch (erro) {

        console.warn(
            "BarcodeDetector indisponível. Usando fallback jsQR.",
            erro
        );


        estado.barcodeDetector =
            null;


        return false;

    }

}


/* =========================================================
   FALLBACK JSQR
========================================================= */

function carregarJsQr() {

    return new Promise(
        (
            resolve,
            reject
        ) => {

            if (
                typeof window.jsQR ===
                "function"
            ) {

                resolve();

                return;

            }


            const scriptExistente =
                document.querySelector(
                    'script[data-jsqr-loader="true"]'
                );


            if (scriptExistente) {

                scriptExistente.addEventListener(
                    "load",
                    () => resolve(),
                    {
                        once: true
                    }
                );


                scriptExistente.addEventListener(
                    "error",
                    () => reject(
                        new Error(
                            "Não foi possível carregar o leitor de QR Code."
                        )
                    ),
                    {
                        once: true
                    }
                );


                return;

            }


            const script =
                document.createElement(
                    "script"
                );


            script.src =
                JSQR_CDN;


            script.async =
                true;


            script.dataset.jsqrLoader =
                "true";


            script.addEventListener(
                "load",
                () => {

                    if (
                        typeof window.jsQR !==
                        "function"
                    ) {

                        reject(
                            new Error(
                                "A biblioteca de leitura do QR Code não foi inicializada."
                            )
                        );

                        return;

                    }


                    resolve();

                }
            );


            script.addEventListener(
                "error",
                () => {

                    reject(
                        new Error(
                            "Não foi possível carregar o leitor de QR Code."
                        )
                    );

                }
            );


            document.head.appendChild(
                script
            );

        }
    );

}


/* =========================================================
   CANVAS AUXILIAR
========================================================= */

function prepararCanvas() {

    if (
        estado.canvas &&
        estado.contextoCanvas
    ) {

        return;

    }


    estado.canvas =
        document.createElement(
            "canvas"
        );


    estado.contextoCanvas =
        estado.canvas.getContext(
            "2d",
            {
                willReadFrequently: true
            }
        );

}


/* =========================================================
   INICIAR CÂMERA
========================================================= */

async function iniciarCamera() {

    if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
    ) {

        throw new Error(
            "CAMERA_NAO_SUPORTADA"
        );

    }


    encerrarStreamAtual();


    mostrarCameraCarregando();


    let stream;


    try {

        /*
            Idealmente utiliza a câmera traseira
            em celulares.
        */

        stream =
            await navigator.mediaDevices
                .getUserMedia({

                    audio:
                        false,

                    video: {

                        facingMode: {
                            ideal:
                                "environment"
                        },

                        width: {
                            ideal:
                                1280
                        },

                        height: {
                            ideal:
                                720
                        }

                    }

                });

    }
    catch (erroPrincipal) {

        console.warn(
            "Não foi possível abrir a câmera preferencial. Tentando configuração simples.",
            erroPrincipal
        );


        /*
            Fallback importante para desktops,
            notebooks e aparelhos que não aceitam
            facingMode.
        */

        stream =
            await navigator.mediaDevices
                .getUserMedia({

                    audio:
                        false,

                    video:
                        true

                });

    }


    estado.stream =
        stream;


    elementos.cameraVideo.srcObject =
        stream;


    await aguardarVideoPronto();


    await elementos.cameraVideo.play();


    estado.cameraAtiva =
        true;


    estado.leituraAtiva =
        true;


    estado.aguardandoNovaLeitura =
        false;


    esconderErroCamera();

    esconderCameraCarregando();

    atualizarStatusCamera(
        "ready",
        "Câmera ativa"
    );


    iniciarLoopLeitura();

}


/* =========================================================
   AGUARDAR VÍDEO
========================================================= */

function aguardarVideoPronto() {

    return new Promise(
        (
            resolve,
            reject
        ) => {

            const video =
                elementos.cameraVideo;


            if (
                video.readyState >=
                    HTMLMediaElement.HAVE_METADATA &&
                video.videoWidth > 0 &&
                video.videoHeight > 0
            ) {

                resolve();

                return;

            }


            const timeout =
                window.setTimeout(
                    () => {

                        limparEventos();

                        reject(
                            new Error(
                                "A câmera demorou demais para iniciar."
                            )
                        );

                    },
                    10000
                );


            function pronto() {

                if (
                    video.videoWidth <= 0 ||
                    video.videoHeight <= 0
                ) {

                    return;

                }


                limparEventos();

                resolve();

            }


            function erro() {

                limparEventos();

                reject(
                    new Error(
                        "Não foi possível iniciar o vídeo da câmera."
                    )
                );

            }


            function limparEventos() {

                window.clearTimeout(
                    timeout
                );


                video.removeEventListener(
                    "loadedmetadata",
                    pronto
                );


                video.removeEventListener(
                    "canplay",
                    pronto
                );


                video.removeEventListener(
                    "error",
                    erro
                );

            }


            video.addEventListener(
                "loadedmetadata",
                pronto
            );


            video.addEventListener(
                "canplay",
                pronto
            );


            video.addEventListener(
                "error",
                erro
            );

        }
    );

}


/* =========================================================
   LOOP DE LEITURA
========================================================= */

function iniciarLoopLeitura() {

    cancelarLoopLeitura();


    estado.ultimoProcessamento =
        0;


    const processarFrame =
        async timestamp => {

            if (
                !estado.cameraAtiva
            ) {

                return;

            }


            estado.animationFrameId =
                window.requestAnimationFrame(
                    processarFrame
                );


            if (
                !estado.leituraAtiva ||
                estado.validacaoEmAndamento ||
                estado.aguardandoNovaLeitura
            ) {

                return;

            }


            if (
                timestamp -
                    estado.ultimoProcessamento <
                INTERVALO_LEITURA_MS
            ) {

                return;

            }


            estado.ultimoProcessamento =
                timestamp;


            const tokenQrCode =
                await tentarLerQrCode();


            if (!tokenQrCode) {

                return;

            }


            /*
                PRIMEIRA proteção contra leitura repetida.

                O scanner é pausado ANTES
                de fazer a chamada à API.
            */

            estado.leituraAtiva =
                false;


            estado.aguardandoNovaLeitura =
                true;


            await processarQrCode(
                tokenQrCode
            );

        };


    estado.animationFrameId =
        window.requestAnimationFrame(
            processarFrame
        );

}


/* =========================================================
   LER QR
========================================================= */

async function tentarLerQrCode() {

    const video =
        elementos.cameraVideo;


    if (
        !video ||
        video.readyState <
            HTMLMediaElement.HAVE_CURRENT_DATA ||
        video.videoWidth <= 0 ||
        video.videoHeight <= 0
    ) {

        return null;

    }


    try {

        if (
            estado.leitor ===
                "barcode-detector" &&
            estado.barcodeDetector
        ) {

            return await lerComBarcodeDetector(
                video
            );

        }


        return lerComJsQr(
            video
        );

    }
    catch (erro) {

        /*
            Erro isolado de um frame não deve
            derrubar a câmera inteira.
        */

        console.debug(
            "Falha ao analisar frame da câmera:",
            erro
        );


        return null;

    }

}


/* =========================================================
   BARCODE DETECTOR - LEITURA
========================================================= */

async function lerComBarcodeDetector(
    video
) {

    const codigos =
        await estado.barcodeDetector
            .detect(
                video
            );


    if (
        !Array.isArray(codigos) ||
        !codigos.length
    ) {

        return null;

    }


    const codigo =
        codigos.find(
            item =>
                item.rawValue &&
                String(
                    item.rawValue
                ).trim()
        );


    if (!codigo) {

        return null;

    }


    return String(
        codigo.rawValue
    ).trim();

}


/* =========================================================
   JSQR - LEITURA
========================================================= */

function lerComJsQr(
    video
) {

    if (
        typeof window.jsQR !==
        "function"
    ) {

        return null;

    }


    const largura =
        video.videoWidth;

    const altura =
        video.videoHeight;


    if (
        estado.canvas.width !==
            largura ||
        estado.canvas.height !==
            altura
    ) {

        estado.canvas.width =
            largura;

        estado.canvas.height =
            altura;

    }


    estado.contextoCanvas.drawImage(
        video,
        0,
        0,
        largura,
        altura
    );


    const imagem =
        estado.contextoCanvas
            .getImageData(
                0,
                0,
                largura,
                altura
            );


    const resultado =
        window.jsQR(
            imagem.data,
            imagem.width,
            imagem.height,
            {
                inversionAttempts:
                    "dontInvert"
            }
        );


    if (
        !resultado?.data
    ) {

        return null;

    }


    return String(
        resultado.data
    ).trim();

}


/* =========================================================
   QR DETECTADO
========================================================= */

async function processarQrCode(
    tokenQrCode
) {

    if (
        estado.validacaoEmAndamento
    ) {

        return;

    }


    const tokenNormalizado =
        String(
            tokenQrCode ??
            ""
        ).trim();


    if (!tokenNormalizado) {

        mostrarResultadoLocal({

            sucesso:
                false,

            codigo:
                "INGRESSO_NAO_ENCONTRADO",

            mensagem:
                "Ingresso não encontrado."

        });


        return;

    }


    estado.validacaoEmAndamento =
        true;


    atualizarStatusCamera(
        "paused",
        "Leitura pausada"
    );


    mostrarValidacaoCarregando();


    try {

        const resultado =
            await validarIngresso(
                tokenNormalizado
            );


        esconderValidacaoCarregando();


        mostrarResultadoValidacao(
            resultado
        );

    }
    catch (erro) {

        console.error(
            "Erro ao validar ingresso:",
            erro
        );


        esconderValidacaoCarregando();


        if (
            erro.status ===
            401
        ) {

            fazerLogout();

            return;

        }


        if (
            erro.status ===
            403
        ) {

            redirecionarParaHomeCliente();

            return;

        }


        mostrarResultadoLocal({

            sucesso:
                false,

            codigo:
                "ERRO_INTERNO",

            mensagem:
                erro.message ||
                "Não foi possível validar o ingresso."

        });

    }
    finally {

        estado.validacaoEmAndamento =
            false;

    }

}


/* =========================================================
   API - VALIDAR INGRESSO
========================================================= */

async function validarIngresso(
    tokenQrCode
) {

    const token =
        localStorage.getItem(
            "token"
        );


    if (!token) {

        const erro =
            new Error(
                "Sua sessão expirou."
            );


        erro.status =
            401;


        throw erro;

    }


    let resposta;


    try {

        resposta =
            await fetch(
                `${API_URL}${VALIDAR_INGRESSO_ENDPOINT}`,
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "Accept":
                            "application/json",

                        "Authorization":
                            `Bearer ${token}`

                    },

                    body:
                        JSON.stringify({

                            sessaoId:
                                estado.sessaoId,

                            tokenQrCode:
                                tokenQrCode

                        })

                }
            );

    }
    catch {

        const erro =
            new Error(
                "Não foi possível se comunicar com o servidor."
            );


        erro.status =
            0;


        throw erro;

    }


    if (
        resposta.status ===
        401
    ) {

        const erro =
            new Error(
                "Sua sessão expirou."
            );


        erro.status =
            401;


        throw erro;

    }


    if (
        resposta.status ===
        403
    ) {

        const erro =
            new Error(
                "Você não possui permissão para validar ingressos."
            );


        erro.status =
            403;


        throw erro;

    }


    const resultado =
        await lerRespostaApi(
            resposta
        );


    /*
        IMPORTANTE:

        O backend retorna HTTP 200 também
        para recusas normais de ingresso.

        Portanto NÃO usamos response.ok
        para decidir se alguém pode entrar.
    */


    if (!resposta.ok) {

        const erro =
            new Error(
                obterMensagemResposta(
                    resultado
                ) ||
                "Não foi possível validar o ingresso."
            );


        erro.status =
            resposta.status;


        erro.dados =
            resultado;


        throw erro;

    }


    if (
        !resultado ||
        typeof resultado !==
            "object"
    ) {

        throw new Error(
            "O servidor retornou uma resposta inválida."
        );

    }


    return resultado;

}


/* =========================================================
   RESPOSTA DA API
========================================================= */

async function lerRespostaApi(
    resposta
) {

    if (
        resposta.status ===
        204
    ) {

        return null;

    }


    const tipoConteudo =
        resposta.headers.get(
            "content-type"
        ) ?? "";


    if (
        tipoConteudo.includes(
            "application/json"
        )
    ) {

        try {

            return await resposta.json();

        }
        catch {

            return null;

        }

    }


    try {

        const texto =
            await resposta.text();


        return texto || null;

    }
    catch {

        return null;

    }

}


function obterMensagemResposta(
    dados
) {

    if (!dados) {

        return null;

    }


    if (
        typeof dados ===
        "string"
    ) {

        /*
            Não mostrar stack trace
            para o funcionário.
        */

        if (
            dados.length > 300 ||
            dados.includes(
                "Exception"
            ) ||
            dados.includes(
                "System."
            )
        ) {

            return null;

        }


        return dados;

    }


    return (
        dados.mensagem ??
        dados.Mensagem ??
        dados.message ??
        dados.Message ??
        dados.title ??
        dados.Title ??
        null
    );

}


/* =========================================================
   RESULTADO DA VALIDAÇÃO
========================================================= */

function mostrarResultadoValidacao(
    resultado
) {

    const codigo =
        String(
            resultado.codigo ??
            ""
        )
        .trim()
        .toUpperCase();


    const mensagem =
        String(
            resultado.mensagem ??
            ""
        ).trim();


    const sucesso =
        resultado.sucesso ===
            true &&
        codigo ===
            "VALIDADO";


    /*
        Segurança adicional:

        mesmo que venha sucesso=true,
        somente VALIDADO libera visualmente.
    */

    if (sucesso) {

        configurarResultadoSucesso(
            codigo,
            mensagem ||
            "Entrada liberada."
        );


        return;

    }


    configurarResultadoErro(
        codigo,
        mensagem
    );

}


/* =========================================================
   RESULTADO LOCAL
========================================================= */

function mostrarResultadoLocal(
    resultado
) {

    if (
        resultado.sucesso
    ) {

        configurarResultadoSucesso(
            resultado.codigo,
            resultado.mensagem
        );

        return;

    }


    configurarResultadoErro(
        resultado.codigo,
        resultado.mensagem
    );

}


/* =========================================================
   SUCESSO
========================================================= */

function configurarResultadoSucesso(
    codigo,
    mensagem
) {

    esconderCameraDuranteResultado();


    elementos.validationResult
        ?.classList.remove(
            "hidden"
        );


    elementos.validationResult
        ?.setAttribute(
            "data-result",
            "success"
        );


    if (
        elementos.validationResultIcon
    ) {

        elementos.validationResultIcon
            .textContent =
            "✓";

    }


    if (
        elementos.validationResultLabel
    ) {

        elementos.validationResultLabel
            .textContent =
            "Ingresso válido";

    }


    if (
        elementos.validationResultTitle
    ) {

        elementos.validationResultTitle
            .textContent =
            "Entrada liberada";

    }


    if (
        elementos.validationResultMessage
    ) {

        elementos.validationResultMessage
        .textContent =
        "O ingresso foi validado com sucesso e a entrada para esta sessão está autorizada.";

    }


    if (
        elementos.validationResultCode
    ) {

        elementos.validationResultCode
            .textContent =
            codigo ||
            "VALIDADO";

    }

}


/* =========================================================
   ERRO
========================================================= */

function configurarResultadoErro(
    codigo,
    mensagemBackend
) {

    esconderCameraDuranteResultado();


    const configuracao =
        obterConfiguracaoErro(
            codigo
        );


    elementos.validationResult
        ?.classList.remove(
            "hidden"
        );


    elementos.validationResult
        ?.setAttribute(
            "data-result",
            "error"
        );


    if (
        elementos.validationResultIcon
    ) {

        elementos.validationResultIcon
            .textContent =
            configuracao.icone;

    }


    if (
        elementos.validationResultLabel
    ) {

        elementos.validationResultLabel
            .textContent =
            configuracao.label;

    }


    if (
        elementos.validationResultTitle
    ) {

        elementos.validationResultTitle
            .textContent =
            configuracao.titulo;

    }


    if (
        elementos.validationResultMessage
    ) {

        elementos.validationResultMessage
        .textContent =
        configuracao.mensagem;

    }


    if (
        elementos.validationResultCode
    ) {

        elementos.validationResultCode
            .textContent =
            codigo ||
            "ERRO_INTERNO";

    }

}


/* =========================================================
   MAPEAMENTO DE ERROS DO BACKEND
========================================================= */

function obterConfiguracaoErro(
    codigo
) {

    switch (codigo) {

        case "INGRESSO_NAO_ENCONTRADO":

            return {

                icone:
                    "✕",

                label:
                    "Entrada recusada",

                titulo:
                    "Ingresso não encontrado",

                mensagem:
                    "O QR Code apresentado não corresponde a nenhum ingresso válido registrado no sistema."

            };


        case "INGRESSO_OUTRA_SESSAO":

            return {

                icone:
                    "✕",

                label:
                    "Entrada recusada",

                titulo:
                    "Ingresso de outra sessão",

                mensagem:
                    "O ingresso apresentado é válido, mas pertence a uma sessão diferente da selecionada."

            };


        case "INGRESSO_JA_UTILIZADO":

            return {

                icone:
                    "✕",

                label:
                    "Entrada recusada",

                titulo:
                    "Ingresso já utilizado",

                mensagem:
                    "Este ingresso já foi validado anteriormente e não pode ser utilizado novamente para entrada."

            };


        case "SESSAO_NAO_ENCONTRADA":

            return {

                icone:
                    "✕",

                label:
                    "Sessão inválida",

                titulo:
                    "Sessão não encontrada",

                mensagem:
                    "A sessão selecionada não foi encontrada no sistema. Volte e escolha uma sessão válida para continuar."

            };


        case "SESSAO_NAO_LIBERADA":

            return {

                icone:
                    "!",

                label:
                    "Entrada indisponível",

                titulo:
                    "Entrada ainda não liberada",

                mensagem:
                    "A validação deste ingresso ainda não está disponível porque a sessão não entrou no período permitido para entrada."

            };


        case "SESSAO_ENCERRADA":

            return {

                icone:
                    "✕",

                label:
                    "Entrada recusada",

                titulo:
                    "Sessão encerrada",

                mensagem:
                    "Esta sessão já foi encerrada e não aceita mais a validação de novos ingressos para entrada."

            };


        case "ERRO_INTERNO":

            return {

                icone:
                    "!",

                label:
                    "Erro no sistema",

                titulo:
                    "Não foi possível validar",

                mensagem:
                    "O sistema encontrou um problema ao validar este ingresso. Tente realizar a leitura novamente em alguns instantes."

            };


        default:

            return {

                icone:
                    "✕",

                label:
                    "Entrada recusada",

                titulo:
                    "Ingresso não validado",

                mensagem:
                    "Não foi possível validar este ingresso. Verifique o QR Code apresentado e tente realizar a leitura novamente."

            };

    }

}


/* =========================================================
   ESCANEAR NOVAMENTE
========================================================= */

async function escanearNovamente() {

    if (
        estado.validacaoEmAndamento
    ) {

        return;

    }


    elementos.validationResult
        ?.classList.add(
            "hidden"
        );


    elementos.validationResult
        ?.removeAttribute(
            "data-result"
        );


    elementos.validationLoading
        ?.classList.add(
            "hidden"
        );


    mostrarCameraAposResultado();


    estado.aguardandoNovaLeitura =
        false;


    if (
        estado.stream &&
        estado.cameraAtiva
    ) {

        estado.leituraAtiva =
            true;


        atualizarStatusCamera(
            "ready",
            "Câmera ativa"
        );


        return;

    }


    await reiniciarCamera();

}


/* =========================================================
   CÂMERA DURANTE RESULTADO
========================================================= */

function esconderCameraDuranteResultado() {

    /*
        Mantemos o stream aberto.

        Isso evita pedir permissão novamente
        e evita demora entre um ingresso e outro.

        Apenas pausamos a LEITURA.
    */

    estado.leituraAtiva =
        false;


    elementos.cameraSection
        ?.classList.add(
            "camera-paused"
        );


    atualizarStatusCamera(
        "paused",
        "Leitura pausada"
    );

}


function mostrarCameraAposResultado() {

    elementos.cameraSection
        ?.classList.remove(
            "camera-paused"
        );

}


/* =========================================================
   LOADING DA VALIDAÇÃO
========================================================= */

function mostrarValidacaoCarregando() {

    elementos.validationResult
        ?.classList.add(
            "hidden"
        );


    elementos.validationLoading
        ?.classList.remove(
            "hidden"
        );

}


function esconderValidacaoCarregando() {

    elementos.validationLoading
        ?.classList.add(
            "hidden"
        );

}


/* =========================================================
   STATUS DA CÂMERA
========================================================= */

function atualizarStatusCamera(
    status,
    texto
) {

    if (
        !elementos.cameraStatus
    ) {

        return;

    }


    elementos.cameraStatus
        .dataset.status =
        status;


    elementos.cameraStatus
        .textContent =
        texto;

}


/* =========================================================
   LOADING DA CÂMERA
========================================================= */

function mostrarCameraCarregando() {

    elementos.cameraLoading
        ?.classList.remove(
            "hidden"
        );


    elementos.cameraError
        ?.classList.add(
            "hidden"
        );


    atualizarStatusCamera(
        "loading",
        "Iniciando câmera..."
    );

}


function esconderCameraCarregando() {

    elementos.cameraLoading
        ?.classList.add(
            "hidden"
        );

}


/* =========================================================
   ERRO DA CÂMERA
========================================================= */

function exibirErroCamera(
    mensagem
) {

    estado.cameraAtiva =
        false;


    estado.leituraAtiva =
        false;


    cancelarLoopLeitura();


    esconderCameraCarregando();


    elementos.cameraError
        ?.classList.remove(
            "hidden"
        );


    if (
        elementos.cameraErrorMessage
    ) {

        elementos.cameraErrorMessage
            .textContent =
            mensagem;

    }


    atualizarStatusCamera(
        "error",
        "Câmera indisponível"
    );

}


function esconderErroCamera() {

    elementos.cameraError
        ?.classList.add(
            "hidden"
        );

}


/* =========================================================
   MENSAGEM DE ERRO DA CÂMERA
========================================================= */

function obterMensagemErroCamera(
    erro
) {

    if (!erro) {

        return (
            "Não foi possível acessar a câmera."
        );

    }


    if (
        erro.message ===
        "CAMERA_NAO_SUPORTADA"
    ) {

        return (
            "Este navegador não oferece suporte ao acesso à câmera."
        );

    }


    switch (erro.name) {

        case "NotAllowedError":

            return (
                "O acesso à câmera foi negado. Permita o uso da câmera nas configurações do navegador e tente novamente."
            );


        case "NotFoundError":

            return (
                "Nenhuma câmera foi encontrada neste dispositivo."
            );


        case "NotReadableError":

            return (
                "A câmera está sendo utilizada por outro aplicativo ou não pôde ser iniciada."
            );


        case "OverconstrainedError":

            return (
                "Não foi possível utilizar a câmera com as configurações solicitadas."
            );


        case "SecurityError":

            return (
                "O navegador bloqueou o acesso à câmera por motivos de segurança."
            );


        default:

            if (
                window.location.protocol !==
                    "https:" &&
                window.location.hostname !==
                    "localhost" &&
                window.location.hostname !==
                    "127.0.0.1"
            ) {

                return (
                    "O acesso à câmera exige uma conexão HTTPS segura."
                );

            }


            return (
                erro.message ||
                "Não foi possível acessar a câmera. Verifique as permissões do navegador."
            );

    }

}


/* =========================================================
   REINICIAR CÂMERA
========================================================= */

async function reiniciarCamera() {

    if (
        estado.validacaoEmAndamento
    ) {

        return;

    }


    elementos.validationResult
        ?.classList.add(
            "hidden"
        );


    estado.aguardandoNovaLeitura =
        false;


    estado.leituraAtiva =
        false;


    try {

        await iniciarCamera();

    }
    catch (erro) {

        console.error(
            "Erro ao reiniciar câmera:",
            erro
        );


        exibirErroCamera(
            obterMensagemErroCamera(
                erro
            )
        );

    }

}


/* =========================================================
   PARAR CÂMERA
========================================================= */

function encerrarCamera() {

    estado.cameraAtiva =
        false;


    estado.leituraAtiva =
        false;


    cancelarLoopLeitura();


    encerrarStreamAtual();

}


function encerrarStreamAtual() {

    if (
        estado.stream
    ) {

        estado.stream
            .getTracks()
            .forEach(
                track =>
                    track.stop()
            );

    }


    estado.stream =
        null;


    if (
        elementos.cameraVideo
    ) {

        elementos.cameraVideo
            .srcObject =
            null;

    }

}


function cancelarLoopLeitura() {

    if (
        estado.animationFrameId !==
        null
    ) {

        window.cancelAnimationFrame(
            estado.animationFrameId
        );


        estado.animationFrameId =
            null;

    }

}


/* =========================================================
   VISIBILIDADE DA PÁGINA
========================================================= */

async function tratarVisibilidadePagina() {

    if (
        document.hidden
    ) {

        /*
            Ao trocar de aba/aplicativo,
            paramos fisicamente a câmera.

            Melhor para privacidade e bateria.
        */

        encerrarCamera();

        return;

    }


    if (
        estado.aguardandoNovaLeitura ||
        estado.validacaoEmAndamento
    ) {

        return;

    }


    if (
        estado.sessao &&
        !estado.cameraAtiva
    ) {

        await reiniciarCamera();

    }

}


/* =========================================================
   ERRO GERAL DA PÁGINA
========================================================= */

function exibirErroPagina(
    mensagem
) {

    encerrarCamera();


    elementos.pageError
        ?.classList.remove(
            "hidden"
        );


    elementos.cameraSection
        ?.classList.add(
            "hidden"
        );


    if (
        elementos.pageErrorMessage
    ) {

        elementos.pageErrorMessage
            .textContent =
            mensagem;

    }

}


function esconderErroPagina() {

    elementos.pageError
        ?.classList.add(
            "hidden"
        );


    elementos.cameraSection
        ?.classList.remove(
            "hidden"
        );

}


/* =========================================================
   DATAS
========================================================= */

function converterParaData(
    valor
) {

    if (!valor) {

        return null;

    }


    const data =
        valor instanceof Date
            ? valor
            : new Date(
                valor
            );


    if (
        Number.isNaN(
            data.getTime()
        )
    ) {

        return null;

    }


    return data;

}


function formatarData(
    data
) {

    if (!data) {

        return "--/--/----";

    }


    return data.toLocaleDateString(
        "pt-BR",
        {

            day:
                "2-digit",

            month:
                "2-digit",

            year:
                "numeric"

        }
    );

}


function formatarHorario(
    data
) {

    if (!data) {

        return "--:--";

    }


    return data.toLocaleTimeString(
        "pt-BR",
        {

            hour:
                "2-digit",

            minute:
                "2-digit"

        }
    );

}


/* =========================================================
   REDIRECIONAMENTOS
========================================================= */

function fazerLogout() {

    encerrarCamera();


    localStorage.removeItem(
        "token"
    );


    localStorage.removeItem(
        "usuario"
    );


    redirecionarParaLogin();

}


function redirecionarParaLogin() {

    window.location.replace(
        "../../index.html"
    );

}


function redirecionarParaHomeCliente() {

    encerrarCamera();


    window.location.replace(
        "../public/home.html"
    );

}