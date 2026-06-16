const nodemailer = require('nodemailer');

const EMAIL_HOST = process.env.EMAIL_HOST;
const EMAIL_PORT = Number(process.env.EMAIL_PORT) || 587;
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM;
const FRONTEND_URL = (process.env.FRONTEND_URL || '').replace(/\/+$/, '');

const transporter = nodemailer.createTransport({
  host: EMAIL_HOST,
  port: EMAIL_PORT,
  secure: EMAIL_PORT === 465,
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

const verifyTransporter = async () => {
  if (!EMAIL_HOST || !process.env.EMAIL_PORT || !EMAIL_USER || !EMAIL_PASS) {
    console.warn('Email transporter not fully configured. Skipping SMTP verification.');
    return;
  }

  try {
    await transporter.verify();
    console.log('Email transporter verified successfully.');
  } catch (error) {
    console.error('Email transporter verification failed:', error.message);
  }
};

void verifyTransporter();

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatCurrency = (amount = 0) => `&#8377;${Number(amount || 0).toFixed(2)}`;

const formatDate = (value, options = {}) => {
  if (!value) {
    return 'N/A';
  }

  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...options,
  });
};

const getOrderNumber = (order) => String(order?._id || '');

const getTrackOrderUrl = (orderId) => {
  if (!FRONTEND_URL) {
    return '#';
  }

  return `${FRONTEND_URL}/orders/${orderId}`;
};

const getPaymentMethodLabel = (paymentMethod) => {
  if (!paymentMethod) {
    return 'N/A';
  }

  if (paymentMethod === 'COD') {
    return 'Cash on Delivery';
  }

  if (paymentMethod === 'Online') {
    return 'Online Payment';
  }

  return paymentMethod;
};

const getShippingAddressHtml = (shippingAddress = {}) => {
  const parts = [
    shippingAddress.name,
    shippingAddress.street,
    [shippingAddress.city, shippingAddress.state].filter(Boolean).join(', '),
    shippingAddress.zip,
    shippingAddress.country,
    shippingAddress.phone ? `Phone: ${shippingAddress.phone}` : '',
  ].filter(Boolean);

  return parts.map((part) => `<div>${escapeHtml(part)}</div>`).join('');
};

const buildItemsRowsHtml = (items = []) =>
  items
    .map((item) => {
      const productName = item?.product?.name || item?.name || 'Product';
      const quantity = Number(item?.quantity || 0);
      const unitPrice = Number(item?.price || 0);
      const lineTotal = unitPrice * quantity;

      return `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #111827;">${escapeHtml(productName)}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #111827; text-align: center;">${quantity}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #111827; text-align: right;">${formatCurrency(unitPrice)}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #111827; text-align: right;">${formatCurrency(lineTotal)}</td>
        </tr>
      `;
    })
    .join('');

const buildItemsListHtml = (items = []) =>
  items
    .map((item) => {
      const productName = item?.product?.name || item?.name || 'Product';
      return `<li style="margin: 0 0 8px; color: #374151; font-size: 14px;">${escapeHtml(productName)} x ${Number(
        item?.quantity || 0
      )}</li>`;
    })
    .join('');

const buildLayout = ({ title, preheader, content }) => `
  <div style="margin: 0; padding: 24px 12px; background-color: #f3f4f6; font-family: Arial, Helvetica, sans-serif;">
    <div style="display: none; max-height: 0; overflow: hidden; opacity: 0;">${escapeHtml(preheader || title)}</div>
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb;">
      <div style="padding: 24px; border-bottom: 1px solid #e5e7eb; text-align: center; font-size: 22px; font-weight: 700; color: #111827;">
        My Store
      </div>
      <div style="padding: 24px;">
        ${content}
      </div>
      <div style="padding: 16px 24px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center; line-height: 1.6;">
        You are receiving this email because of activity on your My Store account.<br />
        Please contact support if you need any help with your order.
      </div>
    </div>
  </div>
`;

const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const info = await transporter.sendMail({
      from: EMAIL_FROM,
      to,
      subject,
      html,
      text,
    });

    return info;
  } catch (error) {
    console.error('Failed to send email:', error.message);
    return null;
  }
};

