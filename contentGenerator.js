// ======================================================================
// src/utils/contentGenerator.js
// Gerador universal de título, descrição e palavras-chave por marketplace.
// 100% baseado em regras (sem IA paga), funciona para QUALQUER categoria
// de produto — só usa o que o produto realmente tem preenchido.
// ======================================================================

import { MARKETPLACES_CONFIG } from '../data/marketplaces.js';

function limpar(txt) {
  return String(txt || '').trim();
}

function titleCase(txt) {
  return limpar(txt)
    .split(' ')
    .map(palavra => palavra ? palavra.charAt(0).toUpperCase() + palavra.slice(1) : palavra)
    .join(' ');
}

function truncarNoLimite(texto, max) {
  if (texto.length <= max) return texto;
  const cortado = texto.slice(0, max);
  const ultimoEspaco = cortado.lastIndexOf(' ');
  return (ultimoEspaco > max * 0.6 ? cortado.slice(0, ultimoEspaco) : cortado).trim();
}

/**
 * Monta a lista de "blocos" descritivos disponíveis a partir do produto.
 * Só entra no resultado o que o produto realmente tem preenchido —
 * nada de texto genérico fixo tipo "banhado a ouro" para todo produto.
 */
function extrairBlocos(produto) {
  const blocos = [];

  if (produto.marca) blocos.push({ tipo: 'marca', texto: limpar(produto.marca) });
  if (produto.categoria) blocos.push({ tipo: 'categoria', texto: limpar(produto.categoria) });
  if (produto.subcategoria) blocos.push({ tipo: 'subcategoria', texto: limpar(produto.subcategoria) });
  if (produto.material) blocos.push({ tipo: 'material', texto: limpar(produto.material) });
  if (produto.cor) blocos.push({ tipo: 'cor', texto: limpar(produto.cor) });

  if (produto.pesoBase) blocos.push({ tipo: 'peso', texto: `${produto.pesoBase}g` });

  if (produto.medidas && (produto.medidas.comprimento || produto.medidas.largura || produto.medidas.altura)) {
    const partes = [produto.medidas.comprimento, produto.medidas.largura, produto.medidas.altura]
      .filter(Boolean).join(' x ');
    if (partes) blocos.push({ tipo: 'medida', texto: `${partes} cm` });
  }

  // Atributos customizados — é isso que torna o gerador universal:
  // funciona pra roupa (tamanho/tecido), eletrônico (voltagem/porta), casa (capacidade/material) etc.
  (produto.atributos || []).forEach(a => {
    if (a && a.chave && a.valor) blocos.push({ tipo: 'atributo', chave: limpar(a.chave), texto: limpar(a.valor) });
  });

  (produto.diferenciais || []).forEach(d => {
    if (d) blocos.push({ tipo: 'diferencial', texto: limpar(d) });
  });

  return blocos;
}

function montarTitulo(produto, blocos, cfg) {
  const nome = limpar(produto.nome) || 'Produto';
  const partesOrdem = [];

  if (cfg.id === 'amazon' && produto.marca) partesOrdem.push(titleCase(produto.marca));
  if (cfg.id === 'tiktokShop') {
    const diferencial = blocos.find(b => b.tipo === 'diferencial');
    if (diferencial) partesOrdem.push(diferencial.texto);
  }

  partesOrdem.push(nome);

  const material = blocos.find(b => b.tipo === 'material');
  const atributoPrincipal = blocos.find(b => b.tipo === 'atributo');
  const cor = blocos.find(b => b.tipo === 'cor');

  if (material) partesOrdem.push(material.texto);
  if (atributoPrincipal) partesOrdem.push(atributoPrincipal.texto);
  if (cor) partesOrdem.push(cor.texto);
  if (produto.subcategoria) partesOrdem.push(limpar(produto.subcategoria));
  if (cfg.id !== 'amazon' && produto.marca) partesOrdem.push(produto.marca);

  let titulo = partesOrdem.filter(Boolean).join(' ').replace(/\s{2,}/g, ' ').trim();

  if (cfg.id === 'amazon') titulo = titleCase(titulo);
  if (cfg.id === 'shopee') titulo = `🔥 ${titulo}`;

  return truncarNoLimite(titulo, cfg.tituloMax);
}

