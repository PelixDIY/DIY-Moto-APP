import { Injectable, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(private firebaseService: FirebaseService) {}

  private get collection() {
    return this.firebaseService.getFirestore().collection('customers');
  }

  async findAll() {
    const snapshot = await this.collection.orderBy('name').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async findOne(id: string) {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }
    return { id: doc.id, ...doc.data() };
  }

  async create(createCustomerDto: CreateCustomerDto) {
    const docRef = await this.collection.add({
      ...createCustomerDto,
      created_at: new Date()
    });
    return { id: docRef.id, ...createCustomerDto };
  }

  async update(id: string, updateCustomerDto: UpdateCustomerDto) {
    const docRef = this.collection.doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }
    
    // Remove undefined values to avoid overwriting with null in Firestore
    const updateData = Object.fromEntries(
      Object.entries(updateCustomerDto).filter(([_, v]) => v !== undefined)
    );
    
    await docRef.update({
        ...updateData,
        updated_at: new Date()
    });
    return this.findOne(id);
  }
}
