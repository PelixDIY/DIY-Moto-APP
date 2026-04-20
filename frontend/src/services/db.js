import { db, storage } from './firebase';
import apiClient from './api';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    Timestamp,
    setDoc
} from 'firebase/firestore';

// --- Users ---
export const getUserRole = async (uid) => {
    try {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
            return userDoc.data().role;
        }
        return null;
    } catch (error) {
        console.error("Error fetching user role:", error);
        return null;
    }
};

// --- Products (Inventory) ---
export const getProducts = async () => {
    try {
        return await apiClient('/inventory');
    } catch (e) {
        console.error("Error fetching products from API:", e);
        return [];
    }
};

export const addProduct = async (productData) => {
    try {
        return await apiClient('/inventory', {
            method: 'POST',
            body: JSON.stringify(productData)
        });
    } catch (e) {
        console.error("Error adding product API:", e);
        throw e;
    }
};

export const updateProduct = async (id, data) => {
    try {
        return await apiClient(`/inventory/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
    } catch (e) {
        console.error("Error updating product API:", e);
        throw e;
    }
};

export const deleteProduct = async (id) => {
    try {
        return await apiClient(`/inventory/${id}`, {
            method: 'DELETE'
        });
    } catch (e) {
        console.error("Error deleting product API:", e);
        throw e;
    }
};

// --- Bookings ---
export const getBookings = async (startDate, endDate) => {
    try {
        const queryParams = new URLSearchParams();
        if (startDate) queryParams.append('startDate', startDate);
        if (endDate) queryParams.append('endDate', endDate);
        return await apiClient(`/bookings?${queryParams.toString()}`);
    } catch (e) {
        console.error("Error fetching bookings via API:", e);
        return [];
    }
};

export const checkBookingConflict = async (bayId, startTime, endTime) => {
    // Overlap logic: (StartA < EndB) and (EndA > StartB)
    // Firestore limitation: Can't easily do inequality on two different fields.
    // Enhanced query: Filter by bayId, then do client-side overlap check for robustnes

    const q = query(
        collection(db, 'bookings'),
        where('bayId', '==', bayId),
        where('status', 'in', ['booked', 'confirmed']) // Ignore cancelled
    );

    const snapshot = await getDocs(q);
    const existingBookings = snapshot.docs.map(doc => ({
        ...doc.data(),
        startTime: doc.data().startTime.toDate(),
        endTime: doc.data().endTime.toDate()
    }));

    const hasConflict = existingBookings.some(booking => {
        return startTime < booking.endTime && endTime > booking.startTime;
    });

    return hasConflict;
};

export const createBooking = async (bookingData) => {
    // We can still use Firestore directly if needed, or route through a basic POST /bookings
    console.warn("createBooking called - should use startLiveSession or explicit API");
    return await addDoc(collection(db, 'bookings'), {
        ...bookingData,
        createdAt: Timestamp.now()
    });
};

export const updateBookingStatus = async (id, status) => {
    return await apiClient(`/bookings/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
    });
};

// --- Live Session & Pricing ---
// --- Live Session & Pricing ---
// Deprecated: BAYS constant is now only used for initialization or fallback.
// Use getBays() to fetch active configuration.
export const DEFAULT_BAYS = {
    'bay-1': { name: 'Bay 1 (Standard)', type: 'standard', rate: 150000, order: 1 },
    'bay-2': { name: 'Bay 2 (Standard)', type: 'standard', rate: 150000, order: 2 },
    'lift-1': { name: 'Lift 1 (Hydraulic)', type: 'lift', rate: 200000, order: 3 },
    'lift-2': { name: 'Lift 2 (Hydraulic)', type: 'lift', rate: 200000, order: 4 }
};
// Backward compatibility export (will be removed later)
export const BAYS = DEFAULT_BAYS;

export const getBays = async () => {
    const q = query(collection(db, 'bays'), orderBy('order'));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
        // Auto-initialize if empty
        await initializeBays();
        return Object.entries(DEFAULT_BAYS).map(([id, data]) => ({ id, ...data }));
    }
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const initializeBays = async () => {
    // Only run if collection is empty
    const snapshot = await getDocs(collection(db, 'bays'));
    if (!snapshot.empty) return;

    for (const [id, data] of Object.entries(DEFAULT_BAYS)) {
        await setDoc(doc(db, 'bays', id), data);
    }
};

export const addBay = async (bayData) => {
    return await addDoc(collection(db, 'bays'), bayData);
};

export const updateBay = async (id, bayData) => {
    return await updateDoc(doc(db, 'bays', id), bayData);
};

export const deleteBay = async (id) => {
    return await deleteDoc(doc(db, 'bays', id));
};

export const startLiveSession = async (bayId, customerData, bikeData = null, options = {}) => {
    return await apiClient('/bookings/start', {
        method: 'POST',
        body: JSON.stringify({ bayId, customerData, bikeData, options })
    });
};

