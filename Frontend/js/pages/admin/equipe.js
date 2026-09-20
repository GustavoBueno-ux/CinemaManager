document.addEventListener("DOMContentLoaded", () => {

    // =========================================================
    // AUTENTICAÇÃO
    // =========================================================

    const usuario = window.CinemaxInterno?.obterUsuarioAutenticado();

    if (!usuario || !window.CinemaxInterno?.ehAdmin(usuario)) {
        window.location.replace("home-admin.html");
        return;
    }


    // =========================================================
    // ELEMENTOS
    // =========================================================

    const sidebar = document.getElementById("sidebar");
    const sidebarOverlay = document.getElementById("sidebar-overlay");
    const sidebarOpenButton = document.getElementById("sidebar-open-button");
    const sidebarCloseButton = document.getElementById("sidebar-close-button");
    const logoutButton = document.getElementById("logout-button");

    const teamTotalCount = document.getElementById("team-total-count");
    const teamEmployeeCount = document.getElementById("team-employee-count");
    const teamAdminCount = document.getElementById("team-admin-count");
    const teamInactiveCount = document.getElementById("team-inactive-count");

    const teamSearch = document.getElementById("team-search");
    const teamRoleFilter = document.getElementById("team-role-filter");
    const teamFilterButtons = document.querySelectorAll(".team-filter-button");

    const teamResultsCount = document.getElementById("team-results-count");

    const teamLoading = document.getElementById("team-loading");
    const teamError = document.getElementById("team-error");
    const teamErrorMessage = document.getElementById("team-error-message");
    const teamRetryButton = document.getElementById("team-retry-button");

    const teamListSection = document.getElementById("team-list-section");
    const teamTableBody = document.getElementById("team-table-body");

    const teamEmptyState = document.getElementById("team-empty-state");
    const clearTeamFiltersButton = document.getElementById(
        "clear-team-filters-button"
    );

    const teamMemberTemplate = document.getElementById(
        "team-member-template"
    );

    const newMemberButton = document.getElementById("new-member-button");

    const newMemberModal = document.getElementById("new-member-modal");
    const newMemberForm = document.getElementById("new-member-form");
    const newMemberName = document.getElementById("new-member-name");
    const newMemberEmail = document.getElementById("new-member-email");
    const newMemberPassword = document.getElementById(
        "new-member-password"
    );
    const newMemberError = document.getElementById("new-member-error");
    const newMemberSaveButton = document.getElementById(
        "new-member-save-button"
    );

    const editMemberModal = document.getElementById("edit-member-modal");
    const editMemberForm = document.getElementById("edit-member-form");
    const editMemberId = document.getElementById("edit-member-id");
    const editMemberName = document.getElementById("edit-member-name");
    const editMemberEmail = document.getElementById("edit-member-email");
    const editMemberError = document.getElementById("edit-member-error");
    const editMemberSaveButton = document.getElementById(
        "edit-member-save-button"
    );

    const changePasswordModal = document.getElementById(
        "change-password-modal"
    );
    const changePasswordForm = document.getElementById(
        "change-password-form"
    );
    const changePasswordMemberId = document.getElementById(
        "change-password-member-id"
    );
    const changePasswordMemberDescription = document.getElementById(
        "change-password-member-description"
    );
    const changePasswordNew = document.getElementById(
        "change-password-new"
    );
    const changePasswordConfirm = document.getElementById(
        "change-password-confirm"
    );
    const changePasswordError = document.getElementById(
        "change-password-error"
    );
    const changePasswordSaveButton = document.getElementById(
        "change-password-save-button"
    );

    const confirmationModal = document.getElementById(
        "confirmation-modal"
    );
    const confirmationModalLabel = document.getElementById(
        "confirmation-modal-label"
    );
    const confirmationModalTitle = document.getElementById(
        "confirmation-modal-title"
    );
    const confirmationModalMessage = document.getElementById(
        "confirmation-modal-message"
    );
    const confirmationError = document.getElementById(
        "confirmation-error"
    );
    const confirmationButton = document.getElementById(
        "confirmation-button"
    );

    const toastContainer = document.getElementById("toast-container");


    // =========================================================
    // ESTADO
    // =========================================================

    let equipe = [];

    let filtroStatus = "todos";

    let acaoConfirmacao = null;

    let botaoMenuAtual = null;


    // =========================================================
    // HELPERS DE API
    // =========================================================

    function obterMensagemResposta(resposta, fallback) {

        return (
            resposta?.data?.mensagem ||
            resposta?.data?.message ||
            fallback
        );
    }


    function tratarRespostaAutorizacao(resposta) {

        if (resposta.status === 401) {
            window.CinemaxInterno.encerrarSessao();
            return true;
        }

        if (resposta.status === 403) {
            window.location.replace("home-admin.html");
            return true;
        }

        return false;
    }


    // =========================================================
    // SIDEBAR
    // =========================================================

    function abrirSidebar() {

        sidebar?.classList.add("open");
        sidebarOverlay?.classList.add("visible");

        document.body.classList.add("sidebar-open");

        sidebarOpenButton?.setAttribute(
            "aria-expanded",
            "true"
        );
    }


    function fecharSidebar() {

        sidebar?.classList.remove("open");
        sidebarOverlay?.classList.remove("visible");

        document.body.classList.remove("sidebar-open");

        sidebarOpenButton?.setAttribute(
            "aria-expanded",
            "false"
        );
    }


    sidebarOpenButton?.addEventListener(
        "click",
        abrirSidebar
    );

    sidebarCloseButton?.addEventListener(
        "click",
        fecharSidebar
    );

    sidebarOverlay?.addEventListener(
        "click",
        fecharSidebar
    );


    // =========================================================
    // LOGOUT
    // =========================================================

    logoutButton?.addEventListener("click", () => {
        window.CinemaxInterno.encerrarSessao();
    });


    // =========================================================
    // MODAIS
    // =========================================================

    function abrirModal(modal) {

        if (!modal) {
            return;
        }

        fecharMenusAcoes();

        modal.classList.remove("hidden");
        modal.setAttribute("aria-hidden", "false");

        document.body.style.overflow = "hidden";
    }


    function fecharModal(modal) {

        if (!modal) {
            return;
        }

        modal.classList.add("hidden");
        modal.setAttribute("aria-hidden", "true");

        const existeModalAberto =
            document.querySelector(
                ".modal-overlay:not(.hidden)"
            );

        if (!existeModalAberto) {
            document.body.style.overflow = "";
        }
    }


    document
        .querySelectorAll("[data-close-modal]")
        .forEach(button => {

            button.addEventListener("click", () => {

                const modalId =
                    button.dataset.closeModal;

                fecharModal(
                    document.getElementById(modalId)
                );
            });
        });


    document
        .querySelectorAll(".modal-overlay")
        .forEach(modal => {

            modal.addEventListener("click", event => {

                if (event.target === modal) {
                    fecharModal(modal);
                }
            });
        });


    document.addEventListener("keydown", event => {

        if (event.key !== "Escape") {
            return;
        }

        const modalAberto =
            document.querySelector(
                ".modal-overlay:not(.hidden)"
            );

        if (modalAberto) {
            fecharModal(modalAberto);
            return;
        }

        fecharMenusAcoes();
        fecharSidebar();
    });


    // =========================================================
    // ERROS DE FORMULÁRIO
    // =========================================================

    function mostrarErroFormulario(elemento, mensagem) {

        if (!elemento) {
            return;
        }

        elemento.textContent = mensagem;
        elemento.classList.remove("hidden");
    }


    function esconderErroFormulario(elemento) {

        if (!elemento) {
            return;
        }

        elemento.textContent = "";
        elemento.classList.add("hidden");
    }


    // =========================================================
    // TOAST
    // =========================================================

    function mostrarToast(mensagem, tipo = "success") {

        const toast = document.createElement("div");

        toast.className = "toast";
        toast.dataset.type = tipo;
        toast.textContent = mensagem;

        toastContainer.appendChild(toast);

        window.setTimeout(() => {

            toast.remove();

        }, 4000);
    }


    // =========================================================
    // BOTÃO EM CARREGAMENTO
    // =========================================================

    function definirBotaoCarregando(
        botao,
        carregando,
        textoCarregando
    ) {

        if (!botao) {
            return;
        }

        if (carregando) {

            if (!botao.dataset.textoOriginal) {
                botao.dataset.textoOriginal =
                    botao.textContent.trim();
            }

            botao.disabled = true;
            botao.textContent = textoCarregando;

            return;
        }

        botao.disabled = false;

        if (botao.dataset.textoOriginal) {

            botao.textContent =
                botao.dataset.textoOriginal;

            delete botao.dataset.textoOriginal;
        }
    }


    // =========================================================
    // FORMATAÇÕES
    // =========================================================

    function formatarData(data) {

        if (!data) {
            return "--";
        }

        const dataObjeto = new Date(data);

        if (Number.isNaN(dataObjeto.getTime())) {
            return "--";
        }

        return dataObjeto.toLocaleDateString(
            "pt-BR",
            {
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
            }
        );
    }


    function obterInicial(nome) {

        const nomeLimpo = nome?.trim();

        if (!nomeLimpo) {
            return "U";
        }

        return nomeLimpo
            .charAt(0)
            .toUpperCase();
    }


    // =========================================================
    // CARREGAMENTO DA EQUIPE
    // =========================================================

    async function carregarEquipe() {

        teamLoading.classList.remove("hidden");
        teamError.classList.add("hidden");
        teamListSection.classList.add("hidden");
        teamEmptyState.classList.add("hidden");

        teamResultsCount.textContent =
            "Carregando equipe...";

        const resposta = await apiRequest(
            "/Equipe"
        );

        if (tratarRespostaAutorizacao(resposta)) {
            return;
        }

        teamLoading.classList.add("hidden");

        if (!resposta.ok) {

            equipe = [];

            atualizarResumo();

            teamErrorMessage.textContent =
                obterMensagemResposta(
                    resposta,
                    "Verifique sua conexão e tente novamente."
                );

            teamError.classList.remove("hidden");

            teamResultsCount.textContent =
                "Não foi possível carregar a equipe.";

            return;
        }

        equipe = Array.isArray(resposta.data)
            ? resposta.data
            : [];

        atualizarResumo();
        renderizarEquipe();
    }


    // =========================================================
    // RESUMO
    // =========================================================

    function atualizarResumo() {

        const total = equipe.length;

        const funcionarios =
            equipe.filter(
                membro =>
                    membro.tipoUsuario === "Funcionario"
            ).length;

        const administradores =
            equipe.filter(
                membro =>
                    membro.tipoUsuario === "Admin"
            ).length;

        const inativos =
            equipe.filter(
                membro => !membro.ativo
            ).length;

        teamTotalCount.textContent = total;
        teamEmployeeCount.textContent = funcionarios;
        teamAdminCount.textContent = administradores;
        teamInactiveCount.textContent = inativos;
    }


    // =========================================================
    // FILTROS
    // =========================================================

    function obterEquipeFiltrada() {

        const pesquisa =
            teamSearch.value
                .trim()
                .toLocaleLowerCase("pt-BR");

        const cargo =
            teamRoleFilter.value;

        return equipe.filter(membro => {

            const nome =
                membro.nome
                    ?.toLocaleLowerCase("pt-BR") || "";

            const email =
                membro.email
                    ?.toLocaleLowerCase("pt-BR") || "";

            const correspondePesquisa =
                !pesquisa ||
                nome.includes(pesquisa) ||
                email.includes(pesquisa);

            const correspondeCargo =
                !cargo ||
                membro.tipoUsuario === cargo;

            let correspondeStatus = true;

            if (filtroStatus === "ativo") {
                correspondeStatus = membro.ativo === true;
            }

            if (filtroStatus === "inativo") {
                correspondeStatus = membro.ativo === false;
            }

            return (
                correspondePesquisa &&
                correspondeCargo &&
                correspondeStatus
            );
        });
    }


    function atualizarContagemResultados(
        quantidade,
        total
    ) {

        if (
            quantidade === total &&
            !teamSearch.value.trim() &&
            !teamRoleFilter.value &&
            filtroStatus === "todos"
        ) {

            teamResultsCount.textContent =
                total === 1
                    ? "1 membro cadastrado"
                    : `${total} membros cadastrados`;

            return;
        }

        teamResultsCount.textContent =
            quantidade === 1
                ? "1 membro encontrado"
                : `${quantidade} membros encontrados`;
    }


    // =========================================================
    // RENDERIZAÇÃO
    // =========================================================

    function renderizarEquipe() {

        fecharMenusAcoes();

        teamError.classList.add("hidden");
        teamLoading.classList.add("hidden");

        teamTableBody.innerHTML = "";

        const equipeFiltrada =
            obterEquipeFiltrada();

        atualizarContagemResultados(
            equipeFiltrada.length,
            equipe.length
        );

        if (equipeFiltrada.length === 0) {

            teamListSection.classList.add("hidden");
            teamEmptyState.classList.remove("hidden");

            return;
        }

        teamEmptyState.classList.add("hidden");
        teamListSection.classList.remove("hidden");

        equipeFiltrada.forEach(membro => {

            const fragmento =
                teamMemberTemplate.content.cloneNode(true);

            const row =
                fragmento.querySelector(
                    ".team-member-row"
                );

            const avatar =
                fragmento.querySelector(
                    ".team-member-avatar"
                );

            const name =
                fragmento.querySelector(
                    ".team-member-name"
                );

            const email =
                fragmento.querySelector(
                    ".team-member-email"
                );

            const roleBadge =
                fragmento.querySelector(
                    ".team-role-badge"
                );

            const statusBadge =
                fragmento.querySelector(
                    ".team-status-badge"
                );

            const registrationDate =
                fragmento.querySelector(
                    ".team-registration-date"
                );

            const editButton =
                fragmento.querySelector(
                    ".team-edit-button"
                );

            const moreButton =
                fragmento.querySelector(
                    ".team-more-button"
                );

            const actionsMenu =
                fragmento.querySelector(
                    ".team-actions-menu"
                );

            const passwordAction =
                fragmento.querySelector(
                    ".change-password-action"
                );

            const roleAction =
                fragmento.querySelector(
                    ".change-role-action"
                );

            const statusAction =
                fragmento.querySelector(
                    ".change-status-action"
                );


            // ---------------------------------------------
            // DADOS
            // ---------------------------------------------

            row.dataset.memberId = membro.id;
            row.dataset.active = String(membro.ativo);

            avatar.textContent =
                obterInicial(membro.nome);

            name.textContent =
                membro.nome || "Sem nome";

            email.textContent =
                membro.email || "Sem e-mail";


            // ---------------------------------------------
            // CARGO
            // ---------------------------------------------

            roleBadge.dataset.role =
                membro.tipoUsuario;

            roleBadge.textContent =
                membro.tipoUsuario === "Admin"
                    ? "Administrador"
                    : "Funcionário";


            // ---------------------------------------------
            // STATUS
            // ---------------------------------------------

            statusBadge.dataset.status =
                membro.ativo
                    ? "ativo"
                    : "inativo";

            statusBadge.textContent =
                membro.ativo
                    ? "Ativo"
                    : "Inativo";


            // ---------------------------------------------
            // DATA
            // ---------------------------------------------

            registrationDate.textContent =
                formatarData(
                    membro.dataCadastro
                );


            // ---------------------------------------------
            // EDITAR
            // ---------------------------------------------

            editButton.addEventListener(
                "click",
                () => abrirEdicao(membro)
            );


            // ---------------------------------------------
            // MENU
            // ---------------------------------------------

            moreButton.addEventListener(
                "click",
                event => {

                    event.stopPropagation();

                    alternarMenuAcoes(
                        moreButton,
                        actionsMenu
                    );
                }
            );


            actionsMenu.addEventListener(
                "click",
                event => {
                    event.stopPropagation();
                }
            );


            // ---------------------------------------------
            // SENHA
            // ---------------------------------------------

            passwordAction.addEventListener(
                "click",
                () => {

                    fecharMenusAcoes();
                    abrirAlteracaoSenha(membro);
                }
            );


            // ---------------------------------------------
            // CARGO
            // ---------------------------------------------

            const ehAdmin =
                membro.tipoUsuario === "Admin";

            roleAction.textContent =
                ehAdmin
                    ? "Rebaixar a funcionário"
                    : "Promover a administrador";

            roleAction.addEventListener(
                "click",
                () => {

                    fecharMenusAcoes();

                    if (ehAdmin) {
                        confirmarRebaixamento(membro);
                    }
                    else {
                        confirmarPromocao(membro);
                    }
                }
            );


            // ---------------------------------------------
            // STATUS
            // ---------------------------------------------

            statusAction.textContent =
                membro.ativo
                    ? "Desativar acesso"
                    : "Reativar acesso";

            statusAction.dataset.action =
                membro.ativo
                    ? "deactivate"
                    : "reactivate";

            statusAction.addEventListener(
                "click",
                () => {

                    fecharMenusAcoes();

                    if (membro.ativo) {
                        confirmarDesativacao(membro);
                    }
                    else {
                        confirmarReativacao(membro);
                    }
                }
            );


            // ---------------------------------------------
            // PRÓPRIA CONTA
            // ---------------------------------------------

            const ehPropriaConta =
                Number(membro.id) ===
                Number(usuario.id);

            if (ehPropriaConta) {

                if (ehAdmin) {

                    roleAction.disabled = true;
                    roleAction.title =
                        "Você não pode rebaixar sua própria conta.";
                }

                if (membro.ativo) {

                    statusAction.disabled = true;
                    statusAction.title =
                        "Você não pode desativar sua própria conta.";
                }
            }


            teamTableBody.appendChild(fragmento);
        });
    }


    // =========================================================
    // MENU DE AÇÕES
    // =========================================================

    function alternarMenuAcoes(
        botao,
        menu
    ) {

        const estavaAberto =
            !menu.classList.contains("hidden");

        fecharMenusAcoes();

        if (estavaAberto) {
            return;
        }

        menu.classList.remove("hidden");

        botao.setAttribute(
            "aria-expanded",
            "true"
        );

        botaoMenuAtual = botao;
    }


    function fecharMenusAcoes() {

        document
            .querySelectorAll(
                ".team-actions-menu:not(.hidden)"
            )
            .forEach(menu => {
                menu.classList.add("hidden");
            });

        document
            .querySelectorAll(".team-more-button")
            .forEach(button => {
                button.setAttribute(
                    "aria-expanded",
                    "false"
                );
            });

        botaoMenuAtual = null;
    }


    document.addEventListener("click", event => {

        if (
            botaoMenuAtual &&
            !event.target.closest(".team-actions")
        ) {
            fecharMenusAcoes();
        }
    });


    // =========================================================
    // FILTROS - EVENTOS
    // =========================================================

    teamSearch.addEventListener(
        "input",
        renderizarEquipe
    );


    teamRoleFilter.addEventListener(
        "change",
        renderizarEquipe
    );


    teamFilterButtons.forEach(button => {

        button.addEventListener("click", () => {

            teamFilterButtons.forEach(item => {
                item.classList.remove("active");
            });

            button.classList.add("active");

            filtroStatus =
                button.dataset.status || "todos";

            renderizarEquipe();
        });
    });


    clearTeamFiltersButton.addEventListener(
        "click",
        () => {

            teamSearch.value = "";
            teamRoleFilter.value = "";
            filtroStatus = "todos";

            teamFilterButtons.forEach(button => {

                button.classList.toggle(
                    "active",
                    button.dataset.status === "todos"
                );
            });

            renderizarEquipe();
        }
    );


    // =========================================================
    // NOVO FUNCIONÁRIO
    // =========================================================

    newMemberButton.addEventListener(
        "click",
        () => {

            newMemberForm.reset();

            esconderErroFormulario(
                newMemberError
            );

            abrirModal(newMemberModal);

            window.setTimeout(() => {
                newMemberName.focus();
            }, 0);
        }
    );


    newMemberForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            esconderErroFormulario(
                newMemberError
            );

            const nome =
                newMemberName.value.trim();

            const email =
                newMemberEmail.value.trim();

            const senha =
                newMemberPassword.value;


            if (!nome || !email || !senha) {

                mostrarErroFormulario(
                    newMemberError,
                    "Preencha todos os campos."
                );

                return;
            }


            if (senha.length < 6) {

                mostrarErroFormulario(
                    newMemberError,
                    "A senha deve possuir pelo menos 6 caracteres."
                );

                return;
            }


            definirBotaoCarregando(
                newMemberSaveButton,
                true,
                "Cadastrando..."
            );


            const resposta = await apiRequest(
                "/Equipe",
                {
                    method: "POST",

                    body: JSON.stringify({
                        nome,
                        email,
                        senha
                    })
                }
            );


            definirBotaoCarregando(
                newMemberSaveButton,
                false
            );


            if (tratarRespostaAutorizacao(resposta)) {
                return;
            }


            if (!resposta.ok) {

                mostrarErroFormulario(
                    newMemberError,
                    obterMensagemResposta(
                        resposta,
                        "Não foi possível cadastrar o funcionário."
                    )
                );

                return;
            }


            fecharModal(newMemberModal);

            mostrarToast(
                "Funcionário cadastrado com sucesso."
            );

            await carregarEquipe();
        }
    );


    // =========================================================
    // EDITAR MEMBRO
    // =========================================================

    function abrirEdicao(membro) {

        editMemberForm.reset();

        esconderErroFormulario(
            editMemberError
        );

        editMemberId.value =
            membro.id;

        editMemberName.value =
            membro.nome || "";

        editMemberEmail.value =
            membro.email || "";

        abrirModal(editMemberModal);

        window.setTimeout(() => {
            editMemberName.focus();
        }, 0);
    }


    editMemberForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            esconderErroFormulario(
                editMemberError
            );

            const id =
                Number(editMemberId.value);

            const nome =
                editMemberName.value.trim();

            const email =
                editMemberEmail.value.trim();


            if (!id || !nome || !email) {

                mostrarErroFormulario(
                    editMemberError,
                    "Preencha o nome e o e-mail."
                );

                return;
            }


            definirBotaoCarregando(
                editMemberSaveButton,
                true,
                "Salvando..."
            );


            const resposta = await apiRequest(
                `/Equipe/${id}`,
                {
                    method: "PATCH",

                    body: JSON.stringify({
                        nome,
                        email
                    })
                }
            );


            definirBotaoCarregando(
                editMemberSaveButton,
                false
            );


            if (tratarRespostaAutorizacao(resposta)) {
                return;
            }


            if (!resposta.ok) {

                mostrarErroFormulario(
                    editMemberError,
                    obterMensagemResposta(
                        resposta,
                        "Não foi possível salvar as alterações."
                    )
                );

                return;
            }


            fecharModal(editMemberModal);

            mostrarToast(
                "Dados atualizados com sucesso."
            );

            await carregarEquipe();
        }
    );


    // =========================================================
    // ALTERAR SENHA
    // =========================================================

    function abrirAlteracaoSenha(membro) {

        changePasswordForm.reset();

        esconderErroFormulario(
            changePasswordError
        );

        changePasswordMemberId.value =
            membro.id;

        changePasswordMemberDescription.textContent =
            `Defina uma nova senha para ${membro.nome}.`;

        abrirModal(changePasswordModal);

        window.setTimeout(() => {
            changePasswordNew.focus();
        }, 0);
    }


    changePasswordForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            esconderErroFormulario(
                changePasswordError
            );

            const id =
                Number(
                    changePasswordMemberId.value
                );

            const senha =
                changePasswordNew.value;

            const confirmacao =
                changePasswordConfirm.value;


            if (!id) {
                return;
            }


            if (senha.length < 6) {

                mostrarErroFormulario(
                    changePasswordError,
                    "A senha deve possuir pelo menos 6 caracteres."
                );

                return;
            }


            if (senha !== confirmacao) {

                mostrarErroFormulario(
                    changePasswordError,
                    "As senhas informadas não coincidem."
                );

                return;
            }


            definirBotaoCarregando(
                changePasswordSaveButton,
                true,
                "Alterando..."
            );


            const resposta = await apiRequest(
                `/Equipe/${id}/senha`,
                {
                    method: "PATCH",

                    body: JSON.stringify({
                        senha
                    })
                }
            );


            definirBotaoCarregando(
                changePasswordSaveButton,
                false
            );


            if (tratarRespostaAutorizacao(resposta)) {
                return;
            }


            if (!resposta.ok) {

                mostrarErroFormulario(
                    changePasswordError,
                    obterMensagemResposta(
                        resposta,
                        "Não foi possível alterar a senha."
                    )
                );

                return;
            }


            fecharModal(changePasswordModal);

            mostrarToast(
                "Senha alterada com sucesso."
            );
        }
    );


    // =========================================================
    // CONFIRMAÇÃO GENÉRICA
    // =========================================================

    function abrirConfirmacao({
        label,
        titulo,
        mensagem,
        textoBotao,
        tipo = "normal",
        acao
    }) {

        esconderErroFormulario(
            confirmationError
        );

        confirmationModalLabel.textContent =
            label;

        confirmationModalTitle.textContent =
            titulo;

        confirmationModalMessage.textContent =
            mensagem;

        confirmationButton.textContent =
            textoBotao;

        confirmationModal.dataset.actionType =
            tipo;

        acaoConfirmacao = acao;

        abrirModal(confirmationModal);
    }


    confirmationButton.addEventListener(
        "click",
        async () => {

            if (!acaoConfirmacao) {
                return;
            }

            esconderErroFormulario(
                confirmationError
            );

            definirBotaoCarregando(
                confirmationButton,
                true,
                "Processando..."
            );


            let sucesso = false;

            try {

                sucesso =
                    await acaoConfirmacao();

            }
            finally {

                definirBotaoCarregando(
                    confirmationButton,
                    false
                );
            }


            if (!sucesso) {
                return;
            }


            acaoConfirmacao = null;

            fecharModal(confirmationModal);

            await carregarEquipe();
        }
    );


    // =========================================================
    // EXECUTAR AÇÃO ADMINISTRATIVA
    // =========================================================

    async function executarAcaoAdministrativa(
        endpoint,
        mensagemSucesso
    ) {

        const resposta = await apiRequest(
            endpoint,
            {
                method: "PATCH"
            }
        );


        if (tratarRespostaAutorizacao(resposta)) {
            return false;
        }


        if (!resposta.ok) {

            mostrarErroFormulario(
                confirmationError,
                obterMensagemResposta(
                    resposta,
                    "Não foi possível concluir a ação."
                )
            );

            return false;
        }


        mostrarToast(mensagemSucesso);

        return true;
    }


    // =========================================================
    // PROMOVER
    // =========================================================

    function confirmarPromocao(membro) {

        abrirConfirmacao({

            label: "Permissões",

            titulo: "Promover a administrador",

            mensagem:
                `${membro.nome} passará a ter acesso às funções administrativas do sistema, incluindo relatórios e gerenciamento da equipe.`,

            textoBotao: "Promover",

            acao: () =>
                executarAcaoAdministrativa(
                    `/Equipe/${membro.id}/promover`,
                    `${membro.nome} agora é administrador.`
                )
        });
    }


    // =========================================================
    // REBAIXAR
    // =========================================================

    function confirmarRebaixamento(membro) {

        abrirConfirmacao({

            label: "Permissões",

            titulo: "Rebaixar a funcionário",

            mensagem:
                `${membro.nome} perderá o acesso às funções exclusivas de administrador e continuará com acesso operacional.`,

            textoBotao: "Rebaixar",

            tipo: "danger",

            acao: () =>
                executarAcaoAdministrativa(
                    `/Equipe/${membro.id}/rebaixar`,
                    `${membro.nome} agora é funcionário.`
                )
        });
    }


    // =========================================================
    // DESATIVAR
    // =========================================================

    function confirmarDesativacao(membro) {

        abrirConfirmacao({

            label: "Acesso",

            titulo: "Desativar acesso",

            mensagem:
                `${membro.nome} não poderá mais entrar no sistema enquanto a conta estiver desativada.`,

            textoBotao: "Desativar",

            tipo: "danger",

            acao: () =>
                executarAcaoAdministrativa(
                    `/Equipe/${membro.id}/desativar`,
                    `Acesso de ${membro.nome} desativado.`
                )
        });
    }


    // =========================================================
    // REATIVAR
    // =========================================================

    function confirmarReativacao(membro) {

        abrirConfirmacao({

            label: "Acesso",

            titulo: "Reativar acesso",

            mensagem:
                `${membro.nome} voltará a poder entrar no sistema normalmente.`,

            textoBotao: "Reativar",

            acao: () =>
                executarAcaoAdministrativa(
                    `/Equipe/${membro.id}/reativar`,
                    `Acesso de ${membro.nome} reativado.`
                )
        });
    }


    // =========================================================
    // TENTAR NOVAMENTE
    // =========================================================

    teamRetryButton.addEventListener(
        "click",
        carregarEquipe
    );


    // =========================================================
    // INICIALIZAÇÃO
    // =========================================================

    carregarEquipe();

});