import React, { useState } from "react";
import { Package, Plus, Trash2, Pencil } from "lucide-react";

export default function App() {
  const [produtos, setProdutos] = useState([]);
  const [nome, setNome] = useState("");
  const [sku, setSku] = useState("");
  const [custo, setCusto] = useState("");

  const adicionar = () => {
    if (!nome || !sku) return;

    setProdutos([
      ...produtos,
      {
        id: Date.now(),
        nome,
        sku,
        custo,
      },
    ]);

    setNome("");
    setSku("");
    setCusto("");
  };

  const remover = (id) => {
    setProdutos(produtos.filter((p) => p.id !== id));
  };

  return (
    <div className="flex h-screen bg-gray-100">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-black text-white p-5">
        <h1 className="text-2xl font-bold mb-6">Luary Shop</h1>

        <nav className="space-y-3">
          <div className="flex items-center gap-2 p-2 bg-gray-800 rounded">
            <Package size={18} />
            Produtos
          </div>
        </nav>
      </aside>

      {/* CONTEÚDO */}
      <main className="flex-1 p-6 overflow-auto">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">Gestão de Produtos</h2>

          <button
            onClick={adicionar}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            <Plus size={18} />
            Novo Produto
          </button>
        </div>

        {/* FORM */}
        <div className="bg-white p-4 rounded shadow mb-6 grid grid-cols-3 gap-4">
          <input
            className="border p-2 rounded"
            placeholder="SKU"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
          />
          <input
            className="border p-2 rounded"
            placeholder="Nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
          <input
            className="border p-2 rounded"
            placeholder="Custo"
            type="number"
            value={custo}
            onChange={(e) => setCusto(e.target.value)}
          />
        </div>

        {/* TABELA */}
        <div className="bg-white rounded shadow overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-200 text-sm">
              <tr>
                <th className="p-3">SKU</th>
                <th className="p-3">Nome</th>
                <th className="p-3">Custo</th>
                <th className="p-3">Ações</th>
              </tr>
            </thead>

            <tbody>
              {produtos.length === 0 && (
                <tr>
                  <td colSpan="4" className="p-4 text-center text-gray-500">
                    Nenhum produto cadastrado
                  </td>
                </tr>
              )}

              {produtos.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="p-3">{p.sku}</td>
                  <td className="p-3">{p.nome}</td>
                  <td className="p-3">R$ {p.custo}</td>
                  <td className="p-3 flex gap-2">
                    <button className="p-2 bg-yellow-400 rounded">
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => remover(p.id)}
                      className="p-2 bg-red-500 text-white rounded"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </main>
    </div>
  );
}
