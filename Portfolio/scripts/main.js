// scripts/main.js

// Funções principais do portfólio

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
        });
    });
});

// Form submission
document.getElementById('contactForm').addEventListener('submit', function(e) {
    e.preventDefault();
    alert('Obrigado pela mensagem! Entrarei em contato em breve.');
    this.reset();
});

// Header background on scroll
window.addEventListener('scroll', function() {
    const header = document.querySelector('header');
    if (window.scrollY > 100) {
        header.style.background = 'var(--primary)';
    } else {
        header.style.background = 'linear-gradient(135deg, var(--primary), var(--secondary))';
    }
});

// Modal functions
function openProject(projectId) {
    // Criar modal dinamicamente baseado no projeto
    createProjectModal(projectId);
    
    document.getElementById(projectId).style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    // Inicializar projetos específicos quando abrir
    switch(projectId) {
        case 'project1':
            if (typeof managementSystem !== 'undefined') {
                managementSystem.init();
            }
            break;
        case 'project2':
            if (typeof nodeAPI !== 'undefined') {
                nodeAPI.loadUsers();
                nodeAPI.setupAPITester();
            }
            break;
        case 'project3':
            if (typeof analyticsDashboard !== 'undefined') {
                analyticsDashboard.init();
            }
            break;
        case 'project4':
            if (typeof javaStore !== 'undefined') {
                // Já inicializado no constructor
            }
            break;
        case 'project5':
            if (typeof taskManager !== 'undefined') {
                // Já inicializado no constructor
            }
            break;
        case 'project6':
            if (typeof mlModel !== 'undefined') {
                // Já inicializado no constructor
            }
            break;
    }
}

function closeModal(projectId) {
    const modal = document.getElementById(projectId);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// Close modal with Escape key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        });
    }
});

// Criar modais dinamicamente
function createProjectModal(projectId) {
    if (document.getElementById(projectId)) return; // Já existe
    
    const modal = document.createElement('div');
    modal.id = projectId;
    modal.className = 'modal';
    
    let modalContent = '';
    
    switch(projectId) {
        case 'project1':
            modalContent = createManagementSystemModal();
            break;
        case 'project2':
            modalContent = createNodeAPIModal();
            break;
        case 'project3':
            modalContent = createAnalyticsDashboardModal();
            break;
        case 'project4':
            modalContent = createJavaStoreModal();
            break;
        case 'project5':
            modalContent = createTaskManagerModal();
            break;
        case 'project6':
            modalContent = createMLAPIModal();
            break;
    }
    
    modal.innerHTML = modalContent;
    document.body.appendChild(modal);
}

