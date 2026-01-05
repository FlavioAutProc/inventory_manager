// Sistema de Gerenciamento de Estoque com IndexedDB
// Versão: 4.0 - Corrigido problemas de menu mobile e IndexedDB

class StockManager {
    constructor() {
        this.db = null;
        this.currentPage = 'dashboard';
        this.editingProductId = null;
        this.products = [];
        this.withdrawals = [];
        this.activities = [];
        
        // Inicialização
        this.initDatabase();
        this.initElements();
        this.initEventListeners();
        this.loadCurrentDate();
        this.showPage('dashboard');
        
        // Atualiza data a cada minuto
        setInterval(() => this.loadCurrentDate(), 60000);
    }
    
    // ========== INICIALIZAÇÃO ==========
    
    // Inicializa o IndexedDB com tratamento de versão
    initDatabase() {
        const request = indexedDB.open('StockMasterDB', 3); // Atualizado para versão 3
        
        request.onerror = (event) => {
            console.error('Erro ao abrir o banco de dados:', event.target.error);
            this.showToast('Erro ao conectar com o banco de dados', 'danger');
        };
        
        request.onsuccess = (event) => {
            this.db = event.target.result;
            console.log('Banco de dados conectado com sucesso');
            this.loadProducts();
            this.loadWithdrawals();
            this.loadActivities();
            this.updateStats();
        };
        
        request.onupgradeneeded = (event) => {
            console.log('Atualizando banco de dados para versão:', event.newVersion);
            const db = event.target.result;
            
            // Cria o objeto de armazenamento para produtos
            if (!db.objectStoreNames.contains('products')) {
                console.log('Criando store products');
                const productStore = db.createObjectStore('products', { 
                    keyPath: 'id',
                    autoIncrement: true 
                });
                
                // Cria índices para busca eficiente
                productStore.createIndex('name', 'name', { unique: false });
                productStore.createIndex('quantity', 'quantity', { unique: false });
                productStore.createIndex('expirationDate', 'expirationDate', { unique: false });
                productStore.createIndex('expirationStatus', 'expirationStatus', { unique: false });
                productStore.createIndex('category', 'category', { unique: false });
            } else {
                console.log('Store products já existe');
            }
            
            // Cria o objeto de armazenamento para atividades
            if (!db.objectStoreNames.contains('activities')) {
                console.log('Criando store activities');
                const activityStore = db.createObjectStore('activities', {
                    keyPath: 'id',
                    autoIncrement: true
                });
                
                activityStore.createIndex('timestamp', 'timestamp', { unique: false });
                activityStore.createIndex('type', 'type', { unique: false });
            } else {
                console.log('Store activities já existe');
            }
            
            // Cria o objeto de armazenamento para retiradas
            if (!db.objectStoreNames.contains('withdrawals')) {
                console.log('Criando store withdrawals');
                const withdrawalStore = db.createObjectStore('withdrawals', {
                    keyPath: 'id',
                    autoIncrement: true
                });
                
                withdrawalStore.createIndex('timestamp', 'timestamp', { unique: false });
                withdrawalStore.createIndex('productId', 'productId', { unique: false });
                withdrawalStore.createIndex('productName', 'productName', { unique: false });
            } else {
                console.log('Store withdrawals já existe');
            }
        };
        
        request.onblocked = (event) => {
            console.warn('Banco de dados bloqueado por outra conexão:', event);
        };
    }
    
    // Inicializa elementos DOM
    initElements() {
        // Elementos de navegação
        this.menuItems = document.querySelectorAll('.menu-item');
        this.menuToggle = document.getElementById('menuToggle');
        this.overlay = document.getElementById('overlay');
        
        // Elementos das páginas
        this.pages = document.querySelectorAll('.page');
        this.pageTitle = document.getElementById('pageTitle');
        this.pageSubtitle = document.getElementById('pageSubtitle');
        
        // Formulário de produto
        this.productForm = document.getElementById('productForm');
        this.cancelFormBtn = document.getElementById('cancelForm');
        
        // Formulário de retirada
        this.withdrawalForm = document.getElementById('withdrawalForm');
        this.productSelect = document.getElementById('productSelect');
        this.withdrawalQuantity = document.getElementById('withdrawalQuantity');
        this.withdrawalNotes = document.getElementById('withdrawalNotes');
        
        // Elementos do Dashboard
        this.statTotalProducts = document.getElementById('statTotalProducts');
        this.statLowStock = document.getElementById('statLowStock');
        this.statExpiring = document.getElementById('statExpiring');
        this.statExpired = document.getElementById('statExpired');
        this.statWithdrawn = document.getElementById('statWithdrawn');
        this.stockSummary = document.getElementById('stockSummary');
        this.activityList = document.getElementById('activityList');
        
        // Elementos do Estoque
        this.searchProduct = document.getElementById('searchProduct');
        this.stockFilter = document.getElementById('stockFilter');
        this.clearStockFilter = document.getElementById('clearStockFilter');
        this.productsList = document.getElementById('productsList');
        
        // Elementos das Retiradas
        this.withdrawalsList = document.getElementById('withdrawalsList');
        
        // Elementos dos Alertas
        this.alertsBadge = document.getElementById('alertsBadge');
        this.lowStockAlerts = document.getElementById('lowStockAlerts');
        this.expiringAlerts = document.getElementById('expiringAlerts');
        this.expiredAlerts = document.getElementById('expiredAlerts');
        
        // Elementos dos Relatórios
        this.exportPdfBtn = document.getElementById('exportPdf');
        
        // Modal
        this.confirmationModal = document.getElementById('confirmationModal');
        this.modalTitle = document.getElementById('modalTitle');
        this.modalMessage = document.getElementById('modalMessage');
        this.closeModal = document.getElementById('closeModal');
        this.cancelAction = document.getElementById('cancelAction');
        this.confirmAction = document.getElementById('confirmAction');
        
        // Toast container
        this.toastContainer = document.getElementById('toastContainer');
        
        // Botão limpar dados
        this.clearDataBtn = document.getElementById('clearData');
        
        // Dados para ação pendente
        this.pendingAction = null;
        this.pendingActionData = null;
    }
    
