import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';

@Injectable()
export class ClientsService {
  constructor(private firebaseService: FirebaseService) {}

  private get collection() {
    return this.firebaseService.getFirestore().collection('clients');
  }

  async create(createClientDto: any) {
    const docRef = await this.collection.add({
      ...createClientDto,
      created_at: new Date()
    });
    return { id: docRef.id, ...createClientDto };
  }

  async findOne(id: string) {
    const doc = await this.collection.doc(id).get();
    return { id: doc.id, ...doc.data() };
  }

  async getHistory(id: string) {
    // Queries orders where client_id == id
    const ordersSnapshot = await this.firebaseService.getFirestore()
      .collection('orders')
      .where('client_id', '==', id)
      .get();
      
    // Should aggregate parts and services here
    return ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
}