const sendOrderConfirmation = async ({ order, user }) => {
  const orderNumber = getOrderNumber(order);
  const orderUrl = getTrackOrderUrl(orderNumber);
  const paymentMethod = getPaymentMethodLabel(order?.paymentInfo?.type);

  const html = buildLayout({
    title: 'Order Confirmation',
    preheader: `Order ${orderNumber} has been placed successfully.`,
    content: `
      <p style="margin: 0 0 16px; font-size: 16px; color: #111827;">Hi ${escapeHtml(user?.name || 'Customer')}, your order has been placed!</p>
      <p style="margin: 0 0 24px; font-size: 14px; color: #4b5563; line-height: 1.7;">Thanks for shopping with us. Here are your order details.</p>

      <div style="margin: 0 0 24px; padding: 16px; background-color: #f9fafb; border: 1px solid #e5e7eb; font-size: 14px; color: #374151; line-height: 1.8;">
        <div><strong>Order number:</strong> ${escapeHtml(orderNumber)}</div>
        <div><strong>Date:</strong> ${escapeHtml(formatDate(order?.createdAt))}</div>
        <div><strong>Payment method:</strong> ${escapeHtml(paymentMethod)}</div>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <thead>
          <tr>
            <th style="padding: 12px; border-bottom: 1px solid #d1d5db; background-color: #f9fafb; text-align: left; font-size: 12px; color: #6b7280;">Item</th>
            <th style="padding: 12px; border-bottom: 1px solid #d1d5db; background-color: #f9fafb; text-align: center; font-size: 12px; color: #6b7280;">Qty</th>
            <th style="padding: 12px; border-bottom: 1px solid #d1d5db; background-color: #f9fafb; text-align: right; font-size: 12px; color: #6b7280;">Unit Price</th>
            <th style="padding: 12px; border-bottom: 1px solid #d1d5db; background-color: #f9fafb; text-align: right; font-size: 12px; color: #6b7280;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${buildItemsRowsHtml(order?.items)}
        </tbody>
      </table>

      <div style="margin: 0 0 24px; font-size: 14px; color: #374151; line-height: 1.8;">
        <div style="display: block;"><strong>Items total:</strong> ${formatCurrency(order?.itemsPrice)}</div>
        <div style="display: block;"><strong>Shipping:</strong> ${formatCurrency(order?.shippingPrice)}</div>
        <div style="display: block;"><strong>Tax:</strong> ${formatCurrency(order?.taxPrice)}</div>
        <div style="display: block; margin-top: 8px; font-size: 16px; color: #111827;"><strong>Grand total:</strong> ${formatCurrency(order?.totalPrice)}</div>
      </div>

      <div style="margin: 0 0 24px;">
        <p style="margin: 0 0 8px; font-size: 14px; color: #111827;"><strong>Shipping address</strong></p>
        <div style="font-size: 14px; color: #4b5563; line-height: 1.7;">
          ${getShippingAddressHtml(order?.shippingAddress)}
        </div>
      </div>

      <div style="margin: 32px 0 8px; text-align: center;">
        <a href="${orderUrl}" style="display: inline-block; background: #2D281E; color: #ffffff; padding: 12px 24px; border-radius: 4px; text-decoration: none; font-size: 14px;">Track your order</a>
      </div>
    `,
  });

  const text = [
    `Hi ${user?.name || 'Customer'}, your order has been placed!`,
    `Order number: ${orderNumber}`,
    `Date: ${formatDate(order?.createdAt)}`,
    `Payment method: ${paymentMethod}`,
    `Items total: Rs.${Number(order?.itemsPrice || 0).toFixed(2)}`,
    `Shipping: Rs.${Number(order?.shippingPrice || 0).toFixed(2)}`,
    `Tax: Rs.${Number(order?.taxPrice || 0).toFixed(2)}`,
    `Grand total: Rs.${Number(order?.totalPrice || 0).toFixed(2)}`,
    `Track your order: ${orderUrl}`,
  ].join('\n');

  return sendEmail({
    to: user?.email,
    subject: `Order placed successfully - ${orderNumber}`,
    html,
    text,
  });
};

