import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { differenceInDays, parseISO } from 'date-fns';
import { sendEmail, sendPushNotification, getNotificationConfig } from '@/lib/notifications';

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (
    process.env.CRON_SECRET && 
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const stmt = db.prepare(`
      SELECT 
        d.id as doc_id, d.type, d.expiry_date, 
        v.id as vehicle_id, v.name as vehicle_name, v.license_plate,
        v.owner_email, v.owner_phone, v.owner_fcm_token, u.fcm_token as user_fcm_token
      FROM documents d
      JOIN vehicles v ON d.vehicle_id = v.id
      JOIN users u ON v.user_id = u.id
    `);

    const documents = stmt.all();

    const vehiclesAlerts = {};
    const today = new Date();
    let totalExpired = 0;
    let totalExpiringSoon = 0;

    documents.forEach((doc) => {
      const expiryDate = parseISO(doc.expiry_date);
      const daysLeft = differenceInDays(expiryDate, today);

      let status = null;
      if (daysLeft < 0) {
        status = 'expired';
        totalExpired++;
      } else if (daysLeft <= 30) {
        status = 'expiring_soon';
        totalExpiringSoon++;
      }

      if (status) {
        if (!vehiclesAlerts[doc.vehicle_id]) {
          vehiclesAlerts[doc.vehicle_id] = {
            vehicle_name: doc.vehicle_name,
            license_plate: doc.license_plate,
            owner_email: doc.owner_email,
            owner_phone: doc.owner_phone,
            fcm_token: doc.owner_fcm_token || doc.user_fcm_token,
            documents: []
          };
        }
        vehiclesAlerts[doc.vehicle_id].documents.push({
          type: doc.type,
          expiry_date: doc.expiry_date,
          daysLeft,
          status,
        });
      }
    });

    const config = getNotificationConfig();
    const alertsSent = [];

    for (const vehicleId in vehiclesAlerts) {
      const vehicle = vehiclesAlerts[vehicleId];
      
      let messageLines = [
        `Vehicle Alert: ${vehicle.vehicle_name} (${vehicle.license_plate})`,
        `The following documents require your attention:`,
        ``
      ];

      let hasExpired = false;
      vehicle.documents.forEach(doc => {
        const isExpired = doc.status === 'expired';
        if (isExpired) hasExpired = true;
        const statusText = isExpired ? 'EXPIRED' : `expiring in ${doc.daysLeft} days`;
        messageLines.push(`- ${doc.type}: ${statusText} (Expiry: ${doc.expiry_date})`);
      });

      messageLines.push(``, `Please renew immediately.`);
      const message = messageLines.join('\n');
      
      const subject = `Document Alert: ${vehicle.license_plate} - ${hasExpired ? 'Expired' : 'Expiring Soon'}`;

      let emailResult = null;

      if (vehicle.owner_email) {
        emailResult = await sendEmail(vehicle.owner_email, subject, message);
      }

      alertsSent.push({
        vehicle: vehicle.license_plate,
        documentCount: vehicle.documents.length,
        message,
        ownerEmail: vehicle.owner_email || null,
        emailResult,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${documents.length} documents. Found ${totalExpired} expired and ${totalExpiringSoon} expiring soon across ${Object.keys(vehiclesAlerts).length} vehicles.`,
      config,
      alertsSent,
    });
  } catch (error) {
    console.error('Alert processing error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
