// Dashboard de Analytics - Corrigido

class AnalyticsDashboard {
    constructor() {
        this.data = this.generateSampleData();
        this.currentMetric = 'sales';
        this.currentPeriod = 'month';
        this.charts = {};
    }

    init() {
        this.renderMetrics();
        this.renderCharts();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Filtros de métricas
        document.getElementById('metric-sales')?.addEventListener('click', () => this.switchMetric('sales'));
        document.getElementById('metric-users')?.addEventListener('click', () => this.switchMetric('users'));
        document.getElementById('metric-revenue')?.addEventListener('click', () => this.switchMetric('revenue'));
        document.getElementById('metric-conversion')?.addEventListener('click', () => this.switchMetric('conversion'));

        // Filtros de período
        document.getElementById('period-day')?.addEventListener('click', () => this.switchPeriod('day'));
        document.getElementById('period-week')?.addEventListener('click', () => this.switchPeriod('week'));
        document.getElementById('period-month')?.addEventListener('click', () => this.switchPeriod('month'));
        document.getElementById('period-year')?.addEventListener('click', () => this.switchPeriod('year'));

        // Atualizar dados
        document.getElementById('refresh-data')?.addEventListener('click', () => this.refreshData());
    }

    generateSampleData() {
        const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const categories = ['Eletrônicos', 'Roupas', 'Casa', 'Esportes', 'Livros'];
        const regions = ['Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul'];
        
        return {
            sales: months.map((month, i) => ({
                month,
                value: 50000 + Math.random() * 100000,
                growth: (Math.random() - 0.3) * 20
            })),
            users: months.map((month, i) => ({
                month,
                value: 1000 + i * 200 + Math.random() * 500,
                growth: (Math.random() - 0.2) * 15
            })),
            revenue: months.map((month, i) => ({
                month,
                value: 100000 + i * 25000 + Math.random() * 50000,
                growth: (Math.random() - 0.25) * 18
            })),
            conversion: months.map((month, i) => ({
                month,
                value: 2 + (i * 0.1) + Math.random() * 1.5,
                growth: (Math.random() - 0.1) * 8
            })),
            byCategory: categories.map(category => ({
                category,
                value: 10000 + Math.random() * 50000,
                percentage: Math.random() * 100
            })),
            byRegion: regions.map(region => ({
                region,
                value: 20000 + Math.random() * 80000,
                users: 500 + Math.random() * 1500
            })),
            realTime: Array.from({length: 24}, (_, i) => ({
                hour: i,
                sales: 50 + Math.random() * 200,
                users: 10 + Math.random() * 100,
                revenue: 1000 + Math.random() * 5000
            }))
        };
    }

    switchMetric(metric) {
        this.currentMetric = metric;
        document.querySelectorAll('.metric-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`metric-${metric}`)?.classList.add('active');
        this.renderCharts();
        this.renderMetrics();
    }

    switchPeriod(period) {
        this.currentPeriod = period;
        document.querySelectorAll('.period-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`period-${period}`)?.classList.add('active');
        this.renderCharts();
    }

    renderMetrics() {
        const metricsContainer = document.getElementById('analytics-metrics');
        if (!metricsContainer) return;

        const currentData = this.data[this.currentMetric];
        const latest = currentData[currentData.length - 1];

        metricsContainer.innerHTML = `
            <div class="metric-card">
                <div class="metric-icon">📊</div>
                <div class="metric-info">
                    <div class="metric-value">${this.formatValue(latest.value)}</div>
                    <div class="metric-label">${this.getMetricLabel(this.currentMetric)}</div>
                    <div class="metric-growth ${latest.growth >= 0 ? 'positive' : 'negative'}">
                        ${latest.growth >= 0 ? '↗' : '↘'} ${Math.abs(latest.growth).toFixed(1)}%
                    </div>
                </div>
            </div>
            
            <div class="metric-card">
                <div class="metric-icon">📈</div>
                <div class="metric-info">
                    <div class="metric-value">${this.getTotalValue()}</div>
                    <div class="metric-label">Total do Período</div>
                    <div class="metric-growth positive">
                        ↗ ${this.getAverageGrowth().toFixed(1)}%
                    </div>
                </div>
            </div>
            
            <div class="metric-card">
                <div class="metric-icon">🎯</div>
                <div class="metric-info">
                    <div class="metric-value">${this.getPeakValue()}</div>
                    <div class="metric-label">Pico do Mês</div>
                    <div class="metric-growth positive">
                        ⭐ Melhor desempenho
                    </div>
                </div>
            </div>
            
            <div class="metric-card">
                <div class="metric-icon">🔄</div>
                <div class="metric-info">
                    <div class="metric-value">${this.getForecast()}</div>
                    <div class="metric-label">Previsão Próximo Mês</div>
                    <div class="metric-growth positive">
                        📈 Expectativa positiva
                    </div>
                </div>
            </div>
        `;
    }

    renderCharts() {
        this.destroyCharts(); // Destruir charts antigos antes de criar novos
        this.renderMainChart();
        this.renderCategoryChart();
        this.renderRegionChart();
        this.renderRealTimeChart();
    }

    destroyCharts() {
        Object.values(this.charts).forEach(chart => {
            if (chart) chart.destroy();
        });
        this.charts = {};
    }

    renderMainChart() {
        const ctx = document.getElementById('analytics-main-chart');
        if (!ctx) return;

        const currentData = this.data[this.currentMetric];
        
        this.charts.main = new Chart(ctx, {
            type: 'line',
            data: {
                labels: currentData.map(d => d.month),
                datasets: [{
                    label: this.getMetricLabel(this.currentMetric),
                    data: currentData.map(d => d.value),
                    borderColor: 'rgb(52, 152, 219)',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: `Evolução de ${this.getMetricLabel(this.currentMetric)} - Últimos 12 Meses`
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false
                    }
                }
            }
        });
    }

    renderCategoryChart() {
        const ctx = document.getElementById('analytics-category-chart');
        if (!ctx) return;
        
        this.charts.category = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: this.data.byCategory.map(d => d.category),
                datasets: [{
                    data: this.data.byCategory.map(d => d.value),
                    backgroundColor: [
                        'rgba(52, 152, 219, 0.8)',
                        'rgba(46, 204, 113, 0.8)',
                        'rgba(155, 89, 182, 0.8)',
                        'rgba(241, 196, 15, 0.8)',
                        'rgba(230, 126, 34, 0.8)'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Distribuição por Categoria'
                    },
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    renderRegionChart() {
        const ctx = document.getElementById('analytics-region-chart');
        if (!ctx) return;
        
        this.charts.region = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: this.data.byRegion.map(d => d.region),
                datasets: [{
                    label: 'Vendas (R$)',
                    data: this.data.byRegion.map(d => d.value),
                    backgroundColor: 'rgba(52, 152, 219, 0.8)'
                }, {
                    label: 'Usuários',
                    data: this.data.byRegion.map(d => d.users),
                    backgroundColor: 'rgba(46, 204, 113, 0.8)',
                    type: 'line',
                    yAxisID: 'y1'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Desempenho por Região'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Vendas (R$)'
                        }
                    },
                    y1: {
                        beginAtZero: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Usuários'
                        },
                        grid: {
                            drawOnChartArea: false
                        }
                    }
                }
            }
        });
    }

