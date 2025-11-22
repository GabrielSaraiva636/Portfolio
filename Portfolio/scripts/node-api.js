// API REST com Node.js - Corrigido

class NodeAPI {
    constructor() {
        this.baseURL = 'https://jsonplaceholder.typicode.com';
        this.localData = this.loadLocalData();
        this.currentSection = 'users';
    }

    init() {
        this.setupEventListeners();
        this.loadUsers();
    }

    setupEventListeners() {
        // Navegação
        this.setupNavigation();
        
        // Formulários
        this.setupForms();
        
        // Testador de API
        this.setupAPITester();
    }

    setupNavigation() {
        const sections = ['users', 'posts', 'products', 'test'];
        
        sections.forEach(section => {
            const btn = document.getElementById(`api-nav-${section}`);
            if (btn) {
                btn.addEventListener('click', () => this.showSection(section));
            }
        });
    }

    setupForms() {
        const forms = ['user', 'post', 'product'];
        
        forms.forEach(form => {
            const formElement = document.getElementById(`api-${form}-form`);
            if (formElement) {
                formElement.addEventListener('submit', (e) => this.handleFormSubmit(e, form));
            }
        });
    }

    setupAPITester() {
        const methods = ['get', 'post', 'put', 'delete'];
        
        methods.forEach(method => {
            const btn = document.getElementById(`api-test-${method}`);
            if (btn) {
                btn.addEventListener('click', () => this.testAPI(method.toUpperCase()));
            }
        });
    }

