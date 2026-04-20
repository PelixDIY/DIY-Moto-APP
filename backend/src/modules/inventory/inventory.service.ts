import { Injectable, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class InventoryService {
  constructor(private readonly firebaseService: FirebaseService) {}

  get collection() {
    return this.firebaseService.getFirestore().collection('products');
  }

  async findAll() {
    const snapshot = await this.collection.orderBy('name').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async create(createProductDto: CreateProductDto) {
    const docRef = await this.collection.add({ ...createProductDto });
    return { id: docRef.id, ...createProductDto };
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    const docRef = this.collection.doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    await docRef.update({ ...updateProductDto });
    return { id, ...updateProductDto };
  }

  async remove(id: string) {
    const docRef = this.collection.doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    await docRef.delete();
    return { id, deleted: true };
  }

  async deductStock(itemId: string, quantity: number, orderId: string) {
    console.log(`[Inventory] Deducted ${quantity} of item ${itemId} for order ${orderId}`);
    // Logic to decrease stock in firestore
    const docRef = this.collection.doc(itemId);
    const doc = await docRef.get();
    if (doc.exists) {
        const currentStock = doc.data()?.stockQuantity || 0;
        await docRef.update({ stockQuantity: currentStock - quantity });
    }
  }
}
