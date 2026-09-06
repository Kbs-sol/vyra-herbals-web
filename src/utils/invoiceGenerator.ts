import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Helper to load image
const loadImage = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = url;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            } else {
                reject(new Error('Canvas context not available'));
            }
        };
        img.onerror = (err) => reject(err);
    });
};

export const generateInvoice = async (orderData: any) => {
    try {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        let yPos = 20; // Starting Y position with top margin

        // --- Header ---
        // Add Logo
        try {
            const logoData = await loadImage('/assets/images/logo-final.png');
            // Usage: addImage(imageData, format, x, y, width, height)
            doc.addImage(logoData, 'PNG', 15, yPos, 50, 20);
        } catch (e) {
            console.error("Could not load logo for PDF", e);
            doc.setFontSize(22);
            doc.setTextColor(112, 74, 13); // Primary color
            doc.text("Vyra Herbals", 15, yPos + 10);
        }

        // Company Info (Right aligned)
        doc.setFontSize(10);
        doc.setTextColor(80);
        const companyInfo = [
            "Vyra Herbals",
            "32-75, CSP Road, Mandamarri,",
            "Mancherial (Dist.), Telangana - 504231",
            "Phone: +91 9866082590",
            "Email: vyraherbals@gmail.com",
            "GSTIN: 36ABCDE1234F1Z5"
        ];
        // Position info slightly below top margin to align with logo
        doc.text(companyInfo, pageWidth - 15, yPos + 5, { align: 'right', lineHeightFactor: 1.3 });

        // Move yPos down after header area. Logo height is 20, plus some padding.
        yPos += 35;

        // --- Divider Line ---
        doc.setDrawColor(220);
        doc.line(15, yPos, pageWidth - 15, yPos);
        yPos += 15; // Padding after line

        // --- Title & Invoice Details ---
        doc.setFontSize(20);
        doc.setTextColor(0);
        doc.text("INVOICE", 15, yPos + 5);

        // Invoice Details on the right
        doc.setFontSize(10);
        doc.setTextColor(50);
        const invoiceDetailsY = yPos;
        doc.text(`Invoice No: INV-${orderData.id}`, pageWidth - 15, invoiceDetailsY, { align: 'right' });
        doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, pageWidth - 15, invoiceDetailsY + 5, { align: 'right' });
        doc.text(`Order ID: ${orderData.order_id || orderData.id}`, pageWidth - 15, invoiceDetailsY + 10, { align: 'right' });

        // Move down past the Invoice details. 
        // Invoice text is ~8 units high. Details are ~15 units high.
        yPos += 30;

        // --- Bill To / Ship To ---
        // Parse address if string
        let addressObj = orderData.shipping_address;
        if (typeof addressObj === 'string') {
            try {
                addressObj = JSON.parse(addressObj);
            } catch (e) {
                addressObj = {};
            }
        }

        const customerName = addressObj.fullName || orderData.user_name || 'Valued Customer';
        const customerPhone = addressObj.phone || addressObj.mobile || 'N/A';
        const customerAddress = [
            addressObj.houseNumber || '',
            addressObj.area || '',
            `${addressObj.city || ''}, ${addressObj.state || ''} - ${addressObj.pincode || ''}`,
            addressObj.country || ''
        ].filter(Boolean).join(', ');

        doc.setFontSize(10);
        doc.setTextColor(100); // Muted Label
        doc.text("BILL TO / SHIP TO:", 15, yPos);

        yPos += 7;
        doc.setFontSize(11);
        doc.setTextColor(0); // Dark Text
        doc.setFont("helvetica", "bold");
        doc.text(customerName, 15, yPos);

        yPos += 5;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text(customerPhone, 15, yPos);

        yPos += 5;
        // Split address to fit width if needed (max width 100 to avoid hitting right side if user wants layout there)
        const splitAddress = doc.splitTextToSize(customerAddress, 100);
        doc.text(splitAddress, 15, yPos);

        // Increase Y based on address lines. Each line is roughly 4-5 units.
        yPos += (splitAddress.length * 5) + 15; // Extra padding before table

        // --- Items Table ---
        const tableColumn = ["#", "Item Description", "Qty", "Price", "Total"];
        const tableRows: any[] = [];

        orderData.products.forEach((item: any, index: number) => {
            const productData = [
                index + 1,
                item.product_title || item.title || "Product",
                item.quantity || item.qty || 1,
                `Rs. ${item.item_amount || item.price || 0}`,
                `Rs. ${(item.quantity || 1) * (item.item_amount || item.price || 0)}`
            ];
            tableRows.push(productData);
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: yPos,
            theme: 'grid',
            headStyles: {
                fillColor: [112, 74, 13], // Primary Brown
                textColor: 255,
                fontStyle: 'bold',
                halign: 'center'
            },
            bodyStyles: {
                textColor: 50,
                fontSize: 10
            },
            columnStyles: {
                0: { halign: 'center', cellWidth: 15 },
                2: { halign: 'center', cellWidth: 20 },
                3: { halign: 'right', cellWidth: 30 },
                4: { halign: 'right', cellWidth: 30 },
            },
            styles: {
                cellPadding: 4,
                overflow: 'linebreak'
            },
        });

        // --- Summary Section ---
        // Get Y position after table
        yPos = (doc as any).lastAutoTable?.finalY + 15 || yPos + 20;

        // Prevent page overflow
        if (yPos > pageHeight - 50) {
            doc.addPage();
            yPos = 20;
        }

        // Determine spacing for summary
        // Usage: Label at (pageWidth - 90), Value at (pageWidth - 15) right aligned
        const summaryLabelX = pageWidth - 90;
        const summaryValueX = pageWidth - 15;

        doc.setFontSize(10);
        doc.setTextColor(50);

        const addSummaryRow = (label: string, value: string, isBold = false) => {
            if (isBold) {
                doc.setFont("helvetica", "bold");
                doc.setTextColor(0);
                doc.setFontSize(12);
            } else {
                doc.setFont("helvetica", "normal");
                doc.setTextColor(50);
                doc.setFontSize(10);
            }
            doc.text(label, summaryLabelX, yPos);
            doc.text(value, summaryValueX, yPos, { align: 'right' });
            yPos += 7;
        };

        addSummaryRow("Subtotal:", `Rs. ${String(orderData.order_amount)}`);
        addSummaryRow("Shipping:", "Free");

        yPos += 2;
        doc.setDrawColor(200);
        // Line spanning the summary width
        doc.line(summaryLabelX, yPos - 4, summaryValueX, yPos - 4);

        addSummaryRow("Grand Total:", `Rs. ${String(orderData.order_amount)}`, true);

        // --- Footer ---
        // Always at bottom of page
        const footerY = pageHeight - 20;
        doc.setFontSize(9);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(150);
        doc.text("Thank you for choosing Vyra Herbals!", pageWidth / 2, footerY - 5, { align: 'center' });
        doc.setFont("helvetica", "normal");
        doc.text("This is a computer-generated invoice.", pageWidth / 2, footerY, { align: 'center' });

        // Save PDF
        doc.save(`Invoice-${orderData.order_id || orderData.id}.pdf`);
    } catch (error) {
        console.error("Error generating invoice:", error);
        alert("Failed to generate invoice.");
    }
};