// Funções para criar conteúdo dos modais
function createManagementSystemModal() {
    return `
        <div class="modal-content">
            <span class="close-modal" onclick="closeModal('project1')">&times;</span>
            <h2>Sistema de Gestão Empresarial</h2>
            <div class="project-demo">
                <h3>Demo - Sistema Completo de Gestão</h3>
                <div class="demo-container">
                    <div id="management-system-demo">
                        <div class="mgmt-nav">
                            <button id="mgmt-nav-clients" class="mgmt-nav-btn active">👥 Clientes</button>
                            <button id="mgmt-nav-products" class="mgmt-nav-btn">📦 Produtos</button>
                            <button id="mgmt-nav-sales" class="mgmt-nav-btn">💰 Vendas</button>
                            <button id="mgmt-nav-reports" class="mgmt-nav-btn">📊 Relatórios</button>
                        </div>

                        <div id="mgmt-clients-view" class="mgmt-view">
                            <h4>Cadastro de Clientes</h4>
                            <form id="mgmt-client-form" class="contact-form" style="margin-bottom: 20px;">
                                <div class="form-group">
                                    <label for="client-name">Nome:</label>
                                    <input type="text" id="client-name" name="name" required>
                                </div>
                                <div class="form-group">
                                    <label for="client-email">Email:</label>
                                    <input type="email" id="client-email" name="email" required>
                                </div>
                                <div class="form-group">
                                    <label for="client-phone">Telefone:</label>
                                    <input type="tel" id="client-phone" name="phone">
                                </div>
                                <div class="form-group">
                                    <label for="client-address">Endereço:</label>
                                    <input type="text" id="client-address" name="address">
                                </div>
                                <button type="submit" class="btn">Cadastrar Cliente</button>
                            </form>

                            <h4>Clientes Cadastrados</h4>
                            <table class="mgmt-table">
                                <thead>
                                    <tr>
                                        <th>Nome</th>
                                        <th>Email</th>
                                        <th>Telefone</th>
                                        <th>Endereço</th>
                                        <th>Ações</th>
                                    </tr>
                                </thead>
                                <tbody id="mgmt-clients-tbody"></tbody>
                            </table>
                        </div>

                        <div id="mgmt-products-view" class="mgmt-view" style="display: none;">
                            <h4>Cadastro de Produtos</h4>
                            <form id="mgmt-product-form" class="contact-form" style="margin-bottom: 20px;">
                                <div class="form-group">
                                    <label for="product-name">Nome:</label>
                                    <input type="text" id="product-name" name="name" required>
                                </div>
                                <div class="form-group">
                                    <label for="product-category">Categoria:</label>
                                    <input type="text" id="product-category" name="category" required>
                                </div>
                                <div class="form-group">
                                    <label for="product-price">Preço (R$):</label>
                                    <input type="number" id="product-price" name="price" step="0.01" required>
                                </div>
                                <div class="form-group">
                                    <label for="product-stock">Estoque:</label>
                                    <input type="number" id="product-stock" name="stock" required>
                                </div>
                                <div class="form-group">
                                    <label for="product-description">Descrição:</label>
                                    <textarea id="product-description" name="description"></textarea>
                                </div>
                                <button type="submit" class="btn">Cadastrar Produto</button>
                            </form>

                            <h4>Produtos Cadastrados</h4>
                            <table class="mgmt-table">
                                <thead>
                                    <tr>
                                        <th>Nome</th>
                                        <th>Categoria</th>
                                        <th>Preço</th>
                                        <th>Estoque</th>
                                        <th>Descrição</th>
                                        <th>Ações</th>
                                    </tr>
                                </thead>
                                <tbody id="mgmt-products-tbody"></tbody>
                            </table>
                        </div>

                        <div id="mgmt-sales-view" class="mgmt-view" style="display: none;">
                            <h4>Registro de Vendas</h4>
                            <form id="mgmt-sale-form" class="contact-form" style="margin-bottom: 20px;">
                                <div class="form-group">
                                    <label for="sale-product">Produto:</label>
                                    <select id="sale-product" name="product" required>
                                        <option value="">Selecione um produto</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label for="sale-quantity">Quantidade:</label>
                                    <input type="number" id="sale-quantity" name="quantity" required>
                                </div>
                                <div class="form-group">
                                    <label for="sale-client">Nome do Cliente:</label>
                                    <input type="text" id="sale-client" name="client-name" required>
                                </div>
                                <button type="submit" class="btn">Registrar Venda</button>
                            </form>

                            <h4>Histórico de Vendas</h4>
                            <table class="mgmt-table">
                                <thead>
                                    <tr>
                                        <th>Produto</th>
                                        <th>Cliente</th>
                                        <th>Quantidade</th>
                                        <th>Preço Unit.</th>
                                        <th>Total</th>
                                        <th>Data</th>
                                    </tr>
                                </thead>
                                <tbody id="mgmt-sales-tbody"></tbody>
                            </table>
                        </div>

                        <div id="mgmt-reports-view" class="mgmt-view" style="display: none;">
                            <h4>Relatórios e Analytics</h4>
                            <div id="mgmt-reports-content"></div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="project-tech">
                <h3>Tecnologias Utilizadas</h3>
                <p><strong>Backend:</strong> PHP, MySQL, Arquitetura MVC</p>
                <p><strong>Frontend:</strong> JavaScript, HTML5, CSS3, Chart.js</p>
                <p><strong>Funcionalidades:</strong> CRUD completo, Relatórios, Gestão de estoque</p>
            </div>
        </div>
    `;
}

