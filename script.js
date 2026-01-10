// Sistema de Controle de Estoque - Versão 2.0
// Dados iniciais do estoque (simulando um banco de dados)
let estoque = JSON.parse(localStorage.getItem('estoque')) || [
    {
        id: 1,
        nome: "Leite Integral",
        quantidade: 24,
        quantidadeMinima: 10,
        validade: "2024-06-15",
        observacao: "Caixa com 12 unidades"
    },
    {
        id: 2,
        nome: "Arroz 5kg",
        quantidade: 15,
        quantidadeMinima: 8,
        validade: "2025-01-20",
        observacao: "Tipo 1"
    },
    {
        id: 3,
        nome: "Feijão Carioca 1kg",
        quantidade: 32,
        quantidadeMinima: 12,
        validade: "2024-12-10",
        observacao: ""
    },
    {
        id: 4,
        nome: "Sabão em Pó",
        quantidade: 8,
        quantidadeMinima: 5,
        validade: "2026-03-30",
        observacao: "Embalagem 1kg"
    },
    {
        id: 5,
        nome: "Detergente Líquido",
        quantidade: 18,
        quantidadeMinima: 6,
        validade: "2025-08-15",
        observacao: "Limpeza pesada"
    },
    {
        id: 6,
        nome: "Água Mineral 500ml",
        quantidade: 48,
        quantidadeMinima: 20,
        validade: "2024-11-01",
        observacao: "Garrafa plástica"
    },
    {
        id: 7,
        nome: "Café em Pó 500g",
        quantidade: 3,
        quantidadeMinima: 10,
        validade: "2024-07-01",
        observacao: "Produto em falta"
    },
    {
        id: 8,
        nome: "Açúcar Refinado 1kg",
        quantidade: 5,
        quantidadeMinima: 15,
        validade: "2024-04-10",
        observacao: "Vencido - urgente"
    }
];

// Histórico de retiradas
let historicoRetiradas = JSON.parse(localStorage.getItem('historicoRetiradas')) || [];

// Variáveis para pedidos
let produtosSelecionados = [];
let pedidoIdCounter = 1;

// Elementos do DOM
const navItems = document.querySelectorAll('.nav-item');
const contentSections = document.querySelectorAll('.content-section');
const dashboardCards = document.querySelectorAll('.dashboard-card');
const totalEstoqueElement = document.getElementById('totalEstoque');
const proximoVencimentoElement = document.getElementById('proximoVencimento');
const produtosVencidosElement = document.getElementById('produtosVencidos');
const produtosFaltaElement = document.getElementById('produtosFalta');
const currentDateElement = document.getElementById('currentDate');
const estoqueTableBody = document.getElementById('estoqueTableBody');
const emptyStockMessage = document.getElementById('emptyStockMessage');
const searchInput = document.getElementById('searchInput');
const btnAddProduct = document.getElementById('btnAddProduct');
const btnEmptyAdd = document.getElementById('btnEmptyAdd');
const cadastroForm = document.getElementById('cadastroForm');
const limparFormBtn = document.getElementById('limparForm');
const retiradaForm = document.getElementById('retiradaForm');
const retiradaProdutoSelect = document.getElementById('retiradaProduto');
const retiradaQuantidadeInput = document.getElementById('retiradaQuantidade');
const retiradaQuantidadeDisponivel = document.getElementById('retiradaQuantidadeDisponivel');
const cancelarRetiradaBtn = document.getElementById('cancelarRetirada');
const historicoTableBody = document.getElementById('historicoTableBody');
const emptyHistoryMessage = document.getElementById('emptyHistoryMessage');
const proximoTableBody = document.getElementById('proximoTableBody');
const emptyProximoTable = document.getElementById('emptyProximoTable');
const proximoCount = document.getElementById('proximoCount');
const vencidoTableBody = document.getElementById('vencidoTableBody');
const emptyVencidoTable = document.getElementById('emptyVencidoTable');
const vencidoCount = document.getElementById('vencidoCount');
const alertProximoCount = document.getElementById('alertProximoCount');
const alertProximoList = document.getElementById('alertProximoList');
const emptyProximoAlert = document.getElementById('emptyProximoAlert');
const alertVencidoCount = document.getElementById('alertVencidoCount');
const alertVencidoList = document.getElementById('alertVencidoList');
const emptyVencidoAlert = document.getElementById('emptyVencidoAlert');
const alertFaltaCount = document.getElementById('alertFaltaCount');
const alertFaltaList = document.getElementById('alertFaltaList');
const emptyFaltaAlert = document.getElementById('emptyFaltaAlert');
const totalAlertasElement = document.getElementById('totalAlertas');
const confirmationModal = document.getElementById('confirmationModal');
const modalTitle = document.getElementById('modalTitle');
const modalMessage = document.getElementById('modalMessage');
const modalConfirm = document.getElementById('modalConfirm');
const modalCancel = document.getElementById('modalCancel');
const modalClose = document.getElementById('modalClose');
const notification = document.getElementById('notification');
const notificationText = document.getElementById('notificationText');
const notificationIcon = document.getElementById('notificationIcon');
const notificationClose = document.getElementById('notificationClose');

// Elementos do modal de pedidos
const btnRelatorioPedidos = document.getElementById('btnRelatorioPedidos');
const pedidosModal = document.getElementById('pedidosModal');
const pedidosModalClose = document.getElementById('pedidosModalClose');
const pedidoForm = document.getElementById('pedidoForm');
const produtosListaPedido = document.getElementById('produtosListaPedido');
const searchProdutosPedido = document.getElementById('searchProdutosPedido');
const pedidosSelecionadosLista = document.getElementById('pedidosSelecionadosLista');
const emptyProdutosPedido = document.getElementById('emptyProdutosPedido');
const emptyPedidosSelecionados = document.getElementById('emptyPedidosSelecionados');
const pedidosSelecionadosCount = document.getElementById('pedidosSelecionadosCount');
const pedidosQuantidadeTotal = document.getElementById('pedidosQuantidadeTotal');
const btnAdicionarManual = document.getElementById('btnAdicionarManual');
const btnLimparPedido = document.getElementById('btnLimparPedido');
const btnGerarPDF = document.getElementById('btnGerarPDF');

// Variáveis globais
let produtoSelecionadoRetirada = null;
let produtoParaExcluir = null;
let produtoParaRetiradaRapida = null;

// Inicialização da aplicação
document.addEventListener('DOMContentLoaded', function() {
    inicializarApp();
});

// Função de inicialização
function inicializarApp() {
    // Configurar data atual
    atualizarDataAtual();
    
    // Configurar data de validade padrão para 30 dias a partir de hoje
    const dataPadrao = new Date();
    dataPadrao.setDate(dataPadrao.getDate() + 30);
    document.getElementById('produtoValidade').valueAsDate = dataPadrao;
    
    // Configurar navegação
    configurarNavegacao();
    
    // Configurar cards interativos
    configurarCardsInterativos();
    
    // Carregar dados iniciais
    atualizarDashboard();
    carregarEstoque();
    carregarRetiradas();
    atualizarAlertas();
    atualizarTabelasAlertasDashboard();
    
    // Configurar eventos
    configurarEventos();
    
    // Configurar modal de pedidos
    configurarModalPedidos();
    
    // Verificar alertas automaticamente
    setTimeout(verificarAlertasAutomaticos, 500);
}