export const stopLiveSession = async (bookingId, bayId) => {
    return await apiClient(`/bookings/${bookingId}/stop`, {
        method: 'POST',
        body: JSON.stringify({ bayId })
    });
};

export const addItemsToBooking = async (bookingId, items) => {
    return await apiClient(`/bookings/${bookingId}/items`, {
        method: 'POST',
        body: JSON.stringify({ items })
    });
};

export const getPendingBookings = async () => {
    try {
        return await apiClient('/bookings/pending');
    } catch (e) {
        console.error("Error fetching pending bookings API:", e);
        return [];
    }
};

export const updateBookingPaymentStatus = async (id, status) => {
    return await apiClient(`/bookings/${id}/payment`, {
        method: 'PATCH',
        body: JSON.stringify({ paymentStatus: status })
    });
};

// --- Customers ---
export const getCustomers = async () => {
    try {
        return await apiClient('/customers');
    } catch (e) {
        console.error("Error fetching customers from API:", e);
        return [];
    }
};

export const addCustomer = async (customerData) => {
    try {
        const result = await apiClient('/customers', {
            method: 'POST',
            body: JSON.stringify(customerData)
        });
        // Frontend code often expects returned doc to have .id property, or returning a ref with .id
        // We will return the object which has an id from NestJS
        return { id: result.id, ...result };
    } catch (e) {
        console.error("Error adding customer API:", e);
        throw e;
    }
};

