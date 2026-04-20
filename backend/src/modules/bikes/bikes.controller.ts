import { Controller, Get, Post, Body, Patch, Param } from '@nestjs/common';
import { BikesService } from './bikes.service';

@Controller('bikes')
export class BikesController {
  constructor(private readonly bikesService: BikesService) {}

  // --- Bike Models ---
  @Get('models')
  getModels() {
    return this.bikesService.getModels();
  }

  @Post('models')
  createModel(@Body() dto: any) {
    return this.bikesService.createModel(dto);
  }

  @Patch('models/:id')
  updateModel(@Param('id') id: string, @Body() dto: any) {
    return this.bikesService.updateModel(id, dto);
  }

  // --- Client Bikes ---
  @Get()
  getAllClientBikes() {
    return this.bikesService.getAllClientBikes();
  }

  @Get('customer/:clientId')
  getBikesByCustomer(@Param('clientId') clientId: string) {
    return this.bikesService.getBikesByCustomer(clientId);
  }

  @Post()
  createClientBike(@Body() dto: any) {
    return this.bikesService.createClientBike(dto);
  }

  @Patch(':id')
  updateClientBike(@Param('id') id: string, @Body() dto: any) {
    return this.bikesService.updateClientBike(id, dto);
  }
}
