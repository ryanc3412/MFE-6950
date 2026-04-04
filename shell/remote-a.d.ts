declare module "remote_a/CsvTable" {
  const Component: React.ComponentType<{
    headers?: string[];
    rows?: string[][];
    fileName?: string | null;
  }>;
  export default Component;
}
