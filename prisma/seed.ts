import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function seed() {
  console.log('🌱 Seeding LedgerERP database...\n');

  // ── 1. Create Demo User ──────────────────────────────────────────────
  console.log('1️⃣  Creating demo user...');
  const demoUser = await db.user.upsert({
    where: { piUid: 'demo_user_pi_uid' },
    update: {},
    create: {
      piUid: 'demo_user_pi_uid',
      username: 'تاجر_تجريبي',
      language: 'ar',
      role: 'merchant',
      kycVerified: true,
    },
  });
  console.log(`   ✅ User: ${demoUser.username} (${demoUser.piUid})`);

  // ── 2. Create Demo Store ─────────────────────────────────────────────
  console.log('2️⃣  Creating demo store...');
  const demoStore = await db.store.upsert({
    where: { piUid: 'demo_user_pi_uid' },
    update: {},
    create: {
      piUid: 'demo_user_pi_uid',
      name: 'متجر الأمانة للتجارة',
      description: 'متجر إلكتروني متعدد المنتجات على شبكة Pi - نقبل الدفع بـ Pi والنقدي',
      slug: 'amana-store',
      currency: 'Pi',
      taxRate: 15,
      phone: '+966501234567',
      address: 'الرياض، المملكة العربية السعودية',
      isVerified: true,
    },
  });
  console.log(`   ✅ Store: ${demoStore.name} (slug: ${demoStore.slug})`);

  // ── 3. Create Categories (Hierarchical) ──────────────────────────────
  console.log('3️⃣  Creating categories...');
  const categories = await Promise.all([
    db.category.upsert({
      where: { slug: 'electronics' },
      update: {},
      create: {
        nameAr: 'إلكترونيات',
        nameEn: 'Electronics',
        slug: 'electronics',
        icon: '💻',
        color: 'text-blue-500',
        sortOrder: 1,
        isActive: true,
      },
    }),
    db.category.upsert({
      where: { slug: 'clothing' },
      update: {},
      create: {
        nameAr: 'ملابس',
        nameEn: 'Clothing',
        slug: 'clothing',
        icon: '👕',
        color: 'text-purple-500',
        sortOrder: 2,
        isActive: true,
      },
    }),
    db.category.upsert({
      where: { slug: 'food' },
      update: {},
      create: {
        nameAr: 'أغذية',
        nameEn: 'Food',
        slug: 'food',
        icon: '🍕',
        color: 'text-orange-500',
        sortOrder: 3,
        isActive: true,
      },
    }),
    db.category.upsert({
      where: { slug: 'services' },
      update: {},
      create: {
        nameAr: 'خدمات',
        nameEn: 'Services',
        slug: 'services',
        icon: '🛠️',
        color: 'text-emerald-500',
        sortOrder: 4,
        isActive: true,
      },
    }),
  ]);
  console.log(`   ✅ Categories: ${categories.map(c => c.nameAr).join(', ')}`);

  // ── 4. Create Products ───────────────────────────────────────────────
  console.log('4️⃣  Creating products...');
  const products = await Promise.all([
    db.product.create({
      data: {
        storeId: demoStore.id,
        name: 'هاتف ذكي Pi Phone',
        description: 'هاتف ذكي متطور يدعم تطبيقات Pi Network',
        price: 25.0,
        costPrice: 18.0,
        sku: 'ELEC-001',
        stockQuantity: 50,
        lowStockThreshold: 10,
        trackInventory: true,
        categoryId: categories[0].id,
        unit: 'وحدة',
        isActive: true,
      },
    }),
    db.product.create({
      data: {
        storeId: demoStore.id,
        name: 'سماعة بلوتوث لاسلكية',
        description: 'سماعة لاسلكية عالية الجودة مع إلغاء الضوضاء',
        price: 5.5,
        costPrice: 3.0,
        sku: 'ELEC-002',
        stockQuantity: 120,
        lowStockThreshold: 20,
        trackInventory: true,
        categoryId: categories[0].id,
        unit: 'وحدة',
        isActive: true,
      },
    }),
    db.product.create({
      data: {
        storeId: demoStore.id,
        name: 'شاحن سريع 65W',
        description: 'شاحن سريع متوافق مع جميع الأجهزة',
        price: 2.0,
        costPrice: 1.2,
        sku: 'ELEC-003',
        stockQuantity: 200,
        lowStockThreshold: 30,
        trackInventory: true,
        categoryId: categories[0].id,
        unit: 'وحدة',
        isActive: true,
      },
    }),
    db.product.create({
      data: {
        storeId: demoStore.id,
        name: 'قميص رجالي قطن',
        description: 'قميص رسمي من القطن المصري الفاخر',
        price: 3.0,
        costPrice: 1.5,
        sku: 'CLTH-001',
        stockQuantity: 80,
        lowStockThreshold: 15,
        trackInventory: true,
        categoryId: categories[1].id,
        unit: 'وحدة',
        isActive: true,
      },
    }),
    db.product.create({
      data: {
        storeId: demoStore.id,
        name: 'عباية نسائية مطرزة',
        description: 'عباية فاخرة بتطريز يدوي مميز',
        price: 8.0,
        costPrice: 4.5,
        sku: 'CLTH-002',
        stockQuantity: 30,
        lowStockThreshold: 5,
        trackInventory: true,
        categoryId: categories[1].id,
        unit: 'وحدة',
        isActive: true,
      },
    }),
    db.product.create({
      data: {
        storeId: demoStore.id,
        name: 'تمر عجوة المدينة',
        description: 'تمر عجوة ممتاز من المدينة المنورة - 1 كجم',
        price: 1.5,
        costPrice: 0.8,
        sku: 'FOOD-001',
        stockQuantity: 300,
        lowStockThreshold: 50,
        trackInventory: true,
        categoryId: categories[2].id,
        unit: 'كجم',
        isActive: true,
      },
    }),
    db.product.create({
      data: {
        storeId: demoStore.id,
        name: 'قهوة عربية فاخرة',
        description: 'قهوة عربية بالهيل والزعفران - 500 جم',
        price: 2.5,
        costPrice: 1.0,
        sku: 'FOOD-002',
        stockQuantity: 150,
        lowStockThreshold: 25,
        trackInventory: true,
        categoryId: categories[2].id,
        unit: 'وحدة',
        isActive: true,
      },
    }),
    db.product.create({
      data: {
        storeId: demoStore.id,
        name: 'خدمة توصيل سريع',
        description: 'توصيل خلال ساعتين داخل المدينة',
        price: 0.5,
        costPrice: 0.2,
        sku: 'SERV-001',
        stockQuantity: 0,
        lowStockThreshold: 0,
        trackInventory: false,
        categoryId: categories[3].id,
        unit: 'خدمة',
        isActive: true,
      },
    }),
  ]);
  console.log(`   ✅ Products: ${products.length} created`);

  // ── 5. Create Inventory Records ──────────────────────────────────────
  console.log('5️⃣  Creating inventory records...');
  const inventoryRecords = await Promise.all(
    products
      .filter(p => p.trackInventory)
      .map(p =>
        db.inventory.create({
          data: {
            productId: p.id,
            storeId: demoStore.id,
            quantity: p.stockQuantity,
            reservedQuantity: 0,
            lowStockThreshold: p.lowStockThreshold,
            trackInventory: true,
            lastRestockedAt: new Date(),
          },
        })
      )
  );
  console.log(`   ✅ Inventory records: ${inventoryRecords.length} created`);

  // ── 6. Create Demo Customer ──────────────────────────────────────────
  console.log('6️⃣  Creating demo customer...');
  const demoCustomer = await db.customer.create({
    data: {
      storeId: demoStore.id,
      name: 'أحمد بن محمد',
      phone: '+966509876543',
      email: 'ahmed@example.com',
      address: 'جدة، حي الصفا، شارع الملك فهد',
      piUid: 'customer_ahmed_pi_uid',
      notes: 'عميل مميز - يشتري بانتظام',
      totalSpent: 0,
      totalOrders: 0,
      isActive: true,
    },
  });
  console.log(`   ✅ Customer: ${demoCustomer.name}`);

  // ── 7. Create Sample Invoices ────────────────────────────────────────
  console.log('7️⃣  Creating sample invoices...');

  // Invoice 1: Pending
  const invoice1 = await db.invoice.create({
    data: {
      invoiceNumber: 'INV-2025-001',
      storeId: demoStore.id,
      customerPiUid: 'customer_ahmed_pi_uid',
      customerName: 'أحمد بن محمد',
      subtotal: 30.5,
      taxAmount: 4.575,
      discountAmount: 0,
      escrowFee: 0.305,
      total: 35.38,
      status: 'pending',
      paymentMethod: 'pi',
      notes: 'طلب إلكترونيات - هاتف وسماعة',
      items: {
        create: [
          {
            productId: products[0].id,
            productName: products[0].name,
            quantity: 1,
            unitPrice: 25.0,
            totalPrice: 25.0,
          },
          {
            productId: products[1].id,
            productName: products[1].name,
            quantity: 1,
            unitPrice: 5.5,
            totalPrice: 5.5,
          },
        ],
      },
    },
  });
  console.log(`   ✅ Invoice 1: ${invoice1.invoiceNumber} (pending)`);

  // Invoice 2: Paid Escrow
  const invoice2 = await db.invoice.create({
    data: {
      invoiceNumber: 'INV-2025-002',
      storeId: demoStore.id,
      customerPiUid: 'customer_ahmed_pi_uid',
      customerName: 'أحمد بن محمد',
      subtotal: 8.0,
      taxAmount: 1.2,
      discountAmount: 0.5,
      escrowFee: 0.08,
      total: 8.78,
      status: 'paid_escrow',
      paymentMethod: 'pi',
      notes: 'عباية مطرزة - خصم 0.5 Pi',
      paidAt: new Date(),
      items: {
        create: [
          {
            productId: products[4].id,
            productName: products[4].name,
            quantity: 1,
            unitPrice: 8.0,
            totalPrice: 8.0,
          },
        ],
      },
    },
  });
  console.log(`   ✅ Invoice 2: ${invoice2.invoiceNumber} (paid_escrow)`);

  // Invoice 3: Completed
  const invoice3 = await db.invoice.create({
    data: {
      invoiceNumber: 'INV-2025-003',
      storeId: demoStore.id,
      customerPiUid: 'customer_ahmed_pi_uid',
      customerName: 'أحمد بن محمد',
      subtotal: 4.0,
      taxAmount: 0.6,
      discountAmount: 0,
      escrowFee: 0,
      total: 4.6,
      status: 'completed',
      paymentMethod: 'cash',
      notes: 'شراء نقدي - تمر وقهوة',
      paidAt: new Date(Date.now() - 86400000),
      completedAt: new Date(),
      items: {
        create: [
          {
            productId: products[5].id,
            productName: products[5].name,
            quantity: 1,
            unitPrice: 1.5,
            totalPrice: 1.5,
          },
          {
            productId: products[6].id,
            productName: products[6].name,
            quantity: 1,
            unitPrice: 2.5,
            totalPrice: 2.5,
          },
        ],
      },
    },
  });
  console.log(`   ✅ Invoice 3: ${invoice3.invoiceNumber} (completed)`);

  // Update customer stats
  await db.customer.update({
    where: { id: demoCustomer.id },
    data: {
      totalSpent: 35.38 + 8.78 + 4.6,
      totalOrders: 3,
    },
  });

  // ── 8. Create Sample Local Sale ──────────────────────────────────────
  console.log('8️⃣  Creating sample local sale...');
  const localSale = await db.localSale.create({
    data: {
      storeId: demoStore.id,
      customerId: demoCustomer.id,
      invoiceNumber: 'LS-2025-001',
      subtotal: 5.0,
      taxAmount: 0.75,
      discountAmount: 0,
      total: 5.75,
      paymentMethod: 'cash',
      notes: 'بيع نقدي في المتجر - قميص وشاحن',
      createdBy: 'demo_user_pi_uid',
      items: {
        create: [
          {
            productId: products[3].id,
            productName: products[3].name,
            quantity: 1,
            unitPrice: 3.0,
            totalPrice: 3.0,
          },
          {
            productId: products[2].id,
            productName: products[2].name,
            quantity: 1,
            unitPrice: 2.0,
            totalPrice: 2.0,
          },
        ],
      },
    },
  });
  console.log(`   ✅ Local Sale: ${localSale.invoiceNumber} (cash)`);

  // ── 9. Create Transaction Logs ───────────────────────────────────────
  console.log('9️⃣  Creating transaction logs...');
  await Promise.all([
    db.transactionLog.create({
      data: {
        storeId: demoStore.id,
        invoiceId: invoice2.id,
        type: 'pi',
        amount: 8.78,
        currency: 'Pi',
        description: 'دفعة Pi مقابل فاتورة INV-2025-002',
        reference: 'pi_tx_abc123',
        createdBy: 'demo_user_pi_uid',
      },
    }),
    db.transactionLog.create({
      data: {
        storeId: demoStore.id,
        invoiceId: invoice3.id,
        type: 'cash',
        amount: 4.6,
        currency: 'Pi',
        description: 'دفعة نقدية مقابل فاتورة INV-2025-003',
        reference: 'cash_receipt_001',
        createdBy: 'demo_user_pi_uid',
      },
    }),
    db.transactionLog.create({
      data: {
        storeId: demoStore.id,
        type: 'expense',
        amount: 2.0,
        currency: 'Pi',
        description: 'إيجار الكهرباء الشهري',
        reference: 'exp_util_001',
        createdBy: 'demo_user_pi_uid',
      },
    }),
  ]);
  console.log(`   ✅ Transaction logs: 3 created`);

  // ── 10. Create Expenses ──────────────────────────────────────────────
  console.log('🔟 Creating expenses...');
  await Promise.all([
    db.expense.create({
      data: {
        storeId: demoStore.id,
        category: 'utilities',
        description: 'فاتورة الكهرباء - مارس 2025',
        amount: 1.5,
        date: new Date('2025-03-01'),
        createdBy: 'demo_user_pi_uid',
      },
    }),
    db.expense.create({
      data: {
        storeId: demoStore.id,
        category: 'supplies',
        description: 'أكياس وأغلفة تغليف',
        amount: 0.3,
        date: new Date('2025-03-05'),
        createdBy: 'demo_user_pi_uid',
      },
    }),
    db.expense.create({
      data: {
        storeId: demoStore.id,
        category: 'marketing',
        description: 'إعلان على وسائل التواصل',
        amount: 0.5,
        date: new Date('2025-03-10'),
        createdBy: 'demo_user_pi_uid',
      },
    }),
  ]);
  console.log(`   ✅ Expenses: 3 created`);

  // ── 11. Create Inventory Movements ───────────────────────────────────
  console.log('1️⃣1️⃣  Creating inventory movements...');
  if (inventoryRecords.length > 0) {
    await db.inventoryMovement.create({
      data: {
        inventoryId: inventoryRecords[0].id,
        type: 'in',
        quantity: 50,
        reason: 'استلام مخزون أولي',
        referenceId: '',
        createdBy: 'demo_user_pi_uid',
      },
    });
    await db.inventoryMovement.create({
      data: {
        inventoryId: inventoryRecords[0].id,
        type: 'sale',
        quantity: -1,
        reason: 'بيع عبر فاتورة INV-2025-001',
        referenceId: invoice1.id,
        createdBy: 'demo_user_pi_uid',
      },
    });
  }
  console.log(`   ✅ Inventory movements: 2 created`);

  // ── 12. Create Notifications ─────────────────────────────────────────
  console.log('1️⃣2️⃣  Creating notifications...');
  await Promise.all([
    db.notification.create({
      data: {
        userId: demoUser.id,
        type: 'payment',
        title: 'دفعة Pi واردة',
        message: 'تم استلام دفعة Pi بقيمة 8.78 من أحمد بن محمد مقابل الفاتورة INV-2025-002',
        severity: 'high',
        read: false,
        actionUrl: '/invoices/INV-2025-002',
        invoiceId: invoice2.id,
        storeId: demoStore.id,
      },
    }),
    db.notification.create({
      data: {
        userId: demoUser.id,
        type: 'order',
        title: 'طلب جديد',
        message: 'طلب جديد من أحمد بن محمد - فاتورة INV-2025-001 بقيمة 35.38 Pi',
        severity: 'high',
        read: false,
        actionUrl: '/invoices/INV-2025-001',
        invoiceId: invoice1.id,
        storeId: demoStore.id,
      },
    }),
    db.notification.create({
      data: {
        userId: demoUser.id,
        type: 'escrow',
        title: 'تم تأكيد الإيداع',
        message: 'تم تأكيد إيداع Pi في الضمان للفاتورة INV-2025-002 - يمكنك الآن شحن الطلب',
        severity: 'medium',
        read: true,
        actionUrl: '/invoices/INV-2025-002',
        invoiceId: invoice2.id,
        storeId: demoStore.id,
      },
    }),
    db.notification.create({
      data: {
        userId: demoUser.id,
        type: 'system',
        title: 'مرحبًا بك في LedgerERP',
        message: 'مرحبًا بك في منصة LedgerERP! يمكنك الآن إدارة منتجاتك وإنشاء فواتير وتتبع المدفوعات عبر شبكة Pi.',
        severity: 'info',
        read: false,
        storeId: demoStore.id,
      },
    }),
  ]);
  console.log(`   ✅ Notifications: 4 created`);

  // ── 13. Create User Settings ─────────────────────────────────────────
  console.log('1️⃣3️⃣  Creating user settings...');
  await Promise.all([
    db.userSetting.create({
      data: { userId: demoUser.id, key: 'theme', value: 'light' },
    }),
    db.userSetting.create({
      data: { userId: demoUser.id, key: 'language', value: 'ar' },
    }),
    db.userSetting.create({
      data: { userId: demoUser.id, key: 'notifications_enabled', value: 'true' },
    }),
    db.userSetting.create({
      data: { userId: demoUser.id, key: 'escrow_auto_release', value: 'false' },
    }),
  ]);
  console.log(`   ✅ User settings: 4 created`);

  // ── Summary ──────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(50));
  console.log('🎉 Seed completed successfully!');
  console.log('═'.repeat(50));

  const counts = {
    users: await db.user.count(),
    stores: await db.store.count(),
    categories: await db.category.count(),
    products: await db.product.count(),
    customers: await db.customer.count(),
    inventory: await db.inventory.count(),
    inventoryMovements: await db.inventoryMovement.count(),
    invoices: await db.invoice.count(),
    invoiceItems: await db.invoiceItem.count(),
    localSales: await db.localSale.count(),
    localSaleItems: await db.localSaleItem.count(),
    transactionLogs: await db.transactionLog.count(),
    expenses: await db.expense.count(),
    notifications: await db.notification.count(),
    userSettings: await db.userSetting.count(),
  };

  console.log('\n📊 Database Summary:');
  console.log(`   Users:              ${counts.users}`);
  console.log(`   Stores:             ${counts.stores}`);
  console.log(`   Categories:         ${counts.categories}`);
  console.log(`   Products:           ${counts.products}`);
  console.log(`   Customers:          ${counts.customers}`);
  console.log(`   Inventory:          ${counts.inventory}`);
  console.log(`   Inventory Movements:${counts.inventoryMovements}`);
  console.log(`   Invoices:           ${counts.invoices}`);
  console.log(`   Invoice Items:      ${counts.invoiceItems}`);
  console.log(`   Local Sales:        ${counts.localSales}`);
  console.log(`   Local Sale Items:   ${counts.localSaleItems}`);
  console.log(`   Transaction Logs:   ${counts.transactionLogs}`);
  console.log(`   Expenses:           ${counts.expenses}`);
  console.log(`   Notifications:      ${counts.notifications}`);
  console.log(`   User Settings:      ${counts.userSettings}`);
  console.log(`   ────────────────────────`);
  console.log(`   Total Records:      ${Object.values(counts).reduce((a, b) => a + b, 0)}`);
}

seed()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