// Configurar modal de pedidos
function configurarModalPedidos() {
    // Abrir modal de pedidos
    if (btnRelatorioPedidos) {
        btnRelatorioPedidos.addEventListener('click', abrirModalPedidos);
    }
    
    // Fechar modal de pedidos
    if (pedidosModalClose) {
        pedidosModalClose.addEventListener('click', () => {
            pedidosModal.style.display = 'none';
        });
    }
    
    // Buscar produtos no modal de pedidos
    if (searchProdutosPedido) {
        searchProdutosPedido.addEventListener('input', function() {
            carregarProdutosParaPedido(this.value);
        });
    }
    
    // Adicionar produto manualmente
    if (btnAdicionarManual) {
        btnAdicionarManual.addEventListener('click', adicionarProdutoManual);
    }
    
    // Limpar pedido
    if (btnLimparPedido) {
        btnLimparPedido.addEventListener('click', limparPedidoCompleto);
    }
    
    // Gerar PDF
    if (btnGerarPDF) {
        btnGerarPDF.addEventListener('click', gerarRelatorioPDF);
    }
    
    // Configurar data atual no formulário de pedido
    const hoje = new Date();
    const dataFormatada = hoje.toISOString().split('T')[0];
    if (document.getElementById('pedidoData')) {
        document.getElementById('pedidoData').value = dataFormatada;
    }
}

// Abrir modal de pedidos
function abrirModalPedidos() {
    pedidosModal.style.display = 'flex';
    carregarProdutosParaPedido();
    limparPedidoCompleto();
}

// Carregar produtos para seleção no pedido
function carregarProdutosParaPedido(filtro = '') {
    if (!produtosListaPedido) return;
    
    produtosListaPedido.innerHTML = '';
    
    // Filtrar produtos se houver um termo de busca
    let produtosFiltrados = estoque;
    if (filtro) {
        const termo = filtro.toLowerCase();
        produtosFiltrados = estoque.filter(produto => 
            produto.nome.toLowerCase().includes(termo)
        );
    }
    
    if (produtosFiltrados.length === 0) {
        if (emptyProdutosPedido) emptyProdutosPedido.style.display = 'block';
        return;
    }
    
    if (emptyProdutosPedido) emptyProdutosPedido.style.display = 'none';
    
    // Adicionar cada produto à lista
    produtosFiltrados.forEach(produto => {
        const div = document.createElement('div');
        div.className = 'produto-item-pedido';
        
        // Verificar se o produto já está selecionado
        const jaSelecionado = produtosSelecionados.find(p => p.id === produto.id);
        
        div.innerHTML = `
            <div class="produto-info-pedido">
                <div class="produto-nome-pedido">${produto.nome}</div>
                <div class="produto-detalhes-pedido">
                    <span>Disponível: ${produto.quantidade}</span>
                    <span>Mínimo: ${produto.quantidadeMinima}</span>
                    <span>Validade: ${new Date(produto.validade).toLocaleDateString('pt-BR')}</span>
                </div>
            </div>
            <div class="produto-qtd-pedido">
                ${produto.observacao ? `<small>${produto.observacao}</small>` : ''}
                <button type="button" class="btn-selecionar-pedido" onclick="adicionarProdutoPedido(${produto.id})" ${jaSelecionado ? 'disabled style="opacity: 0.5;"' : ''}>
                    ${jaSelecionado ? '<i class="fas fa-check"></i> Selecionado' : '<i class="fas fa-plus"></i> Selecionar'}
                </button>
            </div>
        `;
        
        produtosListaPedido.appendChild(div);
    });
}

// Procure pela função adicionarProdutoPedido e atualize-a:
function adicionarProdutoPedido(produtoId) {
    const produto = estoque.find(p => p.id === produtoId);
    
    if (!produto) return;
    
    // Verificar se já está selecionado
    if (produtosSelecionados.find(p => p.id === produtoId)) {
        mostrarNotificacao('Produto já está no pedido!', 'aviso');
        return;
    }
    
    // ALTERAÇÃO: Quantidade agora é opcional e aceita texto
    const quantidade = prompt(`Quantidade de "${produto.nome}" para o pedido? (Deixe em branco para "A definir" ou digite texto livre)\nDisponível: ${produto.quantidade}`, "A definir");
    
    // Se cancelar ou não preencher, usar "A definir"
    if (quantidade === null || quantidade.trim() === "") {
        mostrarNotificacao('Produto adicionado com quantidade "A definir"!', 'sucesso');
        qtd = "A definir";
    } else {
        qtd = quantidade.trim(); // Pode ser número ou texto
    }
    
    // Adicionar ao array de produtos selecionados
    produtosSelecionados.push({
        id: produto.id,
        nome: produto.nome,
        quantidade: qtd, // AGORA PODE SER TEXTO OU NÚMERO
        disponivel: produto.quantidade,
        minimo: produto.quantidadeMinima,
        validade: produto.validade,
        observacao: produto.observacao,
        manual: false
    });
    
    // Atualizar interface
    atualizarListaPedidosSelecionados();
    carregarProdutosParaPedido(searchProdutosPedido ? searchProdutosPedido.value : '');
    
    mostrarNotificacao(`Produto "${produto.nome}" adicionado ao pedido!`, 'sucesso');
}

// Adicionar produto manualmente (fora do estoque)
function adicionarProdutoManual() {
    const nomeInput = document.getElementById('produtoManualNome');
    const quantidadeInput = document.getElementById('produtoManualQuantidade');
    
    if (!nomeInput || !quantidadeInput) return;
    
    const nome = nomeInput.value.trim();
    const quantidade = quantidadeInput.value.trim(); // ALTERAÇÃO: Agora é texto
    
    if (!nome) {
        mostrarNotificacao('Digite o nome do produto!', 'erro');
        return;
    }
    
    // ALTERAÇÃO: Removida validação numérica, aceita qualquer texto
    
    // Se vazio, usar "A definir"
    const qtd = quantidade || "A definir";
    
    // Adicionar ao array de produtos selecionados
    produtosSelecionados.push({
        id: `manual_${pedidoIdCounter++}`,
        nome: nome,
        quantidade: qtd, // AGORA É TEXTO
        disponivel: 0,
        minimo: 0,
        validade: null,
        observacao: 'Produto fora do estoque',
        manual: true
    });
    
    // Limpar campos
    nomeInput.value = '';
    quantidadeInput.value = '';
    
    // Atualizar interface
    atualizarListaPedidosSelecionados();
    
    mostrarNotificacao(`Produto "${nome}" adicionado manualmente ao pedido!`, 'sucesso');
}

// Atualizar lista de produtos selecionados
// Atualizar lista de produtos selecionados
function atualizarListaPedidosSelecionados() {
    if (!pedidosSelecionadosLista) return;
    
    pedidosSelecionadosLista.innerHTML = '';
    
    if (produtosSelecionados.length === 0) {
        if (emptyPedidosSelecionados) emptyPedidosSelecionados.style.display = 'block';
        if (pedidosSelecionadosCount) pedidosSelecionadosCount.textContent = '0';
        if (pedidosQuantidadeTotal) pedidosQuantidadeTotal.textContent = '0';
        return;
    }
    
    if (emptyPedidosSelecionados) emptyPedidosSelecionados.style.display = 'none';
    
    // Calcular totais - CORREÇÃO: Calcular apenas valores numéricos
    const totalItens = produtosSelecionados.length;
    let totalQuantidadeNumerica = 0;
    let itensComQuantidadeNumerica = 0;
    
    produtosSelecionados.forEach(produto => {
        const qtd = parseInt(produto.quantidade);
        if (!isNaN(qtd)) {
            totalQuantidadeNumerica += qtd;
            itensComQuantidadeNumerica++;
        }
    });
    
    if (pedidosSelecionadosCount) pedidosSelecionadosCount.textContent = totalItens;
    
    // Mostrar quantidade total apenas se houver valores numéricos
    if (pedidosQuantidadeTotal) {
        if (itensComQuantidadeNumerica > 0) {
            pedidosQuantidadeTotal.textContent = totalQuantidadeNumerica;
        } else {
            pedidosQuantidadeTotal.textContent = 'A definir';
        }
    }
    
    // Adicionar cada produto selecionado
    produtosSelecionados.forEach((produto, index) => {
        const div = document.createElement('div');
        div.className = 'pedido-item-selecionado';
        
        // Verificar se a quantidade é numérica
        const qtdNum = parseInt(produto.quantidade);
        const isQuantidadeNumerica = !isNaN(qtdNum);
        
        div.innerHTML = `
            <div class="pedido-item-header">
                <strong>${produto.nome}</strong>
                <button type="button" class="btn-remover-pedido" onclick="removerProdutoPedido(${index})">
                    <i class="fas fa-times"></i> Remover
                </button>
            </div>
            <div class="pedido-item-detalhes">
                <div>
                    <small>Quantidade:</small>
                    <span><strong>${produto.quantidade}</strong> ${isQuantidadeNumerica ? 'unidade(s)' : ''}</span>
                </div>
                <div>
                    <small>Disponível no estoque:</small>
                    <span>${produto.manual ? 'N/A (fora do estoque)' : produto.disponivel}</span>
                </div>
                ${!produto.manual ? `
                <div>
                    <small>Quantidade mínima:</small>
                    <span>${produto.minimo}</span>
                </div>
                <div>
                    <small>Validade:</small>
                    <span>${new Date(produto.validade).toLocaleDateString('pt-BR')}</span>
                </div>
                ` : ''}
            </div>
            ${produto.observacao && produto.observacao !== 'Produto fora do estoque' ? `
            <div style="margin-top: 0.5rem; font-size: 0.85rem; color: var(--gray);">
                <small>Observação:</small> ${produto.observacao}
            </div>
            ` : ''}
        `;
        
        pedidosSelecionadosLista.appendChild(div);
    });
}

