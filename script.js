// ============================================================
// StockControl — Sistema de Controle de Estoque (v3)
// Reescrito para corrigir: parsing de datas em UTC, listeners de
// edição empilhados, status que se escondem entre si, uso de
// prompt() nativo (quebra em PWA iOS), IDs por timestamp, XSS via
// innerHTML e seed de dados fake sempre carregado.
// ============================================================

(function () {
    'use strict';

    // ---------- estado ----------
    let estoque = carregarJSON('estoque', []);
    let historicoRetiradas = carregarJSON('historicoRetiradas', []);
    let produtosSelecionadosPedido = [];
    let manualIdCounter = 1;

    let modoEdicaoId = null;          // null = cadastro novo | id = editando esse produto
    let produtoSelecionadoRetirada = null;
    let produtoParaExcluir = null;

    const HOJE = new Date();
    HOJE.setHours(0, 0, 0, 0);

    // ---------- utilidades de dados ----------
    function carregarJSON(chave, padrao) {
        try {
            const bruto = localStorage.getItem(chave);
            return bruto ? JSON.parse(bruto) : padrao;
        } catch (e) {
            console.error('Falha ao ler', chave, e);
            return padrao;
        }
    }

    function salvarDados() {
        localStorage.setItem('estoque', JSON.stringify(estoque));
        localStorage.setItem('historicoRetiradas', JSON.stringify(historicoRetiradas));
    }

    function gerarId() {
        if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
        return 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
    }

    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // ---------- datas: sempre local, nunca deixar o Date parsear ISO como UTC ----------
    function parseDataLocal(dataISO) {
        // "YYYY-MM-DD" -> Date à meia-noite NO FUSO LOCAL (evita o bug clássico
        // de new Date("YYYY-MM-DD") ser interpretado como UTC e deslocar o dia).
        if (!dataISO) return null;
        const [ano, mes, dia] = dataISO.split('-').map(Number);
        return new Date(ano, mes - 1, dia);
    }

    function diasRestantes(dataISO) {
        const data = parseDataLocal(dataISO);
        if (!data) return null;
        const diffMs = data.getTime() - HOJE.getTime();
        return Math.round(diffMs / (1000 * 60 * 60 * 24));
    }

    function formatarDataBR(dataISO) {
        const data = parseDataLocal(dataISO);
        return data ? data.toLocaleDateString('pt-BR') : '—';
    }

    // ---------- status: um produto pode estar em MAIS DE UM estado ao mesmo tempo ----------
    // (antes o sistema escondia "em falta" atrás de "vencido/alerta" e os contadores
    // do dashboard não batiam com o que a tabela mostrava — corrigido aqui.)
    function statusDoProduto(produto) {
        const dias = diasRestantes(produto.validade);
        const statuses = [];

        if (dias !== null && dias < 0) statuses.push('vencido');
        else if (dias !== null && dias <= 30) statuses.push('alerta');

        if (produto.quantidade < produto.quantidadeMinima) statuses.push('falta');

        if (statuses.length === 0) statuses.push('ok');
        return statuses;
    }

    const STATUS_LABEL = { ok: 'OK', alerta: 'Vencendo', vencido: 'Vencido', falta: 'Em Falta' };
    const STATUS_ICON = { ok: 'fa-circle-check', alerta: 'fa-clock', vencido: 'fa-skull-crossbones', falta: 'fa-arrow-down-short-wide' };

    function chipsHtml(statuses) {
        return statuses.map(s =>
            `<span class="status-chip ${s}"><i class="fas ${STATUS_ICON[s]}"></i>${STATUS_LABEL[s]}</span>`
        ).join('');
    }

    // anel de dias restantes — assinatura visual do app
    function dayRingHtml(produto) {
        const dias = diasRestantes(produto.validade);
        let cor = 'var(--ok)', pct = 0, texto = '—';

        if (dias === null) {
            texto = '—';
        } else if (dias < 0) {
            cor = 'var(--vencido)'; pct = 100; texto = 'VENC';
        } else {
            pct = Math.max(0, Math.min(100, 100 - (dias / 60 * 100)));
            if (dias <= 7) cor = 'var(--vencido)';
            else if (dias <= 30) cor = 'var(--alerta)';
            else cor = 'var(--ok)';
            texto = String(dias);
        }

        return `<div class="day-ring" style="--pct:${pct};--ring-color:${cor};">
                    <div class="day-ring-inner">${texto}<small>dias</small></div>
                </div>`;
    }

    // ---------- elementos ----------
    const $ = (id) => document.getElementById(id);

    const els = {
        navItems: document.querySelectorAll('.nav-item'),
        contentSections: document.querySelectorAll('.content-section'),
        dashboardCards: document.querySelectorAll('.dashboard-card'),
        totalEstoque: $('totalEstoque'),
        proximoVencimento: $('proximoVencimento'),
        produtosVencidos: $('produtosVencidos'),
        produtosFalta: $('produtosFalta'),
        currentDate: $('currentDate'),
        navAlertDot: $('navAlertDot'),

        stockList: $('stockList'),
        estoqueTableBody: $('estoqueTableBody'),
        emptyStockMessage: $('emptyStockMessage'),
        searchInput: $('searchInput'),
        btnAddProduct: $('btnAddProduct'),
        btnEmptyAdd: $('btnEmptyAdd'),

        cadastroForm: $('cadastroForm'),
        produtoEditId: $('produtoEditId'),
        cadastroTitulo: $('cadastroTitulo'),
        cadastroSubtitulo: $('cadastroSubtitulo'),
        cadastroIcon: $('cadastroIcon'),
        btnSubmitCadastro: $('btnSubmitCadastro'),
        limparFormBtn: $('limparForm'),

        retiradaForm: $('retiradaForm'),
        retiradaProdutoSelect: $('retiradaProduto'),
        retiradaQuantidadeInput: $('retiradaQuantidade'),
        retiradaQuantidadeDisponivel: $('retiradaQuantidadeDisponivel'),
        cancelarRetiradaBtn: $('cancelarRetirada'),
        historyList: $('historyList'),
        historicoTableBody: $('historicoTableBody'),
        emptyHistoryMessage: $('emptyHistoryMessage'),

        proximoTableBody: $('proximoTableBody'),
        emptyProximoTable: $('emptyProximoTable'),
        proximoCount: $('proximoCount'),
        vencidoTableBody: $('vencidoTableBody'),
        emptyVencidoTable: $('emptyVencidoTable'),
        vencidoCount: $('vencidoCount'),

        alertProximoCount: $('alertProximoCount'),
        alertProximoList: $('alertProximoList'),
        emptyProximoAlert: $('emptyProximoAlert'),
        alertVencidoCount: $('alertVencidoCount'),
        alertVencidoList: $('alertVencidoList'),
        emptyVencidoAlert: $('emptyVencidoAlert'),
        alertFaltaCount: $('alertFaltaCount'),
        alertFaltaList: $('alertFaltaList'),
        emptyFaltaAlert: $('emptyFaltaAlert'),

        confirmationModal: $('confirmationModal'),
        modalTitle: $('modalTitle'),
        modalMessage: $('modalMessage'),
        modalConfirm: $('modalConfirm'),
        modalCancel: $('modalCancel'),
        modalClose: $('modalClose'),

        inputModal: $('inputModal'),
        inputModalTitle: $('inputModalTitle'),
        inputModalMessage: $('inputModalMessage'),
        inputModalField: $('inputModalField'),
        inputModalError: $('inputModalError'),
        inputModalConfirm: $('inputModalConfirm'),
        inputModalCancel: $('inputModalCancel'),
        inputModalClose: $('inputModalClose'),

        notification: $('notification'),
        notificationText: $('notificationText'),
        notificationIcon: $('notificationIcon'),
        notificationClose: $('notificationClose'),

        btnRelatorioPedidos: $('btnRelatorioPedidos'),
        pedidosModal: $('pedidosModal'),
        pedidosModalClose: $('pedidosModalClose'),
        produtosListaPedido: $('produtosListaPedido'),
        searchProdutosPedido: $('searchProdutosPedido'),
        pedidosSelecionadosLista: $('pedidosSelecionadosLista'),
        emptyProdutosPedido: $('emptyProdutosPedido'),
        emptyPedidosSelecionados: $('emptyPedidosSelecionados'),
        pedidosSelecionadosCount: $('pedidosSelecionadosCount'),
        pedidosQuantidadeTotal: $('pedidosQuantidadeTotal'),
        btnAdicionarManual: $('btnAdicionarManual'),
        btnLimparPedido: $('btnLimparPedido'),
        btnGerarPDF: $('btnGerarPDF'),
    };

    // ============================================================
    // inicialização
    // ============================================================
    document.addEventListener('DOMContentLoaded', inicializarApp);

    function inicializarApp() {
        atualizarDataAtual();
        definirValidadePadrao();
        configurarNavegacao();
        configurarCardsInterativos();
        configurarEventos();
        configurarModalGenerico();
        configurarModalPedidos();

        renderizarTudo();

        // mantém abas sincronizadas — o app original não escutava mudanças
        // feitas em outra aba, então duas abas abertas divergiam em silêncio.
        window.addEventListener('storage', (e) => {
            if (e.key === 'estoque' || e.key === 'historicoRetiradas') {
                estoque = carregarJSON('estoque', []);
                historicoRetiradas = carregarJSON('historicoRetiradas', []);
                renderizarTudo();
            }
        });

        setTimeout(verificarAlertasAutomaticos, 500);
    }

    function renderizarTudo() {
        atualizarDataAtual();
        atualizarDashboard();
        atualizarTabelasAlertasDashboard();
        carregarEstoque();
        carregarProdutosRetirada();
        carregarRetiradas();
        atualizarAlertas();
    }

    function atualizarDataAtual() {
        if (els.currentDate) {
            els.currentDate.textContent = HOJE.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
        }
    }

    function definirValidadePadrao() {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        const iso = d.toISOString().split('T')[0];
        if ($('produtoValidade')) $('produtoValidade').value = iso;
    }

    // ============================================================
    // navegação
    // ============================================================
    function irParaSecao(sectionId) {
        els.navItems.forEach(item => item.classList.toggle('active', item.getAttribute('data-section') === sectionId));
        els.contentSections.forEach(section => {
            const ativa = section.id === sectionId;
            section.classList.toggle('active', ativa);
            if (ativa) {
                if (sectionId === 'estoque') carregarEstoque();
                else if (sectionId === 'alertas') atualizarAlertas();
            }
        });
    }

    function configurarNavegacao() {
        els.navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                irParaSecao(item.getAttribute('data-section'));
            });
        });
    }

    function configurarCardsInterativos() {
        els.dashboardCards.forEach(card => {
            card.addEventListener('click', () => irParaSecao(card.getAttribute('data-section')));
        });
    }

    // ============================================================
    // dashboard
    // ============================================================
    function atualizarDashboard() {
        const totalQuantidade = estoque.reduce((total, p) => total + p.quantidade, 0);
        let proximoVenc = 0, vencidos = 0, emFalta = 0;

        estoque.forEach(p => {
            const s = statusDoProduto(p);
            if (s.includes('alerta')) proximoVenc++;
            if (s.includes('vencido')) vencidos++;
            if (s.includes('falta')) emFalta++;
        });

        els.totalEstoque.textContent = totalQuantidade;
        els.proximoVencimento.textContent = proximoVenc;
        els.produtosVencidos.textContent = vencidos;
        els.produtosFalta.textContent = emFalta;

        const totalAlertas = proximoVenc + vencidos + emFalta;
        if (els.navAlertDot) els.navAlertDot.classList.toggle('show', totalAlertas > 0);
    }

    function linhaAlertaHtml(produto, tipo) {
        const dias = diasRestantes(produto.validade);
        const diasTxt = tipo === 'vencido' ? `${Math.abs(dias)} dia(s)` : `${dias} dia(s)`;
        return `<tr>
            <td><strong>${escapeHtml(produto.nome)}</strong></td>
            <td class="mono">${produto.quantidade}</td>
            <td class="mono">${formatarDataBR(produto.validade)}</td>
            <td><span class="status-badge status-${tipo}">${diasTxt}</span></td>
        </tr>`;
    }

    function atualizarTabelasAlertasDashboard() {
        const proximos = estoque.filter(p => statusDoProduto(p).includes('alerta'))
            .sort((a, b) => diasRestantes(a.validade) - diasRestantes(b.validade));
        const vencidos = estoque.filter(p => statusDoProduto(p).includes('vencido'))
            .sort((a, b) => diasRestantes(a.validade) - diasRestantes(b.validade));

        preencherTabela(els.proximoTableBody, els.emptyProximoTable, els.proximoCount, proximos,
            p => linhaAlertaHtml(p, 'alerta'));
        preencherTabela(els.vencidoTableBody, els.emptyVencidoTable, els.vencidoCount, vencidos,
            p => linhaAlertaHtml(p, 'vencido'));
    }

    function preencherTabela(tbody, emptyEl, countEl, lista, montarLinha) {
        if (!tbody) return;
        tbody.innerHTML = lista.map(montarLinha).join('');
        if (emptyEl) emptyEl.style.display = lista.length === 0 ? 'flex' : 'none';
        if (countEl) countEl.textContent = String(lista.length);
    }

    // ============================================================
    // estoque (lista mobile em cards + tabela desktop)
    // ============================================================
    function filtrarPorBusca(lista, termo) {
        if (!termo) return lista;
        const t = termo.toLowerCase();
        return lista.filter(p => p.nome.toLowerCase().includes(t));
    }

    function carregarEstoque(filtro = '') {
        const produtos = filtrarPorBusca(estoque, filtro).slice()
            .sort((a, b) => parseDataLocal(a.validade) - parseDataLocal(b.validade));

        const semResultado = produtos.length === 0;
        els.emptyStockMessage.style.display = semResultado ? 'flex' : 'none';

        if (semResultado) {
            els.stockList.innerHTML = '';
            els.estoqueTableBody.innerHTML = '';
            if (estoque.length === 0) {
                els.emptyStockMessage.innerHTML = `<i class="fas fa-box-open"></i>Nenhum produto cadastrado ainda. Comece registrando o primeiro item do estoque.<button class="btn-link" id="btnEmptyAdd2">Cadastrar agora</button>`;
                const btn = $('btnEmptyAdd2');
                if (btn) btn.addEventListener('click', () => irParaSecao('cadastro'));
            } else {
                els.emptyStockMessage.innerHTML = `<i class="fas fa-magnifying-glass"></i>Nenhum produto encontrado para "${escapeHtml(filtro)}".`;
            }
            return;
        }

        els.stockList.innerHTML = produtos.map(cardEstoqueHtml).join('');
        els.estoqueTableBody.innerHTML = produtos.map(linhaEstoqueTabelaHtml).join('');
    }

    function cardEstoqueHtml(produto) {
        const statuses = statusDoProduto(produto);
        const dias = diasRestantes(produto.validade);
        const diasTexto = dias < 0 ? `Venceu há ${Math.abs(dias)}d` : dias === 0 ? 'Vence hoje' : `Vence em ${dias}d`;

        return `<div class="stock-row">
            ${dayRingHtml(produto)}
            <div class="stock-row-info">
                <div class="stock-row-name">${escapeHtml(produto.nome)}</div>
                ${produto.observacao ? `<div class="stock-row-obs">${escapeHtml(produto.observacao)}</div>` : ''}
                <div class="stock-row-meta">
                    <span>Qtd: <b>${produto.quantidade}</b></span>
                    <span>Mín: <b>${produto.quantidadeMinima}</b></span>
                    <span>${formatarDataBR(produto.validade)} · ${diasTexto}</span>
                </div>
                <div class="stock-row-chips">${chipsHtml(statuses)}</div>
            </div>
            <div class="stock-row-actions">
                <button class="btn-action btn-edit" title="Editar" onclick="StockControl.editarProduto('${produto.id}')"><i class="fas fa-edit"></i></button>
                <button class="btn-action btn-quick-retirada" title="Retirar" onclick="StockControl.retiradaRapida('${produto.id}')"><i class="fas fa-minus"></i></button>
                <button class="btn-action btn-delete" title="Excluir" onclick="StockControl.confirmarExclusaoProduto('${produto.id}')"><i class="fas fa-trash-alt"></i></button>
            </div>
        </div>`;
    }

    function linhaEstoqueTabelaHtml(produto) {
        const statuses = statusDoProduto(produto);
        const dias = diasRestantes(produto.validade);
        const diasTexto = dias < 0 ? `Venceu há ${Math.abs(dias)} dia(s)` : dias === 0 ? 'Vence hoje!' : `Vence em ${dias} dia(s)`;

        return `<tr>
            <td><div class="product-info"><strong>${escapeHtml(produto.nome)}</strong>${produto.observacao ? `<br><small class="text-muted">${escapeHtml(produto.observacao)}</small>` : ''}</div></td>
            <td class="mono">${produto.quantidade}<br><small class="text-muted">Mín: ${produto.quantidadeMinima}</small></td>
            <td class="mono">${formatarDataBR(produto.validade)}<br><small class="text-muted">${diasTexto}</small></td>
            <td><div class="status-chips">${chipsHtml(statuses)}</div></td>
            <td class="text-center">
                <div class="action-buttons">
                    <button class="btn-action btn-edit" title="Editar" onclick="StockControl.editarProduto('${produto.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn-action btn-quick-retirada" title="Retirar" onclick="StockControl.retiradaRapida('${produto.id}')"><i class="fas fa-minus"></i></button>
                    <button class="btn-action btn-delete" title="Excluir" onclick="StockControl.confirmarExclusaoProduto('${produto.id}')"><i class="fas fa-trash-alt"></i></button>
                </div>
            </td>
        </tr>`;
    }

    function filtrarEstoque() { carregarEstoque(els.searchInput.value); }

    // ============================================================
    // cadastro / edição — UM único listener, decidido por modoEdicaoId
    // (o app original criava um closure novo por edição e nunca removia
    // o anterior; aqui existe uma única fonte de verdade)
    // ============================================================
    function iniciarEdicao(produto) {
        modoEdicaoId = produto.id;
        $('produtoNome').value = produto.nome;
        $('produtoQuantidade').value = produto.quantidade;
        $('produtoMinimo').value = produto.quantidadeMinima;
        $('produtoValidade').value = produto.validade;
        $('produtoObservacao').value = produto.observacao || '';

        els.cadastroTitulo.textContent = 'Editar Produto';
        els.cadastroSubtitulo.textContent = `Atualizando "${produto.nome}"`;
        els.cadastroIcon.className = 'fas fa-pen-to-square';
        els.btnSubmitCadastro.innerHTML = '<i class="fas fa-sync-alt"></i><span>Atualizar Produto</span>';

        irParaSecao('cadastro');
    }

    function sairModoEdicao() {
        modoEdicaoId = null;
        els.cadastroTitulo.textContent = 'Cadastrar Produto';
        els.cadastroSubtitulo.textContent = 'Adicione um novo item ao estoque';
        els.cadastroIcon.className = 'fas fa-plus-circle';
        els.btnSubmitCadastro.innerHTML = '<i class="fas fa-save"></i><span>Salvar Produto</span>';
    }

    function limparFormCadastro() {
        els.cadastroForm.reset();
        definirValidadePadrao();
        sairModoEdicao();
    }

    function submeterCadastro(e) {
        e.preventDefault();

        const nome = $('produtoNome').value.trim();
        const quantidade = parseInt($('produtoQuantidade').value, 10);
        const quantidadeMinima = parseInt($('produtoMinimo').value, 10) || 0;
        const validade = $('produtoValidade').value;
        const observacao = $('produtoObservacao').value.trim();

        if (!nome || isNaN(quantidade) || quantidade < 0 || !validade) {
            mostrarNotificacao('Preencha corretamente os campos obrigatórios!', 'erro');
            return;
        }

        if (modoEdicaoId) {
            const produto = estoque.find(p => p.id === modoEdicaoId);
            if (!produto) { mostrarNotificacao('Produto não encontrado.', 'erro'); sairModoEdicao(); return; }
            produto.nome = nome;
            produto.quantidade = quantidade;
            produto.quantidadeMinima = quantidadeMinima;
            produto.validade = validade;
            produto.observacao = observacao;
            mostrarNotificacao('Produto atualizado com sucesso!', 'sucesso');
        } else {
            estoque.push({
                id: gerarId(),
                nome, quantidade, quantidadeMinima, validade,
                observacao: observacao || '',
            });
            mostrarNotificacao('Produto cadastrado com sucesso!', 'sucesso');
        }

        salvarDados();
        limparFormCadastro();
        renderizarTudo();
        irParaSecao('estoque');
    }

    function editarProduto(id) {
        const produto = estoque.find(p => p.id === id);
        if (produto) iniciarEdicao(produto);
    }

    function confirmarExclusaoProduto(id) {
        const produto = estoque.find(p => p.id === id);
        if (!produto) return;
        produtoParaExcluir = produto;
        abrirModalConfirmacao('Confirmar Exclusão', `Tem certeza que deseja excluir "${produto.nome}"? Essa ação não pode ser desfeita.`, () => {
            estoque = estoque.filter(p => p.id !== produtoParaExcluir.id);
            salvarDados();
            renderizarTudo();
            mostrarNotificacao('Produto excluído com sucesso!', 'sucesso');
            produtoParaExcluir = null;
        });
    }

    // ============================================================
    // retiradas
    // ============================================================
    function carregarProdutosRetirada() {
        const valorAtual = els.retiradaProdutoSelect.value;
        els.retiradaProdutoSelect.innerHTML = '<option value="">Selecione um produto...</option>';
        estoque.filter(p => p.quantidade > 0).forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = `${p.nome} (${p.quantidade} disponíveis)`;
            els.retiradaProdutoSelect.appendChild(opt);
        });
        if (estoque.some(p => p.id === valorAtual)) els.retiradaProdutoSelect.value = valorAtual;
    }

    function atualizarQuantidadeDisponivel() {
        const produtoId = els.retiradaProdutoSelect.value;
        if (!produtoId) {
            els.retiradaQuantidadeDisponivel.value = '0';
            els.retiradaQuantidadeInput.max = 0;
            produtoSelecionadoRetirada = null;
            return;
        }
        produtoSelecionadoRetirada = estoque.find(p => p.id === produtoId);
        if (produtoSelecionadoRetirada) {
            els.retiradaQuantidadeDisponivel.value = produtoSelecionadoRetirada.quantidade;
            els.retiradaQuantidadeInput.max = produtoSelecionadoRetirada.quantidade;
            els.retiradaQuantidadeInput.value = Math.min(1, produtoSelecionadoRetirada.quantidade);
        }
    }

    function registrarSaida(produto, quantidade, observacao) {
        produto.quantidade -= quantidade;
        historicoRetiradas.unshift({
            id: gerarId(),
            produtoId: produto.id,
            produtoNome: produto.nome,
            quantidade,
            observacao: observacao || 'Sem observação',
            data: new Date().toISOString(),
        });
        salvarDados();
        renderizarTudo();
    }

    function registrarRetirada(e) {
        e.preventDefault();
        const produtoId = els.retiradaProdutoSelect.value;
        const quantidade = parseInt(els.retiradaQuantidadeInput.value, 10);
        const observacao = $('retiradaObservacao').value.trim();

        if (!produtoId) return mostrarNotificacao('Selecione um produto!', 'erro');
        if (isNaN(quantidade) || quantidade <= 0) return mostrarNotificacao('A quantidade deve ser maior que zero!', 'erro');

        const produto = estoque.find(p => p.id === produtoId);
        if (!produto) return mostrarNotificacao('Produto não encontrado!', 'erro');
        if (quantidade > produto.quantidade) return mostrarNotificacao(`Quantidade indisponível! Disponível: ${produto.quantidade}`, 'erro');

        abrirModalConfirmacao('Confirmar Retirada', `Deseja retirar ${quantidade} unidade(s) de "${produto.nome}"?`, () => {
            registrarSaida(produto, quantidade, observacao);
            limparFormRetirada();
            mostrarNotificacao('Retirada registrada com sucesso!', 'sucesso');
        });
    }

    function retiradaRapida(id) {
        const produto = estoque.find(p => p.id === id);
        if (!produto) return;

        abrirModalDeEntrada({
            titulo: 'Retirada Rápida',
            mensagem: `Quantas unidades de "${produto.nome}" deseja retirar? (Disponível: ${produto.quantidade})`,
            valorInicial: 1,
            min: 1,
            max: produto.quantidade,
            onConfirm: (qtd) => {
                registrarSaida(produto, qtd, 'Retirada rápida');
                mostrarNotificacao(`${qtd} unidade(s) retirada(s) com sucesso!`, 'sucesso');
            },
        });
    }

    function carregarRetiradas() {
        const recentes = historicoRetiradas.slice(0, 10);
        const vazio = recentes.length === 0;
        els.emptyHistoryMessage.style.display = vazio ? 'flex' : 'none';

        els.historyList.innerHTML = recentes.map(linhaHistoricoCardHtml).join('');
        els.historicoTableBody.innerHTML = recentes.map(linhaHistoricoTabelaHtml).join('');
    }

    function linhaHistoricoCardHtml(r) {
        const data = new Date(r.data);
        return `<div class="history-row">
            <div class="history-row-left">
                <div class="history-row-product">${escapeHtml(r.produtoNome)}</div>
                <div class="history-row-obs">${escapeHtml(r.observacao)}</div>
            </div>
            <div class="history-row-right">
                <div class="history-row-qty mono">-${r.quantidade}</div>
                <div class="history-row-date">${data.toLocaleDateString('pt-BR')} ${data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
        </div>`;
    }

    function linhaHistoricoTabelaHtml(r) {
        const data = new Date(r.data);
        return `<tr>
            <td class="mono">${data.toLocaleDateString('pt-BR')}<br><small class="text-muted">${data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</small></td>
            <td>${escapeHtml(r.produtoNome)}</td>
            <td class="mono">${r.quantidade}</td>
            <td>${escapeHtml(r.observacao)}</td>
        </tr>`;
    }

    function limparFormRetirada() {
        els.retiradaForm.reset();
        els.retiradaQuantidadeDisponivel.value = '0';
        produtoSelecionadoRetirada = null;
        carregarProdutosRetirada();
    }

    // ============================================================
    // alertas
    // ============================================================
    function atualizarAlertas() {
        const proximos = estoque.filter(p => statusDoProduto(p).includes('alerta'))
            .sort((a, b) => diasRestantes(a.validade) - diasRestantes(b.validade));
        const vencidos = estoque.filter(p => statusDoProduto(p).includes('vencido'))
            .sort((a, b) => diasRestantes(a.validade) - diasRestantes(b.validade));
        const emFalta = estoque.filter(p => statusDoProduto(p).includes('falta'))
            .sort((a, b) => (a.quantidadeMinima - a.quantidade) - (b.quantidadeMinima - b.quantidade))
            .reverse();

        els.alertProximoCount.textContent = proximos.length;
        els.alertVencidoCount.textContent = vencidos.length;
        els.alertFaltaCount.textContent = emFalta.length;

        preencherTabela(els.alertProximoList, els.emptyProximoAlert, null, proximos, p =>
            `${linhaAlertaAcaoHtml(p, 'alerta')}`);
        preencherTabela(els.alertVencidoList, els.emptyVencidoAlert, null, vencidos, p =>
            `${linhaAlertaAcaoHtml(p, 'vencido')}`);

        els.alertFaltaList.innerHTML = emFalta.map(p => {
            const faltam = p.quantidadeMinima - p.quantidade;
            return `<tr>
                <td><strong>${escapeHtml(p.nome)}</strong></td>
                <td class="mono">${p.quantidade}</td>
                <td class="mono">${p.quantidadeMinima}</td>
                <td><span class="status-badge status-falta">${faltam} unid.</span></td>
                <td><button class="btn-quick-action" onclick="StockControl.reporEstoque('${p.id}')"><i class="fas fa-plus"></i> Repor</button></td>
            </tr>`;
        }).join('');
        els.emptyFaltaAlert.style.display = emFalta.length === 0 ? 'flex' : 'none';
    }

    function linhaAlertaAcaoHtml(produto, tipo) {
        const dias = diasRestantes(produto.validade);
        const diasTxt = tipo === 'vencido' ? `${Math.abs(dias)} dia(s)` : `${dias} dia(s)`;
        const acao = tipo === 'vencido'
            ? `<button class="btn-quick-action" onclick="StockControl.descarteVencido('${produto.id}')"><i class="fas fa-trash"></i> Descartar</button>`
            : `<button class="btn-quick-action" onclick="StockControl.retiradaRapida('${produto.id}')"><i class="fas fa-minus"></i> Retirar</button>`;
        return `<tr>
            <td><strong>${escapeHtml(produto.nome)}</strong></td>
            <td class="mono">${produto.quantidade}</td>
            <td class="mono">${formatarDataBR(produto.validade)}</td>
            <td><span class="status-badge status-${tipo}">${diasTxt}</span></td>
            <td>${acao}</td>
        </tr>`;
    }

    function reporEstoque(id) {
        const produto = estoque.find(p => p.id === id);
        if (!produto) return;

        abrirModalDeEntrada({
            titulo: 'Repor Estoque',
            mensagem: `Quantas unidades de "${produto.nome}" deseja adicionar?`,
            valorInicial: Math.max(1, produto.quantidadeMinima - produto.quantidade),
            min: 1,
            onConfirm: (qtd) => {
                produto.quantidade += qtd;
                salvarDados();
                renderizarTudo();
                mostrarNotificacao(`${qtd} unidade(s) adicionada(s) ao estoque!`, 'sucesso');
            },
        });
    }

    function descarteVencido(id) {
        const produto = estoque.find(p => p.id === id);
        if (!produto) return;

        abrirModalConfirmacao('Descartar Produto Vencido', `Deseja descartar ${produto.quantidade} unidade(s) de "${produto.nome}" (VENCIDO)?`, () => {
            historicoRetiradas.unshift({
                id: gerarId(),
                produtoId: produto.id,
                produtoNome: produto.nome,
                quantidade: produto.quantidade,
                observacao: 'DESCARTE — produto vencido',
                data: new Date().toISOString(),
            });
            estoque = estoque.filter(p => p.id !== id);
            salvarDados();
            renderizarTudo();
            mostrarNotificacao('Produto vencido descartado!', 'sucesso');
        });
    }

    function verificarAlertasAutomaticos() {
        const vencidos = estoque.filter(p => statusDoProduto(p).includes('vencido')).length;
        const faltantes = estoque.filter(p => statusDoProduto(p).includes('falta')).length;
        if (vencidos === 0 && faltantes === 0) return;

        let msg;
        if (vencidos > 0 && faltantes > 0) msg = `${vencidos} produto(s) vencido(s) e ${faltantes} em falta.`;
        else if (vencidos > 0) msg = `${vencidos} produto(s) vencido(s).`;
        else msg = `${faltantes} produto(s) em falta.`;

        mostrarNotificacao(msg, 'aviso');
    }

    // ============================================================
    // modal de confirmação genérico
    // ============================================================
    function abrirModalConfirmacao(titulo, mensagem, onConfirm) {
        els.modalTitle.innerHTML = `<i class="fas fa-circle-question"></i> ${escapeHtml(titulo)}`;
        els.modalMessage.textContent = mensagem;
        els.confirmationModal.style.display = 'flex';
        els.modalConfirm.onclick = () => { onConfirm(); fecharModalConfirmacao(); };
    }

    function fecharModalConfirmacao() {
        els.confirmationModal.style.display = 'none';
        els.modalConfirm.onclick = null;
        produtoParaExcluir = null;
    }

    function configurarModalGenerico() {
        els.modalCancel.addEventListener('click', fecharModalConfirmacao);
        els.modalClose.addEventListener('click', fecharModalConfirmacao);

        // modal de entrada numérica — substitui window.prompt(), que é
        // desabilitado em apps instalados como PWA no iOS.
        els.inputModalCancel.addEventListener('click', fecharModalDeEntrada);
        els.inputModalClose.addEventListener('click', fecharModalDeEntrada);
        els.inputModalConfirm.addEventListener('click', confirmarModalDeEntrada);
        els.inputModalField.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); confirmarModalDeEntrada(); } });
    }

    let inputModalCallback = null;
    let inputModalConfig = {};

    function abrirModalDeEntrada({ titulo, mensagem, valorInicial = 1, min = 0, max = null, onConfirm }) {
        inputModalCallback = onConfirm;
        inputModalConfig = { min, max };
        els.inputModalTitle.innerHTML = `<i class="fas fa-keyboard"></i> ${escapeHtml(titulo)}`;
        els.inputModalMessage.textContent = mensagem;
        els.inputModalField.value = valorInicial;
        els.inputModalField.min = min;
        if (max !== null) els.inputModalField.max = max;
        els.inputModalError.classList.remove('show');
        els.inputModal.style.display = 'flex';
        setTimeout(() => els.inputModalField.focus(), 50);
    }

    function fecharModalDeEntrada() {
        els.inputModal.style.display = 'none';
        inputModalCallback = null;
    }

    function confirmarModalDeEntrada() {
        const valor = parseInt(els.inputModalField.value, 10);
        const { min, max } = inputModalConfig;
        if (isNaN(valor) || valor < min || (max !== null && valor > max)) {
            els.inputModalError.textContent = max !== null
                ? `Informe um número entre ${min} e ${max}.`
                : `Informe um número válido (mínimo ${min}).`;
            els.inputModalError.classList.add('show');
            return;
        }
        const cb = inputModalCallback;
        fecharModalDeEntrada();
        if (cb) cb(valor);
    }

    // ============================================================
    // notificação
    // ============================================================
    let notifTimeout = null;
    function mostrarNotificacao(mensagem, tipo = 'sucesso') {
        els.notificationText.textContent = mensagem;
        const cfg = {
            sucesso: { cor: 'var(--ok)', icone: 'fa-check-circle' },
            erro: { cor: 'var(--vencido)', icone: 'fa-exclamation-circle' },
            aviso: { cor: 'var(--alerta)', icone: 'fa-triangle-exclamation' },
        }[tipo] || { cor: 'var(--ok)', icone: 'fa-check-circle' };

        els.notification.style.borderLeftColor = cfg.cor;
        els.notificationIcon.className = `fas ${cfg.icone}`;
        els.notificationIcon.style.color = cfg.cor;
        els.notification.style.display = 'flex';

        clearTimeout(notifTimeout);
        notifTimeout = setTimeout(() => { els.notification.style.display = 'none'; }, 4000);
    }

    // ============================================================
    // eventos gerais
    // ============================================================
    function configurarEventos() {
        els.btnAddProduct.addEventListener('click', () => { limparFormCadastro(); irParaSecao('cadastro'); });
        els.btnEmptyAdd.addEventListener('click', () => { limparFormCadastro(); irParaSecao('cadastro'); });

        els.cadastroForm.addEventListener('submit', submeterCadastro);
        els.limparFormBtn.addEventListener('click', () => { limparFormCadastro(); irParaSecao('estoque'); });

        els.searchInput.addEventListener('input', filtrarEstoque);

        els.retiradaForm.addEventListener('submit', registrarRetirada);
        els.retiradaProdutoSelect.addEventListener('change', atualizarQuantidadeDisponivel);
        els.cancelarRetiradaBtn.addEventListener('click', limparFormRetirada);

        els.notificationClose.addEventListener('click', () => { els.notification.style.display = 'none'; });
    }

    // ============================================================
    // relatório de pedidos (PDF)
    // ============================================================
    function configurarModalPedidos() {
        els.btnRelatorioPedidos.addEventListener('click', abrirModalPedidos);
        els.pedidosModalClose.addEventListener('click', () => { els.pedidosModal.style.display = 'none'; });
        els.searchProdutosPedido.addEventListener('input', function () { carregarProdutosParaPedido(this.value); });
        els.btnAdicionarManual.addEventListener('click', adicionarProdutoManual);
        els.btnLimparPedido.addEventListener('click', limparPedidoCompleto);
        els.btnGerarPDF.addEventListener('click', gerarRelatorioPDF);

        const hoje = new Date().toISOString().split('T')[0];
        if ($('pedidoData')) $('pedidoData').value = hoje;
    }

    function abrirModalPedidos() {
        els.pedidosModal.style.display = 'flex';
        limparPedidoCompleto();
        carregarProdutosParaPedido();
    }

    function carregarProdutosParaPedido(filtro = '') {
        const lista = filtrarPorBusca(estoque, filtro);
        els.emptyProdutosPedido.style.display = lista.length === 0 ? 'block' : 'none';

        els.produtosListaPedido.innerHTML = lista.map(p => {
            const jaSelecionado = produtosSelecionadosPedido.some(sel => sel.id === p.id);
            return `<div class="produto-item-pedido">
                <div class="produto-info-pedido">
                    <div class="produto-nome-pedido">${escapeHtml(p.nome)}</div>
                    <div class="produto-detalhes-pedido">
                        <span>Disponível: ${p.quantidade}</span>
                        <span>Mínimo: ${p.quantidadeMinima}</span>
                        <span>Val.: ${formatarDataBR(p.validade)}</span>
                    </div>
                </div>
                <div class="produto-qtd-pedido">
                    ${p.observacao ? `<small>${escapeHtml(p.observacao)}</small>` : ''}
                    <button type="button" class="btn-selecionar-pedido" onclick="StockControl.adicionarProdutoPedido('${p.id}')" ${jaSelecionado ? 'disabled' : ''}>
                        ${jaSelecionado ? '<i class="fas fa-check"></i> Selecionado' : '<i class="fas fa-plus"></i> Selecionar'}
                    </button>
                </div>
            </div>`;
        }).join('');
    }

    function adicionarProdutoPedido(produtoId) {
        const produto = estoque.find(p => p.id === produtoId);
        if (!produto) return;
        if (produtosSelecionadosPedido.some(p => p.id === produtoId)) {
            return mostrarNotificacao('Produto já está no pedido!', 'aviso');
        }

        abrirModalDeEntrada({
            titulo: 'Quantidade do pedido',
            mensagem: `Quantidade de "${produto.nome}" para o pedido (disponível: ${produto.quantidade}). Deixe 0 para "A definir".`,
            valorInicial: 1,
            min: 0,
            onConfirm: (qtd) => {
                produtosSelecionadosPedido.push({
                    id: produto.id,
                    nome: produto.nome,
                    quantidade: qtd === 0 ? 'A definir' : qtd,
                    disponivel: produto.quantidade,
                    minimo: produto.quantidadeMinima,
                    validade: produto.validade,
                    observacao: produto.observacao,
                    manual: false,
                });
                atualizarListaPedidosSelecionados();
                carregarProdutosParaPedido(els.searchProdutosPedido.value);
                mostrarNotificacao(`"${produto.nome}" adicionado ao pedido!`, 'sucesso');
            },
        });
    }

    function adicionarProdutoManual() {
        const nomeInput = $('produtoManualNome');
        const quantidadeInput = $('produtoManualQuantidade');
        const nome = nomeInput.value.trim();
        const quantidade = quantidadeInput.value.trim();

        if (!nome) return mostrarNotificacao('Digite o nome do produto!', 'erro');

        produtosSelecionadosPedido.push({
            id: `manual_${manualIdCounter++}`,
            nome,
            quantidade: quantidade || 'A definir',
            disponivel: 0, minimo: 0, validade: null,
            observacao: 'Produto fora do estoque',
            manual: true,
        });

        nomeInput.value = '';
        quantidadeInput.value = '';
        atualizarListaPedidosSelecionados();
        mostrarNotificacao(`"${nome}" adicionado manualmente ao pedido!`, 'sucesso');
    }

    function atualizarListaPedidosSelecionados() {
        const total = produtosSelecionadosPedido.length;
        els.emptyPedidosSelecionados.style.display = total === 0 ? 'block' : 'none';
        els.pedidosSelecionadosCount.textContent = total;

        let totalNumerico = 0, temNumerico = false;
        produtosSelecionadosPedido.forEach(p => {
            const q = parseInt(p.quantidade, 10);
            if (!isNaN(q)) { totalNumerico += q; temNumerico = true; }
        });
        els.pedidosQuantidadeTotal.textContent = temNumerico ? totalNumerico : 'A definir';

        els.pedidosSelecionadosLista.innerHTML = produtosSelecionadosPedido.map((p, index) => {
            const qtdNum = parseInt(p.quantidade, 10);
            const isNum = !isNaN(qtdNum);
            return `<div class="pedido-item-selecionado">
                <div class="pedido-item-header">
                    <strong>${escapeHtml(p.nome)}</strong>
                    <button type="button" class="btn-remover-pedido" onclick="StockControl.removerProdutoPedido(${index})"><i class="fas fa-times"></i> Remover</button>
                </div>
                <div class="pedido-item-detalhes">
                    <div><small>Quantidade</small><strong>${escapeHtml(String(p.quantidade))}</strong>${isNum ? ' unid.' : ''}</div>
                    ${!p.manual ? `<div><small>Disponível</small>${p.disponivel}</div>` : `<div><small>Origem</small>Fora do estoque</div>`}
                </div>
            </div>`;
        }).join('');
    }

    function removerProdutoPedido(index) {
        produtosSelecionadosPedido.splice(index, 1);
        atualizarListaPedidosSelecionados();
        carregarProdutosParaPedido(els.searchProdutosPedido.value);
    }

    function limparPedidoCompleto() {
        produtosSelecionadosPedido = [];
        els.pedidoForm && els.pedidoForm.reset && els.pedidoForm.reset();
        const hoje = new Date().toISOString().split('T')[0];
        if ($('pedidoData')) $('pedidoData').value = hoje;
        atualizarListaPedidosSelecionados();
        carregarProdutosParaPedido();
    }

    function gerarRelatorioPDF() {
        if (!window.jspdf) { console.error('jsPDF não está disponível.'); return; }

        const setor = $('pedidoSetor').value;
        const funcionario = $('pedidoFuncionario').value.trim();
        const dataPedido = $('pedidoData').value || new Date().toISOString().split('T')[0];
        const prioridade = $('pedidoPrioridade').value;
        const observacoes = $('pedidoObservacoes').value.trim();

        if (!setor) return mostrarNotificacao('Selecione o setor!', 'erro');
        if (!funcionario) return mostrarNotificacao('Informe o funcionário responsável!', 'erro');
        if (produtosSelecionadosPedido.length === 0) return mostrarNotificacao('Adicione pelo menos um produto ao pedido!', 'erro');

        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('landscape');
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 15;
            const contentWidth = pageWidth - margin * 2;

            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text('StockControl — Relatório de Pedidos', margin, margin + 8);

            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text('Nº DO PEDIDO:', pageWidth - margin - 80, margin + 4);
            doc.text('DATA EMISSÃO:', pageWidth - margin - 80, margin + 12);
            doc.text('PRIORIDADE:', pageWidth - margin - 80, margin + 20);
            doc.setFont('helvetica', 'normal');
            doc.text(`PED${Date.now().toString().slice(-6)}`, pageWidth - margin - 30, margin + 4);
            doc.text(new Date().toLocaleDateString('pt-BR'), pageWidth - margin - 30, margin + 12);

            const coresPrioridade = { normal: [46, 204, 113], alta: [243, 156, 18], urgente: [231, 76, 60], baixa: [149, 165, 166] };
            const [r, g, b] = coresPrioridade[prioridade] || coresPrioridade.normal;
            doc.setTextColor(r, g, b);
            doc.text(prioridade.toUpperCase(), pageWidth - margin - 30, margin + 20);
            doc.setTextColor(0, 0, 0);

            doc.setDrawColor(200, 200, 200);
            doc.line(margin, margin + 26, pageWidth - margin, margin + 26);

            let yPos = margin + 38;
            doc.setFontSize(11);
            doc.setFont('helvetica', 'normal');
            doc.text(`Setor: ${setor.toUpperCase()}`, margin, yPos);
            doc.text(`Funcionário: ${funcionario}`, margin + 120, yPos);
            doc.text(`Data do Pedido: ${parseDataLocal(dataPedido).toLocaleDateString('pt-BR')}`, margin + 240, yPos);

            if (observacoes) {
                yPos += 14;
                doc.setFont('helvetica', 'bold');
                doc.text('OBSERVAÇÕES:', margin, yPos);
                yPos += 7;
                doc.setFont('helvetica', 'normal');
                const linhas = doc.splitTextToSize(observacoes, contentWidth);
                doc.text(linhas, margin, yPos);
                yPos += linhas.length * 6 + 12;
            } else {
                yPos += 14;
            }

            const colWidths = [90, 70, 55, 60, 55];
            const headers = ['PRODUTO', 'QUANTIDADE', 'ESTOQUE ATUAL', 'VALIDADE', 'OBSERVAÇÃO'];

            function desenharCabecalho(y) {
                doc.setFillColor(30, 34, 40);
                doc.rect(margin, y, contentWidth, 10, 'F');
                doc.setTextColor(255, 255, 255);
                let x = margin + 5;
                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                headers.forEach((h, i) => { doc.text(h, x, y + 7); x += colWidths[i]; });
                doc.setTextColor(0, 0, 0);
                doc.setFont('helvetica', 'normal');
                return y + 10;
            }

            yPos = desenharCabecalho(yPos);

            produtosSelecionadosPedido.forEach((p, index) => {
                if (yPos > pageHeight - 30) {
                    doc.addPage('landscape');
                    yPos = desenharCabecalho(margin + 10);
                }
                if (index % 2 === 0) {
                    doc.setFillColor(245, 245, 245);
                    doc.rect(margin, yPos, contentWidth, 10, 'F');
                }
                let x = margin + 5;
                doc.setFontSize(9);
                doc.text(String(p.nome).slice(0, 40), x, yPos + 7); x += colWidths[0];
                doc.text(String(p.quantidade), x, yPos + 7); x += colWidths[1];
                doc.text(p.manual ? '—' : String(p.disponivel), x, yPos + 7); x += colWidths[2];
                doc.text(p.validade ? formatarDataBR(p.validade) : '—', x, yPos + 7); x += colWidths[3];
                doc.text(String(p.observacao || '').slice(0, 30), x, yPos + 7);
                yPos += 10;
            });

            doc.save(`pedido_${setor}_${dataPedido}.pdf`);
            mostrarNotificacao('Relatório PDF gerado com sucesso!', 'sucesso');
        } catch (err) {
            console.error(err);
            mostrarNotificacao('Erro ao gerar o PDF. Veja o console para detalhes.', 'erro');
        }
    }

    // ============================================================
    // expõe apenas o necessário para os onclick="" inline do HTML gerado
    // ============================================================
    window.StockControl = {
        editarProduto, confirmarExclusaoProduto, retiradaRapida,
        reporEstoque, descarteVencido,
        adicionarProdutoPedido, removerProdutoPedido,
    };
})();
