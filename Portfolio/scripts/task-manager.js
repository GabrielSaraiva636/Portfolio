// Gerenciador de Tarefas

class TaskManager {
    constructor() {
        this.tasks = this.loadTasks();
        this.currentFilter = 'all';
        this.init();
    }

    init() {
        this.renderTasks();
        this.updateStats();
    }

    // Carregar tarefas do Local Storage
    loadTasks() {
        const saved = localStorage.getItem('tasks');
        return saved ? JSON.parse(saved) : [];
    }

    // Salvar tarefas no Local Storage
    saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(this.tasks));
    }

    // Adicionar nova tarefa
    addTask(title, priority = 'media') {
        if (!title.trim()) {
            alert('Por favor, digite um título para a tarefa.');
            return;
        }

        const newTask = {
            id: Date.now(),
            title: title.trim(),
            priority: priority,
            completed: false,
            createdAt: new Date().toISOString(),
            completedAt: null
        };

        this.tasks.unshift(newTask);
        this.saveTasks();
        this.renderTasks();
        this.updateStats();
        
        // Limpar campo de entrada
        document.getElementById('taskTitle').value = '';
    }

    // Alternar status da tarefa
    toggleTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
            task.completedAt = task.completed ? new Date().toISOString() : null;
            this.saveTasks();
            this.renderTasks();
            this.updateStats();
        }
    }

    // Editar tarefa
    editTask(id, newTitle) {
        const task = this.tasks.find(t => t.id === id);
        if (task && newTitle.trim()) {
            task.title = newTitle.trim();
            this.saveTasks();
            this.renderTasks();
        }
    }

    // Excluir tarefa
    deleteTask(id) {
        if (confirm('Tem certeza que deseja excluir esta tarefa?')) {
            this.tasks = this.tasks.filter(t => t.id !== id);
            this.saveTasks();
            this.renderTasks();
            this.updateStats();
        }
    }

    // Filtrar tarefas
    filterTasks(filter) {
        this.currentFilter = filter;
        this.renderTasks();
        
        // Atualizar botões ativos
        document.querySelectorAll('.task-filters .btn').forEach(btn => {
            btn.classList.remove('btn-success');
            btn.classList.add('btn-outline');
        });
        
        event.target.classList.remove('btn-outline');
        event.target.classList.add('btn-success');
    }

    // Renderizar lista de tarefas
    renderTasks() {
        const tasksList = document.getElementById('tasks-list');
        let filteredTasks = this.tasks;

        // Aplicar filtro
        switch (this.currentFilter) {
            case 'pending':
                filteredTasks = this.tasks.filter(t => !t.completed);
                break;
            case 'completed':
                filteredTasks = this.tasks.filter(t => t.completed);
                break;
        }

        if (filteredTasks.length === 0) {
            tasksList.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">Nenhuma tarefa encontrada.</p>';
            return;
        }

        tasksList.innerHTML = filteredTasks.map(task => `
            <div class="task-item ${task.completed ? 'completed' : ''} ${task.priority}-priority" data-id="${task.id}">
                <div class="task-content">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <input 
                            type="checkbox" 
                            ${task.completed ? 'checked' : ''} 
                            onchange="taskManager.toggleTask(${task.id})"
                            style="cursor: pointer;"
                        >
                        <span style="flex: 1; ${task.completed ? 'text-decoration: line-through;' : ''}">
                            ${this.escapeHtml(task.title)}
                        </span>
                    </div>
                    <div style="font-size: 0.8rem; color: #666; margin-top: 5px;">
                        <span class="priority-badge ${task.priority}">${this.getPriorityText(task.priority)}</span>
                        • Criada em: ${new Date(task.createdAt).toLocaleDateString()}
                        ${task.completed ? `• Concluída em: ${new Date(task.completedAt).toLocaleDateString()}` : ''}
                    </div>
                </div>
                <div class="task-actions">
                    <button onclick="taskManager.editTaskPrompt(${task.id})" class="btn btn-outline" style="padding: 5px 10px;">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="taskManager.deleteTask(${task.id})" class="btn" style="padding: 5px 10px; background: var(--accent);">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');

        // Adicionar estilos para prioridades
        this.addPriorityStyles();
    }

    // Prompt para editar tarefa
    editTaskPrompt(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            const newTitle = prompt('Editar tarefa:', task.title);
            if (newTitle !== null) {
                this.editTask(id, newTitle);
            }
        }
    }

    // Atualizar estatísticas
    updateStats() {
        const total = this.tasks.length;
        const completed = this.tasks.filter(t => t.completed).length;
        const pending = total - completed;

        const statsDiv = document.getElementById('tasks-stats');
        statsDiv.innerHTML = `
            <strong>Estatísticas:</strong><br>
            • Total: ${total} tarefas<br>
            • Concluídas: ${completed} <span style="color: var(--success);">✓</span><br>
            • Pendentes: ${pending} <span style="color: var(--accent);">⏱</span><br>
            • Progresso: ${total > 0 ? Math.round((completed / total) * 100) : 0}%
        `;
    }

    // Utilitários
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    getPriorityText(priority) {
        const texts = {
            'baixa': 'Baixa Prioridade',
            'media': 'Média Prioridade',
            'alta': 'Alta Prioridade'
        };
        return texts[priority] || priority;
    }

    addPriorityStyles() {
        if (!document.getElementById('priority-styles')) {
            const style = document.createElement('style');
            style.id = 'priority-styles';
            style.textContent = `
                .priority-badge {
                    padding: 2px 8px;
                    border-radius: 12px;
                    font-size: 0.7rem;
                    font-weight: bold;
                }
                .priority-badge.baixa { background: #27ae60; color: white; }
                .priority-badge.media { background: #f39c12; color: white; }
                .priority-badge.alta { background: #e74c3c; color: white; }
                .high-priority { border-left-color: #e74c3c !important; }
                .baixa-priority { border-left-color: #27ae60 !important; }
            `;
            document.head.appendChild(style);
        }
    }
}

// Instanciar o gerenciador de tarefas
const taskManager = new TaskManager();

// Funções globais para os botões
function addTask() {
    const title = document.getElementById('taskTitle').value;
    const priority = document.getElementById('taskPriority').value;
    taskManager.addTask(title, priority);
}

function filterTasks(filter) {
    taskManager.filterTasks(filter);
}