    // Inicializa event listeners
    initEventListeners() {
        // Navegação do menu
        this.menuItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.getAttribute('data-page');
                this.showPage(page);
                this.closeSidebar();
            });
        });
        
        // Toggle do menu mobile
        if (this.menuToggle) {
            this.menuToggle.addEventListener('click', () => this.toggleSidebar());
        }
        
        if (this.overlay) {
            this.overlay.addEventListener('click', () => this.closeSidebar());
        }
        
        // Formulário de produto
        if (this.productForm) {
            this.productForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }
        
        if (this.cancelFormBtn) {
            this.cancelFormBtn.addEventListener('click', () => {
                this.resetForm();
                this.showPage('estoque');
            });
        }
        
        // Formulário de retirada
        if (this.withdrawalForm) {
            this.withdrawalForm.addEventListener('submit', (e) => this.handleWithdrawalSubmit(e));
        }
        
        // Busca e filtros
        if (this.searchProduct) {
            this.searchProduct.addEventListener('input', () => this.filterProducts());
        }
        
        if (this.stockFilter) {
            this.stockFilter.addEventListener('change', () => this.filterProducts());
        }
        
        if (this.clearStockFilter) {
            this.clearStockFilter.addEventListener('click', () => {
                this.stockFilter.value = 'all';
                this.searchProduct.value = '';
                this.filterProducts();
            });
        }
        
        // Exportação PDF
        if (this.exportPdfBtn) {
            this.exportPdfBtn.addEventListener('click', () => this.generatePDFReport());
        }
        
        // Modal
        if (this.closeModal) {
            this.closeModal.addEventListener('click', () => this.hideModal());
        }
        
        if (this.cancelAction) {
            this.cancelAction.addEventListener('click', () => this.hideModal());
        }
        
        if (this.confirmAction) {
            this.confirmAction.addEventListener('click', () => this.executePendingAction());
        }
        
        // Botão limpar dados
        if (this.clearDataBtn) {
            this.clearDataBtn.addEventListener('click', () => this.confirmClearData());
        }
        
        // Redirecionamento de botões
        document.querySelectorAll('[data-page]').forEach(btn => {
            if (!btn.classList.contains('menu-item')) {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const page = btn.getAttribute('data-page');
                    this.showPage(page);
                });
            }
        });
        
        // Tratamento para quando o formulário é submetido pelo botão
        document.addEventListener('click', (e) => {
            if (e.target.type === 'submit' || e.target.closest('button[type="submit"]')) {
                const form = e.target.closest('form');
                if (form && form.id === 'productForm') {
                    // O formulário já tem seu próprio event listener
                    return;
                }
            }
        });
    }
    
    // ========== NAVEGAÇÃO E UI ==========
    
    // Carrega a data atual
    loadCurrentDate() {
        const now = new Date();
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        const dateElement = document.getElementById('currentDate');
        if (dateElement) {
            dateElement.textContent = 
                now.toLocaleDateString('pt-BR', options) + ' ' + 
                now.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
        }
    }
    
    // Navegação entre páginas
    showPage(page) {
        console.log('Mudando para página:', page);
        
        // Atualiza menu ativo
        this.menuItems.forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-page') === page) {
                item.classList.add('active');
            }
        });
        
        // Atualiza página ativa
        this.pages.forEach(p => {
            p.classList.remove('active');
            if (p.id === `${page}Page`) {
                p.classList.add('active');
            }
        });
        
        // Atualiza título
        this.updatePageTitle(page);
        
        // Atualiza conteúdo da página
        this.currentPage = page;
        this.loadPageContent(page);
        
        // Fecha menu no mobile
        if (window.innerWidth <= 1024) {
            this.closeSidebar();
        }
    }
    
    // Atualiza o título da página
    updatePageTitle(page) {
        const titles = {
            'dashboard': { title: 'Dashboard', subtitle: 'Visão geral do seu estoque' },
            'estoque': { title: 'Estoque', subtitle: 'Gerencie seus produtos' },
            'cadastro': { title: 'Cadastrar Produto', subtitle: 'Adicione um novo produto ao estoque' },
            'retiradas': { title: 'Retiradas', subtitle: 'Registre saídas do estoque' },
            'alertas': { title: 'Alertas', subtitle: 'Atenção aos itens críticos' },
            'relatorios': { title: 'Relatórios', subtitle: 'Análise e estatísticas' }
        };
        
        const pageInfo = titles[page] || titles.dashboard;
        if (this.pageTitle) this.pageTitle.textContent = pageInfo.title;
        if (this.pageSubtitle) this.pageSubtitle.textContent = pageInfo.subtitle;
    }
    
    // Carrega conteúdo específico da página
    loadPageContent(page) {
        switch(page) {
            case 'dashboard':
                this.updateDashboard();
                break;
            case 'estoque':
                this.loadProductsList();
                break;
            case 'retiradas':
                this.loadWithdrawalsPage();
                break;
            case 'alertas':
                this.updateAlerts();
                break;
            case 'relatorios':
                this.updateReports();
                break;
        }
    }
    
    // Menu mobile
    toggleSidebar() {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.classList.toggle('active');
        }
        if (this.overlay) {
            this.overlay.classList.toggle('active');
        }
    }
    
    closeSidebar() {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.classList.remove('active');
        }
        if (this.overlay) {
            this.overlay.classList.remove('active');
        }
    }
    
    // ========== GERENCIAMENTO DE PRODUTOS ==========
    
    // Carrega todos os produtos
    loadProducts() {
        if (!this.db) {
            console.error('Banco de dados não inicializado');
            return;
        }
        
        try {
            const transaction = this.db.transaction(['products'], 'readonly');
            const store = transaction.objectStore('products');
            const request = store.getAll();
            
            request.onsuccess = (event) => {
                this.products = event.target.result ? event.target.result.map(product => {
                    // Atualiza status de validade automaticamente
                    product.expirationStatus = this.calculateExpirationStatus(product.expirationDate);
                    return product;
                }) : [];
                
                console.log('Produtos carregados:', this.products.length);
                
                // Salva atualizações no banco
                if (this.products.length > 0) {
                    this.saveUpdatedProducts();
                }
                
                this.updateStats();
                
                // Atualiza a página atual se necessário
                if (this.currentPage === 'estoque') {
                    this.loadProductsList();
                }
                
                if (this.currentPage === 'retiradas') {
                    this.populateProductSelect();
                }
            };
            
            request.onerror = (event) => {
                console.error('Erro ao carregar produtos:', event.target.error);
                this.showToast('Erro ao carregar produtos', 'danger');
            };
        } catch (error) {
            console.error('Erro na transação:', error);
            this.showToast('Erro ao acessar banco de dados', 'danger');
        }
    }
    
    // Calcula status de validade automático
    calculateExpirationStatus(expirationDate) {
        if (!expirationDate) return 'valid';
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const expDate = new Date(expirationDate);
        expDate.setHours(0, 0, 0, 0);
        
        const timeDiff = expDate.getTime() - today.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
        
        if (daysDiff < 0) {
            return 'expired'; // Vencido
        } else if (daysDiff <= 7) {
            return 'expiring_soon'; // Menos de 7 dias
        } else if (daysDiff <= 30) {
            return 'warning'; // Menos de 30 dias
        } else {
            return 'valid'; // Dentro da validade
        }
    }
    
    // Salva produtos atualizados no banco
    saveUpdatedProducts() {
        if (!this.db || !this.products.length) return;
        
        try {
            const transaction = this.db.transaction(['products'], 'readwrite');
            const store = transaction.objectStore('products');
            
            this.products.forEach(product => {
                store.put(product);
            });
            
            console.log('Produtos atualizados no banco');
        } catch (error) {
            console.error('Erro ao salvar produtos atualizados:', error);
        }
    }
    
    // Filtra produtos
    filterProducts() {
        if (!this.products || !this.productsList) return;
        
        const searchTerm = this.searchProduct ? this.searchProduct.value.toLowerCase() : '';
        const filterValue = this.stockFilter ? this.stockFilter.value : 'all';
        
        let filteredProducts = this.products;
        
        // Aplica filtro de busca
        if (searchTerm) {
            filteredProducts = filteredProducts.filter(product => 
                product.name.toLowerCase().includes(searchTerm) ||
                (product.category && product.category.toLowerCase().includes(searchTerm))
            );
        }
        
        // Aplica filtro de status
        if (filterValue !== 'all') {
            filteredProducts = filteredProducts.filter(product => {
                switch(filterValue) {
                    case 'low_stock':
                        return product.quantity < product.minimumStock;
                    case 'expiring_soon':
                        return product.expirationStatus === 'expiring_soon';
                    case 'expired':
                        return product.expirationStatus === 'expired';
                    case 'valid':
                        return product.expirationStatus === 'valid' || product.expirationStatus === 'warning';
                    default:
                        return true;
                }
            });
        }
        
        this.renderProductsList(filteredProducts);
    }
    
    // Renderiza lista de produtos
    renderProductsList(products) {
        if (!this.productsList) return;
        
        this.productsList.innerHTML = '';
        
        if (products.length === 0) {
            const emptyState = this.createEmptyState();
            this.productsList.appendChild(emptyState);
            return;
        }
        
        // Ordena produtos: estoque baixo primeiro, depois por data de validade
        products.sort((a, b) => {
            const aLowStock = a.quantity < a.minimumStock;
            const bLowStock = b.quantity < b.minimumStock;
            
            if (aLowStock && !bLowStock) return -1;
            if (!aLowStock && bLowStock) return 1;
            
            return new Date(a.expirationDate) - new Date(b.expirationDate);
        });
        
        products.forEach(product => {
            const productCard = this.createProductCard(product);
            this.productsList.appendChild(productCard);
        });
    }
    
    // Cria card de produto
    createProductCard(product) {
        const card = document.createElement('div');
        card.className = 'product-card';
        
        // Calcula dias até o vencimento
        const expirationDate = new Date(product.expirationDate);
        const today = new Date();
        const timeDiff = expirationDate.getTime() - today.getTime();
        const daysUntilExpiration = Math.ceil(timeDiff / (1000 * 3600 * 24));
        
        // Determina classes baseadas no status
        if (product.quantity < product.minimumStock) {
            card.classList.add('low-stock');
        }
        if (product.expirationStatus === 'expiring_soon' || product.expirationStatus === 'warning') {
            card.classList.add('expiring-soon');
        }
        if (product.expirationStatus === 'expired') {
            card.classList.add('expired');
        }
        
        // Formata data
        const formattedDate = expirationDate.toLocaleDateString('pt-BR');
        
        // Status da validade
        let statusText = '';
        let statusClass = '';
        
        if (product.expirationStatus === 'expired') {
            statusText = `Vencido há ${Math.abs(daysUntilExpiration)} dias`;
            statusClass = 'status-expired';
        } else if (product.expirationStatus === 'expiring_soon') {
            statusText = `Vence em ${daysUntilExpiration} dias`;
            statusClass = 'status-danger';
        } else if (product.expirationStatus === 'warning') {
            statusText = `Vence em ${daysUntilExpiration} dias`;
            statusClass = 'status-warning';
        } else {
            statusText = `Vence em ${daysUntilExpiration} dias`;
            statusClass = 'status-valid';
        }
        
        card.innerHTML = `
            <div class="product-header">
                <div>
                    <div class="product-name">
                        ${product.name}
                        <span class="product-category">${product.category || 'Sem categoria'}</span>
                    </div>
                </div>
            </div>
            
            <div class="product-details">
                <div class="detail-item">
                    <span class="detail-label">Quantidade</span>
                    <span class="detail-value ${product.quantity < product.minimumStock ? 'low' : ''}">
                        ${product.quantity} ${product.quantity < product.minimumStock ? '⚠️' : ''}
                    </span>
                </div>
                
                <div class="detail-item">
                    <span class="detail-label">Estoque Mínimo</span>
                    <span class="detail-value">${product.minimumStock}</span>
                </div>
                
                <div class="detail-item">
                    <span class="detail-label">Validade</span>
                    <span class="detail-value ${product.expirationStatus === 'expired' ? 'expired' : 
                                              product.expirationStatus === 'expiring_soon' ? 'danger' : ''}">
                        ${formattedDate}
                    </span>
                </div>
                
                <div class="detail-item">
                    <span class="detail-label">Status</span>
                    <span class="product-status ${statusClass}">
                        ${statusText}
                    </span>
                </div>
            </div>
            
            <div class="product-actions">
                <button class="action-btn edit-btn" data-id="${product.id}">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="action-btn delete-btn" data-id="${product.id}">
                    <i class="fas fa-trash"></i> Excluir
                </button>
            </div>
        `;
        
        // Adiciona event listeners aos botões
        const editBtn = card.querySelector('.edit-btn');
        const deleteBtn = card.querySelector('.delete-btn');
        
        editBtn.addEventListener('click', () => this.editProduct(product.id));
        deleteBtn.addEventListener('click', () => this.confirmDeleteProduct(product));
        
        return card;
    }
    
    // Cria estado vazio
    createEmptyState() {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'empty-state';
        emptyDiv.innerHTML = `
            <i class="fas fa-box-open"></i>
            <h4>Nenhum produto encontrado</h4>
            <p>Tente ajustar sua busca ou filtros</p>
            <button class="btn-primary" data-page="cadastro">
                <i class="fas fa-plus"></i> Cadastrar Produto
            </button>
        `;
        
        // Adiciona event listener ao botão
        const button = emptyDiv.querySelector('.btn-primary');
        button.addEventListener('click', () => this.showPage('cadastro'));
        
        return emptyDiv;
    }
    
    // ========== FORMULÁRIO DE PRODUTO ==========
    
    // Manipula envio do formulário
    handleFormSubmit(e) {
        e.preventDefault();
        console.log('Formulário de produto submetido');
        
        // Coleta dados do formulário
        const productData = {
            name: document.getElementById('productName').value.trim(),
            quantity: parseInt(document.getElementById('productQuantity').value) || 0,
            minimumStock: parseInt(document.getElementById('minimumStock').value) || 0,
            expirationDate: document.getElementById('expirationDate').value,
            category: document.getElementById('productCategory').value,
            notes: document.getElementById('productNotes').value,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Calcula status automático
        productData.expirationStatus = this.calculateExpirationStatus(productData.expirationDate);
        
        // Valida dados
        if (!this.validateProduct(productData)) {
            return;
        }
        
        console.log('Dados do produto validados:', productData);
        
        if (this.editingProductId) {
            // Atualiza produto existente
            productData.id = this.editingProductId;
            this.updateProductInDB(productData);
        } else {
            // Cria novo produto
            this.saveProductToDB(productData);
        }
    }
    
    // Valida dados do produto
    validateProduct(product) {
        if (!product.name) {
            this.showToast('Digite o nome do produto', 'warning');
            return false;
        }
        
        if (product.quantity < 0) {
            this.showToast('A quantidade não pode ser negativa', 'warning');
            return false;
        }
        
        if (product.minimumStock < 0) {
            this.showToast('O estoque mínimo não pode ser negativo', 'warning');
            return false;
        }
        
        if (!product.expirationDate) {
            this.showToast('Selecione uma data de validade', 'warning');
            return false;
        }
        
        return true;
    }
    
    // Salva produto no IndexedDB
    saveProductToDB(product) {
        if (!this.db) {
            this.showToast('Banco de dados não disponível', 'danger');
            return;
        }
        
        try {
            const transaction = this.db.transaction(['products', 'activities'], 'readwrite');
            const productStore = transaction.objectStore('products');
            const activityStore = transaction.objectStore('activities');
            
            const request = productStore.add(product);
            
            request.onsuccess = () => {
                console.log('Produto salvo com sucesso, ID:', request.result);
                
                // Registra atividade
                const activity = {
                    type: 'create',
                    productName: product.name,
                    timestamp: new Date().toISOString(),
                    message: `Produto "${product.name}" cadastrado com ${product.quantity} unidades`
                };
                activityStore.add(activity);
                
                // Atualiza interface
                this.resetForm();
                this.loadProducts();
                this.showToast('Produto cadastrado com sucesso!', 'success');
                this.showPage('estoque');
            };
            
            request.onerror = (event) => {
                console.error('Erro ao salvar produto:', event.target.error);
                this.showToast('Erro ao cadastrar produto', 'danger');
            };
        } catch (error) {
            console.error('Erro na transação de salvar produto:', error);
            this.showToast('Erro ao salvar produto', 'danger');
        }
    }
    
    // Atualiza produto no IndexedDB
    updateProductInDB(product) {
        if (!this.db) return;
        
        try {
            const transaction = this.db.transaction(['products', 'activities'], 'readwrite');
            const productStore = transaction.objectStore('products');
            const activityStore = transaction.objectStore('activities');
            
            const request = productStore.put(product);
            
            request.onsuccess = () => {
                console.log('Produto atualizado com sucesso');
                
                // Registra atividade
                const activity = {
                    type: 'update',
                    productName: product.name,
                    timestamp: new Date().toISOString(),
                    message: `Produto "${product.name}" atualizado`
                };
                activityStore.add(activity);
                
                // Atualiza interface
                this.resetForm();
                this.loadProducts();
                this.showToast('Produto atualizado com sucesso!', 'success');
                this.showPage('estoque');
                this.editingProductId = null;
            };
            
            request.onerror = (event) => {
                console.error('Erro ao atualizar produto:', event.target.error);
                this.showToast('Erro ao atualizar produto', 'danger');
            };
        } catch (error) {
            console.error('Erro na transação de atualizar produto:', error);
            this.showToast('Erro ao atualizar produto', 'danger');
        }
    }
    
    // Edita produto
    editProduct(productId) {
        if (!this.db) return;
        
        try {
            const transaction = this.db.transaction(['products'], 'readonly');
            const store = transaction.objectStore('products');
            const request = store.get(parseInt(productId));
            
            request.onsuccess = (event) => {
                const product = event.target.result;
                if (product) {
                    this.populateForm(product);
                    this.editingProductId = product.id;
                    this.showPage('cadastro');
                }
            };
        } catch (error) {
            console.error('Erro ao editar produto:', error);
            this.showToast('Erro ao carregar produto para edição', 'danger');
        }
    }
    
    // Preenche formulário com dados do produto
    populateForm(product) {
        document.getElementById('productName').value = product.name;
        document.getElementById('productQuantity').value = product.quantity;
        document.getElementById('minimumStock').value = product.minimumStock;
        document.getElementById('expirationDate').value = product.expirationDate;
        document.getElementById('productCategory').value = product.category || '';
        document.getElementById('productNotes').value = product.notes || '';
        
        // Remove opções de status manual (agora é automático)
        const statusContainer = document.querySelector('.status-options');
        if (statusContainer) {
            statusContainer.innerHTML = '<p class="status-info"><i class="fas fa-info-circle"></i> O status da validade é calculado automaticamente pelo sistema</p>';
        }
    }
    
    // Reseta formulário
    resetForm() {
        if (this.productForm) {
            this.productForm.reset();
        }
        this.editingProductId = null;
        
        // Define data padrão (30 dias a partir de hoje)
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 30);
        const expirationDateInput = document.getElementById('expirationDate');
        if (expirationDateInput) {
            expirationDateInput.value = futureDate.toISOString().split('T')[0];
        }
        
        // Remove opções de status manual
        const statusContainer = document.querySelector('.status-options');
        if (statusContainer) {
            statusContainer.innerHTML = '<p class="status-info"><i class="fas fa-info-circle"></i> O status da validade é calculado automaticamente pelo sistema</p>';
        }
    }
    
    // ========== MÓDULO DE RETIRADAS ==========
    
    // Carrega página de retiradas
    loadWithdrawalsPage() {
        this.populateProductSelect();
        this.loadWithdrawalsList();
    }
    
    // Popula select de produtos para retirada
    populateProductSelect() {
        if (!this.productSelect) return;
        
        this.productSelect.innerHTML = '<option value="">Selecione um produto</option>';
        
        this.products.forEach(product => {
            const option = document.createElement('option');
            option.value = product.id;
            option.textContent = `${product.name} (Estoque: ${product.quantity})`;
            option.disabled = product.quantity <= 0;
            this.productSelect.appendChild(option);
        });
        
        // Atualiza quantidade máxima quando produto é selecionado
        this.productSelect.addEventListener('change', (e) => {
            const productId = e.target.value;
            if (productId) {
                const product = this.products.find(p => p.id == productId);
                if (product && this.withdrawalQuantity) {
                    this.withdrawalQuantity.max = product.quantity;
                    this.withdrawalQuantity.placeholder = `Máx: ${product.quantity}`;
                }
            }
        });
    }
    
    // Carrega retiradas do banco
    loadWithdrawals() {
        if (!this.db) return;
        
        try {
            const transaction = this.db.transaction(['withdrawals'], 'readonly');
            const store = transaction.objectStore('withdrawals');
            const request = store.getAll();
            
            request.onsuccess = (event) => {
                this.withdrawals = event.target.result || [];
                console.log('Retiradas carregadas:', this.withdrawals.length);
                
                if (this.currentPage === 'retiradas') {
                    this.loadWithdrawalsList();
                }
            };
        } catch (error) {
            console.error('Erro ao carregar retiradas:', error);
        }
    }
    
    // Carrega lista de retiradas
    loadWithdrawalsList() {
        if (!this.withdrawalsList) return;
        
        if (this.withdrawals.length === 0) {
            this.withdrawalsList.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-state">
                        <i class="fas fa-history"></i>
                        <p>Nenhuma retirada registrada</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        // Ordena por data mais recente
        const sortedWithdrawals = [...this.withdrawals].sort((a, b) => 
            new Date(b.timestamp) - new Date(a.timestamp)
        );
        
        this.withdrawalsList.innerHTML = sortedWithdrawals.map(withdrawal => {
            const date = new Date(withdrawal.timestamp);
            const formattedDate = date.toLocaleDateString('pt-BR');
            const formattedTime = date.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
            
            return `
                <tr>
                    <td>${formattedDate} ${formattedTime}</td>
                    <td>${withdrawal.productName}</td>
                    <td>${withdrawal.quantity}</td>
                    <td>${withdrawal.user || 'Usuário'}</td>
                    <td>${withdrawal.notes || '-'}</td>
                </tr>
            `;
        }).join('');
    }
    
    // Manipula envio de retirada
    handleWithdrawalSubmit(e) {
        e.preventDefault();
        
        if (!this.productSelect || !this.withdrawalQuantity) {
            this.showToast('Formulário de retirada não carregado', 'danger');
            return;
        }
        
        const productId = this.productSelect.value;
        const quantity = parseInt(this.withdrawalQuantity.value);
        const notes = this.withdrawalNotes ? this.withdrawalNotes.value : '';
        
        if (!productId || !quantity) {
            this.showToast('Selecione um produto e informe a quantidade', 'warning');
            return;
        }
        
        const product = this.products.find(p => p.id == productId);
        if (!product) {
            this.showToast('Produto não encontrado', 'danger');
            return;
        }
        
        if (quantity <= 0) {
            this.showToast('A quantidade deve ser maior que zero', 'warning');
            return;
        }
        
        if (quantity > product.quantity) {
            this.showToast(`Quantidade indisponível. Estoque atual: ${product.quantity}`, 'danger');
            return;
        }
        
        // Cria registro de retirada
        const withdrawal = {
            productId: product.id,
            productName: product.name,
            quantity: quantity,
            timestamp: new Date().toISOString(),
            user: 'Usuário',
            notes: notes
        };
        
        this.saveWithdrawal(withdrawal, product);
    }
    
    // Salva retirada no banco
    saveWithdrawal(withdrawal, product) {
        if (!this.db) return;
        
        try {
            const transaction = this.db.transaction(['withdrawals', 'products', 'activities'], 'readwrite');
            const withdrawalStore = transaction.objectStore('withdrawals');
            const productStore = transaction.objectStore('products');
            const activityStore = transaction.objectStore('activities');
            
            // Atualiza estoque do produto
            product.quantity -= withdrawal.quantity;
            product.updatedAt = new Date().toISOString();
            
            const withdrawalRequest = withdrawalStore.add(withdrawal);
            const productRequest = productStore.put(product);
            
            withdrawalRequest.onsuccess = () => {
                productRequest.onsuccess = () => {
                    // Registra atividade
                    const activity = {
                        type: 'withdrawal',
                        productName: product.name,
                        timestamp: new Date().toISOString(),
                        message: `Retirada de ${withdrawal.quantity} unidades de "${product.name}"`
                    };
                    activityStore.add(activity);
                    
                    // Atualiza interface
                    if (this.withdrawalForm) {
                        this.withdrawalForm.reset();
                    }
                    this.loadProducts();
                    this.loadWithdrawals();
                    this.showToast('Retirada registrada com sucesso!', 'success');
                    
                    // Recarrega select de produtos
                    this.populateProductSelect();
                };
            };
            
            transaction.onerror = (event) => {
                console.error('Erro ao registrar retirada:', event.target.error);
                this.showToast('Erro ao registrar retirada', 'danger');
            };
        } catch (error) {
            console.error('Erro na transação de retirada:', error);
            this.showToast('Erro ao registrar retirada', 'danger');
        }
    }
    
    // ========== EXCLUSÃO ==========
    
    // Confirma exclusão de produto
    confirmDeleteProduct(product) {
        this.pendingAction = 'deleteProduct';
        this.pendingActionData = product;
        
        this.modalTitle.textContent = 'Confirmar Exclusão';
        this.modalMessage.innerHTML = `
            Tem certeza que deseja excluir o produto <strong>${product.name}</strong>?
            <br><br>
            <small>Esta ação não pode ser desfeita. Todas as retiradas relacionadas serão mantidas.</small>
        `;
        
        this.showModal();
    }
    
    // Executa exclusão
    deleteProduct(product) {
        if (!this.db || !product) return;
        
        try {
            const transaction = this.db.transaction(['products', 'activities'], 'readwrite');
            const productStore = transaction.objectStore('products');
            const activityStore = transaction.objectStore('activities');
            
            const request = productStore.delete(product.id);
            
            request.onsuccess = () => {
                // Registra atividade
                const activity = {
                    type: 'delete',
                    productName: product.name,
                    timestamp: new Date().toISOString(),
                    message: `Produto "${product.name}" excluído`
                };
                activityStore.add(activity);
                
                // Atualiza interface
                this.loadProducts();
                this.showToast('Produto excluído com sucesso!', 'success');
            };
            
            request.onerror = (event) => {
                console.error('Erro ao excluir produto:', event.target.error);
                this.showToast('Erro ao excluir produto', 'danger');
            };
        } catch (error) {
            console.error('Erro na transação de exclusão:', error);
            this.showToast('Erro ao excluir produto', 'danger');
        }
    }
    
    // ========== DASHBOARD ==========
    
    // Atualiza dashboard
    updateDashboard() {
        this.updateStats();
        this.updateStockSummary();
        this.updateActivityLog();
    }
    
    // Atualiza estatísticas
    updateStats() {
        if (!this.products.length) {
            if (this.statTotalProducts) this.statTotalProducts.textContent = '0';
            if (this.statLowStock) this.statLowStock.textContent = '0';
            if (this.statExpiring) this.statExpiring.textContent = '0';
            if (this.statExpired) this.statExpired.textContent = '0';
            if (this.statWithdrawn) this.statWithdrawn.textContent = '0';
            this.updateAlertsBadge(0);
            return;
        }
        
        const totalProducts = this.products.length;
        const lowStockCount = this.products.filter(p => p.quantity < p.minimumStock).length;
        const expiringSoonCount = this.products.filter(p => 
            p.expirationStatus === 'expiring_soon' || p.expirationStatus === 'warning'
        ).length;
        const expiredCount = this.products.filter(p => p.expirationStatus === 'expired').length;
        const totalWithdrawn = this.withdrawals.reduce((sum, w) => sum + w.quantity, 0);
        
        if (this.statTotalProducts) this.statTotalProducts.textContent = totalProducts;
        if (this.statLowStock) this.statLowStock.textContent = lowStockCount;
        if (this.statExpiring) this.statExpiring.textContent = expiringSoonCount;
        if (this.statExpired) this.statExpired.textContent = expiredCount;
        if (this.statWithdrawn) {
            this.statWithdrawn.textContent = totalWithdrawn;
        }
        
        // Atualiza badge de alertas
        const totalAlerts = lowStockCount + expiringSoonCount + expiredCount;
        this.updateAlertsBadge(totalAlerts);
    }
    
    // Atualiza badge de alertas
    updateAlertsBadge(count) {
        if (!this.alertsBadge) return;
        
        if (count > 0) {
            this.alertsBadge.textContent = count > 99 ? '99+' : count;
            this.alertsBadge.style.display = 'flex';
        } else {
            this.alertsBadge.style.display = 'none';
        }
    }
    
    // Atualiza resumo do estoque (sem valores monetários)
    updateStockSummary() {
        if (!this.stockSummary) return;
        
        if (!this.products.length) {
            this.stockSummary.innerHTML = `
                <div class="empty-state">
                    <p>Nenhum produto cadastrado</p>
                </div>
            `;
            return;
        }
        
        // Calcula totais
        const totalStock = this.products.reduce((sum, p) => sum + p.quantity, 0);
        const averageStock = totalStock / this.products.length;
        const categories = [...new Set(this.products.map(p => p.category || 'Sem categoria'))];
        const efficiency = this.calculateEfficiency();
        
        this.stockSummary.innerHTML = `
            <div class="summary-item">
                <span>Total em estoque</span>
                <strong>${totalStock} unidades</strong>
            </div>
            <div class="summary-item">
                <span>Estoque médio por produto</span>
                <strong>${averageStock.toFixed(1)} unidades</strong>
            </div>
            <div class="summary-item">
                <span>Eficiência do estoque</span>
                <strong>${efficiency}%</strong>
            </div>
            <div class="summary-item">
                <span>Categorias ativas</span>
                <strong>${categories.length}</strong>
            </div>
        `;
    }
    
    // Calcula eficiência do estoque
    calculateEfficiency() {
        if (!this.products.length) return 0;
        
        const productsInGoodCondition = this.products.filter(p => 
            p.quantity >= p.minimumStock && 
            p.expirationStatus !== 'expired'
        ).length;
        
        return ((productsInGoodCondition / this.products.length) * 100).toFixed(1);
    }
    
    // Carrega atividades
    loadActivities() {
        if (!this.db) return;
        
        try {
            const transaction = this.db.transaction(['activities'], 'readonly');
            const store = transaction.objectStore('activities');
            const index = store.index('timestamp');
            const request = index.getAll();
            
            request.onsuccess = (event) => {
                this.activities = event.target.result || [];
                console.log('Atividades carregadas:', this.activities.length);
                
                if (this.currentPage === 'dashboard') {
                    this.updateActivityLog();
                }
            };
        } catch (error) {
            console.error('Erro ao carregar atividades:', error);
        }
    }
    
    // Atualiza log de atividades
    updateActivityLog() {
        if (!this.activityList) return;
        
        if (!this.activities || this.activities.length === 0) {
            this.activityList.innerHTML = `
                <div class="empty-state">
                    <p>Nenhuma atividade registrada</p>
                </div>
            `;
            return;
        }
        
        const recentActivities = [...this.activities]
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 5);
        
        this.activityList.innerHTML = recentActivities.map(activity => {
            const time = new Date(activity.timestamp).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit'
            });
            const date = new Date(activity.timestamp).toLocaleDateString('pt-BR');
            
            let typeClass = '';
            let icon = 'fas fa-info-circle';
            
            switch(activity.type) {
                case 'create':
                    typeClass = 'success';
                    icon = 'fas fa-plus-circle';
                    break;
                case 'update':
                    typeClass = 'warning';
                    icon = 'fas fa-edit';
                    break;
                case 'delete':
                    typeClass = 'danger';
                    icon = 'fas fa-trash';
                    break;
                case 'withdrawal':
                    typeClass = 'success';
                    icon = 'fas fa-arrow-right';
                    break;
            }
            
            return `
                <div class="activity-item ${typeClass}">
                    <div class="activity-info">
                        <strong>${activity.productName}</strong>
                        <span>${activity.message}</span>
                    </div>
                    <div class="activity-time">
                        <i class="${icon}"></i>
                        ${date} ${time}
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // ========== ALERTAS ==========
    
    // Atualiza página de alertas
    updateAlerts() {
        if (!this.products.length) {
            if (this.lowStockAlerts) {
                this.lowStockAlerts.innerHTML = this.createEmptyAlert('estoque baixo');
            }
            if (this.expiringAlerts) {
                this.expiringAlerts.innerHTML = this.createEmptyAlert('vencimento próximo');
            }
            if (this.expiredAlerts) {
                this.expiredAlerts.innerHTML = this.createEmptyAlert('produtos vencidos');
            }
            return;
        }
        
        // Alertas de estoque baixo
        const lowStockProducts = this.products.filter(p => p.quantity < p.minimumStock);
        if (this.lowStockAlerts) {
            this.renderAlerts(lowStockProducts, this.lowStockAlerts, 'low-stock', 'exclamation-triangle');
        }
        
        // Alertas de vencimento próximo (menos de 30 dias)
        const expiringProducts = this.products.filter(p => 
            p.expirationStatus === 'expiring_soon' || p.expirationStatus === 'warning'
        );
        if (this.expiringAlerts) {
            this.renderAlerts(expiringProducts, this.expiringAlerts, 'expiring-soon', 'clock');
        }
        
        // Alertas de produtos vencidos
        const expiredProducts = this.products.filter(p => p.expirationStatus === 'expired');
        if (this.expiredAlerts) {
            this.renderAlerts(expiredProducts, this.expiredAlerts, 'expired', 'skull-crossbones');
        }
    }
    
    // Cria alerta vazio
    createEmptyAlert(type) {
        return `
            <div class="alert-item">
                <div class="alert-info">
                    <h4>Nenhum alerta</h4>
                    <p>Nenhum produto com ${type}</p>
                </div>
            </div>
        `;
    }
    
    // Renderiza alertas
    renderAlerts(products, container, type, icon) {
        if (products.length === 0) {
            container.innerHTML = this.createEmptyAlert(
                type === 'low-stock' ? 'estoque baixo' : 
                type === 'expiring-soon' ? 'vencimento próximo' : 'produtos vencidos'
            );
            return;
        }
        
        container.innerHTML = products.map(product => {
            const expirationDate = new Date(product.expirationDate);
            const today = new Date();
            const timeDiff = expirationDate.getTime() - today.getTime();
            const daysUntilExpiration = Math.ceil(timeDiff / (1000 * 3600 * 24));
            
            const formattedDate = expirationDate.toLocaleDateString('pt-BR');
            
            let message = '';
            if (type === 'low-stock') {
                message = `Estoque: ${product.quantity}/${product.minimumStock} • Necessário: ${product.minimumStock - product.quantity} unidades`;
            } else if (type === 'expiring-soon') {
                if (daysUntilExpiration < 0) {
                    message = `Vencido há ${Math.abs(daysUntilExpiration)} dias`;
                } else if (daysUntilExpiration <= 7) {
                    message = `Vence em ${daysUntilExpiration} dias (${formattedDate})`;
                } else {
                    message = `Vence em ${daysUntilExpiration} dias (${formattedDate})`;
                }
            } else {
                message = `Vencido há ${Math.abs(daysUntilExpiration)} dias`;
            }
            
            return `
                <div class="alert-item ${type}">
                    <div class="alert-icon">
                        <i class="fas fa-${icon}"></i>
                    </div>
                    <div class="alert-info">
                        <h4>${product.name}</h4>
                        <p>${message}</p>
                        ${product.category ? `<small>Categoria: ${product.category}</small>` : ''}
                    </div>
                    <div class="alert-actions">
                        <button class="btn-small edit-btn" data-id="${product.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        // Adiciona event listeners aos botões de edição
        container.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const productId = btn.getAttribute('data-id');
                this.editProduct(productId);
            });
        });
    }
    
    // ========== RELATÓRIOS ==========
    
    // Atualiza página de relatórios
    updateReports() {
        if (!this.products.length) {
            this.showEmptyReports();
            return;
        }
        
        this.updateReportStats();
        this.updateRestockList();
        this.updateCategoryChart();
    }
    
    // Mostra relatórios vazios
    showEmptyReports() {
        const reportStats = document.getElementById('reportStats');
        if (reportStats) {
            reportStats.innerHTML = `
                <div class="empty-state">
                    <p>Nenhum dado disponível</p>
                </div>
            `;
        }
        
        const restockList = document.getElementById('restockList');
        if (restockList) {
            restockList.innerHTML = `
                <div class="empty-state">
                    <p>Nenhum produto para repor</p>
                </div>
            `;
        }
    }
    
    // Atualiza estatísticas dos relatórios
    updateReportStats() {
        const reportStats = document.getElementById('reportStats');
        if (!reportStats) return;
        
        const totalProducts = this.products.length;
        const totalStock = this.products.reduce((sum, p) => sum + p.quantity, 0);
        const lowStockCount = this.products.filter(p => p.quantity < p.minimumStock).length;
        const expiredCount = this.products.filter(p => p.expirationStatus === 'expired').length;
        const totalWithdrawn = this.withdrawals.reduce((sum, w) => sum + w.quantity, 0);
        const averageStock = totalStock / totalProducts;
        const efficiency = this.calculateEfficiency();
        
        reportStats.innerHTML = `
            <div class="stat-item">
                <span class="label">Total em estoque</span>
                <span class="value">${totalStock} unidades</span>
            </div>
            <div class="stat-item">
                <span class="label">Média por produto</span>
                <span class="value">${averageStock.toFixed(1)}</span>
            </div>
            <div class="stat-item">
                <span class="label">Produtos com estoque baixo</span>
                <span class="value">${lowStockCount}</span>
            </div>
            <div class="stat-item">
                <span class="label">Produtos vencidos</span>
                <span class="value">${expiredCount}</span>
            </div>
            <div class="stat-item">
                <span class="label">Total retirado</span>
                <span class="value">${totalWithdrawn} unidades</span>
            </div>
            <div class="stat-item">
                <span class="label">Eficiência do estoque</span>
                <span class="value">${efficiency}%</span>
            </div>
        `;
    }
    
    // Atualiza lista de reposição
    updateRestockList() {
        const restockList = document.getElementById('restockList');
        if (!restockList) return;
        
        const restockProducts = this.products
            .filter(p => p.quantity < p.minimumStock)
            .sort((a, b) => (a.minimumStock - a.quantity) - (b.minimumStock - b.quantity));
        
        if (restockProducts.length === 0) {
            restockList.innerHTML = `
                <div class="empty-state">
                    <p>Nenhum produto para repor</p>
                </div>
            `;
            return;
        }
        
        restockList.innerHTML = restockProducts.map(product => {
            const needed = product.minimumStock - product.quantity;
            return `
                <div class="restock-item">
                    <div>
                        <div class="product-name">${product.name}</div>
                        <div class="product-info">
                            ${product.category ? `Categoria: ${product.category}` : ''}
                            ${product.expirationStatus === 'expired' ? '<br><small class="text-danger">PRODUTO VENCIDO</small>' : ''}
                        </div>
                    </div>
                    <div class="stock-info">
                        <div class="current-stock">${product.quantity}</div>
                        <div class="min-stock">Necessário: ${needed}</div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // Atualiza gráfico de categorias
    updateCategoryChart() {
        const canvas = document.getElementById('categoryChart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        // Agrupa produtos por categoria
        const categories = {};
        this.products.forEach(product => {
            const category = product.category || 'Sem categoria';
            categories[category] = (categories[category] || 0) + 1;
        });
        
        // Limpa canvas anterior
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Configurações do gráfico
        const data = Object.values(categories);
        const labels = Object.keys(categories);
        const colors = [
            '#4361ee', '#4cc9f0', '#f8961e', '#f94144', 
            '#7209b7', '#3a0ca3', '#2ec4b6', '#ff9f1c'
        ];
        
        // Desenha gráfico de pizza simples
        const total = data.reduce((a, b) => a + b, 0);
        let startAngle = 0;
        
        data.forEach((value, index) => {
            const sliceAngle = (value / total) * 2 * Math.PI;
            
            ctx.beginPath();
            ctx.fillStyle = colors[index % colors.length];
            ctx.moveTo(canvas.width / 2, canvas.height / 2);
            ctx.arc(
                canvas.width / 2,
                canvas.height / 2,
                Math.min(canvas.width, canvas.height) / 3,
                startAngle,
                startAngle + sliceAngle
            );
            ctx.closePath();
            ctx.fill();
            
            // Legenda
            const angle = startAngle + sliceAngle / 2;
            const radius = Math.min(canvas.width, canvas.height) / 2.5;
            const x = canvas.width / 2 + Math.cos(angle) * radius;
            const y = canvas.height / 2 + Math.sin(angle) * radius;
            
            ctx.fillStyle = colors[index % colors.length];
            ctx.font = '12px Arial';
            ctx.fillText(
                `${labels[index]} (${((value / total) * 100).toFixed(1)}%)`,
                x + 10,
                y
            );
            
            startAngle += sliceAngle;
        });
    }
    
    // ========== EXPORTAÇÃO PDF ==========
    
    // Gera relatório em PDF
    generatePDFReport() {
        try {
            const { jsPDF } = window.jspdf;
            if (!jsPDF) {
                this.showToast('Biblioteca PDF não carregada', 'danger');
                return;
            }
            
            const doc = new jsPDF('landscape');
            
            // Configurações do documento
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 20;
            const contentWidth = pageWidth - (2 * margin);
            
            // Cabeçalho
            doc.setFontSize(24);
            doc.setTextColor(67, 97, 238);
            doc.text('StockMaster - Relatório de Estoque', margin, 25);
            
            doc.setFontSize(12);
            doc.setTextColor(100, 100, 100);
            doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`, margin, 35);
            
            doc.setDrawColor(67, 97, 238);
            doc.setLineWidth(0.5);
            doc.line(margin, 40, pageWidth - margin, 40);
            
            let yPosition = 50;
            
            // Seção 1: Estatísticas Gerais
            doc.setFontSize(18);
            doc.setTextColor(33, 37, 41);
            doc.text('1. Estatísticas Gerais', margin, yPosition);
            yPosition += 10;
            
            doc.setFontSize(11);
            doc.setTextColor(100, 100, 100);
            
            const stats = [
                ['Total de Produtos:', this.products.length],
                ['Total em Estoque:', this.products.reduce((sum, p) => sum + p.quantity, 0) + ' unidades'],
                ['Produtos com Estoque Baixo:', this.products.filter(p => p.quantity < p.minimumStock).length],
                ['Produtos Próximos do Vencimento:', this.products.filter(p => 
                    p.expirationStatus === 'expiring_soon' || p.expirationStatus === 'warning').length],
                ['Produtos Vencidos:', this.products.filter(p => p.expirationStatus === 'expired').length],
                ['Total Retirado:', this.withdrawals.reduce((sum, w) => sum + w.quantity, 0) + ' unidades'],
                ['Eficiência do Estoque:', this.calculateEfficiency() + '%']
            ];
            
            stats.forEach(([label, value], index) => {
                const x = margin + (index % 2) * (contentWidth / 2);
                const y = yPosition + Math.floor(index / 2) * 8;
                
                doc.text(label, x, y);
                doc.setTextColor(67, 97, 238);
                doc.text(value.toString(), x + 70, y);
                doc.setTextColor(100, 100, 100);
            });
            
            yPosition += Math.ceil(stats.length / 2) * 8 + 15;
            
            // Seção 2: Produtos para Repor
            doc.setFontSize(18);
            doc.setTextColor(33, 37, 41);
            doc.text('2. Produtos para Repor', margin, yPosition);
            yPosition += 10;
            
            const restockProducts = this.products
                .filter(p => p.quantity < p.minimumStock)
                .slice(0, 10); // Limita a 10 produtos
            
            if (restockProducts.length > 0) {
                doc.setFontSize(10);
                doc.setTextColor(67, 97, 238);
                
                // Cabeçalho da tabela
                doc.text('Produto', margin, yPosition);
                doc.text('Estoque Atual', margin + 100, yPosition);
                doc.text('Estoque Mínimo', margin + 150, yPosition);
                doc.text('Necessário', margin + 200, yPosition);
                doc.text('Status', margin + 250, yPosition);
                
                yPosition += 5;
                doc.setDrawColor(200, 200, 200);
                doc.line(margin, yPosition, pageWidth - margin, yPosition);
                yPosition += 5;
                
                doc.setFontSize(9);
                doc.setTextColor(80, 80, 80);
                
                restockProducts.forEach((product, index) => {
                    if (yPosition > pageHeight - 40) {
                        doc.addPage();
                        yPosition = 20;
                    }
                    
                    const needed = product.minimumStock - product.quantity;
                    let status = 'Normal';
                    if (product.expirationStatus === 'expired') status = 'VENCIDO';
                    else if (product.expirationStatus === 'expiring_soon') status = 'Próximo do Vencimento';
                    
                    doc.text(product.name.substring(0, 30), margin, yPosition);
                    doc.text(product.quantity.toString(), margin + 100, yPosition);
                    doc.text(product.minimumStock.toString(), margin + 150, yPosition);
                    doc.text(needed.toString(), margin + 200, yPosition);
                    
                    if (status === 'VENCIDO') {
                        doc.setTextColor(249, 65, 68);
                    } else if (status === 'Próximo do Vencimento') {
                        doc.setTextColor(248, 150, 30);
                    }
                    
                    doc.text(status, margin + 250, yPosition);
                    doc.setTextColor(80, 80, 80);
                    
                    yPosition += 8;
                });
            } else {
                doc.setFontSize(11);
                doc.setTextColor(100, 100, 100);
                doc.text('Nenhum produto precisa de reposição no momento.', margin, yPosition);
                yPosition += 15;
            }
            
            yPosition += 10;
            
            // Seção 3: Histórico de Retiradas (últimas 20)
            doc.setFontSize(18);
            doc.setTextColor(33, 37, 41);
            doc.text('3. Histórico de Retiradas', margin, yPosition);
            yPosition += 10;
            
            const recentWithdrawals = [...this.withdrawals]
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .slice(0, 20);
            
            if (recentWithdrawals.length > 0) {
                doc.setFontSize(10);
                doc.setTextColor(67, 97, 238);
                
                // Cabeçalho da tabela
                doc.text('Data/Hora', margin, yPosition);
                doc.text('Produto', margin + 60, yPosition);
                doc.text('Quantidade', margin + 160, yPosition);
                doc.text('Usuário', margin + 210, yPosition);
                
                yPosition += 5;
                doc.setDrawColor(200, 200, 200);
                doc.line(margin, yPosition, pageWidth - margin, yPosition);
                yPosition += 5;
                
                doc.setFontSize(9);
                doc.setTextColor(80, 80, 80);
                
                recentWithdrawals.forEach((withdrawal, index) => {
                    if (yPosition > pageHeight - 40) {
                        doc.addPage();
                        yPosition = 20;
                    }
                    
                    const date = new Date(withdrawal.timestamp);
                    const formattedDate = date.toLocaleDateString('pt-BR');
                    const formattedTime = date.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
                    
                    doc.text(`${formattedDate} ${formattedTime}`, margin, yPosition);
                    doc.text(withdrawal.productName.substring(0, 30), margin + 60, yPosition);
                    doc.text(withdrawal.quantity.toString(), margin + 160, yPosition);
                    doc.text(withdrawal.user || 'Usuário', margin + 210, yPosition);
                    
                    yPosition += 8;
                });
            } else {
                doc.setFontSize(11);
                doc.setTextColor(100, 100, 100);
                doc.text('Nenhuma retirada registrada.', margin, yPosition);
            }
            
            // Rodapé
            doc.setFontSize(10);
            doc.setTextColor(150, 150, 150);
            doc.text('StockMaster - Sistema de Gerenciamento de Estoque', pageWidth / 2, pageHeight - 10, { align: 'center' });
            doc.text(`Página ${doc.internal.getNumberOfPages()}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
            
            // Salva o PDF
            doc.save(`relatorio_estoque_${new Date().toISOString().split('T')[0]}.pdf`);
            
            this.showToast('Relatório PDF gerado com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao gerar PDF:', error);
            this.showToast('Erro ao gerar relatório PDF', 'danger');
        }
    }
    
    // ========== MODAL ==========
    
    // Mostra modal
    showModal() {
        if (this.confirmationModal) {
            this.confirmationModal.classList.add('active');
        }
    }
    
    // Esconde modal
    hideModal() {
        if (this.confirmationModal) {
            this.confirmationModal.classList.remove('active');
        }
        this.pendingAction = null;
        this.pendingActionData = null;
    }
    
    // Executa ação pendente
    executePendingAction() {
        if (this.pendingAction === 'deleteProduct') {
            this.deleteProduct(this.pendingActionData);
        } else if (this.pendingAction === 'clearData') {
            this.clearAllData();
        }
        
        this.hideModal();
    }
    
    // ========== LIMPEZA DE DADOS ==========
    
    // Confirma limpeza de dados
    confirmClearData() {
        this.pendingAction = 'clearData';
        
        if (this.modalTitle) this.modalTitle.textContent = 'Limpar Todos os Dados';
        if (this.modalMessage) {
            this.modalMessage.innerHTML = `
                <strong>Atenção!</strong> Esta ação irá apagar todos os produtos, retiradas e atividades.
                <br><br>
                <small>Esta ação não pode ser desfeita. Todos os dados serão perdidos permanentemente.</small>
            `;
        }
        
        this.showModal();
    }
    
    // Limpa todos os dados
    clearAllData() {
        if (!this.db) return;
        
        try {
            const transaction = this.db.transaction(['products', 'activities', 'withdrawals'], 'readwrite');
            const productStore = transaction.objectStore('products');
            const activityStore = transaction.objectStore('activities');
            const withdrawalStore = transaction.objectStore('withdrawals');
            
            productStore.clear();
            activityStore.clear();
            withdrawalStore.clear();
            
            transaction.oncomplete = () => {
                this.products = [];
                this.withdrawals = [];
                this.activities = [];
                this.loadProducts();
                this.loadWithdrawals();
                this.loadActivities();
                this.showToast('Todos os dados foram apagados', 'warning');
            };
            
            transaction.onerror = (event) => {
                console.error('Erro ao limpar dados:', event.target.error);
                this.showToast('Erro ao limpar dados', 'danger');
            };
        } catch (error) {
            console.error('Erro na transação de limpeza:', error);
            this.showToast('Erro ao limpar dados', 'danger');
        }
    }
    
    // ========== TOAST NOTIFICATIONS ==========
    
    // Mostra toast notification
    showToast(message, type = 'info') {
        if (!this.toastContainer) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: 'fas fa-check-circle',
            warning: 'fas fa-exclamation-triangle',
            danger: 'fas fa-times-circle',
            info: 'fas fa-info-circle'
        };
        
        toast.innerHTML = `
            <div class="toast-icon">
                <i class="${icons[type]}"></i>
            </div>
            <div class="toast-content">
                <p>${message}</p>
            </div>
        `;
        
        this.toastContainer.appendChild(toast);
        
        // Remove após 5 segundos
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 5000);
    }
    
    // ========== MÉTODOS AUXILIARES ==========
    
    // Carrega lista de produtos
    loadProductsList() {
        if (!this.productsList) return;
        
        if (this.products.length === 0) {
            this.productsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-box-open"></i>
                    <h4>Nenhum produto cadastrado</h4>
                    <p>Comece cadastrando seu primeiro produto</p>
                    <button class="btn-primary" data-page="cadastro">
                        <i class="fas fa-plus"></i> Cadastrar Produto
                    </button>
                </div>
            `;
            
            // Adiciona event listener ao botão
            const button = this.productsList.querySelector('.btn-primary');
            if (button) {
                button.addEventListener('click', () => this.showPage('cadastro'));
            }
        } else {
            this.filterProducts();
        }
    }
}