function createNodeAPIModal() {
    return `
        <div class="modal-content">
            <span class="close-modal" onclick="closeModal('project2')">&times;</span>
            <h2>API REST com Node.js</h2>
            <div class="project-demo">
                <h3>Demo - API REST Completa</h3>
                <div class="demo-container">
                    <div id="node-api-demo">
                        <div class="api-nav">
                            <button id="api-nav-users" class="api-nav-btn active">👥 Usuários</button>
                            <button id="api-nav-posts" class="api-nav-btn">📝 Posts</button>
                            <button id="api-nav-products" class="api-nav-btn">📦 Produtos</button>
                            <button id="api-nav-test" class="api-nav-btn">🔧 Testar API</button>
                        </div>

                        <div id="api-users-section" class="api-section">
                            <h4>Gerenciamento de Usuários</h4>
                            <form id="api-user-form" class="contact-form" style="margin-bottom: 20px;">
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                                    <div class="form-group">
                                        <label for="user-name">Nome:</label>
                                        <input type="text" id="user-name" name="name" required>
                                    </div>
                                    <div class="form-group">
                                        <label for="user-email">Email:</label>
                                        <input type="email" id="user-email" name="email" required>
                                    </div>
                                    <div class="form-group">
                                        <label for="user-phone">Telefone:</label>
                                        <input type="tel" id="user-phone" name="phone">
                                    </div>
                                    <div class="form-group">
                                        <label for="user-company">Empresa:</label>
                                        <input type="text" id="user-company" name="company">
                                    </div>
                                </div>
                                <button type="submit" class="btn">Criar Usuário</button>
                            </form>

                            <h4>Usuários</h4>
                            <table class="mgmt-table">
                                <thead>
                                    <tr>
                                        <th>Nome</th>
                                        <th>Email</th>
                                        <th>Telefone</th>
                                        <th>Empresa</th>
                                        <th>Ações</th>
                                    </tr>
                                </thead>
                                <tbody id="api-users-tbody"></tbody>
                            </table>
                        </div>

                        <div id="api-posts-section" class="api-section" style="display: none;">
                            <h4>Gerenciamento de Posts</h4>
                            <form id="api-post-form" class="contact-form" style="margin-bottom: 20px;">
                                <div class="form-group">
                                    <label for="post-title">Título:</label>
                                    <input type="text" id="post-title" name="title" required>
                                </div>
                                <div class="form-group">
                                    <label for="post-body">Conteúdo:</label>
                                    <textarea id="post-body" name="body" required></textarea>
                                </div>
                                <button type="submit" class="btn">Criar Post</button>
                            </form>

                            <h4>Posts Recentes</h4>
                            <div id="api-posts-container"></div>
                        </div>

                        <div id="api-products-section" class="api-section" style="display: none;">
                            <h4>Gerenciamento de Produtos</h4>
                            <form id="api-product-form" class="contact-form" style="margin-bottom: 20px;">
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                                    <div class="form-group">
                                        <label for="api-product-name">Nome:</label>
                                        <input type="text" id="api-product-name" name="name" required>
                                    </div>
                                    <div class="form-group">
                                        <label for="api-product-category">Categoria:</label>
                                        <input type="text" id="api-product-category" name="category" required>
                                    </div>
                                    <div class="form-group">
                                        <label for="api-product-price">Preço (R$):</label>
                                        <input type="number" id="api-product-price" name="price" step="0.01" required>
                                    </div>
                                    <div class="form-group">
                                        <label for="api-product-stock">Estoque:</label>
                                        <input type="number" id="api-product-stock" name="stock" required>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label for="api-product-description">Descrição:</label>
                                    <textarea id="api-product-description" name="description"></textarea>
                                </div>
                                <button type="submit" class="btn">Criar Produto</button>
                            </form>

                            <h4>Produtos</h4>
                            <div id="api-products-container"></div>
                        </div>

                        <div id="api-test-section" class="api-section" style="display: none;">
                            <h4>Testador de API REST</h4>
                            <div style="margin-bottom: 20px;">
                                <p>Teste diferentes métodos HTTP em uma API real:</p>
                                <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 20px;">
                                    <button id="api-test-get" class="btn" style="background: #28a745;">GET</button>
                                    <button id="api-test-post" class="btn" style="background: #ffc107; color: #000;">POST</button>
                                    <button id="api-test-put" class="btn" style="background: #17a2b8;">PUT</button>
                                    <button id="api-test-delete" class="btn" style="background: #dc3545;">DELETE</button>
                                </div>
                            </div>

                            <h4>Resposta da API</h4>
                            <div id="api-test-output" style="background: #f8f9fa; padding: 20px; border-radius: 5px; min-height: 200px; font-family: monospace;">
                                Clique em um método para testar a API...
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="project-tech">
                <h3>Tecnologias Utilizadas</h3>
                <p><strong>Backend:</strong> Node.js, Express.js, MongoDB</p>
                <p><strong>API:</strong> RESTful, JWT Authentication, CORS</p>
                <p><strong>Features:</strong> CRUD completo, Documentação Swagger, Rate Limiting</p>
            </div>
        </div>
    `;
}

