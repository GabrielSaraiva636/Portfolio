// API de Machine Learning - Simulação

class MLModel {
    constructor() {
        this.modelTrained = false;
        this.trainingData = [
            { area: 80, quartos: 2, banheiros: 1, localizacao: 2, preco: 300000 },
            { area: 120, quartos: 3, banheiros: 2, localizacao: 1, preco: 550000 },
            { area: 200, quartos: 4, banheiros: 3, localizacao: 1, preco: 850000 },
            { area: 95, quartos: 2, banheiros: 2, localizacao: 3, preco: 280000 },
            { area: 150, quartos: 3, banheiros: 2, localizacao: 2, preco: 450000 },
            { area: 180, quartos: 4, banheiros: 3, localizacao: 1, preco: 720000 },
            { area: 65, quartos: 1, banheiros: 1, localizacao: 3, preco: 180000 },
            { area: 140, quartos: 3, banheiros: 2, localizacao: 2, preco: 420000 }
        ];
    }

    // Simulação de treinamento do modelo
    trainModel() {
        console.log('Treinando modelo de regressão linear...');
        // Em um cenário real, aqui seria o treinamento com scikit-learn
        this.modelTrained = true;
        return new Promise(resolve => {
            setTimeout(() => {
                console.log('Modelo treinado com sucesso!');
                resolve(true);
            }, 1500);
        });
    }

    // Simulação de previsão
    predict(area, quartos, banheiros, localizacao) {
        if (!this.modelTrained) {
            this.trainModel();
        }

        // Fórmula simplificada para simulação
        const basePrice = area * 2500;
        const roomsBonus = quartos * 50000;
        const bathroomsBonus = banheiros * 30000;
        const locationMultiplier = localizacao === 1 ? 1.5 : localizacao === 2 ? 1.2 : 1.0;
        
        let predictedPrice = (basePrice + roomsBonus + bathroomsBonus) * locationMultiplier;
        
        // Adicionar variação aleatória para simular realidade
        const variation = 0.8 + (Math.random() * 0.4); // Variação de 80% a 120%
        predictedPrice *= variation;

        return Math.round(predictedPrice);
    }

    // Gerar explicação da previsão
    generateExplanation(area, quartos, banheiros, localizacao, predictedPrice) {
        const locations = {
            1: 'Centro',
            2: 'Bairro',
            3: 'Subúrbio'
        };

        return `
            <strong>Análise da Previsão:</strong><br>
            • Área: ${area}m² contribui com R$ ${(area * 2500).toLocaleString()}<br>
            • Quartos: ${quartos} adicionam R$ ${(quartos * 50000).toLocaleString()}<br>
            • Banheiros: ${banheiros} adicionam R$ ${(banheiros * 30000).toLocaleString()}<br>
            • Localização: ${locations[localizacao]} (multiplicador ${localizacao === 1 ? '1.5x' : localizacao === 2 ? '1.2x' : '1.0x'})<br>
            <br>
            <strong>Previsão do Modelo:</strong> R$ ${predictedPrice.toLocaleString()}
        `;
    }
}

// Instanciar o modelo
const mlModel = new MLModel();

// Função principal de previsão
function predictPrice() {
    const area = parseInt(document.getElementById('area').value);
    const quartos = parseInt(document.getElementById('quartos').value);
    const banheiros = parseInt(document.getElementById('banheiros').value);
    const localizacao = parseInt(document.getElementById('localizacao').value);

    // Validação
    if (!area || !quartos || !banheiros) {
        alert('Por favor, preencha todos os campos.');
        return;
    }

    // Mostrar loading
    const resultDiv = document.getElementById('prediction-result');
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = '<p><i class="fas fa-spinner fa-spin"></i> Processando previsão...</p>';

    // Simular tempo de processamento
    setTimeout(() => {
        const predictedPrice = mlModel.predict(area, quartos, banheiros, localizacao);
        const explanation = mlModel.generateExplanation(area, quartos, banheiros, localizacao, predictedPrice);
        
        document.getElementById('prediction-value').innerHTML = explanation;
    }, 2000);
}

// Inicializar o modelo quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    mlModel.trainModel();
});