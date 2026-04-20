import React, { useState, useMemo } from 'react';
import { 
  Calculator, Store, ShoppingCart, Globe, Package, TrendingUp, 
  Percent, DollarSign, ChevronRight, Info, AlertCircle, Truck, 
  Plus, Edit2, Trash2, Save, X, LayoutDashboard, Box, 
  Gift, Archive, Paperclip, Image as ImageIcon, Tag, BarChart3,
  Droplets, Scale, Layers
} from 'lucide-react';

const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState('produto'); 
  const [editingItem, setEditingItem] = useState(null);

  // --- ESTADOS DE DADOS (Baseados no seu arquivo original) ---
  
  const [marketplaces, setMarketplaces] = useState([
    { id: '1', name: 'Shopee', comissao: 18, taxaFixa: 3.00, ads: 2, imposto: 6, cor: 'orange' },
    { id: '2', name: 'Mercado Livre', comissao: 12, taxaFixa: 6.00, ads: 0, imposto: 6, cor: 'yellow' },
    { id: '3', name: 'Amazon', comissao: 15, taxaFixa: 0, ads: 0, imposto: 6, cor: 'blue' }
  ]);

  const [insumos, setInsumos] = useState([
    { id: 'i1', nome: 'Caixa de Papelão P', tipo: 'embalagem', custo: 1.50, peso: 0 },
    { id: 'i2', nome: 'Saco Transparente', tipo: 'embalagem', custo: 0.20, peso: 0 },
    { id: 'i3', nome: 'Argola Prata', tipo: 'acessorio', custo: 0.50, peso: 0.2 },
    { id: 'i4', nome: 'Fecho Lagosta', tipo: 'acessorio', custo: 2.30, peso: 0.8 },
    { id: 'i5', nome: 'Cordão de Couro', tipo: 'extra', custo: 1.20, peso: 0 }
  ]);

  const [banhos, setBanhos] = useState([
    { id: 'b1', nome: 'Ouro 18k (10 milésimos)', precoPorGrama: 15.00 },
    { id: 'b2', nome: 'Prata 925', precoPorGrama: 3.50 }
  ]);

  const [produtos, setProdutos] = useState([
    { 
      id: 'p1', 
      sku: 'CHV-001', 
      nome: 'Chaveiro Premium', 
      foto: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400',
      custoBase: 10.00, 
      pesoBase: 5.0, 
      banhoId: 'b1',
      insumosIds: ['i1', 'i3', 'i4', 'i5'], 
      margemAlvo: 25, 
      tipoMargem: '%',
      freteMedio: 5.00 
    }
  ]);

  const [selectedProductId, setSelectedProductId] = useState(produtos[0]?.id || '');

  // --- LÓGICA DE CÁLCULO (A FUNÇÃO CENTRAL DO SEU ARQUIVO) ---

  const getDetalhesInsumos = (insumosIds) => {
    return insumosIds.reduce((acc, id) => {
      const insumo = insumos.find(i => i.id === id);
      if (insumo) {
        acc.custoTotal += insumo.custo;
        // Apenas 'acessorio' (bruto) soma ao peso do banho. 'extra' entra apenas no custo.
        if (insumo.tipo === 'acessorio') {
          acc.pesoAcessorios += (insumo.peso || 0);
        }
      }
      return acc;
    }, { custoTotal: 0, pesoAcessorios: 0 });
  };

  const calcularPrecoVenda = (produto, mkt) => {
    if (!produto || !mkt) return { preco: 0, lucro: 0, custoTotal: 0, pesoTotal: 0, custoBanho: 0 };
    
    const detalhes = getDetalhesInsumos(produto.insumosIds);
    const pesoParaBanho = (produto.pesoBase || 0) + detalhes.pesoAcessorios;
    
    const banho = banhos.find(b => b.id === produto.banhoId);
    const custoBanho = banho ? pesoParaBanho * banho.precoPorGrama : 0;
    
    const custoTotalItem = produto.custoBase + detalhes.custoTotal + custoBanho;
    
    const comissaoTotal = (mkt.comissao + mkt.ads + mkt.imposto) / 100;
    const margemDesejada = produto.margemAlvo / 100;
    
    // Se for margem em valor, a lógica muda levemente no divisor
    if (produto.tipoMargem === 'valor') {
        const precoSemMargem = (custoTotalItem + mkt.taxaFixa) / (1 - comissaoTotal);
        const precoFinal = precoSemMargem + (produto.margemAlvo / (1 - comissaoTotal));
        return { 
            preco: precoFinal, 
            lucro: produto.margemAlvo, 
            custoTotal: custoTotalItem, 
            pesoTotal: pesoParaBanho, 
            custoBanho 
        };
    }

    const divisor = 1 - (comissaoTotal + margemDesejada);
    const custosFixos = custoTotalItem + mkt.taxaFixa;

    if (divisor <= 0) return { preco: 0, lucro: 0, custoTotal: custoTotalItem, pesoTotal: pesoParaBanho, custoBanho };

    const precoFinal = custosFixos / divisor;
    const lucroReal = precoFinal * margemDesejada;

    return { 
      preco: precoFinal, 
      lucro: lucroReal, 
      custoTotal: custoTotalItem, 
      pesoTotal: pesoParaBanho,
      custoBanho 
    };
  };

  // --- HANDLERS ---

  const openModal = (type, item = null) => {
    setModalType(type);
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const handleSave = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    if (modalType === 'produto') {
      const selectedInsumos = Array.from(e.target.elements)
        .filter(el => el.name === 'insumos' && el.checked)
        .map(el => el.value);

      const novoProduto = {
        id: editingItem?.id || Date.now().toString(),
        sku: data.sku,
        nome: data.nome,
        foto: data.foto || 'https://via.placeholder.com/150',
        custoBase: parseFloat(data.custoBase),
        pesoBase: parseFloat(data.pesoBase || 0),
        banhoId: data.banhoId,
        insumosIds: selectedInsumos,
        margemAlvo: parseFloat(data.margemAlvo),
        tipoMargem: data.tipoMargem || '%',
        freteMedio: parseFloat(data.freteMedio || 0)
      };

      if (editingItem) {
        setProdutos(produtos.map(p => p.id === editingItem.id ? novoProduto : p));
      } else {
        setProdutos([...produtos, novoProduto]);
        setSelectedProductId(novoProduto.id);
      }
    } else if (modalType === 'insumo') {
      const novoInsumo = {
        id: editingItem?.id || Date.now().toString(),
        nome: data.nome,
        tipo: data.tipo,
        custo: parseFloat(data.custo),
        peso: parseFloat(data.peso || 0)
      };
      editingItem 
        ? setInsumos(insumos.map(i => i.id === editingItem.id ? novoInsumo : i))
        : setInsumos([...insumos, novoInsumo]);
    } else if (modalType === 'marketplace') {
      const novoMkt = {
        id: editingItem?.id || Date.now().toString(),
        name: data.name,
        comissao: parseFloat(data.comissao),
        taxaFixa: parseFloat(data.taxaFixa),
        ads: parseFloat(data.ads),
        imposto: parseFloat(data.imposto),
        cor: data.cor || 'indigo'
      };
      editingItem
        ? setMarketplaces(marketplaces.map(m => m.id === editingItem.id ? novoMkt : m))
        : setMarketplaces([...marketplaces, novoMkt]);
    } else if (modalType === 'banho') {
      const novoBanho = {
        id: editingItem?.id || Date.now().toString(),
        nome: data.nome,
        precoPorGrama: parseFloat(data.precoPorGrama)
      };
      editingItem
        ? setBanhos(banhos.map(b => b.id === editingItem.id ? novoBanho : b))
        : setBanhos([...banhos, novoBanho]);
    }
    closeModal();
  };

  const handleDelete = (id, type) => {
    if (type === 'produto') setProdutos(produtos.filter(p => p.id !== id));
    if (type === 'insumo') setInsumos(insumos.filter(i => i.id !== id));
    if (type === 'marketplace') setMarketplaces(marketplaces.filter(m => m.id !== id));
    if (type === 'banho') setBanhos(banhos.filter(b => b.id !== id));
  };

  const currentProduct = produtos.find(p => p.id === selectedProductId) || produtos[0];
  const currentCalc = currentProduct ? calcularPrecoVenda(currentProduct, marketplaces[0]) : null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex">
      
      {/* Sidebar - Fixo conforme seu arquivo original */}
      <aside className="w-20 md:w-64 bg-white border-r flex flex-col sticky top-0 h-screen">
        <div className="p-6 flex items-center gap-3 text-indigo-600">
          <Calculator className="w-8 h-8" />
          <span className="font-black text-xl hidden md:block uppercase tracking-tighter">Preço Pro</span>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-4">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Simulador' },
            { id: 'produtos', icon: Box, label: 'Produtos' },
            { id: 'insumos', icon: Archive, label: 'Insumos' },
            { id: 'banhos', icon: Droplets, label: 'Banhos' },
            { id: 'marketplaces', icon: Store, label: 'Canais' }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)} 
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition ${activeTab === tab.id ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              <tab.icon className="w-5 h-5" /> 
              <span className="hidden md:block font-bold">{tab.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        
        {/* VIEW: DASHBOARD (Simulador) */}
        {activeTab === 'dashboard' && (
          <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black text-slate-800 tracking-tight">Simulador de Vendas</h1>
                <p className="text-slate-500 font-medium">Análise de custos e margens por canal.</p>
              </div>
              <div className="bg-white p-2 rounded-2xl shadow-sm border flex items-center gap-3 w-full md:w-96">
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-100 border flex items-center justify-center">
                  {currentProduct?.foto ? <img src={currentProduct.foto} alt="Preview" className="w-full h-full object-cover" /> : <ImageIcon className="text-slate-300" />}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-400 uppercase">Selecionar Produto</p>
                  <select 
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full font-bold text-slate-700 bg-transparent outline-none cursor-pointer"
                  >
                    {produtos.map(p => <option key={p.id} value={p.id}>{p.sku} - {p.nome}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {currentProduct && (
              <div className="bg-white rounded-3xl p-6 border shadow-sm flex flex-col md:flex-row gap-8 items-center transition-all hover:shadow-md">
                <div className="w-48 h-48 rounded-2xl overflow-hidden shadow-lg border-4 border-white shrink-0">
                  <img src={currentProduct.foto} className="w-full h-full object-cover" alt="Product" />
                </div>
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="bg-indigo-100 text-indigo-600 px-3 py-1 rounded-full text-xs font-black">{currentProduct.sku}</span>
                    <h2 className="text-2xl font-black text-slate-800">{currentProduct.nome}</h2>
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="bg-slate-50 p-3 rounded-xl border">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Peso p/ Banho</p>
                      <p className="font-black text-slate-700 flex items-center gap-1"><Scale size={12} /> {currentCalc.pesoTotal.toFixed(2)}g</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Custo Banho</p>
                      <p className="font-black text-blue-600">R$ {currentCalc.custoBanho.toFixed(2)}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Insumos & Brutos</p>
                      <p className="font-black text-indigo-400">R$ {getDetalhesInsumos(currentProduct.insumosIds).custoTotal.toFixed(2)}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Custo de Fab.</p>
                      <p className="font-black text-slate-800">R$ {currentCalc.custoTotal.toFixed(2)}</p>
                    </div>
                    <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                      <p className="text-[10px] font-bold text-emerald-400 uppercase">Margem Alvo</p>
                      <p className="font-black text-emerald-600">
                        {currentProduct.tipoMargem === 'valor' ? `R$ ${currentProduct.margemAlvo}` : `${currentProduct.margemAlvo}%`}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {marketplaces.map(mkt => {
                const calc = calcularPrecoVenda(currentProduct, mkt);
                return (
                  <div key={mkt.id} className="bg-white rounded-3xl p-6 border-2 border-transparent hover:border-indigo-100 shadow-sm transition group">
                    <div className="flex justify-between items-start mb-6">
                      <div className="bg-slate-100 p-2 rounded-xl text-slate-600 group-hover:bg-indigo-600 group-hover:text-white transition">
                        <Store className="w-6 h-6" />
                      </div>
                      <span className="font-black text-slate-400 text-sm uppercase tracking-widest">{mkt.name}</span>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase">Preço p/ Anúncio</p>
                        <p className="text-3xl font-black text-slate-800 tracking-tight">R$ {calc.preco.toFixed(2)}</p>
                      </div>
                      <div className="pt-4 border-t border-dashed flex justify-between items-center">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Lucro Líquido</p>
                          <p className="text-lg font-black text-emerald-600">R$ {calc.lucro.toFixed(2)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-slate-400 uppercase font-mono">Taxas Canal</p>
                          <p className="text-xs font-bold text-red-400">{mkt.comissao + mkt.ads + mkt.imposto}% + R${mkt.taxaFixa}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW: PRODUTOS (Gestão) */}
        {activeTab === 'produtos' && (
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black flex items-center gap-3"><Package className="text-indigo-600" /> Gestão de Produtos</h2>
              <button onClick={() => openModal('produto')} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition shadow-lg shadow-indigo-200">
                <Plus className="w-5 h-5" /> Novo Produto
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {produtos.map(p => {
                const det = getDetalhesInsumos(p.insumosIds);
                const banho = banhos.find(b => b.id === p.banhoId);
                return (
                  <div key={p.id} className="bg-white rounded-3xl overflow-hidden border shadow-sm group hover:shadow-md transition-all">
                    <div className="h-40 relative">
                      <img src={p.foto} className="w-full h-full object-cover" alt="Product" />
                      <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded font-bold uppercase">{p.sku}</div>
                      <div className="absolute inset-0 bg-indigo-900/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-3">
                        <button onClick={() => openModal('produto', p)} className="bg-white p-2 rounded-xl text-indigo-600 hover:scale-110 transition shadow-lg"><Edit2 className="w-5 h-5" /></button>
                        <button onClick={() => handleDelete(p.id, 'produto')} className="bg-white p-2 rounded-xl text-red-600 hover:scale-110 transition shadow-lg"><Trash2 className="w-5 h-5" /></button>
                      </div>
                    </div>
                    <div className="p-5">
                      <h3 className="font-black text-slate-800 text-lg mb-2">{p.nome}</h3>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400 font-bold uppercase">Peso p/ Banho:</span>
                          <span className="font-black text-slate-700">{(p.pesoBase + det.pesoAcessorios).toFixed(2)}g</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400 font-bold uppercase">Banho:</span>
                          <span className="font-black text-blue-600">{banho?.nome || 'Nenhum'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* OUTRAS VIEWS (Conforme o arquivo original) */}
        {activeTab === 'insumos' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black flex items-center gap-3"><Archive className="text-indigo-600" /> Insumos & Matérias-Primas</h2>
              <button onClick={() => openModal('insumo')} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2">
                <Plus className="w-5 h-5" /> Adicionar Insumo
              </button>
            </div>
            <div className="bg-white rounded-3xl border overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b">
                        <tr className="text-left font-black text-slate-400 uppercase text-[10px]">
                            <th className="p-5">Item</th>
                            <th className="p-5 text-center">Tipo</th>
                            <th className="p-5 text-center">Peso (g)</th>
                            <th className="p-5 text-center">Custo Unt.</th>
                            <th className="p-5 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {insumos.map(i => (
                            <tr key={i.id} className="hover:bg-slate-50 transition">
                                <td className="p-5 font-bold text-slate-700">{i.nome}</td>
                                <td className="p-5 text-center">
                                    <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${i.tipo === 'acessorio' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                                        {i.tipo}
                                    </span>
                                </td>
                                <td className="p-5 text-center font-bold">{i.peso ? `${i.peso}g` : '-'}</td>
                                <td className="p-5 text-center font-black">R$ {i.custo.toFixed(2)}</td>
                                <td className="p-5 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => openModal('insumo', i)} className="p-2 text-slate-400 hover:text-indigo-600"><Edit2 size={16} /></button>
                                        <button onClick={() => handleDelete(i.id, 'insumo')} className="p-2 text-slate-400 hover:text-red-600"><Trash2 size={16} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
          </div>
        )}

        {activeTab === 'banhos' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black flex items-center gap-3"><Droplets className="text-indigo-600" /> Tabela de Banhos</h2>
              <button onClick={() => openModal('banho')} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2">
                <Plus className="w-5 h-5" /> Adicionar Banho
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {banhos.map(b => (
                <div key={b.id} className="bg-white p-6 rounded-3xl border shadow-sm flex justify-between items-center">
                  <div>
                    <h3 className="font-black text-slate-800">{b.nome}</h3>
                    <p className="text-blue-600 font-bold">R$ {b.precoPorGrama.toFixed(2)} <span className="text-[10px] text-slate-400 uppercase">/ g</span></p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openModal('banho', b)} className="p-2 text-slate-400 hover:text-indigo-600"><Edit2 size={18} /></button>
                    <button onClick={() => handleDelete(b.id, 'banho')} className="p-2 text-slate-400 hover:text-red-600"><Trash2 size={18} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'marketplaces' && (
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black flex items-center gap-3"><Store className="text-indigo-600" /> Canais e Marketplace</h2>
              <button onClick={() => openModal('marketplace')} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2">
                <Plus className="w-5 h-5" /> Adicionar Canal
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {marketplaces.map(m => (
                    <div key={m.id} className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-black text-slate-800">{m.name}</h3>
                            <div className="flex gap-2">
                                <button onClick={() => openModal('marketplace', m)} className="p-2 text-slate-400 hover:text-indigo-600"><Edit2 size={16} /></button>
                                <button onClick={() => handleDelete(m.id, 'marketplace')} className="p-2 text-slate-400 hover:text-red-600"><Trash2 size={16} /></button>
                            </div>
                        </div>
                        <div className="grid grid-cols-4 gap-4">
                            <div className="bg-slate-50 p-3 rounded-2xl text-center">
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Comissão</p>
                                <p className="font-black text-slate-700">{m.comissao}%</p>
                            </div>
                            <div className="bg-slate-50 p-3 rounded-2xl text-center">
                                <p className="text-[10px] font-bold text-slate-400 uppercase">ADS</p>
                                <p className="font-black text-slate-700">{m.ads}%</p>
                            </div>
                            <div className="bg-slate-50 p-3 rounded-2xl text-center">
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Imposto</p>
                                <p className="font-black text-slate-700">{m.imposto}%</p>
                            </div>
                            <div className="bg-slate-50 p-3 rounded-2xl text-center">
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Fixo</p>
                                <p className="font-black text-slate-700">R$ {m.taxaFixa}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
          </div>
        )}

      </main>

      {/* MODAIS (Lógica Unificada) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white rounded-[2rem] w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-8 border-b flex justify-between items-center sticky top-0 bg-white/90 backdrop-blur-md z-10">
              <h2 className="text-2xl font-black text-slate-800">
                {editingItem ? 'Editar' : 'Novo'} {modalType.toUpperCase()}
              </h2>
              <button onClick={closeModal} className="p-2 hover:bg-slate-100 rounded-full transition"><X /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-8 space-y-6">
              
              {/* Form Produto - Composição Automática */}
              {modalType === 'produto' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase">SKU</label>
                      <input name="sku" defaultValue={editingItem?.sku} required className="w-full bg-slate-50 border rounded-xl px-4 py-3 outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase">Nome</label>
                      <input name="nome" defaultValue={editingItem?.nome} required className="w-full bg-slate-50 border rounded-xl px-4 py-3 outline-none" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-blue-600 uppercase">Peso Bruto Base (g)</label>
                      <input name="pesoBase" type="number" step="0.01" defaultValue={editingItem?.pesoBase} required className="w-full bg-blue-50/50 border-blue-100 border rounded-xl px-4 py-3 outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-blue-600 uppercase">Tipo de Banho</label>
                      <select name="banhoId" defaultValue={editingItem?.banhoId} className="w-full bg-blue-50/50 border-blue-100 border rounded-xl px-4 py-3 outline-none">
                        <option value="">Sem Banho</option>
                        {banhos.map(b => <option key={b.id} value={b.id}>{b.nome}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Composição (Insumos Selecionados)</label>
                    <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto p-4 bg-slate-50 rounded-xl border">
                      {insumos.map(i => (
                        <label key={i.id} className="flex items-center gap-3 bg-white p-3 rounded-lg border cursor-pointer hover:border-indigo-300 transition">
                          <input 
                            type="checkbox" 
                            name="insumos" 
                            value={i.id} 
                            defaultChecked={editingItem?.insumosIds.includes(i.id)}
                            className="w-4 h-4 text-indigo-600 rounded" 
                          />
                          <div className="flex-1 flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-700">{i.nome}</span>
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${i.tipo === 'acessorio' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                                {i.tipo === 'acessorio' ? `SOMA BANHO (${i.peso}g)` : `FIXO (R$${i.custo})`}
                            </span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase">Custo Matéria Prima</label>
                      <input name="custoBase" type="number" step="0.01" defaultValue={editingItem?.custoBase} required className="w-full bg-slate-50 border rounded-xl px-4 py-3 outline-none" />
                    </div>
                    <div className="space-y-1 flex flex-col">
                      <label className="text-[10px] font-black text-slate-400 uppercase">Margem Desejada</label>
                      <div className="flex gap-2">
                        <input name="margemAlvo" type="number" step="0.1" defaultValue={editingItem?.margemAlvo} required className="flex-1 bg-slate-50 border rounded-xl px-4 py-3 outline-none" />
                        <select name="tipoMargem" defaultValue={editingItem?.tipoMargem || '%'} className="bg-slate-50 border rounded-xl px-2 outline-none font-bold">
                            <option value="%">%</option>
                            <option value="valor">R$</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">URL da Foto</label>
                    <input name="foto" defaultValue={editingItem?.foto} className="w-full bg-slate-50 border rounded-xl px-4 py-3 outline-none" />
                  </div>
                </>
              )}

              {/* Form Insumo (Original) */}
              {modalType === 'insumo' && (
                <div className="space-y-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Nome</label>
                    <input name="nome" defaultValue={editingItem?.nome} required className="w-full bg-slate-50 border rounded-xl px-4 py-3" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase">Tipo</label>
                      <select name="tipo" defaultValue={editingItem?.tipo} className="w-full bg-slate-50 border rounded-xl px-4 py-3">
                        <option value="acessorio">Acessório (Soma peso p/ banho)</option>
                        <option value="extra">Item Extra (Custo Fixo)</option>
                        <option value="embalagem">Embalagem</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase">Custo Unitário</label>
                      <input name="custo" type="number" step="0.01" defaultValue={editingItem?.custo} required className="w-full bg-slate-50 border rounded-xl px-4 py-3" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-blue-600 uppercase font-bold">Peso (g) - Apenas p/ Acessórios</label>
                    <input name="peso" type="number" step="0.01" defaultValue={editingItem?.peso} className="w-full bg-blue-50/50 border-blue-100 border rounded-xl px-4 py-3" />
                  </div>
                </div>
              )}

              {/* Form Banho (Original) */}
              {modalType === 'banho' && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase font-bold">Nome do Banho</label>
                    <input name="nome" defaultValue={editingItem?.nome} required className="w-full bg-slate-50 border rounded-xl px-4 py-3" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-blue-600 uppercase font-bold">Preço por Grama (R$)</label>
                    <input name="precoPorGrama" type="number" step="0.01" defaultValue={editingItem?.precoPorGrama} required className="w-full bg-blue-50/50 border-blue-100 border rounded-xl px-4 py-3" />
                  </div>
                </div>
              )}

              {/* Form Marketplace (Original) */}
              {modalType === 'marketplace' && (
                <div className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase">Nome do Canal</label>
                        <input name="name" defaultValue={editingItem?.name} required className="w-full bg-slate-50 border rounded-xl px-4 py-3" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase">Comissão (%)</label>
                            <input name="comissao" type="number" step="0.1" defaultValue={editingItem?.comissao} required className="w-full bg-slate-50 border rounded-xl px-4 py-3" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase">Imposto (%)</label>
                            <input name="imposto" type="number" step="0.1" defaultValue={editingItem?.imposto} required className="w-full bg-slate-50 border rounded-xl px-4 py-3" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase">ADS (%)</label>
                            <input name="ads" type="number" step="0.1" defaultValue={editingItem?.ads || 0} className="w-full bg-slate-50 border rounded-xl px-4 py-3" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase">Taxa Fixa (R$)</label>
                            <input name="taxaFixa" type="number" step="0.01" defaultValue={editingItem?.taxaFixa} required className="w-full bg-slate-50 border rounded-xl px-4 py-3" />
                        </div>
                    </div>
                </div>
              )}

              <div className="pt-6 flex gap-4">
                <button type="button" onClick={closeModal} className="flex-1 px-6 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold">Cancelar</button>
                <button type="submit" className="flex-1 px-6 py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 transition hover:bg-indigo-700">
                  <Save size={20} /> Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