export const updateCustomer = async (id, customerData) => {
    try {
        return await apiClient(`/customers/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(customerData)
        });
    } catch (e) {
        console.error("Error updating customer API:", e);
        throw e;
    }
};

// --- Transactions (POS) ---
export const getTransactions = async () => {
    try {
        const transactions = await apiClient('/sales');
        return transactions.map(t => ({
            ...t,
            date: t.date?._seconds ? new Date(t.date._seconds * 1000) : t.date
        }));
    } catch (error) {
        console.error("Error fetching transactions API:", error);
        return [];
    }
};

export const createTransaction = async (transactionData) => {
    try {
        return await apiClient('/sales', {
            method: 'POST',
            body: JSON.stringify(transactionData)
        });
    } catch (error) {
        console.error("Error creating transaction API:", error);
        throw error;
    }
};

// --- Expenses ---
export const getExpenses = async () => {
    try {
        const expenses = await apiClient('/expenses');
        return expenses.map(e => ({
            ...e,
            date: e.date?._seconds ? new Date(e.date._seconds * 1000) : e.date
        }));
    } catch (error) {
        console.error("Error fetching expenses from API:", error);
        return [];
    }
};

export const addExpense = async (expenseData) => {
    try {
        return await apiClient('/expenses', {
            method: 'POST',
            body: JSON.stringify(expenseData)
        });
    } catch (error) {
        console.error("Error adding expense API:", error);
        throw error;
    }
};

export const uploadInvoiceImage = async (file) => {
    const storageRef = ref(storage, `invoices/${Date.now()}_${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);
    return await getDownloadURL(snapshot.ref);
};

export const updateExpense = async (id, expenseData) => {
    try {
        return await apiClient(`/expenses/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(expenseData)
        });
    } catch (error) {
        console.error("Error updating expense API:", error);
        throw error;
    }
};

export const deleteExpense = async (id) => {
    try {
        return await apiClient(`/expenses/${id}`, {
            method: 'DELETE'
        });
    } catch (error) {
        console.error("Error deleting expense API:", error);
        throw error;
    }
};

// --- Bike Models ---
export const getBikeModels = async () => {
    try {
        return await apiClient('/bikes/models');
    } catch (e) {
        console.error("Error fetching bike models SDK fallback:", e);
        return [];
    }
};

export const addBikeModel = async (bikeModelData) => {
    return await apiClient('/bikes/models', {
        method: 'POST',
        body: JSON.stringify(bikeModelData)
    });
};

export const updateBikeModel = async (id, data) => {
    return await apiClient(`/bikes/models/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
    });
};

export const seedBikeModels = async () => {
    const initialBikes = [
        { brand: 'Yamaha', model: 'NMAX', variant: '155', cc: 155, type: 'scooter', service_interval_km: 2000, oil_volume: 0.9 },
        { brand: 'Yamaha', model: 'XMAX', variant: '250', cc: 250, type: 'scooter', service_interval_km: 3000, oil_volume: 1.5 },
        { brand: 'Yamaha', model: 'Aerox', variant: '155', cc: 155, type: 'scooter', service_interval_km: 2000, oil_volume: 0.9 },
        { brand: 'Honda', model: 'Vario', variant: '160', cc: 160, type: 'scooter', service_interval_km: 2000, oil_volume: 0.8 },
        { brand: 'Honda', model: 'PCX', variant: '160', cc: 160, type: 'scooter', service_interval_km: 2000, oil_volume: 0.8 },
        { brand: 'Honda', model: 'ADV', variant: '160', cc: 160, type: 'scooter', service_interval_km: 2000, oil_volume: 0.8 },
        { brand: 'Honda', model: 'Scoopy', variant: '110', cc: 110, type: 'scooter', service_interval_km: 2000, oil_volume: 0.7 },
        { brand: 'Kawasaki', model: 'Ninja', variant: '250', cc: 250, type: 'sport', service_interval_km: 4000, oil_volume: 2.0 },
        { brand: 'Kawasaki', model: 'KLX', variant: '150', cc: 150, type: 'dirt', service_interval_km: 3000, oil_volume: 1.0 },
    ];
    
    // Check if empty
    const existing = await getBikeModels();
    if (existing.length === 0) {
        for (const bike of initialBikes) {
            await addBikeModel(bike);
        }
        console.log("Seeded initial bike models!");
    }
};

// --- Client Bikes ---
export const getAllClientBikes = async () => {
    try {
        return await apiClient('/bikes');
    } catch (e) {
        console.error("Error fetching all client bikes:", e);
        return [];
    }
};

export const getBikesByCustomer = async (clientId) => {
    try {
        return await apiClient(`/bikes/customer/${clientId}`);
    } catch (e) {
        console.error("Error fetching client bikes by customer:", e);
        return [];
    }
};

export const addBike = async (bikeData) => {
    return await apiClient('/bikes', {
        method: 'POST',
        body: JSON.stringify(bikeData)
    });
};

export const updateClientBike = async (id, data) => {
    return await apiClient(`/bikes/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
    });
};

export const getOrdersByBikeId = async (bikeId) => {
    const q = query(
        collection(db, 'orders'),
        where('bike_id', '==', bikeId)
    );
    const snapshot = await getDocs(q);
    // Sort in memory instead of requiring composite index
    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return orders.sort((a, b) => {
        const dA = a.created_at?.toDate ? a.created_at.toDate() : new Date(0);
        const dB = b.created_at?.toDate ? b.created_at.toDate() : new Date(0);
        return dB - dA;
    });
};

export const getOrders = async () => {
    try {
        const orders = await apiClient('/orders');
        // Map timestamps if NestJS returns Firestore.Timestamp objects
        return orders.map(o => ({
            ...o,
            created_at: o.created_at?._seconds ? new Date(o.created_at._seconds * 1000) : o.created_at,
            updated_at: o.updated_at?._seconds ? new Date(o.updated_at._seconds * 1000) : o.updated_at
        }));
    } catch (error) {
        console.error("Error fetching orders from API:", error);
        return [];
    }
};

export const getOrder = async (id) => {
    try {
        const order = await apiClient(`/orders/${id}`);
        if(order) {
           order.created_at = order.created_at?._seconds ? new Date(order.created_at._seconds * 1000) : order.created_at;
           order.updated_at = order.updated_at?._seconds ? new Date(order.updated_at._seconds * 1000) : order.updated_at;
        }
        return order;
    } catch(error) {
         console.error("Error fetching order from API:", error);
         return null;
    }
};

export const createOrder = async (orderData) => {
    try {
        const result = await apiClient('/orders', {
            method: 'POST',
            body: JSON.stringify(orderData) // NestJS expects CreateOrderDto
        });
        return result;
    } catch(e) {
        console.error("Error creating order API:", e);
        throw e;
    }
};

export const updateOrder = async (id, data) => {
    try {
        let updateData = { ...data };

        // If it's a status update, DO IT VIA API
        if (updateData.status) {
            await apiClient(`/orders/${id}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status: updateData.status }) // UpdateOrderStatusDto
            });
            delete updateData.status;
        }

        // If there are other updates, update Firebase directly
        if (Object.keys(updateData).length > 0) {
             const { updateDoc, doc, Timestamp } = await import('firebase/firestore');
             await updateDoc(doc(db, 'orders', id), {
                 ...updateData,
                 updated_at: Timestamp.now()
             });
        }
    } catch(e) {
        console.error("Error updating order:", e);
        throw e;
    }
};

// --- Order Items ---
export const getOrderItemsByOrder = async (orderId) => {
    const q = query(collection(db, 'order_items'), where('order_id', '==', orderId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addOrderItem = async (itemData) => {
    return await addDoc(collection(db, 'order_items'), itemData);
};

export const removeOrderItem = async (id) => {
    // Attempt stock restoration before deleting
    try {
        const itemDoc = await getDoc(doc(db, 'order_items', id));
        if (itemDoc.exists()) {
            const data = itemDoc.data();
            // If it's a product and has a product_id, restore stock
            if (data.type === 'product' && data.product_id) {
                const productRef = doc(db, 'products', data.product_id);
                const productSnap = await getDoc(productRef);
                if (productSnap.exists()) {
                    const currentStock = productSnap.data().stock || 0;
                    await updateDoc(productRef, { stock: currentStock + (data.quantity || 1) });
                }
            }
        }
    } catch (e) {
        console.error("Failed to restore stock on removal", e);
    }
    return await deleteDoc(doc(db, 'order_items', id));
};
