export interface UseXecPriceReturn {
  price: number | null;
  loading: boolean;
  error: string | null;
}

export function useXecPrice(): UseXecPriceReturn;
