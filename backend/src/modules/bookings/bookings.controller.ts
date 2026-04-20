import { Controller, Get, Post, Body, Patch, Param, Query } from '@nestjs/common';
import { BookingsService } from './bookings.service';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get()
  getBookings(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.bookingsService.getBookings(startDate, endDate);
  }

  @Get('pending')
  getPendingBookings() {
    return this.bookingsService.getPendingBookings();
  }

  @Post('start')
  startLiveSession(@Body() dto: any) {
    return this.bookingsService.startLiveSession(dto);
  }

  @Post(':id/stop')
  stopLiveSession(@Param('id') id: string, @Body() dto: { bayId: string }) {
    return this.bookingsService.stopLiveSession(id, dto.bayId);
  }

  @Patch(':id/status')
  updateBookingStatus(@Param('id') id: string, @Body() dto: { status: string }) {
    return this.bookingsService.updateBookingStatus(id, dto.status);
  }

  @Patch(':id/payment')
  updateBookingPaymentStatus(@Param('id') id: string, @Body() dto: { paymentStatus: string }) {
    return this.bookingsService.updateBookingPaymentStatus(id, dto.paymentStatus);
  }

  @Post(':id/items')
  addItemsToBooking(@Param('id') id: string, @Body() dto: { items: any[] }) {
    return this.bookingsService.addItemsToBooking(id, dto.items);
  }
}