    showSection(section) {
        this.currentSection = section;
        
        // Esconder todas as sections
        document.querySelectorAll('.api-section').forEach(s => {
            s.style.display = 'none';
        });
        
        // Mostrar section atual
        const currentSection = document.getElementById(`api-${section}-section`);
        if (currentSection) {
            currentSection.style.display = 'block';
        }
        
        // Atualizar navegação ativa
        document.querySelectorAll('.api-nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = document.getElementById(`api-nav-${section}`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
        
        // Carregar dados da seção
        this.loadSectionData(section);
    }

    loadSectionData(section) {
        switch(section) {
            case 'users':
                this.loadUsers();
                break;
            case 'posts':
                this.loadPosts();
                break;
            case 'products':
                this.loadProducts();
                break;
            case 'test':
                // Não precisa carregar dados
                break;
        }
    }

    // USERS
    async loadUsers() {
        try {
            this.showLoading('users');
            const response = await fetch(`${this.baseURL}/users`);
            const users = await response.json();
            
            // Combinar com dados locais
            const allUsers = [...users, ...this.localData.users];
            this.renderUsers(allUsers);
        } catch (error) {
            this.showError('users', 'Erro ao carregar usuários');
        }
    }

    renderUsers(users) {
        const tbody = document.getElementById('api-users-tbody');
        if (!tbody) return;

        tbody.innerHTML = users.map(user => `
            <tr>
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td>${user.phone || 'N/A'}</td>
                <td>${user.company?.name || 'N/A'}</td>
                <td>
                    <button onclick="nodeAPI.viewUser(${user.id})" class="btn btn-outline" style="padding: 5px 10px;">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button onclick="nodeAPI.deleteUser(${user.id})" class="btn" style="padding: 5px 10px; background: var(--accent);">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    async handleFormSubmit(e, formType) {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        let data;
        switch(formType) {
            case 'user':
                data = {
                    id: Date.now(),
                    name: formData.get('name'),
                    email: formData.get('email'),
                    phone: formData.get('phone'),
                    company: {
                        name: formData.get('company')
                    }
                };
                break;
            case 'post':
                data = {
                    title: formData.get('title'),
                    body: formData.get('body'),
                    userId: 1
                };
                break;
            case 'product':
                data = {
                    id: Date.now(),
                    name: formData.get('name'),
                    category: formData.get('category'),
                    price: parseFloat(formData.get('price')),
                    stock: parseInt(formData.get('stock')),
                    description: formData.get('description')
                };
                break;
        }

        this.showLoading(formType + 's');
        await this.simulateAPICall();
        
        if (formType === 'user' || formType === 'product') {
            this.localData[formType + 's'].push(data);
            this.saveLocalData();
            this[`render${formType.charAt(0).toUpperCase() + formType.slice(1)}s`](this.localData[formType + 's']);
        }
        
        e.target.reset();
        this.showAPINotification(`${formType.toUpperCase()} criado com sucesso!`);
    }

    viewUser(id) {
        const user = this.localData.users.find(u => u.id === id);
        if (user) {
            alert(`Detalhes do Usuário:\n\nNome: ${user.name}\nEmail: ${user.email}\nTelefone: ${user.phone}\nEmpresa: ${user.company?.name}`);
        }
    }

    deleteUser(id) {
        if (confirm('Tem certeza que deseja excluir este usuário?')) {
            this.localData.users = this.localData.users.filter(u => u.id !== id);
            this.saveLocalData();
            this.renderUsers(this.localData.users);
            this.showAPINotification('Usuário excluído!');
        }
    }

    // POSTS
    async loadPosts() {
        try {
            this.showLoading('posts');
            const response = await fetch(`${this.baseURL}/posts`);
            const posts = await response.json();
            this.renderPosts(posts.slice(0, 5));
        } catch (error) {
            this.showError('posts', 'Erro ao carregar posts');
        }
    }

    renderPosts(posts) {
        const container = document.getElementById('api-posts-container');
        if (!container) return;

        container.innerHTML = posts.map(post => `
            <div class="api-post-card">
                <h3>${post.title}</h3>
                <p>${post.body}</p>
                <div class="api-post-actions">
                    <button onclick="nodeAPI.viewPost(${post.id})" class="btn btn-outline">
                        Ver Detalhes
                    </button>
                    <button onclick="nodeAPI.createComment(${post.id})" class="btn">
                        Comentar
                    </button>
                </div>
            </div>
        `).join('');
    }

    async viewPost(id) {
        try {
            const response = await fetch(`${this.baseURL}/posts/${id}`);
            const post = await response.json();
            
            const userResponse = await fetch(`${this.baseURL}/users/${post.userId}`);
            const user = await userResponse.json();
            
            alert(`Post #${post.id}\n\nTítulo: ${post.title}\n\nConteúdo: ${post.body}\n\nAutor: ${user.name}\nEmail: ${user.email}`);
        } catch (error) {
            this.showError('posts', 'Erro ao carregar post');
        }
    }

    async createComment(postId) {
        const comment = prompt('Digite seu comentário:');
        if (comment) {
            this.showLoading('posts');
            await this.simulateAPICall();
            this.showAPINotification(`Comentário adicionado ao post ${postId}!`);
        }
    }

    // PRODUCTS
    loadProducts() {
        this.renderProducts(this.localData.products);
    }

    renderProducts(products) {
        const container = document.getElementById('api-products-container');
        if (!container) return;

        container.innerHTML = products.map(product => `
            <div class="api-product-card">
                <h3>${product.name}</h3>
                <p>Categoria: ${product.category}</p>
                <p class="api-product-price">R$ ${product.price.toFixed(2)}</p>
                <p>Estoque: ${product.stock} unidades</p>
                <div class="api-product-actions">
                    <button onclick="nodeAPI.editProduct(${product.id})" class="btn btn-outline">
                        Editar
                    </button>
                    <button onclick="nodeAPI.deleteProduct(${product.id})" class="btn">
                        Excluir
                    </button>
                </div>
            </div>
        `).join('');
    }

    editProduct(id) {
        const product = this.localData.products.find(p => p.id === id);
        if (product) {
            const newPrice = prompt('Novo preço:', product.price);
            const newStock = prompt('Novo estoque:', product.stock);
            
            if (newPrice && newStock) {
                product.price = parseFloat(newPrice);
                product.stock = parseInt(newStock);
                this.saveLocalData();
                this.renderProducts(this.localData.products);
                this.showAPINotification('Produto atualizado!');
            }
        }
    }

    deleteProduct(id) {
        if (confirm('Tem certeza que deseja excluir este produto?')) {
            this.localData.products = this.localData.products.filter(p => p.id !== id);
            this.saveLocalData();
            this.renderProducts(this.localData.products);
            this.showAPINotification('Produto excluído!');
        }
    }

    // TEST API
    async testAPI(method) {
        const output = document.getElementById('api-test-output');
        if (!output) return;
        
        try {
            output.innerHTML = `<div class="api-loading">🔄 Enviando requisição ${method}...</div>`;
            
            let response;
            const options = {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                }
            };

            if (method === 'POST') {
                options.body = JSON.stringify({
                    title: 'Test Post',
                    body: 'This is a test post',
                    userId: 1
                });
            } else if (method === 'PUT') {
                options.body = JSON.stringify({
                    id: 1,
                    title: 'Updated Post',
                    body: 'This post has been updated',
                    userId: 1
                });
            }

            response = await fetch(
                method === 'POST' ? `${this.baseURL}/posts` : 
                method === 'PUT' || method === 'DELETE' ? `${this.baseURL}/posts/1` : 
                `${this.baseURL}/users/1`,
                options
            );

            const data = method !== 'DELETE' ? await response.json() : { message: 'Item deletado com sucesso' };
            
            output.innerHTML = `
                <div class="api-success">
                    <strong>✅ ${method} Request Successful</strong>
                    <div class="api-response">
                        <strong>Status:</strong> ${response.status}<br>
                        <strong>URL:</strong> ${response.url}<br>
                        <strong>Response:</strong>
                        <pre>${JSON.stringify(data, null, 2)}</pre>
                    </div>
                </div>
            `;
            
        } catch (error) {
            output.innerHTML = `
                <div class="api-error">
                    <strong>❌ ${method} Request Failed</strong>
                    <div class="api-error-message">${error.message}</div>
                </div>
            `;
        }
    }

