import crypto from 'crypto';
import { Sequelize } from "sequelize-typescript";
import Order from "../../../../domain/checkout/entity/order";
import OrderItem from "../../../../domain/checkout/entity/order_item";
import Customer from "../../../../domain/customer/entity/customer";
import Address from "../../../../domain/customer/value-object/address";
import Product from "../../../../domain/product/entity/product";
import CustomerModel from "../../../customer/repository/sequelize/customer.model";
import CustomerRepository from "../../../customer/repository/sequelize/customer.repository";
import ProductModel from "../../../product/repository/sequelize/product.model";
import ProductRepository from "../../../product/repository/sequelize/product.repository";
import OrderItemModel from "./order-item.model";
import OrderModel from "./order.model";
import OrderRepository from "./order.repository";

describe("Order repository test", () => {
  let sequelize: Sequelize;

  beforeEach(async () => {
    sequelize = new Sequelize({
      dialect: "sqlite",
      storage: ":memory:",
      logging: false,
      sync: { force: true },
    });

    await sequelize.addModels([
      CustomerModel,
      OrderModel,
      OrderItemModel,
      ProductModel,
    ]);
    await sequelize.sync();
  });

  afterEach(async () => {
    await sequelize.close();
  });

  const generateItem = async (productId = "123"): Promise<OrderItem> => {
    const productRepository = new ProductRepository();
    const product = new Product(productId, `Product ${productId}`, 10);
    await productRepository.create(product);
    let itemId = crypto.randomUUID();

    return new OrderItem(
      itemId,
      product.name,
      product.price,
      product.id,
      2
    );
  }

  const generateOrder = async (orderId = "123", custumerId = "123", productId = "123"): Promise<Order> => {
    const customerRepository = new CustomerRepository();
    const customer = new Customer(custumerId, `Customer ${custumerId}`);
    const address = new Address("Street 1", 1, "Zipcode 1", "City 1");
    customer.changeAddress(address);
    await customerRepository.create(customer);

    const orderItem = await generateItem(productId);

    return new Order(orderId, customer.id, [orderItem]);
  }

  it('should be able to find a order', async () => {
    const order = await generateOrder("321")
    const orderRepository = new OrderRepository();
    await orderRepository.create(order);

    const result = await orderRepository.find(order.id);

    expect(result).toEqual(order)
  })

  it('should be able to find all orders', async () => {
    const orderRepository = new OrderRepository();
    const order1 = await generateOrder("1", "1", "1")
    const order2 = await generateOrder("2", "2", "2")

    await orderRepository.create(order1)
    await orderRepository.create(order2)

    const orders = await orderRepository.findAll();

    expect(orders).toHaveLength(2)
    expect(orders).toContainEqual(order1)
    expect(orders).toContainEqual(order2)
  })

  it("should create a new order", async () => {
    const order = await generateOrder()
    const [orderItem] = order.items
    const orderRepository = new OrderRepository();
    await orderRepository.create(order);

    const orderModel = await OrderModel.findOne({
      where: { id: order.id },
      include: ["items"],
    });

    expect(orderModel.toJSON()).toStrictEqual({
      id: "123",
      customer_id: "123",
      total: order.total(),
      items: [
        {
          id: orderItem.id,
          name: orderItem.name,
          price: orderItem.price,
          quantity: orderItem.quantity,
          order_id: "123",
          product_id: "123",
        },
      ],
    });
  });

  it('should update a order', async () => {
    const orderRepository = new OrderRepository();
    const order = await generateOrder("3", "1")
    await orderRepository.create(order);
    
    const newItem = await generateItem("2")
    const orderChanged = new Order(order.id, order.customerId, [...order.items, newItem])
    await orderRepository.update(orderChanged);

    const result = await orderRepository.find(orderChanged.id);

    expect(result).toEqual(orderChanged);
  })
});
