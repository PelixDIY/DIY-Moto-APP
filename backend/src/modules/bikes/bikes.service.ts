import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';

@Injectable()
export class BikesService {
  constructor(private firebaseService: FirebaseService) {}

  // --- Bike Models ---
  async getModels() {
    const snapshot = await this.firebaseService.getFirestore().collection('bike_models').orderBy('brand').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async createModel(dto: any) {
    const docRef = await this.firebaseService.getFirestore().collection('bike_models').add({
      ...dto,
      is_active: dto.is_active !== undefined ? dto.is_active : true
    });
    return { id: docRef.id, ...dto };
  }

  async updateModel(id: string, dto: any) {
    await this.firebaseService.getFirestore().collection('bike_models').doc(id).update(dto);
    return { id, ...dto };
  }

  // --- Client Bikes ---
  async getAllClientBikes() {
    const snapshot = await this.firebaseService.getFirestore().collection('client_bikes').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async getBikesByCustomer(clientId: string) {
    const snapshot = await this.firebaseService.getFirestore()
      .collection('client_bikes')
      .where('client_id', '==', clientId)
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async createClientBike(dto: any) {
    const docRef = await this.firebaseService.getFirestore().collection('client_bikes').add({
      ...dto,
      created_at: new Date()
    });
    return { id: docRef.id, ...dto };
  }

  async updateClientBike(id: string, dto: any) {
    // If frontend sends id in dto, we should remove it before update to avoid saving it in the document
    const updateData = { ...dto };
    delete updateData.id;
    
    await this.firebaseService.getFirestore().collection('client_bikes').doc(id).update(updateData);
    return { id, ...updateData };
  }
}
