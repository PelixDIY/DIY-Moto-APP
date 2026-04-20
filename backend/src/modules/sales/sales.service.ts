import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';
import { CreateSaleDto } from './dto/create-sale.dto';

@Injectable()
export class SalesService {
  constructor(private readonly firebaseService: FirebaseService) {}

  get collection() {
    return this.firebaseService.getFirestore().collection('transactions');
  }

  async findAll() {
    const snapshot = await this.collection.orderBy('date', 'desc').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async create(createSaleDto: CreateSaleDto) {
    const docRef = await this.collection.add({ 
        ...createSaleDto,
        date: new Date()
    });
    return { id: docRef.id, ...createSaleDto };
  }

  async recordSale(orderId: string, totalAmount: number, margin: number) {
    const docRef = await this.collection.add({
      order_id: orderId,
      total_amount: totalAmount,
      margin: margin,
      date: new Date(),
      payment_method: 'system-transfer',
      type: 'order_sale'
    });
    return { id: docRef.id, order_id: orderId, total_amount: totalAmount };
  }
}