const sendPaymentReceipt = async ({ order, payment, user }) => {
  const orderNumber = getOrderNumber(order);
  const orderUrl = getTrackOrderUrl(orderNumber);
  const amountInRupees = Number(payment?.amount || 0) / 100;
  const paymentMethod = getPaymentMethodLabel(payment?.paymentMethod || order?.paymentInfo?.type || 'Online');

  const html = buildLayout({
    title: 'Payment Receipt',
    preheader: `Payment confirmed for order ${orderNumber}.`,
    content: `
      <p style="margin: 0 0 16px; font-size: 16px; color: #111827;">Payment confirmed</p>
      <p style="margin: 0 0 24px; font-size: 14px; color: #4b5563; line-height: 1.7;">Hi ${escapeHtml(user?.name || 'Customer')}, we have received your payment successfully.</p>

      <div style="margin: 0 0 24px; padding: 16px; background-color: #f9fafb; border: 1px solid #e5e7eb; font-size: 14px; color: #374151; line-height: 1.8;">
        <div><strong>Transaction ID:</strong> ${escapeHtml(payment?.razorpayPaymentId || 'N/A')}</div>
        <div><strong>Amount:</strong> ${formatCurrency(amountInRupees)}</div>
        <div><strong>Order number:</strong> ${escapeHtml(orderNumber)}</div>
        <div><strong>Payment method:</strong> ${escapeHtml(paymentMethod)}</div>
        <div><strong>Date and time:</strong> ${escapeHtml(
          formatDate(payment?.updatedAt || Date.now(), { hour: '2-digit', minute: '2-digit' })
        )}</div>
      </div>

      <div style="margin: 32px 0 8px; text-align: center;">
        <a href="${orderUrl}" style="display: inline-block; background: #2D281E; color: #ffffff; padding: 12px 24px; border-radius: 4px; text-decoration: none; font-size: 14px;">Track your order</a>
      </div>
    `,
  });

  const text = [
    'Payment confirmed',
    `Order number: ${orderNumber}`,
    `Transaction ID: ${payment?.razorpayPaymentId || 'N/A'}`,
    `Amount: Rs.${amountInRupees.toFixed(2)}`,
    `Payment method: ${paymentMethod}`,
    `Date and time: ${formatDate(payment?.updatedAt || Date.now(), { hour: '2-digit', minute: '2-digit' })}`,
    `Track your order: ${orderUrl}`,
  ].join('\n');

  return sendEmail({
    to: user?.email,
    subject: `Payment receipt - ${orderNumber}`,
    html,
    text,
  });
};

const sendOTPEmail = async ({ email, otp, name }) => {
  const html = buildLayout({
    title: 'OTP Verification',
    preheader: 'Your OTP code is ready.',
    content: `
      <p style="margin: 0 0 16px; font-size: 16px; color: #111827;">Hi ${escapeHtml(name || 'User')},</p>
      <p style="margin: 0 0 24px; font-size: 14px; color: #4b5563; line-height: 1.7;">Use the OTP below to complete your verification. Expires in 10 minutes. Do not share this OTP.</p>

      <div style="margin: 0 0 24px; padding: 20px; background-color: #f9fafb; border: 1px solid #e5e7eb; text-align: center;">
        <div style="font-size: 32px; font-weight: 700; color: #111827; letter-spacing: 6px;">${escapeHtml(otp)}</div>
      </div>

      <p style="margin: 0; font-size: 13px; color: #6b7280; line-height: 1.7;">If you did not request this OTP, you can ignore this email.</p>
    `,
  });

  const text = [
    `Hi ${name || 'User'},`,
    `Your OTP is: ${otp}`,
    'Expires in 10 minutes.',
    'Do not share this OTP.',
  ].join('\n');

  return sendEmail({
    to: email,
    subject: 'Your OTP verification code',
    html,
    text,
  });
};