// ... (as outras funções create*Modal seguem o mesmo padrão)

function createAnalyticsDashboardModal() {
    return `
        <div class="modal-content">
            <span class="close-modal" onclick="closeModal('project3')">&times;</span>
            <h2>Dashboard de Analytics</h2>
            <div class="project-demo">
                <h3>Demo - Dashboard Interativo</h3>
                <div class="demo-container">
                    <div id="analytics-dashboard-demo">
                        <div class="analytics-controls">
                            <div class="metric-selector">
                                <button id="metric-sales" class="metric-btn active">📈 Vendas</button>
                                <button id="metric-users" class="metric-btn">👥 Usuários</button>
                                <button id="metric-revenue" class="metric-btn">💰 Receita</button>
                                <button id="metric-conversion" class="metric-btn">🎯 Conversão</button>
                            </div>
                            <div class="period-selector">
                                <button id="period-day" class="period-btn">Dia</button>
                                <button id="period-week" class="period-btn">Semana</button>
                                <button id="period-month" class="period-btn active">Mês</button>
                                <button id="period-year" class="period-btn">Ano</button>
                            </div>
                            <button id="refresh-data" class="btn">🔄 Atualizar Dados</button>
                        </div>

                        <div class="analytics-metrics" id="analytics-metrics"></div>

                        <div class="analytics-charts">
                            <div class="analytics-chart-card">
                                <canvas id="analytics-main-chart" width="400" height="200"></canvas>
                            </div>
                            <div class="analytics-chart-card">
                                <canvas id="analytics-category-chart" width="400" height="200"></canvas>
                            </div>
                        </div>

                        <div class="analytics-charts">
                            <div class="analytics-chart-card">
                                <canvas id="analytics-region-chart" width="400" height="200"></canvas>
                            </div>
                            <div class="analytics-chart-card">
                                <canvas id="analytics-realtime-chart" width="400" height="200"></canvas>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="project-tech">
                <h3>Tecnologias Utilizadas</h3>
                <p><strong>Backend:</strong> Python Flask, Pandas, SQLAlchemy</p>
                <p><strong>Visualização:</strong> Chart.js, D3.js, Plotly</p>
                <p><strong>Análise:</strong> Estatística descritiva, Séries temporais, Previsões</p>
            </div>
        </div>
    `;
}

function createJavaStoreModal() {
    return `
        <div class="modal-content">
            <span class="close-modal" onclick="closeModal('project4')">&times;</span>
            <h2>Loja Virtual Java</h2>
            <div class="project-demo">
                <h3>Demo - E-commerce Completo</h3>
                <div class="demo-container">
                    <div id="java-store-demo">
                        <div class="store-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                            <h4>Loja Virtual</h4>
                            <div class="cart-info">
                                <span id="cart-count">0 itens</span>
                                <button onclick="viewCart()" class="btn">Ver Carrinho</button>
                            </div>
                        </div>
                        
                        <div class="products-grid" id="products-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px;"></div>
                        
                        <div id="cart-modal" style="display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 2rem; border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); z-index: 3000; width: 90%; max-width: 500px;">
                            <h3>Meu Carrinho</h3>
                            <div id="cart-items"></div>
                            <div id="cart-total" style="margin: 20px 0; font-weight: bold;"></div>
                            <button onclick="closeCart()" class="btn btn-outline">Continuar Comprando</button>
                            <button onclick="checkout()" class="btn">Finalizar Compra</button>
                        </div>
                    </div>
                </div>
            </div>
            <div class="project-tech">
                <h3>Tecnologias Utilizadas</h3>
                <p><strong>Backend:</strong> Java Spring Boot, MySQL, JPA/Hibernate</p>
                <p><strong>Frontend:</strong> Thymeleaf, JavaScript, Bootstrap</p>
                <p><strong>Funcionalidades:</strong> Catálogo, Carrinho, Checkout, Gestão de Pedidos</p>
            </div>
        </div>
    `;
}

