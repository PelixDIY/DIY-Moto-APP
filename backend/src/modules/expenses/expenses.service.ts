import { Injectable, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

@Injectable()
export class ExpensesService {
  constructor(private readonly firebaseService: FirebaseService) {}

  get collection() {
    return this.firebaseService.getFirestore().collection('expenses');
  }

  async findAll() {
    const snapshot = await this.collection.orderBy('date', 'desc').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async create(createExpenseDto: CreateExpenseDto) {
    const docRef = await this.collection.add({ 
        ...createExpenseDto,
        date: new Date(createExpenseDto.date)
    });
    return { id: docRef.id, ...createExpenseDto };
  }

  async update(id: string, updateExpenseDto: UpdateExpenseDto) {
    const docRef = this.collection.doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException(`Expense with ID ${id} not found`);
    }

    const updateData: any = { ...updateExpenseDto };
    if (updateExpenseDto.date) {
        updateData.date = new Date(updateExpenseDto.date);
    }
    
    await docRef.update(updateData);
    return { id, ...updateData };
  }

  async remove(id: string) {
    const docRef = this.collection.doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException(`Expense with ID ${id} not found`);
    }
    await docRef.delete();
    return { id, deleted: true };
  }
}
