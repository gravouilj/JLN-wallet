export interface PriceObject {
  [currency: string]: number;
}

export interface UseXecPriceReturn {
  price: PriceObject | null;
  loading: boolean;
  error: string | null;
}

export function useXecPrice(): UseXecPriceReturn;