    // UTILITIES
    loadLocalData() {
        const saved = localStorage.getItem('nodeapi_data');
        return saved ? JSON.parse(saved) : {
            users: [],
            products: [
                {
                    id: 1,
                    name: "Laptop Dell",
                    category: "Eletrônicos",
                    price: 2500.00,
                    stock: 15,
                    description: "Laptop Dell Inspiron 15"
                },
                {
                    id: 2,
                    name: "Mouse Wireless",
                    category: "Acessórios",
                    price: 89.90,
                    stock: 30,
                    description: "Mouse sem fio ergonômico"
                }
            ]
        };
    }

    saveLocalData() {
        localStorage.setItem('nodeapi_data', JSON.stringify(this.localData));
    }

    simulateAPICall() {
        return new Promise(resolve => {
            setTimeout(resolve, 1000 + Math.random() * 1000);
        });
    }

    showLoading(section) {
        const container = document.getElementById(`api-${section}-container`) || 
                         document.getElementById(`api-${section}-tbody`)?.parentNode;
        if (container) {
            container.innerHTML = '<div class="api-loading">🔄 Carregando...</div>';
        }
    }

    showError(section, message) {
        const container = document.getElementById(`api-${section}-container`) || 
                         document.getElementById(`api-${section}-tbody`)?.parentNode;
        if (container) {
            container.innerHTML = `<div class="api-error">❌ ${message}</div>`;
        }
    }

    showAPINotification(message) {
        // Remover notificações existentes
        document.querySelectorAll('.api-notification').forEach(n => n.remove());
        
        const notification = document.createElement('div');
        notification.className = 'api-notification';
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
            font-family: monospace;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Instanciar a API quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    window.nodeAPI = new NodeAPI();
    window.nodeAPI.init();
});