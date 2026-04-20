import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';
import { SalesService } from '../sales/sales.service';
import { NotificationsService } from '../notifications/notifications.service';
import { InventoryService } from '../inventory/inventory.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus, UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { AddOrderItemDto, OrderItemType } from './dto/add-order-item.dto';
import { Order } from './interfaces/order/order.interface';

@Injectable()
export class OrdersService {
  private readonly collectionName = 'orders';

  constructor(
    private firebaseService: FirebaseService,
    private salesService: SalesService,
    private notificationsService: NotificationsService,
    private inventoryService: InventoryService,
  ) {}

  private get collection() {
    return this.firebaseService.getFirestore().collection(this.collectionName);
  }

  async create(createOrderDto: CreateOrderDto): Promise<Order> {
    const order_number = `ORD-${Date.now()}`;
    const newOrder: Order = {
      ...createOrderDto,
      order_number,
      status: OrderStatus.NEW,
      total_amount: 0,
      total_cost: 0,
      margin: 0,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const docRef = await this.collection.add(newOrder);
    return { id: docRef.id, ...newOrder };
  }

  async findAll(): Promise<Order[]> {
    const snapshot = await this.collection.get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Order));
  }

  async findOne(id: string): Promise<Order> {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException(`Order #${id} not found`);
    }
    return { id: doc.id, ...doc.data() } as Order;
  }

  async updateStatus(id: string, updateDto: UpdateOrderStatusDto): Promise<Order> {
    const docRef = this.collection.doc(id);
    const newStatus = updateDto.status;

    const updatedOrder = await this.firebaseService.getFirestore().runTransaction(async (t) => {
      const doc = await t.get(docRef);
      if (!doc.exists) {
        throw new NotFoundException(`Order #${id} not found`);
      }

      const order = doc.data() as Order;
      this.validateStatusTransition(order.status, newStatus);

      t.update(docRef, { status: newStatus, updated_at: new Date() });
      return { id: doc.id, ...order, status: newStatus } as Order;
    });

    // Post-transition triggers
    if (newStatus === OrderStatus.COMPLETED) {
      await this.notificationsService.notifyOrderCompleted(id, updatedOrder.client_id);
    } else if (newStatus === OrderStatus.PAID) {
      await this.salesService.recordSale(id, updatedOrder.total_amount, updatedOrder.margin);
    }

    return updatedOrder;
  }

  async addItem(id: string, dto: AddOrderItemDto): Promise<void> {
    const docRef = this.collection.doc(id);
    
    await this.firebaseService.getFirestore().runTransaction(async (t) => {
      const doc = await t.get(docRef);
      if (!doc.exists) {
        throw new NotFoundException(`Order #${id} not found`);
      }

      const order = doc.data() as Order;
      const additionalAmount = dto.price * dto.quantity;
      const additionalCost = dto.cost * dto.quantity;

      const newTotalAmount = (order.total_amount || 0) + additionalAmount;
      const newTotalCost = (order.total_cost || 0) + additionalCost;
      const newMargin = newTotalAmount - newTotalCost;

      // Add item to subcollection
      const itemRef = docRef.collection('items').doc();
      t.set(itemRef, { ...dto, created_at: new Date() });

      // Update order totals
      t.update(docRef, {
        total_amount: newTotalAmount,
        total_cost: newTotalCost,
        margin: newMargin,
        updated_at: new Date()
      });
    });

    // Trigger inventory deduction
    if (dto.type === OrderItemType.PART) {
      await this.inventoryService.deductStock(dto.item_id, dto.quantity, id);
    }
  }

  private validateStatusTransition(current: OrderStatus, next: OrderStatus) {
    const transitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.NEW]: [OrderStatus.DIAGNOSING, OrderStatus.WAITING_PARTS, OrderStatus.IN_PROGRESS],
      [OrderStatus.DIAGNOSING]: [OrderStatus.WAITING_PARTS, OrderStatus.IN_PROGRESS],
      [OrderStatus.WAITING_PARTS]: [OrderStatus.IN_PROGRESS],
      [OrderStatus.IN_PROGRESS]: [OrderStatus.COMPLETED],
      [OrderStatus.COMPLETED]: [OrderStatus.PAID],
      [OrderStatus.PAID]: [],
    };

    const allowed = transitions[current] || [];
    if (!allowed.includes(next)) {
      throw new BadRequestException(`Invalid status transition from ${current} to ${next}`);
    }
  }
}
