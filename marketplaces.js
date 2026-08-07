// ======================================================================
// src/data/marketplaces.js
// Regras reais de cada marketplace para geração de título/descrição/tags.
// Isso é o que faz o gerador de conteúdo ser "SEO por canal" de verdade,
// em vez de um texto genérico igual pra todo lugar.
//
// Para adicionar um novo marketplace, basta acrescentar uma entrada aqui —
// nada mais no projeto precisa mudar.
// ======================================================================

export const MARKETPLACES_CONFIG = {
  mercadoLivre: {
    id: 'mercadoLivre',
    nome: 'Mercado Livre',
    corPrimaria: '#FFE600',
    tituloMax: 60,
    tituloMin: 20,
    estrutura: 'Produto + Atributo principal + Modelo/Variante + Marca',
    tom: 'direto, sem adjetivos vazios, sem CAIXA ALTA, sem emojis',
    regrasProibidas: [
      'não usar termos promocionais no título (ex: "frete grátis", "promoção", "imperdível")',
      'não repetir a mesma palavra-chave mais de 2 vezes',
      'não usar caracteres especiais decorativos (❤ ⭐ ✅)',
      'não usar CAIXA ALTA em palavras inteiras'
    ],
    descricaoMax: 5000,
    descricaoFormato: 'parágrafos curtos + lista de especificações técnicas ao final',
    tagsLabel: 'Palavras-chave de busca (backend)',
    tagsMax: 10
  },

  shopee: {
    id: 'shopee',
    nome: 'Shopee',
    corPrimaria: '#EE4D2D',
    tituloMax: 120,
    tituloMin: 30,
    estrutura: 'Palavra-chave principal + Produto + Atributos + Diferenciais + Marca',
    tom: 'rico em palavras-chave (keyword stuffing controlado), pode repetir termo de busca, 1-2 emojis leves são aceitos',
    regrasProibidas: [
      'não inventar desconto ou frete que não existe',
      'não usar mais de 2 emojis no título'
    ],
    descricaoMax: 3000,
    descricaoFormato: 'bullet points com emojis leves + hashtags de categoria ao final',
    tagsLabel: 'Hashtags',
    tagsMax: 15
  },

  amazon: {
    id: 'amazon',
    nome: 'Amazon',
    corPrimaria: '#FF9900',
    tituloMax: 150,
    tituloMin: 40,
    estrutura: 'Marca + Nome do Produto + Atributo-chave + Material/Cor + Tamanho/Quantidade',
    tom: 'formal, técnico, sem superlativos não comprováveis ("o melhor", "número 1")',
    regrasProibidas: [
      'não usar preço, promoção ou disponibilidade no título',
      'não usar símbolos como ! ou "melhor preço"',
      'primeira letra de cada palavra maiúscula (Title Case)'
    ],
    descricaoMax: 2000,
    descricaoFormato: '5 bullet points de benefício técnico + parágrafo final com termos de busca (backend keywords)',
    tagsLabel: 'Backend Search Terms',
    tagsMax: 5
  },

  tiktokShop: {
    id: 'tiktokShop',
    nome: 'TikTok Shop',
    corPrimaria: '#000000',
    tituloMax: 80,
    tituloMin: 15,
    estrutura: 'Gancho/benefício emocional + Produto + Diferencial visual',
    tom: 'casual, social, linguagem de vídeo/trend, pode usar emoji e gíria leve',
    regrasProibidas: [
      'não usar linguagem de saúde/promessa médica',
      'não usar "cura", "milagre" ou clickbait extremo'
    ],
    descricaoMax: 1000,
    descricaoFormato: 'texto curto tipo legenda de vídeo + hashtags de trend/categoria',
    tagsLabel: 'Hashtags',
    tagsMax: 8
  }
};

export const MARKETPLACES_LIST = Object.values(MARKETPLACES_CONFIG);
