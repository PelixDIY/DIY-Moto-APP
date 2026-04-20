import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';

@Injectable()
export class DashboardService {
  constructor(private firebaseService: FirebaseService) {}

  async getLiveStats() {
    const ordersRef = this.firebaseService.getFirestore().collection('orders');
    
    // In actual production, perform these with multiple queries or aggregate functions
    const inProgressQuery = ordersRef.where('status', '==', 'in_progress').get();
    const waitingPartsQuery = ordersRef.where('status', '==', 'waiting_parts').get();
    // Assuming overdue is checked by a specific flag or date diff later on
    
    const [inProgressSnapshot, waitingPartsSnapshot] = await Promise.all([
      inProgressQuery,
      waitingPartsQuery
    ]);

    return {
      in_progress: inProgressSnapshot.size,
      waiting_parts: waitingPartsSnapshot.size,
      // ready was removed from requirements
      overdue: 0 // placeholder
    };
  }
}
