// Sistema de Gestão Empresarial - Corrigido

class ManagementSystem {
    constructor() {
        this.clients = this.loadData('clients') || [];
        this.products = this.loadData('products') || this.getDefaultProducts();
        this.sales = this.loadData('sales') || [];
        this.currentView = 'clients';
    }

    init() {
        this.setupEventListeners();
        this.showView('clients');
    }

    setupEventListeners() {
        // Navegação
        this.setupNavigation();
        
        // Formulários
        this.setupForms();
    }

    setupNavigation() {
        const views = ['clients', 'products', 'sales', 'reports'];
        
        views.forEach(view => {
            const btn = document.getElementById(`mgmt-nav-${view}`);
            if (btn) {
                btn.addEventListener('click', () => this.showView(view));
            }
        });
    }

    setupForms() {
        const forms = ['client', 'product', 'sale'];
        
        forms.forEach(form => {
            const formElement = document.getElementById(`mgmt-${form}-form`);
            if (formElement) {
                formElement.addEventListener('submit', (e) => this.handleFormSubmit(e, form));
            }
        });
    }

    showView(view) {
        this.currentView = view;
        
        // Esconder todas as views
        document.querySelectorAll('.mgmt-view').forEach(v => {
            v.style.display = 'none';
        });
        
        // Mostrar view atual
        const currentView = document.getElementById(`mgmt-${view}-view`);
        if (currentView) {
            currentView.style.display = 'block';
        }
        
        // Atualizar navegação ativa
        document.querySelectorAll('.mgmt-nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = document.getElementById(`mgmt-nav-${view}`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
        
        // Renderizar dados da view
        this.renderView(view);
    }

    renderView(view) {
        switch(view) {
            case 'clients':
                this.renderClients();
                break;
            case 'products':
                this.renderProducts();
                break;
            case 'sales':
                this.renderSales();
                break;
            case 'reports':
                this.renderReports();
                break;
        }
    }

    // CLIENTES
    handleClientSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        const client = {
            id: Date.now(),
            name: formData.get('name'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            address: formData.get('address'),
            createdAt: new Date().toISOString()
        };

        this.clients.push(client);
        this.saveData('clients', this.clients);
        this.renderClients();
        e.target.reset();
        
        this.showNotification('Cliente cadastrado com sucesso!');
    }

    renderClients() {
        const tbody = document.getElementById('mgmt-clients-tbody');
        if (!tbody) return;

        tbody.innerHTML = this.clients.map(client => `
            <tr>
                <td>${client.name}</td>
                <td>${client.email}</td>
                <td>${client.phone}</td>
                <td>${client.address}</td>
                <td>
                    <button onclick="managementSystem.editClient(${client.id})" class="btn btn-outline" style="padding: 5px 10px;">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="managementSystem.deleteClient(${client.id})" class="btn" style="padding: 5px 10px; background: var(--accent);">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    editClient(id) {
        const client = this.clients.find(c => c.id === id);
        if (client) {
            const newName = prompt('Editar nome:', client.name);
            const newEmail = prompt('Editar email:', client.email);
            
            if (newName && newEmail) {
                client.name = newName;
                client.email = newEmail;
                this.saveData('clients', this.clients);
                this.renderClients();
                this.showNotification('Cliente atualizado!');
            }
        }
    }

    deleteClient(id) {
        if (confirm('Tem certeza que deseja excluir este cliente?')) {
            this.clients = this.clients.filter(c => c.id !== id);
            this.saveData('clients', this.clients);
            this.renderClients();
            this.showNotification('Cliente excluído!');
        }
    }

    // PRODUTOS
    handleProductSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        const product = {
            id: Date.now(),
            name: formData.get('name'),
            category: formData.get('category'),
            price: parseFloat(formData.get('price')),
            stock: parseInt(formData.get('stock')),
            description: formData.get('description'),
            createdAt: new Date().toISOString()
        };

        this.products.push(product);
        this.saveData('products', this.products);
        this.renderProducts();
        e.target.reset();
        
        this.showNotification('Produto cadastrado com sucesso!');
    }

    renderProducts() {
        const tbody = document.getElementById('mgmt-products-tbody');
        if (!tbody) return;

        tbody.innerHTML = this.products.map(product => `
            <tr>
                <td>${product.name}</td>
                <td>${product.category}</td>
                <td>R$ ${product.price.toFixed(2)}</td>
                <td>${product.stock}</td>
                <td>${product.description}</td>
                <td>
                    <button onclick="managementSystem.editProduct(${product.id})" class="btn btn-outline" style="padding: 5px 10px;">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="managementSystem.deleteProduct(${product.id})" class="btn" style="padding: 5px 10px; background: var(--accent);">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        // Atualizar select de produtos no formulário de vendas
        this.updateProductsSelect();
    }

    editProduct(id) {
        const product = this.products.find(p => p.id === id);
        if (product) {
            const newName = prompt('Editar nome:', product.name);
            const newPrice = prompt('Editar preço:', product.price);
            
            if (newName && newPrice) {
                product.name = newName;
                product.price = parseFloat(newPrice);
                this.saveData('products', this.products);
                this.renderProducts();
                this.showNotification('Produto atualizado!');
            }
        }
    }

    deleteProduct(id) {
        if (confirm('Tem certeza que deseja excluir este produto?')) {
            this.products = this.products.filter(p => p.id !== id);
            this.saveData('products', this.products);
            this.renderProducts();
            this.showNotification('Produto excluído!');
        }
    }

    updateProductsSelect() {
        const select = document.getElementById('sale-product');
        if (!select) return;

        select.innerHTML = '<option value="">Selecione um produto</option>' +
            this.products.map(product => 
                `<option value="${product.id}" data-price="${product.price}">${product.name} - R$ ${product.price.toFixed(2)}</option>`
            ).join('');
    }

    // VENDAS
    handleSaleSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const productId = parseInt(formData.get('product'));
        const quantity = parseInt(formData.get('quantity'));
        const clientName = formData.get('client-name');

        const product = this.products.find(p => p.id === productId);
        
        if (!product) {
            alert('Produto não encontrado!');
            return;
        }

        if (product.stock < quantity) {
            alert('Estoque insuficiente!');
            return;
        }

        // Atualizar estoque
        product.stock -= quantity;
        this.saveData('products', this.products);

        const sale = {
            id: Date.now(),
            productId: product.id,
            productName: product.name,
            clientName: clientName,
            quantity: quantity,
            unitPrice: product.price,
            totalPrice: product.price * quantity,
            date: new Date().toISOString()
        };

        this.sales.push(sale);
        this.saveData('sales', this.sales);
        this.renderSales();
        this.renderProducts(); // Atualizar lista de produtos
        e.target.reset();
        
        this.showNotification('Venda registrada com sucesso!');
    }

    renderSales() {
        const tbody = document.getElementById('mgmt-sales-tbody');
        if (!tbody) return;

        tbody.innerHTML = this.sales.map(sale => `
            <tr>
                <td>${sale.productName}</td>
                <td>${sale.clientName}</td>
                <td>${sale.quantity}</td>
                <td>R$ ${sale.unitPrice.toFixed(2)}</td>
                <td>R$ ${sale.totalPrice.toFixed(2)}</td>
                <td>${new Date(sale.date).toLocaleDateString()}</td>
            </tr>
        `).join('');
    }

    // RELATÓRIOS
    renderReports() {
        const container = document.getElementById('mgmt-reports-content');
        if (!container) return;

        const totalSales = this.sales.reduce((sum, sale) => sum + sale.totalPrice, 0);
        const totalClients = this.clients.length;
        const totalProducts = this.products.length;
        const lowStockProducts = this.products.filter(p => p.stock < 10).length;

        container.innerHTML = `
            <div class="reports-grid">
                <div class="report-card">
                    <h3>📊 Vendas Totais</h3>
                    <div class="report-value">R$ ${totalSales.toFixed(2)}</div>
                </div>
                <div class="report-card">
                    <h3>👥 Total de Clientes</h3>
                    <div class="report-value">${totalClients}</div>
                </div>
                <div class="report-card">
                    <h3>📦 Total de Produtos</h3>
                    <div class="report-value">${totalProducts}</div>
                </div>
                <div class="report-card">
                    <h3>⚠️ Produtos com Estoque Baixo</h3>
                    <div class="report-value">${lowStockProducts}</div>
                </div>
            </div>
            
            <div class="charts-container">
                <div class="chart-card">
                    <h3>Vendas por Produto</h3>
                    <canvas id="salesChart" width="400" height="200"></canvas>
                </div>
                <div class="chart-card">
                    <h3>Estoque por Categoria</h3>
                    <canvas id="stockChart" width="400" height="200"></canvas>
                </div>
            </div>
        `;

        this.renderCharts();
    }

    renderCharts() {
        // Gráfico de vendas por produto
        const salesByProduct = {};
        this.sales.forEach(sale => {
            salesByProduct[sale.productName] = (salesByProduct[sale.productName] || 0) + sale.totalPrice;
        });

        const salesCtx = document.getElementById('salesChart');
        if (salesCtx) {
            new Chart(salesCtx, {
                type: 'bar',
                data: {
                    labels: Object.keys(salesByProduct),
                    datasets: [{
                        label: 'Vendas (R$)',
                        data: Object.values(salesByProduct),
                        backgroundColor: 'rgba(52, 152, 219, 0.8)'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }

        // Gráfico de estoque por categoria
        const stockByCategory = {};
        this.products.forEach(product => {
            stockByCategory[product.category] = (stockByCategory[product.category] || 0) + product.stock;
        });

        const stockCtx = document.getElementById('stockChart');
        if (stockCtx) {
            new Chart(stockCtx, {
                type: 'pie',
                data: {
                    labels: Object.keys(stockByCategory),
                    datasets: [{
                        data: Object.values(stockByCategory),
                        backgroundColor: [
                            'rgba(52, 152, 219, 0.8)',
                            'rgba(46, 204, 113, 0.8)',
                            'rgba(155, 89, 182, 0.8)',
                            'rgba(241, 196, 15, 0.8)'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        }
    }

    // UTILITIES
    getDefaultProducts() {
        return [
            {
                id: 1,
                name: "Notebook Dell",
                category: "Informática",
                price: 2500.00,
                stock: 10,
                description: "Notebook Dell Inspiron 15",
                createdAt: new Date().toISOString()
            },
            {
                id: 2,
                name: "Mouse Logitech",
                category: "Acessórios",
                price: 89.90,
                stock: 25,
                description: "Mouse sem fio Logitech",
                createdAt: new Date().toISOString()
            }
        ];
    }

    loadData(key) {
        const saved = localStorage.getItem(`management_${key}`);
        return saved ? JSON.parse(saved) : null;
    }

    saveData(key, data) {
        localStorage.setItem(`management_${key}`, JSON.stringify(data));
    }

    showNotification(message) {
        // Remover notificações existentes
        document.querySelectorAll('.mgmt-notification').forEach(n => n.remove());
        
        const notification = document.createElement('div');
        notification.className = 'mgmt-notification';
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: var(--success);
            color: white;
            padding: 15px 20px;
            border-radius: 5px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            z-index: 4000;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Instanciar o sistema quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    window.managementSystem = new ManagementSystem();
});