
import { format } from 'date-fns';
import { formatCurrency } from './currency';

export const printStartSessionReceipt = (customerName, bayName, startTime, rate) => {
    const timeString = format(startTime, 'HH:mm dd/MM/yyyy');
    const rateString = formatCurrency(rate);

    const receiptContent = `
        <html>
            <head>
                <title>Rent Start Receipt</title>
                <style>
                    body {
                        font-family: 'Courier New', Courier, monospace;
                        font-size: 11px;
                        font-weight: bold;
                        width: 45mm;
                        margin: 0;
                        padding: 0;
                        text-align: left;
                        word-wrap: break-word;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 20px;
                        font-weight: bold;
                    }
                    .line {
                        margin-bottom: 10px;
                    }
                    .divider {
                        border-top: 1px dashed black;
                        margin: 15px 0;
                    }
                </style>
            </head>
            <body>
                <div class="header">DIY MotoGarage</div>
                <div class="divider"></div>
                <div class="line">Dear <strong>${customerName}</strong>,</div>
                <div class="line">Your rent of <strong>${bayName}</strong> started at <strong>${timeString}</strong>.</div>
                <div class="line">Price per Hour is <strong>${rateString}</strong>.</div>
                <div class="divider"></div>
                <div style="text-align: center; font-size: 12px;">Thank you!</div>
                <script>
                    window.onload = function() {
                        window.print();
                        setTimeout(function() { window.close(); }, 500);
                    }
                </script>
            </body>
        </html>
    `;

    const printWindow = window.open('', '', 'width=400,height=600');
    if (printWindow) {
        printWindow.document.write(receiptContent);
        printWindow.document.close();
    } else {
        alert('Popup blocked. Please allow popups to print receipt.');
    }
};

export const printEndSessionReceipt = (customerName, bayName, startTime, endTime, rate, total) => {
    const startStr = format(startTime, 'HH:mm dd/MM/yyyy');
    const endStr = format(endTime, 'HH:mm dd/MM/yyyy');
    const rateStr = formatCurrency(rate);
    const totalStr = formatCurrency(total);

    const receiptContent = `
        <html>
            <head>
                <title>Rent Receipt</title>
                <style>
                    body {
                        font-family: 'Courier New', Courier, monospace;
                        font-size: 11px;
                        font-weight: bold;
                        width: 45mm;
                        margin: 0;
                        padding: 0;
                        text-align: left;
                        word-wrap: break-word;
                    }
                    .header { text-align: center; margin-bottom: 20px; font-weight: bold; }
                    .line { margin-bottom: 5px; }
                    .big-line { margin-bottom: 10px; font-size: 16px; font-weight: bold; }
                    .divider { border-top: 1px dashed black; margin: 15px 0; }
                    .total-box { border: 2px solid black; padding: 10px; text-align: center; margin-top: 10px; }
                </style>
            </head>
            <body>
                <div class="header">DIY MotoGarage</div>
                <div class="divider"></div>
                <div class="line">Customer: <strong>${customerName}</strong></div>
                <div class="line">Bay: ${bayName}</div>
                <div class="divider"></div>
                <div class="line">Start: ${startStr}</div>
                <div class="line">End:   ${endStr}</div>
                <div class="line">Rate:  ${rateStr}/hr</div>
                <div class="divider"></div>
                <div class="total-box">
                    <div style="font-size: 12px; margin-bottom: 5px;">TOTAL TO PAY</div>
                    <div style="font-size: 20px; font-weight: bold;">${totalStr}</div>
                </div>
                <div class="divider"></div>
                <div style="text-align: center; font-size: 12px;">Thank you for your business!</div>
                <script>
                    window.onload = function() {
                        window.print();
                        setTimeout(function() { window.close(); }, 500);
                    }
                </script>
            </body>
        </html>
    `;

    const printWindow = window.open('', '', 'width=400,height=600');
    if (printWindow) {
        printWindow.document.write(receiptContent);
        printWindow.document.close();
    } else {
        alert('Popup blocked. Please allow popups to print receipt.');
    }
};

