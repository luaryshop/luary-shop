import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { ref, set, onValue, remove } from 'firebase/database';
import { ref as storageRef, uploadString, getDownloadURL } from 'firebase/storage';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Calculator, Store, Package, Plus, Edit2, Trash2, Save, X,
  LayoutDashboard, Box, Droplets, Search, Camera, ImageIcon,
  Layers, DollarSign, TrendingUp, PieChart, BarChart, Truck,
  CreditCard, ChevronRight, Check, Users, ShieldAlert, Sparkles,
  Coins, FileText, ArrowUpRight, ArrowDownRight, Target, Tv, CheckCircle2,
  Calendar, Info, ShoppingCart, ShoppingBag, ListPlus, Database, AlertTriangle
} from 'lucide-react';
import { auth, db, storage, appId, firebaseConfigError } from './firebase.js';

// --- FORMATAÇÃO NO PADRÃO BRASILEIRO (vírgula decimal, ponto de milhar) ---
// Usar sempre no lugar de .toFixed() para exibir valores em R$, peso (g) ou percentuais.
const formatBRL = (valor) =>
  Number(valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatNumBR = (valor, casas = 2) =>
  Number(valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });

const App = () => {
  // --- ESTADOS DE SESSÃO E CONEXÃO ---
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState(firebaseConfigError);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState('produto'); // 'produto', 'insumo', 'banho', 'marketplace', 'fornecedor', 'kit', 'financeiro', 'estoque'
  const [editingItem, setEditingItem] = useState(null);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // --- ESTADOS DO BANCO DE DADOS (FIRESTORE) ---
  const [marketplaces, setMarketplaces] = useState([]);
  const [insumos, setInsumos] = useState([]);
  const [banhos, setBanhos] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [kits, setKits] = useState([]);
  const [historicoEstoque, setHistoricoEstoque] = useState([]);
  const [financeiro, setFinanceiro] = useState([]);

  // --- SUB-ESTADOS AUXILIARES (SIMULADORES, SEO & LIVE) ---
  const [seoResult, setSeoResult] = useState(null);
  const [isGeneratingSeo, setIsGeneratingSeo] = useState(false);
  const [metaFaturamento, setMetaFaturamento] = useState(15000); // Meta mensal default
  const [liveProduct, setLiveProduct] = useState(null);

  // --- ESTADOS DE FILTRO/PESQUISA ---
  const [searchQuery, setSearchQuery] = useState('');

  // --- ORDENAÇÃO ALFABÉTICA ROBUSTA POR SKU ---
  const sortedProdutos = useMemo(() => {
    return [...produtos].sort((a, b) => 
      (a.sku || "").toString().toLowerCase().localeCompare((b.sku || "").toString().toLowerCase())
    );
  }, [produtos]);

  // --- AUTENTICAÇÃO ANÔNIMA ---
  useEffect(() => {
    if (firebaseConfigError) {
      setAuthLoading(false);
      return;
    }
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.error("Erro na autenticação Firebase:", err);
        setAuthError('Não foi possível conectar ao Firebase. Verifique suas credenciais no .env e se a autenticação anônima está ativada no console do Firebase.');
        setAuthLoading(false);
      }
    };
    initAuth();
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  // --- SINCRONIZAÇÃO EM TEMPO REAL (REALTIME DATABASE) ---
  useEffect(() => {
    if (!user) return;
    const getPath = (col) => ref(db, `${appId}/${appId}_${col}`);
    const toArray = (snapshotVal) => {
      const val = snapshotVal || {};
      return Object.entries(val).map(([id, d]) => ({ id, ...d }));
    };

    const unsubM = onValue(getPath('marketplaces'), (s) => setMarketplaces(toArray(s.val())));
    const unsubI = onValue(getPath('insumos'), (s) => setInsumos(toArray(s.val())));
    const unsubB = onValue(getPath('banhos'), (s) => setBanhos(toArray(s.val())));
    const unsubP = onValue(getPath('produtos'), (s) => setProdutos(toArray(s.val())));
    const unsubF = onValue(getPath('fornecedores'), (s) => setFornecedores(toArray(s.val())));
    const unsubK = onValue(getPath('kits'), (s) => setKits(toArray(s.val())));
    const unsubH = onValue(getPath('historicoEstoque'), (s) => setHistoricoEstoque(toArray(s.val())));
    const unsubFin = onValue(getPath('financeiro'), (s) => setFinanceiro(toArray(s.val())));

    return () => { 
      unsubM(); unsubI(); unsubB(); unsubP(); unsubF(); unsubK(); unsubH(); unsubFin();
    };
  }, [user]);

  // --- CARREGAMENTO DE IMAGENS ---
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  // --- CONTROLE DE SALVAMENTO MULTI-MÓDULO ---
  const handleSave = async (e) => {
    e.preventDefault();
    setIsUploading(true);
    
    const formData = new FormData(e.target);
    const rawData = Object.fromEntries(formData.entries());
    const id = editingItem?.id || crypto.randomUUID();

    // --- VALIDAÇÃO DE SKU DUPLICADO ---
    if (modalType === 'produto' && rawData.sku) {
      const skuConflito = produtos.some(p => p.id !== id && (p.sku || '').toLowerCase() === rawData.sku.toLowerCase());
      if (skuConflito) {
        alert(`Já existe um produto com o SKU "${rawData.sku}". Escolha um código único.`);
        setIsUploading(false);
        return;
      }
    }
    if (modalType === 'kit' && rawData.sku) {
      const skuConflito = kits.some(k => k.id !== id && (k.sku || '').toLowerCase() === rawData.sku.toLowerCase());
      if (skuConflito) {
        alert(`Já existe um kit com o SKU "${rawData.sku}". Escolha um código único.`);
        setIsUploading(false);
        return;
      }
    }

    let finalImageUrl = editingItem?.foto || '';

    // Upload de Imagem para Firebase Storage
    if (imagePreview && imagePreview.startsWith('data:image')) {
      try {
        const imgRef = storageRef(storage, `${appId}/produtos/${id}.jpg`);
        const uploadResult = await uploadString(imgRef, imagePreview, 'data_url');
        finalImageUrl = await getDownloadURL(uploadResult.ref);
      } catch (error) {
        console.error("Erro Firebase Storage:", error);
        alert("Erro no upload da imagem. Os dados serão salvos sem a nova foto.");
      }
    }

    const data = {
      id,
      updatedAt: new Date().toISOString(),
      createdAt: editingItem?.createdAt || new Date().toISOString()
    };

    // Mapeamento de tipos numéricos do ERP
    const numericFields = [
      'custoBase', 'pesoBase', 'margemAlvo', 'custo', 'peso', 'precoPorGrama', 
      'comissao', 'imposto', 'taxaFixa', 'freteMedia', 'taxaPagamento', 
      'antecipacao', 'fraudeMedia', 'perdaMediaReembolso', 'fulfillment', 
      'taxaDevolucao', 'mensalidade', 'custoERP', 'custoHub', 'taxaAnuncio', 
      'ads', 'difal', 'cashback', 'cupom', 'estoqueInicial', 'estoqueMinimo', 
      'milesimos', 'cotacao', 'taxaOperacional', 'maoDeObra', 'perdaTecnica', 
      'margemTecnica', 'valor', 'saldo', 'minimo', 'ideal', 'pesoBruto', 'pesoLiquido'
    ];

    Object.keys(rawData).forEach(k => {
      if (k !== 'insumosIds' && k !== 'produtosIds') {
        data[k] = numericFields.includes(k) ? Number(rawData[k]) || 0 : rawData[k];
      }
    });

    // Módulos Específicos
    if (modalType === 'insumo') {
      data.somarAoBanho = rawData.somarAoBanho === 'on';
      data.saldo = Number(rawData.estoqueInicial) || editingItem?.saldo || 0;
    }
    
    if (modalType === 'produto') {
      data.foto = finalImageUrl;
      data.insumosIds = formData.getAll('insumosIds') || [];
      if (!data.tipoMargem) data.tipoMargem = editingItem?.tipoMargem || 'perc';
      data.status = rawData.status || 'Ativo';
      
      // Lógica de estoque inicial para novo produto
      if (!editingItem) {
        const estoqueInicial = Number(rawData.estoqueInicial) || 0;
        data.saldo = estoqueInicial;
        if (estoqueInicial > 0) {
          await registrarMovimentacaoEstoque(id, 'Entrada', estoqueInicial, 'Estoque Inicial de Cadastro');
        }
      } else {
        data.saldo = editingItem.saldo || 0;
      }
    }

    if (modalType === 'banho') {
      // Cálculo do Custo Real por Grama com base na cotação e taxas técnicas
      const cotacao = Number(rawData.cotacao) || 0;
      const milesimos = Number(rawData.milesimos) || 0;
      const perdaTecnica = Number(rawData.perdaTecnica) || 0;
      const maoDeObra = Number(rawData.maoDeObra) || 0;
      const taxaOperacional = Number(rawData.taxaOperacional) || 0;
      const margemTecnica = Number(rawData.margemTecnica) || 0;

      const custoMetalInerente = (cotacao / 1000) * milesimos;
      const comPerda = custoMetalInerente * (1 + (perdaTecnica / 100));
      const custoParcial = comPerda + maoDeObra + taxaOperacional;
      data.precoPorGrama = custoParcial * (1 + (margemTecnica / 100));
    }

    if (modalType === 'kit') {
      data.produtosIds = formData.getAll('produtosIds') || [];
      // Autocalcula peso e custos baseado nos produtos inclusos
      const prodRelated = data.produtosIds.map(pid => produtos.find(p => p.id === pid)).filter(Boolean);
      data.custoBase = prodRelated.reduce((acc, p) => acc + (p.custoBase || 0), 0);
      data.pesoBase = prodRelated.reduce((acc, p) => acc + (p.pesoBase || 0), 0);
    }

    if (modalType === 'fornecedor') {
      data.status = rawData.status || 'Ativo';
    }

    if (modalType === 'financeiro') {
      data.data = rawData.data || new Date().toISOString().split('T')[0];
    }

    const colName = modalType === 'marketplace' ? 'marketplaces' : modalType + 's';
    
    try {
      await set(ref(db, `${appId}/${appId}_${colName}/${id}`), data);
      setIsModalOpen(false);
      setEditingItem(null);
      setImagePreview('');
    } catch (err) {
      console.error("Erro ao salvar no Realtime Database:", err);
    } finally {
      setIsUploading(false);
    }
  };

  // --- EXCLUSÃO COM CONFIRMAÇÃO ---
  const handleDelete = async (colName, id, label = 'este item') => {
    const confirmado = window.confirm(`Tem certeza que deseja excluir ${label}? Esta ação não pode ser desfeita.`);
    if (!confirmado) return;
    try {
      await remove(ref(db, `${appId}/${appId}_${colName}/${id}`));
    } catch (err) {
      console.error(`Erro ao excluir de ${colName}:`, err);
      alert('Não foi possível excluir. Tente novamente.');
    }
  };

  // --- HISTÓRICO DE ESTOQUE ---
  const registrarMovimentacaoEstoque = async (itemID, tipo, quantidade, motivo) => {
    try {
      const novoId = crypto.randomUUID();
      await set(ref(db, `${appId}/${appId}_historicoEstoque/${novoId}`), {
        itemId: itemID,
        tipo, // 'Entrada' ou 'Saída'
        quantidade: Number(quantidade),
        motivo,
        data: new Date().toISOString()
      });
    } catch (e) {
      console.error("Erro ao gravar movimentação de estoque:", e);
    }
  };

  // --- MOVIMENTAÇÃO DE ESTOQUE MANUAL ---
  const handleAjusteEstoque = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const idProd = formData.get('produtoId');
    const tipo = formData.get('tipoMov');
    const quant = Number(formData.get('quantidade')) || 0;
    const motivo = formData.get('motivo') || 'Ajuste Manual';

    const targetProd = produtos.find(p => p.id === idProd);
    if (!targetProd) return;

    let novoSaldo = targetProd.saldo || 0;
    if (tipo === 'Entrada') {
      novoSaldo += quant;
    } else {
      novoSaldo = Math.max(0, novoSaldo - quant);
    }

    try {
      await set(ref(db, `${appId}/${appId}_produtos/${idProd}`), {
        ...targetProd,
        saldo: novoSaldo
      });
      await registrarMovimentacaoEstoque(idProd, tipo, quant, motivo);
      setIsModalOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  // --- CÁLCULO AVANÇADO DE PRECIFICAÇÃO (MOTOR COM 5 MODOS) ---
  const calcularPrecificacaoAvancada = useCallback((produto, mkt, modo = 'margem', valorConfig = 0) => {
    if (!produto || !mkt) return null;
    
    const insRelated = (produto.insumosIds || []).map(id => insumos.find(i => i.id === id)).filter(Boolean);
    const custoInsumos = insRelated.reduce((a, c) => a + Number(c.custo || 0), 0);
    const pesoExtraBanho = insRelated.filter(i => i.somarAoBanho).reduce((a, c) => a + Number(c.peso || 0), 0);
    const pesoTotalBanho = Number(produto.pesoBase || 0) + pesoExtraBanho;
    
    const banho = banhos.find(b => b.id === produto.banhoId);
    const custoBanho = pesoTotalBanho * Number(banho?.precoPorGrama || 0);
    
    // Custos fixos e agregados de fabricação
    const custoProducao = Number(produto.custoBase || 0) + custoInsumos + custoBanho;

    const taxasPerc = (
      Number(mkt.comissao || 0) + Number(mkt.imposto || 0) + Number(mkt.ads || 0) + 
      Number(mkt.difal || 0) + Number(mkt.cashback || 0) + Number(mkt.cupom || 0) + 
      Number(mkt.taxaPagamento || 0) + Number(mkt.antecipacao || 0) + 
      Number(mkt.fraudeMedia || 0) + Number(mkt.perdaMediaReembolso || 0) + 
      Number(mkt.taxaDevolucao || 0)
    ) / 100;

    const custosFixos = (
      Number(mkt.taxaFixa || 0) + Number(mkt.freteMedia || 0) + Number(mkt.fulfillment || 0) + 
      Number(mkt.mensalidade || 0) + Number(mkt.custoERP || 0) + Number(mkt.custoHub || 0) + 
      Number(mkt.taxaAnuncio || 0)
    );

    let precoVenda = 0;
    const metaMargem = valorConfig || Number(produto.margemAlvo || 0);

    // Motor de Precificação - 5 Modos
    if (modo === 'margem') {
      const divisor = 1 - taxasPerc - (metaMargem / 100);
      precoVenda = divisor > 0 ? (custoProducao + custosFixos) / divisor : 0;
    } else if (modo === 'lucro') {
      // Lucro fixo em R$
      precoVenda = (custoProducao + custosFixos + metaMargem) / (1 - taxasPerc);
    } else if (modo === 'alvo') {
      // Preço de venda pré-definido pelo usuário
      precoVenda = metaMargem;
    } else if (modo === 'psicologico') {
      // Arredonda para final .90 ou .99
      const precoCalculado = (custoProducao + custosFixos) / (1 - taxasPerc - 0.40); // 40% margem base
      precoVenda = Math.floor(precoCalculado) + 0.90;
    } else if (modo === 'competitivo') {
      // Foco em custo mínimo de sobrevivência (15% margem operacional)
      const divisor = 1 - taxasPerc - 0.15;
      precoVenda = divisor > 0 ? (custoProducao + custosFixos) / divisor : 0;
    }

    const impostosComissoesVal = precoVenda * taxasPerc;
    const lucro = precoVenda - impostosComissoesVal - custoProducao - custosFixos;
    const margemRealPorcentagem = precoVenda > 0 ? (lucro / precoVenda) * 100 : 0;

    // Indicador de Viabilidade
    let viabilidade = 'Vermelho';
    if (margemRealPorcentagem > 50) viabilidade = 'Verde';
    else if (margemRealPorcentagem >= 30) viabilidade = 'Amarelo';

    return { 
      precoVenda, 
      lucro, 
      custoProducao, 
      custoMetal: Number(produto.custoBase || 0), 
      custoInsumos, 
      custoBanho, 
      impostosComissoesVal, 
      custosFixosMkt: custosFixos,
      insumosUsados: insRelated,
      margemReal: margemRealPorcentagem,
      viabilidade
    };
  }, [banhos, insumos]);

  // --- GERADOR DE CONTEÚDO SEO PREMIUM ---
  const handleGerarSEO = (nomeProd, skuProd) => {
    setIsGeneratingSeo(true);
    setTimeout(() => {
      const titulos = {
        shopee: `${nomeProd.toUpperCase()} Semijoia Luxo Premium - SKU ${skuProd}`,
        mercadoLivre: `${nomeProd} Original Banhado Ouro 18k Com Garantia`,
        amazon: `${nomeProd} Classic Collection - Semijoia Fina de Alta Durabilidade`,
        tiktok: `🔥 Alerta Trend! ${nomeProd} Luxuoso para seu visual diário ✨ #semijoia`
      };
      
      const faq = [
        { q: "A peça escurece?", a: "Não, nosso banho possui tecnologia antialérgica e camada de verniz protetor premium." },
        { q: "Qual o prazo de envio?", a: "Despachamos em até 24 horas úteis com rastreamento completo." }
      ];

      setSeoResult({
        titulos,
        descricao: `Descubra a elegância incomparável do(a) ${nomeProd}. Produzido sob os mais rigorosos padrões de qualidade, esta peça une o design contemporâneo à durabilidade do banho premium. Perfeito para revendedores exigentes e uso pessoal de alto padrão.\n\nFicha Técnica:\n- SKU: ${skuProd}\n- Proteção Antialérgica de Alta Performance\n- Acabamento Lapidado`,
        tags: "semijoias, joias folheadas, atacado semijoias, luxo, acessorios femininos, chaveiros de luxo",
        faq
      });
      setIsGeneratingSeo(false);
    }, 1200);
  };

  // --- DADOS FINANCEIROS & DRE CALCULADO ---
  const metricasDRE = useMemo(() => {
    let receitaTotal = 0;
    let despesasTotais = 0;

    financeiro.forEach(t => {
      const val = Number(t.valor) || 0;
      if (t.tipo === 'Receita') receitaTotal += val;
      else despesasTotais += val;
    });

    // Custos operacionais fictícios baseados em estoque e banhos
    const custoEstimadoEstoque = produtos.reduce((acc, p) => acc + ((p.saldo || 0) * (p.custoBase || 0)), 0);

    return {
      receitaBruta: receitaTotal,
      despesas: despesasTotais,
      custoEstoqueAtivo: custoEstimadoEstoque,
      lucroLiquido: receitaTotal - despesasTotais
    };
  }, [financeiro, produtos]);

  // --- EXPORTAÇÃO REAL DE DADOS ---
  const handleExport = (tipoFormat) => {
    const dataStr = new Date().toISOString().split('T')[0];

    if (tipoFormat === 'excel') {
      const wb = XLSX.utils.book_new();

      const produtosSheet = sortedProdutos.map(p => ({
        SKU: p.sku,
        Nome: p.nome,
        Categoria: p.categoria || '',
        'Custo Base (R$)': Number(p.custoBase || 0),
        'Peso Base (g)': Number(p.pesoBase || 0),
        'Margem Alvo': p.margemAlvo || 0,
        'Estoque Atual': p.saldo || 0,
        Status: p.status || 'Ativo'
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(produtosSheet.length ? produtosSheet : [{ Info: 'Nenhum produto cadastrado' }]), 'Produtos');

      const financeiroSheet = financeiro.map(t => ({
        Data: t.data,
        Descrição: t.descricao,
        Tipo: t.tipo,
        'Valor (R$)': Number(t.valor || 0)
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(financeiroSheet.length ? financeiroSheet : [{ Info: 'Nenhum lançamento financeiro' }]), 'Financeiro');

      const dreSheet = [
        { Item: 'Receita Bruta', 'Valor (R$)': metricasDRE.receitaBruta },
        { Item: 'Despesas', 'Valor (R$)': metricasDRE.despesas },
        { Item: 'Lucro Líquido', 'Valor (R$)': metricasDRE.lucroLiquido },
        { Item: 'Estoque Ativo (Custo)', 'Valor (R$)': metricasDRE.custoEstoqueAtivo }
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dreSheet), 'DRE');

      const insumosSheet = insumos.map(i => ({
        Nome: i.nome,
        'Código': i.codigoInterno || '',
        'Custo (R$)': Number(i.custo || 0),
        'Estoque Atual': i.saldo || 0,
        'Estoque Mínimo': i.minimo || 0
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(insumosSheet.length ? insumosSheet : [{ Info: 'Nenhum insumo cadastrado' }]), 'Insumos');

      XLSX.writeFile(wb, `luary-shop-relatorio-${dataStr}.xlsx`);
      return;
    }

    if (tipoFormat === 'pdf') {
      const docPdf = new jsPDF();
      docPdf.setFontSize(18);
      docPdf.text('Luary Shop — Relatório Executivo', 14, 18);
      docPdf.setFontSize(10);
      docPdf.setTextColor(120);
      docPdf.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')}`, 14, 24);

      docPdf.setTextColor(0);
      docPdf.setFontSize(13);
      docPdf.text('DRE — Demonstrativo de Resultado', 14, 34);
      autoTable(docPdf, {
        startY: 38,
        head: [['Item', 'Valor (R$)']],
        body: [
          ['Receita Bruta', formatBRL(metricasDRE.receitaBruta)],
          ['Despesas', formatBRL(metricasDRE.despesas)],
          ['Lucro Líquido', formatBRL(metricasDRE.lucroLiquido)],
          ['Estoque Ativo (Custo)', formatBRL(metricasDRE.custoEstoqueAtivo)]
        ]
      });

      const finalY = docPdf.lastAutoTable.finalY || 60;
      docPdf.setFontSize(13);
      docPdf.text('Produtos Cadastrados', 14, finalY + 12);
      autoTable(docPdf, {
        startY: finalY + 16,
        head: [['SKU', 'Nome', 'Custo Base', 'Estoque', 'Status']],
        body: sortedProdutos.map(p => [
          p.sku || '-',
          p.nome || '-',
          `R$ ${formatBRL(p.custoBase)}`,
          p.saldo || 0,
          p.status || 'Ativo'
        ])
      });

      docPdf.save(`luary-shop-relatorio-${dataStr}.pdf`);
      return;
    }
  };

  // --- CRIAÇÃO DE DADOS DE MIGRAÇÃO / DEMONSTRATIVOS SE VAZIO ---
  const handleInserirDadosDemo = async () => {
    const demoFornecedorId = crypto.randomUUID();
    const demoBanhoId = crypto.randomUUID();
    const demoInsumoId = crypto.randomUUID();
    const demoMktId = crypto.randomUUID();
    const demoProdId = crypto.randomUUID();

    try {
      // 1. Fornecedor
      await set(ref(db, `${appId}/${appId}_fornecedores/${demoFornecedorId}`), {
        id: demoFornecedorId,
        nome: "Brilho Imperial Metais Atacado",
        contato: "Carlos Henrique",
        whatsapp: "+55 (11) 99999-8888",
        cidade: "Limeira",
        estado: "SP",
        prazo: "15 dias",
        status: "Ativo",
        createdAt: new Date().toISOString()
      });

      // 2. Banho
      await set(ref(db, `${appId}/${appId}_banhos/${demoBanhoId}`), {
        id: demoBanhoId,
        nome: "Ouro 18k Premium - 10 Milésimos",
        metal: "Ouro",
        cor: "Dourado",
        milesimos: 10,
        cotacao: 380,
        taxaOperacional: 1.5,
        maoDeObra: 2,
        perdaTecnica: 5,
        margemTecnica: 20,
        precoPorGrama: 9.35
      });

      // 3. Insumo
      await set(ref(db, `${appId}/${appId}_insumos/${demoInsumoId}`), {
        id: demoInsumoId,
        nome: "Embalagem Luxo Veludo Preta",
        custo: 4.5,
        peso: 12,
        somarAoBanho: false,
        saldo: 150,
        minimo: 20,
        ideal: 200,
        codigoInterno: "INS-EMB-01",
        fornecedorId: demoFornecedorId
      });

      // 4. Marketplace
      await set(ref(db, `${appId}/${appId}_marketplaces/${demoMktId}`), {
        id: demoMktId,
        nome: "Mercado Livre Premium",
        comissao: 16.5,
        imposto: 4,
        ads: 5,
        difal: 1,
        cashback: 2,
        cupom: 0,
        taxaPagamento: 2,
        antecipacao: 1.5,
        fraudeMedia: 0.5,
        perdaMediaReembolso: 0.5,
        taxaDevolucao: 1,
        taxaFixa: 6,
        freteMedia: 19.90,
        fulfillment: 3.5,
        mensalidade: 0,
        custoERP: 0.5,
        custoHub: 0.2,
        taxaAnuncio: 0
      });

      // 5. Produto
      await set(ref(db, `${appId}/${appId}_produtos/${demoProdId}`), {
        id: demoProdId,
        sku: "AN-001",
        nome: "Anel Solitário Imperial",
        custoBase: 12.50,
        pesoBase: 3.2,
        banhoId: demoBanhoId,
        insumosIds: [demoInsumoId],
        margemAlvo: 55,
        tipoMargem: "perc",
        saldo: 45,
        status: "Ativo",
        foto: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&q=80&w=400",
        createdAt: new Date().toISOString()
      });

      // 6. Financeiro Demo
      await set(ref(db, `${appId}/${appId}_financeiro/${crypto.randomUUID()}`), {
        id: crypto.randomUUID(),
        descricao: "Venda Anel Solitário ML",
        tipo: "Receita",
        valor: 159.90,
        data: new Date().toISOString().split('T')[0]
      });

      await set(ref(db, `${appId}/${appId}_financeiro/${crypto.randomUUID()}`), {
        id: crypto.randomUUID(),
        descricao: "Compra insumos de embalagem",
        tipo: "Despesa",
        valor: 450.00,
        data: new Date().toISOString().split('T')[0]
      });

      alert("Massa de dados demonstrativa de Alta Joalheria inserida com sucesso!");
    } catch (e) {
      console.error(e);
    }
  };

  // --- SELECIONAR PRODUTO CORRIGIDO ---
  const currentProduct = useMemo(() => {
    return produtos.find(p => p.id === selectedProductId);
  }, [produtos, selectedProductId]);

  // --- TELA DE ERRO DE CONFIGURAÇÃO / CONEXÃO ---
  if (authError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-red-100 rounded-[2.5rem] p-10 shadow-sm text-center space-y-4">
          <div className="mx-auto w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center">
            <AlertTriangle size={28} />
          </div>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Não foi possível conectar</h2>
          <p className="text-sm text-slate-500 font-medium leading-relaxed">{authError}</p>
        </div>
      </div>
    );
  }

  // --- TELA DE CARREGAMENTO INICIAL ---
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Conectando ao Luary Shop...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-900">
      
      {/* SIDEBAR NAV PREMIUM */}
      <aside className="w-full md:w-80 bg-slate-900 text-slate-100 border-r border-slate-800 p-6 flex flex-col gap-8 shrink-0">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2.5 rounded-2xl text-white shadow-lg shadow-indigo-500/20">
              <Calculator size={26} />
            </div>
            <div>
              <h1 className="font-black text-xl leading-none uppercase tracking-tighter text-white">Luary Shop</h1>
              <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mt-1">ERP Comercial & Precificação</p>
            </div>
          </div>
        </div>

        {/* CONTROLE DE CONEXÃO E BOTÃO DEMO */}
        {produtos.length === 0 && (
          <div className="p-4 bg-indigo-950/40 rounded-2xl border border-indigo-800/30 text-center space-y-2">
            <p className="text-[11px] text-indigo-300 font-bold leading-tight">Nenhum dado encontrado no Firestore.</p>
            <button 
              onClick={handleInserirDadosDemo}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold uppercase py-2 px-3 rounded-xl transition-all"
            >
              Inserir Dados Demo
            </button>
          </div>
        )}

        <nav className="space-y-1 overflow-y-auto max-h-[70vh] pr-1">
          {[
            { id: 'dashboard', icon: <LayoutDashboard size={18}/>, label: 'Dashboard Executivo' },
            { id: 'produtos', icon: <Package size={18}/>, label: 'Módulo Produtos' },
            { id: 'kits', icon: <ShoppingCart size={18}/>, label: 'Módulo Kits' },
            { id: 'insumos', icon: <Box size={18}/>, label: 'Módulo Insumos' },
            { id: 'banhos', icon: <Droplets size={18}/>, label: 'Módulo Banhos' },
            { id: 'marketplaces', icon: <Store size={18}/>, label: 'Marketplaces (Canais)' },
            { id: 'fornecedores', icon: <Users size={18}/>, label: 'Fornecedores' },
            { id: 'estoque', icon: <Database size={18}/>, label: 'Movimentar Estoque' },
            { id: 'seo', icon: <Sparkles size={18}/>, label: 'Gerador de SEO AI' },
            { id: 'financeiro', icon: <Coins size={18}/>, label: 'Financeiro & DRE' },
            { id: 'live', icon: <Tv size={18}/>, label: 'Modo Live Stream' }
          ].map(item => (
            <button 
              key={item.id} 
              onClick={() => {
                setActiveTab(item.id);
                // Se for Live, autoseleciona o primeiro produto se nenhum selecionado
                if (item.id === 'live' && sortedProdutos.length > 0 && !liveProduct) {
                  setLiveProduct(sortedProdutos[0]);
                }
              }} 
              className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl font-bold transition-all ${activeTab === item.id ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/10' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'}`}
            >
              <div className="flex items-center gap-3">
                {item.icon}
                <span className="text-sm">{item.label}</span>
              </div>
              <ChevronRight size={14} className={`opacity-0 ${activeTab === item.id ? 'opacity-100' : ''}`} />
            </button>
          ))}
        </nav>
      </aside>

      {/* PAINEL CENTRAL */}
      <main className="flex-1 p-6 md:p-12 overflow-y-auto max-h-screen">
        
        {/* TAB 1: DASHBOARD EXECUTIVO */}
        {activeTab === 'dashboard' && (
          <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-4xl font-black tracking-tight text-slate-800">Dashboard Executivo</h2>
                <p className="text-slate-400 font-bold text-sm uppercase">Análise de Performance de Semijoias e Canais</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleExport('pdf')} className="bg-white border text-slate-700 font-bold text-xs uppercase px-4 py-2.5 rounded-xl hover:bg-slate-100 flex items-center gap-1.5 shadow-sm"><FileText size={14}/> PDF</button>
                <button onClick={() => handleExport('excel')} className="bg-white border text-slate-700 font-bold text-xs uppercase px-4 py-2.5 rounded-xl hover:bg-slate-100 flex items-center gap-1.5 shadow-sm"><FileText size={14}/> Excel</button>
              </div>
            </div>

            {/* METRICAS PRINCIPAIS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-[2rem] border shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase">Faturamento Bruto</p>
                  <p className="text-2xl font-black text-slate-800 mt-1">R$ {formatBRL(metricasDRE.receitaBruta)}</p>
                </div>
                <div className="bg-emerald-50 text-emerald-600 p-3 rounded-2xl"><ArrowUpRight size={24}/></div>
              </div>

              <div className="bg-white p-6 rounded-[2rem] border shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase">Lucro Líquido</p>
                  <p className="text-2xl font-black text-slate-800 mt-1">R$ {formatBRL(metricasDRE.lucroLiquido)}</p>
                </div>
                <div className="bg-indigo-50 text-indigo-600 p-3 rounded-2xl"><Coins size={24}/></div>
              </div>

              <div className="bg-white p-6 rounded-[2rem] border shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase">Produtos Ativos</p>
                  <p className="text-2xl font-black text-slate-800 mt-1">{produtos.length} Ref</p>
                </div>
                <div className="bg-amber-50 text-amber-600 p-3 rounded-2xl"><Package size={24}/></div>
              </div>

              <div className="bg-white p-6 rounded-[2rem] border shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase">Ativo em Estoque (Metal)</p>
                  <p className="text-2xl font-black text-slate-800 mt-1">R$ {formatBRL(metricasDRE.custoEstoqueAtivo)}</p>
                </div>
                <div className="bg-blue-50 text-blue-600 p-3 rounded-2xl"><Database size={24}/></div>
              </div>
            </div>

            {/* CÁLCULO DE METAS & SIMULADOR DE ESCALA */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><Target className="text-indigo-600"/><h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Metas Comerciais</h3></div>
                  <input 
                    type="number" 
                    value={metaFaturamento} 
                    onChange={(e) => setMetaFaturamento(Number(e.target.value) || 0)} 
                    className="w-32 bg-slate-50 p-2.5 rounded-xl font-bold border-none text-right focus:ring-2 ring-indigo-500/20"
                  />
                </div>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                      <span>PROGRESSO DA META MENSAL</span>
                      <span>{formatNumBR(((metricasDRE.receitaBruta / (metaFaturamento || 1)) * 100), 1)}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                      <div className="bg-indigo-600 h-full transition-all" style={{ width: `${Math.min(100, (metricasDRE.receitaBruta / (metaFaturamento || 1)) * 100)}%` }}></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400">RESTANTE PARA A META</p>
                      <p className="text-lg font-black text-slate-700">R$ {formatBRL(Math.max(0, metaFaturamento - metricasDRE.receitaBruta))}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400">SUGESTÃO DE META DIÁRIA</p>
                      <p className="text-lg font-black text-slate-700">R$ {formatBRL((metaFaturamento / 30))}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-6">
                <div className="flex items-center gap-2"><TrendingUp className="text-indigo-600"/><h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Simulador de Escala Diária</h3></div>
                <p className="text-xs text-slate-400 font-bold uppercase leading-tight">Quantidade necessária de vendas diárias estimadas para atingir faturamentos-alvo.</p>
                
                <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                  {[100, 300, 1000, 3000, 10000].map(alvo => {
                    const ticketMedio = metricasDRE.receitaBruta > 0 ? (metricasDRE.receitaBruta / (produtos.length || 1)) : 149.90;
                    const qtdNecessaria = Math.ceil(alvo / ticketMedio);
                    return (
                      <div key={alvo} className="flex justify-between items-center py-2.5">
                        <span className="text-xs font-black text-slate-600">Para faturar R$ {alvo.toLocaleString()} / dia</span>
                        <span className="bg-indigo-50 text-indigo-600 text-xs font-black px-3 py-1 rounded-full border border-indigo-100">~{qtdNecessaria} vendas / dia</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* AUDITORIA COMPLETA DE PRODUTO EM CANAIS */}
            <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-6">
              <div className="flex items-center gap-2 text-indigo-600">
                <Store size={22}/>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Auditoria e Simulador de Canais</h3>
              </div>
              
              <div className="flex gap-4 items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <select 
                  className="flex-1 bg-transparent outline-none font-bold text-slate-700"
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                >
                  <option value="">Selecione um Produto para Simular</option>
                  {sortedProdutos.map(p => <option key={p.id} value={p.id}>{p.sku} - {p.nome}</option>)}
                </select>
              </div>

              {currentProduct && marketplaces.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {marketplaces.map(mkt => {
                    const resMargem = calcularPrecificacaoAvancada(currentProduct, mkt, 'margem');
                    const resCompetitivo = calcularPrecificacaoAvancada(currentProduct, mkt, 'competitivo');
                    const resPsicologico = calcularPrecificacaoAvancada(currentProduct, mkt, 'psicologico');
                    
                    if (!resMargem) return null;

                    return (
                      <div key={mkt.id} className="bg-slate-50/50 p-6 rounded-3xl border border-slate-200/60 space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-black text-lg text-slate-800 leading-tight">{mkt.nome}</h4>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Canal Ativo</span>
                          </div>
                          
                          {/* Indicador de Viabilidade UX */}
                          <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase border ${
                            resMargem.viabilidade === 'Verde' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                            resMargem.viabilidade === 'Amarelo' ? 'bg-amber-50 text-amber-600 border-amber-100' : 
                            'bg-red-50 text-red-500 border-red-100'
                          }`}>
                            {formatNumBR(resMargem.margemReal, 1)}% Margem
                          </span>
                        </div>

                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between"><span className="text-slate-400 font-bold">PREÇO RECOMENDADO:</span><span className="font-black text-slate-800">R$ {formatBRL(resMargem.precoVenda)}</span></div>
                          <div className="flex justify-between"><span className="text-slate-400 font-bold">PREÇO PSICOLÓGICO:</span><span className="font-black text-indigo-600">R$ {formatBRL(resPsicologico.precoVenda)}</span></div>
                          <div className="flex justify-between"><span className="text-slate-400 font-bold">MÍNIMO COMPETITIVO:</span><span className="font-black text-slate-600">R$ {formatBRL(resCompetitivo.precoVenda)}</span></div>
                          <div className="flex justify-between border-t border-dashed border-slate-200 pt-2"><span className="text-slate-500 font-black">LUCRO ESTIMADO:</span><span className="font-black text-emerald-600">R$ {formatBRL(resMargem.lucro)}</span></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-400 font-bold uppercase italic text-center py-6">Selecione um produto e certifique-se de que possui pelo menos um canal de venda cadastrado.</p>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: MÓDULO PRODUTOS */}
        {activeTab === 'produtos' && (
          <div className="max-w-7xl mx-auto space-y-6 animate-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-4xl font-black text-slate-800">Módulo de Produtos</h2>
                <p className="text-slate-400 font-bold text-sm uppercase">Cadastre Semijoias, Chaveiros e Peças e gerencie seu CPV</p>
              </div>
              <button 
                onClick={() => { setModalType('produto'); setEditingItem(null); setImagePreview(''); setIsModalOpen(true); }}
                className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg hover:scale-105 transition-all uppercase text-xs flex items-center gap-2"
              >
                <Plus size={16}/> Novo Produto
              </button>
            </div>

            {/* TABELA DE PRODUTOS COMPLETA */}
            <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="p-6 font-black uppercase text-[10px] text-slate-400 w-24 text-center">Foto</th>
                    <th className="p-6 font-black uppercase text-[10px] text-slate-400">SKU / Identificação</th>
                    <th className="p-6 font-black uppercase text-[10px] text-slate-400">Categoria</th>
                    <th className="p-6 font-black uppercase text-[10px] text-slate-400">Estoque / Status</th>
                    <th className="p-6 font-black uppercase text-[10px] text-slate-400">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {sortedProdutos.map(prod => {
                    const banhoItem = banhos.find(b => b.id === prod.banhoId);
                    return (
                      <tr key={prod.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="p-4">
                          <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 border mx-auto flex items-center justify-center">
                            {prod.foto ? <img src={prod.foto} className="w-full h-full object-cover" /> : <Camera size={20} className="text-slate-300"/>}
                          </div>
                        </td>
                        <td className="p-6">
                          <div className="font-black text-slate-800 text-base">{prod.nome}</div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">SKU: {prod.sku} | Banho: {banhoItem?.nome || 'Nenhum'}</div>
                        </td>
                        <td className="p-6">
                          <div className="text-xs font-bold text-slate-600">{prod.categoria || 'Sem Categoria'}</div>
                          <div className="text-[9px] text-slate-400 font-bold uppercase">{prod.subcategoria || '-'}</div>
                        </td>
                        <td className="p-6">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${prod.saldo > (prod.estoqueMinimo || 5) ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                            {prod.saldo || 0} em estoque
                          </span>
                        </td>
                        <td className="p-6">
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { setModalType('produto'); setEditingItem(prod); setImagePreview(prod.foto || ''); setIsModalOpen(true); }} className="p-3 bg-slate-100 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all"><Edit2 size={14}/></button>
                            <button onClick={() => handleDelete('produtos', prod.id, `o produto "${prod.nome}"`)} className="p-3 bg-slate-100 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all"><Trash2 size={14}/></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: MÓDULO KITS */}
        {activeTab === 'kits' && (
          <div className="max-w-7xl mx-auto space-y-6 animate-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-4xl font-black text-slate-800">Módulo de Kits</h2>
                <p className="text-slate-400 font-bold text-sm uppercase">Agrupe múltiplos produtos e crie ofertas irresistíveis</p>
              </div>
              <button 
                onClick={() => { setModalType('kit'); setEditingItem(null); setIsModalOpen(true); }}
                className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg hover:scale-105 transition-all uppercase text-xs flex items-center gap-2"
              >
                <Plus size={16}/> Novo Kit
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm p-8">
              {kits.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {kits.map(kit => (
                    <div key={kit.id} className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-black text-xl text-slate-800">{kit.nome}</h4>
                          <span className="text-[10px] font-black text-slate-400 uppercase">SKU Kit: {kit.sku}</span>
                        </div>
                        <button onClick={() => handleDelete('kits', kit.id, `o kit "${kit.nome}"`)} className="text-red-500 hover:text-red-700 p-2"><Trash2 size={16}/></button>
                      </div>
                      
                      <div className="space-y-1 bg-white p-4 rounded-2xl border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">PRODUTOS VINCULADOS:</p>
                        {(kit.produtosIds || []).map(pid => {
                          const p = produtos.find(item => item.id === pid);
                          return p ? (
                            <div key={pid} className="flex justify-between text-xs font-bold text-slate-600">
                              <span>- {p.nome}</span>
                              <span>R$ {formatBRL(p.custoBase)}</span>
                            </div>
                          ) : null;
                        })}
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className="bg-white p-3 rounded-xl border text-center">
                          <p className="text-[8px] font-bold text-slate-400 uppercase">Custo Total Base</p>
                          <p className="text-base font-black text-slate-700">R$ {formatBRL(Number(kit.custoBase || 0))}</p>
                        </div>
                        <div className="bg-white p-3 rounded-xl border text-center">
                          <p className="text-[8px] font-bold text-slate-400 uppercase">Peso Acumulado</p>
                          <p className="text-base font-black text-slate-700">{formatNumBR(Number(kit.pesoBase || 0))}g</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-center font-bold uppercase italic py-8">Nenhum kit registrado no sistema até o momento.</p>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: MÓDULO INSUMOS */}
        {activeTab === 'insumos' && (
          <div className="max-w-7xl mx-auto space-y-6 animate-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-4xl font-black text-slate-800">Módulo de Insumos</h2>
                <p className="text-slate-400 font-bold text-sm uppercase">Embalagens, tarrachas, contra-argolas, tags e etiquetas</p>
              </div>
              <button 
                onClick={() => { setModalType('insumo'); setEditingItem(null); setIsModalOpen(true); }}
                className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg hover:scale-105 transition-all uppercase text-xs flex items-center gap-2"
              >
                <Plus size={16}/> Novo Insumo
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="p-6 font-black uppercase text-[10px] text-slate-400">Nome / Código</th>
                    <th className="p-6 font-black uppercase text-[10px] text-slate-400">Custo</th>
                    <th className="p-6 font-black uppercase text-[10px] text-slate-400">Estoque Atual</th>
                    <th className="p-6 font-black uppercase text-[10px] text-slate-400">Estoque Mínimo</th>
                    <th className="p-6 text-right font-black uppercase text-[10px] text-slate-400">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {insumos.map(ins => (
                    <tr key={ins.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="p-6">
                        <div className="font-black text-slate-800 text-base">{ins.nome}</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{ins.codigoInterno || 'Sem Código'}</div>
                      </td>
                      <td className="p-6 font-bold text-slate-700">R$ {formatBRL(Number(ins.custo || 0))}</td>
                      <td className="p-6">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase ${Number(ins.saldo || 0) < Number(ins.minimo || 5) ? 'bg-red-50 text-red-500' : 'bg-slate-100 text-slate-700'}`}>
                          {ins.saldo || 0} un
                        </span>
                      </td>
                      <td className="p-6 font-bold text-slate-400">{ins.minimo || 0} un</td>
                      <td className="p-6 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setModalType('insumo'); setEditingItem(ins); setIsModalOpen(true); }} className="p-3 bg-slate-100 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all"><Edit2 size={14}/></button>
                          <button onClick={() => handleDelete('insumos', ins.id, `o insumo "${ins.nome}"`)} className="p-3 bg-slate-100 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all"><Trash2 size={14}/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: MÓDULO BANHOS (COM CÁLCULO CIENTÍFICO) */}
        {activeTab === 'banhos' && (
          <div className="max-w-7xl mx-auto space-y-6 animate-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-4xl font-black text-slate-800">Módulo de Banhos</h2>
                <p className="text-slate-400 font-bold text-sm uppercase">Cálculo real por grama com base na cotação internacional dos metais</p>
              </div>
              <button 
                onClick={() => { setModalType('banho'); setEditingItem(null); setIsModalOpen(true); }}
                className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg hover:scale-105 transition-all uppercase text-xs flex items-center gap-2"
              >
                <Plus size={16}/> Novo Banho
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {banhos.map(b => (
                <div key={b.id} className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-black text-xl text-slate-800 leading-tight">{b.nome}</h4>
                      <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-1">{b.cor} | {b.milesimos} Milésimos</p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => { setModalType('banho'); setEditingItem(b); setIsModalOpen(true); }} className="text-indigo-600 p-2 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all"><Edit2 size={14}/></button>
                      <button onClick={() => handleDelete('banhos', b.id, `o banho "${b.nome}"`)} className="text-red-500 p-2 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all"><Trash2 size={14}/></button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-2xl">
                    <div><span className="text-slate-400">Metal:</span> <span className="font-black text-slate-800">{b.metal}</span></div>
                    <div><span className="text-slate-400">Mão de Obra:</span> <span className="font-black text-slate-800">R$ {b.maoDeObra || 0}/g</span></div>
                    <div><span className="text-slate-400">Cotação Metal:</span> <span className="font-black text-slate-800">R$ {b.cotacao || 0}/g</span></div>
                    <div><span className="text-slate-400">Perda Técnica:</span> <span className="font-black text-slate-800">{b.perdaTecnica || 0}%</span></div>
                  </div>

                  <div className="pt-2 border-t border-dashed">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Custo Real por Grama</p>
                    <p className="text-3xl font-black text-slate-800">R$ {formatBRL(Number(b.precoPorGrama || 0))}/g</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: MARKETPLACES */}
        {activeTab === 'marketplaces' && (
          <div className="max-w-7xl mx-auto space-y-6 animate-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-4xl font-black text-slate-800">Canais de Venda</h2>
                <p className="text-slate-400 font-bold text-sm uppercase">TikTok Shop, Shopee, Mercado Livre, Amazon e site próprio</p>
              </div>
              <button 
                onClick={() => { setModalType('marketplace'); setEditingItem(null); setIsModalOpen(true); }}
                className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg hover:scale-105 transition-all uppercase text-xs flex items-center gap-2"
              >
                <Plus size={16}/> Novo Canal
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {marketplaces.map(mkt => (
                <div key={mkt.id} className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-black text-xl text-slate-800">{mkt.nome}</h4>
                      <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-1">Imposto: {mkt.imposto || 0}%</p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => { setModalType('marketplace'); setEditingItem(mkt); setIsModalOpen(true); }} className="text-indigo-600 p-2 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all"><Edit2 size={14}/></button>
                      <button onClick={() => handleDelete('marketplaces', mkt.id, `o canal "${mkt.nome}"`)} className="text-red-500 p-2 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all"><Trash2 size={14}/></button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-slate-50 p-2.5 rounded-xl"><p className="text-[8px] font-bold text-slate-400 uppercase">Comissão</p><p className="font-black text-slate-800">{mkt.comissao || 0}%</p></div>
                    <div className="bg-slate-50 p-2.5 rounded-xl"><p className="text-[8px] font-bold text-slate-400 uppercase">Frete Médio</p><p className="font-black text-slate-800">R$ {mkt.freteMedia || 0}</p></div>
                    <div className="bg-slate-50 p-2.5 rounded-xl"><p className="text-[8px] font-bold text-slate-400 uppercase">Taxa Fixa</p><p className="font-black text-slate-800">R$ {mkt.taxaFixa || 0}</p></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 7: FORNECEDORES */}
        {activeTab === 'fornecedores' && (
          <div className="max-w-7xl mx-auto space-y-6 animate-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-4xl font-black text-slate-800">Módulo Fornecedores</h2>
                <p className="text-slate-400 font-bold text-sm uppercase">Fábricas de Bruto de Limeira, Guaporé, Importadoras e Embalagens</p>
              </div>
              <button 
                onClick={() => { setModalType('fornecedor'); setEditingItem(null); setIsModalOpen(true); }}
                className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg hover:scale-105 transition-all uppercase text-xs flex items-center gap-2"
              >
                <Plus size={16}/> Novo Fornecedor
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="p-6 font-black uppercase text-[10px] text-slate-400">Nome / Contato</th>
                    <th className="p-6 font-black uppercase text-[10px] text-slate-400">WhatsApp</th>
                    <th className="p-6 font-black uppercase text-[10px] text-slate-400">Cidade / UF</th>
                    <th className="p-6 font-black uppercase text-[10px] text-slate-400">Status</th>
                    <th className="p-6 text-right font-black uppercase text-[10px] text-slate-400">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {fornecedores.map(f => (
                    <tr key={f.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="p-6">
                        <div className="font-black text-slate-800 text-base">{f.nome}</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{f.contato || 'Sem Contato Direto'}</div>
                      </td>
                      <td className="p-6 font-bold text-slate-700">{f.whatsapp || 'Não Informado'}</td>
                      <td className="p-6 font-bold text-slate-500">{f.cidade} / {f.estado}</td>
                      <td className="p-6">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${f.status === 'Ativo' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                          {f.status || 'Ativo'}
                        </span>
                      </td>
                      <td className="p-6 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setModalType('fornecedor'); setEditingItem(f); setIsModalOpen(true); }} className="p-3 bg-slate-100 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all"><Edit2 size={14}/></button>
                          <button onClick={() => handleDelete('fornecedores', f.id, `o fornecedor "${f.nome}"`)} className="p-3 bg-slate-100 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all"><Trash2 size={14}/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 8: ESTOQUE MANUAL */}
        {activeTab === 'estoque' && (
          <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-4">
            <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-6">
              <div className="flex items-center gap-2 text-indigo-600">
                <Database size={24}/>
                <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Movimentação de Estoque</h3>
              </div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-relaxed">Insira ou remova estoque físico de produtos para manter sincronia com as vendas reais.</p>
              
              <form onSubmit={handleAjusteEstoque} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Produto Alvo</label>
                  <select name="produtoId" required className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-none outline-none focus:ring-2 ring-indigo-500/20 transition-all">
                    <option value="">Selecione...</option>
                    {sortedProdutos.map(p => <option key={p.id} value={p.id}>{p.sku} - {p.nome} (Atual: {p.saldo || 0})</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Tipo de Operação</label>
                    <select name="tipoMov" required className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-none outline-none focus:ring-2 ring-indigo-500/20 transition-all">
                      <option value="Entrada">Entrada (+)</option>
                      <option value="Saída">Saída (-)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Quantidade de Itens</label>
                    <input name="quantidade" type="number" placeholder="Ex: 10" required className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-none outline-none focus:ring-2 ring-indigo-500/20 transition-all" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Motivo / Justificativa</label>
                  <input name="motivo" placeholder="Ex: Devolução de Cliente, Reposição de Fornecedor" required className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-none outline-none focus:ring-2 ring-indigo-500/20 transition-all" />
                </div>

                <button type="submit" className="w-full bg-indigo-600 text-white p-5 rounded-[2rem] font-black shadow-xl hover:bg-indigo-700 transition-all uppercase text-xs tracking-widest">
                  Confirmar Ajuste
                </button>
              </form>
            </div>

            {/* HISTÓRICO DE MOVIMENTAÇÕES */}
            <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-6">
              <h4 className="font-black text-xl text-slate-800 uppercase tracking-tight">Histórico de Movimentações Recentes</h4>
              <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                {historicoEstoque.map(h => {
                  const p = produtos.find(prod => prod.id === h.itemId);
                  return (
                    <div key={h.id} className="flex justify-between items-center py-3">
                      <div>
                        <p className="text-xs font-black text-slate-800">{p?.nome || 'Produto Removido'}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase">{h.motivo}</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs font-black ${h.tipo === 'Entrada' ? 'text-emerald-600' : 'text-red-500'}`}>
                          {h.tipo === 'Entrada' ? '+' : '-'}{h.quantidade} un
                        </span>
                        <p className="text-[9px] text-slate-400 font-bold">{new Date(h.data).toLocaleDateString()}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 9: GERADOR DE SEO AI */}
        {activeTab === 'seo' && (
          <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-4">
            <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-6">
              <div className="flex items-center gap-2 text-indigo-600">
                <Sparkles size={24}/>
                <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Gerador de SEO Premium</h3>
              </div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-relaxed">Gere títulos magnéticos, FAQ estruturado e descrições otimizadas para ranqueamento na Shopee, TikTok Shop e Google.</p>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Escolha o Produto para SEO</label>
                  <select 
                    className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-none outline-none focus:ring-2 ring-indigo-500/20 transition-all"
                    onChange={(e) => {
                      const p = produtos.find(item => item.id === e.target.value);
                      if (p) handleGerarSEO(p.nome, p.sku);
                    }}
                  >
                    <option value="">Selecione...</option>
                    {sortedProdutos.map(p => <option key={p.id} value={p.id}>{p.sku} - {p.nome}</option>)}
                  </select>
                </div>

                {isGeneratingSeo && (
                  <div className="text-center py-8 space-y-3">
                    <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-xs font-bold text-indigo-600 uppercase">Processando Heurísticas de Ranqueamento SEO...</p>
                  </div>
                )}

                {seoResult && !isGeneratingSeo && (
                  <div className="space-y-6 animate-in zoom-in-95 duration-300">
                    <div className="space-y-3">
                      <p className="text-[10px] font-black text-slate-400 uppercase">Títulos Propostos por Canal</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <span className="font-black text-[9px] text-amber-600 uppercase">Shopee</span>
                          <p className="font-bold text-slate-700 mt-1">{seoResult.titulos.shopee}</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <span className="font-black text-[9px] text-blue-500 uppercase">Mercado Livre</span>
                          <p className="font-bold text-slate-700 mt-1">{seoResult.titulos.mercadoLivre}</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <span className="font-black text-[9px] text-emerald-600 uppercase">TikTok Shop</span>
                          <p className="font-bold text-slate-700 mt-1">{seoResult.titulos.tiktok}</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <span className="font-black text-[9px] text-slate-500 uppercase">Amazon</span>
                          <p className="font-bold text-slate-700 mt-1">{seoResult.titulos.amazon}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase">Descrição Otimizada</p>
                      <textarea readOnly value={seoResult.descricao} rows={5} className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-none text-xs text-slate-700" />
                    </div>

                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase">Tags Relevantes</p>
                      <input readOnly value={seoResult.tags} className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-none text-xs text-indigo-600" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 10: FINANCEIRO & DRE COMPLETO */}
        {activeTab === 'financeiro' && (
          <div className="max-w-6xl mx-auto space-y-8 animate-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-4xl font-black text-slate-800">DRE & Fluxo de Caixa</h2>
                <p className="text-slate-400 font-bold text-sm uppercase">Registre receitas e despesas diretas para consolidação do DRE</p>
              </div>
              <button 
                onClick={() => { setModalType('financeiro'); setEditingItem(null); setIsModalOpen(true); }}
                className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg hover:scale-105 transition-all uppercase text-xs flex items-center gap-2"
              >
                <Plus size={16}/> Lançamento Financeiro
              </button>
            </div>

            {/* DRE FORMATADO PREMIUM */}
            <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-6">
              <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Demonstrativo do Resultado do Exercício (DRE)</h3>
              
              <div className="divide-y divide-slate-100 font-bold text-sm">
                <div className="flex justify-between py-3 text-slate-700"><span className="uppercase">(+) Receita Bruta de Vendas</span><span className="font-black text-slate-800">R$ {formatBRL(metricasDRE.receitaBruta)}</span></div>
                <div className="flex justify-between py-3 text-red-500"><span className="uppercase">(-) Custos Operacionais e Despesas</span><span className="font-black">R$ {formatBRL(metricasDRE.despesas)}</span></div>
                <div className="flex justify-between py-4 text-lg border-t-2 border-slate-200"><span className="font-black uppercase text-slate-800">(=) Resultado Líquido do Exercício</span><span className={`font-black ${metricasDRE.lucroLiquido >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>R$ {formatBRL(metricasDRE.lucroLiquido)}</span></div>
              </div>
            </div>

            {/* LISTAGEM DE LANÇAMENTOS */}
            <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="p-6 font-black uppercase text-[10px] text-slate-400">Descrição</th>
                    <th className="p-6 font-black uppercase text-[10px] text-slate-400">Tipo</th>
                    <th className="p-6 font-black uppercase text-[10px] text-slate-400">Valor</th>
                    <th className="p-6 font-black uppercase text-[10px] text-slate-400">Data</th>
                    <th className="p-6 text-right font-black uppercase text-[10px] text-slate-400">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {financeiro.map(trans => (
                    <tr key={trans.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="p-6 font-black text-slate-700">{trans.descricao}</td>
                      <td className="p-6">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${trans.tipo === 'Receita' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                          {trans.tipo}
                        </span>
                      </td>
                      <td className="p-6 font-bold">R$ {formatBRL(Number(trans.valor || 0))}</td>
                      <td className="p-6 font-bold text-slate-400">{trans.data}</td>
                      <td className="p-6 text-right">
                        <button onClick={() => handleDelete('financeiro', trans.id, `o lançamento "${trans.descricao}"`)} className="p-3 bg-slate-100 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all opacity-0 group-hover:opacity-100"><Trash2 size={14}/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 11: MODO LIVE STREAM COMPANION */}
        {activeTab === 'live' && (
          <div className="max-w-5xl mx-auto space-y-8 animate-in zoom-in-95 duration-500">
            <div className="bg-slate-900 text-slate-100 p-10 rounded-[3rem] shadow-2xl border border-slate-800 space-y-8">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="w-3.5 h-3.5 bg-red-500 rounded-full animate-ping"></span>
                  <h3 className="text-2xl font-black uppercase tracking-tight text-white">Live Stream Companion</h3>
                </div>
                <select 
                  className="bg-slate-800 border-none rounded-xl p-3 font-bold text-xs text-white uppercase outline-none cursor-pointer"
                  onChange={(e) => {
                    const p = produtos.find(prod => prod.id === e.target.value);
                    if (p) setLiveProduct(p);
                  }}
                  value={liveProduct?.id || ''}
                >
                  <option value="">Alternar Peça na Tela...</option>
                  {sortedProdutos.map(p => <option key={p.id} value={p.id}>{p.sku} - {p.nome}</option>)}
                </select>
              </div>

              {liveProduct ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
                  <div className="w-full aspect-square rounded-[2rem] overflow-hidden bg-slate-850 border border-slate-800 flex items-center justify-center">
                    {liveProduct.foto ? <img src={liveProduct.foto} alt="Peça em Foco" className="w-full h-full object-cover" /> : <ImageIcon size={80} className="text-slate-700" />}
                  </div>

                  <div className="space-y-6">
                    <div>
                      <span className="bg-indigo-600/30 text-indigo-400 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border border-indigo-500/20">CÓDIGO: {liveProduct.sku}</span>
                      <h4 className="text-4xl font-black text-white mt-4">{liveProduct.nome}</h4>
                    </div>

                    <div className="space-y-2 bg-slate-850 p-6 rounded-3xl border border-slate-800/80">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Preço Especial para Live</p>
                      <p className="text-5xl font-black text-indigo-400 italic">
                        R$ {(() => {
                          const mkt = marketplaces[0] || { comissao: 10 };
                          const res = calcularPrecificacaoAvancada(liveProduct, mkt, 'margem');
                          return res ? formatBRL(res.precoVenda) : '159,90';
                        })()}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-850 p-4 rounded-2xl border border-slate-800/60 text-center">
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Estoque Disponível</p>
                        <p className="text-xl font-black text-white mt-1">{liveProduct.saldo || 0} Peças</p>
                      </div>
                      <div className="bg-slate-850 p-4 rounded-2xl border border-slate-800/60 text-center flex flex-col items-center justify-center">
                        <p className="text-[9px] font-bold text-slate-400 uppercase">PIX Liberado</p>
                        <div className="w-8 h-8 bg-indigo-600 rounded mt-1.5 flex items-center justify-center"><Check size={16} className="text-white"/></div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-slate-400 text-center font-bold uppercase italic py-12">Selecione uma peça na lista acima para iniciar a exibição em alta performance.</p>
              )}
            </div>
          </div>
        )}

      </main>

      {/* MODAL COGNITIVO COM LABELS FIXAS */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[3rem] w-full max-w-2xl p-10 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Editar {modalType}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-3 bg-slate-100 text-slate-400 rounded-2xl hover:text-red-500 transition-all"><X size={20}/></button>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              
              {/* MODAL PRODUTO */}
              {modalType === 'produto' && (
                <>
                  <div className="flex flex-col items-center gap-4 p-8 border-2 border-dashed border-slate-200 rounded-[2.5rem] bg-slate-50/50">
                    <div className="w-32 h-32 bg-white rounded-3xl border shadow-inner flex items-center justify-center overflow-hidden">
                      {imagePreview ? <img src={imagePreview} className="w-full h-full object-cover" /> : <Camera size={32} className="text-slate-300" />}
                    </div>
                    <label className="bg-indigo-600 text-white px-6 py-2 rounded-xl shadow-lg font-black text-[10px] uppercase cursor-pointer hover:bg-indigo-700 transition-colors">
                      Selecionar Imagem
                      <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                    </label>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-2">SKU / Código Unico</label>
                      <input name="sku" placeholder="Ex: CH-001" defaultValue={editingItem?.sku} required className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Nome Comercial</label>
                      <input name="nome" placeholder="Ex: Chaveiro Prata" defaultValue={editingItem?.nome} required className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-none" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Custo Bruto Metal (R$)</label>
                      <input name="custoBase" type="number" step="0.01" placeholder="0.00" defaultValue={editingItem?.custoBase} className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Peso Metal (g)</label>
                      <input name="pesoBase" type="number" step="0.01" placeholder="0.00" defaultValue={editingItem?.pesoBase} className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-none" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Categoria</label>
                      <input name="categoria" placeholder="Ex: Anel, Colar" defaultValue={editingItem?.categoria} className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Subcategoria</label>
                      <input name="subcategoria" placeholder="Ex: Chaveiros" defaultValue={editingItem?.subcategoria} className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-none" />
                    </div>
                  </div>

                  {!editingItem && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Estoque Inicial</label>
                      <input name="estoqueInicial" type="number" placeholder="0" className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-none" />
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Tipo de Banho Aplicado</label>
                    <select name="banhoId" defaultValue={editingItem?.banhoId} className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-none outline-none">
                      <option value="">Selecione o Banho...</option>
                      {banhos.map(b => <option key={b.id} value={b.id}>{b.nome}</option>)}
                    </select>
                  </div>

                  <div className="space-y-4 border border-slate-200 rounded-[2rem] p-6 bg-white shadow-inner">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="bg-amber-100 text-amber-600 p-2 rounded-xl"><Layers size={18}/></div>
                      <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight">Vincular Insumos</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                      {insumos.map(ins => (
                        <label key={ins.id} className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl cursor-pointer hover:bg-slate-100 transition-colors border border-transparent has-[:checked]:border-indigo-200 has-[:checked]:bg-indigo-50/30">
                          <input type="checkbox" name="insumosIds" value={ins.id} defaultChecked={editingItem?.insumosIds?.includes(ins.id)} className="w-4.5 h-4.5 rounded border-slate-300 text-indigo-600" />
                          <div>
                            <p className="text-xs font-black text-slate-700">{ins.nome}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase">R$ {ins.custo}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 p-6 bg-indigo-600 rounded-[2rem] shadow-xl shadow-indigo-100">
                    <label className="text-[10px] font-black uppercase text-indigo-200 ml-2">Configuração de Margem Desejada</label>
                    <div className="flex gap-3">
                      <select name="tipoMargem" defaultValue={editingItem?.tipoMargem || 'perc'} className="bg-white/10 p-4 rounded-2xl font-black text-white border-none outline-none appearance-none cursor-pointer hover:bg-white/20 transition-all">
                        <option value="perc" className="text-slate-900">% Percentual</option>
                        <option value="valor" className="text-slate-900">R$ Valor Fixo</option>
                      </select>
                      <input name="margemAlvo" type="number" step="0.01" placeholder="Ex: 50.00" defaultValue={editingItem?.margemAlvo} className="flex-1 bg-white p-4 rounded-2xl font-black border-none text-indigo-600" />
                    </div>
                  </div>
                </>
              )}

              {/* MODAL INSUMO */}
              {modalType === 'insumo' && (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Nome do Insumo</label>
                    <input name="nome" placeholder="Ex: Tarracha Ouro" defaultValue={editingItem?.nome} required className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Custo Unitário (R$)</label>
                      <input name="custo" type="number" step="0.01" placeholder="0.00" defaultValue={editingItem?.custo} className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Peso Unitário (g)</label>
                      <input name="peso" type="number" step="0.01" placeholder="0.00" defaultValue={editingItem?.peso} className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Código Interno</label>
                      <input name="codigoInterno" placeholder="INS-001" defaultValue={editingItem?.codigoInterno} className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Estoque Inicial</label>
                      <input name="estoqueInicial" type="number" placeholder="0" defaultValue={editingItem?.saldo} className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-none" />
                    </div>
                  </div>
                  <label className="flex items-center gap-3 bg-slate-50 p-5 rounded-2xl cursor-pointer font-bold text-slate-600">
                    <input type="checkbox" name="somarAoBanho" defaultChecked={editingItem?.somarAoBanho} className="w-5 h-5 rounded-lg border-2 border-slate-300 text-indigo-600" />
                    Somar este peso ao cálculo do Banho?
                  </label>
                </>
              )}

              {/* MODAL BANHO (FORMULÁRIO CIENTÍFICO) */}
              {modalType === 'banho' && (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Identificação do Banho</label>
                    <input name="nome" placeholder="Ex: Ouro 18k Premium" defaultValue={editingItem?.nome} required className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Metal de Base</label>
                      <input name="metal" placeholder="Ex: Ouro, Prata, Paládio" defaultValue={editingItem?.metal} className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Milésimos Aplicados</label>
                      <input name="milesimos" type="number" placeholder="Ex: 10" defaultValue={editingItem?.milesimos} className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Cotação Grama Metal (R$)</label>
                      <input name="cotacao" type="number" placeholder="Ex: 380.00" defaultValue={editingItem?.cotacao} className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Taxa Operacional Galvânica (R$)</label>
                      <input name="taxaOperacional" type="number" placeholder="Ex: 1.50" defaultValue={editingItem?.taxaOperacional} className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Mão de Obra do Galvânico (R$/g)</label>
                      <input name="maoDeObra" type="number" placeholder="Ex: 2.00" defaultValue={editingItem?.maoDeObra} className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Perda Técnica Estimada (%)</label>
                      <input name="perdaTecnica" type="number" placeholder="Ex: 5" defaultValue={editingItem?.perdaTecnica} className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-none" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Margem Técnica (%)</label>
                    <input name="margemTecnica" type="number" placeholder="Ex: 20" defaultValue={editingItem?.margemTecnica} className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-none" />
                  </div>
                </>
              )}

              {/* MODAL MARKETPLACE */}
              {modalType === 'marketplace' && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Nome do Canal</label>
                    <input name="nome" placeholder="Ex: Shopee Atacado" defaultValue={editingItem?.nome} required className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Comissão Canal (%)</label>
                      <input name="comissao" type="number" step="0.01" placeholder="0.00" defaultValue={editingItem?.comissao} className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Imposto Direto (%)</label>
                      <input name="imposto" type="number" step="0.01" placeholder="0.00" defaultValue={editingItem?.imposto} className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Frete Médio (R$)</label>
                      <input name="freteMedia" type="number" step="0.01" placeholder="0.00" defaultValue={editingItem?.freteMedia} className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Taxa Fixa Venda (R$)</label>
                      <input name="taxaFixa" type="number" step="0.01" placeholder="0.00" defaultValue={editingItem?.taxaFixa} className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-none" />
                    </div>
                  </div>
                </div>
              )}

              {/* MODAL FORNECEDOR */}
              {modalType === 'fornecedor' && (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Razão Social / Nome Fantasia</label>
                    <input name="nome" placeholder="Ex: Fundição Aliança Limeira" defaultValue={editingItem?.nome} required className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Contato Principal</label>
                      <input name="contato" placeholder="Ex: Roberto Galvão" defaultValue={editingItem?.contato} className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-2">WhatsApp Comercial</label>
                      <input name="whatsapp" placeholder="+55 (19) 99999-1111" defaultValue={editingItem?.whatsapp} className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Cidade</label>
                      <input name="cidade" placeholder="Limeira" defaultValue={editingItem?.cidade} className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Estado (UF)</label>
                      <input name="estado" placeholder="SP" defaultValue={editingItem?.estado} className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-none" />
                    </div>
                  </div>
                </>
              )}

              {/* MODAL KIT */}
              {modalType === 'kit' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Nome do Kit</label>
                      <input name="nome" placeholder="Ex: Kit Luxo Imperial" defaultValue={editingItem?.nome} required className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-2">SKU Único</label>
                      <input name="sku" placeholder="Ex: KIT-001" defaultValue={editingItem?.sku} required className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-none" />
                    </div>
                  </div>
                  
                  <div className="space-y-4 border border-slate-200 rounded-[2rem] p-6 bg-white shadow-inner">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="bg-indigo-100 text-indigo-600 p-2 rounded-xl"><Package size={18}/></div>
                      <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight">Vincular Peças ao Kit</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                      {produtos.map(p => (
                        <label key={p.id} className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl cursor-pointer hover:bg-slate-100 transition-colors border border-transparent has-[:checked]:border-indigo-200 has-[:checked]:bg-indigo-50/30">
                          <input type="checkbox" name="produtosIds" value={p.id} defaultChecked={editingItem?.produtosIds?.includes(p.id)} className="w-4.5 h-4.5 rounded border-slate-300 text-indigo-600" />
                          <div>
                            <p className="text-xs font-black text-slate-700">{p.nome}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase">SKU: {p.sku}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* MODAL LANÇAMENTO FINANCEIRO */}
              {modalType === 'financeiro' && (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Descrição da Transação</label>
                    <input name="descricao" placeholder="Ex: Taxa Mensal ERP Bling" defaultValue={editingItem?.descricao} required className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Tipo</label>
                      <select name="tipo" defaultValue={editingItem?.tipo || 'Despesa'} className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-none outline-none">
                        <option value="Receita">Receita (Venda, Entrada)</option>
                        <option value="Despesa">Despesa (Gasto, Tarifa)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Valor (R$)</label>
                      <input name="valor" type="number" step="0.01" placeholder="0.00" defaultValue={editingItem?.valor} required className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-none" />
                    </div>
                  </div>
                </>
              )}

              <button 
                type="submit" 
                disabled={isUploading} 
                className={`w-full ${isUploading ? 'bg-slate-400 cursor-wait' : 'bg-indigo-600 hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98]'} text-white p-6 rounded-[2.5rem] font-black shadow-xl transition-all uppercase flex items-center justify-center gap-3 text-sm tracking-widest`}
              >
                {isUploading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Processando Dados...
                  </>
                ) : (
                  <><Save size={20}/> Guardar Dados</>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>
    </div>
  );
};

export default App;