function createTaskManagerModal() {
    return `
        <div class="modal-content">
            <span class="close-modal" onclick="closeModal('project5')">&times;</span>
            <h2>Gerenciador de Tarefas</h2>
            <div class="project-demo">
                <h3>Demo - Gerenciador de Tarefas Interativo</h3>
                <div class="demo-container">
                    <div id="task-manager-demo">
                        <div class="task-input" style="margin-bottom: 20px;">
                            <input type="text" id="taskTitle" placeholder="Título da tarefa" style="padding: 10px; width: 60%; margin-right: 10px;">
                            <select id="taskPriority" style="padding: 10px; margin-right: 10px;">
                                <option value="baixa">Baixa</option>
                                <option value="media">Média</option>
                                <option value="alta">Alta</option>
                            </select>
                            <button onclick="addTask()" class="btn">Adicionar Tarefa</button>
                        </div>
                        
                        <div class="task-filters" style="margin-bottom: 20px;">
                            <button onclick="filterTasks('all')" class="btn btn-outline">Todas</button>
                            <button onclick="filterTasks('pending')" class="btn btn-outline">Pendentes</button>
                            <button onclick="filterTasks('completed')" class="btn btn-outline">Concluídas</button>
                        </div>
                        
                        <div id="tasks-list"></div>
                        <div id="tasks-stats" style="margin-top: 20px; padding: 10px; background: #f8f9fa; border-radius: 5px;"></div>
                    </div>
                </div>
            </div>
            <div class="project-tech">
                <h3>Tecnologias Utilizadas</h3>
                <p><strong>Frontend:</strong> JavaScript, HTML5, CSS3, Local Storage</p>
                <p><strong>Funcionalidades:</strong> CRUD completo, filtros, estatísticas, drag & drop</p>
                <p><strong>Backend:</strong> PHP (simulado), MySQL (simulado com Local Storage)</p>
            </div>
        </div>
    `;
}

function createMLAPIModal() {
    return `
        <div class="modal-content">
            <span class="close-modal" onclick="closeModal('project6')">&times;</span>
            <h2>API de Machine Learning</h2>
            <div class="project-demo">
                <h3>Demo - Previsão de Preços de Casas</h3>
                <div class="demo-container">
                    <div id="ml-demo">
                        <div class="form-group">
                            <label for="area">Área (m²):</label>
                            <input type="number" id="area" value="120" min="50" max="500">
                        </div>
                        <div class="form-group">
                            <label for="quartos">Número de Quartos:</label>
                            <input type="number" id="quartos" value="3" min="1" max="10">
                        </div>
                        <div class="form-group">
                            <label for="banheiros">Número de Banheiros:</label>
                            <input type="number" id="banheiros" value="2" min="1" max="10">
                        </div>
                        <div class="form-group">
                            <label for="localizacao">Localização:</label>
                            <select id="localizacao">
                                <option value="1">Centro</option>
                                <option value="2">Bairro</option>
                                <option value="3">Subúrbio</option>
                            </select>
                        </div>
                        <button onclick="predictPrice()" class="btn">Prever Preço</button>
                        <div id="prediction-result" style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 5px; display: none;">
                            <h4>Resultado da Previsão:</h4>
                            <p id="prediction-value"></p>
                        </div>
                    </div>
                </div>
            </div>
            <div class="project-tech">
                <h3>Tecnologias Utilizadas</h3>
                <p><strong>Backend:</strong> Python Flask, scikit-learn, Pandas, NumPy</p>
                <p><strong>Modelo:</strong> Regressão Linear para previsão de preços</p>
                <p><strong>Features:</strong> API REST, serialização de modelos, validação de dados</p>
            </div>
        </div>
    `;
}