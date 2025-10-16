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
}

export interface Product {
  id: string;
  name: string;
  price: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  storeId?: string;
  store?: Store;
}
