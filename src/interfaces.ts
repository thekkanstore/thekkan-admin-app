export interface Store {
  id: string;
  userId: string;
  isActive: boolean;
  storeName: string;
  email: string;
  phoneNumber: number | string;
  address: string;
  categories?: string[];
  city: string;
  state: string;
  createdAt: Date;
  updatedAt: Date;
  vendorStatus?: string;
}

export interface Product {
  id: string;
  name: string;
  actualPrice: number;
  discountPrice: number;
  description: string;
  categoryId: string;
  status: string;
  image: string;
  storeId: string;
  isActive: boolean;
  isSecondHand: boolean;
  userId: string;
  createdAt: any;
  updatedAt: any;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string | string[];
  status: string;
  storeId?: string;
  store?: Store;
  phoneNumber?: string;
}