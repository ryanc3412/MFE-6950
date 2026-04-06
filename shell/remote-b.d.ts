declare module "remote_b/CsvUpload" {
  type CsvParsed = {
    headers: string[];
    rows: string[][];
    fileName?: string | null;
  };
  const Component: React.ComponentType<{
    onParsed?: (data: CsvParsed) => void;
  }>;
  export default Component;
}

declare module "remote_b/StockPrice" {
  const Component: React.ComponentType;
  export default Component;
}

declare module "remote_b/LedgerPieCharts" {
  type PieSlice = { label: string; value: number };
  const Component: React.ComponentType<{
    expenseSlices?: PieSlice[];
    incomeSlices?: PieSlice[];
    totalExpenses?: number;
    totalIncome?: number;
  }>;
  export default Component;
}
