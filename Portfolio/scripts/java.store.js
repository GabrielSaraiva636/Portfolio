// Loja Virtual Java - Simulação

class JavaStore {
    constructor() {
        this.products = [
            { id: 1, name: "Notebook Gamer", price: 2500, image: "💻", category: "eletronicos", stock: 10 },
            { id: 2, name: "Smartphone Android", price: 1200, image: "📱", category: "eletronicos", stock: 15 },
            { id: 3, name: "Tablet 10''", price: 800, image: "📟", category: "eletronicos", stock: 8 },
            { id: 4, name: "Fone Bluetooth", price: 150, image: "🎧", category: "acessorios", stock: 20 },
            { id: 5, name: "Smartwatch", price: 300, image: "⌚", category: "eletronicos", stock: 12 },
            { id: 6, name: "Teclado Mecânico", price: 200, image: "⌨️", category: "acessorios", stock: 18 }
        ];
        
        this.cart = this.loadCart();
        this.init();
    }

    init() {
        this.renderProducts();
        this.updateCartCount();
    }

    // Carregar carrinho do Local Storage
    loadCart() {
        const saved = localStorage.getItem('javaStoreCart');
        return saved ? JSON.parse(saved) : [];
    }

    // Salvar carrinho no Local Storage
    saveCart() {
        localStorage.setItem('javaStoreCart', JSON.stringify(this.cart));
    }

    // Renderizar produtos
    renderProducts() {
        const productsGrid = document.getElementById('products-grid');
        
        productsGrid.innerHTML = this.products.map(product => `
            <div class="product-card">
                <div style="font-size: 3rem; margin-bottom: 10px;">${product.image}</div>
                <h4>${product.name}</h4>
                <div class="product-price">R$ ${product.price.toLocaleString()}</div>
                <div style="font-size: 0.8rem; color: #666; margin-bottom: 15px;">
                    Estoque: ${product.stock} unidades
                </div>
                <button 
                    onclick="javaStore.addToCart(${product.id})" 
                    class="btn"
                    ${product.stock === 0 ? 'disabled style="background: #ccc;"' : ''}
                >
                    ${product.stock === 0 ? 'Fora de Estoque' : 'Adicionar ao Carrinho'}
                </button>
            </div>
        `).join('');
    }

    // Adicionar ao carrinho
    addToCart(productId) {
        const product = this.products.find(p => p.id === productId);
        
        if (!product) return;
        
        if (product.stock === 0) {
            alert('Produto fora de estoque!');
            return;
        }

        const cartItem = this.cart.find(item => item.productId === productId);
        
        if (cartItem) {
            if (cartItem.quantity >= product.stock) {
                alert('Quantidade máxima em estoque atingida!');
                return;
            }
            cartItem.quantity++;
        } else {
            this.cart.push({
                productId: product.id,
                name: product.name,
                price: product.price,
                image: product.image,
                quantity: 1
            });
        }

        this.saveCart();
        this.updateCartCount();
        this.showNotification(`${product.name} adicionado ao carrinho!`);
    }

    // Remover do carrinho
    removeFromCart(productId) {
        this.cart = this.cart.filter(item => item.productId !== productId);
        this.saveCart();
        this.updateCartCount();
        this.renderCart();
    }

    // Atualizar quantidade no carrinho
    updateQuantity(productId, change) {
        const cartItem = this.cart.find(item => item.productId === productId);
        
        if (cartItem) {
            const newQuantity = cartItem.quantity + change;
            const product = this.products.find(p => p.id === productId);
            
            if (newQuantity < 1) {
                this.removeFromCart(productId);
                return;
            }
            
            if (newQuantity > product.stock) {
                alert('Quantidade máxima em estoque atingida!');
                return;
            }
            
            cartItem.quantity = newQuantity;
            this.saveCart();
            this.updateCartCount();
            this.renderCart();
        }
    }

    // Visualizar carrinho
    viewCart() {
        this.renderCart();
        document.getElementById('cart-modal').style.display = 'block';
    }

    // Fechar carrinho
    closeCart() {
        document.getElementById('cart-modal').style.display = 'none';
    }

    // Renderizar carrinho
    renderCart() {
        const cartItems = document.getElementById('cart-items');
        const cartTotal = document.getElementById('cart-total');
        
        if (this.cart.length === 0) {
            cartItems.innerHTML = '<p style="text-align: center; color: #666;">Seu carrinho está vazio.</p>';
            cartTotal.textContent = 'Total: R$ 0,00';
            return;
        }

        let total = 0;
        
        cartItems.innerHTML = this.cart.map(item => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;
            
            return `
                <div class="cart-item">
                    <div class="cart-item-info">
                        <strong>${item.image} ${item.name}</strong><br>
                        <small>R$ ${item.price.toLocaleString()} cada</small>
                    </div>
                    <div class="cart-item-actions">
                        <div class="quantity-control">
                            <button onclick="javaStore.updateQuantity(${item.productId}, -1)" class="quantity-btn">-</button>
                            <span style="margin: 0 10px;">${item.quantity}</span>
                            <button onclick="javaStore.updateQuantity(${item.productId}, 1)" class="quantity-btn">+</button>
                        </div>
                        <div style="min-width: 80px; text-align: right;">
                            R$ ${itemTotal.toLocaleString()}
                        </div>
                        <button onclick="javaStore.removeFromCart(${item.productId})" style="background: var(--accent); color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">
                            🗑️
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        cartTotal.textContent = `Total: R$ ${total.toLocaleString()}`;
    }

    // Finalizar compra
    checkout() {
        if (this.cart.length === 0) {
            alert('Seu carrinho está vazio!');
            return;
        }

        // Simular processamento do pedido
        const total = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        // Em um sistema real, aqui seria a integração com o backend Java
        alert(`🎉 Pedido finalizado com sucesso!\n\nTotal: R$ ${total.toLocaleString()}\n\nObrigado pela compra!`);
        
        // Limpar carrinho
        this.cart = [];
        this.saveCart();
        this.updateCartCount();
        this.closeCart();
        this.renderCart();
    }

    // Atualizar contador do carrinho
    updateCartCount() {
        const totalItems = this.cart.reduce((sum, item) => sum + item.quantity, 0);
        document.getElementById('cart-count').textContent = `${totalItems} ${totalItems === 1 ? 'item' : 'itens'}`;
    }

    // Mostrar notificação
    showNotification(message) {
        // Criar elemento de notificação
        const notification = document.createElement('div');
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
            animation: slideIn 0.3s ease;
        `;
        
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // Remover após 3 segundos
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
}

// Adicionar animações CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Instanciar a loja
const javaStore = new JavaStore();

// Funções globais para os botões
function viewCart() {
    javaStore.viewCart();
}

function closeCart() {
    javaStore.closeCart();
}

function checkout() {
    javaStore.checkout();
}