// Remover produto do pedido
function removerProdutoPedido(index) {
    produtosSelecionados.splice(index, 1);
    atualizarListaPedidosSelecionados();
    if (searchProdutosPedido) {
        carregarProdutosParaPedido(searchProdutosPedido.value);
    }
}

// Limpar pedido completo
function limparPedidoCompleto() {
    produtosSelecionados = [];
    atualizarListaPedidosSelecionados();
    
    if (pedidoForm) {
        pedidoForm.reset();
        
        // Configurar data atual
        const hoje = new Date();
        const dataFormatada = hoje.toISOString().split('T')[0];
        document.getElementById('pedidoData').value = dataFormatada;
    }
    
    // Carregar produtos novamente
    carregarProdutosParaPedido();
    
    mostrarNotificacao('Pedido limpo com sucesso!', 'sucesso');
}

// Gerar relatório PDF - VERSÃO MELHORADA
function gerarRelatorioPDF() {
    // Verificar se jsPDF está disponível
    if (typeof jspdf === 'undefined') {
        mostrarNotificacao('Biblioteca PDF não carregada. Certifique-se de que a biblioteca jspdf está incluída no seu HTML.', 'erro');
        console.error('jspdf não está disponível.');
        return;
    }
    
    const setor = document.getElementById('pedidoSetor') ? document.getElementById('pedidoSetor').value : '';
    const funcionario = document.getElementById('pedidoFuncionario') ? document.getElementById('pedidoFuncionario').value.trim() : '';
    const dataPedido = document.getElementById('pedidoData') ? document.getElementById('pedidoData').value : new Date().toISOString().split('T')[0];
    const prioridade = document.getElementById('pedidoPrioridade') ? document.getElementById('pedidoPrioridade').value : 'normal';
    const observacoes = document.getElementById('pedidoObservacoes') ? document.getElementById('pedidoObservacoes').value.trim() : '';
    
    // Validações
    if (!setor) {
        mostrarNotificacao('Selecione o setor!', 'erro');
        return;
    }
    
    if (!funcionario) {
        mostrarNotificacao('Informe o funcionário responsável!', 'erro');
        return;
    }
    
    if (produtosSelecionados.length === 0) {
        mostrarNotificacao('Adicione pelo menos um produto ao pedido!', 'erro');
        return;
    }
    
    try {
        // Criar PDF em paisagem
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('landscape');
        
        // Configurações da página em paisagem
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 15;
        const contentWidth = pageWidth - (margin * 2);
        
        // Cabeçalho com logo e informações da empresa
        try {
            // Tenta carregar a imagem logoPC.png
            const logoWidth = 35;
            const logoHeight = 35;
            doc.addImage('logoPC.png', 'PNG', margin, margin, logoWidth, logoHeight);
            
            // Informações da empresa ao lado da logo
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text('StockControl System', margin + logoWidth + 10, margin + 10);
            
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text('Sistema de Controle de Estoque', margin + logoWidth + 10, margin + 18);
            doc.text('Relatório de Pedidos', margin + logoWidth + 10, margin + 25);
        } catch (error) {
            // Se a imagem não existir, usa apenas texto
            console.log('Logo não encontrada, usando texto apenas');
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text('📦 StockControl System', margin, margin + 10);
            
            doc.setFontSize(11);
            doc.setFont('helvetica', 'normal');
            doc.text('Sistema de Controle de Estoque - Relatório de Pedidos', margin, margin + 18);
        }
        
        // Informações do pedido à direita
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Nº DO PEDIDO:', pageWidth - margin - 80, margin + 10);
        doc.text('DATA EMISSÃO:', pageWidth - margin - 80, margin + 18);
        doc.text('PRIORIDADE:', pageWidth - margin - 80, margin + 26);
        
        doc.setFont('helvetica', 'normal');
        doc.text(`PED${Date.now().toString().slice(-6)}`, pageWidth - margin - 30, margin + 10);
        doc.text(new Date().toLocaleDateString('pt-BR'), pageWidth - margin - 30, margin + 18);
        
        // Cor da prioridade
        const prioridadeUpper = prioridade.toUpperCase();
        let prioridadeColor = '#2ecc71'; // verde para normal
        if (prioridade === 'alta') prioridadeColor = '#f39c12'; // laranja
        if (prioridade === 'urgente') prioridadeColor = '#e74c3c'; // vermelho
        if (prioridade === 'baixa') prioridadeColor = '#95a5a6'; // cinza
        
        doc.setTextColor(prioridadeColor);
        doc.text(prioridadeUpper, pageWidth - margin - 30, margin + 26);
        doc.setTextColor(0, 0, 0);
        
        // Linha divisória
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, margin + 35, pageWidth - margin, margin + 35);
        
        // Informações do solicitante
        let yPos = margin + 50;
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('INFORMAÇÕES DO SOLICITANTE', margin, yPos);
        
        yPos += 8;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        
        // Informações em colunas
        doc.text(`Setor: ${setor.toUpperCase()}`, margin, yPos);
        doc.text(`Funcionário: ${funcionario}`, margin + 120, yPos);
        doc.text(`Data do Pedido: ${new Date(dataPedido).toLocaleDateString('pt-BR')}`, margin + 240, yPos);
        
        yPos += 7;
        
        // Observações em uma área destacada
        if (observacoes) {
            yPos += 10;
            doc.setFont('helvetica', 'bold');
            doc.text('OBSERVAÇÕES:', margin, yPos);
            yPos += 7;
            
            doc.setFont('helvetica', 'normal');
            const observacoesLines = doc.splitTextToSize(observacoes, contentWidth);
            doc.text(observacoesLines, margin, yPos);
            yPos += observacoesLines.length * 6 + 15;
        } else {
            yPos += 15;
        }
        
        // Tabela de produtos - cabeçalho
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('PRODUTOS SOLICITADOS', margin, yPos);
        
        yPos += 8;
        
        // Cabeçalho da tabela com fundo colorido
        doc.setFillColor(67, 97, 238); // Azul
        doc.setDrawColor(67, 97, 238);
        doc.rect(margin, yPos, contentWidth, 10, 'F');
        doc.setTextColor(255, 255, 255);
        
        // Colunas da tabela ajustadas para paisagem
        const colWidths = [90, 80, 50, 60, 50, 50, 40];
        let currentX = margin + 5;
        
        doc.setFontSize(9);
        doc.text('PRODUTO', currentX, yPos + 7);
        currentX += colWidths[0];
        
        doc.text('QUANTIDADE', currentX, yPos + 7);
        currentX += colWidths[1];
        
        doc.text('ESTOQUE ATUAL', currentX, yPos + 7);
        currentX += colWidths[2];
        
        doc.text('MÍNIMO', currentX, yPos + 7);
        currentX += colWidths[3];
        
        doc.text('VALIDADE', currentX, yPos + 7);
        currentX += colWidths[4];
        
        doc.text('DISPONÍVEL', currentX, yPos + 7);
        currentX += colWidths[5];
        
        doc.text('STATUS', currentX, yPos + 7);
        
        yPos += 10;
        doc.setTextColor(0, 0, 0);
        
        // Dados dos produtos
        let totalQuantidadeNumerica = 0;
        let itensComQuantidadeNumerica = 0;
        
        produtosSelecionados.forEach((produto, index) => {
            // Verificar se precisa de nova página
            if (yPos > pageHeight - 40) {
                doc.addPage('landscape');
                yPos = margin + 20;
                
                // Cabeçalho da tabela na nova página
                doc.setFillColor(67, 97, 238);
                doc.setDrawColor(67, 97, 238);
                doc.rect(margin, yPos, contentWidth, 10, 'F');
                doc.setTextColor(255, 255, 255);
                
                currentX = margin + 5;
                doc.setFontSize(9);
                doc.text('PRODUTO', currentX, yPos + 7);
                currentX += colWidths[0];
                doc.text('QUANTIDADE', currentX, yPos + 7);
                currentX += colWidths[1];
                doc.text('ESTOQUE ATUAL', currentX, yPos + 7);
                currentX += colWidths[2];
                doc.text('MÍNIMO', currentX, yPos + 7);
                currentX += colWidths[3];
                doc.text('VALIDADE', currentX, yPos + 7);
                currentX += colWidths[4];
                doc.text('DISPONÍVEL', currentX, yPos + 7);
                currentX += colWidths[5];
                doc.text('STATUS', currentX, yPos + 7);
                
                yPos += 10;
                doc.setTextColor(0, 0, 0);
            }
            
            // Alternar cores das linhas para melhor legibilidade
            if (index % 2 === 0) {
                doc.setFillColor(245, 245, 245);
                doc.rect(margin, yPos, contentWidth, 10, 'F');
            }
            
            doc.setFontSize(8);
            
            // Coluna 1: Produto
            currentX = margin + 5;
            const nomeProduto = produto.nome.length > 30 ? produto.nome.substring(0, 30) + '...' : produto.nome;
            doc.text(nomeProduto, currentX, yPos + 7);
            currentX += colWidths[0];
            
            // Coluna 2: Quantidade
            const qtdTexto = String(produto.quantidade);
            doc.text(qtdTexto, currentX, yPos + 7);
            
            // Calcular total numérico se for número
            const qtdNumerica = parseInt(produto.quantidade);
            if (!isNaN(qtdNumerica)) {
                totalQuantidadeNumerica += qtdNumerica;
                itensComQuantidadeNumerica++;
            }
            
            currentX += colWidths[1];
            
            // Coluna 3: Estoque Atual
            doc.text(produto.manual ? 'N/A' : String(produto.disponivel), currentX, yPos + 7);
            currentX += colWidths[2];
            
            // Coluna 4: Mínimo
            doc.text(produto.manual ? 'N/A' : String(produto.minimo), currentX, yPos + 7);
            currentX += colWidths[3];
            
            // Coluna 5: Validade
            if (produto.manual || !produto.validade) {
                doc.text('N/A', currentX, yPos + 7);
            } else {
                doc.text(new Date(produto.validade).toLocaleDateString('pt-BR'), currentX, yPos + 7);
            }
            currentX += colWidths[4];
            
            // Coluna 6: Disponível
            if (produto.manual) {
                doc.text('FORA ESTOQUE', currentX, yPos + 7);
            } else {
                const disponivelTexto = produto.disponivel >= produto.minimo ? 'SUFICIENTE' : 'INSUFICIENTE';
                doc.text(disponivelTexto, currentX, yPos + 7);
            }
            currentX += colWidths[5];
            
            // Coluna 7: Status
            let situacao = 'OK';
            let situacaoColor = '#2ecc71'; // verde padrão
            
            if (produto.manual) {
                situacao = 'MANUAL';
                situacaoColor = '#95a5a6'; // cinza
            } else {
                // Verificar se quantidade é numérica para comparação
                if (!isNaN(qtdNumerica)) {
                    if (qtdNumerica > produto.disponivel) {
                        situacao = 'INSUFICIENTE';
                        situacaoColor = '#e74c3c'; // vermelho
                    } else if (produto.disponivel < produto.minimo) {
                        situacao = 'ESTOQUE BAIXO';
                        situacaoColor = '#f39c12'; // laranja
                    } else if (qtdNumerica <= 0) {
                        situacao = 'A DEFINIR';
                        situacaoColor = '#3498db'; // azul
                    }
                } else {
                    // Se quantidade não é numérica (ex: "A definir")
                    situacao = 'A DEFINIR';
                    situacaoColor = '#3498db'; // azul
                }
            }
            
            doc.setTextColor(situacaoColor);
            doc.text(situacao, currentX, yPos + 7);
            doc.setTextColor(0, 0, 0);
            
            yPos += 10;
        });
        
        yPos += 10;
        
        // Resumo do pedido
        doc.setFillColor(240, 240, 240);
        doc.setDrawColor(200, 200, 200);
        doc.rect(margin, yPos, contentWidth, 25, 'FD'); // FD = Fill and Draw
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('RESUMO DO PEDIDO', margin + 10, yPos + 8);
        
        doc.setFont('helvetica', 'normal');
        doc.text(`Total de Itens: ${produtosSelecionados.length}`, margin + 10, yPos + 18);
        
        // Quantidade total apenas se houver valores numéricos
        if (itensComQuantidadeNumerica > 0) {
            doc.text(`Quantidade Total: ${totalQuantidadeNumerica}`, margin + 120, yPos + 18);
        } else {
            doc.text(`Quantidade Total: A DEFINIR`, margin + 120, yPos + 18);
        }
        
        // Prioridade destacada
        doc.setTextColor(prioridadeColor);
        doc.text(`Prioridade: ${prioridadeUpper}`, margin + 240, yPos + 18);
        doc.setTextColor(0, 0, 0);
        
        yPos += 35;
        
        // Assinaturas em duas colunas
        const assinaturaWidth = (contentWidth - 20) / 2;
        
        // Solicitante
        doc.setDrawColor(150, 150, 150);
        doc.line(margin, yPos + 15, margin + assinaturaWidth, yPos + 15);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text('Solicitante', margin + (assinaturaWidth / 2) - 15, yPos + 25, { align: 'center' });
        doc.text(funcionario, margin + (assinaturaWidth / 2) - 15, yPos + 30, { align: 'center' });
        
        // Responsável pelo estoque
        doc.line(margin + assinaturaWidth + 20, yPos + 15, margin + contentWidth, yPos + 15);
        doc.text('Responsável Estoque', margin + assinaturaWidth + 20 + (assinaturaWidth / 2) - 25, yPos + 25, { align: 'center' });
        doc.text('____________________', margin + assinaturaWidth + 20 + (assinaturaWidth / 2) - 25, yPos + 30, { align: 'center' });
        
        // Rodapé
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text('StockControl System - Sistema de Controle de Estoque | Relatório gerado automaticamente', 
                pageWidth / 2, pageHeight - margin, { align: 'center' });
        doc.text(`Página 1 de 1 | Emitido em: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`, 
                pageWidth / 2, pageHeight - margin + 5, { align: 'center' });
        
        // Salvar PDF
        const nomeArquivo = `Pedido_${setor}_${funcionario.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
        doc.save(nomeArquivo);
        
        // Mostrar notificação de sucesso
        mostrarNotificacao('Relatório PDF gerado com sucesso!', 'sucesso');
        
        // Fechar modal
        pedidosModal.style.display = 'none';
        
        // Limpar pedido
        limparPedidoCompleto();
        
    } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        mostrarNotificacao('Erro ao gerar PDF. Verifique se a biblioteca jsPDF está corretamente carregada.', 'erro');
    }
}

// Atualizar data atual no cabeçalho
function atualizarDataAtual() {
    const agora = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    const dataFormatada = agora.toLocaleDateString('pt-BR', options);
    currentDateElement.textContent = dataFormatada;
}

// Configurar navegação entre seções
function configurarNavegacao() {
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const sectionId = this.getAttribute('data-section');
            
            // Atualizar item ativo
            navItems.forEach(item => item.classList.remove('active'));
            this.classList.add('active');
            
            // Mostrar seção correspondente
            contentSections.forEach(section => {
                section.classList.remove('active');
                if (section.id === sectionId) {
                    section.classList.add('active');
                    
                    // Atualizar dados específicos da seção
                    if (sectionId === 'estoque') {
                        carregarEstoque();
                    } else if (sectionId === 'retiradas') {
                        carregarProdutosRetirada();
                    } else if (sectionId === 'alertas') {
                        atualizarAlertas();
                    } else if (sectionId === 'dashboard') {
                        atualizarDashboard();
                        atualizarTabelasAlertasDashboard();
                    }
                }
            });
        });
    });
}

// Configurar cards interativos do dashboard
function configurarCardsInterativos() {
    dashboardCards.forEach(card => {
        card.addEventListener('click', function() {
            const sectionId = this.getAttribute('data-section');
            
            // Atualizar item ativo no menu
            navItems.forEach(item => item.classList.remove('active'));
            document.querySelector(`[data-section="${sectionId}"]`).classList.add('active');
            
            // Mostrar seção correspondente
            contentSections.forEach(section => {
                section.classList.remove('active');
                if (section.id === sectionId) {
                    section.classList.add('active');
                    
                    // Atualizar dados específicos da seção
                    if (sectionId === 'estoque') {
                        carregarEstoque();
                    } else if (sectionId === 'alertas') {
                        atualizarAlertas();
                    }
                }
            });
        });
    });
}

// Configurar eventos do sistema
function configurarEventos() {
    // Botões de adicionar produto
    btnAddProduct.addEventListener('click', function() {
        document.querySelector('[data-section="cadastro"]').click();
    });
    
    btnEmptyAdd.addEventListener('click', function() {
        document.querySelector('[data-section="cadastro"]').click();
    });
    
    // Formulário de cadastro
    cadastroForm.addEventListener('submit', cadastrarProduto);
    limparFormBtn.addEventListener('click', function() {
        limparFormCadastro();
        document.querySelector('[data-section="estoque"]').click();
    });
    
    // Busca de produtos no estoque
    searchInput.addEventListener('input', filtrarEstoque);
    
    // Formulário de retirada
    retiradaForm.addEventListener('submit', registrarRetirada);
    retiradaProdutoSelect.addEventListener('change', atualizarQuantidadeDisponivel);
    cancelarRetiradaBtn.addEventListener('click', limparFormRetirada);
    
    // Modal de confirmação
    modalCancel.addEventListener('click', fecharModal);
    modalClose.addEventListener('click', fecharModal);
    
    // Notificação
    notificationClose.addEventListener('click', function() {
        notification.style.display = 'none';
    });
}

// Atualizar dashboard com totais
function atualizarDashboard() {
    const totalQuantidade = estoque.reduce((total, produto) => total + produto.quantidade, 0);
    
    // Calcular produtos próximos ao vencimento (30 dias)
    const hoje = new Date();
    const trintaDiasFrente = new Date();
    trintaDiasFrente.setDate(hoje.getDate() + 30);
    
    const produtosProximoVencimento = estoque.filter(produto => {
        const dataValidade = new Date(produto.validade);
        return dataValidade > hoje && dataValidade <= trintaDiasFrente;
    }).length;
    
    // Calcular produtos vencidos
    const produtosVencidos = estoque.filter(produto => {
        const dataValidade = new Date(produto.validade);
        return dataValidade < hoje;
    }).length;
    
    // Calcular produtos em falta (abaixo da quantidade mínima)
    const produtosEmFalta = estoque.filter(produto => produto.quantidade < produto.quantidadeMinima).length;
    
    // Atualizar elementos do dashboard
    totalEstoqueElement.textContent = totalQuantidade;
    proximoVencimentoElement.textContent = produtosProximoVencimento;
    produtosVencidosElement.textContent = produtosVencidos;
    produtosFaltaElement.textContent = produtosEmFalta;
}

// Atualizar tabelas de alertas no dashboard
function atualizarTabelasAlertasDashboard() {
    const hoje = new Date();
    const trintaDiasFrente = new Date();
    trintaDiasFrente.setDate(hoje.getDate() + 30);
    
    // Produtos próximos do vencimento
    const produtosProximoVencimento = estoque.filter(produto => {
        const dataValidade = new Date(produto.validade);
        return dataValidade > hoje && dataValidade <= trintaDiasFrente;
    });
    
    // Produtos vencidos
    const produtosVencidos = estoque.filter(produto => {
        const dataValidade = new Date(produto.validade);
        return dataValidade < hoje;
    });
    
    // Atualizar tabela de próximos do vencimento
    proximoTableBody.innerHTML = '';
    if (produtosProximoVencimento.length === 0) {
        emptyProximoTable.style.display = 'block';
        proximoCount.textContent = '0';
    } else {
        emptyProximoTable.style.display = 'none';
        proximoCount.textContent = produtosProximoVencimento.length.toString();
        
        // Ordenar por data de validade
        produtosProximoVencimento.sort((a, b) => new Date(a.validade) - new Date(b.validade));
        
        produtosProximoVencimento.forEach(produto => {
            const tr = document.createElement('tr');
            const dataValidade = new Date(produto.validade);
            const diffTime = dataValidade - hoje;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            tr.innerHTML = `
                <td><strong>${produto.nome}</strong></td>
                <td>${produto.quantidade}</td>
                <td>${dataValidade.toLocaleDateString('pt-BR')}</td>
                <td><span class="status-badge status-alerta">${diffDays} dias</span></td>
            `;
            proximoTableBody.appendChild(tr);
        });
    }
    
    // Atualizar tabela de produtos vencidos
    vencidoTableBody.innerHTML = '';
    if (produtosVencidos.length === 0) {
        emptyVencidoTable.style.display = 'block';
        vencidoCount.textContent = '0';
    } else {
        emptyVencidoTable.style.display = 'none';
        vencidoCount.textContent = produtosVencidos.length.toString();
        
        // Ordenar por data de validade (mais antigos primeiro)
        produtosVencidos.sort((a, b) => new Date(a.validade) - new Date(b.validade));
        
        produtosVencidos.forEach(produto => {
            const tr = document.createElement('tr');
            const dataValidade = new Date(produto.validade);
            const diffTime = hoje - dataValidade;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            tr.innerHTML = `
                <td><strong>${produto.nome}</strong></td>
                <td>${produto.quantidade}</td>
                <td>${dataValidade.toLocaleDateString('pt-BR')}</td>
                <td><span class="status-badge status-vencido">${diffDays} dias</span></td>
            `;
            vencidoTableBody.appendChild(tr);
        });
    }
}

// Carregar produtos na tabela de estoque
function carregarEstoque(filtro = '') {
    estoqueTableBody.innerHTML = '';
    
    // Filtrar produtos se houver um termo de busca
    let produtosFiltrados = estoque;
    if (filtro) {
        const termo = filtro.toLowerCase();
        produtosFiltrados = estoque.filter(produto => 
            produto.nome.toLowerCase().includes(termo)
        );
    }
    
    if (produtosFiltrados.length === 0) {
        emptyStockMessage.style.display = 'flex';
        return;
    }
    
    emptyStockMessage.style.display = 'none';
    
    // Ordenar produtos por proximidade de vencimento
    produtosFiltrados.sort((a, b) => new Date(a.validade) - new Date(b.validade));
    
    // Adicionar cada produto à tabela
    produtosFiltrados.forEach(produto => {
        const tr = document.createElement('tr');
        
        // Determinar status do produto
        const status = determinarStatusProduto(produto);
        const statusText = status === 'ok' ? 'OK' : 
                          status === 'alerta' ? 'Alerta' : 
                          status === 'vencido' ? 'Vencido' : 'Em Falta';
        
        // Formatar data de validade
        const dataValidade = new Date(produto.validade);
        const dataFormatada = dataValidade.toLocaleDateString('pt-BR');
        
        // Dias até a validade
        const hoje = new Date();
        const diffTime = dataValidade - hoje;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        let diasTexto = '';
        
        if (diffDays < 0) {
            diasTexto = `Venceu há ${Math.abs(diffDays)} dia(s)`;
        } else if (diffDays === 0) {
            diasTexto = 'Vence hoje!';
        } else {
            diasTexto = `Vence em ${diffDays} dia(s)`;
        }
        
        tr.innerHTML = `
            <td>
                <div class="product-info">
                    <strong>${produto.nome}</strong>
                    ${produto.observacao ? `<small class="text-muted">${produto.observacao}</small>` : ''}
                </div>
            </td>
            <td>
                <div class="quantity-info">
                    <span class="quantity-value">${produto.quantidade}</span>
                    <small class="text-muted">Mín: ${produto.quantidadeMinima}</small>
                </div>
            </td>
            <td>
                <div class="date-info">
                    <span>${dataFormatada}</span>
                    <small class="text-muted">${diasTexto}</small>
                </div>
            </td>
            <td><span class="status-badge status-${status}">${statusText}</span></td>
            <td class="text-center">
                <div class="action-buttons">
                    <button class="btn-action btn-edit" title="Editar" onclick="editarProduto(${produto.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action btn-delete" title="Excluir" onclick="confirmarExclusaoProduto(${produto.id})">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                    <button class="btn-action btn-quick-retirada" title="Retirar" onclick="retiradaRapida(${produto.id})">
                        <i class="fas fa-minus"></i>
                    </button>
                </div>
            </td>
        `;
        
        estoqueTableBody.appendChild(tr);
    });
}

// Determinar status do produto com base na quantidade e validade
function determinarStatusProduto(produto) {
    const hoje = new Date();
    const dataValidade = new Date(produto.validade);
    const diffTime = dataValidade - hoje;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Verificar se está vencido
    if (diffDays < 0) {
        return 'vencido';
    }
    
    // Verificar se está próximo do vencimento (30 dias ou menos)
    if (diffDays <= 30) {
        return 'alerta';
    }
    
    // Verificar se está em falta (abaixo da quantidade mínima)
    if (produto.quantidade < produto.quantidadeMinima) {
        return 'falta';
    }
    
    return 'ok';
}

// Filtrar estoque pela busca
function filtrarEstoque() {
    const termo = searchInput.value;
    carregarEstoque(termo);
}

// Cadastrar novo produto
function cadastrarProduto(e) {
    e.preventDefault();
    
    // Obter valores do formulário
    const nome = document.getElementById('produtoNome').value.trim();
    const quantidade = parseInt(document.getElementById('produtoQuantidade').value);
    const quantidadeMinima = parseInt(document.getElementById('produtoMinimo').value) || 5;
    const validade = document.getElementById('produtoValidade').value;
    const observacao = document.getElementById('produtoObservacao').value.trim();
    
    // Validar dados
    if (!nome || quantidade <= 0 || !validade) {
        mostrarNotificacao('Preencha todos os campos obrigatórios!', 'erro');
        return;
    }
    
    // Validar data de validade
    const dataValidade = new Date(validade);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    if (dataValidade < hoje) {
        mostrarNotificacao('A data de validade não pode ser no passado!', 'erro');
        return;
    }
    
    // Criar novo produto
    const novoProduto = {
        id: Date.now(), // ID único baseado no timestamp
        nome,
        quantidade,
        quantidadeMinima,
        validade,
        observacao: observacao || ''
    };
    
    // Adicionar ao estoque
    estoque.push(novoProduto);
    
    // Salvar no localStorage
    salvarDados();
    
    // Atualizar interface
    limparFormCadastro();
    carregarEstoque();
    atualizarDashboard();
    atualizarAlertas();
    atualizarTabelasAlertasDashboard();
    
    // Mostrar notificação de sucesso
    mostrarNotificacao('Produto cadastrado com sucesso!', 'sucesso');
    
    // Navegar para a seção de estoque
    document.querySelector('[data-section="estoque"]').click();
}

// Limpar formulário de cadastro
function limparFormCadastro() {
    cadastroForm.reset();
    const dataPadrao = new Date();
    dataPadrao.setDate(dataPadrao.getDate() + 30);
    document.getElementById('produtoValidade').valueAsDate = dataPadrao;
}

// Carregar produtos para o formulário de retirada
function carregarProdutosRetirada() {
    retiradaProdutoSelect.innerHTML = '<option value="">Selecione um produto...</option>';
    
    // Adicionar apenas produtos com quantidade disponível
    estoque.forEach(produto => {
        if (produto.quantidade > 0) {
            const option = document.createElement('option');
            option.value = produto.id;
            option.textContent = `${produto.nome} (${produto.quantidade} disponíveis)`;
            retiradaProdutoSelect.appendChild(option);
        }
    });
}

// Atualizar quantidade disponível quando selecionar um produto
function atualizarQuantidadeDisponivel() {
    const produtoId = parseInt(retiradaProdutoSelect.value);
    
    if (!produtoId) {
        retiradaQuantidadeDisponivel.value = '0';
        retiradaQuantidadeInput.max = 0;
        produtoSelecionadoRetirada = null;
        return;
    }
    
    produtoSelecionadoRetirada = estoque.find(p => p.id === produtoId);
    
    if (produtoSelecionadoRetirada) {
        retiradaQuantidadeDisponivel.value = produtoSelecionadoRetirada.quantidade;
        retiradaQuantidadeInput.max = produtoSelecionadoRetirada.quantidade;
        retiradaQuantidadeInput.value = Math.min(1, produtoSelecionadoRetirada.quantidade);
    }
}

// Registrar retirada de produto
function registrarRetirada(e) {
    e.preventDefault();
    
    const produtoId = parseInt(retiradaProdutoSelect.value);
    const quantidade = parseInt(retiradaQuantidadeInput.value);
    const observacao = document.getElementById('retiradaObservacao').value.trim();
    
    // Validações
    if (!produtoId) {
        mostrarNotificacao('Selecione um produto!', 'erro');
        return;
    }
    
    if (quantidade <= 0) {
        mostrarNotificacao('A quantidade deve ser maior que zero!', 'erro');
        return;
    }
    
    const produto = estoque.find(p => p.id === produtoId);
    
    if (!produto) {
        mostrarNotificacao('Produto não encontrado!', 'erro');
        return;
    }
    
    if (quantidade > produto.quantidade) {
        mostrarNotificacao(`Quantidade indisponível! Disponível: ${produto.quantidade}`, 'erro');
        return;
    }
    
    // Confirmar retirada
    abrirModal(
        'Confirmar Retirada',
        `Deseja retirar ${quantidade} unidade(s) do produto "${produto.nome}"?`,
        () => {
            // Atualizar quantidade no estoque
            produto.quantidade -= quantidade;
            
            // Registrar no histórico
            const retirada = {
                id: Date.now(),
                produtoId: produto.id,
                produtoNome: produto.nome,
                quantidade,
                observacao: observacao || 'Sem observação',
                data: new Date().toISOString()
            };
            
            historicoRetiradas.unshift(retirada); // Adicionar no início
            
            // Salvar dados
            salvarDados();
            
            // Atualizar interface
            limparFormRetirada();
            carregarProdutosRetirada();
            carregarRetiradas();
            atualizarDashboard();
            atualizarAlertas();
            atualizarTabelasAlertasDashboard();
            
            // Mostrar notificação
            mostrarNotificacao('Retirada registrada com sucesso!', 'sucesso');
        }
    );
}

// Retirada rápida (da tabela de estoque)
function retiradaRapida(id) {
    produtoParaRetiradaRapida = estoque.find(p => p.id === id);
    
    if (!produtoParaRetiradaRapida) return;
    
    abrirModal(
        'Retirada Rápida',
        `Quantas unidades de "${produtoParaRetiradaRapida.nome}" deseja retirar? (Disponível: ${produtoParaRetiradaRapida.quantidade})`,
        () => {
            const quantidade = prompt(`Quantidade para retirar (máx: ${produtoParaRetiradaRapida.quantidade}):`, "1");
            const qtd = parseInt(quantidade);
            
            if (isNaN(qtd) || qtd <= 0) {
                mostrarNotificacao('Quantidade inválida!', 'erro');
                return;
            }
            
            if (qtd > produtoParaRetiradaRapida.quantidade) {
                mostrarNotificacao(`Quantidade indisponível! Disponível: ${produtoParaRetiradaRapida.quantidade}`, 'erro');
                return;
            }
            
            // Atualizar quantidade no estoque
            produtoParaRetiradaRapida.quantidade -= qtd;
            
            // Registrar no histórico
            const retirada = {
                id: Date.now(),
                produtoId: produtoParaRetiradaRapida.id,
                produtoNome: produtoParaRetiradaRapida.nome,
                quantidade: qtd,
                observacao: 'Retirada rápida',
                data: new Date().toISOString()
            };
            
            historicoRetiradas.unshift(retirada);
            
            // Salvar dados
            salvarDados();
            
            // Atualizar interface
            carregarEstoque();
            carregarRetiradas();
            atualizarDashboard();
            atualizarAlertas();
            atualizarTabelasAlertasDashboard();
            
            // Mostrar notificação
            mostrarNotificacao(`${qtd} unidade(s) retirada(s) com sucesso!`, 'sucesso');
            
            produtoParaRetiradaRapida = null;
        }
    );
}

// Carregar histórico de retiradas
function carregarRetiradas() {
    historicoTableBody.innerHTML = '';
    
    if (historicoRetiradas.length === 0) {
        emptyHistoryMessage.style.display = 'flex';
        return;
    }
    
    emptyHistoryMessage.style.display = 'none';
    
    // Limitar a 10 registros mais recentes
    const retiradasRecentes = historicoRetiradas.slice(0, 10);
    
    retiradasRecentes.forEach(retirada => {
        const tr = document.createElement('tr');
        const data = new Date(retirada.data);
        const dataFormatada = data.toLocaleDateString('pt-BR');
        const horaFormatada = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        
        tr.innerHTML = `
            <td>
                <div class="date-time-info">
                    <span>${dataFormatada}</span>
                    <small class="text-muted">${horaFormatada}</small>
                </div>
            </td>
            <td>${retirada.produtoNome}</td>
            <td>${retirada.quantidade}</td>
            <td>${retirada.observacao}</td>
        `;
        
        historicoTableBody.appendChild(tr);
    });
}

// Limpar formulário de retirada
function limparFormRetirada() {
    retiradaForm.reset();
    retiradaQuantidadeDisponivel.value = '0';
    produtoSelecionadoRetirada = null;
}

// Atualizar alertas
function atualizarAlertas() {
    const hoje = new Date();
    const trintaDiasFrente = new Date();
    trintaDiasFrente.setDate(hoje.getDate() + 30);
    
    // Produtos próximos do vencimento
    const produtosProximoVencimento = estoque.filter(produto => {
        const dataValidade = new Date(produto.validade);
        return dataValidade > hoje && dataValidade <= trintaDiasFrente;
    });
    
    // Produtos vencidos
    const produtosVencidos = estoque.filter(produto => {
        const dataValidade = new Date(produto.validade);
        return dataValidade < hoje;
    });
    
    // Produtos em falta
    const produtosEmFalta = estoque.filter(produto => produto.quantidade < produto.quantidadeMinima);
    
    // Calcular total de alertas para o badge
    const totalAlertas = produtosProximoVencimento.length + produtosVencidos.length + produtosEmFalta.length;
    totalAlertasElement.textContent = totalAlertas;
    
    // Atualizar contadores
    alertProximoCount.textContent = produtosProximoVencimento.length;
    alertVencidoCount.textContent = produtosVencidos.length;
    alertFaltaCount.textContent = produtosEmFalta.length;
    
    // Atualizar lista de produtos próximos do vencimento
    alertProximoList.innerHTML = '';
    if (produtosProximoVencimento.length === 0) {
        emptyProximoAlert.style.display = 'block';
    } else {
        emptyProximoAlert.style.display = 'none';
        
        // Ordenar por data de validade
        produtosProximoVencimento.sort((a, b) => new Date(a.validade) - new Date(b.validade));
        
        produtosProximoVencimento.forEach(produto => {
            const tr = document.createElement('tr');
            const dataValidade = new Date(produto.validade);
            const diffTime = dataValidade - hoje;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            tr.innerHTML = `
                <td><strong>${produto.nome}</strong></td>
                <td>${produto.quantidade}</td>
                <td>${dataValidade.toLocaleDateString('pt-BR')}</td>
                <td><span class="status-badge status-alerta">${diffDays} dias</span></td>
                <td>
                    <button class="btn-quick-action" onclick="retiradaRapida(${produto.id})">
                        <i class="fas fa-minus"></i> Retirar
                    </button>
                </td>
            `;
            alertProximoList.appendChild(tr);
        });
    }
    
    // Atualizar lista de produtos vencidos
    alertVencidoList.innerHTML = '';
    if (produtosVencidos.length === 0) {
        emptyVencidoAlert.style.display = 'block';
    } else {
        emptyVencidoAlert.style.display = 'none';
        
        // Ordenar por data de validade (mais antigos primeiro)
        produtosVencidos.sort((a, b) => new Date(a.validade) - new Date(b.validade));
        
        produtosVencidos.forEach(produto => {
            const tr = document.createElement('tr');
            const dataValidade = new Date(produto.validade);
            const diffTime = hoje - dataValidade;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            tr.innerHTML = `
                <td><strong>${produto.nome}</strong></td>
                <td>${produto.quantidade}</td>
                <td>${dataValidade.toLocaleDateString('pt-BR')}</td>
                <td><span class="status-badge status-vencido">${diffDays} dias</span></td>
                <td>
                    <button class="btn-quick-action" onclick="descarteVencido(${produto.id})">
                        <i class="fas fa-trash"></i> Descartar
                    </button>
                </td>
            `;
            alertVencidoList.appendChild(tr);
        });
    }
    
    // Atualizar lista de produtos em falta
    alertFaltaList.innerHTML = '';
    if (produtosEmFalta.length === 0) {
        emptyFaltaAlert.style.display = 'block';
    } else {
        emptyFaltaAlert.style.display = 'none';
        
        // Ordenar por quantidade que falta (mais críticos primeiro)
        produtosEmFalta.sort((a, b) => (a.quantidadeMinima - a.quantidade) - (b.quantidadeMinima - b.quantidade));
        
        produtosEmFalta.forEach(produto => {
            const tr = document.createElement('tr');
            const faltam = produto.quantidadeMinima - produto.quantidade;
            
            tr.innerHTML = `
                <td><strong>${produto.nome}</strong></td>
                <td>${produto.quantidade}</td>
                <td>${produto.quantidadeMinima}</td>
                <td><span class="status-badge status-falta">${faltam} unidades</span></td>
                <td>
                    <button class="btn-quick-action" onclick="reporEstoque(${produto.id})">
                        <i class="fas fa-plus"></i> Repor
                    </button>
                </td>
            `;
            alertFaltaList.appendChild(tr);
        });
    }
}

// Função para descartar produto vencido
function descarteVencido(id) {
    const produto = estoque.find(p => p.id === id);
    
    if (!produto) return;
    
    abrirModal(
        'Descartar Produto Vencido',
        `Deseja descartar ${produto.quantidade} unidade(s) do produto "${produto.nome}" (VENCIDO)?`,
        () => {
            // Registrar no histórico como descarte
            const retirada = {
                id: Date.now(),
                produtoId: produto.id,
                produtoNome: produto.nome,
                quantidade: produto.quantidade,
                observacao: 'DESCARTE - Produto vencido',
                data: new Date().toISOString()
            };
            
            historicoRetiradas.unshift(retirada);
            
            // Remover produto do estoque
            estoque = estoque.filter(p => p.id !== id);
            
            // Salvar dados
            salvarDados();
            
            // Atualizar interface
            carregarEstoque();
            carregarRetiradas();
            atualizarDashboard();
            atualizarAlertas();
            atualizarTabelasAlertasDashboard();
            
            // Mostrar notificação
            mostrarNotificacao('Produto vencido descartado!', 'sucesso');
        }
    );
}

// Função para repor estoque de produto em falta
function reporEstoque(id) {
    const produto = estoque.find(p => p.id === id);
    
    if (!produto) return;
    
    const quantidade = prompt(`Quantas unidades de "${produto.nome}" deseja adicionar?`, "10");
    const qtd = parseInt(quantidade);
    
    if (isNaN(qtd) || qtd <= 0) {
        mostrarNotificacao('Quantidade inválida!', 'erro');
        return;
    }
    
    // Atualizar quantidade no estoque
    produto.quantidade += qtd;
    
    // Salvar dados
    salvarDados();
    
    // Atualizar interface
    carregarEstoque();
    atualizarDashboard();
    atualizarAlertas();
    atualizarTabelasAlertasDashboard();
    
    // Mostrar notificação
    mostrarNotificacao(`${qtd} unidade(s) adicionada(s) ao estoque!`, 'sucesso');
}

// Editar produto
function editarProduto(id) {
    const produto = estoque.find(p => p.id === id);
    
    if (!produto) return;
    
    // Preencher formulário com dados do produto
    document.getElementById('produtoNome').value = produto.nome;
    document.getElementById('produtoQuantidade').value = produto.quantidade;
    document.getElementById('produtoMinimo').value = produto.quantidadeMinima;
    document.getElementById('produtoValidade').value = produto.validade;
    document.getElementById('produtoObservacao').value = produto.observacao;
    
    // Alterar texto do botão para "Atualizar"
    const btnSubmit = cadastroForm.querySelector('button[type="submit"]');
    btnSubmit.innerHTML = '<i class="fas fa-sync-alt"></i><span>Atualizar Produto</span>';
    
    // Remover evento atual e adicionar novo para atualização
    cadastroForm.removeEventListener('submit', cadastrarProduto);
    
    const atualizarProdutoHandler = function(e) {
        e.preventDefault();
        
        // Atualizar dados do produto
        produto.nome = document.getElementById('produtoNome').value.trim();
        produto.quantidade = parseInt(document.getElementById('produtoQuantidade').value);
        produto.quantidadeMinima = parseInt(document.getElementById('produtoMinimo').value) || 5;
        produto.validade = document.getElementById('produtoValidade').value;
        produto.observacao = document.getElementById('produtoObservacao').value.trim() || '';
        
        // Validar data de validade
        const dataValidade = new Date(produto.validade);
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        
        if (dataValidade < hoje) {
            mostrarNotificacao('A data de validade não pode ser no passado!', 'erro');
            return;
        }
        
        // Salvar dados
        salvarDados();
        
        // Restaurar formulário e eventos
        limparFormCadastro();
        btnSubmit.innerHTML = '<i class="fas fa-save"></i><span>Salvar Produto</span>';
        cadastroForm.removeEventListener('submit', atualizarProdutoHandler);
        cadastroForm.addEventListener('submit', cadastrarProduto);
        
        // Atualizar interface
        carregarEstoque();
        atualizarDashboard();
        atualizarAlertas();
        atualizarTabelasAlertasDashboard();
        
        // Mostrar notificação
        mostrarNotificacao('Produto atualizado com sucesso!', 'sucesso');
        
        // Navegar para estoque
        document.querySelector('[data-section="estoque"]').click();
    };
    
    cadastroForm.addEventListener('submit', atualizarProdutoHandler);
    
    // Navegar para seção de cadastro
    document.querySelector('[data-section="cadastro"]').click();
}

// Confirmar exclusão de produto
function confirmarExclusaoProduto(id) {
    const produto = estoque.find(p => p.id === id);
    
    if (!produto) return;
    
    produtoParaExcluir = produto;
    
    abrirModal(
        'Confirmar Exclusão',
        `Tem certeza que deseja excluir o produto "${produto.nome}"?`,
        () => {
            excluirProduto();
        }
    );
}

// Excluir produto
function excluirProduto() {
    if (!produtoParaExcluir) return;
    
    // Remover produto do estoque
    estoque = estoque.filter(p => p.id !== produtoParaExcluir.id);
    
    // Salvar dados
    salvarDados();
    
    // Atualizar interface
    carregarEstoque();
    atualizarDashboard();
    atualizarAlertas();
    atualizarTabelasAlertasDashboard();
    
    // Mostrar notificação
    mostrarNotificacao('Produto excluído com sucesso!', 'sucesso');
    
    produtoParaExcluir = null;
}

// Salvar dados no localStorage
function salvarDados() {
    localStorage.setItem('estoque', JSON.stringify(estoque));
    localStorage.setItem('historicoRetiradas', JSON.stringify(historicoRetiradas));
}

// Abrir modal de confirmação
function abrirModal(titulo, mensagem, callbackConfirm) {
    modalTitle.textContent = titulo;
    modalMessage.textContent = mensagem;
    confirmationModal.style.display = 'flex';
    
    // Configurar evento de confirmação
    const confirmHandler = () => {
        if (callbackConfirm) callbackConfirm();
        fecharModal();
    };
    
    modalConfirm.onclick = confirmHandler;
}

// Fechar modal
function fecharModal() {
    confirmationModal.style.display = 'none';
    modalConfirm.onclick = null;
    produtoParaExcluir = null;
    produtoParaRetiradaRapida = null;
}

// Mostrar notificação
function mostrarNotificacao(mensagem, tipo = 'sucesso') {
    notificationText.textContent = mensagem;
    
    // Definir cor e ícone baseado no tipo
    if (tipo === 'sucesso') {
        notification.style.borderLeftColor = '#2ecc71';
        notificationIcon.className = 'fas fa-check-circle';
        notificationIcon.style.color = '#2ecc71';
    } else if (tipo === 'erro') {
        notification.style.borderLeftColor = '#e74c3c';
        notificationIcon.className = 'fas fa-exclamation-circle';
        notificationIcon.style.color = '#e74c3c';
    } else if (tipo === 'aviso') {
        notification.style.borderLeftColor = '#f39c12';
        notificationIcon.className = 'fas fa-exclamation-triangle';
        notificationIcon.style.color = '#f39c12';
    }
    
    notification.style.display = 'flex';
    
    // Ocultar após 4 segundos
    setTimeout(() => {
        notification.style.display = 'none';
    }, 4000);
}

// Verificar alertas automaticamente (executado na inicialização)
function verificarAlertasAutomaticos() {
    const hoje = new Date();
    const produtosVencidos = estoque.filter(produto => {
        const dataValidade = new Date(produto.validade);
        return dataValidade < hoje;
    });
    
    const produtosEmFaltaCritica = estoque.filter(produto => 
        produto.quantidade < produto.quantidadeMinima
    );
    
    // Mostrar alerta geral se houver produtos vencidos ou em falta crítica
    if (produtosVencidos.length > 0 || produtosEmFaltaCritica.length > 0) {
        let mensagem = '';
        
        if (produtosVencidos.length > 0 && produtosEmFaltaCritica.length > 0) {
            mensagem = `⚠️ ${produtosVencidos.length} produto(s) vencido(s) e ${produtosEmFaltaCritica.length} produto(s) em falta!`;
        } else if (produtosVencidos.length > 0) {
            mensagem = `⚠️ ${produtosVencidos.length} produto(s) vencido(s)!`;
        } else {
            mensagem = `⚠️ ${produtosEmFaltaCritica.length} produto(s) em falta!`;
        }
        
        mostrarNotificacao(mensagem, 'aviso');
    }
}