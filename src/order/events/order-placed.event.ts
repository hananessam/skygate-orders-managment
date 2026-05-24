export class OrderPlacedEvent {
  static readonly eventName = 'order.placed';

  constructor(
    public readonly orderId: string,
    public readonly userId: number,
  ) {}
}