function montarDescricao(produto, blocos, cfg) {
  const nome = limpar(produto.nome) || 'Produto';
  const linhas = [];

  switch (cfg.id) {
    case 'mercadoLivre': {
      linhas.push(`${nome} — ${blocos.filter(b => ['categoria', 'subcategoria'].includes(b.tipo)).map(b => b.texto).join(' / ') || 'produto de qualidade'}.`);
      linhas.push('');
      linhas.push('Especificações:');
      blocos.forEach(b => {
        if (b.tipo === 'atributo') linhas.push(`• ${titleCase(b.chave)}: ${b.texto}`);
        if (b.tipo === 'material') linhas.push(`• Material: ${b.texto}`);
        if (b.tipo === 'medida') linhas.push(`• Dimensões: ${b.texto}`);
        if (b.tipo === 'peso') linhas.push(`• Peso: ${b.texto}`);
      });
      break;
    }
    case 'shopee': {
      linhas.push(`✨ ${nome} ✨`);
      linhas.push('');
      blocos.forEach(b => {
        if (b.tipo === 'diferencial') linhas.push(`✅ ${b.texto}`);
        if (b.tipo === 'material') linhas.push(`✅ Material: ${b.texto}`);
        if (b.tipo === 'atributo') linhas.push(`✅ ${titleCase(b.chave)}: ${b.texto}`);
      });
      linhas.push('');
      const tags = [produto.categoria, produto.subcategoria].filter(Boolean).map(t => `#${t.replace(/\s+/g, '')}`);
      if (tags.length) linhas.push(tags.join(' '));
      break;
    }
    case 'amazon': {
      const bullets = [];
      blocos.forEach(b => {
        if (b.tipo === 'material') bullets.push(`MATERIAL DE QUALIDADE: fabricado em ${b.texto}, feito para durar.`);
        if (b.tipo === 'atributo') bullets.push(`${titleCase(b.chave).toUpperCase()}: ${b.texto}.`);
        if (b.tipo === 'medida') bullets.push(`DIMENSÕES: ${b.texto}.`);
        if (b.tipo === 'diferencial') bullets.push(b.texto.toUpperCase() + '.');
      });
      if (bullets.length === 0) bullets.push(`PRODUTO ${nome.toUpperCase()}: qualidade e acabamento cuidadosamente selecionados.`);
      linhas.push(...bullets.slice(0, 5).map(b => `• ${b}`));
      break;
    }
    case 'tiktokShop': {
      linhas.push(`Apresentando: ${nome} 👀`);
      const diferencial = blocos.find(b => b.tipo === 'diferencial');
      if (diferencial) linhas.push(diferencial.texto);
      linhas.push('');
      const tags = [produto.categoria, produto.subcategoria, 'tiktokmademebuyit'].filter(Boolean).map(t => `#${String(t).replace(/\s+/g, '')}`);
      linhas.push(tags.join(' '));
      break;
    }
    default:
      linhas.push(nome);
  }

  const texto = linhas.join('\n').trim();
  return texto.length > cfg.descricaoMax ? truncarNoLimite(texto, cfg.descricaoMax) : texto;
}

function montarTags(produto, blocos, cfg) {
  const base = [produto.categoria, produto.subcategoria, produto.marca, produto.cor, produto.material]
    .filter(Boolean);
  const dosAtributos = blocos.filter(b => b.tipo === 'atributo').map(b => b.texto);
  const todas = [...new Set([...base, ...dosAtributos])];
  return todas.slice(0, cfg.tagsMax);
}

/**
 * Gera o conteúdo completo (título, descrição, tags) para os marketplaces pedidos.
 * @param {object} produto - produto universal (nome, categoria, subcategoria, marca, material, cor, medidas, atributos[], diferenciais[])
 * @param {string[]} marketplaceIds - ex: ['mercadoLivre','shopee'] — default: todos
 */
export function gerarConteudoMultiMarketplace(produto, marketplaceIds = null) {
  if (!produto) return {};

  const blocos = extrairBlocos(produto);
  const ids = marketplaceIds || Object.keys(MARKETPLACES_CONFIG);

  const resultado = {};
  ids.forEach(id => {
    const cfg = MARKETPLACES_CONFIG[id];
    if (!cfg) return;
    resultado[id] = {
      titulo: montarTitulo(produto, blocos, cfg),
      descricao: montarDescricao(produto, blocos, cfg),
      tags: montarTags(produto, blocos, cfg),
      conformidade: {
        tituloOk: montarTitulo(produto, blocos, cfg).length <= cfg.tituloMax,
        tituloLen: montarTitulo(produto, blocos, cfg).length,
        tituloMax: cfg.tituloMax
      }
    };
  });

  return resultado;
}