    renderRealTimeChart() {
        const ctx = document.getElementById('analytics-realtime-chart');
        if (!ctx) return;
        
        this.charts.realtime = new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.data.realTime.map(d => `${d.hour}:00`),
                datasets: [{
                    label: 'Vendas',
                    data: this.data.realTime.map(d => d.sales),
                    borderColor: 'rgb(52, 152, 219)',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    borderWidth: 2,
                    tension: 0.4
                }, {
                    label: 'Usuários',
                    data: this.data.realTime.map(d => d.users),
                    borderColor: 'rgb(46, 204, 113)',
                    backgroundColor: 'rgba(46, 204, 113, 0.1)',
                    borderWidth: 2,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Atividade em Tempo Real - Últimas 24h'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    // Métodos utilitários
    formatValue(value) {
        switch(this.currentMetric) {
            case 'sales':
                return Math.round(value).toLocaleString();
            case 'users':
                return Math.round(value).toLocaleString();
            case 'revenue':
                return `R$ ${Math.round(value).toLocaleString()}`;
            case 'conversion':
                return `${value.toFixed(2)}%`;
            default:
                return value.toLocaleString();
        }
    }

    getMetricLabel(metric) {
        const labels = {
            sales: 'Vendas',
            users: 'Usuários',
            revenue: 'Receita',
            conversion: 'Taxa de Conversão'
        };
        return labels[metric] || metric;
    }

    getTotalValue() {
        const currentData = this.data[this.currentMetric];
        const total = currentData.reduce((sum, item) => sum + item.value, 0);
        return this.formatValue(total);
    }

    getAverageGrowth() {
        const currentData = this.data[this.currentMetric];
        const totalGrowth = currentData.reduce((sum, item) => sum + item.growth, 0);
        return totalGrowth / currentData.length;
    }

    getPeakValue() {
        const currentData = this.data[this.currentMetric];
        const peak = Math.max(...currentData.map(item => item.value));
        return this.formatValue(peak);
    }

    getForecast() {
        const currentData = this.data[this.currentMetric];
        const latest = currentData[currentData.length - 1];
        const forecast = latest.value * (1 + latest.growth / 100);
        return this.formatValue(forecast);
    }

    refreshData() {
        const refreshBtn = document.getElementById('refresh-data');
        if (!refreshBtn) return;

        // Simular atualização de dados
        refreshBtn.innerHTML = '🔄 Atualizando...';
        refreshBtn.disabled = true;
        
        setTimeout(() => {
            this.data = this.generateSampleData();
            this.renderCharts();
            this.renderMetrics();
            
            refreshBtn.innerHTML = '🔄 Atualizar Dados';
            refreshBtn.disabled = false;
            
            // Mostrar notificação
            this.showNotification('Dados atualizados com sucesso!');
        }, 1500);
    }

    showNotification(message) {
        // Remover notificações existentes
        document.querySelectorAll('.analytics-notification').forEach(n => n.remove());
        
        const notification = document.createElement('div');
        notification.className = 'analytics-notification';
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

// Instanciar o dashboard quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    window.analyticsDashboard = new AnalyticsDashboard();
});