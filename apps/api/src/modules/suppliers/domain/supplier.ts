export interface Supplier {
  id: number;
  name: string;
  country: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  isActive: boolean;
}

export type SupplierDraft = Omit<Supplier, 'id' | 'isActive'> & { isActive?: boolean };

export interface SupplierFilters {
  search?: string;
  isActive?: boolean;
}