const sendShippingUpdate = async ({ order, user }) => {
  const orderNumber = getOrderNumber(order);
  const orderUrl = getTrackOrderUrl(orderNumber);
  const estimatedDelivery = order?.estimatedDelivery
    ? formatDate(order.estimatedDelivery)
    : 'Will be shared soon';

  const html = buildLayout({
    title: 'Shipping Update',
    preheader: `Order ${orderNumber} has been shipped.`,
    content: `
      <p style="margin: 0 0 16px; font-size: 16px; color: #111827;">Your order has been shipped!</p>
      <p style="margin: 0 0 24px; font-size: 14px; color: #4b5563; line-height: 1.7;">Hi ${escapeHtml(user?.name || 'Customer')}, your package is on the way.</p>

      <div style="margin: 0 0 24px; padding: 16px; background-color: #f9fafb; border: 1px solid #e5e7eb; font-size: 14px; color: #374151; line-height: 1.8;">
        <div><strong>Tracking number:</strong> ${escapeHtml(order?.trackingNumber || 'N/A')}</div>
        <div><strong>Courier name:</strong> ${escapeHtml(order?.courierName || 'N/A')}</div>
        <div><strong>Estimated delivery:</strong> ${escapeHtml(estimatedDelivery)}</div>
      </div>

      <div style="margin: 0 0 24px;">
        <p style="margin: 0 0 8px; font-size: 14px; color: #111827;"><strong>Items</strong></p>
        <ul style="margin: 0; padding-left: 18px;">
          ${buildItemsListHtml(order?.items)}
        </ul>
      </div>

      <div style="margin: 32px 0 8px; text-align: center;">
        <a href="${orderUrl}" style="display: inline-block; background: #2D281E; color: #ffffff; padding: 12px 24px; border-radius: 4px; text-decoration: none; font-size: 14px;">Track your order</a>
      </div>
    `,
  });

  const text = [
    'Your order has been shipped!',
    `Order number: ${orderNumber}`,
    `Tracking number: ${order?.trackingNumber || 'N/A'}`,
    `Courier name: ${order?.courierName || 'N/A'}`,
    `Estimated delivery: ${estimatedDelivery}`,
    `Track your order: ${orderUrl}`,
  ].join('\n');

  return sendEmail({
    to: user?.email,
    subject: `Your order has been shipped - ${orderNumber}`,
    html,
    text,
  });
};

const sendOrderCancellation = async ({ order, user }) => {
  const orderNumber = getOrderNumber(order);
  const isOnlinePayment = order?.paymentInfo?.type && order.paymentInfo.type !== 'COD';
  const refundNote = isOnlinePayment
    ? 'If your payment was made online, your refund will be processed in 5-7 business days.'
    : 'No refund is needed for this Cash on Delivery order.';

  const html = buildLayout({
    title: 'Order Cancellation',
    preheader: `Order ${orderNumber} has been cancelled.`,
    content: `
      <p style="margin: 0 0 16px; font-size: 16px; color: #111827;">Order #${escapeHtml(orderNumber)} has been cancelled</p>
      <p style="margin: 0 0 24px; font-size: 14px; color: #4b5563; line-height: 1.7;">Hi ${escapeHtml(user?.name || 'Customer')}, your order has been cancelled successfully.</p>

      <div style="margin: 0 0 24px; padding: 16px; background-color: #f9fafb; border: 1px solid #e5e7eb; font-size: 14px; color: #374151; line-height: 1.8;">
        <div><strong>Cancel reason:</strong> ${escapeHtml(order?.cancelReason || 'No reason provided')}</div>
      </div>

      <p style="margin: 0; font-size: 14px; color: #4b5563; line-height: 1.7;">${escapeHtml(refundNote)}</p>
    `,
  });

  const text = [
    `Order #${orderNumber} has been cancelled`,
    `Cancel reason: ${order?.cancelReason || 'No reason provided'}`,
    refundNote,
  ].join('\n');

  return sendEmail({
    to: user?.email,
    subject: `Order cancelled - ${orderNumber}`,
    html,
    text,
  });
};

module.exports = {
  sendEmail,
  sendOrderConfirmation,
  sendPaymentReceipt,
  sendOTPEmail,
  sendShippingUpdate,
  sendOrderCancellation,
};
