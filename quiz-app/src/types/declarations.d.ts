// Permet à TypeScript d'accepter les imports d'assets CSV via require()
declare module '*.csv' {
  const value: number;
  export default value;
}
