export interface CostCenter {
  id: number;
  name: string;
}

export interface CostCenterWithCount extends CostCenter {
  productCount: number;
}
