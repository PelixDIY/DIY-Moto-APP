import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';

@Injectable()
export class BookingsService {
  constructor(private firebaseService: FirebaseService) {}

  async getBookings(startDate?: string, endDate?: string) {
    const snapshot = await this.firebaseService.getFirestore()
        .collection('bookings')
        .orderBy('startTime', 'desc')
        .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async getPendingBookings() {
    const snapshot = await this.firebaseService.getFirestore()
        .collection('bookings')
        .where('paymentStatus', '==', 'pending')
        .get();
    
    const bookings: any[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Sort in memory (descending by endTime)
    return bookings.sort((a, b) => {
       const bTime = (b.endTime as any)?.toDate ? (b.endTime as any).toDate().getTime() : (b.endTime ? new Date(b.endTime as string | number | Date).getTime() : 0);
       const aTime = (a.endTime as any)?.toDate ? (a.endTime as any).toDate().getTime() : (a.endTime ? new Date(a.endTime as string | number | Date).getTime() : 0);
       return bTime - aTime;
    });
  }

  async startLiveSession(dto: any) {
    const { bayId, customerData, bikeData, options = {} } = dto;
    const firestore = this.firebaseService.getFirestore();
    
    let customerId = customerData.id;
    let customerName = customerData.name;

    if (!customerId) {
        const custRef = await firestore.collection('customers').add({ name: customerName, phone: customerData.phone });
        customerId = custRef.id;
    }

    let bikeId = bikeData?.id || null;
    if (bikeData && !bikeId) {
        if (bikeData.bike_model_id || bikeData.plate_number) {
            const bikeRef = await firestore.collection('client_bikes').add({ ...bikeData, client_id: customerId });
            bikeId = bikeRef.id;
        }
    }

    const bookingData = {
        bayId,
        customerId,
        customerName,
        startTime: new Date(),
        endTime: null,
        status: 'active',
        totalPrice: 0,
        isLive: true,
        createdAt: new Date()
    };
    
    const bookingRef = await firestore.collection('bookings').add(bookingData);

    const orderData = {
        type: options.type || "self_service",
        status: "in_progress",
        client_id: customerId,
        bike_id: bikeId,
        booking_id: bookingRef.id,
        mechanic_id: options.mechanic_id || null,
        problem_description: options.problem_description || "",
        total_amount: 0,
        total_cost: 0,
        started_at: new Date(),
        created_at: new Date()
    };
    await firestore.collection('orders').add(orderData);

    return { id: bookingRef.id, ...bookingData };
  }

  async stopLiveSession(bookingId: string, bayId: string) {
    const firestore = this.firebaseService.getFirestore();
    const endTime = new Date();
    
    const bookingDoc = await firestore.collection('bookings').doc(bookingId).get();
    if (!bookingDoc.exists) throw new Error('Booking not found');
    const bookingData = bookingDoc.data()!;
    
    const startTime = (bookingData.startTime as any)?.toDate ? (bookingData.startTime as any).toDate() : new Date(bookingData.startTime as string | number | Date);
    
    const durationMs = endTime.getTime() - startTime.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);
    const billingDuration = Math.ceil(durationHours);

    let bayRate = 150000;
    const bayDoc = await firestore.collection('bays').doc(bayId).get();
    if (bayDoc.exists && bayDoc.data()) {
        bayRate = bayDoc.data()?.rate || 150000;
    } else {
        const BAYS_FALLBACK = {
          'bay-1': 150000,
          'bay-2': 150000,
          'lift-1': 200000,
          'lift-2': 200000
        };
        bayRate = BAYS_FALLBACK[bayId] || 150000;
    }
    
    const rentalPrice = billingDuration * bayRate;

    await firestore.collection('bookings').doc(bookingId).update({
        endTime: endTime,
        status: 'completed',
        paymentStatus: 'pending',
        rentalPrice: rentalPrice,
        billingDuration: billingDuration
    });

    return {
        startTime,
        endTime,
        bayRate,
        billingDuration,
        rentalPrice
    };
  }

  async updateBookingStatus(id: string, status: string) {
    await this.firebaseService.getFirestore().collection('bookings').doc(id).update({ status });
    return { id, status };
  }

  async updateBookingPaymentStatus(id: string, paymentStatus: string) {
    await this.firebaseService.getFirestore().collection('bookings').doc(id).update({ paymentStatus });
    return { id, paymentStatus };
  }

  async addItemsToBooking(id: string, items: any[]) {
    // Using simple read/merge/write flow as it was in frontend
    const docRef = this.firebaseService.getFirestore().collection('bookings').doc(id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) return null;

    const data = docSnap.data();
    const currentItems = data?.additionalItems || [];
    const newItems = [...currentItems, ...items];

    await docRef.update({ additionalItems: newItems });
    return { id, additionalItems: newItems };
  }
}