// Inicializa a aplicação quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    const stockManager = new StockManager();
    
    // Adiciona tratamento para limpar banco de dados se houver erro de versão
    const clearDBButton = document.createElement('button');
    clearDBButton.textContent = 'Limpar Banco de Dados (Erro de Versão)';
    clearDBButton.style.position = 'fixed';
    clearDBButton.style.bottom = '10px';
    clearDBButton.style.right = '10px';
    clearDBButton.style.zIndex = '9999';
    clearDBButton.style.padding = '10px';
    clearDBButton.style.background = '#f94144';
    clearDBButton.style.color = 'white';
    clearDBButton.style.border = 'none';
    clearDBButton.style.borderRadius = '5px';
    clearDBButton.style.cursor = 'pointer';
    clearDBButton.style.display = 'none';
    
    clearDBButton.addEventListener('click', () => {
        indexedDB.deleteDatabase('StockMasterDB');
        location.reload();
    });
    
    document.body.appendChild(clearDBButton);
    
    // Verifica se há erro de versão
    setTimeout(() => {
        const request = indexedDB.open('StockMasterDB');
        request.onerror = (event) => {
            if (event.target.error.name === 'VersionError') {
                clearDBButton.style.display = 'block';
                console.error('Erro de versão detectado. Clique no botão vermelho para corrigir.');
            }
        };
        request.onupgradeneeded = () => {
            clearDBButton.style.display = 'none';
        };
    }, 1000);
});