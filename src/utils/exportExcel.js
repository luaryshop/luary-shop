import * as XLSX from "xlsx";

export const exportarExcel = (dados, nome = "dados.xlsx") => {
  const ws = XLSX.utils.json_to_sheet(dados);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  XLSX.writeFile(wb, nome);
};
