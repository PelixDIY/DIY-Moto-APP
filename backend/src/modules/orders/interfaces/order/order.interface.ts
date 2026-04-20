import { OrderStatus } from '../../dto/update-order-status.dto';
import { OrderType } from '../../dto/create-order.dto';

export interface Order {
  id?: string;
  order_number: string;
  type: OrderType;
  status: OrderStatus;
  client_id: string;
  bike_id?: string;
  booking_id?: string | null;
  mechanic_id?: string | null;
  problem_description?: string;
  total_amount: number;
  total_cost: number;
  margin: number;
  created_at: any; // Firestore Timestamp
  updated_at: any;
}
