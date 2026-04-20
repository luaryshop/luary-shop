import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from "firebase/app";
import { 
  getFirestore, collection, addDoc, getDocs, 
  doc, updateDoc, deleteDoc, onSnapshot 
} from "firebase/firestore";
import { 
  Calculator, Store, ShoppingCart, Globe, Package, TrendingUp, 
  Percent, DollarSign, ChevronRight, Info, AlertCircle, Truck, 
  Plus, Edit2, Trash2, Save, X, LayoutDashboard, Box, 
  Gift, Archive, Paperclip, Image as ImageIcon, Tag, BarChart3,
  Droplets, Scale, Layers
} from 'lucide-react';

// --- CONFIGURAÇÃO DO FIREBASE LUARY ---
const firebaseConfig = {
  apiKey: "AIzaSyD62Yef2ggoAFSc-qKPlBTaRPRn20D91ug",
  authDomain: "luary-shop.firebaseapp.com",
  databaseURL: "https://luary-shop-default-rtdb.firebaseio.com",
  projectId: "luary-shop",
  storageBucket: "luary-shop.firebasestorage.app",
  messagingSenderId: "266203283836",
  appId: "1:266203283836:web:8d969c1379f82abda0a4f9",
  measurementId: "G-XMFKVGPG22"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState('produto'); 
  const [editingItem, setEditingItem] = useState(null);

  // --- ESTADOS CONECTADOS AO FIREBASE ---
  const [marketplaces, setMarketplaces] = useState([]);
  const [insumos, setInsumos] = useState([]);
  const [banhos, setBanhos] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');

  // --- SINCRONIZAÇÃO EM TEMPO REAL COM FIRESTORE ---
  useEffect(() => {
    const unsubMkt = onSnapshot(collection(db, "marketplaces"), (snap) => {
      setMarketplaces(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubInsumos = onSnapshot(collection(db, "insumos"), (snap) => {
      setInsumos(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubBanhos = onSnapshot(collection(db, "banhos"), (snap) => {
      setBanhos(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubProdutos = onSnapshot(collection(db, "produtos"), (snap) => {
      const prods = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProdutos(prods);
      if (prods.length > 0 && !selectedProductId) setSelectedProductId(prods[0].id);
    });

    return () => { unsubMkt(); unsubInsumos(); unsubBanhos(); unsubProdutos(); };
  }, []);

  // --- LÓGICA DE CÁLCULO ---
  const getDetalhesInsumos = (insumosIds = []) => {
    return insumosIds.reduce((acc, id) => {
      const insumo = insumos.find(i => i.id === id);
      if (insumo) {
        acc.custoTotal += Number(insumo.custo || 0);
        if (insumo.tipo === 'acessorio') acc.pesoAcessorios += Number(insumo.peso || 0);
      }
      return acc;
    }, { custoTotal: 0, pesoAcessorios: 0 });
  };

  const calcularPrecoVenda = (produto, mkt) => {
    if (!produto || !mkt) return { preco: 0, lucro: 0, custoTotal: 0, pesoTotal: 0, custoBanho: 0 };
    
    const detalhes = getDetalhesInsumos(produto.insumosIds);
    const pesoParaBanho = Number(produto.pesoBase || 0) + detalhes.pesoAcessorios;
    const banho = banhos.find(b => b.id === produto.banhoId);
    const custoBanho = banho ? pesoParaBanho * Number(banho.precoPorGrama) : 0;
    const custoTotalItem = Number(produto.custoBase) + detalhes.custoTotal + custoBanho;
    
    const taxasCanalPercent = (Number(mkt.comissao) + Number(mkt.ads || 0) + Number(mkt.imposto)) / 100;

    if (produto.tipoMargem === 'valor') {
        const precoFinal = (custoTotalItem + Number(mkt.taxaFixa) + Number(produto.margemAlvo)) / (1 - taxasCanalPercent);
        return { preco: precoFinal, lucro: Number(produto.margemAlvo), custoTotal: custoTotalItem, pesoTotal: pesoParaBanho, custoBanho };
    }

    const divisor = 1 - (taxasCanalPercent + (Number(produto.margemAlvo) / 100));
    const precoFinal = (custoTotalItem + Number(mkt.taxaFixa)) / divisor;
    return { preco: precoFinal, lucro: precoFinal * (Number(produto.margemAlvo) / 100), custoTotal: custoTotalItem, pesoTotal: pesoParaBanho, custoBanho };
  };

  // --- OPERAÇÕES DO BANCO DE DADOS (CRUD) ---
  const handleSave = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    const collectionName = { produto: 'produtos', insumo: 'insumos', banho: 'banhos', marketplace: 'marketplaces' }[modalType];

    let payload = { ...data };
    if (modalType === 'produto') {
      payload.insumosIds = Array.from(e.target.elements).filter(el => el.name === 'insumos' && el.checked).map(el => el.value);
    }

    try {
      if (editingItem) {
        await updateDoc(doc(db, collectionName, editingItem.id), payload);
      } else {
        await addDoc(collection(db, collectionName), payload);
      }
      setIsModalOpen(false);
      setEditingItem(null);
    } catch (err) {
      console.error("Erro ao salvar no Firebase:", err);
    }
  };

  const handleDelete = async (id, type) => {
    const collectionName = { produto: 'produtos', insumo: 'insumos', banho: 'banhos', marketplace: 'marketplaces' }[type];
    if (window.confirm("Deseja excluir permanentemente?")) {
      await deleteDoc(doc(db, collectionName, id));
    }
  };

  const currentProduct = produtos.find(p => p.id === selectedProductId) || produtos[0];
  const currentCalc = currentProduct && marketplaces.length > 0 ? calcularPrecoVenda(currentProduct, marketplaces[0]) : null;

  // ... (O restante do JSX de renderização permanece igual ao anterior, 
  // apenas garantindo que os botões chamem handleSave e handleDelete)
  
  return (
    <div className="min-h-screen bg-slate-50 flex">
        {/* Sidebar e Conteúdo conforme o design anterior */}
        {/* Adicione aqui o seu JSX do componente anterior */}
    </div>
  );
};

export default App;