export const printSaleReceipt = (transaction) => {
    const { customerName, items, total, date } = transaction;
    const timeString = format(date?.toDate ? date.toDate() : new Date(), 'HH:mm dd/MM/yyyy');
    const totalStr = formatCurrency(total);

    const itemsHtml = items.map(item => `
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span>${item.name} x${item.quantity}</span>
            <span>${formatCurrency(item.priceAtSale * item.quantity)}</span>
        </div>
    `).join('');

    const receiptContent = `
        <html>
            <head>
                <title>Sale Receipt</title>
                <style>
                    body {
                        font-family: 'Courier New', Courier, monospace;
                        font-size: 11px;
                        font-weight: bold;
                        width: 45mm;
                        margin: 0;
                        padding: 0;
                        text-align: left;
                        word-wrap: break-word;
                    }
                    .header { text-align: center; margin-bottom: 20px; font-weight: bold; }
                    .divider { border-top: 1px dashed black; margin: 15px 0; }
                    .total-box { border: 2px solid black; padding: 10px; text-align: center; margin-top: 10px; }
                </style>
            </head>
            <body>
                <div class="header">DIY MotoGarage</div>
                <div class="divider"></div>
                ${customerName ? `<div>Customer: <strong>${customerName}</strong></div><div class="divider"></div>` : ''}
                <div>Date: ${timeString}</div>
                <div class="divider"></div>
                ${itemsHtml}
                <div class="divider"></div>
                <div class="total-box">
                    <div style="font-size: 12px; margin-bottom: 5px;">TOTAL</div>
                    <div style="font-size: 20px; font-weight: bold;">${totalStr}</div>
                </div>
                <div style="text-align: center; margin-top: 20px; font-size: 12px;">Thank you!</div>
                <script>
                    window.onload = function() {
                        window.print();
                        setTimeout(function() { window.close(); }, 500);
                    }
                </script>
            </body>
        </html>
    `;

    const printWindow = window.open('', '', 'width=400,height=600');
    if (printWindow) {
        printWindow.document.write(receiptContent);
        printWindow.document.close();
    } else {
        alert('Popup blocked.');
    }
};

export const printJobCard = (order, customer, bike, items, totalAmount) => {
    const timeString = format(order?.created_at?.toDate ? order.created_at.toDate() : new Date(), 'dd/MM/yyyy HH:mm');
    const totalStr = formatCurrency(totalAmount);

    const itemsHtml = items.map(item => `
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span>${item.name} x${item.quantity}</span>
            <span>${formatCurrency(item.price * item.quantity)}</span>
        </div>
    `).join('');

    const receiptContent = `
        <html>
            <head>
                <title>Job Card: ${order.order_number}</title>
                <style>
                    body {
                        font-family: 'Courier New', Courier, monospace;
                        font-size: 11px;
                        font-weight: bold;
                        width: 45mm;
                        margin: 0;
                        padding: 0;
                        text-align: left;
                        word-wrap: break-word;
                    }
                    .header { text-align: center; margin-bottom: 20px; font-weight: bold; font-size: 16px; }
                    .title { text-align: center; margin-bottom: 15px; font-weight: bold; background: #000; color: #fff; padding: 4px; }
                    .divider { border-top: 1px dashed black; margin: 10px 0; }
                    .total-box { border: 2px solid black; padding: 10px; text-align: center; margin-top: 10px; }
                    .info-line { display: flex; justify-content: space-between; margin-bottom: 4px; }
                </style>
            </head>
            <body>
                <div class="header">DIY MotoGarage</div>
                <div class="title">JOB CARD: ${order.order_number}</div>
                
                <div class="info-line"><span>Date:</span> <span>${timeString}</span></div>
                <div class="info-line"><span>Customer:</span> <strong>${customer?.name || 'Unknown'}</strong></div>
                ${customer?.phone ? `<div class="info-line"><span>Phone:</span> <span>${customer.phone}</span></div>` : ''}
                
                <div class="divider"></div>
                <div class="info-line"><span>Bike:</span> <strong>${bike ? `${bike.brand} ${bike.model}` : 'Unknown'}</strong></div>
                ${bike?.plate_number ? `<div class="info-line"><span>Plate:</span> <span>${bike.plate_number}</span></div>` : ''}
                
                <div class="divider"></div>
                ${order.mechanic_id ? `<div class="info-line"><span>Mechanic:</span> <span>${order.mechanic_id}</span></div>` : ''}
                <div style="margin-top: 10px;"><strong>Problem:</strong></div>
                <div style="white-space: pre-wrap; font-size: 12px; margin-bottom: 10px;">${order.problem_description || 'No description provided.'}</div>
                
                <div class="divider"></div>
                <div style="text-align: center; margin-bottom: 10px;"><strong>PARTS & SERVICES</strong></div>
                ${itemsHtml || '<div style="text-align: center; font-size: 12px;">No items added yet.</div>'}
                
                <div class="divider"></div>
                <div class="total-box">
                    <div style="font-size: 12px; margin-bottom: 5px;">ESTIMATED TOTAL</div>
                    <div style="font-size: 20px; font-weight: bold;">${totalStr}</div>
                </div>
                
                <div style="text-align: center; margin-top: 30px; font-size: 10px;">
                    Signature:<br><br>
                    _______________
                </div>
                <script>
                    window.onload = function() {
                        window.print();
                        setTimeout(function() { window.close(); }, 500);
                    }
                </script>
            </body>
        </html>
    `;

    const printWindow = window.open('', '', 'width=400,height=600');
    if (printWindow) {
        printWindow.document.write(receiptContent);
        printWindow.document.close();
    } else {
        alert('Popup blocked.');
    }
};
